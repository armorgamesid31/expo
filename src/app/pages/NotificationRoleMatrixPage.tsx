import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const EVENTS = [
{
  key: 'HANDOVER_REQUIRED',
  title: "Müşteri salon desteğine ihtiyaç duyuyor",
  description: "Gönders an alert when AI hands the conversation to your team."
},
{
  key: 'HANDOVER_REMINDER',
  title: "Devir hatırlatması",
  description: 'Repeats reminders while handover is still pending.'
},
{
  key: 'SAME_DAY_APPOINTMENT_CHANGE',
  title: 'Same-Day Appointment Changes',
  description: 'Notifies new bookings, updates, and cancellations for today.'
},
{
  key: 'END_OF_DAY_MISSING_DATA',
  title: 'End-of-Day Missing Data',
  description: 'Reminds the team when check-in or payment info is missing.'
},
{
  key: 'DAILY_MANAGER_REPORT',
  title: "Daily Yönetici Report",
  description: "Gönders the daily summary after closing."
}] as
const;

const ROLES = [
{ key: 'OWNER', label: "Sahip" },
{ key: 'MANAGER', label: "Yönetici" },
{ key: 'RECEPTION', label: "Resepsiyon" },
{ key: 'STAFF', label: "Personel" },
{ key: 'FINANCE', label: "Finans" }] as
const;

type EventType = (typeof EVENTS)[number];
type EventKey = EventType['key'];
type RoleType = (typeof ROLES)[number]['key'];

type NotificationPolicy = {
  recipients?: Partial<Record<EventKey, RoleType[]>>;
  handoverReminderIntervalMinutes?: number;
  handoverReminderMaxCount?: number;
};

export function NotificationRoleMatrixPage() {
  const { apiFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [policy, setPolicy] = useState<NotificationPolicy>({
    recipients: {},
    handoverReminderIntervalMinutes: 30,
    handoverReminderMaxCount: 6
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await apiFetch<{policy: NotificationPolicy;}>('/api/admin/notification-settings');
        if (!active) return;
        setPolicy({
          recipients: response.policy?.recipients || {},
          handoverReminderIntervalMinutes: response.policy?.handoverReminderIntervalMinutes || 30,
          handoverReminderMaxCount: response.policy?.handoverReminderMaxCount || 6
        });
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || 'Notification settings could not be loaded.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [apiFetch]);

  const toggle = (eventType: EventKey, role: RoleType) => {
    setSavedMessage(null);
    setPolicy((prev) => {
      const recipients = { ...(prev?.recipients || {}) };
      const current = Array.isArray(recipients[eventType]) ? [...recipients[eventType]] : [];
      const next = current.includes(role) ? current.filter((item) => item !== role) : [...current, role];
      recipients[eventType] = next;
      return { ...prev, recipients };
    });
  };

  const setAllForEvent = (eventType: EventKey, enabled: boolean) => {
    setSavedMessage(null);
    setPolicy((prev) => {
      const recipients = { ...(prev?.recipients || {}) };
      recipients[eventType] = enabled ? ROLES.map((item) => item.key) : [];
      return { ...prev, recipients };
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      await apiFetch('/api/admin/notification-settings', {
        method: 'PUT',
        body: JSON.stringify(policy)
      });
      setSavedMessage('Notification settings saved.');
    } catch (err: any) {
      setError(err?.message || 'Notification settings could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Notification Rules</h1>
      <p className="text-sm text-muted-foreground">
        Choose which team roles receive each notification type.
      </p>
      {loading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {savedMessage ? <p className="text-sm text-emerald-600">{savedMessage}</p> : null}

      {!loading ?
      <div className="space-y-3">
          {EVENTS.map((eventItem) => {
          const selected = (policy?.recipients?.[eventItem.key] || []) as string[];
          return (
            <div key={eventItem.key} className="rounded-xl border border-border bg-card p-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{eventItem.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{eventItem.description}</p>
                  </div>
                  <div className="shrink-0 flex gap-1">
                    <button
                    type="button"
                    onClick={() => setAllForEvent(eventItem.key, true)}
                    className="h-7 px-2 rounded-md border border-border text-[11px]">
                    
                      Enable all
                    </button>
                    <button
                    type="button"
                    onClick={() => setAllForEvent(eventItem.key, false)}
                    className="h-7 px-2 rounded-md border border-border text-[11px]">
                    
                      Disable all
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((role) =>
                <button
                  key={role.key}
                  type="button"
                  onClick={() => toggle(eventItem.key, role.key)}
                  className={`px-2.5 h-8 rounded-full border text-xs ${
                  selected.includes(role.key) ?
                  'border-[var(--rose-gold)] bg-[var(--rose-gold)]/15 text-[var(--deep-indigo)]' :
                  'border-border text-muted-foreground'}`
                  }>
                  
                      {role.label}
                    </button>
                )}
                </div>
              </div>);

        })}

          <div className="rounded-xl border border-border bg-card p-3 space-y-3">
            <p className="text-sm font-semibold">Devir hatırlatma kuralları</p>
            <p className="text-xs text-muted-foreground">
              If handover stays active, reminders are repeated with these limits.
            </p>
            <label className="flex items-center justify-between text-sm">
              <span>Hatırlatma aralığı (dk)</span>
              <input
              type="number"
              min={5}
              max={180}
              value={policy?.handoverReminderIntervalMinutes || 30}
              onChange={(e) =>
              setPolicy((prev) => ({
                ...prev,
                handoverReminderIntervalMinutes: Math.min(180, Math.max(5, Number(e.target.value) || 30))
              }))
              }
              className="w-20 h-8 rounded border border-border px-2" />
            
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>Max reminders</span>
              <input
              type="number"
              min={1}
              max={12}
              value={policy?.handoverReminderMaxCount || 6}
              onChange={(e) =>
              setPolicy((prev) => ({
                ...prev,
                handoverReminderMaxCount: Math.min(12, Math.max(1, Number(e.target.value) || 6))
              }))
              }
              className="w-20 h-8 rounded border border-border px-2" />
            
            </label>
          </div>

          <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="w-full h-10 rounded-lg bg-[var(--rose-gold)] text-white text-sm font-semibold disabled:opacity-60">
          
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div> :
      null}
    </div>);

}