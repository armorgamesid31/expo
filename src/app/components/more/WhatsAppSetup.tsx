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
      existing.addEventListener('error', () => reject(new Error('Chakra SDK failed to install.')), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = sdkUrl;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Chakra SDK failed to install.'));
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
      return "WhatsApp Business kanalınızı aktifleştirmek için bağlantı adımlarını başlatın.";
    }
    return cachedConnected ? "WhatsApp bağlantısı tamamlandı." : 'Kurulumu tamamlamak için Meta (Facebook) üzerinden yetkilendirmeyi gerçekleştirin.';
  });
  const [error, setError] = useState<string | null>(null);

  const syncStatusFromBackend = useCallback(async () => {
    const status = await apiFetch<ChakraStatusResponse>(`/api/app/chakra/status?t=${Date.now()}`);
    writeSnapshot(CHAKRA_STATUS_CACHE_KEY, status);

    setPluginId(status.pluginId || null);

    const isConnected = Boolean(status.connected) || Boolean(status.isActive);
    setConnected(isConnected);

    if (!status.pluginId) {
      setStatusText("WhatsApp Business kanalınızı aktifleştirmek için bağlantı adımlarını başlatın.");
      setNativeTriggerReady(false);
      return { hasPlugin: false, connected: false };
    }

    if (isConnected) {
      setStatusText("WhatsApp bağlantısı tamamlandı.");
      setNativeTriggerReady(false);
      return { hasPlugin: true, connected: true };
    }

    setStatusText('Kurulumu tamamlamak için Meta (Facebook) üzerinden yetkilendirmeyi gerçekleştirin.');
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
    setStatusText('Facebook işletme bağlantısı hazırlanıyor...');

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
        throw new Error('Chakra SDK init function not found.');
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
          setStatusText('Yetkilendirme butonu hazır.');
        },
        onError: (sdkError: any) => {
          console.error('Chakra SDK error:', sdkError);
          setError(sdkError?.message || 'Bağlantı sırasında bir hata oluştu.');
        }
      });

      instanceRef.current = [scaledInstance];
    } catch (err: any) {
      setError(err?.message || "Facebook baglantisi baslatilamadi.");
      setStatusText("Facebook baglantisi baslatilamadi.");
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
          setError(err?.message || "WhatsApp kurulum durumu alinamadi.");
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
        setStatusText("Güvenli bağlantı kurulumu bekleniyor...");
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
    setStatusText('İşletme bağlantısı başlatılıyor...');
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
    setStatusText('Test mode active: WhatsApp connection simulated.');
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
        'Bağlantıya hazır' :
        connectionStage === 'plugin' ?
          'Kurulum gerekli' :
          'Hazırlanıyor';

  return (
    <div className="h-full pb-20 overflow-y-auto">
      <div className="sticky top-0 z-10 border-b border-border bg-gradient-to-b from-background to-background/95 backdrop-blur-md">
        <div className="p-4 pb-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 -ml-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold tracking-tight">{replaceConnection ? 'Numara Değiştir' : 'Meta & WhatsApp Bağlantısı'}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {replaceConnection ? 'Salonunuz için kayıtlı WhatsApp numaranızı güvenle yenileyin.' : 'İşletmenizin WhatsApp hesabını bağlayarak otomatik hizmetleri aktifleştirin.'}
              </p>
            </div>
            {connected ? <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">Bağlı</Badge> : null}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Status card */}
        <section className="rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-400/5 to-transparent px-4 py-3 flex items-center justify-between gap-3 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#25D366]/15 flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4 text-[#25D366]" />
              </div>
              <div>
                <p className="text-sm font-bold">Bağlantı Durumu</p>
                <p className="text-xs text-muted-foreground mt-0.5">{statusText}</p>
              </div>
            </div>
            <Badge className={stageBadgeClass}>{stageLabel}</Badge>
          </div>

          <div className="p-4 space-y-3 bg-card">
            {loadingStatus ? (
              <div className="flex items-center gap-2 py-4 justify-center text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Durum kontrol ediliyor...</span>
              </div>
            ) : !pluginId ? (
              <>
                <p className="text-xs text-muted-foreground">
                  WhatsApp hesabınızı entegre etmek için aşağıdaki butona tıklayarak kurulum sürecini başlatın.
                </p>
                <Button
                  type="button"
                  onClick={() => void handleStart()}
                  disabled={creatingPlugin || loadingStatus}
                  className="w-full h-11 text-sm font-semibold bg-[#25D366] hover:bg-[#1da851] text-white"
                >
                  {creatingPlugin ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Hazırlanıyor...</>
                  ) : (
                    <><MessageCircle className="w-4 h-4 mr-2" />Bağlantıyı Başlat</>
                  )}
                </Button>
              </>
            ) : connected ? (
              <>
                <div className="flex items-center gap-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Bağlantı tamamlandı</p>
                    <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70 mt-0.5">WhatsApp kanalınız aktif. Ayarlara güvenle dönebilirsiniz.</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={onBack}
                >
                  Ayarlara Dön
                </Button>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  {replaceConnection ? 'Yeni numaranızı yetkilendirmek için aşağıdaki butona tıklayın.' : 'Meta (Facebook) ile güvenli bağlantıyı tamamlayın. İşlem bitene kadar lütfen bu ekranı kapatmayın.'}
                </p>
                <div className="relative w-full h-[58px] overflow-hidden rounded-xl border border-border/60 bg-white">
                  <div
                    id={CONTAINER_ID}
                    aria-label="WhatsApp bağlantı butonu"
                    className="absolute inset-0 h-[58px]"
                  />
                  {nativeTriggerReady ? (
                    isPopupConnecting ? (
                      <div className="pointer-events-none absolute inset-0 h-[58px] rounded-xl bg-[#25D366] text-white px-4 py-2 text-sm font-medium flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Bağlantı bekleniyor...
                      </div>
                    ) : (
                      <div className="pointer-events-none absolute inset-0 h-[58px] rounded-xl text-base font-semibold flex items-center justify-center bg-[#25D366] text-white">
                        Facebook ile Bağlan
                      </div>
                    )
                  ) : (
                    <div className="pointer-events-none absolute inset-0 h-[58px] rounded-xl bg-[#25D366] text-white px-4 py-2 text-sm font-medium flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Bağlantı butonu hazırlanıyor...
                    </div>
                  )}
                </div>
                {error ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => void prepareConnect()}
                    disabled={preparingConnect}
                  >
                    Yeniden Dene
                  </Button>
                ) : null}
              </>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-500/5 border border-red-500/15 p-3">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        </section>

        {/* FAQ */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-semibold mb-2">Sıkça Sorulan Sorular</p>
          <Accordion type="single" collapsible>
            <AccordionItem value="faq-1">
              <AccordionTrigger className="text-sm">Bağlantı işlemi nasıl güvenli çalışır?</AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                Bu kurulum süreci, Meta'nın resmi ve tamamen güvenli WhatsApp Business API arayüzünü kullanır. İşletmeniz için uçtan uca şifreli bir iletişim kanalı yaratılacaktır.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-2">
              <AccordionTrigger className="text-sm">Bu işlemi her seferinde yapmam gerekir mi?</AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                Hayır, bu işlem yalnızca ilk yapılandırmada veya salon telefon numaranızı değiştirmek istediğiniz istisnai durumlarda gereklidir. Bağlantı bir kez sağlandığında arka planda sürekli aktif kalır.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-3">
              <AccordionTrigger className="text-sm">Kurulumun başarıyla tamamlandığını nasıl anlarım?</AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                Ekranda yer alan durum rozeti "Bağlı" statüsüne geçiş yapar ve sistem sizi güvenli bir şekilde WhatsApp yönetim paneline otomatik olarak yönlendirir.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </div>
    </div>);

}
