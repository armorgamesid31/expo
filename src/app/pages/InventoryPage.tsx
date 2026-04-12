import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface InventoryItem {
  id: number;
  name: string;
  category: string | null;
  unit: string;
  currentStock: number;
  minStock: number;
  lowStock: boolean;
}

export function InventoryPage() {
  const { apiFetch } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', category: '', unit: 'adet', currentStock: 0, minStock: 0 });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<{items: InventoryItem[];}>('/api/admin/inventory/items');
      setItems(response.items);
    } catch (err: any) {
      setError(err?.message || "Envanter verileri alınamadı.");
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
      await apiFetch('/api/admin/inventory/items', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      setForm({ name: '', category: '', unit: 'adet', currentStock: 0, minStock: 0 });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Ürün eklenemedi.');
    } finally {
      setSaving(false);
    }
  };

  const adjust = async (id: number, type: 'IN' | 'OUT') => {
    try {
      await apiFetch(`/api/admin/inventory/items/${id}/adjust`, {
        method: 'POST',
        body: JSON.stringify({ type, quantity: 1 })
      });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Stok güncellenemedi.');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Envanter</h1>
        <p className="text-xs text-muted-foreground">Stok create/read + hareket dayscelleme aktif.</p>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <form className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3" onSubmit={createItem}>
        <input className="col-span-2 rounded-md border border-border px-3 py-2 text-sm" placeholder="Ürün adı" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
        <input className="rounded-md border border-border px-3 py-2 text-sm" placeholder="Kategori" value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} />
        <input className="rounded-md border border-border px-3 py-2 text-sm" placeholder="Birim" value={form.unit} onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))} />
        <input className="rounded-md border border-border px-3 py-2 text-sm" type="number" min={0} placeholder="başlangıç stoku" value={form.currentStock} onChange={(e) => setForm((prev) => ({ ...prev, currentStock: Number(e.target.value) }))} />
        <input className="rounded-md border border-border px-3 py-2 text-sm" type="number" min={0} placeholder="Min stok" value={form.minStock} onChange={(e) => setForm((prev) => ({ ...prev, minStock: Number(e.target.value) }))} />
        <button type="submit" disabled={saving} className="col-span-2 rounded-md bg-[var(--rose-gold)] px-4 py-2 text-sm text-white disabled:opacity-60">{saving ? "Ekleniyor..." : "Ürün Ekle"}</button>
      </form>

      {loading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> : null}

      <div className="space-y-2">
        {items.map((item) =>
        <div key={item.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">{item.name}</p>
              <span className={`text-xs ${item.lowStock ? 'text-red-500' : 'text-green-600'}`}>{item.lowStock ? 'Düşük stok' : 'Normal'}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{item.category || 'Genel'} • {item.currentStock} {item.unit} (min {item.minStock})</p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => void adjust(item.id, 'OUT')} className="rounded-md border border-border px-2 py-1 text-xs">-1</button>
              <button type="button" onClick={() => void adjust(item.id, 'IN')} className="rounded-md border border-border px-2 py-1 text-xs">+1</button>
            </div>
          </div>
        )}
      </div>

      {!loading && !items.length ?
      <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Envanter boş.</div> :
      null}
    </div>);

}