import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigator } from '../context/NavigatorContext';

type SetupResponse = {
  settings: {
    commonQuestions?: Array<{ question: string; answer: string }> | null;
  } | null;
};

const PRESET_SALON_QUESTIONS = [
  { id: 'payment_card', question: 'Kredi kartı geçerli mi?' },
  { id: 'parking', question: 'Otopark var mı?' },
  { id: 'pets', question: 'Evcil hayvan kabul ediliyor mu?' },
];

function normalizeCommonQuestions(value: unknown) {
  if (!Array.isArray(value)) return [] as Array<{ question: string; answer: string }>;
  return value
    .map((item: any) => ({
      question: typeof item?.question === 'string' ? item.question.trim() : '',
      answer: typeof item?.answer === 'string' ? item.answer.trim() : '',
    }))
    .filter((item) => item.question || item.answer);
}

function buildPresetAnswerMap(items: Array<{ question: string; answer: string }>) {
  const map = new Map(items.filter((item) => item.question).map((item) => [item.question.toLowerCase(), item.answer || '']));
  const output: Record<string, string> = {};
  for (const preset of PRESET_SALON_QUESTIONS) {
    output[preset.question] = map.get(preset.question.toLowerCase()) || '';
  }
  return output;
}

function buildSignature(input: {
  presetAnswers: Record<string, string>;
  customQuestions: Array<{ question: string; answer: string }>;
}) {
  const preset = PRESET_SALON_QUESTIONS.map((item) => ({
    question: item.question,
    answer: (input.presetAnswers[item.question] || '').trim(),
  }));
  const custom = input.customQuestions
    .map((item) => ({ question: item.question.trim(), answer: item.answer.trim() }))
    .filter((item) => item.question || item.answer);

  return JSON.stringify({ preset, custom });
}

export function SalonInfoFaqPage() {
  const { apiFetch } = useAuth();
  const { setHeaderTitle, setHeaderActions } = useNavigator();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [presetAnswers, setPresetAnswers] = useState<Record<string, string>>({});
  const [customQuestions, setCustomQuestions] = useState<Array<{ question: string; answer: string }>>([]);
  const [initialSignature, setInitialSignature] = useState('');

  const currentSignature = useMemo(
    () => buildSignature({ presetAnswers, customQuestions }),
    [presetAnswers, customQuestions],
  );
  const hasChanges = Boolean(initialSignature && currentSignature !== initialSignature);

  useEffect(() => {
    setHeaderTitle('Sık Sorulan Sorular');
    setHeaderActions(
      <button
        type="button"
        onClick={() => {
          const formElement = document.getElementById('salon-faq-form') as HTMLFormElement;
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
      const normalizedQuestions = normalizeCommonQuestions(response.settings?.commonQuestions);
      const presetMap = buildPresetAnswerMap(normalizedQuestions);
      const presetKeys = new Set(PRESET_SALON_QUESTIONS.map((item) => item.question.toLowerCase()));
      const nextCustomQuestions = normalizedQuestions.filter((item) => !presetKeys.has(item.question.toLowerCase()));

      setPresetAnswers(presetMap);
      setCustomQuestions(nextCustomQuestions);
      setInitialSignature(buildSignature({ presetAnswers: presetMap, customQuestions: nextCustomQuestions }));
    } catch (err: any) {
      setError(err?.message || 'SSS bilgileri alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

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
        body: JSON.stringify({ commonQuestions: mergedQuestions }),
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
    return <div className="p-4 text-sm text-muted-foreground">SSS bilgileri yükleniyor...</div>;
  }

  return (
    <div className="p-4 space-y-4 bg-background min-h-full">
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {message ? <p className="text-sm text-green-600">{message}</p> : null}

      <form id="salon-faq-form" className="space-y-4 pb-24" onSubmit={handleSubmit}>
        <section className="rounded-xl border border-border bg-card/60 p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-foreground">Sık Sorulan Sorular</h2>
              <p className="text-xs text-muted-foreground">Ön tanımlı soruları yanıtlayın, gerekirse özel soru ekleyin.</p>
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
              <p className="text-xs text-muted-foreground">Ek soru yok. İstersen + Soru Ekle ile ekleyebilirsin.</p>
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
