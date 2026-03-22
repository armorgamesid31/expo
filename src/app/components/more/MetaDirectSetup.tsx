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

interface MetaDirectSetupProps {
  onBack: () => void;
}

type ChannelKey = 'instagram' | 'whatsapp';
type ChannelStatus =
  | 'not_connected'
  | 'preparing'
  | 'oauth_opened'
  | 'callback_received'
  | 'connected';

interface ChannelState {
  status: ChannelStatus;
  message: string;
  updatedAt: number;
}

interface SimState {
  instagram: ChannelState;
  whatsapp: ChannelState;
}

const STORAGE_KEY = 'kedy.meta.direct.sim.state.v1';

const initialState: SimState = {
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
  const [state, setState] = useState<SimState>(initialState);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<SimState>;
      if (parsed.instagram && parsed.whatsapp) {
        setState({
          instagram: parsed.instagram,
          whatsapp: parsed.whatsapp,
        });
      }
    } catch (error) {
      console.warn('Meta Direct sim state load failed:', error);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const connectedCount = useMemo(() => {
    return Number(state.instagram.status === 'connected') + Number(state.whatsapp.status === 'connected');
  }, [state.instagram.status, state.whatsapp.status]);

  const setChannel = (key: ChannelKey, next: ChannelState) => {
    setState((prev) => ({ ...prev, [key]: next }));
  };

  const startConnect = (key: ChannelKey) => {
    setChannel(key, {
      status: 'preparing',
      message: 'Preparing OAuth URL and state token...',
      updatedAt: Date.now(),
    });
  };

  const openOAuth = (key: ChannelKey) => {
    setChannel(key, {
      status: 'oauth_opened',
      message: 'OAuth window opened. Waiting for callback...',
      updatedAt: Date.now(),
    });
  };

  const simulateCallback = (key: ChannelKey) => {
    setChannel(key, {
      status: 'callback_received',
      message: 'Callback received with valid code.',
      updatedAt: Date.now(),
    });
  };

  const finalizeConnect = (key: ChannelKey) => {
    setChannel(key, {
      status: 'connected',
      message: 'Connection finalized. Token stored.',
      updatedAt: Date.now(),
    });
  };

  const disconnect = (key: ChannelKey) => {
    setChannel(key, {
      status: 'not_connected',
      message: 'Disconnected by user.',
      updatedAt: Date.now(),
    });
  };

  const resetAll = () => {
    setState(initialState);
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
            {channel.status === 'not_connected' ? (
              <Button type="button" size="sm" onClick={() => startConnect(key)}>
                Start Connection
              </Button>
            ) : null}

            {channel.status === 'preparing' ? (
              <Button type="button" size="sm" onClick={() => openOAuth(key)}>
                Simulate OAuth Opened
              </Button>
            ) : null}

            {channel.status === 'oauth_opened' ? (
              <Button type="button" size="sm" onClick={() => simulateCallback(key)}>
                Simulate Callback Success
              </Button>
            ) : null}

            {channel.status === 'callback_received' ? (
              <Button type="button" size="sm" onClick={() => finalizeConnect(key)}>
                Finalize Connection
              </Button>
            ) : null}

            {channel.status !== 'not_connected' ? (
              <Button type="button" size="sm" variant="outline" onClick={() => disconnect(key)}>
                <Unlink2 className="w-3.5 h-3.5 mr-1.5" />
                Disconnect
              </Button>
            ) : null}
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
              Simulation mode is active. You can run the full connection flow below without backend OAuth.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-green-500/10 text-green-700 border-green-500/20">
                {connectedCount}/2 Connected
              </Badge>
              <Button type="button" size="sm" variant="outline" onClick={resetAll}>
                Reset Simulation
              </Button>
            </div>
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
              This screen is for App Review prep and simulated onboarding only.
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
