import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { NotificationPreferences } from '../types/mobile-api';

const EVENTS = [
  { key: 'HANDOVER_REQUIRED', label: 'Handover gerekli' },
  { key: 'HANDOVER_REMINDER', label: 'Handover tekrar' },
  { key: 'SAME_DAY_APPOINTMENT_CHANGE', label: 'Aynı gün randevu değişikliği' },
  { key: 'END_OF_DAY_MISSING_DATA', label: 'Gün sonu eksik veri' },
  { key: 'DAILY_MANAGER_REPORT', label: 'Günlük rapor' },
] as const;

type EventKey = (typeof EVENTS)[number]['key'];

export function NotificationSettingsPage() {
  const { apiFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [events, setEvents] = useState<Record<EventKey, boolean>>({
    HANDOVER_REQUIRED: true,
    HANDOVER_REMINDER: true,
    SAME_DAY_APPOINTMENT_CHANGE: true,
    END_OF_DAY_MISSING_DATA: true,
    DAILY_MANAGER_REPORT: true,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await apiFetch<{ preferences: NotificationPreferences }>('/api/mobile/notification-preferences');
        if (!active) return;
        setMasterEnabled(response.preferences?.masterEnabled !== false);
        const remote = (response.preferences?.eventConfig?.events || {}) as Record<string, boolean>;
        setEvents((prev) => ({
          ...prev,
          HANDOVER_REQUIRED: remote.HANDOVER_REQUIRED ?? prev.HANDOVER_REQUIRED,
          HANDOVER_REMINDER: remote.HANDOVER_REMINDER ?? prev.HANDOVER_REMINDER,
          SAME_DAY_APPOINTMENT_CHANGE: remote.SAME_DAY_APPOINTMENT_CHANGE ?? prev.SAME_DAY_APPOINTMENT_CHANGE,
          END_OF_DAY_MISSING_DATA: remote.END_OF_DAY_MISSING_DATA ?? prev.END_OF_DAY_MISSING_DATA,
          DAILY_MANAGER_REPORT: remote.DAILY_MANAGER_REPORT ?? prev.DAILY_MANAGER_REPORT,
        }));
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || 'Bildirim tercihleri alınamadı.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [apiFetch]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/api/mobile/notification-preferences', {
        method: 'PUT',
        body: JSON.stringify({
          masterEnabled,
          eventConfig: {
            masterEnabled,
            events,
          },
        }),
      });
    } catch (err: any) {
      setError(err?.message || 'Bildirim tercihleri kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Notification Settings</h1>
      {loading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Tüm bildirimler</span>
          <input
            type="checkbox"
            checked={masterEnabled}
            onChange={(e) => setMasterEnabled(e.target.checked)}
            className="h-4 w-4"
          />
        </label>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        {EVENTS.map((item) => (
          <label key={item.key} className="flex items-center justify-between gap-3">
            <span className="text-sm">{item.label}</span>
            <input
              type="checkbox"
              checked={events[item.key]}
              disabled={!masterEnabled}
              onChange={(e) => setEvents((prev) => ({ ...prev, [item.key]: e.target.checked }))}
              className="h-4 w-4"
            />
          </label>
        ))}
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
  );
}
