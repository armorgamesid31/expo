import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigator } from '../context/NavigatorContext';
import { Check } from 'lucide-react';

const DAYS = [
  { key: 'MON', label: 'Pzt' },
  { key: 'TUE', label: 'Sal' },
  { key: 'WED', label: 'Car' },
  { key: 'THU', label: 'Per' },
  { key: 'FRI', label: 'Cum' },
  { key: 'SAT', label: 'Cmt' },
  { key: 'SUN', label: 'Paz' },
];

const PRESET_SALON_QUESTIONS = [
  { id: 'payment_card', question: 'Kredi karti gecerli mi?' },
  { id: 'parking', question: 'Otopark var mi?' },
  { id: 'pets', question: 'Evcil hayvan kabul ediliyor mu?' },
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
    commonQuestions?: Array<{ question: string; answer: string }> | null;
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

function buildSetupSignature(input: {
  form: {
    name: string;
    address: string;
    whatsappPhone: string;
    city: string;
    countryCode: string;
    workStartHour: number;
    workEndHour: number;
    slotInterval: number;
    workingDays: string[];
  };
  presetAnswers: Record<string, string>;
  customQuestions: Array<{ question: string; answer: string }>;
}) {
  const normalizedForm = {
    name: input.form.name.trim(),
    address: input.form.address.trim(),
    whatsappPhone: input.form.whatsappPhone.trim(),
    city: input.form.city.trim(),
    countryCode: input.form.countryCode.trim().toUpperCase(),
    workStartHour: Number(input.form.workStartHour),
    workEndHour: Number(input.form.workEndHour),
    slotInterval: Number(input.form.slotInterval),
    workingDays: [...input.form.workingDays].sort(),
  };

  const preset = PRESET_SALON_QUESTIONS.map((item) => ({
    question: item.question,
    answer: (input.presetAnswers[item.question] || '').trim(),
  }));

  const custom = input.customQuestions
    .map((item) => ({
      question: item.question.trim(),
      answer: item.answer.trim(),
    }))
    .filter((item) => item.question || item.answer);

  return JSON.stringify({ form: normalizedForm, preset, custom });
}

export function SalonSetupPage() {
  const { apiFetch } = useAuth();
  const { setHeaderTitle, setHeaderActions } = useNavigator();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [presetAnswers, setPresetAnswers] = useState<Record<string, string>>({});
  const [initialSignature, setInitialSignature] = useState('');
  const [customQuestions, setCustomQuestions] = useState<Array<{ question: string; answer: string }>>([]);
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

  const currentSignature = useMemo(
    () => buildSetupSignature({ form, presetAnswers, customQuestions }),
    [form, presetAnswers, customQuestions],
  );
  const hasChanges = Boolean(initialSignature && currentSignature !== initialSignature);

  useEffect(() => {
    setHeaderTitle('Salon Ayarlari');
    setHeaderActions(
      <button
        type="button"
        onClick={() => {
          const formElement = document.getElementById('salon-setup-form') as HTMLFormElement;
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

  const normalizeCommonQuestions = (value: unknown) => {
    if (!Array.isArray(value)) return [];
    return value
      .map((item: any) => ({
        question: typeof item?.question === 'string' ? item.question.trim() : '',
        answer: typeof item?.answer === 'string' ? item.answer.trim() : '',
      }))
      .filter((item: any) => item.question || item.answer);
  };

  const buildPresetAnswerMap = (items: Array<{ question: string; answer: string }>) => {
    const map = new Map(
      items
        .filter((item) => item.question)
        .map((item) => [item.question.toLowerCase(), item.answer || '']),
    );

    const output: Record<string, string> = {};
    for (const preset of PRESET_SALON_QUESTIONS) {
      output[preset.question] = map.get(preset.question.toLowerCase()) || '';
    }
    return output;
  };

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

      const normalizedQuestions = normalizeCommonQuestions(response.settings?.commonQuestions);
      const presetMap = buildPresetAnswerMap(normalizedQuestions);
      setPresetAnswers(presetMap);

      const presetKeys = new Set(PRESET_SALON_QUESTIONS.map((item) => item.question.toLowerCase()));
      const nextCustomQuestions = normalizedQuestions.filter((item) => !presetKeys.has(item.question.toLowerCase()));
      setCustomQuestions(nextCustomQuestions);
      setInitialSignature(
        buildSetupSignature({
          form: {
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
          },
          presetAnswers: presetMap,
          customQuestions: nextCustomQuestions,
        }),
      );
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

  const addCommonQuestion = () => {
    setCustomQuestions((prev) => [...prev, { question: '', answer: '' }]);
  };

  const updateCommonQuestion = (index: number, field: 'question' | 'answer', value: string) => {
    setCustomQuestions((prev) => prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)));
  };

  const removeCommonQuestion = (index: number) => {
    setCustomQuestions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updatePresetAnswer = (question: string, value: string) => {
    setPresetAnswers((prev) => ({ ...prev, [question]: value }));
  };

  const schedulePreview = useMemo(() => {
    const active = DAYS.filter((day) => form.workingDays.includes(day.key)).map((day) => day.label);
    return active.length ? active.join(', ') : 'Kapali';
  }, [form.workingDays]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!hasChanges) return;
    setSaving(true);
    setError(null);
    setMessage(null);

    const presetQuestions = PRESET_SALON_QUESTIONS.map((item) => ({
      question: item.question,
      answer: (presetAnswers[item.question] || '').trim(),
    }));

    const cleanedQuestions = customQuestions
      .map((item) => ({
        question: item.question.trim(),
        answer: item.answer.trim(),
      }))
      .filter((item) => item.question || item.answer);

    const mergedQuestions = [...presetQuestions, ...cleanedQuestions].filter((item) => item.question || item.answer);

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
          commonQuestions: mergedQuestions,
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
    <div className="p-4 space-y-4 bg-background min-h-full">
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {message ? <p className="text-sm text-green-600">{message}</p> : null}

      <form id="salon-setup-form" className="space-y-4 pb-24" onSubmit={handleSubmit}>
        <section className="rounded-xl border border-border bg-card/60 p-4 space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">Temel Bilgiler</h2>
            <p className="text-xs text-muted-foreground">Salonun genel bilgileri ve iletisim alani.</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="salon-name" className="text-xs font-medium text-muted-foreground">Salon adi</label>
              <input
                id="salon-name"
                className="w-full min-h-[44px] rounded-md border border-border px-3 py-2 text-sm"
                placeholder="Salon adi"
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

            <div className="space-y-1.5">
              <label htmlFor="salon-whatsapp" className="text-xs font-medium text-muted-foreground">WhatsApp telefonu</label>
              <input
                id="salon-whatsapp"
                className="w-full min-h-[44px] rounded-md border border-border px-3 py-2 text-sm"
                placeholder="WhatsApp telefonu"
                value={form.whatsappPhone}
                onChange={(e) => setForm((prev) => ({ ...prev, whatsappPhone: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="salon-city" className="text-xs font-medium text-muted-foreground">Sehir</label>
                <input
                  id="salon-city"
                  className="w-full min-h-[44px] rounded-md border border-border px-3 py-2 text-sm"
                  placeholder="Sehir"
                  value={form.city}
                  onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="salon-country" className="text-xs font-medium text-muted-foreground">Ulke kodu</label>
                <input
                  id="salon-country"
                  className="w-full min-h-[44px] rounded-md border border-border px-3 py-2 text-sm uppercase"
                  placeholder="TR"
                  value={form.countryCode}
                  onChange={(e) => setForm((prev) => ({ ...prev, countryCode: e.target.value.toUpperCase() }))}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card/60 p-4 space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">Calisma Saatleri</h2>
            <p className="text-xs text-muted-foreground">Acilis, kapanis ve randevu araligi ayarlari.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="work-start" className="text-xs font-medium text-muted-foreground">Acilis</label>
              <input
                id="work-start"
                className="w-full min-h-[44px] rounded-md border border-border px-3 py-2 text-sm"
                type="number"
                min={0}
                max={23}
                placeholder="9"
                value={form.workStartHour}
                onChange={(e) => setForm((prev) => ({ ...prev, workStartHour: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="work-end" className="text-xs font-medium text-muted-foreground">Kapanis</label>
              <input
                id="work-end"
                className="w-full min-h-[44px] rounded-md border border-border px-3 py-2 text-sm"
                type="number"
                min={0}
                max={23}
                placeholder="18"
                value={form.workEndHour}
                onChange={(e) => setForm((prev) => ({ ...prev, workEndHour: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="slot-interval" className="text-xs font-medium text-muted-foreground">Aralik (dk)</label>
              <input
                id="slot-interval"
                className="w-full min-h-[44px] rounded-md border border-border px-3 py-2 text-sm"
                type="number"
                min={5}
                max={120}
                step={5}
                placeholder="30"
                value={form.slotInterval}
                onChange={(e) => setForm((prev) => ({ ...prev, slotInterval: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-3">
            <p className="text-xs text-muted-foreground">Calisma gunleri</p>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => {
                const active = form.workingDays.includes(day.key);
                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => toggleDay(day.key)}
                    className={`min-h-[36px] rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${active ? 'border-[var(--rose-gold)] bg-[var(--rose-gold)]/10 text-[var(--rose-gold)]' : 'border-border text-muted-foreground hover:bg-muted/40'}`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">Aktif: {schedulePreview}</p>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card/60 p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-foreground">Salon Bilgileri · Sik Sorular</h2>
              <p className="text-xs text-muted-foreground">On tanimli sorularda sadece cevaplari doldurun. Gerekirse ek soru ekleyin.</p>
            </div>
            <button
              type="button"
              onClick={addCommonQuestion}
              className="min-h-[36px] rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/40"
            >
              + Soru Ekle
            </button>
          </div>

          <div className="space-y-3">
            {PRESET_SALON_QUESTIONS.map((preset) => (
              <div key={preset.id} className="rounded-lg border border-border/70 p-3 space-y-2 bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground">{preset.question}</p>
                <textarea
                  className="w-full rounded-md border border-border px-3 py-2 text-sm min-h-[88px]"
                  placeholder="Cevap"
                  value={presetAnswers[preset.question] || ''}
                  onChange={(e) => updatePresetAnswer(preset.question, e.target.value)}
                />
              </div>
            ))}

            {customQuestions.length === 0 ? (
              <p className="text-xs text-muted-foreground">Ek soru yok. Istersen + Soru Ekle ile ekleyebilirsin.</p>
            ) : (
              <div className="space-y-3">
                {customQuestions.map((item, index) => (
                  <div key={`faq-${index}`} className="rounded-lg border border-border/70 p-3 space-y-2">
                    <input
                      className="w-full min-h-[44px] rounded-md border border-border px-3 py-2 text-sm"
                      placeholder="Soru"
                      value={item.question}
                      onChange={(e) => updateCommonQuestion(index, 'question', e.target.value)}
                    />

                    <textarea
                      className="w-full rounded-md border border-border px-3 py-2 text-sm min-h-[88px]"
                      placeholder="Cevap"
                      value={item.answer}
                      onChange={(e) => updateCommonQuestion(index, 'answer', e.target.value)}
                    />

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeCommonQuestion(index)}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </form>
    </div>
  );
}

