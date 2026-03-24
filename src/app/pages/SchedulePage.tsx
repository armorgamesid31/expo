import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, endOfDay, format, formatISO, startOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { AdminAppointmentsResponse } from '../types/mobile-api';
import { readSnapshot, writeSnapshot } from '../lib/ui-cache';

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

const DAY_START_HOUR = 9;
const DAY_END_HOUR = 21;
const SLOT_HEIGHT = 72;
const COLUMN_WIDTH = 180;
const SCHEDULE_CACHE_PREFIX = 'schedule:day';

function toWindowQuery(date: Date) {
  return {
    from: formatISO(startOfDay(date)),
    to: formatISO(endOfDay(date)),
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

function statusLabel(status: string) {
  if (status === 'COMPLETED') return 'completed';
  if (status === 'CANCELLED') return 'Cancel';
  if (status === 'NO_SHOW') return 'Gelmedi';
  return 'planned';
}

function statusClass(status: string) {
  if (status === 'COMPLETED') return 'border-l-2 border-emerald-400 bg-emerald-50';
  if (status === 'CANCELLED') return 'border-l-2 border-zinc-400 bg-zinc-100';
  if (status === 'NO_SHOW') return 'border-l-2 border-amber-400 bg-amber-50';
  return 'border-l-2 border-[var(--rose-gold)] bg-[var(--rose-gold)]/10';
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

export function SchedulePage() {
  const { apiFetch } = useAuth();
  const [initialScheduleSnapshot] = useState<ScheduleSnapshot | null>(() => readScheduleSnapshot(new Date()));
  const [activeDate, setActiveDate] = useState(new Date());

  const [staff, setStaff] = useState<StaffItem[]>(() => initialScheduleSnapshot?.staff || []);
  const [services, setServices] = useState<ServiceItem[]>(() => initialScheduleSnapshot?.services || []);
  const [appointments, setAppointments] = useState<AdminAppointmentsResponse['items']>(
    () => initialScheduleSnapshot?.appointments || [],
  );

  const [loading, setLoading] = useState<boolean>(() => !initialScheduleSnapshot);
  const [error, setError] = useState<string | null>(null);

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
    notes: '',
  });

  const timeSlots = useMemo(() => {
    return Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, index) => DAY_START_HOUR + index);
  }, []);

  const timelineHeight = timeSlots.length * SLOT_HEIGHT;

  const dateText = useMemo(() => format(activeDate, 'EEEE, d MMMM', { locale: tr }), [activeDate]);
  const isToday = useMemo(() => format(activeDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'), [activeDate]);

  const servicesById = useMemo(() => {
    const map: Record<string, ServiceItem> = {};
    for (const service of services) {
      map[String(service.id)] = service;
    }
    return map;
  }, [services]);

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

    try {
      const [appointmentsResponse, staffResponse, servicesResponse] = await Promise.all([
        apiFetch<AdminAppointmentsResponse>(
          `/api/admin/appointments?from=${encodeURIComponent(window.from)}&to=${encodeURIComponent(window.to)}&limit=500`,
        ),
        apiFetch<{ items: StaffItem[] }>('/api/admin/staff'),
        apiFetch<{ items: ServiceItem[] }>('/api/admin/services'),
      ]);

      setAppointments(appointmentsResponse.items);
      setStaff(staffResponse.items);
      setServices(servicesResponse.items);
      writeSnapshot(scheduleCacheKey(dayKey), {
        dayKey,
        appointments: appointmentsResponse.items,
        staff: staffResponse.items,
        services: servicesResponse.items,
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve calendar data.');
    } finally {
      setLoading(false);
    }
  }, [activeDate, apiFetch]);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  const loadStaffForService = useCallback(
    async (serviceId: string) => {
      if (serviceStaffOptions[serviceId]) {
        return;
      }

      setLoadingServiceStaff((prev) => ({ ...prev, [serviceId]: true }));
      try {
        const response = await apiFetch<{ items: ServiceStaffItem[] }>(`/api/admin/services/${serviceId}/staff`);
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
    [apiFetch, serviceStaffOptions],
  );

  const openCreateModal = useCallback(async () => {
    setCreateOpen(true);
    setCreateError(null);

    if (customers.length === 0) {
      setLoadingCustomers(true);
      try {
        const response = await apiFetch<{ items: CustomerItem[] }>('/api/admin/customers?limit=30');
        setCustomers(response.items || []);
      } catch {
        // Optional list for fast selection.
      } finally {
        setLoadingCustomers(false);
      }
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
        customerPhone: selected.phone || '',
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
      setCreateError('Time selection is mandatory.');
      return;
    }

    if (selectedServiceIds.length === 0) {
      setCreateError('You must select at least one service.');
      return;
    }

    if (!form.customerId && !form.customerPhone.trim()) {
      setCreateError('Customer phone number is mandatory.');
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
            staffId: selectedStaffByService[serviceId] ? Number(selectedStaffByService[serviceId]) : null,
          })),
        }),
      });

      setCreateOpen(false);
      setSelectedServiceIds([]);
      setSelectedStaffByService({});
      setForm((prev) => ({ ...prev, customerId: '', customerName: '', customerPhone: '', notes: '' }));
      await loadSchedule();
    } catch (err: any) {
      setCreateError(err?.message || 'The appointment could not be created.');
    } finally {
      setSaving(false);
    }
  };

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
      height: Math.max(36, durationMinutes * pixelsPerMinute),
    };
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Appointment Calendar</h1>
        <button
          type="button"
          onClick={() => void openCreateModal()}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--rose-gold)] px-3 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          New Appointment
        </button>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
        <button
          type="button"
          onClick={() => setActiveDate((prev) => addDays(prev, -1))}
          className="h-8 w-8 grid place-items-center rounded-md border border-border text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="text-center">
          <p className="font-semibold capitalize">{dateText}</p>
          <p className="text-xs text-muted-foreground">{isToday ? 'Today' : format(activeDate, 'dd.MM.yyyy')}</p>
        </div>

        <button
          type="button"
          onClick={() => setActiveDate((prev) => addDays(prev, 1))}
          className="h-8 w-8 grid place-items-center rounded-md border border-border text-muted-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Takvim yükleniyor...</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
          <div className="min-w-[760px]">
            <div className="flex border-b border-border sticky top-0 bg-card z-10">
              <div className="w-16 shrink-0 border-r border-border" />
              <div className="flex flex-1">
                {staff.map((member) => (
                  <div key={member.id} className="border-r border-border px-2 py-2" style={{ width: COLUMN_WIDTH }}>
                    <p className="text-xs font-semibold truncate">{member.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{member.title || 'Uzman'}</p>
                  </div>
                ))}
                {!staff.length ? (
                  <div className="px-3 py-3 text-xs text-muted-foreground">Takvim için personel bulunamadı.</div>
                ) : null}
              </div>
            </div>

            <div className="flex">
              <div className="w-16 shrink-0 border-r border-border bg-card/95 sticky left-0 z-10">
                {timeSlots.map((hour) => (
                  <div
                    key={hour}
                    className="border-b border-border/70 px-1 text-[11px] text-muted-foreground"
                    style={{ height: SLOT_HEIGHT }}
                  >
                    <span className="-translate-y-2 inline-block">{hourLabel(hour)}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-1">
                {staff.map((member) => {
                  const rows = appointments.filter((item) => item.staff.id === member.id);
                  return (
                    <div key={member.id} className="relative border-r border-border" style={{ width: COLUMN_WIDTH, height: timelineHeight }}>
                      {timeSlots.map((hour) => (
                        <div key={`${member.id}-${hour}`} className="border-b border-border/70" style={{ height: SLOT_HEIGHT }} />
                      ))}

                      {rows.map((appointment) => {
                        const block = getAppointmentStyle(appointment.startTime, appointment.endTime);
                        const timeRange = `${format(new Date(appointment.startTime), 'HH:mm')} - ${format(
                          new Date(appointment.endTime),
                          'HH:mm',
                        )}`;

                        return (
                          <div
                            key={appointment.id}
                            className={`absolute left-1 right-1 rounded-lg px-2 py-2 text-[11px] shadow-sm ${statusClass(
                              appointment.status,
                            )}`}
                            style={{ top: block.top, height: block.height }}
                            title={`${appointment.customerName} • ${appointment.service.name} • ${statusLabel(appointment.status)}`}
                          >
                            <p className="font-semibold truncate">{appointment.customerName}</p>
                            <p className="truncate text-muted-foreground">{appointment.service.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{timeRange}</p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {!loading && !appointments.length ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          Bu gün için randevu bulunmuyor.
        </div>
      ) : null}

      {createOpen ? (
        <div className="fixed inset-0 z-40 bg-black/35 p-4">
          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-background p-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">New Appointment</h2>
              <button type="button" onClick={closeCreateModal} className="text-sm text-muted-foreground">
                Kapat
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Registerlı Müşteri (opsiyonel)</span>
                <select
                  value={form.customerId}
                  onChange={(event) => handleCustomerSelect(event.target.value)}
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm"
                >
                  <option value="">Yeni / elle gir</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {(customer.name || 'Anonymous')} • {customer.phone}
                    </option>
                  ))}
                </select>
              </label>

              {loadingCustomers ? <p className="text-xs text-muted-foreground">Müşteriler yükleniyor...</p> : null}

              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Müşteri Adı</span>
                <input
                  value={form.customerName}
                  onChange={(event) => setForm((prev) => ({ ...prev, customerName: event.target.value }))}
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm"
                  placeholder="For example: Ayşe Yılmaz"
                />
              </label>

              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Müşteri Telefonu</span>
                <input
                  value={form.customerPhone}
                  onChange={(event) => setForm((prev) => ({ ...prev, customerPhone: event.target.value }))}
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm"
                  placeholder="05xx xxx xx xx"
                />
              </label>

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
                          className="mt-1"
                        />
                        <span className="text-sm flex-1">
                          <span className="font-medium">{service.name}</span>
                          <span className="text-muted-foreground"> • {service.duration} dk</span>
                          {service.requiresSpecialist ? <span className="text-xs text-[var(--rose-gold)]"> • Uzman seçimi</span> : null}
                        </span>
                      </label>
                    );
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

                    {!loadingOptions && options.length === 0 ? (
                      <p className="text-xs text-red-500">Bu hizmet için uygun uzman bulunamadı.</p>
                    ) : null}

                    {!loadingOptions && options.length === 1 ? (
                      <p className="text-xs text-muted-foreground">Atanacak uzman: {options[0].name}</p>
                    ) : null}

                    {!loadingOptions && options.length > 1 ? (
                      <select
                        value={selectedStaffByService[serviceId] || ''}
                        onChange={(event) =>
                          setSelectedStaffByService((prev) => ({ ...prev, [serviceId]: event.target.value }))
                        }
                        className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm"
                      >
                        <option value="">{required ? 'Choose an expert' : 'Otomatik ata'}</option>
                        {options.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                );
              })}

              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Başlangıç Saati</span>
                <input
                  type="time"
                  value={form.time}
                  onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))}
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm"
                />
              </label>

              <label className="block text-sm space-y-1">
                <span className="text-muted-foreground">Not (opsiyonel)</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  className="w-full min-h-[80px] rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  placeholder="Optional note..."
                />
              </label>

              {createError ? <p className="text-sm text-red-500">{createError}</p> : null}

              <button
                type="button"
                onClick={() => void submitCreate()}
                disabled={saving}
                className="w-full h-11 rounded-lg bg-[var(--rose-gold)] text-white font-semibold disabled:opacity-70"
              >
                {saving ? 'Kaydediliyor...' : 'Create an Appointment'}
              </button>

              <p className="text-[11px] text-muted-foreground">
                Müsaitlik backend’de tüm seçili hizmetler için sırayla kontrol edilir.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
