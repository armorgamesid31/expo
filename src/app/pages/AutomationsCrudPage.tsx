import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface AutomationItem {
  id: number;
  key: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
}

export function AutomationsCrudPage() {
  const { apiFetch } = useAuth();
  const [items, setItems] = useState<AutomationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ key: '', name: '', description: '' });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<{ items: AutomationItem[] }>('/api/admin/automations');
      setItems(response.items);
    } catch (err: any) {
      setError(err?.message || 'Otomasyonlar alinamadi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.key.trim() || !form.name.trim()) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await apiFetch<{ item: AutomationItem }>('/api/admin/automations', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setItems((prev) => [response.item, ...prev]);
      setForm({ key: '', name: '', description: '' });
    } catch (err: any) {
      setError(err?.message || 'Otomasyon olusturulamadi.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (item: AutomationItem) => {
    try {
      const response = await apiFetch<{ item: AutomationItem }>(`/api/admin/automations/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isEnabled: !item.isEnabled }),
      });
      setItems((prev) => prev.map((current) => (current.id === item.id ? response.item : current)));
    } catch (err: any) {
      setError(err?.message || 'Otomasyon guncellenemedi.');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Otomasyonlar</h1>
        <p className="text-xs text-muted-foreground">Create/read + toggle aktif.</p>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <form className="space-y-2 rounded-lg border border-border p-3" onSubmit={createItem}>
        <input className="w-full rounded-md border border-border px-3 py-2 text-sm" placeholder="Anahtar (reminder_24h)" value={form.key} onChange={(e) => setForm((prev) => ({ ...prev, key: e.target.value }))} />
        <input className="w-full rounded-md border border-border px-3 py-2 text-sm" placeholder="Otomasyon adi" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
        <input className="w-full rounded-md border border-border px-3 py-2 text-sm" placeholder="Aciklama" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
        <button type="submit" disabled={saving} className="w-full rounded-md bg-[var(--rose-gold)] px-4 py-2 text-sm text-white disabled:opacity-60">{saving ? 'Ekleniyor...' : 'Otomasyon Ekle'}</button>
      </form>

      {loading ? <p className="text-sm text-muted-foreground">Yukleniyor...</p> : null}

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.key}</p>
              </div>
              <button type="button" onClick={() => void toggle(item)} className={`rounded-md border px-2 py-1 text-xs ${item.isEnabled ? 'border-green-500 text-green-600' : 'border-border text-muted-foreground'}`}>
                {item.isEnabled ? 'Aktif' : 'Pasif'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{item.description || 'Aciklama yok'}</p>
          </div>
        ))}
      </div>

      {!loading && !items.length ? <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Otomasyon yok.</div> : null}
    </div>
  );
}
