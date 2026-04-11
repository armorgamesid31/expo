import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Circle,
  ListChecks,
  Loader2,
  MessageCircle,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useAuth } from '../../context/AuthContext';

interface MetaDirectSetupProps {
  onBack: () => void;
}

type ChannelStatus =
  | 'not_connected'
  | 'preparing'
  | 'oauth_opened'
  | 'callback_received'
  | 'connected'
  | 'degraded'
  | 'failed';

interface ChannelState {
  status: ChannelStatus;
  message: string;
  updatedAt: number;
}

interface MetaDirectState {
  instagram: ChannelState;
}

interface MetaDirectStatusResponse {
  instagram?: {
    status?: string;
    message?: string;
    connected?: boolean;
    activeBindingIds?: string[];
  };
}

interface ConnectUrlResponse {
  authorizeUrl?: string;
  intent?: 'CONNECT' | 'REPLACE_CONNECTION';
}

const initialState: MetaDirectState = {
  instagram: {
    status: 'not_connected',
    message: 'Waiting for connection start.',
    updatedAt: Date.now(),
  },
};

const productionChecklist = [
  {
    title: 'OAuth redirect URI',
    detail: 'Ensure the callback URL matches exactly in Meta and app env settings.',
  },
  {
    title: 'Required permissions',
    detail: 'Confirm Instagram business permissions are enabled in app configuration.',
  },
  {
    title: 'Webhook verification',
    detail: 'Verify webhook callback URL and verify token values are in sync.',
  },
  {
    title: 'Webhook event subscriptions',
    detail: 'Subscribe Instagram messaging events needed for inbox delivery.',
  },
  {
    title: 'Token health monitoring',
    detail: 'Run probe after connection and monitor status diagnostics regularly.',
  },
];

export function MetaDirectSetup({ onBack }: MetaDirectSetupProps) {
  const { apiFetch } = useAuth();
  const [state, setState] = useState<MetaDirectState>(initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const popupPollRef = useRef<number | null>(null);

  const clearPopupPoll = () => {
    if (popupPollRef.current !== null) {
      window.clearInterval(popupPollRef.current);
      popupPollRef.current = null;
    }
  };

  const mapStatus = (status?: string, connected?: boolean): ChannelStatus => {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'CONNECTED' || connected) return 'connected';
    if (normalized === 'DEGRADED') return 'degraded';
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
    return () => {
      clearPopupPoll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      const payload = event?.data;
      if (!payload || payload.type !== 'meta-direct-callback' || payload.channel !== 'INSTAGRAM') {
        return;
      }

      const success = Boolean(payload.success);
      setState((prev) => ({
        ...prev,
        instagram: {
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

  const setInstagram = (next: ChannelState) => {
    setState((prev) => ({ ...prev, instagram: next }));
  };

  const startConnect = async (intent: 'CONNECT' | 'REPLACE_CONNECTION' = 'CONNECT') => {
    setInstagram({
      status: 'preparing',
      message:
        intent === 'REPLACE_CONNECTION'
          ? 'Preparing account replacement flow...'
          : 'Preparing OAuth URL and state token...',
      updatedAt: Date.now(),
    });

    setGlobalError(null);
    try {
      const data = await apiFetch<ConnectUrlResponse>('/api/app/meta-direct/connect-url', {
        method: 'POST',
        body: JSON.stringify({ channel: 'INSTAGRAM', intent }),
      });

      const url = data?.authorizeUrl || '';
      if (!url) {
        throw new Error('OAuth URL is empty.');
      }

      const popup = window.open(url, 'meta-direct-instagram', 'width=620,height=780');
      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site and try again.');
      }
      clearPopupPoll();
      popupPollRef.current = window.setInterval(() => {
        if (popup.closed) {
          clearPopupPoll();
          void refreshStatus();
        }
      }, 1000);
      setInstagram({
        status: 'oauth_opened',
        message: 'OAuth window opened. Waiting for callback...',
        updatedAt: Date.now(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection start failed.';
      setInstagram({
        status: 'failed',
        message,
        updatedAt: Date.now(),
      });
      setGlobalError(message);
    }
  };

  const runProbe = async () => {
    setInstagram({
      status: 'preparing',
      message: 'Running probe call to validate permission usage...',
      updatedAt: Date.now(),
    });

    setGlobalError(null);
    try {
      await apiFetch('/api/app/meta-direct/probe', {
        method: 'POST',
        body: JSON.stringify({ channel: 'INSTAGRAM' }),
      });

      await refreshStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Probe failed.';
      setInstagram({
        status: 'failed',
        message,
        updatedAt: Date.now(),
      });
      setGlobalError(message);
    }
  };

  const disconnect = async () => {
    setGlobalError(null);
    try {
      await apiFetch('/api/app/meta-direct/disconnect', {
        method: 'POST',
        body: JSON.stringify({ channel: 'INSTAGRAM' }),
      });
      await refreshStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Disconnect failed.';
      setGlobalError(message);
    }
  };

  const channel = state.instagram;
  const isConnected = channel.status === 'connected';
  const steps = [
    { key: 'preparing', label: 'Start connection' },
    { key: 'oauth_opened', label: 'Open OAuth' },
    { key: 'callback_received', label: 'Receive callback' },
    { key: 'connected', label: 'Finalize token' },
  ] as const;
  const activeIndex = steps.findIndex((item) => item.key === channel.status);
  const statusBadgeClass = useMemo(() => {
    if (channel.status === 'connected') return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20';
    if (channel.status === 'degraded') return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
    if (channel.status === 'failed') return 'bg-red-500/10 text-red-700 border-red-500/20';
    if (channel.status === 'oauth_opened' || channel.status === 'preparing' || channel.status === 'callback_received') {
      return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
    }
    return 'bg-muted text-muted-foreground border-border';
  }, [channel.status]);
  const statusLabel = useMemo(() => {
    if (channel.status === 'connected') return 'Connected';
    if (channel.status === 'degraded') return 'Connected with warnings';
    if (channel.status === 'failed') return 'Connection failed';
    if (channel.status === 'oauth_opened') return 'OAuth in progress';
    if (channel.status === 'callback_received') return 'Callback received';
    if (channel.status === 'preparing') return 'Preparing';
    return 'Not connected';
  }, [channel.status]);
  const updatedAtText = useMemo(() => {
    if (!channel.updatedAt) return '-';
    return new Date(channel.updatedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  }, [channel.updatedAt]);

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
            <h1 className="text-xl font-semibold">Meta Direct Connection</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Instagram Login onboarding for Instagram DM.
            </p>
          </div>
          <Badge className="bg-green-500/10 text-green-700 border-green-500/20">
            Live
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <section className="rounded-2xl border border-border bg-background/90 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[var(--deep-indigo)]" />
                <p className="text-sm font-semibold">Instagram DM Connection</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{channel.message}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={statusBadgeClass}>{statusLabel}</Badge>
              <Badge variant="outline">Updated {updatedAtText}</Badge>
            </div>
          </div>
          {globalError ? (
            <div className="mt-3 rounded-xl border border-red-500/25 bg-red-500/5 p-3 text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5" />
              <span>{globalError}</span>
            </div>
          ) : null}
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr,1fr] gap-4">
          <section className="rounded-2xl border border-border bg-background/90 p-4 space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold">Connection Flow</p>
              <p className="text-xs text-muted-foreground">Step-by-step state for production onboarding.</p>
            </div>
            <div className="space-y-2">
              {steps.map((step, index) => {
                const done = activeIndex >= index || isConnected;
                const inProgress = !done && activeIndex === index - 1 && isLoading;
                return (
                  <div
                    key={step.key}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                      done ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-border bg-muted/20'
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : inProgress ? (
                      <Loader2 className="w-4 h-4 text-blue-600 shrink-0 animate-spin" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <span className={`text-xs ${done ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button type="button" onClick={startConnect} disabled={isLoading}>
                {isConnected ? 'Reconnect Instagram' : 'Start Connection'}
              </Button>
              {isConnected ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const ok = window.confirm(
                      'Instagram hesabini degistirmek istediginize emin misiniz? Yeni baglanti kurulunca eski kimlik pasif olur.',
                    );
                    if (!ok) return;
                    void startConnect('REPLACE_CONNECTION');
                  }}
                  disabled={isLoading}
                >
                  Hesabi Degistir
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={refreshStatus} disabled={isLoading}>
                  Refresh Status
                </Button>
              )}
              <Button type="button" variant="outline" onClick={runProbe} disabled={isLoading}>
                Run Probe
              </Button>
              <Button type="button" variant="outline" onClick={disconnect} disabled={isLoading}>
                Disconnect
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-background/90 p-4">
            <div className="flex items-center gap-2 mb-3">
              <ListChecks className="w-4 h-4 text-[var(--rose-gold)]" />
              <p className="text-sm font-semibold">Production Readiness</p>
            </div>
            <div className="space-y-2">
              {productionChecklist.map((item) => (
                <div key={item.title} className="rounded-lg border border-border/60 bg-muted/10 p-3">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-border/60 bg-muted/10 p-3">
              <p className="text-sm font-medium">Connector Scope</p>
              <p className="text-xs text-muted-foreground mt-1">
                This screen runs live `/api/app/meta-direct/*` endpoints and affects production inbox connectivity.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
