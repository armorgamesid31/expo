import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessageCircle, Loader2, AlertCircle } from 'lucide-react';
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
const SCRIPT_ID = 'chakra-whatsapp-connect-sdk-script';

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
  const instanceRef = useRef<ChakraInstance | null>(null);

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [creatingPlugin, setCreatingPlugin] = useState(false);
  const [preparingConnect, setPreparingConnect] = useState(false);
  const [pluginId, setPluginId] = useState<string | null>(null);
  const [nativeTriggerReady, setNativeTriggerReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [statusText, setStatusText] = useState('WhatsApp hesabınızı bağlamak için Başla butonuna dokunun.');
  const [error, setError] = useState<string | null>(null);
  const [strategyResult, setStrategyResult] = useState<string | null>(null);

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

  const getNativeTriggerElement = useCallback((): HTMLElement | null => {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) {
      return null;
    }
    const element = container.querySelector('button, a, [role="button"], iframe');
    return element instanceof HTMLElement ? element : null;
  }, []);

  const ensureNativeTriggerLayout = useCallback((): boolean => {
    const container = document.getElementById(CONTAINER_ID);
    const trigger = getNativeTriggerElement();

    if (!container || !trigger) {
      return false;
    }

    container.style.width = '100%';
    container.style.height = '100%';
    container.style.display = 'block';

    trigger.style.width = '100%';
    trigger.style.height = '100%';
    trigger.style.display = 'block';
    trigger.style.margin = '0';

    return true;
  }, [getNativeTriggerElement]);

  const markNativeTriggerReady = useCallback(() => {
    let attempts = 0;
    const maxAttempts = 60;

    const probe = () => {
      const ready = ensureNativeTriggerLayout();
      setNativeTriggerReady(ready);
      if (ready || attempts >= maxAttempts) {
        return;
      }
      attempts += 1;
      window.setTimeout(probe, 150);
    };

    probe();
  }, [ensureNativeTriggerLayout]);

  const prepareConnect = useCallback(async () => {
    setPreparingConnect(true);
    setError(null);
    setStatusText('Facebook bağlantısı hazırlanıyor...');

    try {
      const token = await apiFetch<ConnectTokenResponse>('/api/app/chakra/connect-token');
      await loadChakraSdk(token.sdkUrl);

      if (instanceRef.current?.destroy) {
        instanceRef.current.destroy();
      }

      const chakraGlobal = (window as any).ChakraWhatsappConnect;
      if (!chakraGlobal?.init) {
        throw new Error('Chakra SDK init fonksiyonu bulunamadı.');
      }

      setNativeTriggerReady(false);
      setConnected(false);

      instanceRef.current = chakraGlobal.init({
        connectToken: token.connectToken,
        container: `#${CONTAINER_ID}`,
        onMessage: (event: any, data: any) => {
          void captureEvent(event, data, token.pluginId);
          if (isConnectedEvent(event, data)) {
            setConnected(true);
            setStatusText('WhatsApp bağlantısı tamamlandı.');
          }
        },
        onReady: () => {
          setStatusText('Bağlantıyı tamamlamak için devam edin.');
          markNativeTriggerReady();
          window.setTimeout(() => {
            setNativeTriggerReady((prev) => prev || ensureNativeTriggerLayout());
          }, 800);
        },
        onError: (sdkError: any) => {
          console.error('Chakra SDK error:', sdkError);
          setError(sdkError?.message || 'Chakra popup akışında hata oluştu.');
        },
      });
    } catch (err: any) {
      setError(err?.message || 'Facebook bağlantısı başlatılamadı.');
      setStatusText('Facebook bağlantısı başlatılamadı.');
    } finally {
      setPreparingConnect(false);
    }
  }, [apiFetch, captureEvent, markNativeTriggerReady, ensureNativeTriggerLayout]);

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

        if (status.pluginId) {
          setStatusText('Facebook ile devam ederek bağlantıyı tamamlayın.');
          setNativeTriggerReady(false);
          await prepareConnect();
        } else {
          setStatusText('WhatsApp hesabınızı bağlamak için Başla butonuna dokunun.');
          setNativeTriggerReady(false);
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
      if (instanceRef.current?.destroy) {
        instanceRef.current.destroy();
      }
      instanceRef.current = null;
    };
  }, [apiFetch, prepareConnect]);

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

  const handleMaskedContinue = () => {
    setError(null);
    setStrategyResult(null);

    const tryTrigger = (attempt = 0) => {
      const trigger = getNativeTriggerElement();
      if (trigger) {
        trigger.click();
        setStrategyResult('Varsayılan tetikleme çalıştı (native click).');
        return;
      }

      if (attempt >= 12) {
        setError('Facebook butonu henüz hazır değil. Lütfen tekrar deneyin.');
        return;
      }

      window.setTimeout(() => tryTrigger(attempt + 1), 150);
    };

    tryTrigger();
  };

  const runStrategy = async (strategyNo: number) => {
    setError(null);
    setStrategyResult(null);

    const trigger = getNativeTriggerElement();
    if (!trigger && strategyNo !== 5) {
      setError('Native buton bulunamadı.');
      return;
    }

    try {
      if (strategyNo === 1) {
        trigger!.click();
        setStrategyResult('1) Doğrudan native .click() tetiklendi.');
        return;
      }

      if (strategyNo === 2) {
        const event = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
        trigger!.dispatchEvent(event);
        setStrategyResult('2) MouseEvent dispatch ile tetiklendi.');
        return;
      }

      if (strategyNo === 3) {
        trigger!.focus();
        const keyEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
        trigger!.dispatchEvent(keyEvent);
        setStrategyResult('3) Focus + Enter key ile tetiklendi.');
        return;
      }

      if (strategyNo === 4) {
        const container = document.getElementById(CONTAINER_ID);
        const firstChild = container?.firstElementChild as HTMLElement | null;
        if (firstChild) {
          firstChild.click();
          setStrategyResult('4) Container firstChild click ile tetiklendi.');
        } else {
          setError('4) Container firstChild bulunamadı.');
        }
        return;
      }

      if (strategyNo === 5) {
        await prepareConnect();
        window.setTimeout(() => {
          const retriedTrigger = getNativeTriggerElement();
          if (!retriedTrigger) {
            setError('5) Yeniden yükleme sonrası native buton bulunamadı.');
            return;
          }
          retriedTrigger.click();
          setStrategyResult('5) Re-init sonrası native click tetiklendi.');
        }, 350);
      }
    } catch (err: any) {
      setError(err?.message || `${strategyNo}) Strateji çalıştırılamadı.`);
    }
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
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="relative h-12 w-full rounded-md overflow-hidden">
                <div
                  id={CONTAINER_ID}
                  aria-hidden="true"
                  className="absolute inset-0 opacity-0 pointer-events-none"
                />
                {!nativeTriggerReady ? (
                  <div className="absolute inset-0 rounded-md bg-[var(--rose-gold)]/55 text-white px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Hazırlanıyor...
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleMaskedContinue}
                    className="absolute inset-0 rounded-md bg-[var(--rose-gold)] text-white text-sm font-medium flex items-center justify-center"
                  >
                    Facebook ile Devam Et
                  </button>
                )}
              </div>

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

              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground">Deneme Stratejileri</p>
                <Button type="button" variant="outline" className="w-full justify-start" onClick={() => void runStrategy(1)}>
                  1. Native .click()
                </Button>
                <Button type="button" variant="outline" className="w-full justify-start" onClick={() => void runStrategy(2)}>
                  2. MouseEvent dispatch
                </Button>
                <Button type="button" variant="outline" className="w-full justify-start" onClick={() => void runStrategy(3)}>
                  3. Focus + Enter
                </Button>
                <Button type="button" variant="outline" className="w-full justify-start" onClick={() => void runStrategy(4)}>
                  4. Container firstChild click
                </Button>
                <Button type="button" variant="outline" className="w-full justify-start" onClick={() => void runStrategy(5)}>
                  5. Re-init + click
                </Button>
                {strategyResult ? (
                  <p className="text-xs text-green-700">{strategyResult}</p>
                ) : null}
              </div>
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
