import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Bot,
  Link2,
  Lock,
  RefreshCcw,
  Settings2,
  AlertTriangle,
  Power,
  ChevronRight } from
'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
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
    () => readSnapshot<ChakraStatusResponse>(CHAKRA_STATUS_CACHE_KEY, 1000 * 60 * 10)
  );
  const [automations, setAutomations] = useState<AutomationItem[]>(
    () => readSnapshot<AutomationItem[]>(WHATSAPP_AUTOMATIONS_CACHE_KEY, 1000 * 60 * 10) || []
  );
  const [agentSettings, setAgentSettings] = useState<AgentSettings | null>(
    () => readSnapshot<AgentSettings>(WHATSAPP_AGENT_SETTINGS_CACHE_KEY, 1000 * 60 * 10)
  );

  const [statusLoading, setStatusLoading] = useState<boolean>(
    () => !(readSnapshot<ChakraStatusResponse>(CHAKRA_STATUS_CACHE_KEY, 1000 * 60 * 10) || null)
  );
  const [statusYenileing, setStatusYenileing] = useState(false);
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
    [automations]
  );

  const reminderEnabled = Boolean(reminderRule?.isEnabled);
  const agentEnabled = Boolean(agentSettings?.isEnabled);

  async function loadAll(refresh = false) {
    if (refresh) {
      setStatusYenileing(true);
    } else {
      setStatusLoading(true);
    }

    setStatusError(null);

    try {
      const [statusResponse, automationsResponse, agentResponse] = await Promise.all([
      apiFetch<ChakraStatusResponse>(`/api/app/chakra/status?t=${Date.now()}`),
      apiFetch<{items: AutomationItem[];}>('/api/admin/automations').catch(() => ({ items: [] })),
      apiFetch<{settings?: AgentSettings;}>('/api/admin/whatsapp-agent/settings').catch(() => ({ settings: {} }))]
      );

      setStatus(statusResponse);
      setAutomations(automationsResponse.items || []);
      setAgentSettings(agentResponse.settings || {});
      writeSnapshot(CHAKRA_STATUS_CACHE_KEY, statusResponse);
      writeSnapshot(WHATSAPP_AUTOMATIONS_CACHE_KEY, automationsResponse.items || []);
      writeSnapshot(WHATSAPP_AGENT_SETTINGS_CACHE_KEY, agentResponse.settings || {});
    } catch (error: any) {
      setStatusError(error?.message || "WhatsApp ayarları alınamadı.");
    } finally {
      if (refresh) {
        setStatusYenileing(false);
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
      "WhatsApp numarasını değiştirmek istediğinize emin misiniz? Yeni numara bağlanınca eski kimlik pasifleştirilir."
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
      setPluginToggleError('Önce bağlantıyı başlatmalısınız.');
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
        body: JSON.stringify({
          pluginId: status.pluginId,
          isActive: nextValue
        })
      });

      setPluginToggleFeedback(nextValue ? 'Bağlantı etkinleştirildi.' : 'Bağlantı devre dışı bırakıldı.');
      setTimeout(() => setPluginToggleFeedback(null), 2200);

      await loadAll(true);
    } catch (error: any) {
      setPluginToggleError(error?.message || "Bağlantı durumu güncellenemedi.");
    } finally {
      setPluginToggleBusy(false);
    }
  };

  const connectionBadge = statusLoading ?
  'Kontrol ediliyor' :
  !isConnected ?
  'Kurulum gerekli' :
  pluginActive ?
  'Aktif' :
  'Pasif';

  const reminderBadge = !isConnected ?
  'Kilitli' :
  !pluginActive ?
  "Bağlantı pasif" :
  reminderEnabled ?
  'Aktif' :
  'Kapalı';

  const agentBadge = !isConnected ?
  'Kilitli' :
  !pluginActive ?
  "Bağlantı pasif" :
  agentEnabled ?
  'Aktif' :
  'Kapalı';

  return (
    <div className="h-full pb-20 overflow-y-auto">
      <div className="sticky top-0 bg-[var(--luxury-bg)] z-10 border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold">WhatsApp Ayarları</h1>
            <p className="text-sm text-muted-foreground">Bağlantı, yapay zeka asistanı ve hatırlatma ayarları</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {statusError ?
        <Card className="border-red-300 bg-red-50 dark:bg-red-950/20">
            <CardContent className="p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{statusError}</p>
            </CardContent>
          </Card> :
        null}

        {isConnected && !pluginActive ?
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                WhatsApp bağlantısı pasif. Bu durumda yapay zeka asistanı ve randevu hatırlatmaları kilitlidir.
              </p>
            </CardContent>
          </Card> :
        null}

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
                    Kurulumu tamamlayın ve bağlantı durumunu buradan yönetin.
                  </p>
                </div>
              </div>

              <span
                className={`text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                !isConnected ?
                'bg-amber-500/10 text-amber-700' :
                pluginActive ?
                'bg-green-500/10 text-green-700' :
                'bg-muted text-muted-foreground'}`
                }>
                
                {connectionBadge}
              </span>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/20 p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Power className="w-4 h-4" />
                  Bağlantı durumu
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Devre dışı bırakıldığında, WhatsApp üzerinden yapay zeka ve hatırlatma akışları çalışmaz.
                </p>
              </div>
              <Switch
                checked={pluginActive}
                onCheckedChange={(checked) => {
                  void updatePluginActive(checked);
                }}
                disabled={!isConnected || !status?.pluginId || pluginToggleBusy} />
              
            </div>

            {pluginToggleError ? <p className="text-xs text-red-600">{pluginToggleError}</p> : null}
            {pluginToggleFeedback ? <p className="text-xs text-green-700">{pluginToggleFeedback}</p> : null}

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={openConnectionFlow} className="bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)] text-white">
                {isConnected ? "Bağlantıyı Yönet" : "Bağlantıyı Başlat"}
              </Button>
              {isConnected ?
              <Button type="button" variant="outline" onClick={openReplaceFlow}>
                  Numarayı Değiştir
                </Button> :
              null}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void loadAll(true);
                }}
                disabled={statusLoading || statusYenileing}>
                
                <RefreshCcw className={`w-4 h-4 mr-2 ${statusYenileing ? 'animate-spin' : ''}`} />
                Yenile
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-border/50 shadow-sm ${integrationLocked ? 'opacity-60' : ''}`}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--deep-indigo)]/10 text-[var(--deep-indigo)] flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold leading-tight">Randevu Hatırlatma Ayarları</p>
                  <p className="text-sm text-muted-foreground mt-1">Randevudan 2 ve 24 saat önce gönderim adımlarını yönetin.</p>
                </div>
              </div>
              <span
                className={`text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                reminderBadge === 'Aktif' ?
                'bg-green-500/10 text-green-700' :
                reminderBadge === "Kapalı" ?
                'bg-muted text-muted-foreground' :
                'bg-amber-500/10 text-amber-700'}`
                }>
                
                {reminderBadge}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-foreground">
                2 saat önce + konum
              </span>
              <span className="inline-flex rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-foreground">
                24 saat önce hatırlatma + katılım onayı
              </span>
            </div>

            <Button type="button" variant="outline" onClick={openReminderSettings} disabled={integrationLocked}>
              {integrationLocked ? <Lock className="w-4 h-4 mr-2" /> : <Settings2 className="w-4 h-4 mr-2" />}
              {!isConnected ? "Önce WhatsApp bağlantısını tamamlayın" : !pluginActive ? "Önce bağlantıyı aktifleştirin" : "Hatırlatma Ayarlarını Aç"}
            </Button>
          </CardContent>
        </Card>

        <Card className={`border-border/50 shadow-sm ${integrationLocked ? 'opacity-60' : ''}`}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--rose-gold)]/10 text-[var(--rose-gold)] flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold leading-tight">Yapay Zeka WhatsApp Asistanı</p>
                  <p className="text-sm text-muted-foreground mt-1">SSS, ton ve davranış kurallarını yönetin.</p>
                </div>
              </div>
              <span
                className={`text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                agentBadge === 'Aktif' ?
                'bg-green-500/10 text-green-700' :
                agentBadge === "Kapalı" ?
                'bg-muted text-muted-foreground' :
                'bg-amber-500/10 text-amber-700'}`
                }>
                
                {agentBadge}
              </span>
            </div>

            <Button
              type="button"
              onClick={openAgentSettings}
              variant={integrationLocked ? 'outline' : 'default'}
              disabled={integrationLocked}
              className={integrationLocked ? '' : 'bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)] text-white'}>
              
              {integrationLocked ? <Lock className="w-4 h-4 mr-2" /> : <ChevronRight className="w-4 h-4 mr-2" />}
              {!isConnected ? "Önce WhatsApp bağlantısını tamamlayın" : !pluginActive ? "Önce bağlantıyı aktifleştirin" : "Yapay Zeka Asistan Ayarlarını Aç"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>);

}
