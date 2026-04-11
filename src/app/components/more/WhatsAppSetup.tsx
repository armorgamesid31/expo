import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessageCircle, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
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
      return 'Tap the Get Started button to connect your WhatsApp account.';
    }
    const cachedConnected = Boolean(cachedStatus.connected) || Boolean(cachedStatus.isActive);
    if (!cachedStatus.pluginId) {
      return 'Tap the Get Started button to connect your WhatsApp account.';
    }
    return cachedConnected ? 'WhatsApp connection completed.' : 'Complete the connection by continuing with Facebook.';
  });
  const [error, setError] = useState<string | null>(null);

  const syncStatusFromBackend = useCallback(async () => {
    const status = await apiFetch<ChakraStatusResponse>(`/api/app/chakra/status?t=${Date.now()}`);
    writeSnapshot(CHAKRA_STATUS_CACHE_KEY, status);

    setPluginId(status.pluginId || null);

    const isConnected = Boolean(status.connected) || Boolean(status.isActive);
    setConnected((prev) => (prev ? true : isConnected));

    if (!status.pluginId) {
      setStatusText('Tap the Get Started button to connect your WhatsApp account.');
      setNativeTriggerReady(false);
      return { hasPlugin: false, connected: false };
    }

    if (isConnected) {
      setStatusText('WhatsApp connection completed.');
      setNativeTriggerReady(false);
      return { hasPlugin: true, connected: true };
    }

    setStatusText('Complete the connection by continuing with Facebook.');
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
          intent: replaceConnection ? 'REPLACE_CONNECTION' : 'CONNECT',
        }),
      });

      if (response.connected || Boolean(response.isActive)) {
        setConnected(true);
        setAutoNavigatePending(true);
        setIsPopupConnecting(false);
        setStatusText('WhatsApp connection completed.');
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
  }, [apiFetch, replaceConnection, syncStatusFromBackend]);

  const prepareConnect = useCallback(async () => {
    setPreparingConnect(true);
    setError(null);
    setStatusText('Facebook connection is being prepared...');

    try {
      const token = await apiFetch<ConnectTokenResponse>(
        `/api/app/chakra/connect-token?intent=${replaceConnection ? 'REPLACE_CONNECTION' : 'CONNECT'}`,
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
          pointerEvents: 'auto',
        },
        onMessage: (event: any, data: any) => {
          void captureEvent(event, data, token.pluginId);
          if (isConnectedEvent(event, data)) {
            setConnected(true);
            setAutoNavigatePending(true);
            setIsPopupConnecting(false);
            setStatusText('WhatsApp connection completed.');
            void syncStatusFromBackend();
          }
        },
        onReady: () => {
          setNativeTriggerReady(true);
          setIsPopupConnecting(false);
          setStatusText('The connection button is ready.');
        },
        onError: (sdkError: any) => {
          console.error('Chakra SDK error:', sdkError);
          setError(sdkError?.message || 'An error occurred in the Chakra popup flow.');
        },
      });

      instanceRef.current = [scaledInstance];
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize Facebook connection.');
      setStatusText('Failed to initialize Facebook connection.');
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
          setError(err?.message || 'Failed to retrieve WhatsApp installation status.');
          setStatusText('Status could not be retrieved. Refresh the page.');
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
        setStatusText('Connection process continues...');
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
      setStatusText('WhatsApp connection completed.');
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
    setStatusText('The connection is completed, you are directed to WhatsApp settings...');

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
    setStatusText('Starting the installation...');
    try {
      const response = await apiFetch<CreatePluginResponse>('/api/app/chakra/create-plugin', {
        method: 'POST',
      });
      setPluginId(response.pluginId);
      setNativeTriggerReady(false);
      await prepareConnect();
    } catch (err: any) {
      setError(err?.message || 'Installation failed to start.');
      setStatusText('Installation failed to start.');
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

  return (
    <div className="h-full pb-20 overflow-y-auto">
      <div className="p-4 border-b border-border bg-[var(--luxury-bg)] sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">{replaceConnection ? 'WhatsApp Number Change' : 'WhatsApp Setup'}</h1>
            <p className="text-sm text-muted-foreground">
              {replaceConnection ? 'Replace active WhatsApp number securely' : 'Connect your WhatsApp account with quick setup'}
            </p>
          </div>
          {connected ? <Badge className="bg-green-500/10 text-green-700 border-green-500/20">Connected</Badge> : null}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loadingStatus ? (
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading setup status...
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
                <h3 className="font-semibold">WhatsApp Connection</h3>
                <p className="text-xs text-muted-foreground">{statusText}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {!pluginId ? (
          <Card className="border-border/50">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                This step is required only during initial setup.
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
                    Starting...
                  </>
                ) : (
                  'start'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleDevBypass}
                className="w-full"
              >
                {devBypassed ? 'Test Mode: Open AI Agent Screen' : 'Test Mode: Continue as Connected'}
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
                <p className="text-sm font-medium">WhatsApp connection completed successfully.</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Connection is active for this salon. The button will not be shown when you revisit this page.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={handleDevBypass}
                className="w-full"
              >
                {devBypassed ? 'Test Mode: Open AI Agent Screen' : 'Test Mode: Continue as Connected'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Enlarged Chakra + Mask</p>
                <div className="relative w-full h-[58px] overflow-hidden rounded-md border border-border/60 bg-white">
                  <div
                    id={CONTAINER_ID}
                    aria-label="Enlarged Chakra button"
                    className="absolute inset-0 h-[58px]"
                  />
                  {nativeTriggerReady ? (
                    isPopupConnecting ? (
                      <div className="pointer-events-none absolute inset-0 h-[58px] rounded-md bg-[var(--rose-gold)] text-white px-4 py-2 text-sm font-medium whitespace-nowrap flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Connecting...
                      </div>
                    ) : (
                      <div
                        className="pointer-events-none absolute inset-0 h-[58px] rounded-md text-base font-semibold flex items-center justify-center"
                        style={{ backgroundColor: 'var(--rose-gold)', color: 'white' }}
                      >
                        Secure Connection with Facebook
                      </div>
                    )
                  ) : (
                    <div className="pointer-events-none absolute inset-0 h-[58px] rounded-md bg-[var(--rose-gold)] text-white px-4 py-2 text-sm font-medium whitespace-nowrap flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Preparing button...
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
                {devBypassed ? 'Test Mode: Open AI Agent Screen' : 'Test Mode: Continue as Connected'}
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
            <CardTitle className="text-sm">Help</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible>
              <AccordionItem value="faq-1">
                <AccordionTrigger>What does the Start button do?</AccordionTrigger>
                <AccordionContent>
                  Creates a plugin once for your salon and prepares the connection button.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-2">
                <AccordionTrigger>Do I need to press Start every time?</AccordionTrigger>
                <AccordionContent>
                  No. After initial setup, the connection button appears automatically.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-3">
                <AccordionTrigger>What if the popup is closed?</AccordionTrigger>
                <AccordionContent>
                  If setup is incomplete, click reconnect to reopen the popup.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-4">
                <AccordionTrigger>How do I know connection is complete?</AccordionTrigger>
                <AccordionContent>
                  You will see “WhatsApp connection completed” in the status section above.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
