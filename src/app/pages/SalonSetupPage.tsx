import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const DAYS = [
  { key: 'MON', label: 'Pzt' },
  { key: 'TUE', label: 'Sal' },
  { key: 'WED', label: 'Car' },
  { key: 'THU', label: 'Per' },
  { key: 'FRI', label: 'Cum' },
  { key: 'SAT', label: 'Cmt' },
  { key: 'SUN', label: 'Paz' },
];

interface SetupResponse {
  salon: {
    name: string;
    address: string | null;
    whatsappPhone: string | null;
    city: string | null;
    countryCode: string | null;
  };
  settings: {
    workStartHour: number;
    workEndHour: number;
    slotInterval: number;
    workingDays: string[] | null;
  } | null;
  checklist: {
    workingHours: boolean;
    address: boolean;
    phone: boolean;
    service: boolean;
    staff: boolean;
    completed: boolean;
  };
}

export function SalonSetupPage() {
  const { apiFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    address: '',
    whatsappPhone: '',
    city: '',
    countryCode: 'TR',
    workStartHour: 9,
    workEndHour: 18,
    slotInterval: 30,
    workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<SetupResponse>('/api/admin/setup');
      setForm({
        name: response.salon.name || '',
        address: response.salon.address || '',
        whatsappPhone: response.salon.whatsappPhone || '',
        city: response.salon.city || '',
        countryCode: response.salon.countryCode || 'TR',
        workStartHour: response.settings?.workStartHour ?? 9,
        workEndHour: response.settings?.workEndHour ?? 18,
        slotInterval: response.settings?.slotInterval ?? 30,
        workingDays: (response.settings?.workingDays && response.settings.workingDays.length
          ? response.settings.workingDays
          : ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']) as string[],
      });
    } catch (err: any) {
      setError(err?.message || 'Kurulum bilgileri alinamadi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleDay = (day: string) => {
    setForm((prev) => {
      const exists = prev.workingDays.includes(day);
      return {
        ...prev,
        workingDays: exists ? prev.workingDays.filter((item) => item !== day) : [...prev.workingDays, day],
      };
    });
  };

  const schedulePreview = useMemo(() => {
    const active = DAYS.filter((day) => form.workingDays.includes(day.key)).map((day) => day.label);
    return active.length ? active.join(', ') : 'Kapali';
  }, [form.workingDays]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await apiFetch('/api/admin/setup', {
        method: 'PUT',
        body: JSON.stringify({
          name: form.name,
          address: form.address,
          whatsappPhone: form.whatsappPhone,
          city: form.city,
          countryCode: form.countryCode,
          workStartHour: form.workStartHour,
          workEndHour: form.workEndHour,
          slotInterval: form.slotInterval,
          workingDays: form.workingDays,
        }),
      });

      setMessage('Kaydedildi.');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Kayit sirasinda hata olustu.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Kurulum bilgileri yukleniyor...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Salon Kurulumu</h1>
        <p className="text-xs text-muted-foreground">Zorunlu adimlari buradan tamamlayabilirsiniz.</p>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {message ? <p className="text-sm text-green-600">{message}</p> : null}

      <form className="space-y-3" onSubmit={handleSubmit}>
        <input className="w-full rounded-md border border-border px-3 py-2 text-sm" placeholder="Salon adi" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
        <input className="w-full rounded-md border border-border px-3 py-2 text-sm" placeholder="Adres" value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} />
        <input className="w-full rounded-md border border-border px-3 py-2 text-sm" placeholder="WhatsApp telefonu" value={form.whatsappPhone} onChange={(e) => setForm((prev) => ({ ...prev, whatsappPhone: e.target.value }))} />

        <div className="grid grid-cols-2 gap-2">
          <input className="rounded-md border border-border px-3 py-2 text-sm" placeholder="Sehir" value={form.city} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} />
          <input className="rounded-md border border-border px-3 py-2 text-sm" placeholder="Ulke kodu" value={form.countryCode} onChange={(e) => setForm((prev) => ({ ...prev, countryCode: e.target.value.toUpperCase() }))} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <input className="rounded-md border border-border px-3 py-2 text-sm" type="number" min={0} max={23} placeholder="Acilis" value={form.workStartHour} onChange={(e) => setForm((prev) => ({ ...prev, workStartHour: Number(e.target.value) }))} />
          <input className="rounded-md border border-border px-3 py-2 text-sm" type="number" min={0} max={23} placeholder="Kapanis" value={form.workEndHour} onChange={(e) => setForm((prev) => ({ ...prev, workEndHour: Number(e.target.value) }))} />
          <input className="rounded-md border border-border px-3 py-2 text-sm" type="number" min={5} max={120} step={5} placeholder="Slot" value={form.slotInterval} onChange={(e) => setForm((prev) => ({ ...prev, slotInterval: Number(e.target.value) }))} />
        </div>

        <div className="rounded-md border border-border p-3">
          <p className="text-xs text-muted-foreground mb-2">Calisma gunleri</p>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => {
              const active = form.workingDays.includes(day.key);
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => toggleDay(day.key)}
                  className={`rounded-full border px-3 py-1 text-xs ${active ? 'border-[var(--rose-gold)] text-[var(--rose-gold)]' : 'border-border text-muted-foreground'}`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Aktif: {schedulePreview}</p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-[var(--rose-gold)] px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {saving ? 'Kaydediliyor...' : 'Save'}
        </button>
      </form>
    </div>
  );
}
