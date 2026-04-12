import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Bot,
  CheckCircle2,
  ChevronRight,
  Link2,
  Loader2,
  MessageCircle,
  Power,
  RefreshCcw,
  Settings2,
  Shield,
  Sparkles,
  WifiOff,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { useAuth } from '../../context/AuthContext';
import { readSnapshot, writeSnapshot } from '../../lib/ui-cache';

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
  isEnabled?: boolean;
  tone?: 'friendly' | 'professional' | 'balanced';
  answerLength?: 'short' | 'medium' | 'detailed';
  emojiUsage?: 'off' | 'low' | 'normal';
  bookingGuidance?: 'low' | 'medium' | 'high';
  handoverThreshold?: 'early' | 'balanced' | 'late';
  aiDisclosure?: 'always' | 'onQuestion' | 'never';
  faqAnswers?: Record<string, string>;
}

const REMINDER_KEY = 'appointment_reminder';
const CHAKRA_STATUS_CACHE_KEY = 'chakra:status';
const WHATSAPP_AUTOMATIONS_CACHE_KEY = 'whatsapp:automations';
const WHATSAPP_AGENT_SETTINGS_CACHE_KEY = 'whatsapp:agent-settings';

export function WhatsAppSettings({ onBack }: WhatsAppSettingsProps) {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState<ChakraStatusResponse | null>(
    () => readSnapshot<ChakraStatusResponse>(CHAKRA_STATUS_CACHE_KEY, 1000 * 60 * 10),
  );
  const [automations, setAutomations] = useState<AutomationItem[]>(
    () => readSnapshot<AutomationItem[]>(WHATSAPP_AUTOMATIONS_CACHE_KEY, 1000 * 60 * 10) || [],
  );
  const [agentSettings, setAgentSettings] = useState<AgentSettings | null>(
    () => readSnapshot<AgentSettings>(WHATSAPP_AGENT_SETTINGS_CACHE_KEY, 1000 * 60 * 10),
  );

  const [statusLoading, setStatusLoading] = useState<boolean>(
    () => !(readSnapshot<ChakraStatusResponse>(CHAKRA_STATUS_CACHE_KEY, 1000 * 60 * 10) || null),
  );
  const [refreshing, setRefreshing] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [pluginToggleBusy, setPluginToggleBusy] = useState(false);
  const [pluginToggleError, setPluginToggleError] = useState<string | null>(null);
  const [pluginToggleFeedback, setPluginToggleFeedback] = useState<string | null>(null);

  const isConnected = useMemo(() => {
    if (!status) return false;
    return Boolean(status.connected) || Boolean(status.isActive);
  }, [status]);

  const pluginActive = Boolean(status?.isActive);
  const integrationLocked = !isConnected || !pluginActive;

  const reminderRule = useMemo(
    () => automations.find((item) => item.key === REMINDER_KEY),
    [automations],
  );

  const reminderEnabled = Boolean(reminderRule?.isEnabled);
  const agentEnabled = Boolean(agentSettings?.isEnabled);

  async function loadAll(refresh = false) {
    if (refresh) {
      setRefreshing(true);
    } else {
      setStatusLoading(true);
    }
    setStatusError(null);

    try {
      const [statusResponse, automationsResponse, agentResponse] = await Promise.all([
        apiFetch<ChakraStatusResponse>(`/api/app/chakra/status?t=${Date.now()}`),
        apiFetch<{ items: AutomationItem[] }>('/api/admin/automations').catch(() => ({ items: [] })),
        apiFetch<{ settings?: AgentSettings }>('/api/admin/whatsapp-agent/settings').catch(() => ({ settings: {} })),
      ]);

      setStatus(statusResponse);
      setAutomations(automationsResponse.items || []);
      setAgentSettings(agentResponse.settings || {});
      writeSnapshot(CHAKRA_STATUS_CACHE_KEY, statusResponse);
      writeSnapshot(WHATSAPP_AUTOMATIONS_CACHE_KEY, automationsResponse.items || []);
      writeSnapshot(WHATSAPP_AGENT_SETTINGS_CACHE_KEY, agentResponse.settings || {});
    } catch (error: any) {
      setStatusError(error?.message || 'WhatsApp ayarları alınamadı.');
    } finally {
      if (refresh) {
        setRefreshing(false);
      } else {
        setStatusLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadAll(false);
  }, []);

  const openConnectionFlow = () => {
    navigate('/app/features/whatsapp-setup', { state: { navDirection: 'forward' } });
  };

  const openReplaceFlow = () => {
    const ok = window.confirm(
      'WhatsApp numarasını değiştirmek istediğinize emin misiniz? Yeni numara bağlanınca eski kimlik pasifleştirilir.',
    );
    if (!ok) return;
    navigate('/app/features/whatsapp-setup', { state: { navDirection: 'forward', replaceConnection: true } });
  };

  const openAgentSettings = () => {
    if (integrationLocked) return;
    navigate('/app/features/whatsapp-agent', { state: { navDirection: 'forward' } });
  };

  const openReminderSettings = () => {
    if (integrationLocked) return;
    navigate('/app/automations?section=reminder', { state: { navDirection: 'forward' } });
  };

  const updatePluginActive = async (nextValue: boolean) => {
    setPluginToggleError(null);
    setPluginToggleFeedback(null);

    if (!status?.pluginId) {
      setPluginToggleError('Önce bağlantıyı başlatmanız gerekiyor.');
      return;
    }
    if (!isConnected) {
      setPluginToggleError('Önce WhatsApp bağlantısını tamamlayın.');
      return;
    }

    setPluginToggleBusy(true);
    try {
      await apiFetch('/api/app/chakra/plugin-active', {
        method: 'PUT',
        body: JSON.stringify({ pluginId: status.pluginId, isActive: nextValue }),
      });
      setPluginToggleFeedback(nextValue ? 'Bağlantı etkinleştirildi.' : 'Bağlantı devre dışı bırakıldı.');
      setTimeout(() => setPluginToggleFeedback(null), 2200);
      await loadAll(true);
    } catch (error: any) {
      setPluginToggleError(error?.message || 'Bağlantı durumu güncellenemedi.');
    } finally {
      setPluginToggleBusy(false);
    }
  };

  const StatusDot = ({ active }: { active: boolean }) => (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      {active && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
    </span>
  );

  return (
    <div className="h-full pb-20 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-gradient-to-b from-background to-background/95 backdrop-blur-md">
        <div className="p-4 pb-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 -ml-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold tracking-tight">WhatsApp Ayarları</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Bağlantı, asistan ve hatırlatma ayarları</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => void loadAll(true)}
              disabled={statusLoading || refreshing}
              className="shrink-0"
            >
              <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Error banner */}
        {statusError && (
          <div className="flex items-start gap-2 rounded-xl bg-red-500/5 border border-red-500/15 p-3">
            <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{statusError}</p>
          </div>
        )}

        {/* ── Connection Card ─── */}
        <section className="rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-400/5 to-transparent px-4 py-3 flex items-center justify-between gap-3 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#25D366]/15 flex items-center justify-center shrink-0">
                <Link2 className="w-4 h-4 text-[#25D366]" />
              </div>
              <p className="text-sm font-bold">WhatsApp Bağlantısı</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusDot active={isConnected && pluginActive} />
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                statusLoading
                  ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  : !isConnected
                    ? 'bg-amber-500/10 text-amber-700'
                    : pluginActive
                      ? 'bg-emerald-500/10 text-emerald-700'
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}>
                {statusLoading ? 'Kontrol ediliyor...' : !isConnected ? 'Bağlı Değil' : pluginActive ? 'Aktif' : 'Pasif'}
              </span>
            </div>
          </div>

          <div className="p-4 space-y-3 bg-card">
            {statusLoading ? (
              <div className="flex items-center gap-2 py-4 justify-center text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Durum kontrol ediliyor...</span>
              </div>
            ) : !isConnected ? (
              <>
                <div className="flex items-center gap-3 rounded-xl bg-amber-500/5 border border-amber-500/15 p-3">
                  <WifiOff className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">WhatsApp bağlantısı gerekli</p>
                    <p className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-0.5">Asistan ve hatırlatmaları kullanmak için bağlantıyı tamamlayın.</p>
                  </div>
                </div>
                <Button
                  type="button"
                  className="w-full h-11 text-sm font-semibold bg-[#25D366] hover:bg-[#1da851] text-white"
                  onClick={openConnectionFlow}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Bağlantıyı Başlat
                </Button>
              </>
            ) : (
              <>
                {/* Active/inactive toggle */}
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Power className="w-4 h-4" />
                      Bağlantı durumu
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Devre dışı bırakıldığında, WhatsApp üzerinden yapay zeka ve hatırlatma akışları çalışmaz.
                    </p>
                  </div>
                  <Switch
                    checked={pluginActive}
                    onCheckedChange={(checked) => void updatePluginActive(checked)}
                    disabled={!isConnected || !status?.pluginId || pluginToggleBusy}
                  />
                </div>

                {pluginToggleError && <p className="text-xs text-red-600">{pluginToggleError}</p>}
                {pluginToggleFeedback && <p className="text-xs text-green-700">{pluginToggleFeedback}</p>}

                {isConnected && !pluginActive && (
                  <div className="flex items-start gap-2 rounded-xl bg-amber-500/5 border border-amber-500/15 p-3">
                    <Shield className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Bağlantı pasif. Yapay zeka asistanı ve randevu hatırlatmaları çalışmıyor.
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={openConnectionFlow}
                  >
                    Bağlantıyı Yönet
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={openReplaceFlow}
                  >
                    Numarayı Değiştir
                  </Button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── Reminder Card ─── */}
        <section className={`rounded-2xl border border-border overflow-hidden shadow-sm transition-opacity ${integrationLocked ? 'opacity-50' : ''}`}>
          <div className="bg-gradient-to-r from-blue-500/10 via-blue-400/5 to-transparent px-4 py-3 flex items-center justify-between gap-3 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-sm font-bold">Randevu Hatırlatmaları</p>
            </div>
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
              integrationLocked
                ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                : reminderEnabled
                  ? 'bg-emerald-500/10 text-emerald-700'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
            }`}>
              {integrationLocked ? 'Kilitli' : reminderEnabled ? 'Aktif' : 'Kapalı'}
            </span>
          </div>

          <div className="p-4 space-y-3 bg-card">
            <p className="text-xs text-muted-foreground">Randevudan 2 ve 24 saat önce müşterilere otomatik hatırlatma gönderir.</p>
            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-foreground">
                2 saat önce + konum
              </span>
              <span className="inline-flex rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-foreground">
                24 saat önce + katılım onayı
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between"
              onClick={openReminderSettings}
              disabled={integrationLocked}
            >
              <span className="flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                {integrationLocked ? 'Önce bağlantıyı aktifleştirin' : 'Hatırlatma Ayarlarını Aç'}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </section>

        {/* ── AI Agent Card ─── */}
        <section className={`rounded-2xl border border-border overflow-hidden shadow-sm transition-opacity ${integrationLocked ? 'opacity-50' : ''}`}>
          <div className="bg-gradient-to-r from-[var(--rose-gold)]/10 via-[var(--rose-gold)]/5 to-transparent px-4 py-3 flex items-center justify-between gap-3 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--rose-gold)]/15 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-[var(--rose-gold)]" />
              </div>
              <p className="text-sm font-bold">Yapay Zeka Asistanı</p>
            </div>
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
              integrationLocked
                ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                : agentEnabled
                  ? 'bg-emerald-500/10 text-emerald-700'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
            }`}>
              {integrationLocked ? 'Kilitli' : agentEnabled ? 'Aktif' : 'Kapalı'}
            </span>
          </div>

          <div className="p-4 space-y-3 bg-card">
            <p className="text-xs text-muted-foreground">
              WhatsApp ve Instagram üzerinden gelen mesajları otomatik yanıtlar, SSS yanıtları oluşturur ve randevu yönlendirmesi yapar.
            </p>

            {agentEnabled && !integrationLocked && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-xs text-emerald-700 dark:text-emerald-400">Asistan aktif, mesajlar otomatik yanıtlanıyor.</p>
              </div>
            )}

            <Button
              type="button"
              className={`w-full justify-between ${
                integrationLocked ? '' : 'bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)] text-white'
              }`}
              variant={integrationLocked ? 'outline' : 'default'}
              onClick={openAgentSettings}
              disabled={integrationLocked}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                {integrationLocked ? 'Önce bağlantıyı aktifleştirin' : 'Asistan Ayarlarını Yönet'}
              </span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
