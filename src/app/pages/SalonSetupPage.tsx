import { useEffect } from 'react';
import {
  ChevronRight,
  CircleHelp,
  Building2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNavigator } from '../context/NavigatorContext';

export function SalonSetupPage() {
  const navigate = useNavigate();
  const { setHeaderTitle } = useNavigator();

  useEffect(() => {
    setHeaderTitle('Salon Bilgileri');
    return () => setHeaderTitle(null);
  }, [setHeaderTitle]);

  return (
    <div className="p-4 space-y-3 bg-background h-full overflow-y-auto">
      <button
        type="button"
        onClick={() => navigate('/app/salon-info/basic', { state: { navDirection: 'forward', from: '/app/salon-info' } })}
        className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm active:scale-[0.98] transition-all"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-[var(--rose-gold)]/10 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-[var(--rose-gold)]" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none mb-1.5">Temel Bilgiler</p>
              <p className="text-xs text-muted-foreground leading-tight line-clamp-2">
                Salon kimliği, adres, iletişim ve çalışma saatleri
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </button>

      <button
        type="button"
        onClick={() => navigate('/app/salon-info/faq', { state: { navDirection: 'forward', from: '/app/salon-info' } })}
        className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm active:scale-[0.98] transition-all"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-[var(--deep-indigo)]/10 flex items-center justify-center shrink-0">
              <CircleHelp className="h-5 w-5 text-[var(--deep-indigo)]" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none mb-1.5">Sık Sorulan Sorular</p>
              <p className="text-xs text-muted-foreground leading-tight line-clamp-2">
                Müşterilerin sık sorduğu sorular için hazır cevaplar
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </button>
    </div>
  );
}
