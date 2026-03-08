import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface CampaignItem {
  id: number;
  name: string;
  type: string;
  description: string | null;
  isActive: boolean;
}

export function CampaignsCrudPage() {
  const { apiFetch } = useAuth();
  const [items, setItems] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', type: 'LOYALTY', description: '' });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<{ items: CampaignItem[] }>('/api/admin/campaigns');
      setItems(response.items);
    } catch (err: any) {
      setError(err?.message || 'Kampanyalar alinamadi.');
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
      const response = await apiFetch<{ item: CampaignItem }>('/api/admin/campaigns', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setItems((prev) => [response.item, ...prev]);
      setForm({ name: '', type: 'LOYALTY', description: '' });
    } catch (err: any) {
      setError(err?.message || 'Kampanya olusturulamadi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Kampanyalar</h1>
        <p className="text-xs text-muted-foreground">Temel create/read aktif.</p>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <form className="space-y-2 rounded-lg border border-border p-3" onSubmit={createItem}>
        <input className="w-full rounded-md border border-border px-3 py-2 text-sm" placeholder="Kampanya adi" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
        <input className="w-full rounded-md border border-border px-3 py-2 text-sm" placeholder="Tip (LOYALTY, REFERRAL...)" value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))} />
        <input className="w-full rounded-md border border-border px-3 py-2 text-sm" placeholder="Aciklama" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
        <button type="submit" disabled={saving} className="w-full rounded-md bg-[var(--rose-gold)] px-4 py-2 text-sm text-white disabled:opacity-60">{saving ? 'Ekleniyor...' : 'Kampanya Ekle'}</button>
      </form>

      {loading ? <p className="text-sm text-muted-foreground">Yukleniyor...</p> : null}

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">{item.name}</p>
              <span className={`text-xs ${item.isActive ? 'text-green-600' : 'text-muted-foreground'}`}>{item.isActive ? 'Aktif' : 'Pasif'}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{item.type} • {item.description || 'Aciklama yok'}</p>
          </div>
        ))}
      </div>

      {!loading && !items.length ? <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Kampanya yok.</div> : null}
    </div>
  );
}
