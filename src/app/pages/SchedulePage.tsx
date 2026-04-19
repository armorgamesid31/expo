import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react';
import { addDays, addMinutes, endOfDay, format, formatISO, startOfDay, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Banknote, CalendarDays, CircleHelp, CreditCard, ChevronLeft, ChevronRight, List, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type {
  AdminAppointmentItem,
  AdminAppointmentsResponse,
  AdminAppointmentRescheduleOptionsResponse,
  AdminAppointmentReschedulePreviewResponse,
  AppointmentStatusUpdateResponse,
  AdminWaitlistItem,
  AppointmentCheckoutRequest,
  AppointmentCheckoutResponse,
  CustomerPackageItem
} from
  '../types/mobile-api';
import { readSnapshot, writeSnapshot } from '../lib/ui-cache';

// Modular Components
import { CalendarSkeleton, ListSkeleton } from '../components/schedule/ScheduleSkeletons';
import { AppointmentCard } from '../components/schedule/AppointmentCard';
import { CheckoutDrawer } from '../components/schedule/CheckoutDrawer';
import { FloatingLabelInput } from '../components/ui/FloatingLabelInput';
import { DayNavigator } from '../components/analytics/DayNavigator';
import { asDateInputValue } from '../lib/analytics-range';

interface StaffItem {
  id: number;
  name: string;
  title?: string | null;
}

interface ServiceItem {
  id: number;
  name: string;
  duration: number;
  price: number;
  requiresSpecialist?: boolean;
}

interface CustomerItem {
  id: number;
  name: string | null;
  phone: string;
}

interface ServiceStaffItem {
  id: number;
  name: string;
  title?: string | null;
  overrideDuration?: number;
  overridePrice?: number;
}

interface ScheduleSnapshot {
  dayKey: string;
  staff: StaffItem[];
  services: ServiceItem[];
  appointments: AdminAppointmentsResponse['items'];
}

interface AppointmentGroup {
  key: string;
  customerName: string;
  customerPhone: string;
  startTime: string;
  endTime: string;
  items: AdminAppointmentItem[];
  totalPrice: number;
}

const DAY_START_HOUR = 9;
const DAY_END_HOUR = 21;
const SLOT_HEIGHT = 72;
const COLUMN_WIDTH = 180;
const SCHEDULE_CACHE_PREFIX = 'schedule:day';
const SCHEDULE_SELECTED_DATE_CACHE_KEY = 'schedule:selected-date';
type UIAppointmentStatus = 'BOOKED' | 'CONFIRMED' | 'UPDATED' | 'NO_SHOW' | 'CANCELLED' | 'COMPLETED' | 'MIXED';
type UIAppointmentAction = 'BOOKED' | 'CONFIRMED' | 'UPDATED' | 'NO_SHOW' | 'CANCELLED' | 'COMPLETED';
const APPOINTMENT_STATUS_ACTIONS: UIAppointmentAction[] = ['BOOKED', 'CONFIRMED', 'UPDATED', 'NO_SHOW', 'CANCELLED'];

function toWindowQuery(date: Date) {
  return {
    from: formatISO(startOfDay(date)),
    to: formatISO(endOfDay(date))
  };
}

function dayKeyFromDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function scheduleCacheKey(dayKey: string): string {
  return `${SCHEDULE_CACHE_PREFIX}:${dayKey}`;
}

function readScheduleSnapshot(date: Date): ScheduleSnapshot | null {
  return readSnapshot<ScheduleSnapshot>(scheduleCacheKey(dayKeyFromDate(date)), 1000 * 60 * 60 * 6);
}

function readScheduleSelectedDate(): Date {
  const cached = readSnapshot<string>(SCHEDULE_SELECTED_DATE_CACHE_KEY, 1000 * 60 * 60 * 24 * 90);
  if (!cached) return new Date();
  const parsed = new Date(`${cached}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function statusLabel(status: UIAppointmentStatus | string) {
  if (status === 'COMPLETED') return 'Tamamlandı';
  if (status === 'CANCELLED') return "İptal Edildi";
  if (status === 'NO_SHOW') return 'Gelmedi';
  if (status === 'CONFIRMED') return 'Onaylandı';
  if (status === 'UPDATED') return "Güncellendi";
  if (status === 'MIXED') return 'Karışık';
  return 'Rezerve';
}

function statusClass(status: UIAppointmentStatus | string) {
  if (status === 'COMPLETED') return 'border-l-2 border-emerald-500 bg-emerald-500/12';
  if (status === 'CANCELLED') return 'border-l-2 border-slate-400 bg-slate-400/12';
  if (status === 'NO_SHOW') return 'border-l-2 border-amber-500 bg-amber-500/14';
  if (status === 'CONFIRMED') return 'border-l-2 border-sky-500 bg-sky-500/12';
  if (status === 'UPDATED') return 'border-l-2 border-violet-500 bg-violet-500/12';
  if (status === 'MIXED') return 'border-l-2 border-indigo-500 bg-indigo-500/12';
  return 'border-l-2 border-[var(--primary)] bg-[var(--primary)]/14';
}

function combineDateTime(date: Date, timeValue: string): string {
  const [hours, minutes] = timeValue.split(':').map((value) => Number(value));
  const copy = new Date(date);
  copy.setHours(hours || 0, minutes || 0, 0, 0);
  return copy.toISOString();
}

function hourLabel(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`;
}

type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';
type CheckoutCloseType = 'SINGLE_PAYMENT' | 'USE_EXISTING_PACKAGE' | 'SELL_NEW_PACKAGE';

type CheckoutModalState = {
  appointmentIds: number[];
  mode: 'GROUP' | 'SPLIT';
};

type CheckoutTargetLine = {
  key: string;
  appointmentId: number;
  appointmentLineId: number | null;
  serviceId: number;
  serviceName: string;
  startTime: string;
};

type CheckoutLineDraft = {
  closeType: CheckoutCloseType;
  paymentMethod: PaymentMethod;
  customerPackageId: string;
};

function paymentMethodLabel(method: PaymentMethod) {
  if (method === 'CASH') return 'Nakit';
  if (method === 'CARD') return 'Kart';
  if (method === 'TRANSFER') return 'Havale/EFT';
  return 'Diğer';
}

function paymentMethodIcon(method: PaymentMethod) {
  if (method === 'CASH') return Banknote;
  if (method === 'CARD') return CreditCard;
  if (method === 'TRANSFER') return CalendarDays;
  return CircleHelp;
}

function formatPrice(value: number) {
  return `₺${Math.round(value).toLocaleString('tr-TR')}`;
}

function deriveGroupStatus(items: AdminAppointmentItem[], getStatus: (item: AdminAppointmentItem) => UIAppointmentStatus): UIAppointmentStatus {
  if (!items.length) return 'BOOKED';
  const first = getStatus(items[0]);
  if (items.every((item) => getStatus(item) === first)) return first;
  return 'MIXED';
}

type RescheduleSelectionState = {
  appointmentIds: number[];
  date: string;
  time: string;
  preview: AdminAppointmentReschedulePreviewResponse | null;
  assignments: Record<number, number>;
  error: string | null;
  loading: boolean;
  suggestionsLoading: boolean;
  suggestedSlots: AdminAppointmentRescheduleOptionsResponse['slots'];
};

function translateWaitlistStatus(status: string | null | undefined) {
  if (!status) return '-';
  const mapping: Record<string, string> = {
    'PENDING': 'Beklemede',
    'OFFERED': 'Teklif Gönderildi',
    'ACCEPTED': 'Kabul Edildi',
    'CANCELLED': 'İptal Edildi',
    'EXPIRED': 'Süresi Doldu',
    'COMPLETED': 'Tamamlandı'
  };
  return mapping[status] || status;
}

export function SchedulePage() {
  const { apiFetch } = useAuth();
  const [activeDate, setActiveDate] = useState<Date>(() => readScheduleSelectedDate());
  const [initialScheduleSnapshot] = useState<ScheduleSnapshot | null>(() => readScheduleSnapshot(activeDate));
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  const [staff, setStaff] = useState<StaffItem[]>(() => initialScheduleSnapshot?.staff || []);
  const [services, setServices] = useState<ServiceItem[]>(() => initialScheduleSnapshot?.services || []);
  const [appointments, setAppointments] = useState<AdminAppointmentsResponse['items']>(
    () => initialScheduleSnapshot?.appointments || []
  );
  const [waitlistItems, setWaitlistItems] = useState<AdminWaitlistItem[]>([]);

  const [loading, setLoading] = useState<boolean>(() => !initialScheduleSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);
  const [waitlistBusyId, setWaitlistBusyId] = useState<number | null>(null);
  const [waitlistMatching, setWaitlistMatching] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<number, 'CONFIRMED' | 'UPDATED'>>({});
  const [selectedAppointmentGroup, setSelectedAppointmentGroup] = useState<AppointmentGroup | null>(null);
  const [checkoutModal, setCheckoutModal] = useState<CheckoutModalState | null>(null);
  const [checkoutCustomerPackages, setCheckoutCustomerPackages] = useState<CustomerPackageItem[]>([]);
  const [checkoutPackagesLoading, setCheckoutPackagesLoading] = useState(false);
  const [checkoutPackageError, setCheckoutPackageError] = useState<string | null>(null);
  const [checkoutGroupCloseType, setCheckoutGroupCloseType] = useState<CheckoutCloseType>('SINGLE_PAYMENT');
  const [checkoutGroupPaymentMethod, setCheckoutGroupPaymentMethod] = useState<PaymentMethod>('CASH');
  const [checkoutGroupPackageId, setCheckoutGroupPackageId] = useState('');
  const [checkoutLineDrafts, setCheckoutLineDrafts] = useState<Record<string, CheckoutLineDraft>>({});
  const [checkoutNewPackageName, setCheckoutNewPackageName] = useState('');
  const [checkoutNewPackagePrice, setCheckoutNewPackagePrice] = useState('');
  const [checkoutNewPackagePaymentMethod, setCheckoutNewPackagePaymentMethod] = useState<PaymentMethod>('CASH');
  const [checkoutNewPackageScopeType, setCheckoutNewPackageScopeType] = useState<'SINGLE_SERVICE' | 'POOL'>('SINGLE_SERVICE');
  const [checkoutNewPackageQuota, setCheckoutNewPackageQuota] = useState('8');
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [rescheduleSelection, setRescheduleSelection] = useState<RescheduleSelectionState | null>(null);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistSaving, setWaitlistSaving] = useState(false);
  const [waitlistCreateError, setWaitlistCreateError] = useState<string | null>(null);
  const [waitlistSelectedServiceIds, setWaitlistSelectedServiceIds] = useState<string[]>([]);
  const [waitlistSelectedStaffByService, setWaitlistSelectedStaffByService] = useState<Record<string, string>>({});
  const [waitlistServiceStaffOptions, setWaitlistServiceStaffOptions] = useState<Record<string, ServiceStaffItem[]>>({});
  const [waitlistLoadingServiceStaff, setWaitlistLoadingServiceStaff] = useState<Record<string, boolean>>({});
  const [waitlistForm, setWaitlistForm] = useState({
    customerId: '',
    customerName: '',
    customerPhone: '',
    timeWindowStart: '10:00',
    timeWindowEnd: '18:00',
    allowNearbyMatches: false,
    notes: ''
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [serviceStaffOptions, setServiceStaffOptions] = useState<Record<string, ServiceStaffItem[]>>({});
  const [loadingServiceStaff, setLoadingServiceStaff] = useState<Record<string, boolean>>({});
  const [selectedStaffByService, setSelectedStaffByService] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    customerId: '',
    customerName: '',
    customerPhone: '',
    time: '10:00',
    notes: ''
  });

  const [quickActionGroup, setQuickActionGroup] = useState<AppointmentGroup | null>(null);

  const timeSlots = useMemo(() => {
    return Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, index) => DAY_START_HOUR + index);
  }, []);

  const timelineHeight = timeSlots.length * SLOT_HEIGHT;

  const dateText = useMemo(() => format(activeDate, 'EEEE, d MMMM', { locale: tr }), [activeDate]);
  const isToday = useMemo(() => format(activeDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'), [activeDate]);

  useEffect(() => {
    writeSnapshot(SCHEDULE_SELECTED_DATE_CACHE_KEY, format(activeDate, 'yyyy-MM-dd'));
  }, [activeDate]);

  const servicesById = useMemo(() => {
    const map: Record<string, ServiceItem> = {};
    for (const service of services) {
      map[String(service.id)] = service;
    }
    return map;
  }, [services]);

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }, [appointments]);

  const groupedAppointments = useMemo(() => {
    const groups: AppointmentGroup[] = [];
    const mergeThresholdMs = 5 * 60 * 1000;

    for (const appointment of sortedAppointments) {
      const customerKey = `${appointment.customerPhone || ''}|${(appointment.customerName || '').trim().toLowerCase()}`;
      const startMs = new Date(appointment.startTime).getTime();
      const endMs = new Date(appointment.endTime).getTime();
      const lastGroup = groups[groups.length - 1];

      if (!lastGroup) {
        groups.push({
          key: `${customerKey}-${appointment.id}`,
          customerName: appointment.customerName || 'Misafir',
          customerPhone: appointment.customerPhone || '-',
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          items: [appointment],
          totalPrice: appointment.service?.price || 0
        });
        continue;
      }

      const lastGroupCustomerKey = `${lastGroup.customerPhone || ''}|${(lastGroup.customerName || '').trim().toLowerCase()}`;
      const lastEndMs = new Date(lastGroup.endTime).getTime();
      const isSameCustomer = customerKey === lastGroupCustomerKey;
      const isBackToBack = startMs <= lastEndMs + mergeThresholdMs;

      if (isSameCustomer && isBackToBack) {
        lastGroup.items.push(appointment);
        lastGroup.endTime = endMs > lastEndMs ? appointment.endTime : lastGroup.endTime;
        lastGroup.totalPrice += appointment.service?.price || 0;
      } else {
        groups.push({
          key: `${customerKey}-${appointment.id}`,
          customerName: appointment.customerName || 'Misafir',
          customerPhone: appointment.customerPhone || '-',
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          items: [appointment],
          totalPrice: appointment.service?.price || 0
        });
      }
    }

    return groups;
  }, [sortedAppointments]);

  const appointmentGroupById = useMemo(() => {
    const map: Record<number, AppointmentGroup> = {};
    for (const group of groupedAppointments) {
      for (const item of group.items) {
        map[item.id] = group;
      }
    }
    return map;
  }, [groupedAppointments]);

  const appointmentById = useMemo(() => {
    const map: Record<number, AdminAppointmentItem> = {};
    for (const item of appointments) {
      map[item.id] = item;
    }
    return map;
  }, [appointments]);

  const getCheckoutTargets = useCallback(
    (appointmentIds: number[]): CheckoutTargetLine[] => {
      const targets: CheckoutTargetLine[] = [];
      for (const appointmentId of appointmentIds) {
        const item = appointmentById[appointmentId];
        if (!item) continue;
        const lines = Array.isArray(item.appointmentLines) && item.appointmentLines.length ?
          item.appointmentLines :
          [
            {
              id: 0,
              appointmentId: item.id,
              serviceId: item.service?.id,
              status: item.status,
              orderIndex: 0,
              service: item.service
            }];

        for (const line of lines) {
          targets.push({
            key: `${item.id}:${line.id || 0}`,
            appointmentId: item.id,
            appointmentLineId: line.id && line.id > 0 ? line.id : null,
            serviceId: line.serviceId || item.service?.id,
            serviceName: line.service?.name || item.service?.name,
            startTime: item.startTime
          });
        }
      }
      return targets;
    },
    [appointmentById]
  );

  const getDisplayStatus = useCallback(
    (item: AdminAppointmentItem): UIAppointmentStatus => {
      if (item.status === 'COMPLETED') return 'COMPLETED';
      if (item.status === 'CANCELLED') return 'CANCELLED';
      if (item.status === 'NO_SHOW') return 'NO_SHOW';
      return statusOverrides[item.id] || 'BOOKED';
    },
    [statusOverrides]
  );

  useEffect(() => {
    setStatusOverrides((previous) => {
      const next: Record<number, 'CONFIRMED' | 'UPDATED'> = {};
      for (const appointment of appointments) {
        const override = previous[appointment.id];
        if (override && appointment.status === 'BOOKED') {
          next[appointment.id] = override;
        }
      }
      return next;
    });
  }, [appointments]);

  const loadSchedule = useCallback(async () => {
    const window = toWindowQuery(activeDate);
    const dayKey = dayKeyFromDate(activeDate);
    const cached = readScheduleSnapshot(activeDate);
    if (cached) {
      setStaff(cached.staff);
      setServices(cached.services);
      setAppointments(cached.appointments);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);
    setWaitlistError(null);
    setWaitlistLoading(true);

    try {
      const [appointmentsResponse, staffResponse, servicesResponse, waitlistResponse] = await Promise.all([
        apiFetch<AdminAppointmentsResponse>(
          `/api/admin/appointments?from=${encodeURIComponent(window.from)}&to=${encodeURIComponent(window.to)}&limit=500`
        ),
        apiFetch<{ items: StaffItem[]; }>('/api/admin/staff'),
        apiFetch<{ items: ServiceItem[]; }>('/api/admin/services'),
        apiFetch<{ items: AdminWaitlistItem[]; }>(`/api/admin/waitlist?date=${encodeURIComponent(dayKey)}`)]
      );

      setAppointments(appointmentsResponse.items);
      setStaff(staffResponse.items);
      setServices(servicesResponse.items);
      setWaitlistItems(waitlistResponse.items || []);
      writeSnapshot(scheduleCacheKey(dayKey), {
        dayKey,
        appointments: appointmentsResponse.items,
        staff: staffResponse.items,
        services: servicesResponse.items
      });
    } catch (err: any) {
      setError(err?.message || "Takvim verileri alinamadi.");
    } finally {
      setLoading(false);
      setWaitlistLoading(false);
    }
  }, [activeDate, apiFetch]);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  const loadWaitlist = useCallback(async () => {
    const dayKey = dayKeyFromDate(activeDate);
    setWaitlistLoading(true);
    setWaitlistError(null);
    try {
      const response = await apiFetch<{ items: AdminWaitlistItem[]; }>(`/api/admin/waitlist?date=${encodeURIComponent(dayKey)}`);
      setWaitlistItems(response.items || []);
    } catch (err: any) {
      setWaitlistError(err?.message || "Bekleme listesi yüklenemedi.");
    } finally {
      setWaitlistLoading(false);
    }
  }, [activeDate, apiFetch]);

  const loadStaffForService = useCallback(
    async (serviceId: string) => {
      if (serviceStaffOptions[serviceId]) {
        return;
      }

      setLoadingServiceStaff((prev) => ({ ...prev, [serviceId]: true }));
      try {
        const response = await apiFetch<{ items: ServiceStaffItem[]; }>(`/api/admin/services/${serviceId}/staff`);
        setServiceStaffOptions((prev) => ({ ...prev, [serviceId]: response.items || [] }));

        if (response.items?.length === 1) {
          setSelectedStaffByService((prev) => ({ ...prev, [serviceId]: String(response.items[0].id) }));
        }
      } catch {
        setServiceStaffOptions((prev) => ({ ...prev, [serviceId]: [] }));
      } finally {
        setLoadingServiceStaff((prev) => ({ ...prev, [serviceId]: false }));
      }
    },
    [apiFetch, serviceStaffOptions]
  );

  const loadWaitlistStaffForService = useCallback(
    async (serviceId: string) => {
      if (waitlistServiceStaffOptions[serviceId]) {
        return;
      }

      setWaitlistLoadingServiceStaff((prev) => ({ ...prev, [serviceId]: true }));
      try {
        const response = await apiFetch<{ items: ServiceStaffItem[]; }>(`/api/admin/services/${serviceId}/staff`);
        setWaitlistServiceStaffOptions((prev) => ({ ...prev, [serviceId]: response.items || [] }));

        if (response.items?.length === 1) {
          setWaitlistSelectedStaffByService((prev) => ({ ...prev, [serviceId]: String(response.items[0].id) }));
        }
      } catch {
        setWaitlistServiceStaffOptions((prev) => ({ ...prev, [serviceId]: [] }));
      } finally {
        setWaitlistLoadingServiceStaff((prev) => ({ ...prev, [serviceId]: false }));
      }
    },
    [apiFetch, waitlistServiceStaffOptions]
  );

  const openCreateModal = useCallback(async () => {
    setCreateOpen(true);
    setCreateError(null);

    if (customers.length === 0) {
      setLoadingCustomers(true);
      try {
        const response = await apiFetch<{ items: CustomerItem[]; }>('/api/admin/customers?limit=30');
        setCustomers(response.items || []);
      } catch {



        // Optional list for fast selection.
      } finally { setLoadingCustomers(false); }
    }
  }, [apiFetch, customers.length]);

  const openWaitlistModal = useCallback(async () => {
    setWaitlistOpen(true);
    setWaitlistCreateError(null);
    setWaitlistSelectedServiceIds([]);
    setWaitlistSelectedStaffByService({});
    setWaitlistForm({
      customerId: '',
      customerName: '',
      customerPhone: '',
      timeWindowStart: '10:00',
      timeWindowEnd: '18:00',
      allowNearbyMatches: false,
      notes: ''
    });

    if (customers.length === 0) {
      setLoadingCustomers(true);
      try {
        const response = await apiFetch<{ items: CustomerItem[]; }>('/api/admin/customers?limit=30');
        setCustomers(response.items || []);
      } catch {



        // ignore
      } finally { setLoadingCustomers(false); }
    }
  }, [apiFetch, customers.length]);

  const closeCreateModal = () => {
    if (saving) {
      return;
    }
    setCreateOpen(false);
    setCreateError(null);
  };

  const handleCustomerSelect = (idValue: string) => {
    setForm((prev) => {
      if (!idValue) {
        return { ...prev, customerId: '', customerName: '', customerPhone: '' };
      }

      const selected = customers.find((item) => String(item.id) === idValue);
      if (!selected) {
        return { ...prev, customerId: idValue };
      }

      return {
        ...prev,
        customerId: idValue,
        customerName: selected.name || '',
        customerPhone: selected.phone || ''
      };
    });
  };

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) => {
      if (prev.includes(serviceId)) {
        const next = prev.filter((id) => id !== serviceId);
        return next;
      }
      return [...prev, serviceId];
    });

    if (!selectedServiceIds.includes(serviceId)) {
      void loadStaffForService(serviceId);
    }
  };

  const submitCreate = async () => {
    if (!form.time) {
      setCreateError('Saat seçimi zorunludur.');
      return;
    }

    if (selectedServiceIds.length === 0) {
      setCreateError('En az bir hizmet seçmelisiniz.');
      return;
    }

    if (!form.customerId && !form.customerPhone.trim()) {
      setCreateError("Müşteri telefon numarası zorunludur.");
      return;
    }

    for (const serviceId of selectedServiceIds) {
      const service = servicesById[serviceId];
      if (!service) {
        continue;
      }

      const options = serviceStaffOptions[serviceId] || [];
      if (options.length === 0) {
        setCreateError(`${service.name} için uygun uzman bulunamadı.`);
        return;
      }

      if (service.requiresSpecialist && options.length > 1 && !selectedStaffByService[serviceId]) {
        setCreateError(`${service.name} için uzman seçmelisiniz.`);
        return;
      }
    }

    setSaving(true);
    setCreateError(null);

    try {
      await apiFetch('/api/admin/appointments', {
        method: 'POST',
        body: JSON.stringify({
          customerId: form.customerId ? Number(form.customerId) : null,
          customerName: form.customerName.trim(),
          customerPhone: form.customerPhone.trim(),
          startTime: combineDateTime(activeDate, form.time),
          notes: form.notes.trim() || null,
          services: selectedServiceIds.map((serviceId) => ({
            serviceId: Number(serviceId),
            staffId: selectedStaffByService[serviceId] ? Number(selectedStaffByService[serviceId]) : null
          }))
        })
      });

      setCreateOpen(false);
      setSelectedServiceIds([]);
      setSelectedStaffByService({});
      setForm((prev) => ({ ...prev, customerId: '', customerName: '', customerPhone: '', notes: '' }));
      await loadSchedule();
    } catch (err: any) {
      setCreateError(err?.message || 'Randevu oluşturulamadı.');
    } finally {
      setSaving(false);
    }
  };

  const summarizePackageAutomation = (events: AppointmentStatusUpdateResponse['packageAutomation']['events']) => {
    if (!events.length) {
      return "Paket işlemi yok.";
    }
    const consumed = events.filter((item) => item.type === 'AUTO_CONSUME').length;
    const restored = events.filter((item) => item.type === 'AUTO_RESTORE').length;
    const skippedExpired = events.filter((item) => item.type === 'SKIPPED_EXPIRED').length;
    const skippedNoEligible = events.filter((item) => item.type === 'SKIPPED_NO_ELIGIBLE_PACKAGE').length;
    const idempotent = events.filter((item) => item.type === 'IDEMPOTENT').length;

    const parts: string[] = [];
    if (consumed) parts.push(`${consumed} kullanım uygulandı`);
    if (restored) parts.push(`${restored} kullanım iade edildi`);
    if (skippedExpired) parts.push(`${skippedExpired} atlandı (süresi dolmuş paket)`);
    if (skippedNoEligible) parts.push(`${skippedNoEligible} atlandı (uygun paket yok)`);
    if (idempotent) parts.push(`${idempotent} zaten işlendi`);
    return parts.join(' • ');
  };

  const updateAppointmentStatus = async (
    appointmentId: number,
    status: 'BOOKED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW',
    paymentMethod?: PaymentMethod) => {
    const payload: { status: 'BOOKED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'; paymentMethod?: PaymentMethod; } = { status };
    if (status === 'COMPLETED' && paymentMethod) {
      payload.paymentMethod = paymentMethod;
    }
    return apiFetch<AppointmentStatusUpdateResponse>(`/api/admin/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  };

  const toRescheduleAssignmentsPayload = (assignments: Record<number, number>) => {
    return Object.entries(assignments).
      map(([appointmentId, staffId]) => ({
        appointmentId: Number(appointmentId),
        staffId: Number(staffId)
      })).
      filter((item) => Number.isInteger(item.appointmentId) && item.appointmentId > 0 && Number.isInteger(item.staffId) && item.staffId > 0);
  };

  const mapUiActionToBackendStatus = (action: UIAppointmentAction): 'BOOKED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' => {
    if (action === 'NO_SHOW') return 'NO_SHOW';
    if (action === 'CANCELLED') return 'CANCELLED';
    if (action === 'COMPLETED') return 'COMPLETED';
    return 'BOOKED';
  };

  const applyStatusToAppointments = async (
    appointmentIds: number[],
    action: UIAppointmentAction,
    paymentMethod?: PaymentMethod) => {
    if (!appointmentIds.length) return;
    const status = mapUiActionToBackendStatus(action);

    setStatusBusy(true);
    setStatusUpdatingId(appointmentIds[0] || null);
    setStatusFeedback(null);
    try {
      const allEvents: AppointmentStatusUpdateResponse['packageAutomation']['events'] = [];
      for (const appointmentId of appointmentIds) {
        const response = await updateAppointmentStatus(appointmentId, status, paymentMethod);
        allEvents.push(...(response.packageAutomation?.events || []));
      }

      if (action === 'CONFIRMED') {
        setStatusFeedback(`${appointmentIds.length} randevu onaylandı.`);
      } else if (action === 'UPDATED') {
        setStatusFeedback(`${appointmentIds.length} randevu güncellendi.`);
      } else if (action === 'BOOKED') {
        setStatusFeedback(`${appointmentIds.length} randevu rezervasyona alındı.`);
      } else {
        const summary = summarizePackageAutomation(allEvents);
        setStatusFeedback(`${appointmentIds.length} randevu güncellendi: ${summary}`);
      }
      await loadSchedule();
      setStatusOverrides((previous) => {
        const next = { ...previous };
        for (const appointmentId of appointmentIds) {
          if (action === 'CONFIRMED' || action === 'UPDATED') {
            next[appointmentId] = action;
          } else {
            delete next[appointmentId];
          }
        }
        return next;
      });
      setSelectedAppointmentGroup(null);
    } catch (err: any) {
      setStatusFeedback(err?.message || "Durum güncellenemedi.");
    } finally {
      setStatusUpdatingId(null);
      setStatusBusy(false);
    }
  };

  const openCheckoutModal = async (appointmentIds: number[]) => {
    if (!appointmentIds.length) return;
    const selectedItems = appointmentIds.
      map((id) => appointmentById[id]).
      filter((item): item is AdminAppointmentItem => Boolean(item));
    if (!selectedItems.length) return;

    const customerIdListe = Array.from(
      new Set(
        selectedItems.
          map((item) => item.customerId !== null && item.customerId !== undefined ? Number(item.customerId) : NaN).
          filter((value) => Number.isInteger(value) && value > 0)
      )
    );

    setCheckoutModal({
      appointmentIds,
      mode: 'GROUP'
    });
    setCheckoutGroupCloseType('SINGLE_PAYMENT');
    setCheckoutGroupPaymentMethod('CASH');
    setCheckoutGroupPackageId('');
    setCheckoutPackageError(null);
    setCheckoutNewPackageName('Yeni Özel Paket');
    setCheckoutNewPackagePrice('');
    setCheckoutNewPackagePaymentMethod('CASH');
    setCheckoutNewPackageScopeType('SINGLE_SERVICE');
    setCheckoutNewPackageQuota('8');

    const checkoutTargets = getCheckoutTargets(appointmentIds);
    const nextLineDrafts: Record<string, CheckoutLineDraft> = {};
    for (const target of checkoutTargets) {
      nextLineDrafts[target.key] = {
        closeType: 'SINGLE_PAYMENT',
        paymentMethod: 'CASH',
        customerPackageId: ''
      };
    }
    setCheckoutLineDrafts(nextLineDrafts);

    if (customerIdListe.length !== 1) {
      setCheckoutCustomerPackages([]);
      if (!customerIdListe.length) {
        setCheckoutPackageError('Bu kayıtlar paket için uygun değil (müşteri kaydı yok).');
      } else {
        setCheckoutPackageError('Seçilen satırlar tek bir müşteriye ait olmalı.');
      }
      return;
    }

    const customerId = customerIdListe[0];
    setCheckoutPackagesLoading(true);
    try {
      const response = await apiFetch<{ items: CustomerPackageItem[]; }>(`/api/admin/customers/${customerId}/packages`);
      setCheckoutCustomerPackages((response.items || []).filter((item) => item.status === 'ACTIVE'));
    } catch (err: any) {
      setCheckoutCustomerPackages([]);
      setCheckoutPackageError(err?.message || 'Aktif paketler yüklenemedi.');
    } finally {
      setCheckoutPackagesLoading(false);
    }
  };

  const submitCheckout = async () => {
    if (!checkoutModal) return;
    const selectedItems = checkoutModal.appointmentIds.map((id) => appointmentById[id]).filter((item): item is AdminAppointmentItem => Boolean(item));
    const checkoutTargets = getCheckoutTargets(checkoutModal.appointmentIds);
    if (!selectedItems.length || !checkoutTargets.length) return;

    const usesSellNewInGroup = checkoutModal.mode === 'GROUP' && checkoutGroupCloseType === 'SELL_NEW_PACKAGE';
    const usesSellNewInSplit = checkoutModal.mode === 'SPLIT' && checkoutTargets.some((target) => checkoutLineDrafts[target.key]?.closeType === 'SELL_NEW_PACKAGE');
    const usesSellNew = usesSellNewInGroup || usesSellNewInSplit;

    const lines: AppointmentCheckoutRequest['lines'] = checkoutTargets.map((target) => {
      if (checkoutModal.mode === 'GROUP') {
        return {
          appointmentId: target.appointmentId,
          appointmentLineId: target.appointmentLineId,
          closeType: checkoutGroupCloseType,
          paymentMethod: checkoutGroupCloseType === 'SINGLE_PAYMENT' ? checkoutGroupPaymentMethod : null,
          customerPackageId: checkoutGroupCloseType === 'USE_EXISTING_PACKAGE' ? Number(checkoutGroupPackageId || 0) || null : null
        };
      }
      const draft = checkoutLineDrafts[target.key] || {
        closeType: 'SINGLE_PAYMENT',
        paymentMethod: 'CASH',
        customerPackageId: ''
      };
      return {
        appointmentId: target.appointmentId,
        appointmentLineId: target.appointmentLineId,
        closeType: draft.closeType,
        paymentMethod: draft.closeType === 'SINGLE_PAYMENT' ? draft.paymentMethod : null,
        customerPackageId: draft.closeType === 'USE_EXISTING_PACKAGE' ? Number(draft.customerPackageId || 0) || null : null
      };
    });

    if (lines.some((line) => line.closeType === 'USE_EXISTING_PACKAGE' && !line.customerPackageId)) {
      setCheckoutPackageError('Mevcut paket kullanımında paket seçimi zorunlu.');
      return;
    }

    let newPackage: AppointmentCheckoutRequest['newPackage'] | undefined = undefined;
    if (usesSellNew) {
      const normalizedName = checkoutNewPackageName.trim();
      const quota = Number(checkoutNewPackageQuota);
      if (!normalizedName) {
        setCheckoutPackageError('Yeni paket adı zorunlu.');
        return;
      }
      if (!Number.isInteger(quota) || quota <= 0) {
        setCheckoutPackageError('Yeni paket hak adedi pozitif tam sayı olmalı.');
        return;
      }
      const uniqueServiceIds = Array.from(new Set(checkoutTargets.map((target) => Number(target.serviceId)).filter((id) => Number.isInteger(id) && id > 0)));
      newPackage = {
        name: normalizedName,
        scopeType: checkoutNewPackageScopeType,
        price: checkoutNewPackagePrice.trim() ? Number(checkoutNewPackagePrice) : null,
        notes: 'checkout_custom_package',
        paymentMethod: checkoutNewPackagePaymentMethod,
        services: uniqueServiceIds.map((serviceId) => ({
          serviceId,
          initialQuota: quota
        }))
      };
    }

    setCheckoutSubmitting(true);
    setStatusBusy(true);
    setStatusUpdatingId(checkoutTargets[0]?.appointmentId || null);
    setStatusFeedback(null);
    setCheckoutPackageError(null);
    try {
      const response = await apiFetch<AppointmentCheckoutResponse>('/api/admin/appointments/checkout', {
        method: 'POST',
        body: JSON.stringify({
          mode: checkoutModal.mode,
          lines,
          ...(newPackage ? { newPackage } : {})
        } satisfies AppointmentCheckoutRequest)
      });
      await loadSchedule();
      setSelectedAppointmentGroup(null);
      setCheckoutModal(null);
      setStatusFeedback(response.summary?.message || `${checkoutTargets.length} satır kapatıldı.`);
    } catch (err: any) {
      setCheckoutPackageError(err?.message || "Ödeme işlemi tamamlanamadı.");
    } finally {
      setCheckoutSubmitting(false);
      setStatusUpdatingId(null);
      setStatusBusy(false);
    }
  };

  const runReschedulePreview = async () => {
    if (!rescheduleSelection) return;
    const parsed = new Date(`${rescheduleSelection.date}T${rescheduleSelection.time}:00`);
    if (Number.isNaN(parsed.getTime())) {
      setRescheduleSelection((prev) => prev ? { ...prev, error: 'Lütfen geçerli bir tarih ve saat seçin.' } : prev);
      return;
    }

    setRescheduleSelection((prev) => prev ? { ...prev, loading: true, error: null } : prev);
    try {
      const preview = await apiFetch<AdminAppointmentReschedulePreviewResponse>('/api/admin/appointments/reschedule-preview', {
        method: 'POST',
        body: JSON.stringify({
          appointmentIds: rescheduleSelection.appointmentIds,
          newStartTime: parsed.toISOString(),
          assignments: toRescheduleAssignmentsPayload(rescheduleSelection.assignments)
        })
      });

      const error =
        preview.hasConflicts && preview.conflicts.length ?
          preview.conflicts[0].reason || 'Seçilen saat uygun değil.' :
          null;
      setRescheduleSelection((prev) => prev ? { ...prev, preview, loading: false, error } : prev);
    } catch (err: any) {
      setRescheduleSelection((prev) =>
        prev ? { ...prev, loading: false, error: err?.message || 'Yeniden planlama önizlemesi başarısız oldu.' } : prev
      );
    }
  };

  const submitWaitlistCreate = async () => {
    if (!waitlistForm.timeWindowStart || !waitlistForm.timeWindowEnd) {
      setWaitlistCreateError('Saat aralığı zorunludur.');
      return;
    }
    if (waitlistForm.timeWindowStart >= waitlistForm.timeWindowEnd) {
      setWaitlistCreateError('Bitiş saati başlangıç saatinden sonra olmalıdır.');
      return;
    }
    if (waitlistSelectedServiceIds.length === 0) {
      setWaitlistCreateError('En az bir hizmet seçmelisiniz.');
      return;
    }
    if (!waitlistForm.customerName.trim() || !waitlistForm.customerPhone.trim()) {
      setWaitlistCreateError("Müşteri adı ve telefon zorunludur.");
      return;
    }

    setWaitlistSaving(true);
    setWaitlistCreateError(null);

    try {
      await apiFetch('/api/admin/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          date: dayKeyFromDate(activeDate),
          timeWindowStart: waitlistForm.timeWindowStart,
          timeWindowEnd: waitlistForm.timeWindowEnd,
          allowNearbyMatches: waitlistForm.allowNearbyMatches,
          nearbyToleranceMinutes: 60,
          customerId: waitlistForm.customerId ? Number(waitlistForm.customerId) : null,
          customerName: waitlistForm.customerName.trim(),
          customerPhone: waitlistForm.customerPhone.trim(),
          notes: waitlistForm.notes.trim() || null,
          groups: [
            {
              personId: 'p1',
              services: waitlistSelectedServiceIds.map((serviceId) => ({
                serviceId: Number(serviceId),
                allowedStaffIds: waitlistSelectedStaffByService[serviceId] ?
                  [Number(waitlistSelectedStaffByService[serviceId])] :
                  null
              }))
            }]

        })
      });

      setWaitlistOpen(false);
      await loadWaitlist();
    } catch (err: any) {
      setWaitlistCreateError(err?.message || 'Bekleme listesi kaydı oluşturulamadı.');
    } finally {
      setWaitlistSaving(false);
    }
  };

  const triggerWaitlistMatcher = async () => {
    setWaitlistMatching(true);
    setWaitlistError(null);
    try {
      const response = await apiFetch<{ items: AdminWaitlistItem[]; }>('/api/admin/waitlist/match', {
        method: 'POST',
        body: JSON.stringify({ date: dayKeyFromDate(activeDate) })
      });
      setWaitlistItems(response.items || []);
    } catch (err: any) {
      setWaitlistError(err?.message || 'Bekleme listesi eşleştiricisi çalıştırılamadı.');
    } finally {
      setWaitlistMatching(false);
    }
  };

  const sendManualWaitlistOffer = async (entryId: number) => {
    setWaitlistBusyId(entryId);
    try {
      await apiFetch(`/api/admin/waitlist/${entryId}/offer`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      await loadWaitlist();
    } catch (err: any) {
      setWaitlistError(err?.message || 'Teklif gönderilemedi.');
    } finally {
      setWaitlistBusyId(null);
    }
  };

  const cancelWaitlist = async (entryId: number) => {
    setWaitlistBusyId(entryId);
    try {
      await apiFetch(`/api/admin/waitlist/${entryId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      await loadWaitlist();
    } catch (err: any) {
      setWaitlistError(err?.message || 'Bekleme listesi kaydı iptal edilemedi.');
    } finally {
      setWaitlistBusyId(null);
    }
  };

  const toggleWaitlistService = (serviceId: string) => {
    setWaitlistSelectedServiceIds((prev) => {
      if (prev.includes(serviceId)) {
        return prev.filter((id) => id !== serviceId);
      }
      return [...prev, serviceId];
    });

    if (!waitlistSelectedServiceIds.includes(serviceId)) {
      void loadWaitlistStaffForService(serviceId);
    }
  };

  const handleWaitlistCustomerSelect = (idValue: string) => {
    setWaitlistForm((prev) => {
      if (!idValue) {
        return { ...prev, customerId: '', customerName: '', customerPhone: '' };
      }

      const selected = customers.find((item) => String(item.id) === idValue);
      if (!selected) {
        return { ...prev, customerId: idValue };
      }

      return {
        ...prev,
        customerId: idValue,
        customerName: selected.name || '',
        customerPhone: selected.phone || ''
      };
    });
  };

  useEffect(() => {
    if (!rescheduleSelection?.date) return;

    const appointmentIds = [...rescheduleSelection.appointmentIds];
    const date = rescheduleSelection.date;
    const assignments = toRescheduleAssignmentsPayload(rescheduleSelection.assignments);
    let active = true;

    setRescheduleSelection((prev) =>
      prev ?
        {
          ...prev,
          suggestionsLoading: true
        } :
        prev
    );

    void apiFetch<AdminAppointmentRescheduleOptionsResponse>('/api/admin/appointments/reschedule-options', {
      method: 'POST',
      body: JSON.stringify({
        appointmentIds,
        date,
        assignments
      })
    }).
      then((options) => {
        if (!active) return;
        setRescheduleSelection((prev) =>
          prev ?
            {
              ...prev,
              suggestionsLoading: false,
              suggestedSlots: options.slots || []
            } :
            prev
        );
      }).
      catch(() => {
        if (!active) return;
        setRescheduleSelection((prev) =>
          prev ?
            {
              ...prev,
              suggestionsLoading: false,
              suggestedSlots: []
            } :
            prev
        );
      });

    return () => {
      active = false;
    };
  }, [
    apiFetch,
    rescheduleSelection?.date,
    rescheduleSelection?.appointmentIds,
    JSON.stringify(toRescheduleAssignmentsPayload(rescheduleSelection?.assignments || {}))]
  );

  const commitRescheduleSelection = async () => {
    if (!rescheduleSelection) return;
    const parsed = new Date(`${rescheduleSelection.date}T${rescheduleSelection.time}:00`);
    if (Number.isNaN(parsed.getTime())) {
      setRescheduleSelection((prev) => prev ? { ...prev, error: 'Lütfen geçerli bir tarih ve saat seçin.' } : prev);
      return;
    }

    if (!rescheduleSelection.preview) {
      await runReschedulePreview();
      return;
    }
    if (rescheduleSelection.preview.hasConflicts) {
      setRescheduleSelection((prev) =>
        prev ? { ...prev, error: prev.preview?.conflicts?.[0]?.reason || 'Seçilen saatte çakışma var.' } : prev
      );
      return;
    }

    const needsManualItems = rescheduleSelection.preview.items.filter((item) => item.needsManualChoice);
    for (const item of needsManualItems) {
      if (!rescheduleSelection.assignments[item.appointmentId]) {
        setRescheduleSelection((prev) =>
          prev ? { ...prev, error: `Lütfen ${item.serviceName} için bir uzman seçin.` } : prev
        );
        return;
      }
    }

    setStatusBusy(true);
    setStatusUpdatingId(rescheduleSelection.appointmentIds[0] || null);
    setStatusFeedback(null);
    setRescheduleSelection((prev) => prev ? { ...prev, loading: true, error: null } : prev);
    try {
      const committed = await apiFetch<{ batchId: string; previousAppointmentIds: number[]; items: AdminAppointmentItem[]; }>(
        '/api/admin/appointments/reschedule-commit',
        {
          method: 'POST',
          body: JSON.stringify({
            appointmentIds: rescheduleSelection.appointmentIds,
            newStartTime: parsed.toISOString(),
            assignments: toRescheduleAssignmentsPayload(rescheduleSelection.assignments),
            idempotencyKey: `admin-${Date.now()}`
          })
        }
      );

      await loadSchedule();
      setStatusOverrides((previous) => {
        const next = { ...previous };
        for (const id of committed.previousAppointmentIds || []) {
          delete next[id];
        }
        for (const item of committed.items || []) {
          next[item.id] = 'UPDATED';
        }
        return next;
      });
      setSelectedAppointmentGroup(null);
      setRescheduleSelection(null);
      setStatusFeedback(`${(committed.items || []).length} randevu başarıyla yeniden planlandı.`);
    } catch (err: any) {
      const message = err?.message || 'Yeniden planlama başarısız oldu.';
      setStatusFeedback(message);
      setRescheduleSelection((prev) => prev ? { ...prev, loading: false, error: message } : prev);
    } finally {
      setStatusUpdatingId(null);
      setStatusBusy(false);
    }
  };

  const requestStatusChange = (appointmentIds: number[], nextStatus: UIAppointmentAction) => {
    if (!appointmentIds.length) return;
    if (nextStatus === 'COMPLETED') {
      void openCheckoutModal(appointmentIds);
      return;
    }
    if (nextStatus === 'UPDATED') {
      const selectedItems = appointmentIds.
        map((id) => appointmentById[id]).
        filter((item): item is AdminAppointmentItem => Boolean(item)).
        sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      if (!selectedItems.length) return;
      const firstStart = new Date(selectedItems[0].startTime);
      setRescheduleSelection({
        appointmentIds,
        date: format(firstStart, 'yyyy-MM-dd'),
        time: format(firstStart, 'HH:mm'),
        preview: null,
        assignments: {},
        error: null,
        loading: false,
        suggestionsLoading: false,
        suggestedSlots: []
      });
      return;
    }
    void applyStatusToAppointments(appointmentIds, nextStatus);
  };

  const requestPaymentSelection = (appointmentIds: number[]) => {
    if (!appointmentIds.length) return;
    void openCheckoutModal(appointmentIds);
  };

  const checkoutSummary = (() => {
    if (!checkoutModal) return null;
    const targets = getCheckoutTargets(checkoutModal.appointmentIds);
    if (!targets.length) return null;

    let singlePayment = 0;
    let existingPackage = 0;
    let sellNewPackage = 0;

    for (const target of targets) {
      const closeType =
        checkoutModal.mode === 'GROUP' ?
          checkoutGroupCloseType :
          checkoutLineDrafts[target.key]?.closeType || 'SINGLE_PAYMENT';
      if (closeType === 'SINGLE_PAYMENT') singlePayment += 1;
      if (closeType === 'USE_EXISTING_PACKAGE') existingPackage += 1;
      if (closeType === 'SELL_NEW_PACKAGE') sellNewPackage += 1;
    }

    return {
      total: targets.length,
      singlePayment,
      existingPackage,
      sellNewPackage
    };
  })();

  const getAppointmentStyle = (startIso: string, endIso: string) => {
    const start = new Date(startIso);
    const end = new Date(endIso);

    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();

    const dayStartMinutes = DAY_START_HOUR * 60;
    const topMinutes = Math.max(0, startMinutes - dayStartMinutes);
    const durationMinutes = Math.max(15, endMinutes - startMinutes);

    const pixelsPerMinute = SLOT_HEIGHT / 60;

    return {
      top: topMinutes * pixelsPerMinute,
      height: Math.max(36, durationMinutes * pixelsPerMinute)
    };
  };

  return (
    <>
      <div id="kedy-app-schedule-root" className="min-h-screen bg-background">
        <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Randevular</h1>
        <button
          type="button"
          onClick={() => void openCreateModal()}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-primary to-primary-dark px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300">

          <Plus className="h-4 w-4" />
          Yeni Randevu
        </button>
      </div>

      <div className="inline-flex rounded-lg border border-border bg-card p-1">
        <button
          type="button"
          onClick={() => setViewMode('calendar')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition-all duration-300 ${viewMode === 'calendar' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-muted-foreground hover:bg-muted font-medium'}`
          }>

          <CalendarDays className="h-3.5 w-3.5" />
          Takvim
        </button>
        <button
          type="button"
          onClick={() => setViewMode('list')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition-all duration-300 ${viewMode === 'list' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-muted-foreground hover:bg-muted font-medium'}`
          }>

          <List className="h-3.5 w-3.5" />
          Liste
        </button>
      </div>

      <DayNavigator 
        dateValue={format(activeDate, 'yyyy-MM-dd')}
        onDateChange={(next) => setActiveDate(new Date(`${next}T12:00:00`))}
        onPrevDay={() => setActiveDate((prev) => subDays(prev, 1))}
        onNextDay={() => setActiveDate((prev) => addDays(prev, 1))}
      />

      {loading && viewMode === 'calendar' && <CalendarSkeleton />}
      {loading && viewMode === 'list' && <ListSkeleton />}
      
      {error && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
          {error}
        </div>
      )}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Bekleme Listesi</h2>
            <p className="text-xs text-muted-foreground">İstekler: {format(activeDate, 'dd MMM yyyy', { locale: tr })} ve son teklif durumu.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void triggerWaitlistMatcher()}
              disabled={waitlistMatching}
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground disabled:opacity-50">

              {waitlistMatching ? 'Eşleştiriliyor...' : 'Eşleştiriciyi Çalıştır'}
            </button>
            <button
              type="button"
              onClick={() => void openWaitlistModal()}
              className="rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white">

              Bekleme Listesi Ekle
            </button>
          </div>
        </div>
        {waitlistLoading ? <p className="text-xs text-muted-foreground">Bekleme listesi yükleniyor...</p> : null}
        {waitlistError ? <p className="text-xs text-red-500">{waitlistError}</p> : null}
        {waitlistItems.length ?
          <div className="space-y-2">
            {waitlistItems.map((item) =>
              <div key={item.id} className="rounded-xl border border-border bg-background/70 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{item.customerName}</p>
                    <p className="text-xs text-muted-foreground">{item.customerPhone}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.timeWindowStart} - {item.timeWindowEnd} • {item.source === 'ADMIN' ? "Salon ekledi" : "Müşteri ekledi"}
                    </p>
                    {item.allowNearbyMatches ?
                      <p className="text-[11px] text-muted-foreground">Yakınlık toleransı: ±{item.nearbyToleranceMinutes} dk</p> :
                      null}
                  </div>
                  <div className="text-right">
                    <span className="rounded-full border border-border px-2 py-1 text-[11px] font-semibold">
                      {translateWaitlistStatus(item.status)}
                    </span>
                    {item.latestOffer ?
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Teklif: {item.latestOffer.slotStartTime} - {item.latestOffer.slotEndTime} • {translateWaitlistStatus(item.latestOffer.status)}
                      </p> :
                      null}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.groups.flatMap((group) => group.services).map((service, index) => {
                    const serviceMeta = services.find((entry) => entry.id === service.serviceId);
                    return (
                      <span key={`${item.id}-${service.serviceId}-${index}`} className="rounded-full border border-border bg-card px-2 py-1 text-[11px]">
                        {serviceMeta?.name || `Hizmet #${service.serviceId}`}
                      </span>);

                  })}
                </div>
                {item.notes ? <p className="mt-2 text-xs text-muted-foreground">{item.notes}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={waitlistBusyId === item.id || item.status !== 'PENDING'}
                    onClick={() => void sendManualWaitlistOffer(item.id)}
                    className="rounded-lg border border-emerald-300/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 disabled:opacity-50">

                    {waitlistBusyId === item.id ? 'İşlem yapılıyor...' : "Teklif Gönder"}
                  </button>
                  <button
                    type="button"
                    disabled={waitlistBusyId === item.id || item.status === 'CANCELLED' || item.status === 'ACCEPTED'}
                    onClick={() => void cancelWaitlist(item.id)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground disabled:opacity-50">

                    İptal
                  </button>
                </div>
              </div>
            )}
          </div> :
          waitlistLoading ? null :
            <p className="text-xs text-muted-foreground">Bu gün için henüz bekleme listesi talebi yok.</p>
        }
      </div>
      {statusFeedback ? <p className="text-sm text-[var(--deep-indigo)]">{statusFeedback}</p> : null}

      {viewMode === 'calendar' ?
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
            <div className="min-w-[760px]">
              <div className="flex border-b border-border sticky top-0 bg-card z-10">
                <div className="w-16 shrink-0 border-r border-border" />
                <div className="flex flex-1">
                  {staff.map((member) =>
                    <div key={member.id} className="border-r border-border px-2 py-2" style={{ width: COLUMN_WIDTH }}>
                      <p className="text-xs font-semibold truncate">{member.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{member.title || 'Uzman'}</p>
                    </div>
                  )}
                  {!staff.length ?
                    <div className="px-3 py-3 text-xs text-muted-foreground">Takvim için personel bulunamadı.</div> :
                    null}
                </div>
              </div>

              <div className="flex">
                <div className="w-16 shrink-0 border-r border-border bg-card/95 sticky left-0 z-10">
                  {timeSlots.map((hour) =>
                    <div
                      key={hour}
                      className="border-b border-border/70 px-1 text-[11px] text-muted-foreground"
                      style={{ height: SLOT_HEIGHT }}>

                      <span className="-translate-y-2 inline-block">{hourLabel(hour)}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-1">
                  {staff.map((member) => {
                    const rows = appointments.filter((item) => item.staff?.id === member.id);
                    return (
                      <div key={member.id} className="relative border-r border-border" style={{ width: COLUMN_WIDTH, height: timelineHeight }}>
                        {timeSlots.map((hour) =>
                          <div key={`${member.id}-${hour}`} className="border-b border-border/70" style={{ height: SLOT_HEIGHT }} />
                        )}

                        {rows.map((appointment) => {
                          const block = getAppointmentStyle(appointment.startTime, appointment.endTime);
                          const appointmentDisplayStatus = getDisplayStatus(appointment);
                          
                          return (
                            <AppointmentCard
                              key={appointment.id}
                              viewMode="calendar"
                              customerName={appointment.customerName}
                              customerPhone={appointment.customerPhone || ''}
                              startTime={appointment.startTime}
                              endTime={appointment.endTime}
                              totalPrice={appointment.service?.price || 0}
                              status={appointmentDisplayStatus as any}
                              serviceNames={[appointment.service?.name || 'Hizmet']}
                                style={{ top: block.top, height: block.height }}
                                onClick={() => setSelectedAppointmentGroup(appointmentGroupById[appointment.id] || null)}
                                onLongPress={() => setQuickActionGroup(appointmentGroupById[appointment.id] || null)}
                              />
                          );
                        })}
                      </div>);

                  })}
                </div>
              </div>
            </div>
          </div>
        </div> :

        <div className="space-y-4">
          {groupedAppointments.length === 0 ? (
            <div className="glass-card p-8 rounded-2xl border-dashed border-2 text-center text-muted-foreground">
              Bu gün için randevu bulunmuyor.
            </div>
          ) : (
            <div className="space-y-3">
              {groupedAppointments.map((group) => (
                <AppointmentCard
                  key={group.key}
                  viewMode="list"
                  customerName={group.customerName}
                  customerPhone={group.customerPhone}
                  startTime={group.startTime}
                  endTime={group.endTime}
                  totalPrice={group.totalPrice}
                   status={deriveGroupStatus(group.items, getDisplayStatus) as any}
                   serviceNames={Array.from(new Set(group.items.map(item => item.service?.name || 'Hizmet')))}
                   onClick={() => setSelectedAppointmentGroup(group)}
                   onLongPress={() => setQuickActionGroup(group)}
                 />
              ))}
            </div>
          )}
        </div>
      }

      {!loading && !appointments.length && viewMode === 'calendar' ?
        <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          Bu gün için randevu yok.
        </div> :
        null}

      {selectedAppointmentGroup ?
        <div className="fixed inset-0 z-50 bg-black/35 p-4" onClick={() => setSelectedAppointmentGroup(null)}>
          <div
            className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-background p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}>

            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Randevu Detayları</h2>
              <button type="button" onClick={() => setSelectedAppointmentGroup(null)} className="text-sm text-muted-foreground">
                Kapat
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="rounded-lg border border-border p-3">
                <p className="font-semibold">{selectedAppointmentGroup.customerName}</p>
                <p className="text-xs text-muted-foreground">{selectedAppointmentGroup.customerPhone}</p>
              </div>
              <div className="rounded-lg border border-border p-3 space-y-1">
                <p>
                  <span className="text-muted-foreground">Saat:</span>{' '}
                  {format(new Date(selectedAppointmentGroup.startTime), 'HH:mm')} -{' '}
                  {format(new Date(selectedAppointmentGroup.endTime), 'HH:mm')}
                </p>
                <p>
                  <span className="text-muted-foreground">Durum:</span>{' '}
                  {statusLabel(deriveGroupStatus(selectedAppointmentGroup.items, getDisplayStatus))}
                </p>
                <p>
                  <span className="text-muted-foreground">Toplam tutar:</span> {formatPrice(selectedAppointmentGroup.totalPrice)}
                </p>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Dahil edilen randevular</p>
                {selectedAppointmentGroup.items.map((item) =>
                  <div key={item.id} className="rounded-md border border-border/70 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{item.service?.name}</p>
                      <p className="text-xs text-muted-foreground">{formatPrice(item.service?.price || 0)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(item.startTime), 'HH:mm')} - {format(new Date(item.endTime), 'HH:mm')} • {item.staff?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {statusLabel(getDisplayStatus(item))}
                      {item.status === 'COMPLETED' && item.paymentMethod ? ` • ${paymentMethodLabel(item.paymentMethod as PaymentMethod)}` : ''}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {APPOINTMENT_STATUS_ACTIONS.map((status) =>
                <button
                  key={status}
                  type="button"
                  disabled={
                    statusBusy ||
                    deriveGroupStatus(selectedAppointmentGroup.items, getDisplayStatus) !== 'MIXED' &&
                    deriveGroupStatus(selectedAppointmentGroup.items, getDisplayStatus) === status
                  }
                  onClick={() => {
                    requestStatusChange(
                      selectedAppointmentGroup.items.map((item) => item.id),
                      status
                    );
                  }}
                  className={`rounded-md border px-2 py-1 text-[11px] disabled:opacity-50 ${deriveGroupStatus(selectedAppointmentGroup.items, getDisplayStatus) !== 'MIXED' &&
                      deriveGroupStatus(selectedAppointmentGroup.items, getDisplayStatus) === status ?
                      'border-[var(--primary)] bg-[var(--primary)]/10' :
                      'border-border'}`
                  }>

                  {statusLabel(status)}
                </button>
              )}
              {deriveGroupStatus(selectedAppointmentGroup.items, getDisplayStatus) === 'BOOKED' ||
                deriveGroupStatus(selectedAppointmentGroup.items, getDisplayStatus) === 'CONFIRMED' ||
                deriveGroupStatus(selectedAppointmentGroup.items, getDisplayStatus) === 'UPDATED' ?
                <button
                  type="button"
                  disabled={statusBusy}
                  onClick={() => {
                    requestStatusChange(selectedAppointmentGroup.items.map((item) => item.id), 'COMPLETED');
                  }}
                  className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[11px] disabled:opacity-50">

                  Tamamla ve Ödeme Al
                </button> :
                null}
              {deriveGroupStatus(selectedAppointmentGroup.items, getDisplayStatus) === 'COMPLETED' ||
                deriveGroupStatus(selectedAppointmentGroup.items, getDisplayStatus) === 'MIXED' ?
                <button
                  type="button"
                  disabled={statusBusy}
                  onClick={() => {
                    requestPaymentSelection(selectedAppointmentGroup.items.map((item) => item.id));
                  }}
                  className="rounded-md border border-border px-2 py-1 text-[11px] disabled:opacity-50">

                  Ödemeyi Güncelle
                </button> :
                null}
            </div>
          </div>
        </div> :
        null}

      {rescheduleSelection ?
        <div
          className="fixed inset-0 z-[60] bg-black/45 p-4"
          onClick={() =>
            !statusBusy && !rescheduleSelection.loading && !rescheduleSelection.suggestionsLoading ?
              setRescheduleSelection(null) :
              undefined
          }>

          <div
            className="mx-auto mt-16 max-w-sm rounded-2xl border border-border bg-background p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}>

            <h3 className="text-lg font-semibold">Randevuyu Yeniden Planla</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Yeni başlangıç tarih/saati seçin. İlişkili hizmetler birlikte taşınacaktır.
            </p>

            <div className="mt-4 space-y-3">
              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Tarih</span>
                <input
                  type="date"
                  value={rescheduleSelection.date}
                  onChange={(event) =>
                    setRescheduleSelection((prev) =>
                      prev ?
                        {
                          ...prev,
                          date: event.target.value,
                          preview: null,
                          error: null
                        } :
                        prev
                    )
                  }
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm" />

              </label>
              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Saat</span>
                <input
                  type="time"
                  value={rescheduleSelection.time}
                  onChange={(event) =>
                    setRescheduleSelection((prev) =>
                      prev ?
                        {
                          ...prev,
                          time: event.target.value,
                          preview: null,
                          error: null
                        } :
                        prev
                    )
                  }
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm" />

              </label>
            </div>

            <div className="mt-3 rounded-lg border border-border bg-card/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Önerilen Saatler</p>
                {rescheduleSelection.suggestionsLoading ?
                  <span className="text-[11px] text-muted-foreground">Yükleniyor...</span> :
                  null}
              </div>
              {rescheduleSelection.suggestedSlots.length ?
                <div className="mt-2 flex flex-wrap gap-2">
                  {rescheduleSelection.suggestedSlots.map((slot) =>
                    <button
                      key={slot.startTime}
                      type="button"
                      disabled={statusBusy || rescheduleSelection.loading}
                      onClick={() =>
                        setRescheduleSelection((prev) =>
                          prev ?
                            {
                              ...prev,
                              time: slot.time,
                              preview: slot.preview,
                              error:
                                slot.preview.hasConflicts && slot.preview.conflicts.length ?
                                  slot.preview.conflicts[0].reason || 'Seçilen saat uygun değil.' :
                                  null
                            } :
                            prev
                        )
                      }
                      className={`rounded-lg border px-3 py-2 text-left text-xs ${rescheduleSelection.time === slot.time ?
                          'border-[var(--primary)] bg-[var(--primary)]/10' :
                          'border-border bg-background'}`
                      }>

                      <div className="font-semibold">{slot.time}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {slot.requiresManualSelection ? 'Uzman seçimi gerekebilir' : 'Kullanıma hazır'}
                      </div>
                    </button>
                  )}
                </div> :
                rescheduleSelection.suggestionsLoading ? null :
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Bu tarih için önerilen saat bulunamadı. Yine de saati manuel girip kontrol edebilirsiniz.
                  </p>
              }
            </div>

            <button
              type="button"
              disabled={statusBusy || rescheduleSelection.loading || rescheduleSelection.suggestionsLoading}
              onClick={() => {
                void runReschedulePreview();
              }}
              className="mt-3 h-10 w-full rounded-lg border border-violet-400/40 bg-violet-500/10 text-sm font-medium text-violet-700 disabled:opacity-50">

              {rescheduleSelection.loading ? 'Kontrol ediliyor...' : 'Uygunluğu Kontrol Et'}
            </button>

            {rescheduleSelection.error ?
              <p className="mt-3 rounded-lg border border-red-300/40 bg-red-500/10 px-3 py-2 text-xs text-red-700">
                {rescheduleSelection.error}
              </p> :
              null}

            {rescheduleSelection.preview ?
              <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
                {rescheduleSelection.preview.items.map((item) => {
                  const selectedStaffId =
                    rescheduleSelection.assignments[item.appointmentId] || item.selectedStaffId || null;
                  const availableCandidates = item.candidates.filter((candidate) => candidate.available);
                  return (
                    <div key={item.appointmentId} className="rounded-lg border border-border bg-card px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{item.serviceName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(item.newStartTime), 'HH:mm')} - {format(new Date(item.newEndTime), 'HH:mm')}
                        </p>
                      </div>
                      {item.needsManualChoice ?
                        <div className="mt-1">
                          <p className="text-[11px] text-muted-foreground">Tercih edilen uzman müsait değil. Bir seçim yapın:</p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {availableCandidates.map((candidate) =>
                              <button
                                key={`${item.appointmentId}-${candidate.staffId}`}
                                type="button"
                                onClick={() =>
                                  setRescheduleSelection((prev) =>
                                    prev ?
                                      {
                                        ...prev,
                                        assignments: {
                                          ...prev.assignments,
                                          [item.appointmentId]: candidate.staffId
                                        },
                                        error: null
                                      } :
                                      prev
                                  )
                                }
                                className={`rounded-md border px-2 py-1 text-[11px] ${selectedStaffId === candidate.staffId ?
                                    'border-[var(--primary)] bg-[var(--primary)]/10' :
                                    'border-border'}`
                                }>

                                {candidate.name}
                              </button>
                            )}
                          </div>
                        </div> :
                        selectedStaffId ?
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Uzman: {item.candidates.find((candidate) => candidate.staffId === selectedStaffId)?.name || `#${selectedStaffId}`}
                          </p> :
                          null}
                    </div>);

                })}
              </div> :
              null}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={statusBusy || rescheduleSelection.loading || rescheduleSelection.suggestionsLoading}
                onClick={() => setRescheduleSelection(null)}
                className="h-10 flex-1 rounded-lg border border-border text-sm text-muted-foreground disabled:opacity-50">

                İptal
              </button>
              <button
                type="button"
                disabled={statusBusy || rescheduleSelection.loading || rescheduleSelection.suggestionsLoading}
                onClick={() => {
                  void commitRescheduleSelection();
                }}
                className="h-10 flex-1 rounded-lg border border-violet-400/40 bg-violet-500/10 text-sm font-medium text-violet-700 disabled:opacity-50">
                {rescheduleSelection.loading ? "Kaydediliyor..." : 'Değişikliği Onayla'}
              </button>
            </div>
          </div>
        </div> :
        null}
      {checkoutModal && (
        <CheckoutDrawer
          isOpen={!!checkoutModal}
          onClose={() => setCheckoutModal(null)}
          customerName={appointmentById[checkoutModal.appointmentIds[0]]?.customerName || 'Müşteri'}
          totalAmount={getCheckoutTargets(checkoutModal.appointmentIds).reduce((acc, t) => acc + (appointmentById[t.appointmentId]?.service?.price || 0), 0)}
          items={getCheckoutTargets(checkoutModal.appointmentIds).map(t => ({
            key: t.key,
            serviceName: t.serviceName,
            price: appointmentById[t.appointmentId]?.service?.price || 0
          }))}
          isSubmitting={checkoutSubmitting}
          onConfirm={(method, type) => {
            setCheckoutGroupPaymentMethod(method);
            setCheckoutGroupCloseType(type);
            void submitCheckout();
          }}
        />
      )}

      {waitlistOpen ?
        <div className="fixed inset-0 z-40 bg-black/35 p-4">
          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-background p-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Yeni Bekleme Listesi Kaydı</h2>
              <button type="button" onClick={() => setWaitlistOpen(false)} className="text-sm text-muted-foreground">
                Kapat
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Kayıtlı Müşteri (isteğe bağlı)</span>
                <select
                  value={waitlistForm.customerId}
                  onChange={(event) => handleWaitlistCustomerSelect(event.target.value)}
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm">

                  <option value="">Yeni müşteri / Elle gir</option>
                  {customers.map((customer) =>
                    <option key={customer.id} value={customer.id}>
                      {customer.name || 'İsimsiz'} • {customer.phone}
                    </option>
                  )}
                </select>
              </label>

              {loadingCustomers ? <p className="text-xs text-muted-foreground">Müşteriler yükleniyor...</p> : null}

              <FloatingLabelInput
                label="Müşteri Adı"
                value={waitlistForm.customerName}
                onChange={(event) => setWaitlistForm((prev) => ({ ...prev, customerName: event.target.value }))}
                placeholder="Örn: Ayşe Yılmaz"
              />

              <FloatingLabelInput
                label="Müşteri Telefonu"
                type="tel"
                value={waitlistForm.customerPhone}
                onChange={(event) => setWaitlistForm((prev) => ({ ...prev, customerPhone: event.target.value }))}
                placeholder="05xx xxx xx xx"
              />

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm space-y-1">
                  <span className="text-muted-foreground">Başlangıç</span>
                  <input
                    type="time"
                    value={waitlistForm.timeWindowStart}
                    onChange={(event) => setWaitlistForm((prev) => ({ ...prev, timeWindowStart: event.target.value }))}
                    className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm" />

                </label>
                <label className="block text-sm space-y-1">
                  <span className="text-muted-foreground">Bitiş</span>
                  <input
                    type="time"
                    value={waitlistForm.timeWindowEnd}
                    onChange={(event) => setWaitlistForm((prev) => ({ ...prev, timeWindowEnd: event.target.value }))}
                    className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm" />

                </label>
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-border bg-muted/10 p-3">
                <input
                  type="checkbox"
                  checked={waitlistForm.allowNearbyMatches}
                  onChange={(event) => setWaitlistForm((prev) => ({ ...prev, allowNearbyMatches: event.target.checked }))}
                  className="mt-1" />

                <span className="text-sm">
                  <span className="font-medium">Yakın saatler de uygun</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Etkinleştirilirse, eşleştirici önce tam aralığı denedikten sonra 60 dakikaya kadar erken veya geç bir saat de sunabilir.
                  </span>
                </span>
              </label>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Hizmetler</p>
                <div className="space-y-2 max-h-44 overflow-y-auto rounded-lg border border-border p-2">
                  {services.map((service) => {
                    const serviceId = String(service.id);
                    const checked = waitlistSelectedServiceIds.includes(serviceId);
                    return (
                      <label key={service.id} className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted/30">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleWaitlistService(serviceId)}
                          className="mt-1" />

                        <span className="text-sm flex-1">
                          <span className="font-medium">{service.name}</span>
                          <span className="text-muted-foreground"> • {service.duration} dk</span>
                        </span>
                      </label>);

                  })}
                </div>
              </div>

              {waitlistSelectedServiceIds.map((serviceId) => {
                const service = servicesById[serviceId];
                const options = waitlistServiceStaffOptions[serviceId] || [];
                const loadingOptions = waitlistLoadingServiceStaff[serviceId];
                const required = Boolean(service?.requiresSpecialist && options.length > 1);

                return (
                  <div key={serviceId} className="space-y-1 rounded-lg border border-border p-2">
                    <p className="text-sm font-medium">{service?.name}</p>
                    {loadingOptions ? <p className="text-xs text-muted-foreground">Uzmanlar yükleniyor...</p> : null}
                    {!loadingOptions && options.length > 1 ?
                      <select
                        value={waitlistSelectedStaffByService[serviceId] || ''}
                        onChange={(event) =>
                          setWaitlistSelectedStaffByService((prev) => ({ ...prev, [serviceId]: event.target.value }))
                        }
                        className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm">

                        <option value="">{required ? 'Uzman Seç' : 'Herhangi Bir Uzman'}</option>
                        {options.map((item) =>
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        )}
                      </select> :
                      null}
                  </div>);

              })}

              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Not</span>
                <textarea
                  value={waitlistForm.notes}
                  onChange={(event) => setWaitlistForm((prev) => ({ ...prev, notes: event.target.value }))}
                  className="w-full min-h-[80px] rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  placeholder="İsteğe bağlı not..." />

              </label>

              {waitlistCreateError ? <p className="text-sm text-red-500">{waitlistCreateError}</p> : null}

              <button
                type="button"
                onClick={() => void submitWaitlistCreate()}
                disabled={waitlistSaving}
                className="w-full h-11 rounded-lg bg-[var(--primary)] text-white font-semibold disabled:opacity-70">

                {waitlistSaving ? "Kaydediliyor..." : "Bekleme Listesi Kaydı Oluştur"}
              </button>
            </div>
          </div>
        </div> :
        null}

      {createOpen ?
        <div className="fixed inset-0 z-40 bg-black/35 p-4">
          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-background p-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Yeni Randevu</h2>
              <button type="button" onClick={closeCreateModal} className="text-sm text-muted-foreground">
                Kapat
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Kayıtlı Müşteri (isteğe bağlı)</span>
                <select
                  value={form.customerId}
                  onChange={(event) => handleCustomerSelect(event.target.value)}
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm">

                  <option value="">Yeni Müşteri / Manuel Gir</option>
                  {customers.map((customer) =>
                    <option key={customer.id} value={customer.id}>
                      {customer.name || 'Adsız Müşteri'} • {customer.phone}
                    </option>
                  )}
                </select>
              </label>

              {loadingCustomers ? <p className="text-xs text-muted-foreground">Müşteriler yükleniyor...</p> : null}

              <FloatingLabelInput
                label="Müşteri Adı"
                value={form.customerName}
                onChange={(event) => setForm((prev) => ({ ...prev, customerName: event.target.value }))}
                placeholder="Örnek: Ayşe Yılmaz"
              />

              <FloatingLabelInput
                label="Müşteri Telefonu"
                type="tel"
                value={form.customerPhone}
                onChange={(event) => setForm((prev) => ({ ...prev, customerPhone: event.target.value }))}
                placeholder="05xx xxx xx xx"
              />

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Hizmetler (birden fazla seçebilirsiniz)</p>
                <div className="space-y-2 max-h-44 overflow-y-auto rounded-lg border border-border p-2">
                  {services.map((service) => {
                    const serviceId = String(service.id);
                    const checked = selectedServiceIds.includes(serviceId);
                    return (
                      <label key={service.id} className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted/30">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleService(serviceId)}
                          className="mt-1" />

                        <span className="text-sm flex-1">
                          <span className="font-medium">{service.name}</span>
                          <span className="text-muted-foreground"> • {service.duration} dk</span>
                          {service.requiresSpecialist ? <span className="text-xs text-[var(--primary)]"> • Uzman gereklidir</span> : null}
                        </span>
                      </label>);

                  })}
                </div>
              </div>

              {selectedServiceIds.map((serviceId) => {
                const service = servicesById[serviceId];
                const options = serviceStaffOptions[serviceId] || [];
                const loadingOptions = loadingServiceStaff[serviceId];
                const required = Boolean(service?.requiresSpecialist && options.length > 1);

                return (
                  <div key={serviceId} className="space-y-1 rounded-lg border border-border p-2">
                    <p className="text-sm font-medium">{service?.name}</p>
                    {loadingOptions ? <p className="text-xs text-muted-foreground">Uzmanlar yükleniyor...</p> : null}

                    {!loadingOptions && options.length === 0 ?
                      <p className="text-xs text-red-500">Bu hizmet için uygun uzman bulunamadı.</p> :
                      null}

                    {!loadingOptions && options.length === 1 ?
                      <p className="text-xs text-muted-foreground">Atanan uzman: {options[0].name}</p> :
                      null}

                    {!loadingOptions && options.length > 1 ?
                      <select
                        value={selectedStaffByService[serviceId] || ''}
                        onChange={(event) =>
                          setSelectedStaffByService((prev) => ({ ...prev, [serviceId]: event.target.value }))
                        }
                        className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm">

                        <option value="">{required ? 'Uzman Seç' : 'Otomatik Ata'}</option>
                        {options.map((item) =>
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        )}
                      </select> :
                      null}
                  </div>);

              })}

              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Başlangıç Saati</span>
                <input
                  type="time"
                  value={form.time}
                  onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))}
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm" />

              </label>

              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Not (isteğe bağlı)</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  className="w-full min-h-[80px] rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  placeholder="İsteğe bağlı not..." />

              </label>

              {createError ? <p className="text-sm text-red-500">{createError}</p> : null}

              <button
                type="button"
                onClick={() => void submitCreate()}
                disabled={saving}
                className="w-full h-11 rounded-lg bg-[var(--primary)] text-white font-semibold disabled:opacity-70">

                {saving ? "Kaydediliyor..." : "Randevu Oluştur"}
              </button>

              <p className="text-[11px] text-muted-foreground">
                Seçilen her hizmet için uygunluk durumunu otomatik olarak kontrol ediyoruz.
              </p>
            </div>
          </div>
        </div> :
        null}
      {quickActionGroup ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setQuickActionGroup(null)}>
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            className="w-full max-w-md bg-background rounded-t-[32px] p-6 shadow-2xl space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-2 opacity-50" />
            <div className="space-y-1 text-center">
              <h3 className="text-xl font-black italic tracking-tight">{quickActionGroup.customerName}</h3>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{quickActionGroup.customerPhone}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 active:scale-95 transition-all"
                onClick={() => {
                  void applyStatusToAppointments(quickActionGroup.items.map(i => i.id), 'COMPLETED');
                  setQuickActionGroup(null);
                }}
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider">Kapat</span>
              </button>

              <button
                type="button"
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-sky-500/10 text-sky-600 border border-sky-500/20 active:scale-95 transition-all"
                onClick={() => {
                  void applyStatusToAppointments(quickActionGroup.items.map(i => i.id), 'CONFIRMED');
                  setQuickActionGroup(null);
                }}
              >
                <div className="w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-lg shadow-sky-500/30">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider">Onayla</span>
              </button>

              <button
                type="button"
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-violet-500/10 text-violet-600 border border-violet-500/20 active:scale-95 transition-all"
                onClick={() => {
                  requestStatusChange(quickActionGroup.items.map(i => i.id), 'UPDATED');
                  setQuickActionGroup(null);
                }}
              >
                <div className="w-10 h-10 rounded-full bg-violet-500 text-white flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider">Ertele</span>
              </button>

              <button
                type="button"
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-rose-500/10 text-rose-600 border border-rose-500/20 active:scale-95 transition-all"
                onClick={() => {
                  void applyStatusToAppointments(quickActionGroup.items.map(i => i.id), 'CANCELLED');
                  setQuickActionGroup(null);
                }}
              >
                <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
                  <Minus className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider">İptal</span>
              </button>
            </div>

            <button
              type="button"
              className="w-full py-4 text-xs font-black uppercase tracking-[3px] text-muted-foreground border-t border-border mt-4"
              onClick={() => setQuickActionGroup(null)}
            >
              Kapat
            </button>
          </motion.div>
        </div>
      ) : null}
        </div>
      </div>
    </>
  );

}
