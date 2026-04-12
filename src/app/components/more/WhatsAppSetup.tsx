import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessageCircle, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useAuth } from '../../context/AuthContext';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { readSnapshot, writeSnapshot } from '../../lib/ui-cache';

interface WhatsAppSetupProps {
  onBack: () => void;
}

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

type ChakraInstance = {
  destroy?: () => void;
};

const CONTAINER_ID = 'chakra-whatsapp-connect-container';
const SCRIPT_ID = 'chakra-whatsapp-connect-sdk-script';
const WHATSAPP_DEV_BYPASS_KEY = 'kedy_whatsapp_dev_bypass_connected';
const CHAKRA_STATUS_CACHE_KEY = 'chakra:status';

function loadChakraSdk(sdkUrl: string): Promise<void> {
  if ((window as any).ChakraWhatsappConnect?.init) {
    return Promise.resolve();
  }

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Chakra SDK yüklenemedi.')), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = sdkUrl;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Chakra SDK yüklenemedi.'));
    document.head.appendChild(script);
  });
}

function isConnectedEvent(event: unknown, data: unknown): boolean {
  const eventText = typeof event === 'string' ? event.toLowerCase() : '';
  const dataObj = data && typeof data === 'object' && !Array.isArray(data) ? data as Record<string, any> : null;
  const status = typeof dataObj?.status === 'string' ? dataObj.status.toLowerCase() : '';
  const state = typeof dataObj?.state === 'string' ? dataObj.state.toLowerCase() : '';
  const hasAuth = Boolean(dataObj?.auth && typeof dataObj.auth === 'object');
  const hasEnabledNumbers =
  Array.isArray(dataObj?.serverConfig?.enabledWhatsappPhoneNumbers) &&
  dataObj.serverConfig.enabledWhatsappPhoneNumbers.some(
    (value: unknown) => typeof value === 'string' && value.trim().length > 0
  );
  const pattern = /(connected|success|complete|completed|linked)/i;
  return pattern.test(eventText) || pattern.test(status) || pattern.test(state) || hasAuth || hasEnabledNumbers;
}

export function WhatsAppSetup({ onBack }: WhatsAppSetupProps) {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const replaceConnection = Boolean((location.state as any)?.replaceConnection);
  const instanceRef = useRef<ChakraInstance[]>([]);
  const hasAutoNavigatedRef = useRef(false);
  const cachedStatus = readSnapshot<ChakraStatusResponse>(CHAKRA_STATUS_CACHE_KEY, 1000 * 60 * 10);

  const [loadingStatus, setLoadingStatus] = useState(!cachedStatus);
  const [creatingPlugin, setCreatingPlugin] = useState(false);
  const [preparingConnect, setPreparingConnect] = useState(false);
  const [pluginId, setPluginId] = useState<string | null>(cachedStatus?.pluginId || null);
  const [nativeTriggerReady, setNativeTriggerReady] = useState(false);
  const [isPopupConnecting, setIsPopupConnecting] = useState(false);
  const [connected, setConnected] = useState(Boolean(cachedStatus?.connected) || Boolean(cachedStatus?.isActive));
  const [autoNavigatePending, setAutoNavigatePending] = useState(false);
  const [devBypassed, setDevBypassed] = useState(false);
  const [statusText, setStatusText] = useState(() => {
    if (!cachedStatus) {
      return "WhatsApp hesabınızı bağlamak için Başlayın düğmesine dokunun.";
    }
    const cachedConnected = Boolean(cachedStatus.connected) || Boolean(cachedStatus.isActive);
    if (!cachedStatus.pluginId) {
      return "WhatsApp hesabınızı bağlamak için Başlayın düğmesine dokunun.";
    }
    return cachedConnected ? "WhatsApp bağlantısı tamamlandı." : 'Facebook ile devam ederek bağlantıyı tamamlayın.';
  });
  const [error, setError] = useState<string | null>(null);

  const syncStatusFromBackend = useCallback(async () => {
    const status = await apiFetch<ChakraStatusResponse>(`/api/app/chakra/status?t=${Date.now()}`);
    writeSnapshot(CHAKRA_STATUS_CACHE_KEY, status);

    setPluginId(status.pluginId || null);

    const isConnected = Boolean(status.connected) || Boolean(status.isActive);
    setConnected((prev) => prev ? true : isConnected);

    if (!status.pluginId) {
      setStatusText("WhatsApp hesabınızı bağlamak için Başlayın düğmesine dokunun.");
      setNativeTriggerReady(false);
      return { hasPlugin: false, connected: false };
    }

    if (isConnected) {
      setStatusText("WhatsApp bağlantısı tamamlandı.");
      setNativeTriggerReady(false);
      return { hasPlugin: true, connected: true };
    }

    setStatusText('Facebook ile devam ederek bağlantıyı tamamlayın.');
    return { hasPlugin: true, connected: false };
  }, [apiFetch]);

  const captureEvent = useCallback(async (event: unknown, data: unknown, pluginIdValue: string) => {
    try {
      const response = await apiFetch<ConnectEventResponse>('/api/app/chakra/connect-event', {
        method: 'POST',
        body: JSON.stringify({
          event,
          data,
          pluginId: pluginIdValue,
          intent: replaceConnection ? 'REPLACE_CONNECTION' : 'CONNECT'
        })
      });

      if (response.connected || Boolean(response.isActive)) {
        setConnected(true);
        setAutoNavigatePending(true);
        setIsPopupConnecting(false);
        setStatusText("WhatsApp bağlantısı tamamlandı.");
      }
    } catch (err) {
      console.warn('Connect event capture failed:', err);
    } finally {
      try {
        await syncStatusFromBackend();
      } catch (statusError) {
        console.warn('Bağlantı sonrası durum yenileme başarısız:', statusError);
      }
    }
  }, [apiFetch, replaceConnection, syncStatusFromBackend]);

  const prepareConnect = useCallback(async () => {
    setPreparingConnect(true);
    setError(null);
    setStatusText('Facebook bağlantısı hazırlanıyor...');

    try {
      const token = await apiFetch<ConnectTokenResponse>(
        `/api/app/chakra/connect-token?intent=${replaceConnection ? 'REPLACE_CONNECTION' : 'CONNECT'}`
      );
      await loadChakraSdk(token.sdkUrl);

      for (const instance of instanceRef.current) {
        if (instance?.destroy) {
          instance.destroy();
        }
      }
      instanceRef.current = [];

      const chakraGlobal = (window as any).ChakraWhatsappConnect;
      if (!chakraGlobal?.init) {
        throw new Error('Chakra SDK init fonksiyonu bulunamadı.');
      }

      setNativeTriggerReady(false);

      const scaledInstance = chakraGlobal.init({
        connectToken: token.connectToken,
        container: `#${CONTAINER_ID}`,
        width: '260px',
        height: '80px',
        style: {
          width: '260px',
          height: '80px',
          transform: 'translateY(-28px) scale(2.17)',
          transformOrigin: 'top left',
          opacity: '1',
          border: '0',
          background: 'transparent',
          display: 'block',
          margin: '0',
          position: 'relative',
          inset: '',
          zIndex: '',
          pointerEvents: 'auto'
        },
        onMessage: (event: any, data: any) => {
          void captureEvent(event, data, token.pluginId);
          if (isConnectedEvent(event, data)) {
            setConnected(true);
            setAutoNavigatePending(true);
            setIsPopupConnecting(false);
            setStatusText("WhatsApp bağlantısı tamamlandı.");
            void syncStatusFromBackend();
          }
        },
        onReady: () => {
          setNativeTriggerReady(true);
          setIsPopupConnecting(false);
          setStatusText('Bağlantı butonu hazır.');
        },
        onError: (sdkError: any) => {
          console.error('Chakra SDK error:', sdkError);
          setError(sdkError?.message || 'Chakra popup akışında bir hata oluştu.');
        }
      });

      instanceRef.current = [scaledInstance];
    } catch (err: any) {
      setError(err?.message || "Facebook bağlantısı başlatılamadı.");
      setStatusText("Facebook bağlantısı başlatılamadı.");
    } finally {
      setPreparingConnect(false);
    }
  }, [apiFetch, captureEvent, replaceConnection, syncStatusFromBackend]);

  useEffect(() => {
    const bypass = window.localStorage.getItem(WHATSAPP_DEV_BYPASS_KEY) === '1';
    if (bypass) {
      setDevBypassed(true);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoadingStatus(true);
      setError(null);
      try {
        const status = await syncStatusFromBackend();
        if (!mounted) {
          return;
        }
        if (status.hasPlugin && !status.connected) {
          await prepareConnect();
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || "WhatsApp kurulum durumu alınamadı.");
          setStatusText("Durum alınamadı. Sayfayı yenileyin.");
        }
      } finally {
        if (mounted) {
          setLoadingStatus(false);
        }
      }
    })();

    return () => {
      mounted = false;
      for (const instance of instanceRef.current) {
        if (instance?.destroy) {
          instance.destroy();
        }
      }
      instanceRef.current = [];
    };
  }, [prepareConnect, syncStatusFromBackend]);

  useEffect(() => {
    const refreshStatus = () => {
      if (document.visibilityState === 'visible') {
        if (!connected) {
          setIsPopupConnecting(false);
        }
        void syncStatusFromBackend();
      }
    };

    window.addEventListener('focus', refreshStatus);
    document.addEventListener('visibilitychange', refreshStatus);

    return () => {
      window.removeEventListener('focus', refreshStatus);
      document.removeEventListener('visibilitychange', refreshStatus);
    };
  }, [connected, syncStatusFromBackend]);

  useEffect(() => {
    const onBlur = () => {
      if (nativeTriggerReady && pluginId && !connected) {
        setIsPopupConnecting(true);
        setStatusText("Bağlantı süreci devam ediyor...");
      }
    };

    const onFocus = () => {
      if (!connected) {
        void syncStatusFromBackend();
      }
    };

    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, [connected, nativeTriggerReady, pluginId, syncStatusFromBackend]);

  useEffect(() => {
    if (connected) {
      setIsPopupConnecting(false);
      setStatusText("WhatsApp bağlantısı tamamlandı.");
    }
  }, [connected]);

  useEffect(() => {
    if (!connected || !autoNavigatePending || hasAutoNavigatedRef.current) {
      if (!connected || !autoNavigatePending) {
        hasAutoNavigatedRef.current = false;
      }
      return;
    }

    hasAutoNavigatedRef.current = true;
    setStatusText('Bağlantı tamamlandı, WhatsApp ayarlarına yönlendiriliyorsunuz...');

    const timer = window.setTimeout(() => {
      navigate('/app/features/whatsapp-settings', { replace: true });
    }, 900);

    return () => {
      window.clearTimeout(timer);
    };
  }, [connected, autoNavigatePending, navigate]);

  useEffect(() => {
    if (!connected) {
      return;
    }
    const verify = window.setTimeout(() => {
      void syncStatusFromBackend();
    }, 1200);
    return () => {
      window.clearTimeout(verify);
    };
  }, [connected, syncStatusFromBackend]);

  const handleStart = async () => {
    setCreatingPlugin(true);
    setError(null);
    setStatusText('Kurulum başlatılıyor...');
    try {
      const response = await apiFetch<CreatePluginResponse>('/api/app/chakra/create-plugin', {
        method: 'POST'
      });
      setPluginId(response.pluginId);
      setNativeTriggerReady(false);
      await prepareConnect();
    } catch (err: any) {
      setError(err?.message || 'Kurulum başlatılamadı.');
      setStatusText('Kurulum başlatılamadı.');
    } finally {
      setCreatingPlugin(false);
    }
  };

  const handleDevBypass = () => {
    setError(null);
    window.localStorage.setItem(WHATSAPP_DEV_BYPASS_KEY, '1');
    setDevBypassed(true);
    setStatusText('Test modu aktif: WhatsApp bağlantısı simüle edildi.');
    navigate('/app/features/whatsapp-settings');
  };

  const connectionStage = !pluginId ? 'plugin' : connected ? 'connected' : nativeTriggerReady ? 'ready' : 'preparing';
  const stageBadgeClass =
  connectionStage === 'connected' ?
  'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' :
  connectionStage === 'ready' ?
  'bg-blue-500/10 text-blue-700 border-blue-500/20' :
  'bg-amber-500/10 text-amber-700 border-amber-500/20';
  const stageLabel =
  connectionStage === 'connected' ?
  "Bağlı" :
  connectionStage === 'ready' ?
  'Bağlanmaya hazır' :
  connectionStage === 'plugin' ?
  'Plugin kurulumu gerekli' :
  'Hazırlanıyor';

  return (
    <div className="h-full pb-20 overflow-y-auto">
      <div className="p-4 border-b border-border bg-[var(--luxury-bg)] sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">{replaceConnection ? 'WhatsApp Numara Değişikliği' : 'WhatsApp Kurulumu'}</h1>
            <p className="text-sm text-muted-foreground">
              {replaceConnection ? 'Aktif WhatsApp numarasını güvenli bir şekilde değiştirin' : 'WhatsApp hesabınızı hızlı kurulumla bağlayın'}
            </p>
          </div>
          {connected ? <Badge className="bg-green-500/10 text-green-700 border-green-500/20">Bağlı</Badge> : null}
        </div>
      </div>

      <div className="p-4 space-y-4">
        <section className="rounded-2xl border border-border bg-background/90 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#22C55E]" />
                <p className="text-sm font-semibold">WhatsApp Bağlantısı Health</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{statusText}</p>
            </div>
            <Badge className={stageBadgeClass}>{stageLabel}</Badge>
          </div>
          {loadingStatus ?
          <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Canlı durum yükleniyor...
            </div> :
          null}
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr,1fr] gap-4">
          <section className="rounded-2xl border border-border bg-background/90 p-4 space-y-4">
            {!pluginId ?
            <>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">1. Eklentiyi başlat</p>
                  <p className="text-xs text-muted-foreground">
                    Facebook güvenli bağlantısını açmadan önce her salon için gereklidir.
                  </p>
                </div>
                <Button
                type="button"
                onClick={() => {
                  void handleStart();
                }}
                disabled={creatingPlugin || loadingStatus}
                className="w-full"
                style={{ backgroundColor: 'var(--rose-gold)', color: 'white' }}>
                
                  {creatingPlugin ?
                <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Başlatılıyor...
                    </> :

                'Başlat ve Devam Et'
                }
                </Button>
              </> :
            connected ?
            <>
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <p className="text-sm font-semibold">Bağlantı tamamlandı</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Bu salon için WhatsApp kanalı aktif. Ayarlara güvenle dönebilirsiniz.
                </p>
              </> :

            <>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{replaceConnection ? '2. Telefon numarasını değiştir' : '2. Güvenli Facebook bağlantısı'}</p>
                  <p className="text-xs text-muted-foreground">
                    Gömülü güvenli akışı kullanın. Geri çağrı tamamlanana kadar bu ekranı açık tutun.
                  </p>
                </div>
                <div className="relative w-full h-[58px] overflow-hidden rounded-md border border-border/60 bg-white">
                  <div
                  id={CONTAINER_ID}
                  aria-label="Chakra bağlantı butonu"
                  className="absolute inset-0 h-[58px]" />
                
                  {nativeTriggerReady ?
                isPopupConnecting ?
                <div className="pointer-events-none absolute inset-0 h-[58px] rounded-md bg-[var(--rose-gold)] text-white px-4 py-2 text-sm font-medium flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Yanıt bekleniyor...
                      </div> :

                <div
                  className="pointer-events-none absolute inset-0 h-[58px] rounded-md text-base font-semibold flex items-center justify-center"
                  style={{ backgroundColor: 'var(--rose-gold)', color: 'white' }}>
                  
                        Facebook ile Bağlan
                      </div> :


                <div className="pointer-events-none absolute inset-0 h-[58px] rounded-md bg-[var(--rose-gold)] text-white px-4 py-2 text-sm font-medium flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Bağlantı butonu hazırlanıyor...
                    </div>
                }
                </div>
                {error ?
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void prepareConnect();
                }}
                disabled={preparingConnect}>
                
                    Tekrar Dene
                  </Button> :
              null}
              </>
            }

            <Button
              type="button"
              variant="outline"
              onClick={handleDevBypass}
              className="w-full">
              
              {devBypassed ? 'Test Mode: Open AI Agent Screen' : "Test Modu: Bağlı Olarak Devam Et"}
            </Button>
          </section>

          <section className="rounded-2xl border border-border bg-background/90 p-4">
            <p className="text-sm font-semibold mb-2">Operatör Notları</p>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>- Bu ekran canlı /api/app/chakra/* uç noktalarını kullanır.</p>
              <p>- Değiştirme modu akışı aynı tutar, sadece güvenli kimlik değişimi için amaç değişir.</p>
              <p>- Eğer popup erken kapanırsa, bu sayfadan tekrar açın ve yanıtı tamamlayın.</p>
            </div>
            {error ?
            <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/5 p-3 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <span>{error}</span>
              </div> :
            null}
            <div className="mt-4 rounded-xl border border-border/60 bg-muted/10 p-3">
              <p className="text-sm font-medium">Yardım</p>
              <Accordion type="single" collapsible>
                <AccordionItem value="faq-1">
                  <AccordionTrigger>Initialize ne işe yarar?</AccordionTrigger>
                  <AccordionContent>
                    Bu salon için eklenti bağlamı oluşturur ve güvenli bağlantı jetonunu hazırlar.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-2">
                  <AccordionTrigger>Bunu her seferinde yapmam gerekiyor mu?</AccordionTrigger>
                  <AccordionContent>
                    Hayır. Sadece eklenti eksikse veya yeniden oluşturuluyorsa gereklidir.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-3">
                  <AccordionTrigger>Tamamlandığını nasıl doğrularım?</AccordionTrigger>
                  <AccordionContent>
                    Durum rözeti Bağlı olur ve bu sayfa WhatsApp ayarlarına yönlenir.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>
        </div>
      </div>
    </div>);

}
