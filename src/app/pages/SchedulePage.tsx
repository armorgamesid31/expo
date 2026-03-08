import { useEffect, useMemo, useState } from 'react';
import { addDays, formatISO, startOfDay, endOfDay } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import type { AdminAppointmentsResponse } from '../types/mobile-api';

function isoWindow(date: Date) {
  return {
    from: formatISO(startOfDay(date)),
    to: formatISO(endOfDay(date)),
  };
}

export function SchedulePage() {
  const { apiFetch } = useAuth();
  const [activeDate, setActiveDate] = useState(new Date());
  const [items, setItems] = useState<AdminAppointmentsResponse['items']>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const windowQuery = useMemo(() => {
    const window = isoWindow(activeDate);
    return `from=${encodeURIComponent(window.from)}&to=${encodeURIComponent(window.to)}`;
  }, [activeDate]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiFetch<AdminAppointmentsResponse>(`/api/admin/appointments?${windowQuery}`);
        if (mounted) {
          setItems(response.items);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || 'Takvim verisi alinamadi.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [apiFetch, windowQuery]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Randevu Takvimi</h1>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-sm rounded-md border border-border" onClick={() => setActiveDate(addDays(activeDate, -1))}>-1 Gun</button>
          <button className="px-3 py-1.5 text-sm rounded-md border border-border" onClick={() => setActiveDate(new Date())}>Bugun</button>
          <button className="px-3 py-1.5 text-sm rounded-md border border-border" onClick={() => setActiveDate(addDays(activeDate, 1))}>+1 Gun</button>
        </div>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Randevular yukleniyor...</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">{item.customerName}</p>
              <p className="text-xs text-muted-foreground">{item.status}</p>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{item.service.name} • {item.staff.name}</p>
            <p className="text-sm mt-2">{new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        ))}

        {!loading && !items.length ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Bu zaman araliginda randevu bulunmuyor.
          </div>
        ) : null}
      </div>
    </div>
  );
}
