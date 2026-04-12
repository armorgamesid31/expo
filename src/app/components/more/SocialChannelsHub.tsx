import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Instagram,
  Loader2,
  MessageCircle,
  RefreshCcw,
  Shield,
  Sparkles,
  Wifi,
  WifiOff,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { readSnapshot, writeSnapshot } from '../../lib/ui-cache';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

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
export function SocialChannelsHub({ onBack }: SocialChannelsHubProps) {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();

  /* ── WhatsApp state ─── */
  const cachedWa = readSnapshot<ChakraStatusResponse>(CHAKRA_STATUS_CACHE_KEY, 1000 * 60 * 10);
  const [waLoading, setWaLoading] = useState(!cachedWa);
  const [waConnected, setWaConnected] = useState(Boolean(cachedWa?.connected) || Boolean(cachedWa?.isActive));
  const [waPluginId, setWaPluginId] = useState<string | null>(cachedWa?.pluginId || null);
  const [waBusy, setWaBusy] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);
  const [waNativeTriggerReady, setWaNativeTriggerReady] = useState(false);
  const [waPopupConnecting, setWaPopupConnecting] = useState(false);
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
          setWaPopupConnecting(false);
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
          opacity: '1', border: '0', background: 'transparent', display: 'block',
          margin: '0', position: 'relative', inset: '', zIndex: '', pointerEvents: 'auto',
        },
        onMessage: (ev: any, d: any) => {
          void captureWaEvent(ev, d, token.pluginId);
          if (isConnectedEvent(ev, d)) {
            setWaConnected(true);
            setWaPopupConnecting(false);
            void syncWaStatus();
          }
        },
        onReady: () => { setWaNativeTriggerReady(true); setWaPopupConnecting(false); },
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
        if (!waConnected) setWaPopupConnecting(false);
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
  }, [waConnected, syncWaStatus, syncIgStatus]);

  /* ── Instagram postMessage callback ─── */
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const payload = event?.data;
      if (!payload || payload.type !== 'meta-direct-callback' || payload.channel !== 'INSTAGRAM') return;
      void syncIgStatus();
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [syncIgStatus]);

  /* ── Blur detection for WhatsApp popup ─── */
  useEffect(() => {
    const onBlur = () => {
      if (waNativeTriggerReady && waPluginId && !waConnected) {
        setWaPopupConnecting(true);
      }
    };
    const onFocus = () => { if (!waConnected) void syncWaStatus(); };
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => { window.removeEventListener('blur', onBlur); window.removeEventListener('focus', onFocus); };
  }, [waConnected, waNativeTriggerReady, waPluginId, syncWaStatus]);

  /* ── Auto-navigate on WhatsApp connect ─── */
  useEffect(() => {
    if (waConnected) {
      setWaPopupConnecting(false);
    }
  }, [waConnected]);

  const waStage = !waPluginId ? 'setup' : waConnected ? 'connected' : waNativeTriggerReady ? 'ready' : 'preparing';
  const igStage = igConnected ? 'connected' : 'setup';

  /* ── Render helpers ─── */
  const StatusDot = ({ connected }: { connected: boolean }) => (
    <span className={`relative flex h-3 w-3 shrink-0 ${connected ? '' : ''}`}>
      {connected && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />}
      <span className={`relative inline-flex h-3 w-3 rounded-full ${connected ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
    </span>
  );

  return (
    <div className="h-full pb-20 overflow-y-auto">
      {/* ── Header ─── */}
      <div className="sticky top-0 z-10 border-b border-border bg-gradient-to-b from-background to-background/95 backdrop-blur-md">
        <div className="p-4 pb-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 -ml-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight">Sosyal Kanallar</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Mesajlaşma kanallarınızı bağlayın ve yönetin</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* ── WhatsApp Card ─── */}
        <section className="rounded-2xl border border-border overflow-hidden shadow-sm">
          {/* Card header gradient */}
          <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-400/5 to-transparent px-4 py-3 flex items-center justify-between gap-3 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#25D366]/15 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 text-[#25D366]" />
              </div>
              <div>
                <p className="text-sm font-bold">WhatsApp</p>
                <p className="text-[11px] text-muted-foreground">Otomatik mesajlaşma ve yapay zeka asistanı</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusDot connected={waConnected} />
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                waConnected
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}>
                {waLoading ? 'Kontrol ediliyor...' : waConnected ? 'Bağlı' : 'Bağlı Değil'}
              </span>
            </div>
          </div>

          <div className="p-4 space-y-3 bg-card">
            {waLoading ? (
              <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Bağlantı durumu kontrol ediliyor...</span>
              </div>
            ) : waConnected ? (
              /* ── Connected state ──*/
              <>
                <div className="flex items-center gap-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">WhatsApp bağlantınız aktif</p>
                    <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70 mt-0.5">Yapay zeka asistanı ve hatırlatmalar çalışır durumda.</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => navigate('/app/features/whatsapp-settings', { state: { navDirection: 'forward', from: '/app/features/social-channels' } })}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--rose-gold)]" />
                    WhatsApp Ayarlarını Yönet
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Button>
              </>
            ) : (
              /* ── Not connected state ──*/
              <>
                <div className="flex items-center gap-3 rounded-xl bg-amber-500/5 border border-amber-500/15 p-3">
                  <WifiOff className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">WhatsApp henüz bağlanmadı</p>
                    <p className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-0.5">Bağlantı için Facebook hesabınız gereklidir.</p>
                  </div>
                </div>

                {waError && (
                  <div className="flex items-start gap-2 rounded-xl bg-red-500/5 border border-red-500/15 p-3">
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-700 dark:text-red-400">{waError}</p>
                  </div>
                )}

                {waStage === 'setup' ? (
                  <Button
                    type="button"
                    className="w-full h-12 text-base font-semibold bg-[#25D366] hover:bg-[#1da851] text-white shadow-md"
                    disabled={waBusy}
                    onClick={() => void handleWaStart()}
                  >
                    {waBusy ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Hazırlanıyor...</>
                    ) : (
                      <><MessageCircle className="w-5 h-5 mr-2" />WhatsApp'ı Bağla</>
                    )}
                  </Button>
                ) : (
                  /* Chakra SDK embedded button */
                  <div className="relative w-full h-[58px] overflow-hidden rounded-xl border border-border/60 bg-white">
                    <div id={CONTAINER_ID} aria-label="WhatsApp bağlantı butonu" className="absolute inset-0 h-[58px]" />
                    {waNativeTriggerReady ? (
                      waPopupConnecting ? (
                        <div className="pointer-events-none absolute inset-0 h-[58px] rounded-xl bg-[#25D366] text-white px-4 py-2 text-sm font-medium flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Bağlantı bekleniyor...
                        </div>
                      ) : (
                        <div className="pointer-events-none absolute inset-0 h-[58px] rounded-xl text-base font-semibold flex items-center justify-center bg-[#25D366] text-white">
                          <ExternalLink className="w-4 h-4 mr-2" />Facebook ile Bağlan
                        </div>
                      )
                    ) : (
                      <div className="pointer-events-none absolute inset-0 h-[58px] rounded-xl bg-[#25D366] text-white px-4 py-2 text-sm font-medium flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Bağlantı butonu hazırlanıyor...
                      </div>
                    )}
                  </div>
                )}

                {waError && (
                  <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => void prepareWaConnect()} disabled={waBusy}>
                    <RefreshCcw className="w-4 h-4 mr-2" />Yeniden Dene
                  </Button>
                )}
              </>
            )}
          </div>
        </section>

        {/* ── Instagram Card ─── */}
        <section className="rounded-2xl border border-border overflow-hidden shadow-sm">
          {/* Card header gradient */}
          <div className="bg-gradient-to-r from-fuchsia-500/10 via-pink-400/5 to-transparent px-4 py-3 flex items-center justify-between gap-3 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500/15 to-pink-500/15 flex items-center justify-center shrink-0">
                <Instagram className="w-5 h-5 text-fuchsia-600" />
              </div>
              <div>
                <p className="text-sm font-bold">Instagram DM</p>
                <p className="text-[11px] text-muted-foreground">Doğrudan mesaj yönetimi</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusDot connected={igConnected} />
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                igConnected
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}>
                {igLoading ? 'Kontrol ediliyor...' : igConnected ? 'Bağlı' : 'Bağlı Değil'}
              </span>
            </div>
          </div>

          <div className="p-4 space-y-3 bg-card">
            {igLoading ? (
              <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Bağlantı durumu kontrol ediliyor...</span>
              </div>
            ) : igConnected ? (
              <>
                <div className="flex items-center gap-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Instagram bağlantınız aktif</p>
                    <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70 mt-0.5">DM mesajlarınız gelen kutusuna yönlendirilmektedir.</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => navigate('/app/instagram-inbox', { state: { navDirection: 'forward', from: '/app/features/social-channels' } })}
                >
                  <span className="flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-fuchsia-600" />
                    Instagram Mesajlarına Git
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 rounded-xl bg-amber-500/5 border border-amber-500/15 p-3">
                  <WifiOff className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Instagram henüz bağlanmadı</p>
                    <p className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-0.5">Instagram işletme hesabınız gereklidir.</p>
                  </div>
                </div>

                {igError && (
                  <div className="flex items-start gap-2 rounded-xl bg-red-500/5 border border-red-500/15 p-3">
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-700 dark:text-red-400">{igError}</p>
                  </div>
                )}

                <Button
                  type="button"
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white shadow-md"
                  disabled={igBusy}
                  onClick={() => void handleIgConnect()}
                >
                  {igBusy ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Hazırlanıyor...</>
                  ) : (
                    <><Instagram className="w-5 h-5 mr-2" />Instagram'ı Bağla</>
                  )}
                </Button>
              </>
            )}
          </div>
        </section>

        {/* ── Info / FAQ Section ─── */}
        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Sıkça Sorulan Sorular</p>
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="faq-1">
              <AccordionTrigger className="text-sm">Bağlantı nasıl çalışır?</AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground">
                Her iki kanal da Facebook/Meta hesabınız üzerinden güvenli şekilde bağlanır.
                Bağlantı sırasında açılan pencerede giriş yapmanız yeterlidir.
                Bilgileriniz tamamen güvende tutulur.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-2">
              <AccordionTrigger className="text-sm">Bağlantıyı kaldırabilir miyim?</AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground">
                Evet. WhatsApp için ayarlar ekranından bağlantıyı devre dışı bırakabilirsiniz.
                Instagram için aynı şekilde tekrar bağlantıyı başlatarak hesap değiştirebilirsiniz.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-3">
              <AccordionTrigger className="text-sm">Sorun yaşıyorum, ne yapmalıyım?</AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground">
                Popup penceresi açılmıyorsa tarayıcı ayarlarından popup engellemesini kapatın.
                Bağlantı tamamlanmıyorsa sayfayı yenileyip tekrar deneyin.
                Sorun devam ederse destek ekibimize ulaşın.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex items-center gap-2 rounded-xl bg-muted/30 p-3">
            <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              Tüm bağlantılar Facebook/Meta güvenli OAuth protokolü üzerinden gerçekleşir. Şifre bilginiz saklanmaz.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}