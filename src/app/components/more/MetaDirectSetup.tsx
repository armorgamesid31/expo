import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ExternalLink,
  Link2,
  ListChecks,
  MessageCircle,
  ShieldCheck,
  Unlink2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { useAuth } from '../../context/AuthContext';

interface MetaDirectSetupProps {
  onBack: () => void;
}

type ChannelKey = 'instagram' | 'whatsapp';
type ChannelStatus = 'not_connected' | 'preparing' | 'oauth_opened' | 'callback_received' | 'connected' | 'failed';

interface ChannelState {
  status: ChannelStatus;
  message: string;
  updatedAt: number;
}

interface MetaDirectState {
  instagram: ChannelState;
  whatsapp: ChannelState;
}

interface MetaDirectStatusResponse {
  instagram?: {
    status?: string;
    message?: string;
    connected?: boolean;
  };
  whatsapp?: {
    status?: string;
    message?: string;
    connected?: boolean;
  };
}

interface ConnectUrlResponse {
  channel?: 'INSTAGRAM' | 'WHATSAPP';
  connectMode?: 'OAUTH' | 'EMBEDDED_SIGNUP';
  authorizeUrl?: string;
  appId?: string;
  configId?: string | null;
  scopes?: string[];
}

interface EmbeddedSignupResult {
  code: string;
  phoneNumberId?: string | null;
  wabaId?: string | null;
  businessId?: string | null;
  displayPhoneNumber?: string | null;
}

declare global {
  interface Window {
    FB?: {
      init: (args: Record<string, unknown>) => void;
      login: (
        cb: (response: { authResponse?: { code?: string } }) => void,
        options?: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

const initialState: MetaDirectState = {
  instagram: {
    status: 'not_connected',
    message: 'Waiting for connection start.',
    updatedAt: Date.now(),
  },
  whatsapp: {
    status: 'not_connected',
    message: 'Waiting for connection start.',
    updatedAt: Date.now(),
  },
};

let fbSdkReady: Promise<void> | null = null;

function ensureFacebookSdk(appId: string) {
  if (!appId?.trim()) {
    return Promise.reject(new Error('Meta App ID is missing for Embedded Signup.'));
  }

  if (window.FB) {
    window.FB.init({
      appId,
      cookie: true,
      xfbml: false,
      version: 'v23.0',
    });
    return Promise.resolve();
  }

  if (fbSdkReady) {
    return fbSdkReady;
  }

  fbSdkReady = new Promise<void>((resolve, reject) => {
    window.fbAsyncInit = () => {
      if (!window.FB) {
        reject(new Error('Facebook SDK failed to initialize.'));
        return;
      }
      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version: 'v23.0',
      });
      resolve();
    };

    const scriptId = 'facebook-jssdk';
    if (document.getElementById(scriptId)) {
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.async = true;
    script.defer = true;
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.onerror = () => reject(new Error('Failed to load Facebook SDK.'));
    document.body.appendChild(script);
  });

  return fbSdkReady;
}

async function startWhatsAppEmbeddedSignup(args: {
  appId: string;
  configId: string;
}): Promise<EmbeddedSignupResult> {
  await ensureFacebookSdk(args.appId);

  return new Promise<EmbeddedSignupResult>((resolve, reject) => {
    if (!window.FB) {
      reject(new Error('Facebook SDK is not available.'));
      return;
    }

    let settled = false;
    let signupData: Omit<EmbeddedSignupResult, 'code'> = {};

    const done = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      fn();
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') {
        return;
      }

      let data: any = event.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }

      if (!data || data.type !== 'WA_EMBEDDED_SIGNUP') {
        return;
      }

      if (data.event === 'FINISH') {
        signupData = {
          phoneNumberId: typeof data?.data?.phone_number_id === 'string' ? data.data.phone_number_id : null,
          wabaId: typeof data?.data?.waba_id === 'string' ? data.data.waba_id : null,
          businessId: typeof data?.data?.business_id === 'string' ? data.data.business_id : null,
          displayPhoneNumber:
            typeof data?.data?.display_phone_number === 'string' ? data.data.display_phone_number : null,
        };
        return;
      }

      if (data.event === 'CANCEL') {
        done(() => reject(new Error('WhatsApp Embedded Signup canceled by user.')));
        return;
      }

      if (data.event === 'ERROR') {
        const message =
          typeof data?.data?.error_message === 'string' && data.data.error_message.trim()
            ? data.data.error_message.trim()
            : 'WhatsApp Embedded Signup failed.';
        done(() => reject(new Error(message)));
      }
    };

    window.addEventListener('message', onMessage);

    const timeout = window.setTimeout(() => {
      done(() => reject(new Error('WhatsApp Embedded Signup timed out.')));
    }, 3 * 60 * 1000);

    window.FB.login(
      (response) => {
        if (response?.authResponse?.code) {
          const code = response.authResponse.code;
          window.clearTimeout(timeout);
          done(() =>
            resolve({
              code,
              ...signupData,
            }),
          );
          return;
        }

        window.clearTimeout(timeout);
        done(() => reject(new Error('Meta did not return authorization code.')));
      },
      {
        config_id: args.configId,
        display: 'popup',
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          featureType: 'whatsapp_business_app_onboarding',
          feature: 'whatsapp_embedded_signup',
          sessionInfoVersion: '3',
        },
      },
    );
  });
}

const reviewChecklist = [
  {
    title: 'Business verification',
    detail: 'Confirm verified status in Meta Business Manager.',
  },
  {
    title: 'Privacy Policy URL',
    detail: 'Provide a public URL and keep it updated.',
  },
  {
    title: 'Data deletion instructions URL',
    detail: 'Provide a public URL for data deletion requests.',
  },
  {
    title: 'Reviewer test instructions',
    detail: 'Share clear step-by-step instructions in English.',
  },
  {
    title: 'Screencast link',
    detail: 'Show successful permission usage and message flows.',
  },
];

export function MetaDirectSetup({ onBack }: MetaDirectSetupProps) {
  const navigate = useNavigate();
  const { apiFetch } = useAuth();
  const [state, setState] = useState<MetaDirectState>(initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const mapStatus = (status?: string, connected?: boolean): ChannelStatus => {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'CONNECTED' || connected) return 'connected';
    if (normalized === 'FAILED') return 'failed';
    if (normalized === 'CONNECTING') return 'preparing';
    return 'not_connected';
  };

  const refreshStatus = async () => {
    setIsLoading(true);
    setGlobalError(null);
    try {
      const data = await apiFetch<MetaDirectStatusResponse>('/api/app/meta-direct/status');
      setState({
        instagram: {
          status: mapStatus(data?.instagram?.status, data?.instagram?.connected),
          message: data?.instagram?.message || 'Status received from backend.',
          updatedAt: Date.now(),
        },
        whatsapp: {
          status: mapStatus(data?.whatsapp?.status, data?.whatsapp?.connected),
          message: data?.whatsapp?.message || 'Status received from backend.',
          updatedAt: Date.now(),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Meta Direct status request failed.';
      setGlobalError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      const payload = event?.data;
      if (!payload || payload.type !== 'meta-direct-callback') {
        return;
      }

      const key: ChannelKey | null =
        payload.channel === 'INSTAGRAM' ? 'instagram' : payload.channel === 'WHATSAPP' ? 'whatsapp' : null;
      if (!key) {
        return;
      }

      const success = Boolean(payload.success);
      setState((prev) => ({
        ...prev,
        [key]: {
          status: success ? 'callback_received' : 'failed',
          message:
            typeof payload.message === 'string' && payload.message.trim()
              ? payload.message
              : success
                ? 'Callback received.'
                : 'Callback failed.',
          updatedAt: Date.now(),
        },
      }));

      await refreshStatus();
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectedCount = useMemo(
    () => Number(state.instagram.status === 'connected') + Number(state.whatsapp.status === 'connected'),
    [state.instagram.status, state.whatsapp.status],
  );

  const setChannel = (key: ChannelKey, next: ChannelState) => {
    setState((prev) => ({ ...prev, [key]: next }));
  };

  const startConnect = async (key: ChannelKey) => {
    setChannel(key, {
      status: 'preparing',
      message: 'Preparing OAuth URL and state token...',
      updatedAt: Date.now(),
    });

    setGlobalError(null);
    try {
      const data = await apiFetch<ConnectUrlResponse>('/api/app/meta-direct/connect-url', {
        method: 'POST',
        body: JSON.stringify({
          channel: key === 'instagram' ? 'INSTAGRAM' : 'WHATSAPP',
        }),
      });

      const isWhatsAppEmbedded =
        key === 'whatsapp' &&
        data?.connectMode === 'EMBEDDED_SIGNUP' &&
        typeof data?.appId === 'string' &&
        data.appId.trim() &&
        typeof data?.configId === 'string' &&
        data.configId.trim();

      if (isWhatsAppEmbedded) {
        setChannel(key, {
          status: 'oauth_opened',
          message: 'Opening WhatsApp Embedded Signup...',
          updatedAt: Date.now(),
        });

        const signup = await startWhatsAppEmbeddedSignup({
          appId: data.appId as string,
          configId: data.configId as string,
        });

        setChannel(key, {
          status: 'callback_received',
          message: 'Embedded Signup finished. Finalizing token exchange...',
          updatedAt: Date.now(),
        });

        await apiFetch('/api/app/meta-direct/exchange-code', {
          method: 'POST',
          body: JSON.stringify({
            channel: 'WHATSAPP',
            code: signup.code,
            phoneNumberId: signup.phoneNumberId || null,
            wabaId: signup.wabaId || null,
            businessId: signup.businessId || null,
            displayPhoneNumber: signup.displayPhoneNumber || null,
          }),
        });

        await refreshStatus();
        return;
      }

      const url = data?.authorizeUrl || '';
      if (!url) {
        throw new Error('OAuth URL is empty.');
      }

      window.open(url, '_blank', 'noopener,noreferrer,width=620,height=780');
      setChannel(key, {
        status: 'oauth_opened',
        message: 'OAuth window opened. Waiting for callback...',
        updatedAt: Date.now(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection start failed.';
      setChannel(key, {
        status: 'failed',
        message,
        updatedAt: Date.now(),
      });
      setGlobalError(message);
    }
  };

  const runProbe = async (key: ChannelKey) => {
    setChannel(key, {
      status: 'preparing',
      message: 'Running probe call to validate permission usage...',
      updatedAt: Date.now(),
    });

    setGlobalError(null);
    try {
      await apiFetch('/api/app/meta-direct/probe', {
        method: 'POST',
        body: JSON.stringify({
          channel: key === 'instagram' ? 'INSTAGRAM' : 'WHATSAPP',
        }),
      });

      await refreshStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Probe failed.';
      setChannel(key, {
        status: 'failed',
        message,
        updatedAt: Date.now(),
      });
      setGlobalError(message);
    }
  };

  const disconnect = async (key: ChannelKey) => {
    setGlobalError(null);
    try {
      await apiFetch('/api/app/meta-direct/disconnect', {
        method: 'POST',
        body: JSON.stringify({
          channel: key === 'instagram' ? 'INSTAGRAM' : 'WHATSAPP',
        }),
      });
      await refreshStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Disconnect failed.';
      setGlobalError(message);
    }
  };

  const renderConnectionCard = (
    key: ChannelKey,
    title: string,
    icon: React.ReactNode,
  ) => {
    const channel = state[key];
    const isConnected = channel.status === 'connected';
    const steps = [
      { key: 'preparing', label: 'Start connection' },
      { key: 'oauth_opened', label: 'Open OAuth' },
      { key: 'callback_received', label: 'Receive callback' },
      { key: 'connected', label: 'Finalize token' },
    ] as const;

    const activeIndex = steps.findIndex((item) => item.key === channel.status);

    return (
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {icon}
              <span className="text-sm font-medium">{title}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{isConnected ? 'Connected' : 'Not Connected'}</Badge>
              <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20">Review Prep</Badge>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{channel.message}</p>

          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-3">
            {steps.map((step, index) => {
              const done = activeIndex >= index || isConnected;
              return (
                <div key={step.key} className="flex items-center gap-2">
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span className={`text-xs ${done ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => startConnect(key)} disabled={isLoading}>
              Start Connection
            </Button>

            <Button type="button" size="sm" variant="outline" onClick={() => runProbe(key)} disabled={isLoading}>
              Run Probe
            </Button>

            <Button type="button" size="sm" variant="outline" onClick={() => disconnect(key)} disabled={isLoading}>
              <Unlink2 className="w-3.5 h-3.5 mr-1.5" />
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-full pb-20 overflow-y-auto">
      <div className="sticky top-0 bg-[var(--luxury-bg)] z-10 border-b border-border p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground mb-3 active:opacity-70"
          type="button"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">Meta Direct Connection (Beta)</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Prepare direct Meta onboarding and App Review deliverables.
            </p>
          </div>
          <Badge className="bg-[var(--deep-indigo)]/10 text-[var(--deep-indigo)] border-[var(--deep-indigo)]/20">
            Beta
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold">Connection Status</p>
            <p className="text-xs text-muted-foreground">
              Live mode is active. All buttons send real requests to `/api/app/meta-direct/*`.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-green-500/10 text-green-700 border-green-500/20">
                {connectedCount}/2 Connected
              </Badge>
              <Button type="button" size="sm" variant="outline" onClick={refreshStatus} disabled={isLoading}>
                Refresh Status
              </Button>
            </div>
            {globalError ? <p className="text-xs text-red-600">{globalError}</p> : null}
          </CardContent>
        </Card>

        {renderConnectionCard(
          'instagram',
          'Instagram DM API',
          <MessageCircle className="w-4 h-4 text-[var(--deep-indigo)]" />,
        )}

        {renderConnectionCard(
          'whatsapp',
          'WhatsApp Cloud API',
          <ShieldCheck className="w-4 h-4 text-green-600" />,
        )}

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ListChecks className="w-4 h-4 text-[var(--rose-gold)]" />
              <p className="text-sm font-semibold">App Review Checklist</p>
            </div>
            <div className="space-y-3">
              {reviewChecklist.map((item) => (
                <div key={item.title} className="rounded-lg border border-border/60 bg-muted/10 p-3">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.detail}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm font-semibold">Current Connector</p>
            <p className="text-xs text-muted-foreground mt-1">
              Chakra flow remains active in production; Meta Direct is in beta prep.
            </p>
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              <Link2 className="w-3.5 h-3.5" />
              This screen now uses live Meta Direct backend endpoints.
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold">Quick Links</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/app/features/whatsapp-setup', { state: { navDirection: 'forward' } })}
              >
                Open WhatsApp Setup
                <ExternalLink className="w-3.5 h-3.5 ml-2" />
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/app/features/whatsapp-settings', { state: { navDirection: 'forward' } })}
              >
                Open WhatsApp Settings
                <ExternalLink className="w-3.5 h-3.5 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
