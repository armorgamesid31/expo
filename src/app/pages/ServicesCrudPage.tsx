import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface ServiceItem {
  id: number;
  name: string;
  category: string | null;
  duration: number;
  price: number;
}

export function ServicesCrudPage() {
  const { apiFetch } = useAuth();
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', category: 'OTHER', duration: 60, price: 0 });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<{ items: ServiceItem[] }>('/api/admin/services');
      setItems(response.items);
    } catch (err: any) {
      setError(err?.message || 'Hizmetler alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await apiFetch<{ item: ServiceItem }>('/api/admin/services', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setItems((prev) => [response.item, ...prev]);
      setForm({ name: '', category: 'OTHER', duration: 60, price: 0 });
    } catch (err: any) {
      setError(err?.message || 'Hizmet oluşturulamadı.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Hizmet Yönetimi</h1>
        <p className="text-xs text-muted-foreground">Temel create/read aktif.</p>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <form className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3" onSubmit={createItem}>
        <input className="col-span-2 rounded-md border border-border px-3 py-2 text-sm" placeholder="Hizmet adı" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
        <input className="rounded-md border border-border px-3 py-2 text-sm" placeholder="Kategori" value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} />
        <input className="rounded-md border border-border px-3 py-2 text-sm" type="number" min={5} step={5} placeholder="Süre" value={form.duration} onChange={(e) => setForm((prev) => ({ ...prev, duration: Number(e.target.value) }))} />
        <input className="col-span-2 rounded-md border border-border px-3 py-2 text-sm" type="number" min={0} step={0.01} placeholder="Fiyat" value={form.price} onChange={(e) => setForm((prev) => ({ ...prev, price: Number(e.target.value) }))} />
        <button type="submit" disabled={saving} className="col-span-2 rounded-md bg-[var(--rose-gold)] px-4 py-2 text-sm text-white disabled:opacity-60">{saving ? 'Ekleniyor...' : 'Hizmet Ekle'}</button>
      </form>

      {loading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> : null}

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">#{item.id}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{item.category || 'OTHER'} • {item.duration} dk • ₺{item.price}</p>
          </div>
        ))}
      </div>

      {!loading && !items.length ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Hizmet bulunmuyor.</div>
      ) : null}
    </div>
  );
}
