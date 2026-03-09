import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessageCircle, CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useAuth } from '../../context/AuthContext';

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
  const [sdkUrl, setSdkUrl] = useState('https://embed.chakrahq.com/whatsapp-partner-connect/v1_0_1/sdk.js');
  const [iframeReady, setIframeReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('Başlat ile plugin oluşturun.');
  const [error, setError] = useState<string | null>(null);

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
        setSdkUrl(status.sdkUrl || sdkUrl);
        setStatusText(status.pluginId ? 'Plugin mevcut. Facebook bağlama adımına geçebilirsiniz.' : 'Başlat ile plugin oluşturun.');
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || 'WhatsApp kurulum durumu alınamadı.');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiFetch]);

  const handleCreatePlugin = async () => {
    setCreatingPlugin(true);
    setError(null);
    setStatusText('Plugin oluşturuluyor...');
    try {
      const response = await apiFetch<CreatePluginResponse>('/api/app/chakra/create-plugin', {
        method: 'POST',
      });
      setPluginId(response.pluginId);
      setStatusText(response.pluginCreated ? 'Plugin oluşturuldu. Şimdi Facebook\'a bağlanın.' : 'Plugin zaten mevcut. Facebook\'a bağlanın.');
    } catch (err: any) {
      setError(err?.message || 'Plugin oluşturulamadı.');
      setStatusText('Plugin oluşturma başarısız.');
    } finally {
      setCreatingPlugin(false);
    }
  };

  const captureEvent = async (event: unknown, data: unknown, pluginIdValue: string) => {
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
  };

  const handleConnectFacebook = async () => {
    if (!pluginId) {
      setError('Önce plugin oluşturmanız gerekiyor.');
      return;
    }

    setPreparingConnect(true);
    setError(null);
    setStatusText('Connect token hazırlanıyor...');

    try {
      const token = await apiFetch<ConnectTokenResponse>('/api/app/chakra/connect-token');
      setSdkUrl(token.sdkUrl || sdkUrl);
      await loadChakraSdk(token.sdkUrl || sdkUrl);

      if (instanceRef.current?.destroy) {
        instanceRef.current.destroy();
      }

      const chakraGlobal = (window as any).ChakraWhatsappConnect;
      if (!chakraGlobal?.init) {
        throw new Error('Chakra SDK init fonksiyonu bulunamadı.');
      }

      setIframeReady(false);
      setConnected(false);
      setLastEvent(null);

      instanceRef.current = chakraGlobal.init({
        connectToken: token.connectToken,
        container: `#${CONTAINER_ID}`,
        onMessage: (event: any, data: any) => {
          const eventText = typeof event === 'string' ? event : JSON.stringify(event);
          setLastEvent(eventText);
          setStatusText(`SDK event: ${eventText}`);
          void captureEvent(event, data, token.pluginId);
          if (isConnectedEvent(event, data)) {
            setConnected(true);
            setStatusText('WhatsApp bağlantısı tamamlandı.');
          }
        },
        onReady: () => {
          setIframeReady(true);
          setStatusText('Facebook\'a bağlan butonu hazır.');
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
            <p className="text-sm text-muted-foreground">Başlat ile plugin oluştur, sonra Facebook popup ile bağla</p>
          </div>
          {connected ? <Badge className="bg-green-500/10 text-green-700 border-green-500/20">Bağlandı</Badge> : null}
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Card className="border-[#22C55E]/30 bg-gradient-to-br from-[#22C55E]/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#22C55E]/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-[#22C55E]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Chakra Connect Durumu</h3>
                <p className="text-xs text-muted-foreground">{statusText}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Adımlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                {pluginId ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Circle className="w-4 h-4 text-muted-foreground" />}
                <p className="text-sm font-medium">1. Plugin oluştur (slug adıyla)</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{pluginId ? `Plugin ID: ${pluginId}` : 'Henüz plugin yok.'}</p>
            </div>

            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                {iframeReady ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Circle className="w-4 h-4 text-muted-foreground" />}
                <p className="text-sm font-medium">2. Facebook&apos;a bağlan popup&apos;ını aç</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {iframeReady ? 'Popup tetikleyici hazır.' : 'Plugin sonrası bu adımı başlatın.'}
              </p>
            </div>

            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                {connected ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Circle className="w-4 h-4 text-muted-foreground" />}
                <p className="text-sm font-medium">3. Popup response&apos;unu yakala</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {lastEvent ? `Son event: ${lastEvent}` : 'Henüz event gelmedi.'}
              </p>
            </div>

            {!pluginId ? (
              <Button
                type="button"
                onClick={() => {
                  void handleCreatePlugin();
                }}
                disabled={creatingPlugin || loadingStatus}
                className="w-full"
                style={{ backgroundColor: 'var(--rose-gold)', color: 'white' }}
              >
                {creatingPlugin ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Plugin Oluşturuluyor...
                  </>
                ) : (
                  'Başlat (Plugin Oluştur)'
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => {
                  void handleConnectFacebook();
                }}
                disabled={preparingConnect}
                className="w-full"
                style={{ backgroundColor: 'var(--rose-gold)', color: 'white' }}
              >
                {preparingConnect ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Facebook Bağlantısı Hazırlanıyor...
                  </>
                ) : (
                  "Facebook'a Bağlan"
                )}
              </Button>
            )}
          </CardContent>
        </Card>

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
            <CardTitle className="text-sm">Chakra Popup Container</CardTitle>
          </CardHeader>
          <CardContent>
            <div id={CONTAINER_ID} className="min-h-[280px] rounded-lg border border-dashed border-border p-2 bg-background" />
            <p className="text-xs text-muted-foreground mt-2">
              Facebook&apos;a Bağlan tıklandıktan sonra Chakra butonu burada görünür; buton popup açar.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
