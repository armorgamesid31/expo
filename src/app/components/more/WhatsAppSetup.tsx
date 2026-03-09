import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessageCircle, CheckCircle2, Circle, Loader2, AlertCircle, PlugZap } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useAuth } from '../../context/AuthContext';

interface WhatsAppSetupProps {
  onBack: () => void;
}

interface ChakraSetupConnectResponse {
  salonId: number;
  pluginId: string;
  pluginCreated: boolean;
  connectToken: string;
  sdkUrl: string;
  containerId: string;
}

const CHAKRA_SCRIPT_ELEMENT_ID = 'chakra-whatsapp-sdk-script';
const CHAKRA_CONTAINER_ID = 'chakra-whatsapp-connect-container';

type ChakraInstance = {
  destroy?: () => void;
};

function loadChakraSdk(sdkUrl: string): Promise<void> {
  if ((window as any).ChakraWhatsappConnect) {
    return Promise.resolve();
  }

  const existingScript = document.getElementById(CHAKRA_SCRIPT_ELEMENT_ID) as HTMLScriptElement | null;
  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Chakra SDK yüklenemedi.')), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = CHAKRA_SCRIPT_ELEMENT_ID;
    script.src = sdkUrl;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Chakra SDK yüklenemedi.'));
    document.head.appendChild(script);
  });
}

export function WhatsAppSetup({ onBack }: WhatsAppSetupProps) {
  const { apiFetch } = useAuth();
  const chakraInstanceRef = useRef<ChakraInstance | null>(null);

  const [isStarting, setIsStarting] = useState(false);
  const [pluginId, setPluginId] = useState<string | null>(null);
  const [connectTokenReady, setConnectTokenReady] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const [connectionCompleted, setConnectionCompleted] = useState(false);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Henüz bağlantı başlatılmadı.');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (chakraInstanceRef.current?.destroy) {
        chakraInstanceRef.current.destroy();
      }
      chakraInstanceRef.current = null;
    };
  }, []);

  const handleStartConnection = async () => {
    setIsStarting(true);
    setError(null);
    setStatusMessage('Plugin ve bağlantı tokenı hazırlanıyor...');
    setConnectionCompleted(false);
    setIframeReady(false);
    setLastEvent(null);

    try {
      const response = await apiFetch<ChakraSetupConnectResponse>('/api/app/chakra/setup-connect', {
        method: 'POST',
      });

      setPluginId(response.pluginId);
      setConnectTokenReady(Boolean(response.connectToken));

      await loadChakraSdk(response.sdkUrl);

      if (chakraInstanceRef.current?.destroy) {
        chakraInstanceRef.current.destroy();
      }

      const chakraGlobal = (window as any).ChakraWhatsappConnect;
      if (!chakraGlobal?.init) {
        throw new Error('Chakra SDK hazır ama init fonksiyonu bulunamadı.');
      }

      chakraInstanceRef.current = chakraGlobal.init({
        connectToken: response.connectToken,
        container: `#${CHAKRA_CONTAINER_ID}`,
        onMessage: (event: any, data: any) => {
          const normalizedEvent = String(event || 'unknown');
          setLastEvent(normalizedEvent);
          setStatusMessage(`SDK event: ${normalizedEvent}`);

          if (/(connected|success|complete|linked)/i.test(normalizedEvent)) {
            setConnectionCompleted(true);
          }
          if (data?.status && /(connected|success|complete)/i.test(String(data.status))) {
            setConnectionCompleted(true);
          }
        },
        onReady: () => {
          setIframeReady(true);
          setStatusMessage('Bağlantı iframe’i hazır. WhatsApp hesabını bağlayabilirsiniz.');
        },
        onError: (sdkError: any) => {
          console.error('Chakra SDK error:', sdkError);
          setError(sdkError?.message || 'Chakra SDK bağlantısında hata oluştu.');
        },
      });
    } catch (err: any) {
      setError(err?.message || 'WhatsApp bağlantısı başlatılamadı.');
      setStatusMessage('Bağlantı başlatılamadı.');
    } finally {
      setIsStarting(false);
    }
  };

  const steps = [
    {
      title: 'Plugin oluştur ve salona kaydet',
      completed: Boolean(pluginId),
      detail: pluginId ? `Plugin ID: ${pluginId}` : 'Henüz oluşturulmadı.',
    },
    {
      title: 'Connect token üret',
      completed: connectTokenReady,
      detail: connectTokenReady ? 'Token üretildi.' : 'Henüz üretilmedi.',
    },
    {
      title: 'Chakra SDK ile WhatsApp bağla',
      completed: connectionCompleted,
      detail: connectionCompleted
        ? 'Bağlantı tamamlandı.'
        : iframeReady
        ? 'Iframe hazır, Meta/WhatsApp bağlantısını tamamlayın.'
        : 'Iframe henüz hazır değil.',
    },
  ];

  return (
    <div className="h-full pb-20 overflow-y-auto">
      <div className="p-4 border-b border-border bg-[var(--luxury-bg)] sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">WhatsApp Kurulumu</h1>
            <p className="text-sm text-muted-foreground">Plugin oluştur, token üret ve Chakra SDK ile bağla</p>
          </div>
          {connectionCompleted ? (
            <Badge className="bg-green-500/10 text-green-700 border-green-500/20">Bağlandı</Badge>
          ) : null}
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Card className="border-[#22C55E]/30 bg-gradient-to-br from-[#22C55E]/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#22C55E]/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-[#22C55E]" />
              </div>
              <div>
                <h3 className="font-semibold">Chakra WhatsApp Connect</h3>
                <p className="text-xs text-muted-foreground">{statusMessage}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PlugZap className="w-4 h-4" />
              Kurulum Adımları
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {steps.map((step, index) => (
              <div key={step.title} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  {step.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground" />
                  )}
                  <p className="text-sm font-medium">
                    {index + 1}. {step.title}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{step.detail}</p>
              </div>
            ))}

            <Button
              type="button"
              onClick={() => {
                void handleStartConnection();
              }}
              disabled={isStarting}
              className="w-full"
              style={{ backgroundColor: 'var(--rose-gold)', color: 'white' }}
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Bağlantı Başlatılıyor...
                </>
              ) : (
                'WhatsApp Bağlantısını Başlat'
              )}
            </Button>
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

        {lastEvent ? (
          <Card className="border-border/50 bg-muted/20">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Son SDK event: {lastEvent}</p>
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Chakra Connect</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              id={CHAKRA_CONTAINER_ID}
              className="min-h-[280px] rounded-lg border border-dashed border-border p-2 bg-background"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Iframe hazır olduktan sonra Meta/WhatsApp onay adımlarını bu alandan tamamlayın.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
