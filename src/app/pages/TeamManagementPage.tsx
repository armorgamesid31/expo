import { useNavigate } from 'react-router-dom';
import { Users, Shield, ChevronRight, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function TeamManagementPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const canManageEmployees = hasPermission('staff.manage');
  const canManageAccess = hasPermission('access.users.manage') || hasPermission('access.roles.manage');
  const canManageNotificationRules = hasPermission('notifications.policy.manage');

  if (!canManageEmployees && !canManageAccess && !canManageNotificationRules) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-semibold">Ekip Yönetimi</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Ekip yönetimi araçlarını açmak için yetkiniz bulunmamaktadır.
        </p>
      </div>);

  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Ekip Yönetimi</h1>
      <p className="text-sm text-muted-foreground">
        Personelleri yönetin ve hesap düzeyi erişimi tek yerden kontrol edin.
      </p>

      <div className="space-y-3">
        {canManageEmployees ?
        <button
          type="button"
          onClick={() => navigate('/app/staff', { state: { navDirection: 'forward' } })}
          className="w-full rounded-xl border border-border bg-card p-4 text-left">
          
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--rose-gold)]/15 grid place-items-center">
                  <Users className="h-5 w-5 text-[var(--rose-gold)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Personel Yönetimi</p>
                  <p className="text-xs text-muted-foreground">Personel profilleri, atamalar ve hizmet yetkileri</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button> :
        null}

        {canManageAccess ?
        <button
          type="button"
          onClick={() => navigate('/app/team-access', { state: { navDirection: 'forward' } })}
          className="w-full rounded-xl border border-border bg-card p-4 text-left">
          
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--deep-indigo)]/15 grid place-items-center">
                  <Shield className="h-5 w-5 text-[var(--deep-indigo)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Ekip ve Yetki</p>
                  <p className="text-xs text-muted-foreground">Ekip kullanıcı hesapları, roller ve yetkiler</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button> :
        null}

        {canManageNotificationRules ?
        <button
          type="button"
          onClick={() => navigate('/app/notification-role-matrix', { state: { navDirection: 'forward' } })}
          className="w-full rounded-xl border border-border bg-card p-4 text-left">
          
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--deep-indigo)]/15 grid place-items-center">
                  <Bell className="h-5 w-5 text-[var(--deep-indigo)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Bildirim Kuralları</p>
                  <p className="text-xs text-muted-foreground">Rol bazlı bildirim alıcıları ve hatırlatıcı politikası</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button> :
        null}
      </div>
    </div>);

}