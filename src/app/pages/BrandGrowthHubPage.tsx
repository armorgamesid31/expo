import { useNavigate } from 'react-router-dom';
import { Building2, Globe, Megaphone, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function BrandGrowthHubPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const canSalonInfo = hasPermission('website.manage');
  const canWebsite = hasPermission('website.manage');
  const canCampaigns = hasPermission('campaigns.manage') || hasPermission('campaigns.publish');

  if (!canSalonInfo && !canWebsite && !canCampaigns) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-semibold">Brand & Growth Hub</h1>
        <p className="text-sm text-muted-foreground mt-2">
          You do not have permission to open brand and growth tools.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Brand & Growth Hub</h1>
      <p className="text-sm text-muted-foreground">
        Control salon profile, website experience, and campaign operations from one hub.
      </p>

      <div className="space-y-3">
        {canSalonInfo ? (
          <button
            type="button"
            onClick={() => navigate('/app/salon-info', { state: { navDirection: 'forward' } })}
            className="w-full rounded-xl border border-border bg-card p-4 text-left"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--rose-gold)]/15 grid place-items-center">
                  <Building2 className="h-5 w-5 text-[var(--rose-gold)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Salon Information</p>
                  <p className="text-xs text-muted-foreground">Business identity, contact details, and working setup</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        ) : null}

        {canWebsite ? (
          <button
            type="button"
            onClick={() => navigate('/app/features/website-builder', { state: { navDirection: 'forward' } })}
            className="w-full rounded-xl border border-border bg-card p-4 text-left"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--deep-indigo)]/15 grid place-items-center">
                  <Globe className="h-5 w-5 text-[var(--deep-indigo)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Website Settings</p>
                  <p className="text-xs text-muted-foreground">Online booking website content and presentation</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        ) : null}

        {canCampaigns ? (
          <button
            type="button"
            onClick={() => navigate('/app/campaigns', { state: { navDirection: 'forward' } })}
            className="w-full rounded-xl border border-border bg-card p-4 text-left"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--rose-gold)]/15 grid place-items-center">
                  <Megaphone className="h-5 w-5 text-[var(--rose-gold)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Campaigns</p>
                  <p className="text-xs text-muted-foreground">Promotions, targeting, and campaign performance</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        ) : null}
      </div>
    </div>
  );
}
