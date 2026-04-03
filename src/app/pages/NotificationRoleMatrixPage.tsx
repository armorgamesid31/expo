import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const EVENTS = [
  'HANDOVER_REQUIRED',
  'HANDOVER_REMINDER',
  'SAME_DAY_APPOINTMENT_CHANGE',
  'END_OF_DAY_MISSING_DATA',
  'DAILY_MANAGER_REPORT',
] as const;

const ROLES = ['OWNER', 'MANAGER', 'RECEPTION', 'STAFF', 'FINANCE'] as const;

type EventType = (typeof EVENTS)[number];
type RoleType = (typeof ROLES)[number];

export function NotificationRoleMatrixPage() {
  const { apiFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [policy, setPolicy] = useState<any>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await apiFetch<{ policy: any }>('/api/admin/notification-settings');
        if (!active) return;
        setPolicy(response.policy || {});
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || 'Role matrix yüklenemedi.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [apiFetch]);

  const toggle = (eventType: EventType, role: RoleType) => {
    setPolicy((prev: any) => {
      const recipients = { ...(prev?.recipients || {}) };
      const current = Array.isArray(recipients[eventType]) ? [...recipients[eventType]] : [];
      const next = current.includes(role) ? current.filter((item) => item !== role) : [...current, role];
      recipients[eventType] = next;
      return { ...prev, recipients };
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/api/admin/notification-settings', {
        method: 'PUT',
        body: JSON.stringify(policy || {}),
      });
    } catch (err: any) {
      setError(err?.message || 'Role matrix kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Notification Role Matrix</h1>
      {loading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      {!loading ? (
        <div className="space-y-3">
          {EVENTS.map((eventType) => {
            const selected = (policy?.recipients?.[eventType] || []) as string[];
            return (
              <div key={eventType} className="rounded-xl border border-border bg-card p-3 space-y-2">
                <p className="text-sm font-semibold">{eventType}</p>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggle(eventType, role)}
                      className={`px-2.5 h-8 rounded-full border text-xs ${selected.includes(role) ? 'border-[var(--rose-gold)] bg-[var(--rose-gold)]/15' : 'border-border'}`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="rounded-xl border border-border bg-card p-3 space-y-2">
            <p className="text-sm font-semibold">Handover Repeat</p>
            <label className="flex items-center justify-between text-sm">
              <span>Interval (dk)</span>
              <input
                type="number"
                value={policy?.handoverReminderIntervalMinutes || 30}
                onChange={(e) => setPolicy((prev: any) => ({ ...prev, handoverReminderIntervalMinutes: Number(e.target.value) || 30 }))}
                className="w-20 h-8 rounded border border-border px-2"
              />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>Max tekrar</span>
              <input
                type="number"
                value={policy?.handoverReminderMaxCount || 6}
                onChange={(e) => setPolicy((prev: any) => ({ ...prev, handoverReminderMaxCount: Number(e.target.value) || 6 }))}
                className="w-20 h-8 rounded border border-border px-2"
              />
            </label>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="w-full h-10 rounded-lg bg-[var(--rose-gold)] text-white text-sm font-semibold disabled:opacity-60"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
