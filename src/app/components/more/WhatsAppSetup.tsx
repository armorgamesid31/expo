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
  const [connectReady, setConnectReady] = useState(false);
  const [connected, setConnected] = useState(false);
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
      const token = await apiFetch<ConnectTokenResponse>('/api/app/chakra/connect-token');
      await loadChakraSdk(token.sdkUrl);

      if (instanceRef.current?.destroy) {
        instanceRef.current.destroy();
      }

      const chakraGlobal = (window as any).ChakraWhatsappConnect;
      if (!chakraGlobal?.init) {
        throw new Error('Chakra SDK init fonksiyonu bulunamadı.');
      }

      setConnectReady(false);
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
          setConnectReady(true);
          setStatusText("Facebook'a bağlan butonu hazır.");
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
  }, [apiFetch, captureEvent]);

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
          await prepareConnect();
        } else {
          setStatusText('WhatsApp hesabınızı bağlamak için Başla butonuna dokunun.');
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
      await prepareConnect();
    } catch (err: any) {
      setError(err?.message || 'Kurulum başlatılamadı.');
      setStatusText('Kurulum başlatılamadı.');
    } finally {
      setCreatingPlugin(false);
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
          <div className="rounded-xl border border-border bg-card p-3">
            <div id={CONTAINER_ID} className="min-h-[64px] flex items-center" />
            {!connectReady && preparingConnect ? (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Bağlantı butonu hazırlanıyor...
              </div>
            ) : null}
            {error ? (
              <Button
                type="button"
                variant="outline"
                className="w-full mt-3"
                onClick={() => {
                  void prepareConnect();
                }}
                disabled={preparingConnect}
              >
                Tekrar Dene
              </Button>
            ) : null}
          </div>
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
