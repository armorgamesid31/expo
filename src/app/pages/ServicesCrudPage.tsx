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
  isActive?: boolean | null;
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
  isActive?: boolean | null;
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
  isActive?: boolean | null;
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

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
        checked ? 'bg-[var(--rose-gold)]' : 'bg-muted-foreground/25'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function StatusToggleChip({
  active,
  onToggle,
  className = '',
}: {
  active: boolean;
  onToggle: (next: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={active ? 'Durumu pasif yap' : 'Durumu aktif yap'}
      onClick={() => onToggle(!active)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full border p-0.5 transition-colors ${
        active ? 'border-emerald-500 bg-emerald-300' : 'border-zinc-300 bg-zinc-200'
      } ${className}`}
    >
      <span
        className={`inline-block h-6 w-6 rounded-full border border-zinc-300 bg-white shadow-sm transition-transform ${
          active ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function clampInt(value: number, min: number, max: number) {
  return Math.min(Math.max(Math.round(value), min), max);
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
    isActive: true,
  });

  const [categoryForm, setCategoryForm] = useState({
    capacity: '1',
    sequentialRequired: false,
    bufferMinutes: '0',
  });
  const [categoryCapacityEnabled, setCategoryCapacityEnabled] = useState(true);
  const [categoryBufferEnabled, setCategoryBufferEnabled] = useState(true);

  const [groupForm, setGroupForm] = useState({
    name: '',
    capacity: '1',
    sequentialRequired: false,
    preparationMinutes: '0',
    isActive: true,
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
      setError(err?.message || 'Data could not be retrieved.');
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
      isActive: true,
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
      isActive: item.isActive !== false,
    });
    setServiceDialogOpen(true);
  };

  const openCategorySettings = (category: CategoryItem) => {
    setEditingCategory(category);
    setCategoryForm({
      capacity: String(category.capacity ?? 1),
      sequentialRequired: Boolean(category.sequentialRequired),
      bufferMinutes: String(category.bufferMinutes ?? 0),
    });
    setCategoryCapacityEnabled(category.capacity !== null && category.capacity !== undefined);
    setCategoryBufferEnabled(category.bufferMinutes !== null && category.bufferMinutes !== undefined);
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
      setError('Service name is required.');
      return;
    }

    const duration = Number(serviceForm.duration);
    const price = Number(serviceForm.price);
    const categoryId = Number(serviceForm.categoryId);

    if (!Number.isFinite(duration) || duration <= 0) {
      setError('Duration must be a positive number.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setError('The price must be zero or positive.');
      return;
    }
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      setError('Category selection is mandatory.');
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
      isActive: serviceForm.isActive,
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

      // Keep category-level defaults in sync with service-level numeric settings when provided.
      if (category) {
        const nextCategoryCapacity =
          payload.capacityOverride !== null ? payload.capacityOverride : category.capacity ?? 1;
        const nextCategoryBuffer =
          payload.bufferOverride !== null ? payload.bufferOverride : category.bufferMinutes ?? 0;

        await apiFetch(`/api/admin/service-categories/${category.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            capacity: nextCategoryCapacity,
            sequentialRequired: category.sequentialRequired ?? false,
            bufferMinutes: nextCategoryBuffer,
          }),
        });

        setCategories((prev) =>
          prev.map((item) =>
            item.id === category.id
              ? {
                  ...item,
                  capacity: nextCategoryCapacity,
                  bufferMinutes: nextCategoryBuffer,
                }
              : item,
          ),
        );
      }

      setServiceDialogOpen(false);
      setEditingService(null);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Service could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const saveCategorySettings = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingCategory) return;

    const updates: Record<string, unknown> = {
      sequentialRequired: categoryForm.sequentialRequired,
    };

    if (categoryCapacityEnabled) {
      const capacity = Number(categoryForm.capacity);
      if (!Number.isInteger(capacity) || capacity <= 0) {
        setError('Category capacity must be a positive integer.');
        return;
      }
      updates.capacity = capacity;
    }

    if (categoryBufferEnabled) {
      const bufferMinutes = Number(categoryForm.bufferMinutes);
      if (!Number.isInteger(bufferMinutes) || bufferMinutes < 0) {
        setError('Preparation time must be zero or a positive integer.');
        return;
      }
      updates.bufferMinutes = bufferMinutes;
    }

    setSaving(true);
    setError(null);

    try {
      await apiFetch(`/api/admin/service-categories/${editingCategory.id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      setCategoryDialogOpen(false);
      setEditingCategory(null);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Category settings could not be saved.');
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
      setError(err?.message || 'Category order could not be saved.');
      await load();
    }
  };

  const deleteService = async (item: ServiceItem) => {
    const ok = window.confirm(`${item.name} Do you want to delete this service?`);
    if (!ok) return;

    try {
      await apiFetch(`/api/admin/services/${item.id}`, { method: 'DELETE' });
      setServices((prev) => prev.filter((entry) => entry.id !== item.id));
    } catch (err: any) {
      setError(err?.message || 'Service could not be deleted.');
    }
  };

  const openCreateGroup = () => {
    setEditingGroup(null);
    setGroupForm({
      name: '',
      capacity: '1',
      sequentialRequired: false,
      preparationMinutes: '0',
      isActive: true,
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
      isActive: group.isActive !== false,
    });
    setGroupDialogOpen(true);
  };

  const saveGroup = async (event: FormEvent) => {
    event.preventDefault();

    if (!groupForm.name.trim()) {
      setError('Group name is required.');
      return;
    }

    const capacity = Number(groupForm.capacity);
    const preparationMinutes = Number(groupForm.preparationMinutes);
    if (!Number.isInteger(capacity) || capacity <= 0) {
      setError('Group capacity must be a positive integer.');
      return;
    }
    if (!Number.isInteger(preparationMinutes) || preparationMinutes < 0) {
      setError('Preparation time must be zero or a positive integer.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      name: groupForm.name.trim(),
      capacity,
      sequentialRequired: groupForm.sequentialRequired,
      preparationMinutes,
      isActive: groupForm.isActive,
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
      setError(err?.message || 'Group could not be saved.');
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
      setError(err?.message || 'Failed to save group order.');
      await load();
    }
  };

  const toggleCategoryActive = async (category: CategoryItem, next: boolean) => {
    try {
      await apiFetch(`/api/admin/service-categories/${category.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: next }),
      });
      setCategories((prev) => prev.map((item) => (item.id === category.id ? { ...item, isActive: next } : item)));
    } catch (err: any) {
      setError(err?.message || 'Category status could not be updated.');
    }
  };

  const toggleServiceActive = async (item: ServiceItem, next: boolean) => {
    try {
      await apiFetch(`/api/admin/services/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: next }),
      });
      setServices((prev) => prev.map((row) => (row.id === item.id ? { ...row, isActive: next } : row)));
    } catch (err: any) {
      setError(err?.message || 'The service status could not be updated.');
    }
  };

  const toggleGroupActive = async (group: ServiceGroupItem, next: boolean) => {
    try {
      await apiFetch(`/api/admin/service-groups/${group.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: next }),
      });
      setGroups((prev) => prev.map((item) => (item.id === group.id ? { ...item, isActive: next } : item)));
    } catch (err: any) {
      setError(err?.message || 'Group status could not be updated.');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Service Management</h1>
        <p className="text-sm text-muted-foreground">Services and categories</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryOrderDialogOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
        >
          <ListOrdered className="h-4 w-4" />
          Category Order
        </button>

        <button
          type="button"
          onClick={() => setGroupManagerOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
        >
          <Layers className="h-4 w-4" />
          Service Groups
        </button>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}

      {!loading ? (
        <div className="space-y-3 pb-20">
          {categories.map((category) => {
            const categoryItems = groupedServices[category.id] || [];
            const expanded = Boolean(expandedCategories[category.id]);

            return (
              <div key={category.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-3">
                  <button
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    className="h-7 w-7 grid place-items-center rounded-md hover:bg-muted"
                  >
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  <div className="min-w-0">
                    <button type="button" onClick={() => toggleCategory(category.id)} className="text-left font-semibold leading-tight break-words">
                      {category.name}
                    </button>
                    <div className="mt-1">
                      <span className="inline-flex rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground whitespace-nowrap leading-none">
                        {categoryItems.length} hizmet
                      </span>
                    </div>
                  </div>

                  <div className="ml-auto flex items-center gap-1.5 shrink-0">
                    <StatusToggleChip
                      active={category.isActive !== false}
                      onToggle={(next) => void toggleCategoryActive(category, next)}
                    />

                    <button
                      type="button"
                      onClick={() => openCategorySettings(category)}
                      className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted"
                      title="Category settings"
                    >
                      <Settings2 className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => openCreateService(category)}
                      className="inline-flex h-8 items-center gap-1 rounded-md px-1 text-sm font-medium hover:bg-muted"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Add</span>
                    </button>
                  </div>
                </div>

                {expanded ? (
                  <div className="border-t border-border/50">
                    {categoryItems.length === 0 ? (
                      <div className="px-4 py-4 text-sm text-muted-foreground">No services yet in this category.</div>
                    ) : (
                      categoryItems.map((item) => (
                        <div
                          key={item.id}
                          className={`grid grid-cols-[32px_minmax(0,1fr)_auto_auto_auto] items-center gap-1.5 px-4 py-3 border-b border-border/40 last:border-b-0 ${
                            item.isActive === false ? 'opacity-65' : ''
                          }`}
                        >
                          <div className="h-8 w-8 rounded-lg" style={{ backgroundColor: colorById(item.id) }} />

                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.duration} dk &nbsp;&nbsp; ₺{item.price}
                              {item.serviceGroupName ? ` • ${item.serviceGroupName}` : ''}
                            </p>
                          </div>

                          <StatusToggleChip
                            active={item.isActive !== false}
                            onToggle={(next) => void toggleServiceActive(item, next)}
                          />
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
              <h2 className="text-lg font-semibold">{editingService ? 'Edit Service' : 'New Add Service'}</h2>
              <button type="button" onClick={closeDialogs} className="text-sm text-muted-foreground">Close</button>
            </div>

            <form className="space-y-3" onSubmit={saveService}>
              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Category</span>
                <select
                  value={serviceForm.categoryId}
                  onChange={(event) => setServiceForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm"
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Service Group (optional)</span>
                <select
                  value={serviceForm.serviceGroupId}
                  onChange={(event) => setServiceForm((prev) => ({ ...prev, serviceGroupId: event.target.value }))}
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm"
                >
                  <option value="">Continue without selecting a group</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Service Name</span>
                <input
                  value={serviceForm.name}
                  onChange={(event) => setServiceForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block text-sm space-y-1">
                  <span className="text-muted-foreground">Duration (min)</span>
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
                <p className="text-sm font-medium">Service Settings</p>

                <label className="flex items-center justify-between text-sm gap-3 rounded-lg border border-border/70 bg-muted/20 p-3">
                  <div>
                    <p className="font-medium">Let customer choose specialist for this service</p>
                    <p className="text-xs text-muted-foreground">When enabled, specialist selection appears in booking flow.</p>
                  </div>
                  <ToggleSwitch
                    checked={serviceForm.requiresSpecialist}
                    onChange={(next) => setServiceForm((prev) => ({ ...prev, requiresSpecialist: next }))}
                  />
                </label>

                <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Concurrent appointment capacity</p>
                      <p className="text-xs text-muted-foreground">
                        If disabled, category setting is used; if enabled, set a custom value for this service.
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={serviceForm.capacityOverride.trim().length > 0}
                      onChange={(enabled) =>
                        setServiceForm((prev) => ({
                          ...prev,
                          capacityOverride: enabled ? prev.capacityOverride || '1' : '',
                        }))
                      }
                    />
                  </div>

                  {serviceForm.capacityOverride.trim().length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setServiceForm((prev) => {
                              const current = Number(prev.capacityOverride || '1');
                              const next = clampInt(current - 1, 1, 20);
                              return { ...prev, capacityOverride: String(next) };
                            })
                          }
                          className="h-10 w-10 rounded-xl border border-border bg-background text-xl font-semibold shadow-sm"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={serviceForm.capacityOverride}
                          onChange={(event) => setServiceForm((prev) => ({ ...prev, capacityOverride: event.target.value }))}
                          className="w-full h-10 rounded-xl border border-border bg-card px-3 text-sm text-center font-medium"
                          placeholder="1"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setServiceForm((prev) => {
                              const current = Number(prev.capacityOverride || '1');
                              const next = clampInt(current + 1, 1, 20);
                              return { ...prev, capacityOverride: String(next) };
                            })
                          }
                          className="h-10 w-10 rounded-xl border border-border bg-background text-xl font-semibold shadow-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Buffer duration (minutes)</p>
                      <p className="text-xs text-muted-foreground">
                        If disabled, category setting is used; if enabled, custom prep time is set for this service.
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={serviceForm.preparationMinutes.trim().length > 0}
                      onChange={(enabled) =>
                        setServiceForm((prev) => ({
                          ...prev,
                          preparationMinutes: enabled ? prev.preparationMinutes || '0' : '',
                        }))
                      }
                    />
                  </div>

                  {serviceForm.preparationMinutes.trim().length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setServiceForm((prev) => {
                              const current = Number(prev.preparationMinutes || '0');
                              const next = clampInt(current - 5, 0, 180);
                              return { ...prev, preparationMinutes: String(next) };
                            })
                          }
                          className="h-10 w-10 rounded-xl border border-border bg-background text-xl font-semibold shadow-sm"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={180}
                          step={5}
                          value={serviceForm.preparationMinutes}
                          onChange={(event) => setServiceForm((prev) => ({ ...prev, preparationMinutes: event.target.value }))}
                          className="w-full h-10 rounded-xl border border-border bg-card px-3 text-sm text-center font-medium"
                          placeholder="0"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setServiceForm((prev) => {
                              const current = Number(prev.preparationMinutes || '0');
                              const next = clampInt(current + 5, 0, 180);
                              return { ...prev, preparationMinutes: String(next) };
                            })
                          }
                          className="h-10 w-10 rounded-xl border border-border bg-background text-xl font-semibold shadow-sm"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">Configured in 5-minute steps.</p>
                    </div>
                  ) : null}
                </div>
              </div>

              <button type="submit" disabled={saving} className="w-full h-11 rounded-lg bg-[var(--rose-gold)] text-white font-semibold disabled:opacity-70">
                {saving ? 'Saving...' : editingService ? 'Update' : 'Add'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {categoryDialogOpen && editingCategory ? (
        <div className="fixed inset-0 z-40 bg-black/35 p-4">
          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-background p-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Category Settings · {editingCategory.name}</h2>
              <button type="button" onClick={closeDialogs} className="text-sm text-muted-foreground">Close</button>
            </div>

            <form className="space-y-3" onSubmit={saveCategorySettings}>
              <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Concurrent appointment capacity</p>
                    <p className="text-xs text-muted-foreground">Determines concurrent capacity for all services in this category.</p>
                  </div>
                  <ToggleSwitch
                    checked={categoryCapacityEnabled}
                    onChange={(next) => setCategoryCapacityEnabled(next)}
                  />
                </div>
                {categoryCapacityEnabled ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCategoryForm((prev) => {
                        const current = Number(prev.capacity || '1');
                        const next = clampInt(current - 1, 1, 20);
                        return { ...prev, capacity: String(next) };
                      })
                    }
                    className="h-10 w-10 rounded-xl border border-border bg-background text-xl font-semibold shadow-sm"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={categoryForm.capacity}
                    onChange={(event) => setCategoryForm((prev) => ({ ...prev, capacity: event.target.value }))}
                    className="w-full h-10 rounded-xl border border-border bg-card px-3 text-sm text-center font-medium"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setCategoryForm((prev) => {
                        const current = Number(prev.capacity || '1');
                        const next = clampInt(current + 1, 1, 20);
                        return { ...prev, capacity: String(next) };
                      })
                    }
                    className="h-10 w-10 rounded-xl border border-border bg-background text-xl font-semibold shadow-sm"
                  >
                    +
                  </button>
                </div>
                ) : (
                  <p className="text-xs text-muted-foreground">When disabled, current category capacity is preserved.</p>
                )}
              </div>

              <label className="flex items-center justify-between text-sm gap-3 rounded-lg border border-border/70 bg-muted/20 p-3">
                <div>
                  <p className="font-medium">Sequential scheduling</p>
                  <p className="text-xs text-muted-foreground">For multi-service selection in a category, services are scheduled sequentially.</p>
                </div>
                <ToggleSwitch
                  checked={categoryForm.sequentialRequired}
                  onChange={(next) => setCategoryForm((prev) => ({ ...prev, sequentialRequired: next }))}
                />
              </label>

              <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Buffer duration (minutes)</p>
                    <p className="text-xs text-muted-foreground">Adds automatic buffer between this category’s services for the same staff member.</p>
                  </div>
                  <ToggleSwitch
                    checked={categoryBufferEnabled}
                    onChange={(next) => setCategoryBufferEnabled(next)}
                  />
                </div>
                {categoryBufferEnabled ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCategoryForm((prev) => {
                        const current = Number(prev.bufferMinutes || '0');
                        const next = clampInt(current - 5, 0, 180);
                        return { ...prev, bufferMinutes: String(next) };
                      })
                    }
                    className="h-10 w-10 rounded-xl border border-border bg-background text-xl font-semibold shadow-sm"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={180}
                    step={5}
                    value={categoryForm.bufferMinutes}
                    onChange={(event) => setCategoryForm((prev) => ({ ...prev, bufferMinutes: event.target.value }))}
                    className="w-full h-10 rounded-xl border border-border bg-card px-3 text-sm text-center font-medium"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setCategoryForm((prev) => {
                        const current = Number(prev.bufferMinutes || '0');
                        const next = clampInt(current + 5, 0, 180);
                        return { ...prev, bufferMinutes: String(next) };
                      })
                    }
                    className="h-10 w-10 rounded-xl border border-border bg-background text-xl font-semibold shadow-sm"
                  >
                    +
                  </button>
                </div>
                ) : (
                  <p className="text-xs text-muted-foreground">When disabled, current category buffer duration is preserved.</p>
                )}
                {categoryBufferEnabled ? <p className="text-xs text-muted-foreground">Configured in 5-minute steps.</p> : null}
              </div>

              <button type="submit" disabled={saving} className="w-full h-11 rounded-lg bg-[var(--rose-gold)] text-white font-semibold disabled:opacity-70">
                {saving ? 'Saving...' : 'Save Category Settings'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {categoryOrderDialogOpen ? (
        <div className="fixed inset-0 z-40 bg-black/35 p-4">
          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-background p-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Category Sorting</h2>
              <button type="button" onClick={closeDialogs} className="text-sm text-muted-foreground">Close</button>
            </div>

            <p className="text-xs text-muted-foreground mb-3">
              This order determines category display on appointment page and website.
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
              <h2 className="text-lg font-semibold">Service Groups</h2>
              <button type="button" onClick={() => setGroupManagerOpen(false)} className="text-sm text-muted-foreground">Close</button>
            </div>

            <p className="text-xs text-muted-foreground mb-3">
              Create service sets with groups and manage capacity and sequential planning per group.
            </p>

            <button
              type="button"
              onClick={openCreateGroup}
              className="mb-3 w-full h-10 rounded-lg border border-border text-sm inline-flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create New Group
            </button>

            <div className="space-y-2">
              {groups.map((group, index) => (
                <div key={group.id} className={`rounded-lg border border-border px-3 py-2 ${group.isActive === false ? 'opacity-65' : ''}`}>
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
                    <StatusToggleChip
                      active={group.isActive !== false}
                      onToggle={(next) => void toggleGroupActive(group, next)}
                    />
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

              {!groups.length ? <p className="text-sm text-muted-foreground">No groups yet.</p> : null}
            </div>
          </div>
        </div>
      ) : null}

      {groupDialogOpen ? (
        <div className="fixed inset-0 z-50 bg-black/35 p-4">
          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-background p-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingGroup ? 'Edit Group' : 'Create New Group'}</h2>
              <button type="button" onClick={closeDialogs} className="text-sm text-muted-foreground">Close</button>
            </div>

            <form className="space-y-3" onSubmit={saveGroup}>
              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Group name</span>
                <input
                  value={groupForm.name}
                  onChange={(event) => setGroupForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm"
                />
              </label>

              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Maximum concurrent appointments accepted</span>
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
                  <p>Sequential scheduling</p>
                  <p className="text-xs text-muted-foreground">When services in a group are selected, they are scheduled one after another.</p>
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
                <span className="text-muted-foreground">Buffer between appointments (min)</span>
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
                {saving ? 'Saving...' : editingGroup ? 'Update' : 'Create'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
