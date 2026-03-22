import { ArrowLeft, ExternalLink, ListChecks, MessageCircle, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface MetaDirectSetupProps {
  onBack: () => void;
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
              UI-only preparation mode. OAuth and callback endpoints will be wired in the next step.
            </p>
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
                <Badge variant="outline">Not Connected</Badge>
                <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20">Review Prep</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">WhatsApp Cloud API</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Not Connected</Badge>
                <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20">Review Prep</Badge>
              </div>
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
              Chakra flow remains active in production; Meta Direct is in beta prep.
            </p>
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
