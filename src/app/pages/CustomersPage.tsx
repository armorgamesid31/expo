import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { AdminCustomerItem, AdminCustomersResponse } from '../types/mobile-api';

const PAGE_LIMIT = 20;

interface CustomerAppointmentItem {
  id: number;
  startTime: string;
  endTime: string;
  status: string;
  service: {
    id: number;
    name: string;
    duration: number;
    price: number;
  };
  staff: {
    id: number;
    name: string;
  };
}

interface CustomerDetailResponse {
  customer: AdminCustomerItem;
  appointments: CustomerAppointmentItem[];
}

export function CustomersPage() {
  const { apiFetch } = useAuth();
  const [items, setItems] = useState<AdminCustomerItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

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
          setError(err?.message || 'Müşteriler alınamadı.');
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
      setError(err?.message || 'Daha fazla müşteri yüklenemedi.');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleCreate = async () => {
    if (!phone.trim()) {
      setError('Telefon zorunlu.');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await apiFetch<{ customer: AdminCustomerItem }>('/api/admin/customers', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() || null, phone: phone.trim() }),
      });

      const nextItem: AdminCustomerItem = {
        ...response.customer,
        appointmentCount: 0,
      };
      setItems((prev) => [nextItem, ...prev]);
      setName('');
      setPhone('');
    } catch (err: any) {
      setError(err?.message || 'Müşteri oluşturulamadı.');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenCustomer = async (customerId: number) => {
    setDetailLoading(true);
    setDetailError(null);
    setSelectedCustomer(null);

    try {
      const response = await apiFetch<CustomerDetailResponse>(`/api/admin/customers/${customerId}`);
      setSelectedCustomer(response);
    } catch (err: any) {
      setDetailError(err?.message || 'Müşteri profili açılamadı.');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Müşteriler</h1>
        <p className="text-xs text-muted-foreground">Cursor pagination</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 space-y-2">
        <p className="text-sm font-medium">Yeni Müşteri</p>
        <input
          className="w-full rounded-md border border-border px-3 py-2 text-sm"
          placeholder="Ad soyad"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <input
          className="w-full rounded-md border border-border px-3 py-2 text-sm"
          placeholder="Telefon"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={creating}
          className="w-full rounded-md bg-[var(--rose-gold)] px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {creating ? 'Ekleniyor...' : 'Müşteri Ekle'}
        </button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <div className="space-y-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="w-full text-left rounded-xl border border-border bg-card p-4 hover:border-[var(--rose-gold)]/40 transition-colors"
            onClick={() => {
              void handleOpenCustomer(item.id);
            }}
          >
            <div className="flex items-center justify-between">
              <p className="font-medium">{item.name || 'İsimsiz Müşteri'}</p>
              <p className="text-xs text-muted-foreground">#{item.id}</p>
            </div>
            <p className="text-sm mt-1">{item.phone}</p>
            <p className="text-xs text-muted-foreground mt-1">Randevu sayısı: {item.appointmentCount}</p>
          </button>
        ))}
      </div>

      {!loading && !items.length ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Kayıtlı müşteri bulunmuyor.
        </div>
      ) : null}

      {hasMore ? (
        <button
          type="button"
          onClick={() => void handleLoadMore()}
          disabled={loadingMore}
          className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm disabled:opacity-60"
        >
          {loadingMore ? 'Yükleniyor...' : 'Daha Fazla Yükle'}
        </button>
      ) : null}

      {(detailLoading || detailError || selectedCustomer) ? (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-end">
          <div className="w-full max-h-[85vh] overflow-y-auto rounded-t-2xl bg-background border-t border-border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Müşteri Profili</h2>
              <button
                type="button"
                className="h-8 w-8 grid place-items-center rounded-md border border-border"
                onClick={() => {
                  setSelectedCustomer(null);
                  setDetailError(null);
                  setDetailLoading(false);
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {detailLoading ? <p className="text-sm text-muted-foreground">Profil yükleniyor...</p> : null}
            {detailError ? <p className="text-sm text-red-500">{detailError}</p> : null}

            {selectedCustomer ? (
              <>
                <div className="rounded-lg border border-border p-3 space-y-1">
                  <p className="font-medium">{selectedCustomer.customer.name || 'İsimsiz Müşteri'}</p>
                  <p className="text-sm">{selectedCustomer.customer.phone}</p>
                  <p className="text-xs text-muted-foreground">
                    Oluşturulma: {new Date(selectedCustomer.customer.createdAt).toLocaleString('tr-TR')}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Randevu Geçmişi</p>
                  {selectedCustomer.appointments.length ? (
                    selectedCustomer.appointments.map((appointment) => (
                      <div key={appointment.id} className="rounded-lg border border-border p-3">
                        <p className="font-medium">{appointment.service.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {appointment.staff.name} • {appointment.status}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(appointment.startTime).toLocaleString('tr-TR')} -{' '}
                          {new Date(appointment.endTime).toLocaleTimeString('tr-TR')}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Henüz randevu kaydı bulunmuyor.</p>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
