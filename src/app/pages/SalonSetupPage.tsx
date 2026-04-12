import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const DAYS = [
{ key: 'MON', label: 'Pzt' },
{ key: 'TUE', label: 'Sal' },
{ key: 'WED', label: 'Car' },
{ key: 'THU', label: 'Per' },
{ key: 'FRI', label: 'Cum' },
{ key: 'SAT', label: 'Cmt' },
{ key: 'SUN', label: 'Paz' }];


const PRESET_SALON_QUESTIONS = [
{ id: 'payment_card', question: 'Kredi kartı geçerli mi?' },
{ id: 'parking', question: 'Otopark var mı?' },
{ id: 'pets', question: 'Evcil hayvan kabul ediliyor mu?' }];


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
    commonQuestions?: Array<{question: string;answer: string;}> | null;
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
  const [presetAnswers, setPresetAnswers] = useState<Record<string, string>>({});
  const [customQuestions, setCustomQuestions] = useState<Array<{question: string;answer: string;}>>([]);
  const [form, setForm] = useState({
    name: '',
    address: '',
    whatsappPhone: '',
    city: '',
    countryCode: 'TR',
    workStartHour: 9,
    workEndHour: 18,
    slotInterval: 30,
    workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  });

  const normalizeCommonQuestions = (value: unknown) => {
    if (!Array.isArray(value)) return [];
    return value.
    map((item: any) => ({
      question: typeof item?.question === 'string' ? item.question.trim() : '',
      answer: typeof item?.answer === 'string' ? item.answer.trim() : ''
    })).
    filter((item: any) => item.question || item.answer);
  };

  const buildPresetAnswerMap = (items: Array<{question: string;answer: string;}>) => {
    const map = new Map(
      items.
      filter((item) => item.question).
      map((item) => [item.question.toLowerCase(), item.answer || ''])
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
        workingDays: (response.settings?.workingDays && response.settings.workingDays.length ?
        response.settings.workingDays :
        ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']) as string[]
      });
      const normalizedQuestions = normalizeCommonQuestions(response.settings?.commonQuestions);
      const presetMap = buildPresetAnswerMap(normalizedQuestions);
      setPresetAnswers(presetMap);
      const presetKeys = new Set(PRESET_SALON_QUESTIONS.map((item) => item.question.toLowerCase()));
      setCustomQuestions(
        normalizedQuestions.filter((item) => !presetKeys.has(item.question.toLowerCase()))
      );
    } catch (err: any) {
      setError(err?.message || 'Could not fetch setup information.');
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
        workingDays: exists ? prev.workingDays.filter((item) => item !== day) : [...prev.workingDays, day]
      };
    });
  };

  const addCommonQuestion = () => {
    setCustomQuestions((prev) => [...prev, { question: '', answer: '' }]);
  };

  const updateCommonQuestion = (index: number, field: 'question' | 'answer', value: string) => {
    setCustomQuestions((prev) =>
    prev.map((item, idx) => idx === index ? { ...item, [field]: value } : item)
    );
  };

  const removeCommonQuestion = (index: number) => {
    setCustomQuestions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updatePresetAnswer = (question: string, value: string) => {
    setPresetAnswers((prev) => ({ ...prev, [question]: value }));
  };

  const schedulePreview = useMemo(() => {
    const active = DAYS.filter((day) => form.workingDays.includes(day.key)).map((day) => day.label);
    return active.length ? active.join(', ') : "Kapalı";
  }, [form.workingDays]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const presetQuestions = PRESET_SALON_QUESTIONS.map((item) => ({
      question: item.question,
      answer: (presetAnswers[item.question] || '').trim()
    }));

    const cleanedQuestions = customQuestions.
    map((item) => ({
      question: item.question.trim(),
      answer: item.answer.trim()
    })).
    filter((item) => item.question || item.answer);

    const mergedQuestions = [...presetQuestions, ...cleanedQuestions].filter(
      (item) => item.question || item.answer
    );

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
          commonQuestions: mergedQuestions
        })
      });

      setMessage("Kaydedildi.");
      await load();
    } catch (err: any) {
      setError(err?.message || "Kayıt sırasında hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Kurulum bilgileri yükleniyor...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Salon Setup</h1>
        <p className="text-xs text-muted-foreground">You can complete required steps here.</p>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {message ? <p className="text-sm text-green-600">{message}</p> : null}

      <form className="space-y-3" onSubmit={handleSubmit}>
        <input className="w-full rounded-md border border-border px-3 py-2 text-sm" placeholder="Salon name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
        <input className="w-full rounded-md border border-border px-3 py-2 text-sm" placeholder="Adres" value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} />
        <input className="w-full rounded-md border border-border px-3 py-2 text-sm" placeholder="WhatsApp telefonu" value={form.whatsappPhone} onChange={(e) => setForm((prev) => ({ ...prev, whatsappPhone: e.target.value }))} />

        <div className="grid grid-cols-2 gap-2">
          <input className="rounded-md border border-border px-3 py-2 text-sm" placeholder="City" value={form.city} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} />
          <input className="rounded-md border border-border px-3 py-2 text-sm" placeholder="Country code" value={form.countryCode} onChange={(e) => setForm((prev) => ({ ...prev, countryCode: e.target.value.toUpperCase() }))} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <input className="rounded-md border border-border px-3 py-2 text-sm" type="number" min={0} max={23} placeholder="Opening" value={form.workStartHour} onChange={(e) => setForm((prev) => ({ ...prev, workStartHour: Number(e.target.value) }))} />
          <input className="rounded-md border border-border px-3 py-2 text-sm" type="number" min={0} max={23} placeholder="Closing" value={form.workEndHour} onChange={(e) => setForm((prev) => ({ ...prev, workEndHour: Number(e.target.value) }))} />
          <input className="rounded-md border border-border px-3 py-2 text-sm" type="number" min={5} max={120} step={5} placeholder="Slot" value={form.slotInterval} onChange={(e) => setForm((prev) => ({ ...prev, slotInterval: Number(e.target.value) }))} />
        </div>

        <div className="rounded-md border border-border p-3">
          <p className="text-xs text-muted-foreground mb-2">Working days</p>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => {
              const active = form.workingDays.includes(day.key);
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => toggleDay(day.key)}
                  className={`rounded-full border px-3 py-1 text-xs ${active ? 'border-[var(--rose-gold)] text-[var(--rose-gold)]' : 'border-border text-muted-foreground'}`}>
                  
                  {day.label}
                </button>);

            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Aktif: {schedulePreview}</p>
        </div>

        <div className="rounded-md border border-border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Salon Bilgileri · Sık Sorular</p>
              <p className="text-xs text-muted-foreground">Önceden tanımlı sorular için sadece cevapları girin.</p>
            </div>
            <button
              type="button"
              onClick={addCommonQuestion}
              className="rounded-full border border-border px-3 py-1 text-xs">
              
              + Soru Ekle
            </button>
          </div>

          <div className="space-y-2">
            {PRESET_SALON_QUESTIONS.map((preset) =>
            <div key={preset.id} className="rounded-md border border-border/60 p-2 space-y-2 bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground">{preset.question}</p>
                <textarea
                className="w-full rounded-md border border-border px-3 py-2 text-sm min-h-[70px]"
                placeholder="Cevap"
                value={presetAnswers[preset.question] || ''}
                onChange={(e) => updatePresetAnswer(preset.question, e.target.value)} />
              
              </div>
            )}

            {customQuestions.length === 0 ?
            <p className="text-xs text-muted-foreground">Ek soru yok. İstersen + Soru Ekle ile ekleyebilirsin.</p> :

            <div className="space-y-2">
                {customQuestions.map((item, index) =>
              <div key={`faq-${index}`} className="rounded-md border border-border/60 p-2 space-y-2">
                    <input
                  className="w-full rounded-md border border-border px-3 py-2 text-sm"
                  placeholder="Soru"
                  value={item.question}
                  onChange={(e) => updateCommonQuestion(index, 'question', e.target.value)} />
                
                    <textarea
                  className="w-full rounded-md border border-border px-3 py-2 text-sm min-h-[70px]"
                  placeholder="Cevap"
                  value={item.answer}
                  onChange={(e) => updateCommonQuestion(index, 'answer', e.target.value)} />
                
                    <div className="flex justify-end">
                      <button
                    type="button"
                    onClick={() => removeCommonQuestion(index)}
                    className="text-xs text-red-600">
                    
                        Sil
                      </button>
                    </div>
                  </div>
              )}
              </div>
            }
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-[var(--rose-gold)] px-4 py-2 text-sm text-white disabled:opacity-60">
          
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </form>
    </div>);

}