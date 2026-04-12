import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface BlacklistItem {
  id: number;
  fullName: string | null;
  phone: string | null;
  reason: string | null;
  isActive: boolean;
}

export function BlacklistPage() {
  const { apiFetch } = useAuth();
  const [items, setItems] = useState<BlacklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ fullName: '', phone: '', reason: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const load = async (search = '') => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (search.trim()) {
        query.set('search', search.trim());
      }
      const response = await apiFetch<{items: BlacklistItem[];}>(
        `/api/admin/blacklist${query.toString() ? `?${query.toString()}` : ''}`
      );
      setItems(response.items);
    } catch (err: any) {
      setError(err?.message || 'Kara liste alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(searchQuery);
  }, [searchQuery]);

  const createItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.phone.trim()) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await apiFetch<{item: BlacklistItem;}>('/api/admin/blacklist', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      setItems((prev) => [response.item, ...prev]);
      setForm({ fullName: '', phone: '', reason: '' });
    } catch (err: any) {
      setError(err?.message || 'Register eklenemedi.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (item: BlacklistItem) => {
    try {
      const response = await apiFetch<{item: BlacklistItem;}>(`/api/admin/blacklist/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !item.isActive })
      });
      setItems((prev) => prev.map((current) => current.id === item.id ? response.item : current));
    } catch (err: any) {
      setError(err?.message || 'Kayıt güncellenemedi.');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Blacklist</h1>
        <p className="text-xs text-muted-foreground">Oluştur/oku + aktif/pasif güncelleme aktif.</p>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <div className="rounded-lg border border-border bg-card p-3">
        <input
          className="w-full rounded-md border border-border px-3 py-2 text-sm"
          placeholder="Ad, telefon veya neden ile ara"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)} />
        
      </div>

      <form className="space-y-2 rounded-lg border border-border p-3" onSubmit={createItem}>
        <input className="w-full rounded-md border border-border px-3 py-2 text-sm" placeholder="Ad Soyad" value={form.fullName} onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))} />
        <input className="w-full rounded-md border border-border px-3 py-2 text-sm" placeholder="Telefon" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
        <input className="w-full rounded-md border border-border px-3 py-2 text-sm" placeholder="Neden" value={form.reason} onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))} />
        <button type="submit" disabled={saving} className="w-full rounded-md bg-[var(--rose-gold)] px-4 py-2 text-sm text-white disabled:opacity-60">{saving ? "Ekleniyor..." : "Kara Listeye Ekle"}</button>
      </form>

      {loading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> : null}

      <div className="space-y-2">
        {items.map((item) =>
        <div key={item.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">{item.fullName || item.phone || `#${item.id}`}</p>
                <p className="text-xs text-muted-foreground">{item.phone || "Telefon yok"} • {item.reason || "Sebep yok"}</p>
              </div>
              <button type="button" onClick={() => void toggle(item)} className={`rounded-md border px-2 py-1 text-xs ${item.isActive ? 'border-red-500 text-red-500' : 'border-border text-muted-foreground'}`}>
                {item.isActive ? 'Aktif' : 'Pasif'}
              </button>
            </div>
          </div>
        )}
      </div>

      {!loading && !items.length ? <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Kara liste boş.</div> : null}
    </div>);

}