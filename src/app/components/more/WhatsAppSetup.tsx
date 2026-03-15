import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessageCircle, Loader2, AlertCircle } from 'lucide-react';
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
  event: string | null;
}

type ChakraInstance = {
  destroy?: () => void;
};

const CONTAINER_ID = 'chakra-whatsapp-connect-container';
const CONTAINER_INNER_ID = 'chakra-whatsapp-connect-inner';
const SCRIPT_ID = 'chakra-whatsapp-connect-sdk-script';
const WHATSAPP_DEV_BYPASS_KEY = 'kedy_whatsapp_dev_bypass_connected';
const CHAKRA_SCALE_X = 3;
const CHAKRA_SCALE_Y = 2;

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
  const pattern = /(connected|success|complete|completed|linked)/i;
  return pattern.test(eventText) || pattern.test(status) || pattern.test(state);
}

export function WhatsAppSetup({ onBack }: WhatsAppSetupProps) {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const instanceRef = useRef<ChakraInstance[]>([]);
  const fitObserverRef = useRef<MutationObserver | null>(null);

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [creatingPlugin, setCreatingPlugin] = useState(false);
  const [preparingConnect, setPreparingConnect] = useState(false);
  const [pluginId, setPluginId] = useState<string | null>(null);
  const [needsConnectInit, setNeedsConnectInit] = useState(false);
  const [nativeTriggerReady, setNativeTriggerReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [devBypassed, setDevBypassed] = useState(false);
  const [statusText, setStatusText] = useState('WhatsApp hesabınızı bağlamak için Başla butonuna dokunun.');
  const [error, setError] = useState<string | null>(null);

  const captureEvent = useCallback(async (event: unknown, data: unknown, pluginIdValue: string) => {
    try {
      const response = await apiFetch<ConnectEventResponse>('/api/app/chakra/connect-event', {
        method: 'POST',
        body: JSON.stringify({ event, data, pluginId: pluginIdValue }),
      });

      if (response.connected) {
        setConnected(true);
        setStatusText('WhatsApp bağlantısı tamamlandı.');
      }
    } catch (err) {
      console.warn('Connect event capture failed:', err);
    }
  }, [apiFetch]);

  const prepareConnect = useCallback(async () => {
    setPreparingConnect(true);
    setError(null);
    setStatusText('Facebook bağlantısı hazırlanıyor...');

    try {
      const waitForContainer = async () => {
        for (let i = 0; i < 12; i += 1) {
          const found = document.getElementById(CONTAINER_ID);
          const inner = document.getElementById(CONTAINER_INNER_ID);
          if (found && inner) {
            return { outer: found, inner };
          }
          await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
        }
        throw new Error('Bağlantı butonu alanı hazırlanamadı. Sayfayı yenileyip tekrar deneyin.');
      };

      const { outer: containerEl, inner: innerEl } = await waitForContainer();
      const containerHeight = containerEl.clientHeight || 58;

      const enforceScaledLayout = () => {
        const inner = document.getElementById(CONTAINER_INNER_ID);
        if (!inner) {
          return false;
        }

        const target =
          (inner.querySelector('iframe') as HTMLElement | null) ||
          (inner.firstElementChild as HTMLElement | null);

        if (!target) {
          return false;
        }

        Object.assign(target.style, {
          position: 'absolute',
          top: '0',
          left: '0',
          margin: '0',
          padding: '0',
          width: '100%',
          height: '100%',
          transform: 'none',
          transformOrigin: 'top left',
          zIndex: '2',
          pointerEvents: 'auto',
          display: 'block',
          border: '0',
        } as Partial<CSSStyleDeclaration>);

        return true;
      };

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
      setConnected(false);

      const scaledInstance = chakraGlobal.init({
        connectToken: token.connectToken,
        container: `#${CONTAINER_INNER_ID}`,
        width: `${innerEl.clientWidth || 120}px`,
        height: `${containerHeight}px`,
        style: {
          width: `${innerEl.clientWidth || 120}px`,
          height: `${containerHeight}px`,
          transform: 'none',
          transformOrigin: 'top left',
          opacity: '1',
          border: '0',
          background: 'transparent',
          display: 'block',
          margin: '0',
          position: 'absolute',
          top: '0',
          left: '0',
          zIndex: '2',
          pointerEvents: 'auto',
        },
        onMessage: (event: any, data: any) => {
          void captureEvent(event, data, token.pluginId);
          if (isConnectedEvent(event, data)) {
            setConnected(true);
            setStatusText('WhatsApp bağlantısı tamamlandı.');
          }
        },
        onReady: () => {
          setNativeTriggerReady(true);
          setStatusText('Bağlantı butonu hazır.');
        },
        onError: (sdkError: any) => {
          console.error('Chakra SDK error:', sdkError);
          setError(sdkError?.message || 'Chakra popup akışında hata oluştu.');
        },
      });

      instanceRef.current = [scaledInstance];

      if (fitObserverRef.current) {
        fitObserverRef.current.disconnect();
        fitObserverRef.current = null;
      }

      let rafTries = 0;
      const fitWithRetry = () => {
        rafTries += 1;
        const done = enforceScaledLayout();
        if (!done && rafTries < 160) {
          requestAnimationFrame(fitWithRetry);
        }
      };
      fitWithRetry();

      const observer = new MutationObserver(() => {
        enforceScaledLayout();
      });
      observer.observe(innerEl, { childList: true, subtree: true, attributes: true });
      fitObserverRef.current = observer;

      setNeedsConnectInit(false);
    } catch (err: any) {
      setError(err?.message || 'Facebook bağlantısı başlatılamadı.');
      setStatusText('Facebook bağlantısı başlatılamadı.');
    } finally {
      setPreparingConnect(false);
    }
  }, [apiFetch, captureEvent]);

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
        const status = await apiFetch<ChakraStatusResponse>('/api/app/chakra/status');
        if (!mounted) {
          return;
        }

        setPluginId(status.pluginId || null);

        const isConnected = Boolean(status.connected) || Boolean(status.isActive);
        setConnected(isConnected);

        if (status.pluginId) {
          setStatusText(isConnected ? 'WhatsApp bağlantısı aktif.' : 'Facebook ile devam ederek bağlantıyı tamamlayın.');
          setNativeTriggerReady(false);
          setNeedsConnectInit(!isConnected);
        } else {
          setStatusText('WhatsApp hesabınızı bağlamak için Başla butonuna dokunun.');
          setNativeTriggerReady(false);
          setNeedsConnectInit(false);
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
      if (fitObserverRef.current) {
        fitObserverRef.current.disconnect();
        fitObserverRef.current = null;
      }
      for (const instance of instanceRef.current) {
        if (instance?.destroy) {
          instance.destroy();
        }
      }
      instanceRef.current = [];
    };
  }, [apiFetch]);

  useEffect(() => {
    if (!pluginId || connected || !needsConnectInit) {
      return;
    }

    let cancelled = false;
    (async () => {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      if (cancelled) {
        return;
      }
      await prepareConnect();
    })();

    return () => {
      cancelled = true;
    };
  }, [pluginId, connected, needsConnectInit, prepareConnect]);

  const handleStart = async () => {
    setCreatingPlugin(true);
    setError(null);
    setStatusText('Kurulum başlatılıyor...');
    try {
      const response = await apiFetch<CreatePluginResponse>('/api/app/chakra/create-plugin', {
        method: 'POST',
      });
      setPluginId(response.pluginId);
      setNeedsConnectInit(true);
      setNativeTriggerReady(false);
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
    navigate('/app/features/whatsapp-agent');
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
        ) : (
          <Card className="border-border/50">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Facebook ile güvenli bağlantı</p>
                <div className="relative w-full h-[58px] overflow-hidden rounded-md border border-border/60 bg-white">
                  <div id={CONTAINER_ID} aria-label="Chakra Facebook bağlantı butonu" className="absolute inset-0 h-[58px] pointer-events-auto">
                    <div
                      id={CONTAINER_INNER_ID}
                      className="absolute top-0 left-0 pointer-events-auto"
                      style={{
                        width: `${100 / CHAKRA_SCALE_X}%`,
                        height: `${100 / CHAKRA_SCALE_Y}%`,
                        transform: `scale(${CHAKRA_SCALE_X}, ${CHAKRA_SCALE_Y})`,
                        transformOrigin: 'top left',
                      }}
                    />
                  </div>
                  {!nativeTriggerReady ? (
                    <div className="pointer-events-none absolute inset-0 h-[58px] rounded-md bg-[var(--rose-gold)] text-white px-4 py-2 text-sm font-medium whitespace-nowrap flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Buton hazırlanıyor...
                    </div>
                  ) : (
                    <div
                      className="pointer-events-none absolute inset-0 h-[58px] rounded-md text-sm font-semibold flex items-center justify-center"
                      style={{ backgroundColor: 'var(--rose-gold)', color: 'white', opacity: 0.4 }}
                    >
                      Facebook ile güvenli bağlantı
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
