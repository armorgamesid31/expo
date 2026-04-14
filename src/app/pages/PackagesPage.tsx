import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { PackageTemplateItem } from '../types/mobile-api';
import { useNavigator } from '../context/NavigatorContext';

interface ServiceItem {
  id: number;
  name: string;
}

interface TemplateFormService {
  serviceId: string;
  initialQuota: string;
}

const EMPTY_FORM_SERVICE: TemplateFormService = { serviceId: '', initialQuota: '8' };

export function PackagesPage() {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const { setHeaderTitle, setHeaderActions } = useNavigator();

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [templates, setTemplates] = useState<PackageTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [scopeType, setScopeType] = useState<'SINGLE_SERVICE' | 'POOL'>('SINGLE_SERVICE');
  const [price, setPrice] = useState('');
  const [validityDays, setValidityDays] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [rows, setRows] = useState<TemplateFormService[]>([{ ...EMPTY_FORM_SERVICE }]);

  useEffect(() => {
    setHeaderTitle('Paket Yönetimi');
    setHeaderActions(
      <button
        type="button"
        onClick={submitTemplate}
        disabled={saving}
        className="h-10 px-4 rounded-xl bg-[var(--rose-gold)] text-white inline-flex items-center gap-2 font-bold shadow-lg border-0 transition-all active:scale-95 disabled:opacity-60"
      >
        <span>Kaydet</span>
      </button>
    );
    return () => {
      setHeaderTitle(null);
      setHeaderActions(null);
    };
  }, [setHeaderTitle, setHeaderActions, saving, name, rows, price, validityDays]);

  const serviceOptions = useMemo(
    () => services.map((service) => ({ label: service.name, value: String(service.id) })),
    [services]
  );

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setScopeType('SINGLE_SERVICE');
    setPrice('');
    setValidityDays('');
    setNotes('');
    setIsActive(true);
    setRows([{ ...EMPTY_FORM_SERVICE }]);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [servicesResponse, templatesResponse] = await Promise.all([
        apiFetch<{ items: ServiceItem[]; }>('/api/admin/services'),
        apiFetch<{ items: PackageTemplateItem[]; }>('/api/admin/package-templates')]
      );
      setServices(servicesResponse.items || []);
      setTemplates(templatesResponse.items || []);
    } catch (err: any) {
      setError(err?.message || "Paket şablonları yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const addRow = () => {
    setRows((prev) => [...prev, { ...EMPTY_FORM_SERVICE }]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const setRowValue = (index: number, patch: Partial<TemplateFormService>) => {
    setRows((prev) => prev.map((row, idx) => idx === index ? { ...row, ...patch } : row));
  };

  const hydrateFormFromTemplate = (item: PackageTemplateItem) => {
    setEditingId(item.id);
    setName(item.name || '');
    setScopeType(item.scopeType || 'SINGLE_SERVICE');
    setPrice(item.price === null || item.price === undefined ? '' : String(item.price));
    setValidityDays(item.validityDays === null || item.validityDays === undefined ? '' : String(item.validityDays));
    setNotes(item.notes || '');
    setIsActive(Boolean(item.isActive));
    setRows(
      item.services.length ?
        item.services.map((row) => ({
          serviceId: String(row.serviceId),
          initialQuota: String(row.initialQuota)
        })) :
        [{ ...EMPTY_FORM_SERVICE }]
    );
  };

  const submitTemplate = async () => {
    const normalizedName = name.trim();
    if (!normalizedName) {
      setError('Şablon adı zorunludur.');
      return;
    }

    const payloadServices = rows.
      map((row) => ({
        serviceId: Number(row.serviceId),
        initialQuota: Number(row.initialQuota)
      })).
      filter(
        (row) =>
          Number.isInteger(row.serviceId) &&
          row.serviceId > 0 &&
          Number.isInteger(row.initialQuota) &&
          row.initialQuota > 0
      );

    const uniqueServiceIds = new Set(payloadServices.map((row) => row.serviceId));
    if (!payloadServices.length || payloadServices.length !== uniqueServiceIds.size) {
      setError("En az bir geçerli hizmet ekleyin ve yinelenen hizmetlerden kaçının.");
      return;
    }

    if (validityDays && (!Number.isInteger(Number(validityDays)) || Number(validityDays) <= 0)) {
      setError('Geçerlilik günü pozitif bir tam sayı olmalıdır.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        name: normalizedName,
        scopeType,
        services: payloadServices,
        isActive,
        price: price.trim() ? Number(price) : null,
        validityDays: validityDays.trim() ? Number(validityDays) : null,
        notes: notes.trim() || null
      };

      if (editingId) {
        await apiFetch<{ item: PackageTemplateItem; }>(`/api/admin/package-templates/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setSuccess('Şablon güncellendi.');
      } else {
        await apiFetch<{ item: PackageTemplateItem; }>('/api/admin/package-templates', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setSuccess('Şablon oluşturuldu.');
      }

      resetForm();
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Şablon kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-xl border border-border bg-card p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{editingId ? "Şablonu Düzenle" : "Yeni Şablon"}</p>
          {editingId ?
            <button type="button" className="rounded-md border border-border px-3 py-1.5 text-xs" onClick={resetForm}>
              İptal
            </button> :
            null}
        </div>

        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-md border border-border px-3 py-2 text-sm"
          placeholder="Şablon adı" />


        <div className="grid grid-cols-2 gap-2">
          <select
            value={scopeType}
            onChange={(event) => setScopeType(event.target.value === 'POOL' ? 'POOL' : 'SINGLE_SERVICE')}
            className="h-10 rounded-md border border-border px-3 text-sm bg-background">

            <option value="SINGLE_SERVICE">Tek Hizmet</option>
            <option value="POOL">Pool</option>
          </select>
          <select
            value={isActive ? '1' : '0'}
            onChange={(event) => setIsActive(event.target.value === '1')}
            className="h-10 rounded-md border border-border px-3 text-sm bg-background">

            <option value="1">Aktif</option>
            <option value="0">Pasif</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            value={price}
            type="number"
            min="0"
            step="0.01"
            onChange={(event) => setPrice(event.target.value)}
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
            placeholder="Fiyat (isteğe bağlı)" />

          <input
            value={validityDays}
            type="number"
            min="1"
            step="1"
            onChange={(event) => setValidityDays(event.target.value)}
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
            placeholder="Geçerlilik günü" />

        </div>

        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="w-full rounded-md border border-border px-3 py-2 text-sm min-h-[80px]"
          placeholder="Notlar (isteğe bağlı)" />


        <div className="space-y-2 rounded-md border border-border p-2">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hizmetler ve Haklar</p>
            <button type="button" onClick={addRow} className="rounded-md border border-primary/20 bg-primary/5 px-2 py-1 text-xs text-primary font-bold">
              + Ekle
            </button>
          </div>

          <div className="space-y-2">
            {rows.map((row, idx) =>
              <div key={idx} className="flex gap-2">
                <select
                  value={row.serviceId}
                  onChange={(event) => setRowValue(idx, { serviceId: event.target.value })}
                  className="flex-1 h-10 rounded-md border border-border px-2 text-sm bg-background min-w-0">
                  <option value="">Hizmet seçin</option>
                  {serviceOptions.map((option) =>
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  )}
                </select>

                <input
                  value={row.initialQuota}
                  onChange={(event) => setRowValue(idx, { initialQuota: event.target.value })}
                  type="number"
                  min="1"
                  className="w-16 h-10 rounded-md border border-border px-2 text-sm text-center"
                  placeholder="Hak" />

                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="w-10 h-10 rounded-md border border-red-100 text-red-500 bg-red-50 flex items-center justify-center shrink-0"
                  disabled={rows.length <= 1}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}


      </div>

      <div className="rounded-xl border border-border bg-card p-3 space-y-3">
        <p className="text-sm font-bold">Mevcut Şablonlar</p>
        {loading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> : null}
        
        <div className="space-y-3">
          {templates.map((template) =>
            <div key={template.id} className="rounded-xl border border-border p-3 space-y-2 bg-muted/20">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-sm">{template.name}</p>
                <button
                  type="button"
                  className="rounded-md bg-background border border-border px-2.5 py-1 text-[11px] font-bold"
                  onClick={() => hydrateFormFromTemplate(template)}>
                  Düzenle
                </button>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] items-center">
                <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${template.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                  {template.isActive ? "Aktif" : "Pasif"}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="font-medium text-muted-foreground uppercase">{template.scopeType === 'POOL' ? 'Havuz' : 'Tek Hizmet'}</span>
                <span className="text-muted-foreground">•</span>
                <span className="font-medium text-muted-foreground">{template.validityDays ? `${template.validityDays} Gün` : "Sınırsız"}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {template.services.map((service) =>
                  <span key={service.id} className="text-[10px] bg-background rounded-lg border border-border px-2 py-1 flex items-center gap-1 font-medium">
                    <span className="text-muted-foreground">#{service.service?.name || service.serviceId}</span>
                    <span className="font-bold text-primary">{service.initialQuota} Seans</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}