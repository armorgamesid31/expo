import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { AdminCustomerItem, AdminCustomersResponse } from '../types/mobile-api';

const PAGE_LIMIT = 20;

export function CustomersPage() {
  const { apiFetch } = useAuth();
  const [items, setItems] = useState<AdminCustomerItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = async (nextCursor?: string | null) => {
    const query = new URLSearchParams({ limit: String(PAGE_LIMIT) });
    if (nextCursor) {
      query.set('cursor', nextCursor);
    }

    return apiFetch<AdminCustomersResponse>(`/api/admin/customers?${query.toString()}`);
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await loadPage(null);
        if (!mounted) return;
        setItems(response.items);
        setCursor(response.nextCursor);
        setHasMore(response.hasMore);
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || 'Musteriler alinamadi.');
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
  }, []);

  const handleLoadMore = async () => {
    if (!cursor || loadingMore) {
      return;
    }

    setLoadingMore(true);
    setError(null);

    try {
      const response = await loadPage(cursor);
      setItems((prev) => [...prev, ...response.items]);
      setCursor(response.nextCursor);
      setHasMore(response.hasMore);
    } catch (err: any) {
      setError(err?.message || 'Daha fazla musteri yuklenemedi.');
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Musteriler</h1>
        <p className="text-xs text-muted-foreground">Cursor pagination</p>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Yukleniyor...</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">{item.name || 'Isimsiz Musteri'}</p>
              <p className="text-xs text-muted-foreground">#{item.id}</p>
            </div>
            <p className="text-sm mt-1">{item.phone}</p>
            <p className="text-xs text-muted-foreground mt-1">Randevu sayisi: {item.appointmentCount}</p>
          </div>
        ))}
      </div>

      {!loading && !items.length ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Kayitli musteri bulunmuyor.
        </div>
      ) : null}

      {hasMore ? (
        <button
          type="button"
          onClick={() => void handleLoadMore()}
          disabled={loadingMore}
          className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm disabled:opacity-60"
        >
          {loadingMore ? 'Yukleniyor...' : 'Daha Fazla Yukle'}
        </button>
      ) : null}
    </div>
  );
}
