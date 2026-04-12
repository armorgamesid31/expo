import { ChevronRight, Instagram, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SocialChannelsHubProps {
  onBack: () => void;
}

export function SocialChannelsHub({ onBack }: SocialChannelsHubProps) {
  const navigate = useNavigate();

  return (
    <div className="h-full pb-20 overflow-y-auto">
      <div className="p-4 border-b border-border bg-[var(--luxury-bg)] sticky top-0 z-10">
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-muted-foreground underline underline-offset-2">
          
          Geri
        </button>
        <h1 className="text-2xl font-semibold mt-2 mb-1">Sosyal Kanallar</h1>
        <p className="text-sm text-muted-foreground">
          Instagram ve WhatsApp bağlantılarını tek alandan yönetin.
        </p>
      </div>

      <div className="p-4 space-y-3">
        <button
          type="button"
          onClick={() => navigate('/app/features/meta-direct', { state: { navDirection: 'forward' } })}
          className="w-full rounded-xl border border-border bg-card p-4 text-left">
          
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[var(--deep-indigo)]/15 grid place-items-center">
                <Instagram className="h-5 w-5 text-[var(--deep-indigo)]" />
              </div>
              <div>
                <p className="text-sm font-semibold">Instagram (Meta Direct)</p>
                <p className="text-xs text-muted-foreground">Bağlantı, webhook ve DM entegrasyonu</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/app/features/whatsapp-settings', { state: { navDirection: 'forward' } })}
          className="w-full rounded-xl border border-border bg-card p-4 text-left">
          
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[var(--rose-gold)]/15 grid place-items-center">
                <MessageCircle className="h-5 w-5 text-[var(--rose-gold)]" />
              </div>
              <div>
                <p className="text-sm font-semibold">WhatsApp</p>
                <p className="text-xs text-muted-foreground">Bağlantı, bot ayarları ve ajan davranışı</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </button>
      </div>
    </div>);

}