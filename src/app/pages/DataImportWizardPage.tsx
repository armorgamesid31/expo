import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Database, FileUp, Loader2, RefreshCw, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import type { AdminImportBatch, AdminImportConflict, AdminImportRow } from '../types/mobile-api';

type PresignResponse = {
  file: {
    id: number;
    sourceType: 'CSV' | 'EXCEL' | 'PDF' | 'IMAGE';
    status: string;
    objectKey: string | null;
    publicUrl: string | null;
  };
  upload: {
    mode: 'EXTERNAL' | 'PRESIGNED_PUT';
    uploadUrl: string | null;
    method: 'PUT';
    headers: Record<string, string>;
    expiresInSeconds: number;
  };
};

type PreviewResponse = {
  batch: AdminImportBatch;
  rows: AdminImportRow[];
  conflicts: AdminImportConflict[];
  mappingOptions: {
    services: Array<{ id: number; name: string; duration: number; price: number }>;
    staff: Array<{ id: number; name: string; title?: string | null }>;
  };
};

type ReportResponse = {
  batch: AdminImportBatch;
  latestRun: {
    id: number;
    status: 'RUNNING' | 'COMPLETED' | 'PARTIAL_FAILED' | 'FAILED';
    summary: Record<string, unknown> | null;
    startedAt: string | null;
    completedAt: string | null;
  } | null;
  rows: Record<string, number>;
  conflicts: Record<string, number>;
};

type ConflictEdit = {
  serviceId?: number;
  staffId?: number;
  customerPhone?: string;
  ignoreConflict?: boolean;
};

const STEP_KEYS = ['UPLOAD', 'PROCESS', 'REVIEW', 'PREVIEW', 'COMMIT', 'REPORT'] as const;

function statusToStep(status: AdminImportBatch['status']) {
  switch (status) {
    case 'UPLOADING':
      return 0;
    case 'PARSING':
      return 1;
    case 'NEEDS_REVIEW':
      return 2;
    case 'READY_TO_COMMIT':
      return 3;
    case 'COMMITTING':
      return 4;
    case 'COMPLETED':
    case 'FAILED':
      return 5;
    default:
      return 0;
  }
}

function asConflictTypeLabel(type: AdminImportConflict['type']) {
  switch (type) {
    case 'MISSING_PHONE':
      return 'Missing phone';
    case 'INVALID_PHONE':
      return 'Invalid phone';
    case 'SERVICE_UNMATCHED':
      return 'Service unmatched';
    case 'STAFF_UNMATCHED':
      return 'Staff unmatched';
    case 'APPOINTMENT_OVERLAP':
      return 'Appointment overlap';
    case 'OUT_OF_RANGE_DATE':
      return 'Out of range date';
    default:
      return 'Validation error';
  }
}

function toSummaryRecord(summary: Record<string, unknown> | null | undefined) {
  return summary && typeof summary === 'object' ? summary : {};
}

export function DataImportWizardPage() {
  const { apiFetch } = useAuth();
  const [batch, setBatch] = useState<AdminImportBatch | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [conflictEdits, setConflictEdits] = useState<Record<number, ConflictEdit>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [pollTick, setPollTick] = useState(0);

  const openConflicts = useMemo(
    () => (preview?.conflicts || []).filter((item) => item.status === 'OPEN'),
    [preview?.conflicts],
  );
  const stepIndex = batch ? statusToStep(batch.status) : 0;
  const summary = toSummaryRecord(batch?.summary);

  const loadBatch = async (batchId: string) => {
    const response = await apiFetch<{ batch: AdminImportBatch }>(`/api/admin/imports/${batchId}`);
    setBatch(response.batch);
    return response.batch;
  };

  const loadPreview = async (batchId: string) => {
    const response = await apiFetch<PreviewResponse>(`/api/admin/imports/${batchId}/preview?limitRows=250`);
    setPreview(response);
    return response;
  };

  const loadReport = async (batchId: string) => {
    const response = await apiFetch<ReportResponse>(`/api/admin/imports/${batchId}/report`);
    setReport(response);
    return response;
  };

  const handleCreateBatch = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch<{ batch: AdminImportBatch }>('/api/admin/imports', {
        method: 'POST',
      });
      setBatch(response.batch);
      setPreview(null);
      setReport(null);
      setConflictEdits({});
      toast.success('Import batch created');
    } catch (error: any) {
      toast.error(error?.message || 'Batch could not be created');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!batch?.id) return;
    setIsLoading(true);
    try {
      const nextBatch = await loadBatch(batch.id);
      if (['NEEDS_REVIEW', 'READY_TO_COMMIT', 'COMPLETED', 'FAILED'].includes(nextBatch.status)) {
        await loadPreview(nextBatch.id);
      }
      if (['COMPLETED', 'FAILED'].includes(nextBatch.status)) {
        await loadReport(nextBatch.id);
      }
      setPollTick((prev) => prev + 1);
    } catch (error: any) {
      toast.error(error?.message || 'Refresh failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!batch?.id || !files || files.length === 0) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const presign = await apiFetch<PresignResponse>(`/api/admin/imports/${batch.id}/files/presign`, {
          method: 'POST',
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
          }),
        });

        if (presign.upload.mode !== 'PRESIGNED_PUT' || !presign.upload.uploadUrl) {
          throw new Error('R2 presign is not configured on backend.');
        }

        const uploadResponse = await fetch(presign.upload.uploadUrl, {
          method: presign.upload.method || 'PUT',
          headers: presign.upload.headers || {},
          body: file,
        });
        if (!uploadResponse.ok) {
          throw new Error(`Upload failed for ${file.name}`);
        }

        await apiFetch(`/api/admin/imports/${batch.id}/files/complete`, {
          method: 'POST',
          body: JSON.stringify({
            fileId: presign.file.id,
            objectKey: presign.file.objectKey,
            publicUrl: presign.file.publicUrl,
          }),
        });
      }
      toast.success('Files uploaded and queued');
      await handleRefresh();
    } catch (error: any) {
      toast.error(error?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveConflict = async (conflict: AdminImportConflict) => {
    if (!batch?.id) return;
    const edit = conflictEdits[conflict.id] || {};
    const decisionValue: Record<string, unknown> = {};
    if (edit.serviceId) decisionValue.matchedServiceId = edit.serviceId;
    if (edit.staffId) decisionValue.matchedStaffId = edit.staffId;
    if (edit.customerPhone) decisionValue.customerPhoneNormalized = edit.customerPhone;
    if (edit.ignoreConflict === true) decisionValue.ignoreConflict = true;

    try {
      await apiFetch(`/api/admin/imports/${batch.id}/mappings`, {
        method: 'POST',
        body: JSON.stringify({
          decisions: [
            {
              rowId: conflict.rowId,
              conflictId: conflict.id,
              decisionType: 'MANUAL_PATCH',
              decisionKey: `conflict-${conflict.id}`,
              decisionValue,
            },
          ],
        }),
      });
      toast.success('Conflict decision saved');
      await handleRefresh();
    } catch (error: any) {
      toast.error(error?.message || 'Conflict could not be saved');
    }
  };

  const handleCommit = async () => {
    if (!batch?.id) return;
    setIsCommitting(true);
    try {
      await apiFetch(`/api/admin/imports/${batch.id}/commit`, {
        method: 'POST',
      });
      toast.success('Commit started');
      await handleRefresh();
    } catch (error: any) {
      toast.error(error?.message || 'Commit failed');
    } finally {
      setIsCommitting(false);
    }
  };

  useEffect(() => {
    if (!batch?.id) return;
    if (!['UPLOADING', 'PARSING', 'COMMITTING'].includes(batch.status)) return;

    const timer = setInterval(() => {
      void handleRefresh();
    }, 5000);

    return () => clearInterval(timer);
  }, [batch?.id, batch?.status]);

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <h1 className="text-xl font-semibold">Veri Aktarımı</h1>
        <p className="text-sm text-muted-foreground">
          CSV/Excel/PDF/foto dosyalarından hizmet, çalışan ve randevu verilerini kontrollü şekilde içeri aktar.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => void handleCreateBatch()}
            disabled={isLoading || isUploading || isCommitting}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--deep-indigo)] px-3 py-2 text-sm text-white disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            Yeni Batch
          </button>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={!batch?.id || isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {STEP_KEYS.map((step, index) => {
            const isDone = index < stepIndex;
            const isActive = index === stepIndex;
            return (
              <div
                key={step}
                className={`rounded-lg border px-2 py-2 text-center text-xs ${
                  isDone
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700'
                    : isActive
                      ? 'border-[var(--deep-indigo)]/50 bg-[var(--deep-indigo)]/10 text-[var(--deep-indigo)]'
                      : 'border-border bg-background text-muted-foreground'
                }`}
              >
                {step}
              </div>
            );
          })}
        </div>
      </div>

      {batch ? (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-sm">
          <p><strong>Batch:</strong> {batch.id}</p>
          <p><strong>Status:</strong> {batch.status}</p>
          <p>
            <strong>Rows:</strong> {String(summary.totalRows || 0)} | <strong>Open conflicts:</strong>{' '}
            {String(summary.openConflicts || 0)}
          </p>
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-semibold">1) Dosya yükle</h2>
        <p className="text-xs text-muted-foreground">
          Aynı batch içinde CSV, Excel, PDF ve foto dosyalarını birlikte yükleyebilirsin. PDF/foto dosyaları otomatik OCR kuyruğuna gönderilir.
        </p>
        <label className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm cursor-pointer">
          <UploadCloud className="h-4 w-4" />
          Dosya Seç (çoklu)
          <input
            type="file"
            multiple
            accept=".csv,.xlsx,.xls,.pdf,image/*"
            className="hidden"
            disabled={!batch?.id || isUploading}
            onChange={(event) => {
              void handleFilesSelected(event.target.files);
              event.currentTarget.value = '';
            }}
          />
        </label>
        {!batch?.id ? <p className="text-xs text-amber-600">Önce Yeni Batch oluştur.</p> : null}
        {isUploading ? <p className="text-xs text-muted-foreground">Dosyalar yükleniyor...</p> : null}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-semibold">2) Conflict çözümü</h2>
        {!preview ? (
          <p className="text-xs text-muted-foreground">Preview yüklemek için Yenile butonuna bas.</p>
        ) : openConflicts.length === 0 ? (
          <p className="inline-flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Açık conflict yok.
          </p>
        ) : (
          <div className="space-y-3">
            {openConflicts.map((conflict) => {
              const edit = conflictEdits[conflict.id] || {};
              return (
                <div key={conflict.id} className="rounded-lg border border-border p-3 space-y-2">
                  <p className="text-sm font-medium inline-flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    {asConflictTypeLabel(conflict.type)}
                  </p>
                  <p className="text-xs text-muted-foreground">{conflict.message}</p>
                  <p className="text-xs text-muted-foreground">Row ID: {conflict.rowId ?? '-'}</p>

                  {conflict.type === 'SERVICE_UNMATCHED' ? (
                    <select
                      value={edit.serviceId || ''}
                      onChange={(event) =>
                        setConflictEdits((prev) => ({
                          ...prev,
                          [conflict.id]: {
                            ...prev[conflict.id],
                            serviceId: Number(event.target.value) || undefined,
                            ignoreConflict: false,
                          },
                        }))
                      }
                      className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
                    >
                      <option value="">Select service</option>
                      {(preview.mappingOptions.services || []).map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  {conflict.type === 'STAFF_UNMATCHED' ? (
                    <select
                      value={edit.staffId || ''}
                      onChange={(event) =>
                        setConflictEdits((prev) => ({
                          ...prev,
                          [conflict.id]: {
                            ...prev[conflict.id],
                            staffId: Number(event.target.value) || undefined,
                            ignoreConflict: false,
                          },
                        }))
                      }
                      className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
                    >
                      <option value="">Select staff</option>
                      {(preview.mappingOptions.staff || []).map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  {(conflict.type === 'MISSING_PHONE' || conflict.type === 'INVALID_PHONE') ? (
                    <input
                      type="text"
                      placeholder="Phone digits (e.g. 905551112233)"
                      value={edit.customerPhone || ''}
                      onChange={(event) =>
                        setConflictEdits((prev) => ({
                          ...prev,
                          [conflict.id]: {
                            ...prev[conflict.id],
                            customerPhone: event.target.value.replace(/\D/g, ''),
                            ignoreConflict: false,
                          },
                        }))
                      }
                      className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
                    />
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSaveConflict(conflict)}
                      className="rounded-md bg-[var(--deep-indigo)] px-3 py-2 text-xs text-white"
                    >
                      Kaydet ve Çöz
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConflictEdits((prev) => ({
                          ...prev,
                          [conflict.id]: {
                            ...prev[conflict.id],
                            ignoreConflict: true,
                          },
                        }))
                      }
                      className="rounded-md border border-border px-3 py-2 text-xs"
                    >
                      Ignore işaretle
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-semibold">3) Commit + Rapor</h2>
        <button
          type="button"
          onClick={() => void handleCommit()}
          disabled={!batch?.id || isCommitting || openConflicts.length > 0}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {isCommitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
          Commit Başlat
        </button>
        {openConflicts.length > 0 ? (
          <p className="text-xs text-amber-600">Commit için önce açık conflictleri çözmen gerekiyor.</p>
        ) : null}

        {report ? (
          <div className="rounded-lg border border-border p-3 text-xs space-y-1">
            <p><strong>Run:</strong> {report.latestRun?.status || '-'}</p>
            <p>
              <strong>Rows</strong> READY: {report.rows.READY || 0} | IMPORTED: {report.rows.IMPORTED || 0} | FAILED:{' '}
              {report.rows.FAILED || 0} | CONFLICT: {report.rows.CONFLICT || 0}
            </p>
            <p>
              <strong>Conflicts</strong> OPEN: {report.conflicts.OPEN || 0} | RESOLVED: {report.conflicts.RESOLVED || 0} |
              {' '}IGNORED: {report.conflicts.IGNORED || 0}
            </p>
          </div>
        ) : null}
      </div>

      {preview ? (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-xs">
          <h2 className="font-semibold text-sm">Önizleme (ilk {preview.rows.length} satır)</h2>
          <div className="space-y-1 max-h-64 overflow-auto">
            {preview.rows.map((row) => (
              <div key={row.id} className="rounded-md border border-border px-2 py-1">
                #{row.rowIndex} | {row.customerName || '-'} | {row.customerPhoneNormalized || '-'} |{' '}
                {row.serviceNameRaw || '-'} | {row.staffNameRaw || '-'} | {row.rowStatus}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="text-[11px] text-muted-foreground">
        Poll tick: {pollTick}
      </div>
    </div>
  );
}
