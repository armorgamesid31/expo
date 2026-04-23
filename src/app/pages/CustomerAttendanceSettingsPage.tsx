import { useEffect, useState, type ReactNode } from 'react';
import { CalendarX2, TriangleAlert, UserRoundX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToasts } from '../context/ToastContext';
import { useNavigator } from '../context/NavigatorContext';

type ValidityWindow = '1m' | '3m' | '6m' | '1y' | 'unlimited';
type AttendanceRangeKey = '0_3' | '4_5' | '6_7' | '8_9' | '10_plus';
type AttendancePenaltyAction =
  | 'normal'
  | 'simple_warning'
  | 'possible_block'
  | 'manual_approval'
  | 'full_block';

interface AttendanceNotificationConfig {
  missedAppointments: boolean;
  lateCancellations: boolean;
  lateReschedules: boolean;
}

interface AttendanceConfig {
  countMissedAppointments: boolean;
  countLateCancellations: boolean;
  countLateReschedules: boolean;
  lateCancellationHours: number;
  lateRescheduleHours: number;
  validityWindow: ValidityWindow;
  notificationEvents: AttendanceNotificationConfig;
  penaltyPolicy: Record<AttendanceRangeKey, AttendancePenaltyAction>;
}

interface CustomerRiskPolicy {
  autoBanEnabled: boolean;
  noShowThreshold: number;
  blockBookingWhenBanned: boolean;
  attendanceConfig: AttendanceConfig;
}

interface CustomerRiskPolicyResponse {
  policy: CustomerRiskPolicy;
}

const ATTENDANCE_RANGES: Array<{ key: AttendanceRangeKey; label: string }> = [
  { key: '0_3', label: '0-3' },
  { key: '4_5', label: '4-5' },
  { key: '6_7', label: '6-7' },
  { key: '8_9', label: '8-9' },
  { key: '10_plus', label: '10+' }
];

const PENALTY_ACTION_OPTIONS: Array<{ value: AttendancePenaltyAction; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'simple_warning', label: 'Basit uyarı' },
  { value: 'possible_block', label: 'Engel uyarısı' },
  { value: 'manual_approval', label: 'Salon onayı' },
  { value: 'full_block', label: 'Tam engel' }
];

const VALIDITY_OPTIONS: Array<{ value: ValidityWindow; label: string }> = [
  { value: '1m', label: '1 ay' },
  { value: '3m', label: '3 ay' },
  { value: '6m', label: '6 ay' },
  { value: '1y', label: '1 yıl' },
  { value: 'unlimited', label: 'Sınırsız' }
];

const HOUR_THRESHOLD_OPTIONS = [1, 2, 3, 6, 12, 24, 48, 72];

const DEFAULT_ATTENDANCE_CONFIG: AttendanceConfig = {
  countMissedAppointments: true,
  countLateCancellations: true,
  countLateReschedules: true,
  lateCancellationHours: 24,
  lateRescheduleHours: 12,
  validityWindow: '6m',
  notificationEvents: {
    missedAppointments: true,
    lateCancellations: true,
    lateReschedules: true
  },
  penaltyPolicy: {
    '0_3': 'normal',
    '4_5': 'simple_warning',
    '6_7': 'possible_block',
    '8_9': 'manual_approval',
    '10_plus': 'full_block'
  }
};

const DEFAULT_RISK_POLICY: CustomerRiskPolicy = {
  autoBanEnabled: false,
  noShowThreshold: 3,
  blockBookingWhenBanned: true,
  attendanceConfig: DEFAULT_ATTENDANCE_CONFIG
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.floor(parsed);
  if (rounded <= 0) return fallback;
  return rounded;
}

function toValidityWindow(value: unknown, fallback: ValidityWindow): ValidityWindow {
  if (typeof value !== 'string') return fallback;
  return VALIDITY_OPTIONS.some((item) => item.value === value) ? (value as ValidityWindow) : fallback;
}

function toAttendanceAction(value: unknown, fallback: AttendancePenaltyAction): AttendancePenaltyAction {
  if (typeof value !== 'string') return fallback;
  return PENALTY_ACTION_OPTIONS.some((item) => item.value === value) ? (value as AttendancePenaltyAction) : fallback;
}

function normalizeAttendanceConfig(config: unknown, fallback: AttendanceConfig = DEFAULT_ATTENDANCE_CONFIG): AttendanceConfig {
  const raw = isRecord(config) ? config : {};
  const notificationEventsRaw = isRecord(raw.notificationEvents) ? raw.notificationEvents : {};
  const penaltyPolicyRaw = isRecord(raw.penaltyPolicy) ? raw.penaltyPolicy : {};

  return {
    countMissedAppointments: toBoolean(raw.countMissedAppointments, fallback.countMissedAppointments),
    countLateCancellations: toBoolean(raw.countLateCancellations, fallback.countLateCancellations),
    countLateReschedules: toBoolean(raw.countLateReschedules, fallback.countLateReschedules),
    lateCancellationHours: toPositiveInt(raw.lateCancellationHours, fallback.lateCancellationHours),
    lateRescheduleHours: toPositiveInt(raw.lateRescheduleHours, fallback.lateRescheduleHours),
    validityWindow: toValidityWindow(raw.validityWindow, fallback.validityWindow),
    notificationEvents: {
      missedAppointments: toBoolean(notificationEventsRaw.missedAppointments, fallback.notificationEvents.missedAppointments),
      lateCancellations: toBoolean(notificationEventsRaw.lateCancellations, fallback.notificationEvents.lateCancellations),
      lateReschedules: toBoolean(notificationEventsRaw.lateReschedules, fallback.notificationEvents.lateReschedules)
    },
    penaltyPolicy: ATTENDANCE_RANGES.reduce<Record<AttendanceRangeKey, AttendancePenaltyAction>>((acc, range) => {
      acc[range.key] = toAttendanceAction(penaltyPolicyRaw[range.key], fallback.penaltyPolicy[range.key]);
      return acc;
    }, {} as Record<AttendanceRangeKey, AttendancePenaltyAction>)
  };
}

function normalizeRiskPolicy(policy: unknown): CustomerRiskPolicy {
  const raw = isRecord(policy) ? policy : {};
  return {
    autoBanEnabled: toBoolean(raw.autoBanEnabled, DEFAULT_RISK_POLICY.autoBanEnabled),
    noShowThreshold: toPositiveInt(raw.noShowThreshold, DEFAULT_RISK_POLICY.noShowThreshold),
    blockBookingWhenBanned: toBoolean(raw.blockBookingWhenBanned, DEFAULT_RISK_POLICY.blockBookingWhenBanned),
    attendanceConfig: normalizeAttendanceConfig(raw.attendanceConfig, DEFAULT_RISK_POLICY.attendanceConfig)
  };
}

function ToggleButton({
  checked,
  onClick,
  ariaLabel
}: {
  checked: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`relative h-6 w-11 rounded-full transition-all shrink-0 ${checked ? 'bg-[var(--rose-gold)]' : 'bg-muted'}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full transition-all duration-200 ${
          checked ? 'left-[22px] bg-white' : 'left-[2px] bg-white'
        }`}
      />
    </button>
  );
}

function OptionRow({
  icon,
  title,
  description,
  checked,
  onToggle,
  children
}: {
  icon: ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border p-3 bg-muted/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex items-start gap-3">
          <div className="mt-0.5 text-muted-foreground">{icon}</div>
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
        <ToggleButton checked={checked} onClick={onToggle} ariaLabel={title} />
      </div>
      {children ? <div className="mt-3 border-t border-border pt-3">{children}</div> : null}
    </div>
  );
}

export function CustomerAttendanceSettingsPage() {
  const { apiFetch } = useAuth();
  const { showToast } = useToasts();
  const { setHeaderTitle } = useNavigator();
  const [riskPolicy, setRiskPolicy] = useState<CustomerRiskPolicy>(DEFAULT_RISK_POLICY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHeaderTitle('Randevu İhlali');
    return () => setHeaderTitle(null);
  }, [setHeaderTitle]);

  const loadPolicy = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<CustomerRiskPolicyResponse>('/api/admin/customer-risk-policy');
      setRiskPolicy(normalizeRiskPolicy(response.policy));
    } catch (err: any) {
      setError(err?.message || 'Randevu ihlali politikası alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPolicy();
  }, []);

  const savePolicy = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await apiFetch<CustomerRiskPolicyResponse>('/api/admin/customer-risk-policy', {
        method: 'PUT',
        body: JSON.stringify(riskPolicy)
      });
      setRiskPolicy(normalizeRiskPolicy(response.policy));
      showToast('Randevu ihlali ayarları güncellendi.', 'success');
    } catch (err: any) {
      setError(err?.message || 'Ayarlar kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const updateAttendanceConfig = (updater: (config: AttendanceConfig) => AttendanceConfig) => {
    setRiskPolicy((prev) => ({
      ...prev,
      attendanceConfig: updater(prev.attendanceConfig)
    }));
  };

  const toggleAttendanceRule = (
    key: 'countMissedAppointments' | 'countLateCancellations' | 'countLateReschedules'
  ) => {
    updateAttendanceConfig((config) => ({
      ...config,
      [key]: !config[key]
    }));
  };

  const setAttendanceHourThreshold = (key: 'lateCancellationHours' | 'lateRescheduleHours', value: string) => {
    updateAttendanceConfig((config) => ({
      ...config,
      [key]: Math.max(1, Number(value) || 1)
    }));
  };

  const setAttendanceValidity = (value: string) => {
    updateAttendanceConfig((config) => ({
      ...config,
      validityWindow: value as ValidityWindow
    }));
  };

  const setPenaltyAction = (rangeKey: AttendanceRangeKey, value: string) => {
    updateAttendanceConfig((config) => ({
      ...config,
      penaltyPolicy: {
        ...config.penaltyPolicy,
        [rangeKey]: value as AttendancePenaltyAction
      }
    }));
  };

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Randevu İhlali Ayarları</p>
          <p className="text-xs text-muted-foreground mt-1">
            Geç iptal, geç erteleme ve yaptırım kurallarını bu ekrandan yönetin.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm">İhlal kayıtları ne kadar süre geçerli kalsın?</p>
            <select
              className="h-9 rounded-md border border-border bg-input-background px-2 text-sm"
              value={riskPolicy.attendanceConfig.validityWindow}
              onChange={(event) => setAttendanceValidity(event.target.value)}
            >
              {VALIDITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <OptionRow
            icon={<UserRoundX className="w-4 h-4" />}
            title="Randevuya gelmeme ihlali"
            description="Müşteri randevuya gelmezse ihlal hanesine yazılır."
            checked={riskPolicy.attendanceConfig.countMissedAppointments}
            onToggle={() => toggleAttendanceRule('countMissedAppointments')}
          />
          <OptionRow
            icon={<CalendarX2 className="w-4 h-4" />}
            title="Geç iptal ihlali"
            description="Randevuya kısa süre kala yapılan iptaller ihlal sayılır."
            checked={riskPolicy.attendanceConfig.countLateCancellations}
            onToggle={() => toggleAttendanceRule('countLateCancellations')}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Geç İptal Eşiği</p>
              <div className="flex items-center gap-2">
                <select
                  className="h-9 rounded-md border border-border bg-input-background px-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  value={riskPolicy.attendanceConfig.lateCancellationHours}
                  disabled={!riskPolicy.attendanceConfig.countLateCancellations}
                  onChange={(event) => setAttendanceHourThreshold('lateCancellationHours', event.target.value)}
                >
                  {HOUR_THRESHOLD_OPTIONS.map((hour) => (
                    <option key={`late-cancel-${hour}`} value={hour}>
                      {hour}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-muted-foreground">Saat</span>
              </div>
            </div>
          </OptionRow>
          <OptionRow
            icon={<TriangleAlert className="w-4 h-4" />}
            title="Geç erteleme ihlali"
            description="Randevuya yakın saatlerde yapılan taşıma/değişiklikler ihlal sayılır."
            checked={riskPolicy.attendanceConfig.countLateReschedules}
            onToggle={() => toggleAttendanceRule('countLateReschedules')}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Geç Erteleme Eşiği</p>
              <div className="flex items-center gap-2">
                <select
                  className="h-9 rounded-md border border-border bg-input-background px-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  value={riskPolicy.attendanceConfig.lateRescheduleHours}
                  disabled={!riskPolicy.attendanceConfig.countLateReschedules}
                  onChange={(event) => setAttendanceHourThreshold('lateRescheduleHours', event.target.value)}
                >
                  {HOUR_THRESHOLD_OPTIONS.map((hour) => (
                    <option key={`late-reschedule-${hour}`} value={hour}>
                      {hour}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-muted-foreground">Saat</span>
              </div>
            </div>
          </OptionRow>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 space-y-2">
          <p className="text-xs font-medium text-foreground">Yaptırım Ayarları</p>
          <div className="grid grid-cols-1 gap-2">
            {ATTENDANCE_RANGES.map((range) => (
              <div key={range.key} className="flex items-center justify-between gap-3">
                <p className="text-sm">{range.label} ihlal</p>
                <select
                  className="h-9 rounded-md border border-border bg-input-background px-2 text-sm"
                  value={riskPolicy.attendanceConfig.penaltyPolicy[range.key]}
                  onChange={(event) => setPenaltyAction(range.key, event.target.value)}
                >
                  {PENALTY_ACTION_OPTIONS.map((action) => (
                    <option key={action.value} value={action.value}>
                      {action.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {loading ? <p className="text-xs text-muted-foreground">Politika yükleniyor...</p> : null}
        {error ? <p className="text-xs text-red-500">{error}</p> : null}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void savePolicy()}
            disabled={saving || loading}
            className="min-h-11 rounded-md bg-[var(--rose-gold)] px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}
