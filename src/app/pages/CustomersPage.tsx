import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type {
  AdminCustomerItem,
  AdminCustomersResponse,
  CustomerPackageItem,
  PackageLedgerItem,
  PackageTemplateItem
} from
  '../types/mobile-api';
import { useNavigate } from 'react-router-dom';
import { readSnapshot, writeSnapshot } from '../lib/ui-cache';

const PAGE_LIMIT = 20;
const CUSTOMERS_LIST_CACHE_KEY = 'customers:list:default';

const toInputDateValue = (value?: string | null) => {
  if (!value) {
    return '';
  }
  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) {
    return value.includes('T') ? value.slice(0, 10) : value;
  }
  return asDate.toISOString().slice(0, 10);
};

interface CustomerAppointmentItem {
  id: number;
  startTime: string;
  endTime: string;
  status: string;
  service: {
    id: number;
    name: string;
    duration: number;
    price: number;
  };
  staff: {
    id: number;
    name: string;
  };
  customerRating?: number | null;
  customerReview?: string | null;
  customerReviewedAt?: string | null;
}

interface CustomerDetailResponse {
  customer: AdminCustomerItem;
  summary: {
    totalAppointmentDays: number;
    totalRevenue: number;
    favoriteStaff: { id: number; name: string; count: number; } | null;
    noShowRiskScore: number;
    noShowRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    noShowCount: number;
    totalBookings: number;
  };
  discount: {
    kind: 'PERCENT' | 'FIXED';
    value: number;
    note: string | null;
    notifyCustomer: boolean;
    messageTemplate: string | null;
    lastNotificationStatus: string | null;
    updatedAt: string;
  } | null;
  appointments: CustomerAppointmentItem[];
}

interface DiscountUpdateResponse {
  discount: {
    kind: 'PERCENT' | 'FIXED';
    value: number;
    note: string | null;
    notifyCustomer: boolean;
    messageTemplate: string | null;
    lastNotificationStatus: string | null;
    updatedAt: string;
  };
}

interface CustomerProfileUpdateResponse {
  customer: AdminCustomerItem;
}

interface NoShowRiskUpdateResponse {
  summary: {
    noShowRiskScore: number;
    noShowRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    noShowCount: number;
    totalBookings: number;
  };
}

interface CustomerPackagesResponse {
  items: CustomerPackageItem[];
}

interface PackageTemplatesResponse {
  items: PackageTemplateItem[];
}

interface PackageLedgerResponse {
  items: PackageLedgerItem[];
}

interface CustomersListSnapshot {
  items: AdminCustomerItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function CustomersPage() {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const [initialListSnapshot] = useState<CustomersListSnapshot | null>(
    () => readSnapshot<CustomersListSnapshot>(CUSTOMERS_LIST_CACHE_KEY, 1000 * 60 * 10)
  );
  const [items, setItems] = useState<AdminCustomerItem[]>(() => initialListSnapshot?.items || []);
  const [cursor, setCursor] = useState<string | null>(() => initialListSnapshot?.nextCursor || null);
  const [hasMore, setHasMore] = useState<boolean>(() => initialListSnapshot?.hasMore || false);
  const [loading, setLoading] = useState<boolean>(() => !initialListSnapshot);
  const [loadingMore, setLoadingMore] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [instagram, setInstagram] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [acceptMarketing, setAcceptMarketing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [discountKind, setDiscountKind] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [discountValue, setDiscountValue] = useState('');
  const [discountNote, setDiscountNote] = useState('');
  const [discountNotify, setDiscountNotify] = useState(false);
  const [discountMessage, setDiscountMessage] = useState('');
  const [discountSaving, setDiscountSaving] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [discountSuccess, setDiscountSuccess] = useState<string | null>(null);
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editAcceptMarketing, setEditAcceptMarketing] = useState(false);
  const [riskSaving, setRiskSaving] = useState(false);
  const [riskError, setRiskError] = useState<string | null>(null);
  const [customerPackages, setCustomerPackages] = useState<CustomerPackageItem[]>([]);
  const [packageTemplates, setPackageTemplates] = useState<PackageTemplateItem[]>([]);
  const [packageLedger, setPackageLedger] = useState<PackageLedgerItem[]>([]);
  const [packageLoading, setPackageLoading] = useState(false);
  const [packageError, setPackageError] = useState<string | null>(null);
  const [packageTemplateIdToAssign, setPackageTemplateIdToAssign] = useState('');
  const [packageAssigning, setPackageAssigning] = useState(false);
  const [packageAssignSuccess, setPackageAssignSuccess] = useState<string | null>(null);
  const [packageAdjustTarget, setPackageAdjustTarget] = useState<{ packageId: string; serviceId: string; }>({
    packageId: '',
    serviceId: ''
  });
  const [packageAdjustDelta, setPackageAdjustDelta] = useState('');
  const [packageAdjustReason, setPackageAdjustReason] = useState('');
  const [packageAdjusting, setPackageAdjusting] = useState(false);

  const loadPage = async (nextCursor?: string | null, search?: string) => {
    const query = new URLSearchParams({ limit: String(PAGE_LIMIT) });
    if (nextCursor) {
      query.set('cursor', nextCursor);
    }
    const normalizedSearch = (search || '').trim();
    if (normalizedSearch) {
      query.set('search', normalizedSearch);
    }

    return apiFetch<AdminCustomersResponse>(`/api/admin/customers?${query.toString()}`);
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      const normalizedSearch = searchQuery.trim();
      if (!normalizedSearch && initialListSnapshot) {
        setLoading(false);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const response = await loadPage(null, searchQuery);
        if (!mounted) return;
        setItems(response.items);
        setCursor(response.nextCursor);
        setHasMore(response.hasMore);
        if (!normalizedSearch) {
          writeSnapshot(CUSTOMERS_LIST_CACHE_KEY, {
            items: response.items,
            nextCursor: response.nextCursor,
            hasMore: response.hasMore
          });
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || "Müşteriler alınamadı.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [searchQuery]);

  const handleLoadMore = async () => {
    if (!cursor || loadingMore) {
      return;
    }

    setLoadingMore(true);
    setError(null);

    try {
      const response = await loadPage(cursor, searchQuery);
      setItems((prev) => {
        const nextItems = [...prev, ...response.items];
        if (!searchQuery.trim()) {
          writeSnapshot(CUSTOMERS_LIST_CACHE_KEY, {
            items: nextItems,
            nextCursor: response.nextCursor,
            hasMore: response.hasMore
          });
        }
        return nextItems;
      });
      setCursor(response.nextCursor);
      setHasMore(response.hasMore);
    } catch (err: any) {
      setError(err?.message || 'Daha fazla müşteri yüklenemedi.');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Ad Soyad zorunludur.');
      return;
    }
    if (!phone.trim()) {
      setError("Telefon zorunludur.");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await apiFetch<{ customer: AdminCustomerItem; }>('/api/admin/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          instagram: instagram.trim() || null,
          birthDate: birthDate || null,
          acceptMarketing
        })
      });

      const nextItem: AdminCustomerItem = {
        ...response.customer,
        appointmentCount: 0
      };
      setItems((prev) => {
        const nextItems = [nextItem, ...prev];
        if (!searchQuery.trim()) {
          writeSnapshot(CUSTOMERS_LIST_CACHE_KEY, {
            items: nextItems,
            nextCursor: cursor,
            hasMore
          });
        }
        return nextItems;
      });
      setName('');
      setPhone('');
      setInstagram('');
      setBirthDate('');
      setAcceptMarketing(false);
      setShowCreateForm(false);
    } catch (err: any) {
      setError(err?.message || "Müşteri oluşturulamadi.");
    } finally {
      setCreating(false);
    }
  };

  const loadCustomerPackageData = async (customerId: number) => {
    setPackageLoading(true);
    setPackageError(null);
    setPackageAssignSuccess(null);
    try {
      const [packagesResponse, templatesResponse, ledgerResponse] = await Promise.all([
        apiFetch<CustomerPackagesResponse>(`/api/admin/customers/${customerId}/packages`),
        apiFetch<PackageTemplatesResponse>('/api/admin/package-templates'),
        apiFetch<PackageLedgerResponse>(`/api/admin/customers/${customerId}/package-ledger?limit=60`)]
      );
      setCustomerPackages(packagesResponse.items || []);
      setPackageTemplates(templatesResponse.items || []);
      setPackageLedger(ledgerResponse.items || []);
    } catch (err: any) {
      setPackageError(err?.message || "Paket verileri yüklenemedi.");
    } finally {
      setPackageLoading(false);
    }
  };

  const handleAssignTemplatePackage = async () => {
    if (!selectedCustomer) {
      return;
    }
    const parsedTemplateId = Number(packageTemplateIdToAssign);
    if (!Number.isInteger(parsedTemplateId) || parsedTemplateId <= 0) {
      setPackageError('Geçerli bir paket şablonu seçin.');
      return;
    }

    setPackageAssigning(true);
    setPackageError(null);
    setPackageAssignSuccess(null);
    try {
      await apiFetch(`/api/admin/customers/${selectedCustomer.customer.id}/packages`, {
        method: 'POST',
        body: JSON.stringify({
          templateId: parsedTemplateId
        })
      });
      setPackageTemplateIdToAssign('');
      await loadCustomerPackageData(selectedCustomer.customer.id);
      setPackageAssignSuccess("Paket müşteriye atandı.");
    } catch (err: any) {
      setPackageError(err?.message || "Paket atanamadı.");
    } finally {
      setPackageAssigning(false);
    }
  };

  const handleAdjustPackage = async () => {
    if (!selectedCustomer) {
      return;
    }
    const packageId = Number(packageAdjustTarget.packageId);
    const serviceId = Number(packageAdjustTarget.serviceId);
    const delta = Number(packageAdjustDelta);
    const reason = packageAdjustReason.trim();

    if (!Number.isInteger(packageId) || packageId <= 0) {
      setPackageError('Bir paket seçin.');
      return;
    }
    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      setPackageError('Bir hizmet seçin.');
      return;
    }
    if (!Number.isInteger(delta) || delta === 0) {
      setPackageError('Miktar sıfırdan farklı bir tam sayı olmalıdır.');
      return;
    }
    if (!reason) {
      setPackageError("Neden gereklidir.");
      return;
    }

    setPackageAdjusting(true);
    setPackageError(null);
    setPackageAssignSuccess(null);
    try {
      await apiFetch(`/api/admin/customers/${selectedCustomer.customer.id}/packages/${packageId}/adjust`, {
        method: 'POST',
        body: JSON.stringify({
          serviceId,
          delta,
          reason
        })
      });
      setPackageAdjustDelta('');
      setPackageAdjustReason('');
      await loadCustomerPackageData(selectedCustomer.customer.id);
      setPackageAssignSuccess('Manuel düzeltme uygulandı.');
    } catch (err: any) {
      setPackageError(err?.message || 'Düzeltme hatası.');
    } finally {
      setPackageAdjusting(false);
    }
  };

  const handleOpenCustomer = async (customerId: number) => {
    setDetailLoading(true);
    setDetailError(null);
    setSelectedCustomer(null);
    setProfileEditMode(false);
    setProfileError(null);
    setProfileSuccess(null);
    setRiskError(null);
    setPackageError(null);
    setPackageAssignSuccess(null);
    setPackageTemplateIdToAssign('');
    setPackageAdjustTarget({ packageId: '', serviceId: '' });
    setPackageAdjustDelta('');
    setPackageAdjustReason('');

    try {
      const response = await apiFetch<CustomerDetailResponse>(`/api/admin/customers/${customerId}`);
      setSelectedCustomer(response);
      setEditName(response.customer.name || '');
      setEditPhone(response.customer.phone || '');
      setEditInstagram(response.customer.instagram || '');
      setEditBirthDate(toInputDateValue(response.customer.birthDate));
      setEditAcceptMarketing(Boolean(response.customer.acceptMarketing));
      setDiscountKind(response.discount?.kind || 'PERCENT');
      setDiscountValue(response.discount ? String(response.discount.value) : '');
      setDiscountNote(response.discount?.note || '');
      setDiscountNotify(Boolean(response.discount?.notifyCustomer));
      setDiscountMessage(response.discount?.messageTemplate || '');
      setDiscountError(null);
      setDiscountSuccess(null);
      await loadCustomerPackageData(customerId);
    } catch (err: any) {
      setDetailError(err?.message || 'Müşteri profili açılamadı.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveDiscount = async () => {
    if (!selectedCustomer) {
      return;
    }

    const parsedValue = Number(discountValue);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      setDiscountError('Geçerli bir indirim tutarı girin.');
      return;
    }
    if (discountKind === 'PERCENT' && parsedValue > 100) {
      setDiscountError('Yüzdelik indirim %100\'ü geçemez.');
      return;
    }

    setDiscountSaving(true);
    setDiscountError(null);
    setDiscountSuccess(null);

    try {
      const response = await apiFetch<DiscountUpdateResponse>(`/api/admin/customers/${selectedCustomer.customer.id}/discount`, {
        method: 'PUT',
        body: JSON.stringify({
          kind: discountKind,
          value: parsedValue,
          note: discountNote.trim() || null,
          notifyCustomer: discountNotify,
          messageTemplate: discountMessage.trim() || null
        })
      });

      setSelectedCustomer((prev) =>
        prev ?
          {
            ...prev,
            discount: response.discount
          } :
          prev
      );
      setDiscountSuccess('İndirim kaydedildi.');
    } catch (err: any) {
      setDiscountError(err?.message || 'İndirim kaydedilemedi.');
    } finally {
      setDiscountSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!selectedCustomer) {
      return;
    }

    const trimmedPhone = editPhone.trim();
    if (!trimmedPhone) {
      setProfileError("Telefon zorunludur.");
      return;
    }

    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const response = await apiFetch<CustomerProfileUpdateResponse>(`/api/admin/customers/${selectedCustomer.customer.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName.trim() || null,
          phone: trimmedPhone,
          instagram: editInstagram.trim() ? editInstagram.trim().replace(/^@/, '') : null,
          birthDate: editBirthDate || null,
          acceptMarketing: editAcceptMarketing
        })
      });

      setSelectedCustomer((prev) =>
        prev ?
          {
            ...prev,
            customer: response.customer
          } :
          prev
      );
      setItems((prev) =>
        prev.map((item) =>
          item.id === response.customer.id ?
            {
              ...item,
              name: response.customer.name,
              phone: response.customer.phone,
              instagram: response.customer.instagram,
              birthDate: response.customer.birthDate,
              acceptMarketing: response.customer.acceptMarketing,
              updatedAt: response.customer.updatedAt
            } :
            item
        )
      );
      setProfileEditMode(false);
      setProfileSuccess("Müşteri bilgileri güncellendi.");
    } catch (err: any) {
      setProfileError(err?.message || "Müşteri bilgileri güncellenemedi.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAdjustNoShowRisk = async (delta: 1 | -1) => {
    if (!selectedCustomer || riskSaving) {
      return;
    }

    setRiskSaving(true);
    setRiskError(null);

    try {
      const response = await apiFetch<NoShowRiskUpdateResponse>(
        `/api/admin/customers/${selectedCustomer.customer.id}/no-show-risk`,
        {
          method: 'PATCH',
          body: JSON.stringify({ delta })
        }
      );

      setSelectedCustomer((prev) =>
        prev ?
          {
            ...prev,
            summary: {
              ...prev.summary,
              ...response.summary
            }
          } :
          prev
      );
    } catch (err: any) {
      setRiskError(err?.message || 'Katılım oranı güncellenemedi.');
    } finally {
      setRiskSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const riskBadgeClass = (level: 'LOW' | 'MEDIUM' | 'HIGH') => {
    if (level === 'HIGH') {
      return 'bg-red-500/10 text-red-700 border-red-500/30';
    }
    if (level === 'MEDIUM') {
      return 'bg-amber-500/10 text-amber-700 border-amber-500/30';
    }
    return 'bg-green-500/10 text-green-700 border-green-500/30';
  };

  const riskLabelTr = (level: 'LOW' | 'MEDIUM' | 'HIGH') => {
    if (level === 'HIGH') return 'Yüksek Risk';
    if (level === 'MEDIUM') return 'Orta Risk';
    return 'Düşük Risk';
  };

  const packageStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'AKTİF';
      case 'EXPIRED': return 'SÜRESİ DOLDU';
      case 'CANCELLED': return 'İPTAL EDİLDİ';
      case 'DEPLETED': return 'TÜKENDİ';
      default: return status;
    }
  };

  const packageActionLabel = (action: string) => {
    switch (action) {
      case 'CONSUME': return 'Kullanım';
      case 'CANCEL': return 'İptal';
      case 'ADJUST': return 'Düzeltme';
      case 'REFUND': return 'İade';
      case 'PURCHASE': return 'Satın Alım';
      default: return action;
    }
  };

  const attendanceRatePercent = (noShowCount: number, totalBookings: number) => {
    if (!totalBookings || totalBookings <= 0) {
      return 0;
    }
    const attended = Math.max(totalBookings - noShowCount, 0);
    return Math.max(0, Math.min(100, attended / totalBookings * 100));
  };

  const appointmentStatusLabel = (status: string) => {
    switch (status) {
      case 'BOOKED':
        return 'Planlandı';
      case 'COMPLETED':
        return 'Tamamlandı';
      case 'CANCELLED':
        return "İptal";
      case 'NO_SHOW':
        return 'Gelmedi';
      default:
        return status;
    }
  };

  const appointmentStatusClass = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30';
      case 'CANCELLED':
        return 'bg-zinc-500/10 text-zinc-700 border-zinc-500/30';
      case 'NO_SHOW':
        return 'bg-red-500/10 text-red-700 border-red-500/30';
      default:
        return 'bg-[var(--rose-gold)]/10 text-[var(--rose-gold)] border-[var(--rose-gold)]/30';
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });

  const selectedPackageForAdjust = customerPackages.find((item) => String(item.id) === packageAdjustTarget.packageId) || null;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Müşteriler</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/app/automations?section=attendance')}
            className="rounded-md border border-border px-3 py-1.5 text-xs">

            Gelmedi Takibi
          </button>
          <button
            type="button"
            onClick={() => navigate('/app/blacklist')}
            className="rounded-md border border-border px-3 py-1.5 text-xs">

            Kara Liste
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-3">
        <input
          className="w-full rounded-md border border-border px-3 py-2 text-sm"
          placeholder="Ad, telefon veya Instagram ile ara"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)} />

      </div>

      <div className="rounded-xl border border-border bg-card p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Yeni Müşteri</p>
          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="rounded-md border border-border px-3 py-1.5 text-xs">

            {showCreateForm ? 'Kapat' : "Müşteri Ekle"}
          </button>
        </div>

        {showCreateForm ?
          <div className="space-y-2">
            <input
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
              placeholder="Ad Soyad"
              value={name}
              onChange={(event) => setName(event.target.value)} />

            <input
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
              placeholder="Telefon"
              value={phone}
              onChange={(event) => setPhone(event.target.value)} />

            <input
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
              placeholder="Instagram (isteğe bağlı)"
              value={instagram}
              onChange={(event) => setInstagram(event.target.value)} />

            <input
              type="date"
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)} />

            <label className="flex items-center gap-2 text-sm rounded-md border border-border px-3 py-2">
              <input
                type="checkbox"
                checked={acceptMarketing}
                onChange={(event) => setAcceptMarketing(event.target.checked)} />

              Kampanya iletişim izni
            </label>
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={creating}
              className="w-full rounded-md bg-[var(--rose-gold)] px-4 py-2 text-sm text-white disabled:opacity-60">

              {creating ? "Ekleniyor..." : "Kaydet"}
            </button>
          </div> :
          null}
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <div className="space-y-3">
        {items.map((item) =>
          <button
            key={item.id}
            type="button"
            className="w-full text-left rounded-xl border border-border bg-card p-4 hover:border-[var(--rose-gold)]/40 transition-colors"
            onClick={() => {
              void handleOpenCustomer(item.id);
            }}>

            <div className="flex items-center justify-between">
              <p className="font-medium">{item.name || "Adsız Müşteri"}</p>
              <p className="text-xs text-muted-foreground">#{item.id}</p>
            </div>
            <p className="text-sm mt-1">{item.phone}</p>
            {item.instagram ? <p className="text-xs text-muted-foreground mt-1">@{item.instagram.replace(/^@/, '')}</p> : null}
            <p className="text-xs text-muted-foreground mt-1">Randevu sayısı: {item.appointmentCount}</p>
          </button>
        )}
      </div>

      {!loading && !items.length ?
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Kayıtlı müşteri bulunamadı.
        </div> :
        null}

      {hasMore ?
        <button
          type="button"
          onClick={() => void handleLoadMore()}
          disabled={loadingMore}
          className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm disabled:opacity-60">

          {loadingMore ? "Yükleniyor..." : 'Daha Fazla Yükle'}
        </button> :
        null}

      {detailLoading || detailError || selectedCustomer ?
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[1px] flex items-end">
          <div className="w-full max-h-[88vh] overflow-y-auto rounded-t-2xl bg-background border-t border-border p-4 pb-24 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Müşteri Profili</h2>
              <button
                type="button"
                className="h-8 w-8 grid place-items-center rounded-md border border-border"
                onClick={() => {
                  setSelectedCustomer(null);
                  setDetailError(null);
                  setDetailLoading(false);
                  setProfileEditMode(false);
                  setProfileError(null);
                  setProfileSuccess(null);
                  setRiskError(null);
                  setCustomerPackages([]);
                  setPackageLedger([]);
                  setPackageError(null);
                  setPackageAssignSuccess(null);
                }}>

                <X className="h-4 w-4" />
              </button>
            </div>

            {detailLoading ? <p className="text-sm text-muted-foreground">Profil yükleniyor...</p> : null}
            {detailError ? <p className="text-sm text-red-500">{detailError}</p> : null}

            {selectedCustomer ?
              <>
                <div className="rounded-lg border border-border p-3 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium">{selectedCustomer.customer.name || "Adsız Müşteri"}</p>
                      <p className="text-sm">{selectedCustomer.customer.phone}</p>
                      {selectedCustomer.customer.instagram ?
                        <p className="text-sm text-muted-foreground">@{selectedCustomer.customer.instagram.replace(/^@/, '')}</p> :
                        null}
                      <p className="text-xs text-muted-foreground">
                        Oluşturulma: {new Date(selectedCustomer.customer.createdAt).toLocaleString('tr-TR')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (profileEditMode) {
                          setEditName(selectedCustomer.customer.name || '');
                          setEditPhone(selectedCustomer.customer.phone || '');
                          setEditInstagram(selectedCustomer.customer.instagram || '');
                          setEditBirthDate(toInputDateValue(selectedCustomer.customer.birthDate));
                          setEditAcceptMarketing(Boolean(selectedCustomer.customer.acceptMarketing));
                          setProfileError(null);
                        }
                        setProfileEditMode((prev) => !prev);
                      }}
                      className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs">

                      {profileEditMode ? "İptal" : "Bilgileri Düzenle"}
                    </button>
                  </div>

                  {profileEditMode ?
                    <div className="space-y-2 rounded-md border border-border p-2.5">
                      <input
                        className="w-full rounded-md border border-border px-3 py-2 text-sm"
                        placeholder="Ad Soyad"
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)} />

                      <input
                        className="w-full rounded-md border border-border px-3 py-2 text-sm"
                        placeholder="Telefon"
                        value={editPhone}
                        onChange={(event) => setEditPhone(event.target.value)} />

                      <input
                        className="w-full rounded-md border border-border px-3 py-2 text-sm"
                        placeholder="Instagram (isteğe bağlı)"
                        value={editInstagram}
                        onChange={(event) => setEditInstagram(event.target.value)} />

                      <input
                        type="date"
                        className="w-full rounded-md border border-border px-3 py-2 text-sm"
                        value={editBirthDate}
                        onChange={(event) => setEditBirthDate(event.target.value)} />

                      <label className="flex items-center gap-2 text-sm rounded-md border border-border px-3 py-2">
                        <input
                          type="checkbox"
                          checked={editAcceptMarketing}
                          onChange={(event) => setEditAcceptMarketing(event.target.checked)} />

                        Kampanya iletişim izni
                      </label>
                      {profileError ? <p className="text-sm text-red-500">{profileError}</p> : null}
                      <button
                        type="button"
                        onClick={() => void handleSaveProfile()}
                        disabled={profileSaving}
                        className="w-full rounded-md bg-[var(--rose-gold)] text-white px-4 py-2 text-sm disabled:opacity-60">

                        {profileSaving ? "Kaydediliyor..." : "Detayları Kaydet"}
                      </button>
                    </div> :

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <p>
                        Doğum Tarihi:{' '}
                        <span className="text-foreground">
                          {selectedCustomer.customer.birthDate ?
                            new Date(selectedCustomer.customer.birthDate).toLocaleDateString('tr-TR') :
                            'Girilmedi'}
                        </span>
                      </p>
                      <p>
                        Kampanya izni:{' '}
                        <span className="text-foreground">
                          {selectedCustomer.customer.acceptMarketing ? 'Açık' : 'Kapalı'}
                        </span>
                      </p>
                    </div>
                  }

                  {profileSuccess ? <p className="text-sm text-green-600">{profileSuccess}</p> : null}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Toplam Randevu (gün)</p>
                    <p className="text-lg font-semibold">{selectedCustomer.summary.totalAppointmentDays}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Toplam Ciro</p>
                    <p className="text-lg font-semibold">{formatCurrency(selectedCustomer.summary.totalRevenue)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Favori Personel</p>
                    <p className="text-sm font-medium">
                      {selectedCustomer.summary.favoriteStaff ?
                        `${selectedCustomer.summary.favoriteStaff.name} (${selectedCustomer.summary.favoriteStaff.count})` :
                        "henüz yok"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Gelmedi Skoru</p>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-lg font-semibold">{selectedCustomer.summary.noShowRiskScore}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={riskSaving}
                          onClick={() => void handleAdjustNoShowRisk(-1)}
                          className="h-7 w-7 rounded-md border border-border text-sm font-semibold disabled:opacity-50">

                          -
                        </button>
                        <button
                          type="button"
                          disabled={riskSaving}
                          onClick={() => void handleAdjustNoShowRisk(1)}
                          className="h-7 w-7 rounded-md border border-border text-sm font-semibold disabled:opacity-50">

                          +
                        </button>
                      </div>
                    </div>
                    <div className="mt-1">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded border ${riskBadgeClass(
                          selectedCustomer.summary.noShowRiskLevel
                        )}`}>

                        {riskLabelTr(selectedCustomer.summary.noShowRiskLevel)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Gelmedi: {selectedCustomer.summary.noShowCount} / {selectedCustomer.summary.totalBookings}
                      {' • '}
                      Katılım: %{attendanceRatePercent(selectedCustomer.summary.noShowCount, selectedCustomer.summary.totalBookings).toFixed(0)}
                    </p>
                    {riskError ? <p className="text-[11px] text-red-500 mt-1">{riskError}</p> : null}
                  </div>
                </div>

                <div className="rounded-lg border border-border p-3 space-y-3">
                  <p className="text-sm font-medium">İndirim Tanımla</p>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDiscountKind('PERCENT')}
                      className={`rounded-md border px-3 py-2 text-sm ${discountKind === 'PERCENT' ?
                          'border-[var(--rose-gold)] bg-[var(--rose-gold)]/10' :
                          'border-border'}`
                      }>

                      Yüzde (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountKind('FIXED')}
                      className={`rounded-md border px-3 py-2 text-sm ${discountKind === 'FIXED' ?
                          'border-[var(--rose-gold)] bg-[var(--rose-gold)]/10' :
                          'border-border'}`
                      }>

                      Tutar (TL)
                    </button>
                  </div>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-border px-3 py-2 text-sm"
                    placeholder={discountKind === 'PERCENT' ? 'Örn: 15' : 'Örn: 250'}
                    value={discountValue}
                    onChange={(event) => setDiscountValue(event.target.value)} />


                  <textarea
                    className="w-full rounded-md border border-border px-3 py-2 text-sm resize-none"
                    rows={2}
                    placeholder="İndirim notu (isteğe bağlı)"
                    value={discountNote}
                    onChange={(event) => setDiscountNote(event.target.value)} />


                  <div className="rounded-md border border-border p-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={discountNotify}
                        onChange={(event) => setDiscountNotify(event.target.checked)} />

                      Mesaj bildirimi gönder
                    </label>
                    {discountNotify ?
                      <textarea
                        className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm resize-none"
                        rows={2}
                        placeholder="Müşteriye mesaj (isteğe bağlı)"
                        value={discountMessage}
                        onChange={(event) => setDiscountMessage(event.target.value)} /> :

                      null}
                  </div>

                  {selectedCustomer.discount ?
                    <p className="text-xs text-muted-foreground">
                      Aktif indirim: {selectedCustomer.discount.kind === 'PERCENT' ? `%${selectedCustomer.discount.value}` : `${selectedCustomer.discount.value} TL`}
                      {' • '}
                      Son durum: {selectedCustomer.discount.lastNotificationStatus || 'bilinmiyor'}
                    </p> :
                    null}

                  {discountError ? <p className="text-sm text-red-500">{discountError}</p> : null}
                  {discountSuccess ? <p className="text-sm text-green-600">{discountSuccess}</p> : null}

                  <button
                    type="button"
                    onClick={() => void handleSaveDiscount()}
                    disabled={discountSaving}
                    className="w-full rounded-md bg-[var(--rose-gold)] text-white px-4 py-2 text-sm disabled:opacity-60">

                    {discountSaving ? "Kaydediliyor..." : "İndirimi Kaydet"}
                  </button>
                </div>

                <div className="rounded-lg border border-border p-3 space-y-3">
                  <p className="text-sm font-medium">Paket Yönetimi</p>

                  <div className="rounded-md border border-border p-2.5 space-y-2">
                    <p className="text-xs font-medium">Paket Şablonu Ata</p>
                    <div className="flex gap-2">
                      <select
                        value={packageTemplateIdToAssign}
                        onChange={(event) => setPackageTemplateIdToAssign(event.target.value)}
                        className="h-10 flex-1 rounded-md border border-border px-3 text-sm bg-background">

                        <option value="">Şablon seçin</option>
                        {packageTemplates.
                          filter((template) => template.isActive).
                          map((template) =>
                            <option key={template.id} value={template.id}>
                              {template.name}
                            </option>
                          )}
                      </select>
                      <button
                        type="button"
                        onClick={() => void handleAssignTemplatePackage()}
                        disabled={packageAssigning}
                        className="rounded-md border border-border px-3 text-xs disabled:opacity-60">

                        {packageAssigning ? "Atanıyor..." : "Ata"}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-md border border-border p-2.5 space-y-2">
                    <p className="text-xs font-medium">Manuel Hizmet Düzenleme</p>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={packageAdjustTarget.packageId}
                        onChange={(event) =>
                          setPackageAdjustTarget({ packageId: event.target.value, serviceId: '' })
                        }
                        className="h-10 rounded-md border border-border px-3 text-sm bg-background">

                        <option value="">Paket seçin</option>
                        {customerPackages.map((item) =>
                          <option key={item.id} value={item.id}>
                            {item.name} ({packageStatusLabel(item.status)})
                          </option>
                        )}
                      </select>
                      <select
                        value={packageAdjustTarget.serviceId}
                        onChange={(event) =>
                          setPackageAdjustTarget((prev) => ({ ...prev, serviceId: event.target.value }))
                        }
                        className="h-10 rounded-md border border-border px-3 text-sm bg-background"
                        disabled={!selectedPackageForAdjust}>

                        <option value="">Hizmet seçin</option>
                        {(selectedPackageForAdjust?.serviceBalances || []).map((balance) =>
                          <option key={balance.id} value={balance.serviceId}>
                            {balance.service?.name || `#${balance.serviceId}`} ({balance.remainingQuota}/{balance.initialQuota})
                          </option>
                        )}
                      </select>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] gap-2">
                      <input
                        type="number"
                        step="1"
                        value={packageAdjustDelta}
                        onChange={(event) => setPackageAdjustDelta(event.target.value)}
                        className="h-10 rounded-md border border-border px-3 text-sm"
                        placeholder="+1 / -1" />

                      <input
                        value={packageAdjustReason}
                        onChange={(event) => setPackageAdjustReason(event.target.value)}
                        className="h-10 rounded-md border border-border px-3 text-sm"
                        placeholder="Neden" />

                    </div>
                    <button
                      type="button"
                      onClick={() => void handleAdjustPackage()}
                      disabled={packageAdjusting}
                      className="w-full rounded-md border border-border px-3 py-2 text-xs disabled:opacity-60">

                      {packageAdjusting ? "Uygulanıyor..." : "Düzeltmeyi Uygula"}
                    </button>
                  </div>

                  {packageLoading ? <p className="text-sm text-muted-foreground">Paket verileri yükleniyor...</p> : null}
                  {packageError ? <p className="text-sm text-red-500">{packageError}</p> : null}
                  {packageAssignSuccess ? <p className="text-sm text-green-600">{packageAssignSuccess}</p> : null}

                  <div className="space-y-2">
                    {customerPackages.length ?
                      customerPackages.map((item) =>
                        <div key={item.id} className="rounded-md border border-border p-2.5 space-y-1.5">
                          <p className="text-sm font-medium">
                            {item.name} <span className="text-xs text-muted-foreground">({packageStatusLabel(item.status)})</span>
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.expiresAt ? `Bitiş: ${new Date(item.expiresAt).toLocaleDateString('tr-TR')}` : "Bitiş yok"}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {item.serviceBalances.map((balance) =>
                              <span key={balance.id} className="text-[11px] rounded-full border border-border px-2 py-0.5">
                                {balance.service?.name || `#${balance.serviceId}`}: {balance.remainingQuota}/{balance.initialQuota}
                              </span>
                            )}
                          </div>
                        </div>
                      ) :

                      <p className="text-sm text-muted-foreground">Henüz paket atanmadı.</p>
                    }
                  </div>

                  <div className="rounded-md border border-border p-2.5 space-y-2">
                    <p className="text-xs font-medium">Paket Hareketleri (Son)</p>
                    {packageLedger.length ?
                      packageLedger.slice(0, 12).map((entry) =>
                        <div key={entry.id} className="text-[11px] border-b border-border/60 pb-1 last:border-b-0">
                          <p className="font-medium">
                            {packageActionLabel(entry.actionType)} • {entry.serviceName || '-'} • {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                          </p>
                          <p className="text-muted-foreground">
                            Bakiye: {entry.balanceAfter ?? '-'} • {new Date(entry.createdAt).toLocaleString('tr-TR')}
                          </p>
                        </div>
                      ) :

                      <p className="text-sm text-muted-foreground">Paket hareket kaydı yok.</p>
                    }
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium">Randevu Geçmişi</p>
                  {selectedCustomer.appointments.length ?
                    selectedCustomer.appointments.map((appointment) =>
                      <div key={appointment.id} className="rounded-xl border border-border/80 bg-card p-3.5 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold leading-tight text-[15px]">{appointment.service.name}</p>
                          <span className={`text-[11px] px-2 py-0.5 rounded border whitespace-nowrap ${appointmentStatusClass(appointment.status)}`}>
                            {appointmentStatusLabel(appointment.status)}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>{formatDate(appointment.startTime)}</span>
                          <span>{formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}</span>
                          <span>{appointment.staff.name}</span>
                        </div>

                        {appointment.customerRating || appointment.customerReview ?
                          <div className="mt-3 rounded-lg border border-border bg-muted/20 p-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-medium">Müşteri değerlendirmesi</p>
                              <p className="text-xs font-semibold">
                                {appointment.customerRating ? `${appointment.customerRating}/5` : 'Puan yok'}
                              </p>
                            </div>
                            {appointment.customerRating ?
                              <p className="mt-1 text-xs tracking-wide text-amber-500">
                                {'★'.repeat(appointment.customerRating)}
                                <span className="text-zinc-300">{'★'.repeat(Math.max(0, 5 - appointment.customerRating))}</span>
                              </p> :
                              null}
                            {appointment.customerReview ?
                              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{appointment.customerReview}</p> :
                              null}
                            {appointment.customerReviewedAt ?
                              <p className="text-[11px] text-muted-foreground mt-1">
                                {new Date(appointment.customerReviewedAt).toLocaleString('tr-TR')}
                              </p> :
                              null}
                          </div> :

                          <p className="mt-3 text-[11px] text-muted-foreground">Bu randevu için değerlendirme yok.</p>
                        }
                      </div>
                    ) :

                    <p className="text-sm text-muted-foreground">Henüz randevu kaydı yok.</p>
                  }
                </div>
              </> :
              null}
          </div>
        </div> :
        null}
    </div>);

}