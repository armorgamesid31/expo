import { useNavigate } from 'react-router-dom';
import { Building2, Globe, Megaphone, ChevronRight, MessageCircle } from 'lucide-react';
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
        <h1 className="text-2xl font-semibold">Marka & Büyüme Merkezi</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Marka ve büyüme araçlarını açmak için yetkiniz bulunmamaktadır.
        </p>
      </div>);

  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Marka & Büyüme Merkezi</h1>
      <p className="text-sm text-muted-foreground">
        Salon profilini, web sitesi deneyimini ve kampanya operasyonlarını tek bir merkezden kontrol edin.
      </p>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => navigate('/app/features/social-channels', { state: { navDirection: 'forward' } })}
          className="w-full rounded-xl border border-border bg-card p-4 text-left">
          
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[var(--deep-indigo)]/15 grid place-items-center">
                <MessageCircle className="h-5 w-5 text-[var(--deep-indigo)]" />
              </div>
              <div>
                <p className="text-sm font-semibold">Sosyal Kanallar</p>
                <p className="text-xs text-muted-foreground">Meta Direct ve WhatsApp bağlantı yönetimi</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </button>

        {canSalonInfo ?
        <button
          type="button"
          onClick={() => navigate('/app/salon-info', { state: { navDirection: 'forward' } })}
          className="w-full rounded-xl border border-border bg-card p-4 text-left">
          
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--rose-gold)]/15 grid place-items-center">
                  <Building2 className="h-5 w-5 text-[var(--rose-gold)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Salon Bilgileri</p>
                  <p className="text-xs text-muted-foreground">İşletme kimliği, iletişim bilgileri ve çalışma düzeni</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button> :
        null}

        {canWebsite ?
        <button
          type="button"
          onClick={() => navigate('/app/features/website-builder', { state: { navDirection: 'forward' } })}
          className="w-full rounded-xl border border-border bg-card p-4 text-left">
          
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--deep-indigo)]/15 grid place-items-center">
                  <Globe className="h-5 w-5 text-[var(--deep-indigo)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Web Sitesi Ayarları</p>
                  <p className="text-xs text-muted-foreground">Online randevu web sitesi içeriği ve sunumu</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button> :
        null}

        {canCampaigns ?
        <button
          type="button"
          onClick={() => navigate('/app/campaigns', { state: { navDirection: 'forward' } })}
          className="w-full rounded-xl border border-border bg-card p-4 text-left">
          
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--rose-gold)]/15 grid place-items-center">
                  <Megaphone className="h-5 w-5 text-[var(--rose-gold)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Kampanyalar</p>
                  <p className="text-xs text-muted-foreground">Promosyonlar, hedefleme ve kampanya performansı</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button> :
        null}
      </div>
    </div>);

}