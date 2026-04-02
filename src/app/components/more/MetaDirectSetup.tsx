import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Link2,
  ListChecks,
  MessageCircle,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
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
  };
}

interface ConnectUrlResponse {
  authorizeUrl?: string;
}

const initialState: MetaDirectState = {
  instagram: {
    status: 'not_connected',
    message: 'Waiting for connection start.',
    updatedAt: Date.now(),
  },
};

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

  const connectedCount = useMemo(
    () => Number(state.instagram.status === 'connected'),
    [state.instagram.status],
  );

  const setInstagram = (next: ChannelState) => {
    setState((prev) => ({ ...prev, instagram: next }));
  };

  const startConnect = async () => {
    setInstagram({
      status: 'preparing',
      message: 'Preparing OAuth URL and state token...',
      updatedAt: Date.now(),
    });

    setGlobalError(null);
    try {
      const data = await apiFetch<ConnectUrlResponse>('/api/app/meta-direct/connect-url', {
        method: 'POST',
        body: JSON.stringify({ channel: 'INSTAGRAM' }),
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
              Instagram Login onboarding for Instagram DM and App Review preparation.
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
                {connectedCount}/1 Connected
              </Badge>
              <Button type="button" size="sm" variant="outline" onClick={refreshStatus} disabled={isLoading}>
                Refresh Status
              </Button>
            </div>
            {globalError ? <p className="text-xs text-red-600">{globalError}</p> : null}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[var(--deep-indigo)]" />
                <span className="text-sm font-medium">Instagram DM API</span>
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
              <Button type="button" size="sm" onClick={startConnect} disabled={isLoading}>
                Start Instagram Login Connection
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={runProbe} disabled={isLoading}>
                Run Probe
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={disconnect} disabled={isLoading}>
                Disconnect
              </Button>
            </div>
          </CardContent>
        </Card>

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
              Meta Direct is configured for Instagram DM in this app.
            </p>
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              <Link2 className="w-3.5 h-3.5" />
              This screen uses live Meta Direct backend endpoints.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
