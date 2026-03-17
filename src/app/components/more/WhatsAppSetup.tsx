import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessageCircle, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useAuth } from '../../context/AuthContext';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

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
}

interface ConnectEventResponse {
  ok: boolean;
  pluginId: string;
  connected: boolean;
  isActive?: boolean | null;
  event: string | null;
}

type ChakraInstance = {
  destroy?: () => void;
};

const CONTAINER_ID = 'chakra-whatsapp-connect-container';
const SCRIPT_ID = 'chakra-whatsapp-connect-sdk-script';
const WHATSAPP_DEV_BYPASS_KEY = 'kedy_whatsapp_dev_bypass_connected';

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
  const dataObj = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, any>) : null;
  const status = typeof dataObj?.status === 'string' ? dataObj.status.toLowerCase() : '';
  const state = typeof dataObj?.state === 'string' ? dataObj.state.toLowerCase() : '';
  const hasAuth = Boolean(dataObj?.auth && typeof dataObj.auth === 'object');
  const hasEnabledNumbers =
    Array.isArray(dataObj?.serverConfig?.enabledWhatsappPhoneNumbers) &&
    dataObj.serverConfig.enabledWhatsappPhoneNumbers.some(
      (value: unknown) => typeof value === 'string' && value.trim().length > 0,
    );
  const pattern = /(connected|success|complete|completed|linked)/i;
  return pattern.test(eventText) || pattern.test(status) || pattern.test(state) || hasAuth || hasEnabledNumbers;
}

export function WhatsAppSetup({ onBack }: WhatsAppSetupProps) {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const instanceRef = useRef<ChakraInstance[]>([]);
  const hasAutoNavigatedRef = useRef(false);

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [creatingPlugin, setCreatingPlugin] = useState(false);
  const [preparingConnect, setPreparingConnect] = useState(false);
  const [pluginId, setPluginId] = useState<string | null>(null);
  const [nativeTriggerReady, setNativeTriggerReady] = useState(false);
  const [isPopupConnecting, setIsPopupConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [devBypassed, setDevBypassed] = useState(false);
  const [statusText, setStatusText] = useState('WhatsApp hesabınızı bağlamak için Başla butonuna dokunun.');
  const [error, setError] = useState<string | null>(null);

  const syncStatusFromBackend = useCallback(async () => {
    const status = await apiFetch<ChakraStatusResponse>(`/api/app/chakra/status?t=${Date.now()}`);

    setPluginId(status.pluginId || null);

    const isConnected = Boolean(status.connected) || Boolean(status.isActive);
    setConnected((prev) => (prev ? true : isConnected));

    if (!status.pluginId) {
      setStatusText('WhatsApp hesabınızı bağlamak için Başla butonuna dokunun.');
      setNativeTriggerReady(false);
      return { hasPlugin: false, connected: false };
    }

    if (isConnected) {
      setStatusText('WhatsApp bağlantısı tamamlandı.');
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
        body: JSON.stringify({ event, data, pluginId: pluginIdValue }),
      });

      if (response.connected || Boolean(response.isActive)) {
        setConnected(true);
        setIsPopupConnecting(false);
        setStatusText('WhatsApp bağlantısı tamamlandı.');
      }
    } catch (err) {
      console.warn('Connect event capture failed:', err);
    } finally {
      try {
        await syncStatusFromBackend();
      } catch (statusError) {
        console.warn('Status refresh after connect event failed:', statusError);
      }
    }
  }, [apiFetch, syncStatusFromBackend]);

  const prepareConnect = useCallback(async () => {
    setPreparingConnect(true);
    setError(null);
    setStatusText('Facebook bağlantısı hazırlanıyor...');

    try {
      const token = await apiFetch<ConnectTokenResponse>('/api/app/chakra/connect-token');
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
          pointerEvents: 'auto',
        },
        onMessage: (event: any, data: any) => {
          void captureEvent(event, data, token.pluginId);
          if (isConnectedEvent(event, data)) {
            setConnected(true);
            setIsPopupConnecting(false);
            setStatusText('WhatsApp bağlantısı tamamlandı.');
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
          setError(sdkError?.message || 'Chakra popup akışında hata oluştu.');
        },
      });

      instanceRef.current = [scaledInstance];
    } catch (err: any) {
      setError(err?.message || 'Facebook bağlantısı başlatılamadı.');
      setStatusText('Facebook bağlantısı başlatılamadı.');
    } finally {
      setPreparingConnect(false);
    }
  }, [apiFetch, captureEvent, syncStatusFromBackend]);

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
          setError(err?.message || 'WhatsApp kurulum durumu alınamadı.');
          setStatusText('Durum alınamadı. Sayfayı yenileyin.');
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
        setStatusText('Bağlantı işlemi devam ediyor...');
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
      setStatusText('WhatsApp bağlantısı tamamlandı.');
    }
  }, [connected]);

  useEffect(() => {
    if (!connected || hasAutoNavigatedRef.current) {
      if (!connected) {
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
  }, [connected, navigate]);

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
        method: 'POST',
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

  return (
    <div className="h-full pb-20 overflow-y-auto">
      <div className="p-4 border-b border-border bg-[var(--luxury-bg)] sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">WhatsApp Kurulumu</h1>
            <p className="text-sm text-muted-foreground">Hızlı kurulum ile WhatsApp hesabını bağlayın</p>
          </div>
          {connected ? <Badge className="bg-green-500/10 text-green-700 border-green-500/20">Bağlandı</Badge> : null}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loadingStatus ? (
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Kurulum durumu yükleniyor...
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-[#22C55E]/30 bg-gradient-to-br from-[#22C55E]/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#22C55E]/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-[#22C55E]" />
              </div>
              <div>
                <h3 className="font-semibold">WhatsApp Bağlantısı</h3>
                <p className="text-xs text-muted-foreground">{statusText}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {!pluginId ? (
          <Card className="border-border/50">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Bu işlem yalnızca ilk kurulumda gereklidir.
              </p>
              <Button
                type="button"
                onClick={() => {
                  void handleStart();
                }}
                disabled={creatingPlugin || loadingStatus}
                className="w-full"
                style={{ backgroundColor: 'var(--rose-gold)', color: 'white' }}
              >
                {creatingPlugin ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Başlatılıyor...
                  </>
                ) : (
                  'Başla'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleDevBypass}
                className="w-full"
              >
                {devBypassed ? 'Test Modu: AI Agent Ekranını Aç' : 'Test Modu: Bağlandı Olarak Devam Et'}
              </Button>
            </CardContent>
          </Card>
        ) : connected ? (
          <Card className="border-[#22C55E]/30 bg-[#22C55E]/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-700">
                <div className="relative w-5 h-5">
                  <span className="absolute inset-0 rounded-full bg-green-500/30 animate-ping" />
                  <CheckCircle2 className="relative w-5 h-5 text-green-600" />
                </div>
                <p className="text-sm font-medium">WhatsApp bağlantısı başarıyla tamamlandı.</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Bu salon için bağlantı aktif. Buraya tekrar girdiğinizde buton görünmez.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={handleDevBypass}
                className="w-full"
              >
                {devBypassed ? 'Test Modu: AI Agent Ekranını Aç' : 'Test Modu: Bağlandı Olarak Devam Et'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Büyütülmüş Chakra + Maske</p>
                <div className="relative w-full h-[58px] overflow-hidden rounded-md border border-border/60 bg-white">
                  <div
                    id={CONTAINER_ID}
                    aria-label="Büyütülmüş Chakra butonu"
                    className="absolute inset-0 h-[58px]"
                  />
                  {nativeTriggerReady ? (
                    isPopupConnecting ? (
                      <div className="pointer-events-none absolute inset-0 h-[58px] rounded-md bg-[var(--rose-gold)] text-white px-4 py-2 text-sm font-medium whitespace-nowrap flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Bağlanılıyor...
                      </div>
                    ) : (
                      <div
                        className="pointer-events-none absolute inset-0 h-[58px] rounded-md text-base font-semibold flex items-center justify-center"
                        style={{ backgroundColor: 'var(--rose-gold)', color: 'white' }}
                      >
                        Facebook ile Güvenli Bağlantı
                      </div>
                    )
                  ) : (
                    <div className="pointer-events-none absolute inset-0 h-[58px] rounded-md bg-[var(--rose-gold)] text-white px-4 py-2 text-sm font-medium whitespace-nowrap flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Buton hazırlanıyor...
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleDevBypass}
                className="w-full"
              >
                {devBypassed ? 'Test Modu: AI Agent Ekranını Aç' : 'Test Modu: Bağlandı Olarak Devam Et'}
              </Button>

              {error ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full mt-2"
                  onClick={() => {
                    void prepareConnect();
                  }}
                  disabled={preparingConnect}
                >
                  Tekrar Dene
                </Button>
              ) : null}
            </CardContent>
          </Card>
        )}

        {error ? (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Yardım</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible>
              <AccordionItem value="faq-1">
                <AccordionTrigger>Başla butonu ne yapar?</AccordionTrigger>
                <AccordionContent>
                  Salonunuz için bir kez plugin oluşturur ve bağlantı butonunu hazırlar.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-2">
                <AccordionTrigger>Her girişte tekrar Başla&apos;ya basmalı mıyım?</AccordionTrigger>
                <AccordionContent>
                  Hayır. İlk kurulumdan sonra ekran açıldığında bağlantı butonu otomatik gelir.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-3">
                <AccordionTrigger>Popup kapandıysa ne olur?</AccordionTrigger>
                <AccordionContent>
                  Kurulum tamamlanmadıysa yeniden bağlantı butonuna tıklayarak popup&apos;ı tekrar açabilirsiniz.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-4">
                <AccordionTrigger>Bağlantının tamamlandığını nasıl anlarım?</AccordionTrigger>
                <AccordionContent>
                  Üstteki durum alanında “WhatsApp bağlantısı tamamlandı” bilgisi görünür.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
