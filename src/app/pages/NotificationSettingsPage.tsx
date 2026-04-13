import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LocalPushPermissionState,
  PUSH_NOTIFICATION_RECEIVED_EVENT,
  PUSH_REGISTRATION_CHANGED_EVENT,
  getLocalPushPermissionState
} from
  '../lib/push-notifications';
import type {
  NotificationPreferences,
  PushStatusResponse,
  PushTestResponse
} from
  '../types/mobile-api';

const EVENTS = [
  { key: 'HANDOVER_REQUIRED', label: 'Handover gerekli' },
  { key: 'HANDOVER_REMINDER', label: 'Handover tekrar' },
  { key: 'SAME_DAY_APPOINTMENT_CHANGE', label: "Ayni gun randevu değişikliği" },
  { key: 'END_OF_DAY_MISSING_DATA', label: "Gun sonu eksık veri" },
  { key: 'DAILY_MANAGER_REPORT', label: 'Gunluk rapor' }] as
  const;

const PUSH_SOUND_TESTS = [
  { scenario: 'APPOINTMENT_NEW', label: 'Yeni randevu sesi' },
  { scenario: 'BOOKING_CHANGE', label: "Değişıklik sesi" },
  { scenario: 'REPORT', label: 'Rapor sesi' },
  { scenario: 'HANDOVER', label: 'Handover sesi' }] as
  const;

const PERMISSION_LABELS: Record<LocalPushPermissionState, string> = {
  granted: "İzin verildi",
  denied: "İzin reddedildi",
  prompt: "İzin bekleniyor",
  'prompt-with-rationale': "Ek açıklama gerekli",
  unsupported: 'Sadece native cihazda calisir'
};

type EventKey = (typeof EVENTS)[number]['key'];

function formatDate(value: string | null): string {
  if (!value) return 'Yok';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Bilinmiyor';
  return date.toLocaleString('tr-TR');
}

export function NotificationSettingsPage() {
  const { apiFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [pushStatusLoading, setPushStatusLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pushStatusError, setPushStatusError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [localPermission, setLocalPermission] = useState<LocalPushPermissionState>('unsupported');
  const [pushStatus, setPushStatus] = useState<PushStatusResponse | null>(null);
  const [events, setEvents] = useState<Record<EventKey, boolean>>({
    HANDOVER_REQUIRED: true,
    HANDOVER_REMINDER: true,
    SAME_DAY_APPOINTMENT_CHANGE: true,
    END_OF_DAY_MISSING_DATA: true,
    DAILY_MANAGER_REPORT: true
  });

  const loadPreferences = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch<{ preferences: NotificationPreferences; }>('/api/mobile/notification-preferences');
      setMasterEnabled(response.preferences?.masterEnabled !== false);
      const remote = (response.preferences?.eventConfig?.events || {}) as Record<string, boolean>;
      setEvents((prev) => ({
        ...prev,
        HANDOVER_REQUIRED: remote.HANDOVER_REQUIRED ?? prev.HANDOVER_REQUIRED,
        HANDOVER_REMINDER: remote.HANDOVER_REMINDER ?? prev.HANDOVER_REMINDER,
        SAME_DAY_APPOINTMENT_CHANGE: remote.SAME_DAY_APPOINTMENT_CHANGE ?? prev.SAME_DAY_APPOINTMENT_CHANGE,
        END_OF_DAY_MISSING_DATA: remote.END_OF_DAY_MISSING_DATA ?? prev.END_OF_DAY_MISSING_DATA,
        DAILY_MANAGER_REPORT: remote.DAILY_MANAGER_REPORT ?? prev.DAILY_MANAGER_REPORT
      }));
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Bildirim tercihleri alınamadı.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  const loadPushStatus = useCallback(async () => {
    setPushStatusLoading(true);
    try {
      const [remoteStatus, permission] = await Promise.all([
        apiFetch<PushStatusResponse>('/api/mobile/push/status'),
        getLocalPushPermissionState()]
      );
      setPushStatus(remoteStatus);
      setLocalPermission(permission);
      setPushStatusError(null);
    } catch (err: any) {
      setPushStatusError(err?.message || 'Push durumu alinamadi.');
    } finally {
      setPushStatusLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    void loadPreferences();
    void loadPushStatus();
  }, [loadPreferences, loadPushStatus]);

  useEffect(() => {
    const refreshStatus = () => {
      void loadPushStatus();
    };

    window.addEventListener(PUSH_REGISTRATION_CHANGED_EVENT, refreshStatus);
    window.addEventListener(PUSH_NOTIFICATION_RECEIVED_EVENT, refreshStatus);

    return () => {
      window.removeEventListener(PUSH_REGISTRATION_CHANGED_EVENT, refreshStatus);
      window.removeEventListener(PUSH_NOTIFICATION_RECEIVED_EVENT, refreshStatus);
    };
  }, [loadPushStatus]);

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
            events
          }
        })
      });
    } catch (err: any) {
      setError(err?.message || 'Bildirim tercihleri kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const sendTestNotification = async () => {
    await sendPushTest({ delaySeconds: 0, scenario: 'GENERAL' });
  };

  const sendDelayedTestNotification = async () => {
    await sendPushTest({ delaySeconds: 5, scenario: 'GENERAL' });
  };

  const sendPushTest = async (input: { delaySeconds: number; scenario: string; }) => {
    setTesting(true);
    setTestMessage(null);
    setPushStatusError(null);

    try {
      const result = await apiFetch<PushTestResponse>('/api/mobile/push/test', {
        method: 'POST',
        body: JSON.stringify({ delaySeconds: input.delaySeconds, scenario: input.scenario })
      });

      setTestMessage(
        result.scheduled ?
          `${result.delaySeconds} saniyelik gecikmeli ${result.scenario || input.scenario} testi planlandi. Simdi uygulamayi arka plana al.` :
          `Test sonucu: GÖNDERİLDİ ${result.pushDeliverySummary.SENT}, HATA ${result.pushDeliverySummary.FAILED}, ATLADI ${result.pushDeliverySummary.SKIPPED}`
      );
      await loadPushStatus();
    } catch (err: any) {
      setPushStatusError(err?.message || "Test bildirimi gönderilemedi.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Bildirim Ayarları</h1>
        <p className="text-sm text-muted-foreground">
          Push kurulumu, cihaz kaydi ve bildirim tercihlerini bu ekrandan takip edebilirsin.
        </p>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Tercihler yükleniyor...</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Push sistem durumu</p>
            <p className="text-xs text-muted-foreground">Firebase, cihaz kaydi ve izin bilgileri</p>
          </div>
          <button
            type="button"
            onClick={() => void loadPushStatus()}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground">

            Yenile
          </button>
        </div>

        {pushStatusLoading ? <p className="text-sm text-muted-foreground">Push durumu yükleniyor...</p> : null}
        {pushStatusError ? <p className="text-sm text-red-500">{pushStatusError}</p> : null}

        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span>Telefon izin durumu</span>
            <span className="font-medium">{PERMISSION_LABELS[localPermission]}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Backend bildirim sağlayıcısı</span>
            <span className="font-medium">
              {pushStatus?.providerConfigured ? `Hazir (${pushStatus.providerSource})` : "Hazir değil"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Aktif cihaz kaydi</span>
            <span className="font-medium">{pushStatus?.activeDeviceCount ?? 0}</span>
          </div>
        </div>

        {pushStatus?.providerError ?
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600">
            Provider hatasi: {pushStatus.providerError}
          </p> :
          null}

        <div className="space-y-2">
          {(pushStatus?.devices || []).map((device) =>
            <div key={device.id} className="rounded-lg border border-border/70 px-3 py-2 text-xs">
              <p className="font-semibold">
                {device.platform} · {device.tokenMasked}
              </p>
              <p className="text-muted-foreground">
                Versiyon: {device.appVersion || 'bilinmiyor'} · Son görülme: {formatDate(device.lastSeenAt)}
              </p>
            </div>
          )}
          {!pushStatusLoading && (pushStatus?.devices || []).length === 0 ?
            <p className="text-xs text-muted-foreground">Bu kullanıcı için kayıtlı push cihazı yok.</p> :
            null}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={testing}
            onClick={() => void sendTestNotification()}
            className="h-10 rounded-lg bg-[var(--deep-indigo)] text-white text-sm font-semibold disabled:opacity-60">

            {testing ? "Gönderiliyor..." : 'Anlık test bildirimi'}
          </button>
          <button
            type="button"
            disabled={testing}
            onClick={() => void sendDelayedTestNotification()}
            className="h-10 rounded-lg border border-[var(--deep-indigo)] text-[var(--deep-indigo)] text-sm font-semibold disabled:opacity-60">

            {testing ? 'Planlanıyor...' : '5 saniye sonra test'}
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">5 saniye gecikmeli özel ses testleri</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {PUSH_SOUND_TESTS.map((testItem) =>
              <button
                key={testItem.scenario}
                type="button"
                disabled={testing}
                onClick={() => void sendPushTest({ delaySeconds: 5, scenario: testItem.scenario })}
                className="h-10 rounded-lg border border-border text-sm font-semibold disabled:opacity-60">

                {testing ? 'Planlanıyor...' : `${testItem.label} (5 sn)`}
              </button>
            )}
          </div>
        </div>

        {testMessage ? <p className="text-xs text-emerald-600">{testMessage}</p> : null}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Tüm bildirimler</span>
          <input
            type="checkbox"
            checked={masterEnabled}
            onChange={(e) => setMasterEnabled(e.target.checked)}
            className="h-4 w-4" />

        </label>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        {EVENTS.map((item) =>
          <label key={item.key} className="flex items-center justify-between gap-3">
            <span className="text-sm">{item.label}</span>
            <input
              type="checkbox"
              checked={events[item.key]}
              disabled={!masterEnabled}
              onChange={(e) => setEvents((prev) => ({ ...prev, [item.key]: e.target.checked }))}
              className="h-4 w-4" />

          </label>
        )}
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="w-full h-10 rounded-lg bg-[var(--rose-gold)] text-white text-sm font-semibold disabled:opacity-60">

        {saving ? 'Kaydediliyor...' : 'Kaydet'}
      </button>
    </div>);

}
