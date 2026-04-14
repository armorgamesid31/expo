import { useNavigate } from 'react-router-dom';
import { Building2, Globe, Megaphone, ChevronRight, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigator } from '../context/NavigatorContext';
import { useEffect } from 'react';

export function BrandGrowthHubPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { setHeaderTitle } = useNavigator();

  const canSalonInfo = hasPermission('website.manage');
  const canWebsite = hasPermission('website.manage');
  const canCampaigns = hasPermission('campaigns.manage') || hasPermission('campaigns.publish');

  useEffect(() => {
    setHeaderTitle('Marka & Büyüme');
    return () => setHeaderTitle(null);
  }, [setHeaderTitle]);

  if (!canSalonInfo && !canWebsite && !canCampaigns) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-semibold">Marka & Büyüme Merkezi</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Marka ve büyüme araçlarını açmak için yetkiniz bulunmamaktadır.
        </p>
      </div>);

  }

  return (
    <div className="p-4 space-y-3 bg-background h-full overflow-y-auto">
      <div className="space-y-3">
        {/* Müşteri İletişimi */}
        <button
          type="button"
          onClick={() => navigate('/app/features/social-channels', { state: { navDirection: 'forward' } })}
          className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm active:scale-[0.98] transition-all"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-[var(--deep-indigo)]/10 flex items-center justify-center shrink-0">
                <MessageCircle className="h-5 w-5 text-[var(--deep-indigo)]" />
              </div>
              <div>
                <p className="text-sm font-bold leading-none mb-1.5">Müşteri İletişimi</p>
                <p className="text-xs text-muted-foreground leading-tight line-clamp-2">Meta Direct ve WhatsApp bağlantı yönetimi</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        </button>

        {/* Salon Bilgileri */}
        {canSalonInfo && (
          <button
            type="button"
            onClick={() => navigate('/app/salon-info', { state: { navDirection: 'forward' } })}
            className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm active:scale-[0.98] transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-[var(--rose-gold)]/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-[var(--rose-gold)]" />
                </div>
                <div>
                  <p className="text-sm font-bold leading-none mb-1.5">Salon Bilgileri</p>
                  <p className="text-xs text-muted-foreground leading-tight line-clamp-2">İşletme kimliği, iletişim bilgileri ve çalışma düzeni</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </button>
        )}

        {/* Web Sitesi Ayarları */}
        {canWebsite && (
          <button
            type="button"
            onClick={() => navigate('/app/features/website-builder', { state: { navDirection: 'forward' } })}
            className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm active:scale-[0.98] transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-[var(--deep-indigo)]/10 flex items-center justify-center shrink-0">
                  <Globe className="h-5 w-5 text-[var(--deep-indigo)]" />
                </div>
                <div>
                  <p className="text-sm font-bold leading-none mb-1.5">Web Sitesi Ayarları</p>
                  <p className="text-xs text-muted-foreground leading-tight line-clamp-2">Online randevu web sitesi içeriği ve sunumu</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </button>
        )}

        {/* Kampanyalar */}
        {canCampaigns && (
          <button
            type="button"
            onClick={() => navigate('/app/campaigns', { state: { navDirection: 'forward' } })}
            className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm active:scale-[0.98] transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-[var(--rose-gold)]/10 flex items-center justify-center shrink-0">
                  <Megaphone className="h-5 w-5 text-[var(--rose-gold)]" />
                </div>
                <div>
                  <p className="text-sm font-bold leading-none mb-1.5">Kampanyalar</p>
                  <p className="text-xs text-muted-foreground leading-tight line-clamp-2">Promosyonlar, hedefleme ve kampanya performansı</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </button>
        )}
      </div>
    </div>
  );

}