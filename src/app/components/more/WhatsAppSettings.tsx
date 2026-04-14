import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronRight,
  Link2,
  Loader2,
  MessageCircle,
  Power,
  RefreshCcw,
  Shield,
  WifiOff,
  XCircle,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
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


const REMINDER_KEY = 'appointment_reminder';
const CHAKRA_STATUS_CACHE_KEY = 'chakra:status';
const WHATSAPP_AUTOMATIONS_CACHE_KEY = 'whatsapp:automations';

import { useNavigator } from '../../context/NavigatorContext';

export function WhatsAppSettings({ onBack }: WhatsAppSettingsProps) {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const { setHeaderTitle } = useNavigator();
  const location = useLocation();

  useEffect(() => {
    setHeaderTitle('WhatsApp Ayarları');
    return () => setHeaderTitle(null);
  }, [setHeaderTitle]);

  const [status, setStatus] = useState<ChakraStatusResponse | null>(
    () => readSnapshot<ChakraStatusResponse>(CHAKRA_STATUS_CACHE_KEY, 1000 * 60 * 10),
  );
  const [automations, setAutomations] = useState<AutomationItem[]>(
    () => readSnapshot<AutomationItem[]>(WHATSAPP_AUTOMATIONS_CACHE_KEY, 1000 * 60 * 10) || [],
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

  async function loadAll(refresh = false) {
    if (refresh) {
      setRefreshing(true);
    } else {
      setStatusLoading(true);
    }
    setStatusError(null);

    try {
      const [statusResponse, automationsResponse] = await Promise.all([
        apiFetch<ChakraStatusResponse>(`/api/app/chakra/status?t=${Date.now()}`),
        apiFetch<{ items: AutomationItem[] }>('/api/admin/automations').catch(() => ({ items: [] })),
      ]);

      setStatus(statusResponse);
      setAutomations(automationsResponse.items || []);
      writeSnapshot(CHAKRA_STATUS_CACHE_KEY, statusResponse);
      writeSnapshot(WHATSAPP_AUTOMATIONS_CACHE_KEY, automationsResponse.items || []);
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
    navigate('/app/features/whatsapp-setup', { state: { navDirection: 'forward', from: location.pathname } });
  };

  const openReplaceFlow = () => {
    const ok = window.confirm(
      'WhatsApp numaranızı değiştirmek istediğinize emin misiniz? Yeni bir numara bağladığınızda mevcut bağlantınız kalıcı olarak devre dışı bırakılır.'
    );
    if (!ok) return;
    navigate('/app/features/whatsapp-setup', { state: { navDirection: 'forward', replaceConnection: true, from: location.pathname } });
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
                    <p className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-0.5">Otomatik mesajlaşma ve yapay zeka asistanını kullanmak için işletme numaranızı bağlayın.</p>
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
                      Bağlantı Durumu
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Bağlantı devre dışı bırakıldığında yapay zeka asistanı ve otomatik mesaj otomasyonları çalışmayı durdurur.
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

      </div>
    </div>
  );
}
