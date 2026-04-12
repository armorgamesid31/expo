import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { NotificationInboxItem } from '../types/mobile-api';
import { resolvePushAppPath } from '../lib/push-routing';
import { PUSH_NOTIFICATION_RECEIVED_EVENT } from '../lib/push-notifications';

export function NotificationsInboxPage() {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationInboxItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<{ items: NotificationInboxItem[] }>('/api/mobile/notifications?limit=80');
      setItems(response.items || []);
    } catch (err: any) {
      setError(err?.message || 'Bildirimler alınamadı.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const handlePushReceived = () => {
      void load();
    };

    window.addEventListener(PUSH_NOTIFICATION_RECEIVED_EVENT, handlePushReceived);
    return () => {
      window.removeEventListener(PUSH_NOTIFICATION_RECEIVED_EVENT, handlePushReceived);
    };
  }, [load]);

  const markRead = async (deliveryId: number) => {
    try {
      await apiFetch(`/api/mobile/notifications/${deliveryId}/read`, { method: 'POST' });
      setItems((prev) => prev.map((item) => (item.deliveryId === deliveryId ? { ...item, readAt: new Date().toISOString() } : item)));
    } catch {
      // no-op
    }
  };

  const openNotification = async (item: NotificationInboxItem) => {
    await markRead(item.deliveryId);
    navigate(
      resolvePushAppPath({
        route: item.payload?.route,
        eventType: item.payload?.eventType || item.eventType,
      }),
      { state: { navDirection: 'forward' } },
    );
  };

  const markAllRead = async () => {
    try {
      await apiFetch('/api/mobile/notifications/read-all', { method: 'POST' });
      const now = new Date().toISOString();
      setItems((prev) => prev.map((item) => ({ ...item, readAt: item.readAt || now })));
    } catch {
      // no-op
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Bildirimler</h1>
        <button type="button" onClick={() => void markAllRead()} className="text-sm text-[var(--rose-gold)] font-semibold">
          Tümünü okundu yap
        </button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <div className="space-y-2">
        {items.map((item) => (
          <button
            type="button"
            key={item.deliveryId}
            onClick={() => void openNotification(item)}
            className={`w-full text-left rounded-xl border p-3 ${item.readAt ? 'border-border bg-card' : 'border-[var(--rose-gold)]/40 bg-[var(--rose-gold)]/10'}`}
          >
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.body}</p>
            <p className="text-[11px] text-muted-foreground mt-2">{new Date(item.createdAt).toLocaleString('tr-TR')}</p>
          </button>
        ))}
        {!loading && items.length === 0 ? <p className="text-sm text-muted-foreground">Bildirim yok.</p> : null}
      </div>
    </div>
  );
}
