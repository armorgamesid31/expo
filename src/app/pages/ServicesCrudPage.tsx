import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ServiceItem {
  id: number;
  name: string;
  description?: string | null;
  category: string | null;
  duration: number;
  price: number;
  requiresSpecialist?: boolean | null;
  categoryId?: number | null;
  capacityOverride?: number | null;
  sequentialOverride?: boolean | null;
  bufferOverride?: number | null;
}

const CATEGORY_ORDER = ['HAIR', 'NAIL', 'SKIN', 'LASH_BROW', 'BODY', 'MEDICAL', 'LASER', 'WAX', 'OTHER'] as const;

const CATEGORY_LABELS: Record<string, string> = {
  HAIR: 'Saç',
  NAIL: 'Tırnak',
  SKIN: 'Cilt Bakımı',
  LASH_BROW: 'Kaş & Kirpik',
  BODY: 'Vücut Bakımı',
  MEDICAL: 'Medikal',
  LASER: 'Lazer',
  WAX: 'Ağda',
  OTHER: 'Diğer',
};

function normalizeCategory(raw: string | null | undefined): string {
  const value = (raw || '').trim().toUpperCase();
  if (CATEGORY_LABELS[value]) {
    return value;
  }

  if (value.includes('SAÇ') || value.includes('SAC')) return 'HAIR';
  if (value.includes('TIRNAK') || value.includes('NAIL')) return 'NAIL';
  if (value.includes('CILT') || value.includes('SKIN')) return 'SKIN';
  if (value.includes('KIRPIK') || value.includes('KAS') || value.includes('LASH') || value.includes('BROW')) return 'LASH_BROW';
  if (value.includes('VUCUT') || value.includes('BODY')) return 'BODY';
  if (value.includes('MEDIKAL') || value.includes('MEDICAL')) return 'MEDICAL';
  if (value.includes('LAZER') || value.includes('LASER')) return 'LASER';
  if (value.includes('AGDA') || value.includes('WAX')) return 'WAX';

  return 'OTHER';
}

function parseNullableInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return null;
  return Math.round(numeric);
}

export function ServicesCrudPage() {
  const { apiFetch } = useAuth();

  const [items, setItems] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({ HAIR: true });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceItem | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'HAIR',
    duration: '60',
    price: '0',
    requiresSpecialist: false,
    capacityOverride: '',
    sequentialOverride: false,
    bufferOverride: '',
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<{ items: ServiceItem[] }>('/api/admin/services');
      setItems(response.items || []);
    } catch (err: any) {
      setError(err?.message || 'Hizmetler alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, ServiceItem[]> = {};
    for (const category of CATEGORY_ORDER) {
      map[category] = [];
    }

    for (const item of items) {
      const key = normalizeCategory(item.category);
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }

    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    }

    return map;
  }, [items]);

  const openCreate = (category: string) => {
    setEditingItem(null);
    setForm({
      name: '',
      description: '',
      category,
      duration: '60',
      price: '0',
      requiresSpecialist: false,
      capacityOverride: '',
      sequentialOverride: false,
      bufferOverride: '',
    });
    setDialogOpen(true);
  };

  const openEdit = (item: ServiceItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description || '',
      category: normalizeCategory(item.category),
      duration: String(item.duration || 60),
      price: String(item.price || 0),
      requiresSpecialist: Boolean(item.requiresSpecialist),
      capacityOverride: item.capacityOverride === null || item.capacityOverride === undefined ? '' : String(item.capacityOverride),
      sequentialOverride: Boolean(item.sequentialOverride),
      bufferOverride: item.bufferOverride === null || item.bufferOverride === undefined ? '' : String(item.bufferOverride),
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    setEditingItem(null);
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('Hizmet adı zorunlu.');
      return;
    }

    const duration = Number(form.duration);
    const price = Number(form.price);
    if (!Number.isFinite(duration) || duration <= 0) {
      setError('Süre pozitif bir sayı olmalı.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setError('Fiyat sıfır veya pozitif olmalı.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category,
      duration,
      price,
      requiresSpecialist: form.requiresSpecialist,
      capacityOverride: parseNullableInt(form.capacityOverride),
      sequentialOverride: form.sequentialOverride,
      bufferOverride: parseNullableInt(form.bufferOverride),
    };

    try {
      if (editingItem) {
        const response = await apiFetch<{ item: ServiceItem }>(`/api/admin/services/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setItems((prev) => prev.map((item) => (item.id === editingItem.id ? response.item : item)));
      } else {
        const response = await apiFetch<{ item: ServiceItem }>('/api/admin/services', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setItems((prev) => [response.item, ...prev]);
      }

      setDialogOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      setError(err?.message || 'Hizmet kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: ServiceItem) => {
    const ok = window.confirm(`${item.name} hizmetini silmek istiyor musunuz?`);
    if (!ok) {
      return;
    }

    try {
      await apiFetch(`/api/admin/services/${item.id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    } catch (err: any) {
      setError(err?.message || 'Hizmet silinemedi.');
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Hizmet Yönetimi</h1>
        <p className="text-sm text-muted-foreground">Hizmetler ve kategoriler</p>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      {loading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> : null}

      {!loading ? (
        <div className="space-y-3 pb-20">
          {CATEGORY_ORDER.map((category) => {
            const categoryItems = grouped[category] || [];
            const expanded = Boolean(expandedCategories[category]);

            return (
              <div key={category} className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-3">
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className="h-7 w-7 grid place-items-center rounded-md hover:bg-muted"
                  >
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className="text-left font-semibold leading-tight"
                  >
                    {CATEGORY_LABELS[category]}
                  </button>

                  <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {categoryItems.length} hizmet
                  </span>

                  <button
                    type="button"
                    onClick={() => openCreate(category)}
                    className="ml-auto inline-flex items-center gap-1 text-sm font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    Ekle
                  </button>
                </div>

                {expanded ? (
                  <div className="border-t border-border/50">
                    {categoryItems.length === 0 ? (
                      <div className="px-4 py-4 text-sm text-muted-foreground">Bu kategoride henüz hizmet yok.</div>
                    ) : (
                      categoryItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-b-0">
                          <div className="h-8 w-8 rounded-lg bg-[var(--rose-gold)]/85" />

                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.duration} dk &nbsp;&nbsp; ₺{item.price}
                            </p>
                          </div>

                          <button type="button" onClick={() => openEdit(item)} className="h-8 w-8 grid place-items-center text-muted-foreground hover:text-foreground">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => void handleDelete(item)} className="h-8 w-8 grid place-items-center text-red-500 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {dialogOpen ? (
        <div className="fixed inset-0 z-40 bg-black/35 p-4">
          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-background p-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingItem ? 'Hizmeti Düzenle' : 'Yeni Hizmet Ekle'}</h2>
              <button type="button" onClick={closeDialog} className="text-sm text-muted-foreground">
                Kapat
              </button>
            </div>

            <form className="space-y-3" onSubmit={handleSave}>
              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Kategori</span>
                <select
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm"
                >
                  {CATEGORY_ORDER.map((category) => (
                    <option key={category} value={category}>
                      {CATEGORY_LABELS[category]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Hizmet Adı</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block text-sm space-y-1">
                  <span className="text-muted-foreground">Süre (dk)</span>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={form.duration}
                    onChange={(event) => setForm((prev) => ({ ...prev, duration: event.target.value }))}
                    className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm"
                  />
                </label>

                <label className="block text-sm space-y-1">
                  <span className="text-muted-foreground">Fiyat (₺)</span>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={form.price}
                    onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                    className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm"
                  />
                </label>
              </div>

              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Açıklama (opsiyonel)</span>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="w-full min-h-[70px] rounded-lg border border-border bg-card px-3 py-2 text-sm"
                />
              </label>

              <div className="rounded-lg border border-border p-3 space-y-3">
                <p className="text-sm font-medium">Ayarlar</p>

                <label className="flex items-center justify-between text-sm">
                  <span>Uzman seçimi zorunlu</span>
                  <input
                    type="checkbox"
                    checked={form.requiresSpecialist}
                    onChange={(event) => setForm((prev) => ({ ...prev, requiresSpecialist: event.target.checked }))}
                  />
                </label>

                <label className="block text-sm space-y-1">
                  <span className="text-muted-foreground">Kapasite (opsiyonel)</span>
                  <input
                    type="number"
                    min={1}
                    value={form.capacityOverride}
                    onChange={(event) => setForm((prev) => ({ ...prev, capacityOverride: event.target.value }))}
                    className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm"
                    placeholder="Örn: 1"
                  />
                </label>

                <label className="flex items-center justify-between text-sm">
                  <span>Ardışık planlama</span>
                  <input
                    type="checkbox"
                    checked={form.sequentialOverride}
                    onChange={(event) => setForm((prev) => ({ ...prev, sequentialOverride: event.target.checked }))}
                  />
                </label>

                <label className="block text-sm space-y-1">
                  <span className="text-muted-foreground">Buffer dakika (opsiyonel)</span>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={form.bufferOverride}
                    onChange={(event) => setForm((prev) => ({ ...prev, bufferOverride: event.target.value }))}
                    className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm"
                    placeholder="Örn: 10"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full h-11 rounded-lg bg-[var(--rose-gold)] text-white font-semibold disabled:opacity-70"
              >
                {saving ? 'Kaydediliyor...' : editingItem ? 'Güncelle' : 'Ekle'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
