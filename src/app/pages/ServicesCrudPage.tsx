import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, ListOrdered, Pencil, Plus, Settings2, Trash2, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ServiceItem {
  id: number;
  name: string;
  category: string | null;
  categoryId?: number | null;
  categoryKey?: string | null;
  categoryName?: string | null;
  duration: number;
  price: number;
  requiresSpecialist?: boolean | null;
  serviceGroupId?: number | null;
  serviceGroupName?: string | null;
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

interface ServiceGroupItem {
  id: number;
  name: string;
  description?: string | null;
  displayOrder: number | null;
  capacity: number | null;
  sequentialRequired: boolean | null;
  preparationMinutes: number | null;
  serviceCount: number;
}

function parseNullableInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return null;
  return Math.round(numeric);
}

const COLOR_PALETTE = ['#B76E79', '#6C7BA1', '#8C6F56', '#5B8A72', '#7B6D8D', '#A86D5D', '#5E7F91', '#9A7A5C'];

function colorById(id: number) {
  return COLOR_PALETTE[Math.abs(id) % COLOR_PALETTE.length];
}

export function ServicesCrudPage() {
  const { apiFetch } = useAuth();

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [groups, setGroups] = useState<ServiceGroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({});

  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryOrderDialogOpen, setCategoryOrderDialogOpen] = useState(false);
  const [groupManagerOpen, setGroupManagerOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [editingGroup, setEditingGroup] = useState<ServiceGroupItem | null>(null);

  const [serviceForm, setServiceForm] = useState({
    name: '',
    categoryId: '',
    serviceGroupId: '',
    duration: '60',
    price: '0',
    requiresSpecialist: false,
    capacityOverride: '',
    preparationMinutes: '',
  });

  const [categoryForm, setCategoryForm] = useState({
    capacity: '1',
    sequentialRequired: false,
    bufferMinutes: '0',
    marketingDescription: '',
  });

  const [groupForm, setGroupForm] = useState({
    name: '',
    capacity: '1',
    sequentialRequired: false,
    preparationMinutes: '0',
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [servicesRes, categoriesRes, groupsRes] = await Promise.all([
        apiFetch<{ items: ServiceItem[] }>('/api/admin/services'),
        apiFetch<{ items: CategoryItem[] }>('/api/admin/service-categories'),
        apiFetch<{ items: ServiceGroupItem[] }>('/api/admin/service-groups'),
      ]);

      const sortedCategories = [...(categoriesRes.items || [])].sort(
        (a, b) => a.effectiveOrder - b.effectiveOrder || a.id - b.id,
      );
      const sortedGroups = [...(groupsRes.items || [])].sort(
        (a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999) || a.id - b.id,
      );

      setServices(servicesRes.items || []);
      setCategories(sortedCategories);
      setGroups(sortedGroups);

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
    const otherCategory = categories.find((c) => c.key === 'OTHER') || categories[0] || null;

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
      if (!targetCategory) continue;

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

  const openCreateService = (category: CategoryItem) => {
    setEditingService(null);
    setServiceForm({
      name: '',
      categoryId: String(category.id),
      serviceGroupId: '',
      duration: '60',
      price: '0',
      requiresSpecialist: false,
      capacityOverride: '',
      preparationMinutes: '',
    });
    setServiceDialogOpen(true);
  };

  const openEditService = (item: ServiceItem) => {
    setEditingService(item);
    setServiceForm({
      name: item.name,
      categoryId: item.categoryId ? String(item.categoryId) : '',
      serviceGroupId: item.serviceGroupId ? String(item.serviceGroupId) : '',
      duration: String(item.duration || 60),
      price: String(item.price || 0),
      requiresSpecialist: Boolean(item.requiresSpecialist),
      capacityOverride:
        item.capacityOverride === null || item.capacityOverride === undefined ? '' : String(item.capacityOverride),
      preparationMinutes:
        item.bufferOverride === null || item.bufferOverride === undefined ? '' : String(item.bufferOverride),
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
    setCategoryOrderDialogOpen(false);
    setGroupDialogOpen(false);
    setEditingService(null);
    setEditingCategory(null);
    setEditingGroup(null);
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
      category: category?.key || 'OTHER',
      categoryId,
      serviceGroupId: serviceForm.serviceGroupId ? Number(serviceForm.serviceGroupId) : null,
      duration,
      price,
      requiresSpecialist: serviceForm.requiresSpecialist,
      capacityOverride: parseNullableInt(serviceForm.capacityOverride),
      sequentialOverride: null,
      bufferOverride: parseNullableInt(serviceForm.preparationMinutes),
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
      await load();
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
      await apiFetch(`/api/admin/service-categories/${editingCategory.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          capacity,
          sequentialRequired: categoryForm.sequentialRequired,
          bufferMinutes,
          marketingDescription: categoryForm.marketingDescription,
        }),
      });

      setCategoryDialogOpen(false);
      setEditingCategory(null);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Kategori ayarları kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const moveCategory = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= categories.length) return;

    const next = [...categories];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setCategories(next);

    try {
      await apiFetch('/api/admin/service-categories/reorder', {
        method: 'POST',
        body: JSON.stringify({ orderedIds: next.map((item) => item.id) }),
      });
    } catch (err: any) {
      setError(err?.message || 'Kategori sırası kaydedilemedi.');
      await load();
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

  const openCreateGroup = () => {
    setEditingGroup(null);
    setGroupForm({
      name: '',
      capacity: '1',
      sequentialRequired: false,
      preparationMinutes: '0',
    });
    setGroupDialogOpen(true);
  };

  const openEditGroup = (group: ServiceGroupItem) => {
    setEditingGroup(group);
    setGroupForm({
      name: group.name,
      capacity: String(group.capacity ?? 1),
      sequentialRequired: Boolean(group.sequentialRequired),
      preparationMinutes: String(group.preparationMinutes ?? 0),
    });
    setGroupDialogOpen(true);
  };

  const saveGroup = async (event: FormEvent) => {
    event.preventDefault();

    if (!groupForm.name.trim()) {
      setError('Grup adı zorunlu.');
      return;
    }

    const capacity = Number(groupForm.capacity);
    const preparationMinutes = Number(groupForm.preparationMinutes);
    if (!Number.isInteger(capacity) || capacity <= 0) {
      setError('Grup kapasitesi pozitif bir tam sayı olmalı.');
      return;
    }
    if (!Number.isInteger(preparationMinutes) || preparationMinutes < 0) {
      setError('Hazırlık süresi sıfır veya pozitif tam sayı olmalı.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      name: groupForm.name.trim(),
      capacity,
      sequentialRequired: groupForm.sequentialRequired,
      preparationMinutes,
    };

    try {
      if (editingGroup) {
        await apiFetch(`/api/admin/service-groups/${editingGroup.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/admin/service-groups', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setGroupDialogOpen(false);
      setEditingGroup(null);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Grup kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const moveGroup = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= groups.length) return;

    const next = [...groups];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setGroups(next);

    try {
      await apiFetch('/api/admin/service-groups/reorder', {
        method: 'POST',
        body: JSON.stringify({ orderedIds: next.map((item) => item.id) }),
      });
    } catch (err: any) {
      setError(err?.message || 'Grup sırası kaydedilemedi.');
      await load();
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Hizmet Yönetimi</h1>
        <p className="text-sm text-muted-foreground">Hizmetler ve kategoriler</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryOrderDialogOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
        >
          <ListOrdered className="h-4 w-4" />
          Kategori Sırası
        </button>

        <button
          type="button"
          onClick={() => setGroupManagerOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
        >
          <Layers className="h-4 w-4" />
          Hizmet Grupları
        </button>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> : null}

      {!loading ? (
        <div className="space-y-3 pb-20">
          {categories.map((category) => {
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

                  <span className="ml-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground whitespace-nowrap leading-none">
                    {categoryItems.length} hizmet
                  </span>

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
                          <div className="h-8 w-8 rounded-lg" style={{ backgroundColor: colorById(item.id) }} />

                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.duration} dk &nbsp;&nbsp; ₺{item.price}
                              {item.serviceGroupName ? ` • ${item.serviceGroupName}` : ''}
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
              </label>

              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Hizmet Grubu (opsiyonel)</span>
                <select
                  value={serviceForm.serviceGroupId}
                  onChange={(event) => setServiceForm((prev) => ({ ...prev, serviceGroupId: event.target.value }))}
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm"
                >
                  <option value="">Grup seçmeden devam et</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
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
                  />
                </label>

                <label className="block text-sm space-y-1">
                  <span className="text-muted-foreground">Randevular arası hazırlık süresi (dk, opsiyonel)</span>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={serviceForm.preparationMinutes}
                    onChange={(event) => setServiceForm((prev) => ({ ...prev, preparationMinutes: event.target.value }))}
                    className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm"
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
                <p className="text-xs text-muted-foreground">Bu kategoriye ait hizmetlerin eş zamanlı kapasitesini belirler.</p>
              </label>

              <label className="flex items-center justify-between text-sm gap-3 rounded-lg border border-border p-3">
                <div>
                  <p>Ardışık planlama</p>
                  <p className="text-xs text-muted-foreground">Kategori içinde çoklu hizmet seçiminde hizmetler peş peşe planlanır.</p>
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
                <p className="text-xs text-muted-foreground">Aynı personel için kategori hizmetleri arasında otomatik süre ekler.</p>
              </label>

              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Kategori açıklaması (opsiyonel)</span>
                <textarea
                  value={categoryForm.marketingDescription}
                  onChange={(event) => setCategoryForm((prev) => ({ ...prev, marketingDescription: event.target.value }))}
                  className="w-full min-h-[90px] rounded-lg border border-border bg-card px-3 py-2 text-sm"
                />
              </label>

              <button type="submit" disabled={saving} className="w-full h-11 rounded-lg bg-[var(--rose-gold)] text-white font-semibold disabled:opacity-70">
                {saving ? 'Kaydediliyor...' : 'Kategori Ayarlarını Kaydet'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {categoryOrderDialogOpen ? (
        <div className="fixed inset-0 z-40 bg-black/35 p-4">
          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-background p-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Kategori Sıralama</h2>
              <button type="button" onClick={closeDialogs} className="text-sm text-muted-foreground">Kapat</button>
            </div>

            <p className="text-xs text-muted-foreground mb-3">
              Bu sıra, randevu sayfası ve web sitesindeki kategori görünüm sırasını belirler.
            </p>

            <div className="space-y-2">
              {categories.map((category, index) => (
                <div key={category.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                  <span className="flex-1 text-sm font-medium">{category.name}</span>
                  <button
                    type="button"
                    onClick={() => void moveCategory(index, index - 1)}
                    className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted disabled:opacity-40"
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void moveCategory(index, index + 1)}
                    className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted disabled:opacity-40"
                    disabled={index === categories.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {groupManagerOpen ? (
        <div className="fixed inset-0 z-40 bg-black/35 p-4">
          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-border bg-background p-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Hizmet Grupları</h2>
              <button type="button" onClick={() => setGroupManagerOpen(false)} className="text-sm text-muted-foreground">Kapat</button>
            </div>

            <p className="text-xs text-muted-foreground mb-3">
              Gruplar ile hizmet setleri oluşturup kapasite ve ardışık planlama kuralını grup bazında yönetebilirsiniz.
            </p>

            <button
              type="button"
              onClick={openCreateGroup}
              className="mb-3 w-full h-10 rounded-lg border border-border text-sm inline-flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Yeni Grup Oluştur
            </button>

            <div className="space-y-2">
              {groups.map((group, index) => (
                <div key={group.id} className="rounded-lg border border-border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{group.name}</p>
                      <p className="text-xs text-muted-foreground">{group.serviceCount} hizmet</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void moveGroup(index, index - 1)}
                      className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted disabled:opacity-40"
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void moveGroup(index, index + 1)}
                      className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted disabled:opacity-40"
                      disabled={index === groups.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditGroup(group)}
                      className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {!groups.length ? <p className="text-sm text-muted-foreground">Henüz grup yok.</p> : null}
            </div>
          </div>
        </div>
      ) : null}

      {groupDialogOpen ? (
        <div className="fixed inset-0 z-50 bg-black/35 p-4">
          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-background p-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingGroup ? 'Grubu Düzenle' : 'Yeni Grup Oluştur'}</h2>
              <button type="button" onClick={closeDialogs} className="text-sm text-muted-foreground">Kapat</button>
            </div>

            <form className="space-y-3" onSubmit={saveGroup}>
              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Grup adı</span>
                <input
                  value={groupForm.name}
                  onChange={(event) => setGroupForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm"
                />
              </label>

              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Aynı anda kabul edilecek maksimum randevu</span>
                <input
                  type="number"
                  min={1}
                  value={groupForm.capacity}
                  onChange={(event) => setGroupForm((prev) => ({ ...prev, capacity: event.target.value }))}
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm"
                />
              </label>

              <label className="flex items-center justify-between text-sm gap-3 rounded-lg border border-border p-3">
                <div>
                  <p>Ardışık planlama</p>
                  <p className="text-xs text-muted-foreground">Grup içindeki hizmetler seçildiğinde peş peşe planlanır.</p>
                </div>
                <input
                  type="checkbox"
                  checked={groupForm.sequentialRequired}
                  onChange={(event) =>
                    setGroupForm((prev) => ({ ...prev, sequentialRequired: event.target.checked }))
                  }
                />
              </label>

              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Randevular arası hazırlık süresi (dk)</span>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={groupForm.preparationMinutes}
                  onChange={(event) =>
                    setGroupForm((prev) => ({ ...prev, preparationMinutes: event.target.value }))
                  }
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm"
                />
              </label>

              <button type="submit" disabled={saving} className="w-full h-11 rounded-lg bg-[var(--rose-gold)] text-white font-semibold disabled:opacity-70">
                {saving ? 'Kaydediliyor...' : editingGroup ? 'Güncelle' : 'Oluştur'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
