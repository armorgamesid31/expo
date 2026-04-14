import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNavigator } from '../context/NavigatorContext';

interface ServiceItem {
  id: number;
  name: string;
  categoryId?: number | null;
  categoryKey?: string | null;
  categoryName?: string | null;
  duration: number;
  price: number;
}

interface CategoryItem {
  id: number;
  key: string;
  name: string;
  effectiveOrder: number;
}

interface StaffServiceItem {
  serviceId: number;
  name: string;
  categoryKey: string;
  categoryName: string;
  defaultPrice: number;
  defaultDuration: number;
  customPrice: number | null;
  customDuration: number | null;
  effectivePrice: number;
  effectiveDuration: number;
  gender?: string | null;
}

interface StaffItem {
  id: number;
  name: string;
  title: string | null;
  phone?: string | null;
  bio?: string | null;
  profileImageUrl?: string | null;
  themeColor?: string | null;
  serviceCount?: number;
  services: StaffServiceItem[];
}

type StaffDraftService = {
  selected: boolean;
  useCustomPrice: boolean;
  customPrice: string;
  useCustomDuration: boolean;
  customDuration: string;
  gender: 'female' | 'male' | 'other';
};

const PALETTE = ['#B76E79', '#6C7BA1', '#8C6F56', '#5B8A72', '#7B6D8D', '#A86D5D', '#5E7F91', '#9A7A5C'];

function colorBySeed(seed: number) {
  return PALETTE[Math.abs(seed) % PALETTE.length];
}

function toHexColor(value: string | null | undefined, seed: number): string {
  if (!value) {
    return colorBySeed(seed);
  }
  const normalized = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized.toUpperCase() : colorBySeed(seed);
}

function formatPrice(value: number) {
  return `₺${value}`;
}

function ToggleSwitch({
  checked,
  onChange
}: { checked: boolean; onChange: (next: boolean) => void; }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-[var(--rose-gold)]' : 'bg-muted-foreground/25'}`
      }>
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`
        } />
    </button>);
}

export function StaffCrudPage() {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();

  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: '',
    title: '',
    phone: ''
  });

  const [serviceDrafts, setServiceDrafts] = useState<Record<number, StaffDraftService>>({});

  const categoryOrderMap = useMemo(() => {
    return new Map(categories.map((item) => [item.key, item.effectiveOrder]));
  }, [categories]);

  const groupedServices = useMemo(() => {
    const groups = new Map<string, { title: string; order: number; items: ServiceItem[]; }>();

    for (const service of services) {
      const key = String(service.categoryKey || 'OTHER').toUpperCase();
      const title = service.categoryName || 'Diğer';
      const order = categoryOrderMap.get(key) ?? 999;

      if (!groups.has(key)) {
        groups.set(key, { title, order, items: [] });
      }

      groups.get(key)!.items.push(service);
    }

    return Array.from(groups.entries()).
      map(([key, group]) => ({ key, ...group, items: group.items.sort((a, b) => a.name.localeCompare(b.name, 'tr')) })).
      sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'tr'));
  }, [services, categoryOrderMap]);

  const selectedServiceCount = useMemo(
    () => Object.values(serviceDrafts).filter((item) => item.selected).length,
    [serviceDrafts]
  );

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const [staffRes, servicesRes, categoriesRes] = await Promise.all([
        apiFetch<{ items: StaffItem[]; }>('/api/admin/staff'),
        apiFetch<{ items: ServiceItem[]; }>('/api/admin/services'),
        apiFetch<{ items: CategoryItem[]; }>('/api/admin/service-categories')]
      );

      setStaff((staffRes.items || []).sort((a, b) => a.name.localeCompare(b.name, 'tr')));
      setServices(servicesRes.items || []);
      setCategories((categoriesRes.items || []).sort((a, b) => a.effectiveOrder - b.effectiveOrder || a.id - b.id));
    } catch (err: any) {
      setError(err?.message || 'Personel verileri alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  const { setHeaderTitle, setHeaderActions } = useNavigator();

  useEffect(() => {
    setHeaderTitle('Personel Yönetimi');
    setHeaderActions(
      <button
        type="button"
        onClick={openCreate}
        className="h-10 px-4 rounded-xl bg-[var(--rose-gold)] text-white inline-flex items-center gap-2 font-bold shadow-lg border-0 transition-all active:scale-95"
      >
        <Plus className="h-4 w-4" />
        <span>Ekle</span>
      </button>
    );
    return () => {
      setHeaderTitle(null);
      setHeaderActions(null);
    };
  }, [setHeaderTitle, setHeaderActions]);

  useEffect(() => {
    void load();
  }, []);

  const resetDrafts = (nextServices: ServiceItem[], preset?: StaffItem) => {
    const draft: Record<number, StaffDraftService> = {};
    const assignedMap = new Map<number, StaffServiceItem>((preset?.services || []).map((item) => [item.serviceId, item]));

    for (const service of nextServices) {
      const assigned = assignedMap.get(service.id);
      const assignedGender = assigned?.gender === 'male' || assigned?.gender === 'other' ? assigned.gender : 'female';
      draft[service.id] = {
        selected: Boolean(assigned),
        useCustomPrice: assigned?.customPrice !== null && assigned?.customPrice !== undefined,
        customPrice:
          assigned?.customPrice !== null && assigned?.customPrice !== undefined ? String(assigned.customPrice) : String(service.price),
        useCustomDuration: assigned?.customDuration !== null && assigned?.customDuration !== undefined,
        customDuration:
          assigned?.customDuration !== null && assigned?.customDuration !== undefined ?
            String(assigned.customDuration) :
            String(service.duration),
        gender: assignedGender
      };
    }

    setServiceDrafts(draft);
  };

  const openCreate = () => {
    setEditingStaffId(null);
    setForm({ name: '', title: '', phone: '' });
    resetDrafts(services);
    setModalOpen(true);
    setError(null);
  };

  const openEdit = (item: StaffItem) => {
    setEditingStaffId(item.id);
    setForm({
      name: item.name,
      title: item.title || '',
      phone: item.phone || ''
    });
    resetDrafts(services, item);
    setModalOpen(true);
    setError(null);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingStaffId(null);
  };

  const toggleServiceSelected = (serviceId: number, selected: boolean) => {
    setServiceDrafts((prev) => {
      const current = prev[serviceId] || {
        selected: false,
        useCustomPrice: false,
        customPrice: '',
        useCustomDuration: false,
        customDuration: ''
      };

      return {
        ...prev,
        [serviceId]: {
          ...current,
          selected
        }
      };
    });
  };

  const updateDraftField = (serviceId: number, field: keyof StaffDraftService, value: string | boolean) => {
    setServiceDrafts((prev) => {
      const current = prev[serviceId];
      if (!current) return prev;

      return {
        ...prev,
        [serviceId]: {
          ...current,
          [field]: value
        }
      };
    });
  };

  const buildAssignmentsPayload = () => {
    const serviceMap = new Map(services.map((item) => [item.id, item]));
    const payload: Array<{ serviceId: number; customPrice: number | null; customDuration: number | null; gender: string; }> = [];

    for (const [serviceIdString, draft] of Object.entries(serviceDrafts)) {
      const serviceId = Number(serviceIdString);
      const service = serviceMap.get(serviceId);
      if (!service || !draft.selected) {
        continue;
      }

      let customPrice: number | null = null;
      if (draft.useCustomPrice) {
        const parsed = Number(draft.customPrice);
        if (!Number.isFinite(parsed) || parsed < 0) {
          throw new Error(`${service.name} için geçersiz özel fiyat.`);
        }
        customPrice = parsed;
      }

      let customDuration: number | null = null;
      if (draft.useCustomDuration) {
        const parsed = Number(draft.customDuration);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          throw new Error(`${service.name} için geçersiz özel süre.`);
        }
        customDuration = Math.round(parsed);
      }

      const gender = draft.gender === 'male' || draft.gender === 'other' ? draft.gender : 'female';
      payload.push({ serviceId, customPrice, customDuration, gender });
    }

    return payload;
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError('Ad Soyad zorunludur.');
      return;
    }

    let assignments: Array<{ serviceId: number; customPrice: number | null; customDuration: number | null; gender: string; }> = [];
    try {
      assignments = buildAssignmentsPayload();
    } catch (err: any) {
      setError(err?.message || "Hizmet ayarları geçersiz.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      title: form.title.trim() || null,
      phone: form.phone.trim() || null,
      serviceAssignments: assignments
    };

    try {
      if (editingStaffId) {
        const response = await apiFetch<{ item: StaffItem; }>(`/api/admin/staff/${editingStaffId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });

        setStaff((prev) =>
          prev.
            map((item) => item.id === editingStaffId ? response.item : item).
            sort((a, b) => a.name.localeCompare(b.name, 'tr'))
        );
      } else {
        const response = await apiFetch<{ item: StaffItem; }>('/api/admin/staff', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        setStaff((prev) => [response.item, ...prev].sort((a, b) => a.name.localeCompare(b.name, 'tr')));
      }

      setModalOpen(false);
      setEditingStaffId(null);
    } catch (err: any) {
      setError(err?.message || "Personel kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const deleteStaff = async (item: StaffItem) => {
    const ok = window.confirm(`${item.name} isimli personeli silmek istediğinize emin misiniz?`);
    if (!ok) return;

    try {
      await apiFetch(`/api/admin/staff/${item.id}`, { method: 'DELETE' });
      setStaff((prev) => prev.filter((entry) => entry.id !== item.id));
    } catch (err: any) {
      setError(err?.message || 'Personel silinemedi.');
    }
  };

  return (
    <div className="pb-20">

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> : null}

      {!loading ?
        <div className="space-y-3 pb-20">
          {staff.map((item) =>
            <div key={item.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <div
                  className="h-11 w-11 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: toHexColor(item.themeColor, item.id) }}>
                  <UserRound className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-tight truncate">{item.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{item.title || 'Unvan belirtilmedi'}</p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted"
                    title="Düzenle">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteStaff(item)}
                    className="h-8 w-8 grid place-items-center rounded-md text-red-500 hover:bg-red-50"
                    title="Sil">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {item.services.slice(0, 6).map((service) => {
                  const hasCustom = service.customPrice !== null || service.customDuration !== null;
                  return (
                    <span
                      key={`${item.id}-${service.serviceId}`}
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ${hasCustom ?
                          'bg-[var(--rose-gold)]/10 text-[var(--rose-gold)] border border-[var(--rose-gold)]/35' :
                          'bg-muted text-muted-foreground'}`
                      }>
                      {service.name}
                      {hasCustom ? ` • ${service.effectiveDuration} dk • ${formatPrice(service.effectivePrice)}` : ''}
                    </span>);
                })}
                {item.services.length > 6 ?
                  <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs bg-muted text-muted-foreground">
                    +{item.services.length - 6} hizmet
                  </span> :
                  null}
                {!item.services.length ?
                  <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs bg-muted text-muted-foreground">
                    Hizmet ataması yok
                  </span> :
                  null}
              </div>
            </div>
          )}

          {!staff.length ?
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Personel kaydı bulunamadı.
            </div> :
            null}
        </div> :
        null}

      {modalOpen ?
        <div className="fixed inset-0 z-[90] bg-black/40 p-4">
          <div className="mx-auto mt-2 max-w-md rounded-2xl border border-border bg-background shadow-xl max-h-[calc(100dvh-16px)] flex flex-col overflow-hidden">
            <div className="sticky top-0 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editingStaffId ? "Personel Düzenle" : 'Yeni Personel'}</h2>
              <button type="button" onClick={closeModal} className="text-sm text-muted-foreground">Kapat</button>
            </div>

            <form onSubmit={save} className="p-4 space-y-4 overflow-y-auto pb-20">
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-sm space-y-1">
                  <span className="text-muted-foreground">Ad Soyad *</span>
                  <input
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm" />
                </label>

                <label className="block text-sm space-y-1">
                  <span className="text-muted-foreground">Unvan (isteğe bağlı)</span>
                  <input
                    value={form.title}
                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                    className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm" />
                </label>
              </div>

              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Telefon (isteğe bağlı)</span>
                <input
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm" />
              </label>

              <div className="rounded-xl border border-border p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Hizmetler *</p>
                  <span className="text-xs text-muted-foreground">{selectedServiceCount} hizmet seçildi</span>
                </div>

                <div className="max-h-[360px] overflow-y-auto space-y-3 pr-1">
                  {groupedServices.map((group) =>
                    <div key={group.key}>
                      <p className="text-xs font-semibold tracking-wide text-muted-foreground mb-2 uppercase">{group.title}</p>
                      <div className="space-y-2">
                        {group.items.map((service) => {
                          const draft = serviceDrafts[service.id] || {
                            selected: false,
                            useCustomPrice: false,
                            customPrice: String(service.price),
                            useCustomDuration: false,
                            customDuration: String(service.duration),
                            gender: 'female' as const
                          };

                          return (
                            <div key={service.id} className="rounded-lg border border-border p-2.5">
                              <label className="flex items-start gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={draft.selected}
                                  onChange={(event) => toggleServiceSelected(service.id, event.target.checked)}
                                  className="mt-1" />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="inline-block h-3.5 w-3.5 rounded-sm"
                                      style={{ backgroundColor: colorBySeed(service.id) }} />
                                    <p className="text-sm font-medium leading-tight">{service.name}</p>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {service.duration} dk • {formatPrice(service.price)}
                                  </p>
                                </div>
                              </label>

                              {draft.selected ?
                                <div className="mt-2 space-y-2 rounded-md bg-muted/40 p-2">
                                  <label className="block text-xs space-y-1">
                                    <span className="text-muted-foreground">Cinsiyet</span>
                                    <select
                                      value={draft.gender}
                                      onChange={(event) => updateDraftField(service.id, 'gender', event.target.value)}
                                      className="w-full h-9 rounded-md border border-border bg-card px-2 text-sm">
                                      <option value="female">Kadın</option>
                                      <option value="male">Erkek</option>
                                      <option value="other">Uniseks</option>
                                    </select>
                                  </label>
                                  <div className="flex items-center justify-between gap-2 text-xs">
                                    <span>Özel fiyat</span>
                                    <ToggleSwitch
                                      checked={draft.useCustomPrice}
                                      onChange={(next) => updateDraftField(service.id, 'useCustomPrice', next)} />
                                  </div>
                                  {draft.useCustomPrice ?
                                    <input
                                      type="number"
                                      min={0}
                                      step={10}
                                      value={draft.customPrice}
                                      onChange={(event) =>
                                        updateDraftField(service.id, 'customPrice', event.target.value)
                                      }
                                      className="w-full h-9 rounded-md border border-border bg-card px-2 text-sm"
                                      placeholder="Örn: 180" /> :
                                    null}

                                  <div className="flex items-center justify-between gap-2 text-xs">
                                    <span>Özel süre</span>
                                    <ToggleSwitch
                                      checked={draft.useCustomDuration}
                                      onChange={(next) => updateDraftField(service.id, 'useCustomDuration', next)} />
                                  </div>
                                  {draft.useCustomDuration ?
                                    <input
                                      type="number"
                                      min={5}
                                      step={5}
                                      value={draft.customDuration}
                                      onChange={(event) =>
                                        updateDraftField(service.id, 'customDuration', event.target.value)
                                      }
                                      className="w-full h-9 rounded-md border border-border bg-card px-2 text-sm"
                                      placeholder="Örn: 75" /> :
                                    null}
                                </div> :
                                null}
                            </div>);
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="sticky bottom-0 bg-background pt-2 pb-[calc(env(safe-area-inset-bottom)+8px)]">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full h-11 rounded-lg bg-[var(--rose-gold)] text-white font-semibold disabled:opacity-70">
                  {saving ? "Kaydediliyor..." : editingStaffId ? "Güncelle" : "Ekle"}
                </button>
              </div>
            </form>
          </div>
        </div> :
        null}
    </div>);
}
