import { useEffect, useState } from 'react';
import { ArrowLeft, Bot, CheckCircle2, ChevronRight, CircleHelp, Loader2, MessageCircle, Sparkles, TrendingUp, XCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { readSnapshot, writeSnapshot } from '../../lib/ui-cache';

interface WhatsAppAgentProps {
  onGeri: () => void;
}

const CHAKRA_STATUS_CACHE_KEY = 'chakra:status';
const WHATSAPP_AGENT_SETTINGS_CACHE_KEY = 'whatsapp:agent-settings';

const conversations = [
  { id: 1, name: 'Ayşe Yılmaz', message: 'Cumartesi için randevu alabilir miyim?', time: '14:23', resolved: true, converted: true },
  { id: 2, name: 'Elif Demir', message: 'Manikür fiyatlarınız nedir?', time: '13:45', resolved: true, converted: false },
  { id: 3, name: 'Zeynep Kaya', message: 'Perşembe randevumu iptal etmek istiyorum', time: '12:10', resolved: true, converted: false },
  { id: 4, name: 'Merve Şahin', message: 'Saç boyama ne kadar sürer?', time: '11:30', resolved: false, converted: false },
];

const toneExamples: Record<string, string> = {
  friendly: '"Merhaba, size hemen yardımcı olayım. Uygun bir zaman bulalım mı? 😊"',
  professional: '"Talebinizi aldım. Uygun zaman dilimini kontrol ederek net bir öneri paylaşabilirim."',
  balanced: '"Uygun saatleri kontrol edip size en uygun randevu seçeneğini hemen iletebilirim."',
};

export function WhatsAppAgent({ onGeri }: WhatsAppAgentProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { apiFetch } = useAuth();
  const cachedStatus = readSnapshot<{ connected?: boolean; isActive?: boolean }>(CHAKRA_STATUS_CACHE_KEY, 1000 * 60 * 10);
  const cachedSettings = readSnapshot<{
    isEnabled?: boolean;
    tone?: 'friendly' | 'professional' | 'balanced';
    answerLength?: 'short' | 'medium' | 'detailed';
    emojiUsage?: 'off' | 'low' | 'normal';
    bookingGuidance?: 'low' | 'medium' | 'high';
    handoverThreshold?: 'early' | 'balanced' | 'late';
    aiDisclosure?: 'always' | 'onQuestion' | 'never';
  }>(WHATSAPP_AGENT_SETTINGS_CACHE_KEY, 1000 * 60 * 10);

  const [agentEnabled, setAgentEnabled] = useState(Boolean(cachedSettings?.isEnabled));
  const [chakraConnected, setChakraConnected] = useState(Boolean(cachedStatus?.connected) || Boolean(cachedStatus?.isActive));
  const [chakraPluginActive, setChakraPluginActive] = useState(Boolean(cachedStatus?.isActive));
  const [togglingAgent, setTogglingAgent] = useState(false);
  const [toggleFeedback, setToggleFeedback] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedField, setSavedField] = useState<string | null>(null);
  const [tone, setTone] = useState<'friendly' | 'professional' | 'balanced'>(cachedSettings?.tone || 'balanced');
  const [answerLength, setAnswerLength] = useState<'short' | 'medium' | 'detailed'>(cachedSettings?.answerLength || 'medium');
  const [emojiUsage, setEmojiUsage] = useState<'off' | 'low' | 'normal'>(cachedSettings?.emojiUsage || 'low');
  const [bookingGuidance, setBookingGuidance] = useState<'low' | 'medium' | 'high'>(cachedSettings?.bookingGuidance || 'medium');
  const [handoverThreshold, setHandoverThreshold] = useState<'early' | 'balanced' | 'late'>(cachedSettings?.handoverThreshold || 'balanced');
  const [aiDisclosure, setAiDisclosure] = useState<'always' | 'onQuestion' | 'never'>(cachedSettings?.aiDisclosure || 'onQuestion');

  const conversionRate = 68;
  const totalConversations = 47;
  const resolvedByBot = 39;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [response, chakraStatus] = await Promise.all([
          apiFetch<{ settings?: typeof cachedSettings }>('/api/admin/whatsapp-agent/settings'),
          apiFetch<{ connected?: boolean; isActive?: boolean; pluginId?: string | null }>(`/api/app/chakra/status?t=${Date.now()}`).catch(() => null),
        ]);

        const isConnected = Boolean(chakraStatus?.connected) || Boolean(chakraStatus?.isActive);
        const isActive = Boolean(chakraStatus?.isActive);

        if (active) {
          setChakraConnected(isConnected);
          setChakraPluginActive(isActive);
          writeSnapshot(CHAKRA_STATUS_CACHE_KEY, chakraStatus || {});
        }

        if (!active || !response?.settings) return;
        setAgentEnabled(Boolean(response.settings.isEnabled));
        if (response.settings.tone) setTone(response.settings.tone);
        if (response.settings.answerLength) setAnswerLength(response.settings.answerLength);
        if (response.settings.emojiUsage) setEmojiUsage(response.settings.emojiUsage);
        if (response.settings.bookingGuidance) setBookingGuidance(response.settings.bookingGuidance);
        if (response.settings.handoverThreshold) setHandoverThreshold(response.settings.handoverThreshold);
        if (response.settings.aiDisclosure) setAiDisclosure(response.settings.aiDisclosure);
        writeSnapshot(WHATSAPP_AGENT_SETTINGS_CACHE_KEY, response.settings);
      } catch (error) {
        console.error('Agent settings load failed:', error);
      }
    })();
    return () => { active = false; };
  }, [apiFetch]);

  async function toggleAgentActive(nextValue: boolean) {
    setToggleError(null);
    setToggleFeedback(null);

    if (!chakraConnected) { setToggleError('Önce WhatsApp bağlantısını tamamlayın.'); return; }
    if (!chakraPluginActive) { setToggleError('WhatsApp bağlantısı pasif. Önce bağlantıyı etkinleştirin.'); return; }

    const previous = agentEnabled;
    setAgentEnabled(nextValue);
    setTogglingAgent(true);

    try {
      await apiFetch('/api/admin/whatsapp-agent/settings', {
        method: 'PUT',
        body: JSON.stringify({ isEnabled: nextValue, tone, answerLength, emojiUsage, bookingGuidance, handoverThreshold, aiDisclosure }),
      });
      setToggleFeedback(nextValue ? 'Yapay zeka asistanı etkinleştirildi.' : 'Yapay zeka asistanı devre dışı bırakıldı.');
      writeSnapshot(WHATSAPP_AGENT_SETTINGS_CACHE_KEY, { isEnabled: nextValue, tone, answerLength, emojiUsage, bookingGuidance, handoverThreshold, aiDisclosure });
      setTimeout(() => setToggleFeedback(null), 2000);
    } catch {
      setAgentEnabled(previous);
      setToggleError('Durum güncellenemedi. Lütfen tekrar deneyin.');
    } finally {
      setTogglingAgent(false);
    }
  }

  async function saveSettings(fieldKey: string, overrides?: Partial<{
    isEnabled: boolean; tone: typeof tone; answerLength: typeof answerLength; emojiUsage: typeof emojiUsage;
    bookingGuidance: typeof bookingGuidance; handoverThreshold: typeof handoverThreshold; aiDisclosure: typeof aiDisclosure;
  }>) {
    setIsSaving(true);
    try {
      const payload = {
        isEnabled: overrides?.isEnabled ?? agentEnabled, tone: overrides?.tone ?? tone,
        answerLength: overrides?.answerLength ?? answerLength, emojiUsage: overrides?.emojiUsage ?? emojiUsage,
        bookingGuidance: overrides?.bookingGuidance ?? bookingGuidance, handoverThreshold: overrides?.handoverThreshold ?? handoverThreshold,
        aiDisclosure: overrides?.aiDisclosure ?? aiDisclosure,
      };
      await apiFetch('/api/admin/whatsapp-agent/settings', { method: 'PUT', body: JSON.stringify(payload) });
      setSavedField(fieldKey);
      writeSnapshot(WHATSAPP_AGENT_SETTINGS_CACHE_KEY, payload);
      setTimeout(() => setSavedField((prev) => prev === fieldKey ? null : prev), 1800);
    } catch (error) {
      console.error('Agent settings save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }

  /* ── Setting option renderer ─── */
  function OptionRow({ label, description, options, value, onSelect, fieldKey }: {
    label: string; description: string;
    options: { value: string; label: string }[];
    value: string; onSelect: (v: any) => void; fieldKey: string;
  }) {
    return (
      <div className="space-y-2 py-3 border-b border-border/40 last:border-0">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onSelect(opt.value);
                void saveSettings(fieldKey, { [fieldKey]: opt.value } as any);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                value === opt.value
                  ? 'bg-[var(--rose-gold)] text-white shadow-sm'
                  : 'bg-muted/40 text-foreground border border-border/60 hover:bg-muted/60'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {savedField === fieldKey && <p className="text-[11px] text-emerald-600">✓ Kaydedildi</p>}
      </div>
    );
  }

  return (
    <div className="h-full pb-20 overflow-y-auto">
      {/* ── Header ─── */}
      <div className="sticky top-0 z-10 border-b border-border bg-gradient-to-b from-background to-background/95 backdrop-blur-md">
        <div className="p-4 pb-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onGeri} className="shrink-0 -ml-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold tracking-tight">Yapay Zeka Asistanı</h1>
              <p className="text-xs text-muted-foreground mt-0.5">WhatsApp ve Instagram için otomatik mesajlaşma</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/app/features/whatsapp-agent-faq', { state: { navDirection: 'forward', from: location.pathname } })}
              className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
              aria-label="SSS ekranını aç"
            >
              <CircleHelp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* ── Agent Status Card ─── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-border overflow-hidden shadow-sm"
        >
          <div className={`px-4 py-3 flex items-center justify-between gap-3 border-b border-border/50 ${
            !chakraConnected || !chakraPluginActive
              ? 'bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent'
              : agentEnabled
                ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-400/5 to-transparent'
                : 'bg-gradient-to-r from-zinc-500/10 via-zinc-400/5 to-transparent'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                !chakraConnected || !chakraPluginActive ? 'bg-amber-500/15' : agentEnabled ? 'bg-emerald-500/15' : 'bg-muted'
              }`}>
                <Bot className={`w-5 h-5 ${
                  !chakraConnected || !chakraPluginActive ? 'text-amber-600' : agentEnabled ? 'text-emerald-600' : 'text-muted-foreground'
                }`} />
              </div>
              <div>
                <p className="text-sm font-bold">Asistan Durumu</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`relative flex h-2 w-2`}>
                    {agentEnabled && chakraConnected && chakraPluginActive && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                    )}
                    <span className={`relative inline-flex h-2 w-2 rounded-full ${
                      !chakraConnected || !chakraPluginActive ? 'bg-amber-500' : agentEnabled ? 'bg-emerald-500' : 'bg-zinc-400'
                    }`} />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {!chakraConnected
                      ? 'Bağlı değil — Kurulum gerekli'
                      : !chakraPluginActive
                        ? 'WhatsApp devre dışı'
                        : agentEnabled
                          ? 'Aktif — Mesajlar yanıtlanıyor'
                          : 'Pasif'}
                  </span>
                </div>
              </div>
            </div>
            <Switch
              checked={agentEnabled}
              onCheckedChange={(checked) => void toggleAgentActive(checked)}
              disabled={!chakraConnected || !chakraPluginActive || togglingAgent}
            />
          </div>

          <div className="p-4 bg-card">
            {toggleFeedback && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15 p-2.5 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-xs text-emerald-700">{toggleFeedback}</p>
              </div>
            )}
            {toggleError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/5 border border-red-500/15 p-2.5 mb-3">
                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-xs text-red-700">{toggleError}</p>
              </div>
            )}

            {chakraConnected && !chakraPluginActive && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/5 border border-amber-500/15 p-2.5">
                <XCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-amber-700">WhatsApp bağlantısı pasif. Asistanın çalışması için önce bağlantıyı aktifleştirin.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 h-7 text-[11px]"
                    onClick={onGeri}
                  >
                    Bağlantı Ayarlarına Git
                  </Button>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-2">
              Karmaşık müşteri mesajlarını anlar, soruları yanıtlar ve potansiyel müşterilerinizi akıllıca randevu almaya yönlendirir.
            </p>
          </div>
        </motion.section>

        {/* ── Analytics Cards ─── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <h2 className="font-semibold text-sm mb-3 px-1">Konuşma Analitiği</h2>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { value: totalConversations, label: 'Bu Hafta', color: 'text-[var(--rose-gold)]' },
              { value: `%${conversionRate}`, label: 'Randevu Dönüşümü', color: 'text-emerald-600' },
              { value: resolvedByBot, label: 'Bot ile Çözüldü', color: 'text-blue-600' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-card p-3 text-center">
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Conversion Bar */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[var(--rose-gold)]" />
                Randevu Dönüşüm Başarısı
              </span>
              <span className="text-sm font-bold text-[var(--rose-gold)]">%{conversionRate}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[var(--rose-gold)] to-emerald-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${conversionRate}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {totalConversations} konuşma, {Math.round(totalConversations * conversionRate / 100)} randevu oluşturuldu
            </p>
          </div>
        </motion.section>

        {/* ── Recent Conversations ─── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <h2 className="font-semibold text-sm mb-3 px-1">Son Konuşmalar</h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border/50">
            {conversations.map((conv) => (
              <div key={conv.id} className="flex items-center gap-3 p-3">
                <div className="w-9 h-9 rounded-full bg-[var(--rose-gold)]/10 flex items-center justify-center text-sm font-semibold text-[var(--rose-gold)] shrink-0">
                  {conv.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{conv.name}</p>
                    {conv.converted && (
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 text-[10px] py-0 h-4">Randevu</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{conv.message}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] text-muted-foreground">{conv.time}</span>
                  {conv.resolved
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    : <XCircle className="w-4 h-4 text-amber-500" />
                  }
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Settings ─── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <h2 className="font-semibold text-sm mb-3 px-1">Asistan Ayarları</h2>
          <div className="rounded-xl border border-border bg-card p-4">
            <OptionRow
              label="Konuşma Tonu"
              description="Müşterilerinizle iletişim kurarken benimsenecek temel marka sesini belirleyin."
              options={[
                { value: 'friendly', label: 'Sıcak ve Dostça' },
                { value: 'professional', label: 'Profesyonel' },
                { value: 'balanced', label: 'Dengeli' },
              ]}
              value={tone}
              onSelect={setTone}
              fieldKey="tone"
            />
            {/* Tone example */}
            <p className="text-xs text-muted-foreground bg-muted/30 border border-border/40 rounded-lg p-2.5 mb-2 italic">
              Örnek yaklaşım: {toneExamples[tone]}
            </p>

            <OptionRow
              label="Yanıt Uzunluğu"
              description="Müşterilere verilen metin yanıtlarının uzunluğunu ve kapsamını belirleyin."
              options={[
                { value: 'short', label: 'Kısa' },
                { value: 'medium', label: 'Orta' },
                { value: 'detailed', label: 'Detaylı' },
              ]}
              value={answerLength}
              onSelect={setAnswerLength}
              fieldKey="answerLength"
            />

            <OptionRow
              label="Emoji Kullanımı"
              description="Seçtiğiniz iletişim tonunu destekleyici ve markanıza uygun emoji yoğunluğunu ayarlayın."
              options={[
                { value: 'off', label: 'Kapalı' },
                { value: 'low', label: 'Düşük' },
                { value: 'normal', label: 'Normal' },
              ]}
              value={emojiUsage}
              onSelect={setEmojiUsage}
              fieldKey="emojiUsage"
            />

            <OptionRow
              label="Randevu Yönlendirme"
              description="Asistanın, konuşma sırasında müşteriyi ne sıklıkla ve proaktif şekilde randevu almaya yönlendireceğini seçin."
              options={[
                { value: 'low', label: 'Düşük' },
                { value: 'medium', label: 'Orta' },
                { value: 'high', label: 'Yüksek' },
              ]}
              value={bookingGuidance}
              onSelect={setBookingGuidance}
              fieldKey="bookingGuidance"
            />

            <OptionRow
              label="İnsan Devri Eşiği"
              description="Müşteri memnuniyetsizliği riski olan durumlarda veya algılanamayan karmaşık taleplerde yönetimin ne zaman size devredileceğini belirler."
              options={[
                { value: 'early', label: 'Erken Devir' },
                { value: 'balanced', label: 'Dengeli' },
                { value: 'late', label: 'Geç Devir' },
              ]}
              value={handoverThreshold}
              onSelect={setHandoverThreshold}
              fieldKey="handoverThreshold"
            />

            <OptionRow
              label="YZ Bilgilendirmesi"
              description="Asistanın marka kimliğinizi korurken kendini ne sıklıkla dijital bir asistan olarak tanıtacağını konfigüre edin."
              options={[
                { value: 'always', label: 'Her Zaman' },
                { value: 'onQuestion', label: 'Sorulursa' },
                { value: 'never', label: 'Belirtme' },
              ]}
              value={aiDisclosure}
              onSelect={setAiDisclosure}
              fieldKey="aiDisclosure"
            />
          </div>
        </motion.section>
      </div>
    </div>
  );
}