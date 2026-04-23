import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight, ShieldBan } from 'lucide-react';
import { useNavigator } from '../context/NavigatorContext';

export function CustomerRiskMenuPage() {
  const navigate = useNavigate();
  const { setHeaderTitle } = useNavigator();

  useEffect(() => {
    setHeaderTitle('Risk Merkezi');
    return () => setHeaderTitle(null);
  }, [setHeaderTitle]);

  return (
    <div className="p-4 space-y-3">
      <button
        type="button"
        onClick={() => navigate('/app/blacklist', { state: { navDirection: 'forward', from: '/app/customers/risk-menu' } })}
        className="w-full rounded-xl border border-border bg-card p-4 text-left"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-500/10 grid place-items-center">
              <ShieldBan className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">Kara Liste</p>
              <p className="text-xs text-muted-foreground">Yasaklı müşteri kayıtlarını görüntüle ve yönet</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </button>

      <button
        type="button"
        onClick={() =>
          navigate('/app/customers/attendance-settings', {
            state: { navDirection: 'forward', from: '/app/customers/risk-menu' }
          })
        }
        className="w-full rounded-xl border border-border bg-card p-4 text-left"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 grid place-items-center">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">Randevu İhlali</p>
              <p className="text-xs text-muted-foreground">İhlal sayımı ve yaptırım kurallarını düzenle</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </button>
    </div>
  );
}
