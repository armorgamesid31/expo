import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigator } from '../context/NavigatorContext';

type SetupResponse = {
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
};

const DAYS = [
  { key: 'MON', label: 'Pzt' },
  { key: 'TUE', label: 'Sal' },
  { key: 'WED', label: 'Çar' },
  { key: 'THU', label: 'Per' },
  { key: 'FRI', label: 'Cum' },
  { key: 'SAT', label: 'Cmt' },
  { key: 'SUN', label: 'Paz' },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: hour,
  label: `${String(hour).padStart(2, '0')}:00`,
}));

function buildSignature(input: {
  name: string;
  address: string;
  whatsappPhone: string;
  city: string;
  countryCode: string;
  workStartHour: number;
  workEndHour: number;
  slotInterval: number;
  workingDays: string[];
}) {
  return JSON.stringify({
    ...input,
    name: input.name.trim(),
    address: input.address.trim(),
    whatsappPhone: input.whatsappPhone.trim(),
    city: input.city.trim(),
    countryCode: input.countryCode.trim().toUpperCase(),
    workingDays: [...input.workingDays].sort(),
  });
}

export function SalonInfoBasicsPage() {
  const { apiFetch } = useAuth();
  const { setHeaderTitle, setHeaderActions } = useNavigator();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [initialSignature, setInitialSignature] = useState('');

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

  const currentSignature = useMemo(() => buildSignature(form), [form]);
  const hasChanges = Boolean(initialSignature && currentSignature !== initialSignature);

  useEffect(() => {
    setHeaderTitle('Temel Bilgiler');
    setHeaderActions(
      <button
        type="button"
        onClick={() => {
          const formElement = document.getElementById('salon-basic-form') as HTMLFormElement;
          if (formElement) formElement.requestSubmit();
        }}
        disabled={saving || !hasChanges}
        className="min-h-[44px] px-4 rounded-xl bg-[var(--rose-gold)] text-white inline-flex items-center gap-2 font-bold shadow-lg border-0 transition-all active:scale-95 disabled:opacity-60"
      >
        <Check className="h-4 w-4" />
        <span>Kaydet</span>
      </button>,
    );

    return () => {
      setHeaderTitle(null);
      setHeaderActions(null);
    };
  }, [setHeaderTitle, setHeaderActions, saving, hasChanges]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<SetupResponse>('/api/admin/setup');
      const nextForm = {
        name: response.salon.name || '',
        address: response.salon.address || '',
        whatsappPhone: response.salon.whatsappPhone || '',
        city: response.salon.city || '',
        countryCode: response.salon.countryCode || 'TR',
        workStartHour: response.settings?.workStartHour ?? 9,
        workEndHour: response.settings?.workEndHour ?? 18,
        slotInterval: response.settings?.slotInterval ?? 30,
        workingDays:
          response.settings?.workingDays && response.settings.workingDays.length
            ? response.settings.workingDays
            : ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
      };

      setForm(nextForm);
      setInitialSignature(buildSignature(nextForm));
    } catch (err: any) {
      setError(err?.message || 'Bilgiler alınamadı.');
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
    return active.length ? active.join(', ') : 'Kapalı';
  }, [form.workingDays]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!hasChanges) return;

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
      setError(err?.message || 'Kayıt sırasında hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Bilgiler yükleniyor...</div>;
  }

  return (
    <div className="p-4 space-y-4 bg-background min-h-full">
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {message ? <p className="text-sm text-green-600">{message}</p> : null}

      <form id="salon-basic-form" className="space-y-4 pb-24" onSubmit={handleSubmit}>
        <section className="rounded-xl border border-border bg-card/60 p-4 space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">Kimlik ve İletişim</h2>
            <p className="text-xs text-muted-foreground">Salonun temel kimlik ve konum bilgileri.</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="salon-name" className="text-xs font-medium text-muted-foreground">Salon adı</label>
              <input
                id="salon-name"
                className="w-full min-h-[44px] rounded-md border border-border px-3 py-2 text-sm"
                placeholder="Salon adı"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="salon-address" className="text-xs font-medium text-muted-foreground">Adres</label>
              <input
                id="salon-address"
                className="w-full min-h-[44px] rounded-md border border-border px-3 py-2 text-sm"
                placeholder="Adres"
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="salon-city" className="text-xs font-medium text-muted-foreground">Şehir</label>
                <input
                  id="salon-city"
                  className="w-full min-h-[44px] rounded-md border border-border px-3 py-2 text-sm"
                  placeholder="Şehir"
                  value={form.city}
                  onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="salon-country" className="text-xs font-medium text-muted-foreground">Ülke kodu</label>
                <input
                  id="salon-country"
                  className="w-full min-h-[44px] rounded-md border border-border px-3 py-2 text-sm uppercase"
                  placeholder="TR"
                  value={form.countryCode}
                  onChange={(e) => setForm((prev) => ({ ...prev, countryCode: e.target.value.toUpperCase() }))}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border p-3 bg-muted/20 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">WhatsApp numarası</p>
              <p className="text-sm text-foreground">{form.whatsappPhone || 'Henüz bağlı değil'}</p>
              <p className="text-xs text-muted-foreground">Bağlantı kurulduğunda otomatik güncellenir.</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card/60 p-4 space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">Çalışma Saatleri</h2>
            <p className="text-xs text-muted-foreground">Açılış, kapanış ve aktif günleri belirleyin.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="work-start" className="text-xs font-medium text-muted-foreground">Açılış saati</label>
              <select
                id="work-start"
                className="w-full min-h-[44px] rounded-md border border-border px-3 py-2 text-sm"
                value={form.workStartHour}
                onChange={(e) => setForm((prev) => ({ ...prev, workStartHour: Number(e.target.value) }))}
              >
                {HOUR_OPTIONS.map((option) => (
                  <option key={`start-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="work-end" className="text-xs font-medium text-muted-foreground">Kapanış saati</label>
              <select
                id="work-end"
                className="w-full min-h-[44px] rounded-md border border-border px-3 py-2 text-sm"
                value={form.workEndHour}
                onChange={(e) => setForm((prev) => ({ ...prev, workEndHour: Number(e.target.value) }))}
              >
                {HOUR_OPTIONS.map((option) => (
                  <option key={`end-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-3">
            <p className="text-xs text-muted-foreground">Çalışma günleri</p>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => {
                const active = form.workingDays.includes(day.key);
                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => toggleDay(day.key)}
                    className={`min-h-[36px] rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? 'border-[var(--rose-gold)] bg-[var(--rose-gold)]/10 text-[var(--rose-gold)]'
                        : 'border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">Aktif: {schedulePreview}</p>
          </div>
        </section>
      </form>
    </div>
  );
}
