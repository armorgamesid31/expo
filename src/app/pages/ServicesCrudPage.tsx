import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Pencil, Plus, Settings2, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ServiceItem {
  id: number;
  name: string;
  description?: string | null;
  category: string | null;
  categoryId?: number | null;
  categoryKey?: string | null;
  categoryName?: string | null;
  duration: number;
  price: number;
  requiresSpecialist?: boolean | null;
  capacityOverride?: number | null;
  sequentialOverride?: boolean | null;
  bufferOverride?: number | null;
}

interface CategoryItem {
  id: number;
  key: string;
  name: string;
  defaultName: string;
  displayOrder: number | null;
  effectiveOrder: number;
  capacity: number | null;
  sequentialRequired: boolean | null;
  bufferMinutes: number | null;
  marketingDescription?: string | null;
  serviceCount: number;
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

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({});

  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    categoryId: '',
    duration: '60',
    price: '0',
    requiresSpecialist: false,
    capacityOverride: '',
    sequentialOverride: false,
    bufferOverride: '',
  });

  const [categoryForm, setCategoryForm] = useState({
    capacity: '1',
    sequentialRequired: false,
    bufferMinutes: '0',
    marketingDescription: '',
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [servicesRes, categoriesRes] = await Promise.all([
        apiFetch<{ items: ServiceItem[] }>('/api/admin/services'),
        apiFetch<{ items: CategoryItem[] }>('/api/admin/service-categories'),
      ]);

      const sortedCategories = [...(categoriesRes.items || [])].sort(
        (a, b) => a.effectiveOrder - b.effectiveOrder || a.id - b.id,
      );

      setServices(servicesRes.items || []);
      setCategories(sortedCategories);

      setExpandedCategories((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const first = sortedCategories[0];
        if (!first) return {};
        return { [first.id]: true };
      });
    } catch (err: any) {
      setError(err?.message || 'Veriler alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const groupedServices = useMemo(() => {
    const map: Record<number, ServiceItem[]> = {};
    const categoryByKey = new Map(categories.map((c) => [c.key, c]));
    const otherCategory = categories.find((c) => c.key === 'OTHER') || null;

    for (const category of categories) {
      map[category.id] = [];
    }

    for (const service of services) {
      let targetCategory: CategoryItem | null = null;

      if (service.categoryId) {
        targetCategory = categories.find((c) => c.id === service.categoryId) || null;
      }

      if (!targetCategory && service.categoryKey) {
        targetCategory = categoryByKey.get(String(service.categoryKey).toUpperCase()) || null;
      }

      if (!targetCategory && service.category) {
        targetCategory = categoryByKey.get(String(service.category).toUpperCase()) || null;
      }

      if (!targetCategory) {
        targetCategory = otherCategory;
      }

      if (!targetCategory) {
        continue;
      }

      if (!map[targetCategory.id]) {
        map[targetCategory.id] = [];
      }

      map[targetCategory.id].push(service);
    }

    for (const key of Object.keys(map)) {
      map[Number(key)].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    }

    return map;
  }, [categories, services]);

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }));
  };

  const reorderCategories = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= categories.length) {
      return;
    }

    const next = [...categories];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    setCategories(next);

    try {
      await apiFetch('/api/admin/service-categories/reorder', {
        method: 'POST',
        body: JSON.stringify({ orderedIds: next.map((c) => c.id) }),
      });
    } catch (err: any) {
      setError(err?.message || 'Kategori sırası güncellenemedi.');
      await load();
    }
  };

  const openCreateService = (category: CategoryItem) => {
    setEditingService(null);
    setServiceForm({
      name: '',
      description: '',
      categoryId: String(category.id),
      duration: '60',
      price: '0',
      requiresSpecialist: false,
      capacityOverride: '',
      sequentialOverride: false,
      bufferOverride: '',
    });
    setServiceDialogOpen(true);
  };

  const openEditService = (item: ServiceItem) => {
    setEditingService(item);
    setServiceForm({
      name: item.name,
      description: item.description || '',
      categoryId: item.categoryId ? String(item.categoryId) : '',
      duration: String(item.duration || 60),
      price: String(item.price || 0),
      requiresSpecialist: Boolean(item.requiresSpecialist),
      capacityOverride:
        item.capacityOverride === null || item.capacityOverride === undefined ? '' : String(item.capacityOverride),
      sequentialOverride: Boolean(item.sequentialOverride),
      bufferOverride: item.bufferOverride === null || item.bufferOverride === undefined ? '' : String(item.bufferOverride),
    });
    setServiceDialogOpen(true);
  };

  const openCategorySettings = (category: CategoryItem) => {
    setEditingCategory(category);
    setCategoryForm({
      capacity: String(category.capacity ?? 1),
      sequentialRequired: Boolean(category.sequentialRequired),
      bufferMinutes: String(category.bufferMinutes ?? 0),
      marketingDescription: category.marketingDescription || '',
    });
    setCategoryDialogOpen(true);
  };

  const closeDialogs = () => {
    if (saving) return;
    setServiceDialogOpen(false);
    setCategoryDialogOpen(false);
    setEditingService(null);
    setEditingCategory(null);
  };

  const saveService = async (event: FormEvent) => {
    event.preventDefault();
    if (!serviceForm.name.trim()) {
      setError('Hizmet adı zorunlu.');
      return;
    }

    const duration = Number(serviceForm.duration);
    const price = Number(serviceForm.price);
    const categoryId = Number(serviceForm.categoryId);

    if (!Number.isFinite(duration) || duration <= 0) {
      setError('Süre pozitif bir sayı olmalı.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setError('Fiyat sıfır veya pozitif olmalı.');
      return;
    }
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      setError('Kategori seçimi zorunlu.');
      return;
    }

    setSaving(true);
    setError(null);

    const category = categories.find((item) => item.id === categoryId);

    const payload = {
      name: serviceForm.name.trim(),
      description: serviceForm.description.trim() || null,
      category: category?.key || 'OTHER',
      categoryId,
      duration,
      price,
      requiresSpecialist: serviceForm.requiresSpecialist,
      capacityOverride: parseNullableInt(serviceForm.capacityOverride),
      sequentialOverride: serviceForm.sequentialOverride,
      bufferOverride: parseNullableInt(serviceForm.bufferOverride),
    };

    try {
      if (editingService) {
        const response = await apiFetch<{ item: ServiceItem }>(`/api/admin/services/${editingService.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setServices((prev) => prev.map((item) => (item.id === editingService.id ? response.item : item)));
      } else {
        const response = await apiFetch<{ item: ServiceItem }>('/api/admin/services', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setServices((prev) => [response.item, ...prev]);
      }

      setServiceDialogOpen(false);
      setEditingService(null);
    } catch (err: any) {
      setError(err?.message || 'Hizmet kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const saveCategorySettings = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingCategory) return;

    const capacity = Number(categoryForm.capacity);
    const bufferMinutes = Number(categoryForm.bufferMinutes);

    if (!Number.isInteger(capacity) || capacity <= 0) {
      setError('Kategori kapasitesi pozitif bir tam sayı olmalı.');
      return;
    }
    if (!Number.isInteger(bufferMinutes) || bufferMinutes < 0) {
      setError('Hazırlık süresi sıfır veya pozitif bir tam sayı olmalı.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await apiFetch<{ item: CategoryItem }>(`/api/admin/service-categories/${editingCategory.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          capacity,
          sequentialRequired: categoryForm.sequentialRequired,
          bufferMinutes,
          marketingDescription: categoryForm.marketingDescription,
        }),
      });

      setCategories((prev) =>
        prev.map((item) =>
          item.id === editingCategory.id
            ? {
                ...item,
                ...response.item,
              }
            : item,
        ),
      );

      setCategoryDialogOpen(false);
      setEditingCategory(null);
    } catch (err: any) {
      setError(err?.message || 'Kategori ayarları kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async (item: ServiceItem) => {
    const ok = window.confirm(`${item.name} hizmetini silmek istiyor musunuz?`);
    if (!ok) return;

    try {
      await apiFetch(`/api/admin/services/${item.id}`, { method: 'DELETE' });
      setServices((prev) => prev.filter((entry) => entry.id !== item.id));
    } catch (err: any) {
      setError(err?.message || 'Hizmet silinemedi.');
    }
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
          {categories.map((category, index) => {
            const categoryItems = groupedServices[category.id] || [];
            const expanded = Boolean(expandedCategories[category.id]);

            return (
              <div key={category.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-3">
                  <button
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    className="h-7 w-7 grid place-items-center rounded-md hover:bg-muted"
                  >
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  <button type="button" onClick={() => toggleCategory(category.id)} className="text-left font-semibold leading-tight">
                    {category.name}
                  </button>

                  <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {categoryItems.length} hizmet
                  </span>

                  <button
                    type="button"
                    onClick={() => void reorderCategories(index, index - 1)}
                    className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted disabled:opacity-40"
                    disabled={index === 0}
                    title="Kategoriyi yukarı taşı"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void reorderCategories(index, index + 1)}
                    className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted disabled:opacity-40"
                    disabled={index === categories.length - 1}
                    title="Kategoriyi aşağı taşı"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => openCategorySettings(category)}
                    className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted"
                    title="Kategori ayarları"
                  >
                    <Settings2 className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => openCreateService(category)}
                    className="inline-flex items-center gap-1 text-sm font-medium"
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

                          <button type="button" onClick={() => openEditService(item)} className="h-8 w-8 grid place-items-center text-muted-foreground hover:text-foreground">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => void deleteService(item)} className="h-8 w-8 grid place-items-center text-red-500 hover:text-red-600">
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

      {serviceDialogOpen ? (
        <div className="fixed inset-0 z-40 bg-black/35 p-4">
          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-border bg-background p-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingService ? 'Hizmeti Düzenle' : 'Yeni Hizmet Ekle'}</h2>
              <button type="button" onClick={closeDialogs} className="text-sm text-muted-foreground">Kapat</button>
            </div>

            <form className="space-y-3" onSubmit={saveService}>
              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Kategori</span>
                <select
                  value={serviceForm.categoryId}
                  onChange={(event) => setServiceForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm"
                >
                  <option value="">Kategori seçin</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">Hizmet, seçtiğiniz kategori kartı altında listelenir.</p>
              </label>

              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Hizmet Adı</span>
                <input
                  value={serviceForm.name}
                  onChange={(event) => setServiceForm((prev) => ({ ...prev, name: event.target.value }))}
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
                    value={serviceForm.duration}
                    onChange={(event) => setServiceForm((prev) => ({ ...prev, duration: event.target.value }))}
                    className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm"
                  />
                </label>

                <label className="block text-sm space-y-1">
                  <span className="text-muted-foreground">Fiyat (₺)</span>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={serviceForm.price}
                    onChange={(event) => setServiceForm((prev) => ({ ...prev, price: event.target.value }))}
                    className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm"
                  />
                </label>
              </div>

              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Açıklama (opsiyonel)</span>
                <textarea
                  value={serviceForm.description}
                  onChange={(event) => setServiceForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="w-full min-h-[70px] rounded-lg border border-border bg-card px-3 py-2 text-sm"
                />
              </label>

              <div className="rounded-lg border border-border p-3 space-y-3">
                <p className="text-sm font-medium">Hizmet Ayarları</p>

                <label className="flex items-center justify-between text-sm gap-3">
                  <div>
                    <p>Uzman seçimi zorunlu</p>
                    <p className="text-xs text-muted-foreground">Müşteri bu hizmette uzman seçmeden devam edemez.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={serviceForm.requiresSpecialist}
                    onChange={(event) => setServiceForm((prev) => ({ ...prev, requiresSpecialist: event.target.checked }))}
                  />
                </label>

                <label className="block text-sm space-y-1">
                  <span className="text-muted-foreground">Aynı anda kabul edilecek maksimum randevu (opsiyonel)</span>
                  <input
                    type="number"
                    min={1}
                    value={serviceForm.capacityOverride}
                    onChange={(event) => setServiceForm((prev) => ({ ...prev, capacityOverride: event.target.value }))}
                    className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm"
                    placeholder="Boş bırakılırsa kategori varsayılanı kullanılır"
                  />
                </label>

                <label className="flex items-center justify-between text-sm gap-3">
                  <div>
                    <p>Ardışık planlama aktif</p>
                    <p className="text-xs text-muted-foreground">Bu hizmet paketlerde peş peşe planlanır.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={serviceForm.sequentialOverride}
                    onChange={(event) => setServiceForm((prev) => ({ ...prev, sequentialOverride: event.target.checked }))}
                  />
                </label>

                <label className="block text-sm space-y-1">
                  <span className="text-muted-foreground">Randevular arası hazırlık süresi (dk, opsiyonel)</span>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={serviceForm.bufferOverride}
                    onChange={(event) => setServiceForm((prev) => ({ ...prev, bufferOverride: event.target.value }))}
                    className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm"
                    placeholder="Boş bırakılırsa kategori varsayılanı kullanılır"
                  />
                </label>
              </div>

              <button type="submit" disabled={saving} className="w-full h-11 rounded-lg bg-[var(--rose-gold)] text-white font-semibold disabled:opacity-70">
                {saving ? 'Kaydediliyor...' : editingService ? 'Güncelle' : 'Ekle'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {categoryDialogOpen && editingCategory ? (
        <div className="fixed inset-0 z-40 bg-black/35 p-4">
          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-background p-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Kategori Ayarları · {editingCategory.name}</h2>
              <button type="button" onClick={closeDialogs} className="text-sm text-muted-foreground">Kapat</button>
            </div>

            <form className="space-y-3" onSubmit={saveCategorySettings}>
              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Aynı anda kabul edilecek maksimum randevu</span>
                <input
                  type="number"
                  min={1}
                  value={categoryForm.capacity}
                  onChange={(event) => setCategoryForm((prev) => ({ ...prev, capacity: event.target.value }))}
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm"
                />
                <p className="text-xs text-muted-foreground">Bu kategoride aynı zaman diliminde kaç randevu açılabileceğini belirler.</p>
              </label>

              <label className="flex items-center justify-between text-sm gap-3 rounded-lg border border-border p-3">
                <div>
                  <p>Ardışık planlama</p>
                  <p className="text-xs text-muted-foreground">Bu kategoriye ait hizmetler paket randevularda peş peşe planlanır.</p>
                </div>
                <input
                  type="checkbox"
                  checked={categoryForm.sequentialRequired}
                  onChange={(event) => setCategoryForm((prev) => ({ ...prev, sequentialRequired: event.target.checked }))}
                />
              </label>

              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Randevular arası hazırlık süresi (dk)</span>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={categoryForm.bufferMinutes}
                  onChange={(event) => setCategoryForm((prev) => ({ ...prev, bufferMinutes: event.target.value }))}
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm"
                />
                <p className="text-xs text-muted-foreground">Aynı personel için bu kategori hizmetleri arasında otomatik ara süre bırakır.</p>
              </label>

              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Kategori açıklaması (opsiyonel)</span>
                <textarea
                  value={categoryForm.marketingDescription}
                  onChange={(event) => setCategoryForm((prev) => ({ ...prev, marketingDescription: event.target.value }))}
                  className="w-full min-h-[90px] rounded-lg border border-border bg-card px-3 py-2 text-sm"
                />
                <p className="text-xs text-muted-foreground">Web sayfası ve kampanya içeriklerinde kullanılabilir.</p>
              </label>

              <button type="submit" disabled={saving} className="w-full h-11 rounded-lg bg-[var(--rose-gold)] text-white font-semibold disabled:opacity-70">
                {saving ? 'Kaydediliyor...' : 'Kategori Ayarlarını Kaydet'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
