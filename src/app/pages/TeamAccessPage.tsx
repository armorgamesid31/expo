import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { AccessPermissionsResponse, AccessUserItem } from '../types/mobile-api';

const ROLES: Array<'OWNER' | 'MANAGER' | 'RECEPTION' | 'STAFF' | 'FINANCE'> = ['OWNER', 'MANAGER', 'RECEPTION', 'STAFF', 'FINANCE'];

function roleLabel(role: string) {
  if (role === 'OWNER') return "Sahip";
  if (role === 'MANAGER') return "Yönetici";
  if (role === 'RECEPTION') return "Resepsiyon";
  if (role === 'FINANCE') return "Finans";
  return "Personel";
}

export function TeamAccessPage() {
  const { apiFetch, hasPermission } = useAuth();
  const [tab, setTab] = useState<'users' | 'roles'>('users');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [users, setUsers] = useState<AccessUserItem[]>([]);
  const [permissions, setPermissions] = useState<AccessPermissionsResponse['permissions']>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [activeRole, setActiveRole] = useState<'OWNER' | 'MANAGER' | 'RECEPTION' | 'STAFF' | 'FINANCE'>('OWNER');

  const [createForm, setCreateForm] = useState({
    email: '',
    displayName: '',
    role: 'STAFF' as 'OWNER' | 'MANAGER' | 'RECEPTION' | 'STAFF' | 'FINANCE',
    password: ''
  });

  const canManageUsers = hasPermission('access.users.manage');
  const canManageRoles = hasPermission('access.roles.manage');

  const groupedPermissions = useMemo(() => {
    const byModule = new Map<string, AccessPermissionsResponse['permissions']>();
    for (const item of permissions) {
      const bucket = byModule.get(item.module) || [];
      bucket.push(item);
      byModule.set(item.module, bucket);
    }
    return Array.from(byModule.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [permissions]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const tasks: Promise<any>[] = [];
      if (canManageUsers) tasks.push(apiFetch<{ items: AccessUserItem[]; }>('/api/admin/access/users')); else
        tasks.push(Promise.resolve({ items: [] }));

      if (canManageRoles) tasks.push(apiFetch<AccessPermissionsResponse>('/api/admin/access/permissions')); else
        tasks.push(Promise.resolve({ permissions: [], rolePermissions: {}, roles: ROLES }));

      const [usersResponse, permissionsResponse] = await Promise.all(tasks);
      setUsers((usersResponse.items || []).slice());
      setPermissions(permissionsResponse.permissions || []);
      setRolePermissions(permissionsResponse.rolePermissions || {});
      if (!canManageUsers && canManageRoles) {
        setTab('roles');
      }
    } catch (err: any) {
      setError(err?.message || "Ekip erişimi yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleRolePermission = (permissionKey: string) => {
    if (!canManageRoles) return;
    setRolePermissions((prev) => {
      const current = Array.isArray(prev[activeRole]) ? [...prev[activeRole]] : [];
      const next = current.includes(permissionKey) ?
        current.filter((item) => item !== permissionKey) :
        [...current, permissionKey];
      return { ...prev, [activeRole]: next.sort() };
    });
  };

  const saveRole = async () => {
    if (!canManageRoles) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/access/roles/${activeRole}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({
          permissionKeys: rolePermissions[activeRole] || []
        })
      });
      setMessage(`${roleLabel(activeRole)} yetkileri kaydedildi.`);
    } catch (err: any) {
      setError(err?.message || "Rol yetkileri kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const createUser = async () => {
    if (!canManageUsers) return;
    if (!createForm.email.trim()) {
      setError("E-posta zorunludur.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await apiFetch<{ item: AccessUserItem; temporaryPassword?: string; }>('/api/admin/access/users', {
        method: 'POST',
        body: JSON.stringify({
          email: createForm.email.trim(),
          displayName: createForm.displayName.trim() || null,
          role: createForm.role,
          password: createForm.password.trim() || undefined
        })
      });
      setMessage(
        response.temporaryPassword ?
          `Kullanıcı oluşturuldu. Geçici şifre: ${response.temporaryPassword}` :
          "Kullanıcı oluşturuldu."
      );
      setCreateForm({ email: '', displayName: '', role: 'STAFF', password: '' });
      await load();
    } catch (err: any) {
      setError(err?.message || "Kullanıcı oluşturulamadı.");
    } finally {
      setSaving(false);
    }
  };

  const updateUser = async (item: AccessUserItem, data: Partial<{ role: AccessUserItem['role']; isActive: boolean; }>) => {
    if (!canManageUsers) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/access/users/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          role: data.role || item.role,
          isActive: typeof data.isActive === 'boolean' ? data.isActive : item.isActive
        })
      });
      setMessage("Kullanıcı güncellendi.");
      await load();
    } catch (err: any) {
      setError(err?.message || "Kullanıcı güncellenemedi.");
    } finally {
      setSaving(false);
    }
  };

  if (!canManageUsers && !canManageRoles) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-semibold">Ekip ve Yetki</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Erişim ayarlarını yönetmek için yetkiniz yok.
        </p>
      </div>);
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Ekip ve Yetki</h1>
      <p className="text-sm text-muted-foreground">Ekip hesaplarını ve rol bazlı erişim yetkilerini yönetin.</p>

      <div className="inline-flex rounded-lg border border-border bg-card p-1">
        {canManageUsers ?
          <button
            type="button"
            onClick={() => setTab('users')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${tab === 'users' ? 'bg-[var(--rose-gold)] text-white' : 'text-muted-foreground'}`}>
            Ekip Kullanıcıları
          </button> :
          null}
        {canManageRoles ?
          <button
            type="button"
            onClick={() => setTab('roles')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${tab === 'roles' ? 'bg-[var(--rose-gold)] text-white' : 'text-muted-foreground'}`}>
            Roller ve Yetkiler
          </button> :
          null}
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

      {tab === 'users' && canManageUsers ?
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-3 space-y-3">
            <p className="text-sm font-semibold">Ekip Kullanıcısı Oluştur</p>
            <input
              value={createForm.email}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="E-posta"
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm" />

            <input
              value={createForm.displayName}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, displayName: e.target.value }))}
              placeholder="Görünen ad (isteğe bağlı)"
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm" />

            <select
              value={createForm.role}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  role: e.target.value as 'OWNER' | 'MANAGER' | 'RECEPTION' | 'STAFF' | 'FINANCE'
                }))
              }
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm">
              {ROLES.map((role) =>
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              )}
            </select>
            <input
              value={createForm.password}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Şifre (isteğe bağlı, boşsa otomatik üretilir)"
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm" />

            <button
              type="button"
              onClick={() => void createUser()}
              disabled={saving}
              className="w-full h-10 rounded-lg bg-[var(--rose-gold)] text-white text-sm font-semibold disabled:opacity-60">
              {saving ? "Kaydediliyor..." : "Kullanıcı Oluştur"}
            </button>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 space-y-2">
            <p className="text-sm font-semibold">Ekip Üyeleri</p>
            {users.map((item) =>
              <div key={item.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{item.displayName || item.email}</p>
                    <p className="text-xs text-muted-foreground">{item.email}</p>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-200 text-zinc-700'}`}>
                    {item.isActive ? "Aktif" : "Pasif"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={item.role}
                    onChange={(e) => void updateUser(item, { role: e.target.value as AccessUserItem['role'] })}
                    className="h-8 rounded-md border border-border bg-background px-2 text-xs">
                    {ROLES.map((role) =>
                      <option key={role} value={role}>
                        {roleLabel(role)}
                      </option>
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={() => void updateUser(item, { isActive: !item.isActive })}
                    className="h-8 rounded-md border border-border px-2 text-xs">
                    {item.isActive ? "Pasifleştir" : "Aktifleştir"}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Son giriş: {item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleString() : "Hiç"}
                </p>
              </div>
            )}
            {!users.length ? <p className="text-sm text-muted-foreground">Ekip kullanıcısı bulunamadı.</p> : null}
          </div>
        </div> :
        null}

      {tab === 'roles' && canManageRoles ?
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {ROLES.map((role) =>
              <button
                key={role}
                type="button"
                onClick={() => setActiveRole(role)}
                className={`h-8 rounded-full border px-3 text-xs ${activeRole === role ? 'border-[var(--rose-gold)] bg-[var(--rose-gold)]/10' : 'border-border'}`}>
                {roleLabel(role)}
              </button>
            )}
          </div>

          {groupedPermissions.map(([moduleName, rows]) =>
            <div key={moduleName} className="rounded-xl border border-border bg-card p-3 space-y-2">
              <p className="text-sm font-semibold capitalize">{moduleName}</p>
              {rows.map((item) => {
                const enabled = (rolePermissions[activeRole] || []).includes(item.key);
                return (
                  <label key={item.key} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm">{item.key}</p>
                      <p className="text-[11px] text-muted-foreground">{item.description || "Açıklama yok"}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => toggleRolePermission(item.key)}
                      className="h-4 w-4" />
                  </label>);
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => void saveRole()}
            disabled={saving}
            className="w-full h-10 rounded-lg bg-[var(--rose-gold)] text-white text-sm font-semibold disabled:opacity-60">
            {saving ? "Kaydediliyor..." : `${roleLabel(activeRole)} Yetkilerini Kaydet`}
          </button>
        </div> :
        null}
    </div>);
}