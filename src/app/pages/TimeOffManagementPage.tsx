import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarRange, UserRound, Plus, Trash2, Pencil, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigator } from '../context/NavigatorContext';

type StaffItem = {
  id: number;
  name: string;
  title?: string | null;
};

type SalonClosureDto = {
  id: number;
  salonId: number;
  startAt: string;
  endAt: string;
  reason: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type StaffTimeOffDto = {
  id: number;
  salonId: number;
  staffId: number;
  startAt: string;
  endAt: string;
  reason: string | null;
  createdAt?: string;
  updatedAt?: string;
  staff?: {
    id: number;
    name: string;
    title?: string | null;
  };
};

function formatIstanbulInput(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const pick = (type: string) => parts.find((item) => item.type === type)?.value || '00';
  return `${pick('year')}-${pick('month')}-${pick('day')}T${pick('hour')}:${pick('minute')}`;
}

function toIstanbulIso(input: string): string {
  return `${input}:00+03:00`;
}

function formatWindowLabel(startAt: string, endAt: string): string {
  const start = formatIstanbulInput(startAt).replace('T', ' ');
  const end = formatIstanbulInput(endAt).replace('T', ' ');
  return `${start} - ${end}`;
}

export function TimeOffManagementPage() {
  const { apiFetch } = useAuth();
  const { setHeaderTitle, setHeaderActions } = useNavigator();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [closures, setClosures] = useState<SalonClosureDto[]>([]);
  const [timeOffs, setTimeOffs] = useState<StaffTimeOffDto[]>([]);

  const [editingClosureId, setEditingClosureId] = useState<number | null>(null);
  const [closureForm, setClosureForm] = useState({
    startAt: '',
    endAt: '',
    reason: '',
  });

  const [editingTimeOffId, setEditingTimeOffId] = useState<number | null>(null);
  const [timeOffForm, setTimeOffForm] = useState({
    staffId: '',
    startAt: '',
    endAt: '',
    reason: '',
  });

  useEffect(() => {
    setHeaderTitle('Tatil ve İzin Yönetimi');
    setHeaderActions(
      <div className="h-9 w-9" />
    );
    return () => {
      setHeaderTitle(null);
      setHeaderActions(null);
    };
  }, [setHeaderTitle, setHeaderActions]);

  const sortedStaff = useMemo(() => [...staff].sort((a, b) => a.name.localeCompare(b.name, 'tr')), [staff]);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const [staffRes, closureRes, timeOffRes] = await Promise.all([
        apiFetch<{ items: StaffItem[] }>('/api/admin/staff'),
        apiFetch<{ items: SalonClosureDto[] }>('/api/admin/salon-closures'),
        apiFetch<{ items: StaffTimeOffDto[] }>('/api/admin/staff-timeoff'),
      ]);

      setStaff((staffRes.items || []).map((item) => ({ id: item.id, name: item.name, title: item.title || null })));
      setClosures(closureRes.items || []);
      setTimeOffs(timeOffRes.items || []);
    } catch (err: any) {
      setError(err?.message || 'Kayıtlar alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const resetClosureForm = () => {
    setEditingClosureId(null);
    setClosureForm({ startAt: '', endAt: '', reason: '' });
  };

  const resetTimeOffForm = () => {
    setEditingTimeOffId(null);
    setTimeOffForm({ staffId: '', startAt: '', endAt: '', reason: '' });
  };

  const submitClosure = async (event: FormEvent) => {
    event.preventDefault();
    if (!closureForm.startAt || !closureForm.endAt) {
      setError('Salon tatili için başlangıç ve bitiş zorunludur.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        startAt: toIstanbulIso(closureForm.startAt),
        endAt: toIstanbulIso(closureForm.endAt),
        reason: closureForm.reason,
      };

      if (editingClosureId) {
        await apiFetch(`/api/admin/salon-closures/${editingClosureId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/admin/salon-closures', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setMessage('Salon tatili kaydedildi.');
      resetClosureForm();
      await load();
    } catch (err: any) {
      setError(err?.message || 'Salon tatili kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const submitTimeOff = async (event: FormEvent) => {
    event.preventDefault();
    const staffId = Number(timeOffForm.staffId);
    if (!Number.isInteger(staffId) || staffId <= 0) {
      setError('Personel seçimi zorunludur.');
      return;
    }
    if (!timeOffForm.startAt || !timeOffForm.endAt) {
      setError('Personel izni için başlangıç ve bitiş zorunludur.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        staffId,
        startAt: toIstanbulIso(timeOffForm.startAt),
        endAt: toIstanbulIso(timeOffForm.endAt),
        reason: timeOffForm.reason,
      };

      if (editingTimeOffId) {
        await apiFetch(`/api/admin/staff-timeoff/${editingTimeOffId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/admin/staff-timeoff', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setMessage('Personel izni kaydedildi.');
      resetTimeOffForm();
      await load();
    } catch (err: any) {
      setError(err?.message || 'Personel izni kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const editClosure = (item: SalonClosureDto) => {
    setEditingClosureId(item.id);
    setClosureForm({
      startAt: formatIstanbulInput(item.startAt),
      endAt: formatIstanbulInput(item.endAt),
      reason: item.reason || '',
    });
  };

  const editTimeOff = (item: StaffTimeOffDto) => {
    setEditingTimeOffId(item.id);
    setTimeOffForm({
      staffId: String(item.staffId),
      startAt: formatIstanbulInput(item.startAt),
      endAt: formatIstanbulInput(item.endAt),
      reason: item.reason || '',
    });
  };

  const deleteClosure = async (id: number) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/salon-closures/${id}`, { method: 'DELETE' });
      setMessage('Salon tatili silindi.');
      if (editingClosureId === id) resetClosureForm();
      await load();
    } catch (err: any) {
      setError(err?.message || 'Salon tatili silinemedi.');
    } finally {
      setSaving(false);
    }
  };

  const deleteTimeOff = async (id: number) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/staff-timeoff/${id}`, { method: 'DELETE' });
      setMessage('Personel izni silindi.');
      if (editingTimeOffId === id) resetTimeOffForm();
      await load();
    } catch (err: any) {
      setError(err?.message || 'Personel izni silinemedi.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Tatil ve izin kayıtları yükleniyor...</div>;
  }

  return (
    <div className="p-4 space-y-4 bg-background min-h-full pb-24">
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {message ? <p className="text-sm text-green-600">{message}</p> : null}

      <section className="rounded-xl border border-border bg-card/60 p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-[var(--rose-gold)]" />
            <h2 className="text-sm font-semibold text-foreground">Salon Tatili</h2>
          </div>
          {editingClosureId ? (
            <button
              type="button"
              onClick={resetClosureForm}
              className="text-xs font-medium text-muted-foreground hover:underline"
            >
              Vazgeç
            </button>
          ) : null}
        </div>

        <form className="space-y-3" onSubmit={submitClosure}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Başlangıç</label>
              <input
                type="datetime-local"
                className="w-full min-h-[44px] rounded-md border border-border px-3 py-2 text-sm"
                value={closureForm.startAt}
                onChange={(e) => setClosureForm((prev) => ({ ...prev, startAt: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Bitiş</label>
              <input
                type="datetime-local"
                className="w-full min-h-[44px] rounded-md border border-border px-3 py-2 text-sm"
                value={closureForm.endAt}
                onChange={(e) => setClosureForm((prev) => ({ ...prev, endAt: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Not (opsiyonel)</label>
            <input
              className="w-full min-h-[44px] rounded-md border border-border px-3 py-2 text-sm"
              placeholder="Örn: Bayram tatili"
              value={closureForm.reason}
              onChange={(e) => setClosureForm((prev) => ({ ...prev, reason: e.target.value }))}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="min-h-[40px] rounded-md bg-[var(--rose-gold)] text-white px-4 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60"
          >
            {editingClosureId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editingClosureId ? 'Güncelle' : 'Ekle'}
          </button>
        </form>

        <div className="space-y-2">
          {closures.length === 0 ? (
            <p className="text-xs text-muted-foreground">Salon tatili kaydı bulunmuyor.</p>
          ) : (
            closures.map((item) => (
              <div key={item.id} className="rounded-lg border border-border/70 p-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{formatWindowLabel(item.startAt, item.endAt)}</p>
                  <p className="text-xs text-muted-foreground">{item.reason || 'Not yok'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => editClosure(item)} className="text-muted-foreground hover:text-foreground">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => void deleteClosure(item.id)} className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card/60 p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-[var(--deep-indigo)]" />
            <h2 className="text-sm font-semibold text-foreground">Personel İzni</h2>
          </div>
          {editingTimeOffId ? (
            <button
              type="button"
              onClick={resetTimeOffForm}
              className="text-xs font-medium text-muted-foreground hover:underline"
            >
              Vazgeç
            </button>
          ) : null}
        </div>

        <form className="space-y-3" onSubmit={submitTimeOff}>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Personel</label>
            <select
              className="w-full min-h-[44px] rounded-md border border-border px-3 py-2 text-sm"
              value={timeOffForm.staffId}
              onChange={(e) => setTimeOffForm((prev) => ({ ...prev, staffId: e.target.value }))}
            >
              <option value="">Personel seçin</option>
              {sortedStaff.map((staffItem) => (
                <option key={staffItem.id} value={staffItem.id}>
                  {staffItem.name}{staffItem.title ? ` (${staffItem.title})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Başlangıç</label>
              <input
                type="datetime-local"
                className="w-full min-h-[44px] rounded-md border border-border px-3 py-2 text-sm"
                value={timeOffForm.startAt}
                onChange={(e) => setTimeOffForm((prev) => ({ ...prev, startAt: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Bitiş</label>
              <input
                type="datetime-local"
                className="w-full min-h-[44px] rounded-md border border-border px-3 py-2 text-sm"
                value={timeOffForm.endAt}
                onChange={(e) => setTimeOffForm((prev) => ({ ...prev, endAt: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Not (opsiyonel)</label>
            <input
              className="w-full min-h-[44px] rounded-md border border-border px-3 py-2 text-sm"
              placeholder="Örn: Yıllık izin"
              value={timeOffForm.reason}
              onChange={(e) => setTimeOffForm((prev) => ({ ...prev, reason: e.target.value }))}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="min-h-[40px] rounded-md bg-[var(--deep-indigo)] text-white px-4 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60"
          >
            {editingTimeOffId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editingTimeOffId ? 'Güncelle' : 'Ekle'}
          </button>
        </form>

        <div className="space-y-2">
          {timeOffs.length === 0 ? (
            <p className="text-xs text-muted-foreground">Personel izin kaydı bulunmuyor.</p>
          ) : (
            timeOffs.map((item) => (
              <div key={item.id} className="rounded-lg border border-border/70 p-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{item.staff?.name || `#${item.staffId}`}</p>
                  <p className="text-xs text-muted-foreground">{formatWindowLabel(item.startAt, item.endAt)}</p>
                  <p className="text-xs text-muted-foreground">{item.reason || 'Not yok'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => editTimeOff(item)} className="text-muted-foreground hover:text-foreground">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => void deleteTimeOff(item.id)} className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
