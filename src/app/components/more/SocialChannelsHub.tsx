import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Instagram,
  Loader2,
  MessageCircle,
  Shield,
  Sparkles,
  WifiOff,
  HelpCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { readSnapshot, writeSnapshot } from '../../lib/ui-cache';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { useNavigator } from '../../context/NavigatorContext';

interface SocialChannelsHubProps {
  onBack: () => void;
}

/* ── WhatsApp types ─────────────────────────────────────────── */
interface ChakraStatusResponse {
  salonId: number;
  salonName: string;
  slug: string | null;
  pluginId: string | null;
  hasPlugin: boolean;
  connected?: boolean;
  isActive?: boolean;
  whatsappPhoneNumberId?: string | null;
  sdkUrl: string;
}

interface CreatePluginResponse {
  success: boolean;
  pluginId: string;
  salonId: number;
  pluginCreated: boolean;
}

interface ConnectTokenResponse {
  connectToken: string;
  pluginId: string;
  sdkUrl: string;
  intent?: 'CONNECT' | 'REPLACE_CONNECTION';
}

interface ConnectEventResponse {
  ok: boolean;
  pluginId: string;
  connected: boolean;
  isActive?: boolean | null;
  event: string | null;
  intent?: 'CONNECT' | 'REPLACE_CONNECTION';
}

type ChakraInstance = { destroy?: () => void };

/* ── Instagram types ────────────────────────────────────────── */
interface MetaDirectStatusResponse {
  instagram?: {
    status?: string;
    message?: string;
    connected?: boolean;
    activeBindingIds?: string[];
  };
}

interface ConnectUrlResponse {
  authorizeUrl?: string;
  intent?: 'CONNECT' | 'REPLACE_CONNECTION';
}

/* ── Constants ──────────────────────────────────────────────── */
const CONTAINER_ID = 'chakra-whatsapp-connect-container';
const SCRIPT_ID = 'chakra-whatsapp-connect-sdk-script';
const CHAKRA_STATUS_CACHE_KEY = 'chakra:status';
const IG_STATUS_CACHE_KEY = 'ig:status';

/* ── SDK helpers ────────────────────────────────────────────── */
function loadChakraSdk(sdkUrl: string): Promise<void> {
  if ((window as any).ChakraWhatsappConnect?.init) return Promise.resolve();
  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('SDK yüklenemedi.')), { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = sdkUrl;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('SDK yüklenemedi.'));
    document.head.appendChild(script);
  });
}

function isConnectedEvent(event: unknown, data: unknown): boolean {
  const eventText = typeof event === 'string' ? event.toLowerCase() : '';
  const dataObj = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, any>) : null;
  const status = typeof dataObj?.status === 'string' ? dataObj.status.toLowerCase() : '';
  const state = typeof dataObj?.state === 'string' ? dataObj.state.toLowerCase() : '';
  const hasAuth = Boolean(dataObj?.auth && typeof dataObj.auth === 'object');
  const hasEnabledNumbers =
    Array.isArray(dataObj?.serverConfig?.enabledWhatsappPhoneNumbers) &&
    dataObj.serverConfig.enabledWhatsappPhoneNumbers.some((v: unknown) => typeof v === 'string' && v.trim().length > 0);
  const pattern = /(connected|success|complete|completed|linked)/i;
  return pattern.test(eventText) || pattern.test(status) || pattern.test(state) || hasAuth || hasEnabledNumbers;
}

/* ── Component ──────────────────────────────────────────────── */
export function SocialChannelsHub() {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const { setHeaderTitle } = useNavigator();

  useEffect(() => {
    setHeaderTitle('Müşteri İletişimi');
    return () => setHeaderTitle(null);
  }, [setHeaderTitle]);

  /* ── WhatsApp state ─── */
  const cachedWa = readSnapshot<ChakraStatusResponse>(CHAKRA_STATUS_CACHE_KEY, 1000 * 60 * 10);
  const [waLoading, setWaLoading] = useState(!cachedWa);
  const [waConnected, setWaConnected] = useState(Boolean(cachedWa?.connected) || Boolean(cachedWa?.isActive));
  const [waPluginId, setWaPluginId] = useState<string | null>(cachedWa?.pluginId || null);
  const [waBusy, setWaBusy] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);
  const [waNativeTriggerReady, setWaNativeTriggerReady] = useState(false);
  const instanceRef = useRef<ChakraInstance[]>([]);

  /* ── Instagram state ─── */
  const cachedIg = readSnapshot<MetaDirectStatusResponse>(IG_STATUS_CACHE_KEY, 1000 * 60 * 10);
  const [igLoading, setIgLoading] = useState(!cachedIg);
  const [igConnected, setIgConnected] = useState(Boolean(cachedIg?.instagram?.connected));
  const [igBusy, setIgBusy] = useState(false);
  const [igError, setIgError] = useState<string | null>(null);
  const popupPollRef = useRef<number | null>(null);

  /* ── WhatsApp logic ─── */
  const syncWaStatus = useCallback(async () => {
    try {
      const status = await apiFetch<ChakraStatusResponse>(`/api/app/chakra/status?t=${Date.now()}`);
      writeSnapshot(CHAKRA_STATUS_CACHE_KEY, status);
      setWaPluginId(status.pluginId || null);
      const isConnected = Boolean(status.connected) || Boolean(status.isActive);
      setWaConnected((prev) => prev ? true : isConnected);
      return { hasPlugin: Boolean(status.pluginId), connected: isConnected };
    } catch {
      return { hasPlugin: false, connected: false };
    }
  }, [apiFetch]);

  const captureWaEvent = useCallback(
    async (event: unknown, data: unknown, pluginIdValue: string) => {
      try {
        const response = await apiFetch<ConnectEventResponse>('/api/app/chakra/connect-event', {
          method: 'POST',
          body: JSON.stringify({ event, data, pluginId: pluginIdValue, intent: 'CONNECT' }),
        });
        if (response.connected || Boolean(response.isActive)) {
          setWaConnected(true);
        }
      } catch {
        /* silent */
      } finally {
        try { await syncWaStatus(); } catch { /* */ }
      }
    },
    [apiFetch, syncWaStatus],
  );

  const prepareWaConnect = useCallback(async () => {
    setWaBusy(true);
    setWaError(null);
    try {
      const token = await apiFetch<ConnectTokenResponse>('/api/app/chakra/connect-token?intent=CONNECT');
      await loadChakraSdk(token.sdkUrl);
      for (const inst of instanceRef.current) inst?.destroy?.();
      instanceRef.current = [];

      const chakraGlobal = (window as any).ChakraWhatsappConnect;
      if (!chakraGlobal?.init) throw new Error('Bağlantı servisi yüklenemedi.');

      setWaNativeTriggerReady(false);
      const inst = chakraGlobal.init({
        connectToken: token.connectToken,
        container: `#${CONTAINER_ID}`,
        width: '260px',
        height: '80px',
        style: {
          width: '260px', height: '80px',
          transform: 'translateY(-28px) scale(2.17)', transformOrigin: 'top left',
          opacity: '0', border: '0', background: 'transparent', display: 'block',
          margin: '0', position: 'relative', inset: '', zIndex: '10', pointerEvents: 'auto',
        },
        onMessage: (ev: any, d: any) => {
          void captureWaEvent(ev, d, token.pluginId);
          if (isConnectedEvent(ev, d)) {
            setWaConnected(true);
            void syncWaStatus();
          }
        },
        onReady: () => { setWaNativeTriggerReady(true); },
        onError: (e: any) => setWaError(e?.message || 'Bağlantı sırasında hata oluştu.'),
      });
      instanceRef.current = [inst];
    } catch (err: any) {
      setWaError(err?.message || 'WhatsApp bağlantısı başlatılamadı.');
    } finally {
      setWaBusy(false);
    }
  }, [apiFetch, captureWaEvent, syncWaStatus]);

  const handleWaStart = async () => {
    setWaBusy(true);
    setWaError(null);
    try {
      const response = await apiFetch<CreatePluginResponse>('/api/app/chakra/create-plugin', { method: 'POST' });
      setWaPluginId(response.pluginId);
      setWaNativeTriggerReady(false);
      await prepareWaConnect();
    } catch (err: any) {
      setWaError(err?.message || 'Kurulum başlatılamadı.');
    } finally {
      setWaBusy(false);
    }
  };

  /* ── Instagram logic ─── */
  const clearPopupPoll = () => {
    if (popupPollRef.current !== null) {
      window.clearInterval(popupPollRef.current);
      popupPollRef.current = null;
    }
  };

  const syncIgStatus = useCallback(async () => {
    try {
      const data = await apiFetch<MetaDirectStatusResponse>('/api/app/meta-direct/status');
      writeSnapshot(IG_STATUS_CACHE_KEY, data);
      const connected = Boolean(data?.instagram?.connected) || data?.instagram?.status?.toUpperCase() === 'CONNECTED';
      setIgConnected(connected);
      return connected;
    } catch {
      return false;
    }
  }, [apiFetch]);

  const handleIgConnect = async () => {
    setIgBusy(true);
    setIgError(null);
    try {
      const data = await apiFetch<ConnectUrlResponse>('/api/app/meta-direct/connect-url', {
        method: 'POST',
        body: JSON.stringify({ channel: 'INSTAGRAM', intent: 'CONNECT' }),
      });
      const url = data?.authorizeUrl || '';
      if (!url) throw new Error('Bağlantı URL\'si alınamadı.');
      const popup = window.open(url, 'meta-direct-instagram', 'width=620,height=780');
      if (!popup) throw new Error('Popup engellendi. Lütfen bu site için popuplara izin verin.');
      clearPopupPoll();
      popupPollRef.current = window.setInterval(() => {
        if (popup.closed) { clearPopupPoll(); void syncIgStatus(); }
      }, 1000);
    } catch (err: any) {
      setIgError(err?.message || 'Instagram bağlantısı başlatılamadı.');
    } finally {
      setIgBusy(false);
    }
  };

  /* ── Initial load ─── */
  useEffect(() => {
    let mounted = true;
    (async () => {
      setWaLoading(true);
      setIgLoading(true);
      try {
        const waResult = await syncWaStatus();
        if (mounted && waResult.hasPlugin && !waResult.connected) {
          await prepareWaConnect();
        }
      } catch { /* */ }
      if (mounted) setWaLoading(false);

      try { await syncIgStatus(); } catch { /* */ }
      if (mounted) setIgLoading(false);
    })();

    return () => {
      mounted = false;
      for (const inst of instanceRef.current) inst?.destroy?.();
      instanceRef.current = [];
      clearPopupPoll();
    };
  }, [syncWaStatus, syncIgStatus, prepareWaConnect]);

  /* ── Visibility / focus sync ─── */
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        void syncWaStatus();
        void syncIgStatus();
      }
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [syncWaStatus, syncIgStatus]);

  const StatusDot = ({ connected }: { connected: boolean }) => (
    <span className="relative flex h-2 w-2 shrink-0">
      {connected && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
    </span>
  );

  return (
    <div className="h-full pb-20 overflow-y-auto bg-background">
      <div className="p-4 space-y-4">
        <p className="text-sm text-muted-foreground px-1 mb-2">
          Müşterilerinizle olan tüm iletişim kanallarını ve asistan tercihlerini yönetin.
        </p>

        <div className="space-y-2">
          {/* AI Settings */}
          <button
            type="button"
            onClick={() => navigate('/app/features/ai-settings', { state: { navDirection: 'forward' } })}
            className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm active:scale-[0.98] transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-bold leading-none mb-1.5">Yapay Zeka Ayarları</p>
                  <p className="text-xs text-muted-foreground leading-tight line-clamp-2 italic">Asistan davranışlarını ve yanıt kurallarını belirleyin</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </button>

          {/* Reminders */}
          <button
            type="button"
            onClick={() => navigate('/app/automations?section=reminder', { state: { navDirection: 'forward' } })}
            className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm active:scale-[0.98] transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <HelpCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold leading-none mb-1.5">Randevu Hatırlatmaları</p>
                  <p className="text-xs text-muted-foreground leading-tight line-clamp-2 italic">Otomatik onay ve hatırlatma mesajlarını yönetin</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </button>

          {/* WhatsApp */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm relative">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-4 flex-1">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="text-sm font-bold leading-none">WhatsApp</p>
                    <div className="flex items-center gap-1.5">
                      <StatusDot connected={waConnected} />
                      <span className={`text-[9px] uppercase font-bold tracking-wider ${waConnected ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {waLoading ? '...' : waConnected ? 'Bağlı' : 'Kapalı'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-tight line-clamp-2">İşletme hattınızı bağlayın ve mesajları yönetin</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                {waConnected ? (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-9 w-9 p-0 rounded-xl"
                    onClick={() => navigate('/app/features/whatsapp-settings', { state: { navDirection: 'forward' } })}
                  >
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                ) : (
                  <div className="relative overflow-hidden w-20 h-8">
                    {waPluginId ? (
                      <div className="absolute inset-0">
                        <div id={CONTAINER_ID} className="w-full h-full opacity-0 z-20 cursor-pointer" />
                        <Button className="w-full h-full bg-emerald-600 text-white text-[10px] z-10 p-0 rounded-lg">
                          {waBusy ? '...' : 'Bağla'}
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        className="h-8 w-full bg-emerald-600 text-white text-[10px] p-0 rounded-lg"
                        disabled={waBusy}
                        onClick={handleWaStart}
                      >
                        {waBusy ? '...' : 'Bağla'}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
            {waError && <p className="mt-2 text-[10px] text-red-500 bg-red-50 p-1.5 rounded-lg border border-red-100">{waError}</p>}
          </div>

          {/* Instagram */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-4 flex-1">
                <div className="h-10 w-10 rounded-xl bg-fuchsia-100 flex items-center justify-center shrink-0">
                  <Instagram className="w-5 h-5 text-fuchsia-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="text-sm font-bold leading-none">Instagram DM</p>
                    <div className="flex items-center gap-1.5">
                      <StatusDot connected={igConnected} />
                      <span className={`text-[9px] uppercase font-bold tracking-wider ${igConnected ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {igLoading ? '...' : igConnected ? 'Bağlı' : 'Kapalı'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-tight line-clamp-2">Instagram hesabınızı bağlayın ve DM'leri yönetin</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                {igConnected ? (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-9 w-9 p-0 rounded-xl"
                    onClick={() => navigate('/app/instagram-inbox', { state: { navDirection: 'forward' } })}
                  >
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    className="h-8 w-20 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white text-[10px] p-0 rounded-lg"
                    disabled={igBusy}
                    onClick={handleIgConnect}
                  >
                    {igBusy ? '...' : 'Bağla'}
                  </Button>
                )}
              </div>
            </div>
            {igError && <p className="mt-2 text-[10px] text-red-500 bg-red-50 p-1.5 rounded-lg border border-red-100">{igError}</p>}
          </div>
        </div>

        {/* Info / FAQ Section */}
        <section className="rounded-2xl border border-border bg-card p-4 space-y-3 opacity-80 mt-2">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Yardım ve Bilgi</p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="faq-1" className="border-border/50">
              <AccordionTrigger className="text-xs py-2 hover:no-underline">Bağlantı güvenli mi?</AccordionTrigger>
              <AccordionContent className="text-[11px] text-muted-foreground leading-relaxed">
                Tüm bağlantılar Meta'nın resmi ve güvenli protokolleri üzerinden gerçekleşir. Şifreleriniz asla sistemimize kaydedilmez.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-2" className="border-border/50">
              <AccordionTrigger className="text-xs py-2 hover:no-underline">Asistan nasıl devreye girer?</AccordionTrigger>
              <AccordionContent className="text-[11px] text-muted-foreground leading-relaxed">
                Yapay Zeka Ayarları bölümünden asistanı aktif ettiğinizde, bağladığınız kanallarda otomatik yanıt süreci başlar.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex items-center gap-2 rounded-xl bg-muted/30 p-2.5">
            <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="text-[10px] text-muted-foreground">
              Tüm bağlantılar Facebook/Meta güvenli OAuth protokolü üzerinden şifreli şekilde yürütülür.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}