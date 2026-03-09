import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface StaffItem {
  id: number;
  name: string;
  title: string | null;
  phone: string | null;
}

export function StaffCrudPage() {
  const { apiFetch } = useAuth();
  const [items, setItems] = useState<StaffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', title: '', phone: '' });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<{ items: StaffItem[] }>('/api/admin/staff');
      setItems(response.items);
    } catch (err: any) {
      setError(err?.message || 'Çalışanlar alınamadı.');
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
      const response = await apiFetch<{ item: StaffItem }>('/api/admin/staff', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setItems((prev) => [response.item, ...prev]);
      setForm({ name: '', title: '', phone: '' });
    } catch (err: any) {
      setError(err?.message || 'Çalışan eklenemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Çalışan Yönetimi</h1>
        <p className="text-xs text-muted-foreground">Temel create/read aktif.</p>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <form className="space-y-2 rounded-lg border border-border p-3" onSubmit={createItem}>
        <input className="w-full rounded-md border border-border px-3 py-2 text-sm" placeholder="Ad soyad" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
        <input className="w-full rounded-md border border-border px-3 py-2 text-sm" placeholder="Unvan" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
        <input className="w-full rounded-md border border-border px-3 py-2 text-sm" placeholder="Telefon" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
        <button type="submit" disabled={saving} className="w-full rounded-md bg-[var(--rose-gold)] px-4 py-2 text-sm text-white disabled:opacity-60">{saving ? 'Ekleniyor...' : 'Çalışan Ekle'}</button>
      </form>

      {loading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> : null}

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">#{item.id}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{item.title || 'Unvan yok'} • {item.phone || 'Telefon yok'}</p>
          </div>
        ))}
      </div>

      {!loading && !items.length ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Çalışan bulunmuyor.</div>
      ) : null}
    </div>
  );
}
