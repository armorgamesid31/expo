import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Bot,
  CheckCircle2,
  Link2,
  Lock,
  RefreshCcw,
  Settings2,
  AlertTriangle,
  Wand2,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { useAuth } from '../../context/AuthContext';

interface WhatsAppSettingsProps {
  onBack: () => void;
}

interface ChakraStatusResponse {
  connected?: boolean;
  isActive?: boolean;
  hasPlugin?: boolean;
  pluginId?: string | null;
  whatsappPhoneNumberId?: string | null;
}

interface AutomationItem {
  id: number;
  key: string;
  name: string;
  description: string | null;
  config: unknown;
  isEnabled: boolean;
}

interface AgentSettings {
  tone?: 'friendly' | 'professional' | 'balanced';
  answerLength?: 'short' | 'medium' | 'detailed';
  emojiUsage?: 'off' | 'low' | 'normal';
  bookingGuidance?: 'low' | 'medium' | 'high';
  handoverThreshold?: 'early' | 'balanced' | 'late';
  aiDisclosure?: 'always' | 'onQuestion' | 'never';
  faqAnswers?: Record<string, string>;
}

interface ReminderConfig {
  enable2h: boolean;
  enable24h: boolean;
  enable72h: boolean;
  sendLocationAt2h: boolean;
  requestConfirmationAt24h: boolean;
}

const REMINDER_KEY = 'appointment_reminder';
const WIZARD_LOCAL_SEEN_KEY = 'kedy_whatsapp_setup_wizard_seen_v1';
const AGENT_WIZARD_DONE_KEY = 'wizard_ai_agent_ready';

const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  enable2h: true,
  enable24h: true,
  enable72h: false,
  sendLocationAt2h: true,
  requestConfirmationAt24h: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return fallback;
}

function parseReminderConfig(raw: unknown): ReminderConfig {
  const config = isRecord(raw) ? raw : {};
  return {
    enable2h: toBoolean(config.enable2h, DEFAULT_REMINDER_CONFIG.enable2h),
    enable24h: toBoolean(config.enable24h, DEFAULT_REMINDER_CONFIG.enable24h),
    enable72h: toBoolean(config.enable72h, DEFAULT_REMINDER_CONFIG.enable72h),
    sendLocationAt2h: toBoolean(config.sendLocationAt2h, DEFAULT_REMINDER_CONFIG.sendLocationAt2h),
    requestConfirmationAt24h: toBoolean(config.requestConfirmationAt24h, DEFAULT_REMINDER_CONFIG.requestConfirmationAt24h),
  };
}

export function WhatsAppSettings({ onBack }: WhatsAppSettingsProps) {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState<ChakraStatusResponse | null>(null);
  const [automations, setAutomations] = useState<AutomationItem[]>([]);
  const [agentSettings, setAgentSettings] = useState<AgentSettings | null>(null);

  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusRefreshing, setStatusRefreshing] = useState(false);

  const [wizardSeen, setWizardSeen] = useState(false);
  const [wizardBusy, setWizardBusy] = useState<'reminder' | 'agent' | null>(null);
  const [wizardFeedback, setWizardFeedback] = useState<string | null>(null);
  const [wizardError, setWizardError] = useState<string | null>(null);

  const isConnected = useMemo(() => {
    if (!status) return false;
    return Boolean(status.connected) || Boolean(status.isActive);
  }, [status]);

  const reminderRule = useMemo(
    () => automations.find((item) => item.key === REMINDER_KEY),
    [automations],
  );

  const reminderStepDone = isConnected && Boolean(reminderRule?.isEnabled);
  const agentStepDone =
    isConnected &&
    Boolean(agentSettings?.faqAnswers && agentSettings.faqAnswers[AGENT_WIZARD_DONE_KEY] === '1');

  const allStepsDone = isConnected && reminderStepDone && agentStepDone;

  const loadAll = async (refresh = false) => {
    if (refresh) {
      setStatusRefreshing(true);
    } else {
      setStatusLoading(true);
    }
    setStatusError(null);

    try {
      const [statusResponse, automationResponse, agentResponse] = await Promise.all([
        apiFetch<ChakraStatusResponse>(`/api/app/chakra/status?t=${Date.now()}`),
        apiFetch<{ items: AutomationItem[] }>('/api/admin/automations').catch(() => ({ items: [] })),
        apiFetch<{ settings?: AgentSettings }>('/api/admin/whatsapp-agent/settings').catch(() => ({ settings: {} })),
      ]);

      setStatus(statusResponse);
      setAutomations(automationResponse.items || []);
      setAgentSettings(agentResponse.settings || {});
    } catch (error: any) {
      setStatusError(error?.message || 'WhatsApp ayarları alınamadı.');
    } finally {
      if (refresh) {
        setStatusRefreshing(false);
      } else {
        setStatusLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadAll(false);
  }, []);

  useEffect(() => {
    try {
      setWizardSeen(window.localStorage.getItem(WIZARD_LOCAL_SEEN_KEY) === '1');
    } catch {
      setWizardSeen(false);
    }
  }, []);

  useEffect(() => {
    if (statusLoading) return;
    if (allStepsDone) return;
    if (wizardSeen) return;

    try {
      window.localStorage.setItem(WIZARD_LOCAL_SEEN_KEY, '1');
      setWizardSeen(true);
    } catch {
      // ignore storage failures
    }
  }, [statusLoading, allStepsDone, wizardSeen]);

  const openConnectionFlow = () => {
    navigate('/app/features/whatsapp-setup', { state: { navDirection: 'forward' } });
  };

  const openAgentSettings = () => {
    if (!isConnected) return;
    navigate('/app/features/whatsapp-agent', { state: { navDirection: 'forward' } });
  };

  const openReminderSettings = () => {
    if (!isConnected) return;
    navigate('/app/automations?section=reminder', { state: { navDirection: 'forward' } });
  };

  const completeReminderStep = async () => {
    if (!isConnected) return;

    setWizardBusy('reminder');
    setWizardError(null);
    setWizardFeedback(null);

    try {
      const mergedConfig: ReminderConfig = {
        ...DEFAULT_REMINDER_CONFIG,
        ...parseReminderConfig(reminderRule?.config),
      };

      if (reminderRule) {
        await apiFetch(`/api/admin/automations/${reminderRule.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            isEnabled: true,
            config: mergedConfig,
          }),
        });
      } else {
        await apiFetch('/api/admin/automations', {
          method: 'POST',
          body: JSON.stringify({
            key: REMINDER_KEY,
            name: 'Randevu Hatırlatma',
            description: '2 saat ve 24 saat kala WhatsApp hatırlatma otomasyonu',
            isEnabled: true,
            config: mergedConfig,
          }),
        });
      }

      setWizardFeedback('Randevu hatırlatma adımı tamamlandı ve aktif edildi.');
      await loadAll(true);
    } catch (error: any) {
      setWizardError(error?.message || 'Hatırlatma kurulumu tamamlanamadı.');
    } finally {
      setWizardBusy(null);
    }
  };

  const completeAgentStep = async () => {
    if (!isConnected) return;

    setWizardBusy('agent');
    setWizardError(null);
    setWizardFeedback(null);

    try {
      const current = agentSettings || {};
      const faqAnswers = {
        ...(current.faqAnswers || {}),
        [AGENT_WIZARD_DONE_KEY]: '1',
      };

      await apiFetch('/api/admin/whatsapp-agent/settings', {
        method: 'PUT',
        body: JSON.stringify({
          tone: current.tone || 'balanced',
          answerLength: current.answerLength || 'medium',
          emojiUsage: current.emojiUsage || 'low',
          bookingGuidance: current.bookingGuidance || 'medium',
          handoverThreshold: current.handoverThreshold || 'balanced',
          aiDisclosure: current.aiDisclosure || 'onQuestion',
          faqAnswers,
        }),
      });

      setWizardFeedback('AI ajan kurulum adımı tamamlandı ve aktif edildi.');
      await loadAll(true);
    } catch (error: any) {
      setWizardError(error?.message || 'AI ajan kurulum adımı tamamlanamadı.');
    } finally {
      setWizardBusy(null);
    }
  };

  const connectionBadge = statusLoading
    ? 'Kontrol ediliyor'
    : isConnected
      ? 'Bağlı'
      : 'Kurulum gerekli';

  const reminderBadge = !isConnected
    ? 'Kilitli'
    : reminderStepDone
      ? 'Aktif'
      : 'Kurulum gerekli';

  const agentBadge = !isConnected
    ? 'Kilitli'
    : agentStepDone
      ? 'Aktif'
      : 'Kurulum gerekli';

  return (
    <div className="h-full pb-20 overflow-y-auto">
      <div className="sticky top-0 bg-[var(--luxury-bg)] z-10 border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold">WhatsApp Ayarları</h1>
            <p className="text-sm text-muted-foreground">Bağlantı, AI ajan ve hatırlatma ayarları</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {statusError ? (
          <Card className="border-red-300 bg-red-50">
            <CardContent className="p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{statusError}</p>
            </CardContent>
          </Card>
        ) : null}

        {!allStepsDone ? (
          <Card className="border-[var(--rose-gold)]/30 bg-[var(--rose-gold)]/5 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[var(--rose-gold)]/15 text-[var(--rose-gold)] flex items-center justify-center shrink-0">
                    <Wand2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-base font-semibold leading-tight">Kurulum Sihirbazı</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Aşamaları sırayla tamamla; yarım kalırsa aynı noktadan devam edebilirsin.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold rounded-full px-2 py-1 bg-muted text-muted-foreground whitespace-nowrap">
                  {isConnected ? (reminderStepDone ? (agentStepDone ? '3/3' : '2/3') : '1/3') : '0/3'}
                </span>
              </div>

              {wizardError ? <p className="text-xs text-red-600">{wizardError}</p> : null}
              {wizardFeedback ? <p className="text-xs text-green-700">{wizardFeedback}</p> : null}

              <div className="space-y-2">
                <div className="rounded-lg border border-border bg-background p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">1. WhatsApp bağlantısını tamamla</p>
                    <p className="text-xs text-muted-foreground">Chakra üzerinden Facebook/WhatsApp bağlantısını kur.</p>
                  </div>
                  {isConnected ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Tamamlandı
                    </span>
                  ) : (
                    <Button size="sm" onClick={openConnectionFlow}>Başlat</Button>
                  )}
                </div>

                <div className={`rounded-lg border border-border bg-background p-3 flex items-center justify-between gap-3 ${!isConnected ? 'opacity-60' : ''}`}>
                  <div>
                    <p className="text-sm font-semibold">2. Randevu hatırlatmayı kur</p>
                    <p className="text-xs text-muted-foreground">2 saat ve 24 saat kala gönderimleri aktifleştir.</p>
                  </div>
                  {!isConnected ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Lock className="w-3.5 h-3.5" /> Kilitli</span>
                  ) : reminderStepDone ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Aktif
                    </span>
                  ) : (
                    <Button size="sm" onClick={() => void completeReminderStep()} disabled={wizardBusy === 'reminder'}>
                      {wizardBusy === 'reminder' ? 'Kaydediliyor...' : 'Kurulumu Tamamla'}
                    </Button>
                  )}
                </div>

                <div className={`rounded-lg border border-border bg-background p-3 flex items-center justify-between gap-3 ${!isConnected || !reminderStepDone ? 'opacity-60' : ''}`}>
                  <div>
                    <p className="text-sm font-semibold">3. AI ajan ayarını tamamla</p>
                    <p className="text-xs text-muted-foreground">SSS ve konuşma davranışı ayarları için adımı tamamla.</p>
                  </div>
                  {!isConnected ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Lock className="w-3.5 h-3.5" /> Kilitli</span>
                  ) : !reminderStepDone ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Lock className="w-3.5 h-3.5" /> Önce 2. adım</span>
                  ) : agentStepDone ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Aktif
                    </span>
                  ) : (
                    <Button size="sm" onClick={() => void completeAgentStep()} disabled={wizardBusy === 'agent'}>
                      {wizardBusy === 'agent' ? 'Kaydediliyor...' : 'Kurulumu Tamamla'}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-green-300/60 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-700 mt-0.5 shrink-0" />
              <p className="text-sm text-green-800 dark:text-green-300">
                Kurulum tamamlandı. WhatsApp bağlantısı, hatırlatma ve AI ajan ayarların aktif.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-700 flex items-center justify-center shrink-0">
                  <Link2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold leading-tight">WhatsApp Bağlantısı</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Chakra bağlantısını kurup bağlantı durumunu buradan yönetebilirsin.
                  </p>
                </div>
              </div>

              <span
                className={`text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                  isConnected ? 'bg-green-500/10 text-green-700' : 'bg-amber-500/10 text-amber-700'
                }`}
              >
                {connectionBadge}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={openConnectionFlow} className="bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)] text-white">
                {isConnected ? 'Bağlantıyı Yönet' : 'Bağlantıyı Başlat'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void loadAll(true);
                }}
                disabled={statusLoading || statusRefreshing}
              >
                <RefreshCcw className={`w-4 h-4 mr-2 ${statusRefreshing ? 'animate-spin' : ''}`} />
                Yenile
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-border/50 shadow-sm ${!isConnected ? 'opacity-60' : ''}`}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--deep-indigo)]/10 text-[var(--deep-indigo)] flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold leading-tight">Randevu Hatırlatma Ayarları</p>
                  <p className="text-sm text-muted-foreground mt-1">2 saat ve 24 saat önce gönderim adımlarını yönet.</p>
                </div>
              </div>
              <span
                className={`text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                  !isConnected
                    ? 'bg-muted text-muted-foreground'
                    : reminderStepDone
                      ? 'bg-green-500/10 text-green-700'
                      : 'bg-amber-500/10 text-amber-700'
                }`}
              >
                {reminderBadge}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-foreground">
                2 saat kala + konum
              </span>
              <span className="inline-flex rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-foreground">
                24 saat kala + katılım onayı
              </span>
            </div>

            <Button type="button" variant="outline" onClick={openReminderSettings} disabled={!isConnected}>
              {!isConnected ? <Lock className="w-4 h-4 mr-2" /> : <Settings2 className="w-4 h-4 mr-2" />}
              {!isConnected ? 'Önce WhatsApp bağlantısını tamamla' : 'Hatırlatma Ayarlarını Aç'}
            </Button>
          </CardContent>
        </Card>

        <Card className={`border-border/50 shadow-sm ${!isConnected ? 'opacity-60' : ''}`}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--rose-gold)]/10 text-[var(--rose-gold)] flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold leading-tight">AI WhatsApp Ajanı</p>
                  <p className="text-sm text-muted-foreground mt-1">SSS, konuşma tonu ve davranış kurallarını yönet.</p>
                </div>
              </div>
              <span
                className={`text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                  !isConnected
                    ? 'bg-muted text-muted-foreground'
                    : agentStepDone
                      ? 'bg-green-500/10 text-green-700'
                      : 'bg-amber-500/10 text-amber-700'
                }`}
              >
                {agentBadge}
              </span>
            </div>

            <Button type="button" onClick={openAgentSettings} variant={isConnected ? 'default' : 'outline'} disabled={!isConnected} className={isConnected ? 'bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)] text-white' : ''}>
              {!isConnected ? <Lock className="w-4 h-4 mr-2" /> : <ChevronRight className="w-4 h-4 mr-2" />}
              {!isConnected ? 'Önce WhatsApp bağlantısını tamamla' : 'AI Ajan Ayarlarını Aç'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
