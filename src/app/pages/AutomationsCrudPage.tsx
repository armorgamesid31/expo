import { useEffect, useState } from 'react';
import { Bell, CalendarX2, ChevronRight, Clock3, MapPin, ShieldCheck, TriangleAlert, UserRoundX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { cn } from '../components/ui/utils';
import { useSearchParams } from 'react-router-dom';

interface AutomationItem {
  id: number;
  key: string;
  name: string;
  description: string | null;
  config: unknown;
  isEnabled: boolean;
}

type SaveKey = 'reminder' | 'attendance' | null;
type EditingType = 'reminder' | 'attendance' | null;

type ValidityWindow = '1m' | '3m' | '6m' | '1y' | 'unlimited';
type AttendanceRangeKey = '0_3' | '4_5' | '6_7' | '8_9' | '10_plus';
type AttendancePenaltyAction =
'normal' |
'simple_warning' |
'possible_block' |
'manual_approval' |
'full_block';

const REMINDER_KEY = 'appointment_reminder';
const LEGACY_REMINDER_24H_KEY = 'appointment_reminder_24h';
const LEGACY_REMINDER_2H_KEY = 'appointment_reminder_2h';
const ATTENDANCE_KEY = 'appointment_no_show_warning';

interface ReminderConfig {
  enable2h: boolean;
  enable24h: boolean;
  enable72h: boolean;
  sendLocationAt2h: boolean;
  requestConfirmationAt24h: boolean;
}

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

const ATTENDANCE_RANGES: Array<{key: AttendanceRangeKey;label: string;}> = [
{ key: '0_3', label: '0-3' },
{ key: '4_5', label: '4-5' },
{ key: '6_7', label: '6-7' },
{ key: '8_9', label: '8-9' },
{ key: '10_plus', label: '10+' }];


const PENALTY_ACTION_OPTIONS: Array<{value: AttendancePenaltyAction;label: string;}> = [
{ value: 'normal', label: 'no warning' },
{ value: 'simple_warning', label: 'Simple warning' },
{ value: 'possible_block', label: 'Blockable warning' },
{ value: 'manual_approval', label: 'Salon pre-approval' },
{ value: 'full_block', label: 'Tam engel' }];


const VALIDITY_OPTIONS: Array<{value: ValidityWindow;label: string;}> = [
{ value: '1m', label: '1 ay' },
{ value: '3m', label: '3 ay' },
{ value: '6m', label: '6 ay' },
{ value: '1y', label: '1 year' },
{ value: 'unlimited', label: 'Unlimited' }];


const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  enable2h: true,
  enable24h: true,
  enable72h: false,
  sendLocationAt2h: true,
  requestConfirmationAt24h: true
};

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') {
      return true;
    }
    if (value.toLowerCase() === 'false') {
      return false;
    }
  }

  return fallback;
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toValidityWindow(value: unknown, fallback: ValidityWindow): ValidityWindow {
  if (typeof value !== 'string') {
    return fallback;
  }

  const match = VALIDITY_OPTIONS.find((option) => option.value === value);
  return match ? match.value : fallback;
}

function toAttendancePenaltyAction(value: unknown, fallback: AttendancePenaltyAction): AttendancePenaltyAction {
  if (typeof value !== 'string') {
    return fallback;
  }

  const match = PENALTY_ACTION_OPTIONS.find((option) => option.value === value);
  return match ? match.value : fallback;
}

function parseReminderConfig(raw: unknown, legacy2hEnabled?: boolean, legacy24hEnabled?: boolean): ReminderConfig {
  const config = isRecord(raw) ? raw : {};

  return {
    enable2h: toBoolean(config.enable2h, legacy2hEnabled ?? DEFAULT_REMINDER_CONFIG.enable2h),
    enable24h: toBoolean(config.enable24h, legacy24hEnabled ?? DEFAULT_REMINDER_CONFIG.enable24h),
    enable72h: toBoolean(config.enable72h, DEFAULT_REMINDER_CONFIG.enable72h),
    sendLocationAt2h: toBoolean(config.sendLocationAt2h, DEFAULT_REMINDER_CONFIG.sendLocationAt2h),
    requestConfirmationAt24h: toBoolean(config.requestConfirmationAt24h, DEFAULT_REMINDER_CONFIG.requestConfirmationAt24h)
  };
}

function parseAttendanceConfig(raw: unknown): AttendanceConfig {
  const config = isRecord(raw) ? raw : {};
  const notificationEventsRaw = isRecord(config.notificationEvents) ? config.notificationEvents : {};
  const penaltyPolicyRaw = isRecord(config.penaltyPolicy) ? config.penaltyPolicy : {};

  const penaltyPolicy = ATTENDANCE_RANGES.reduce<Record<AttendanceRangeKey, AttendancePenaltyAction>>((acc, range) => {
    acc[range.key] = toAttendancePenaltyAction(
      penaltyPolicyRaw[range.key],
      DEFAULT_ATTENDANCE_CONFIG.penaltyPolicy[range.key]
    );
    return acc;
  }, {} as Record<AttendanceRangeKey, AttendancePenaltyAction>);

  return {
    countMissedAppointments: toBoolean(
      config.countMissedAppointments,
      DEFAULT_ATTENDANCE_CONFIG.countMissedAppointments
    ),
    countLateCancellations: toBoolean(
      config.countLateCancellations,
      DEFAULT_ATTENDANCE_CONFIG.countLateCancellations
    ),
    countLateReschedules: toBoolean(
      config.countLateReschedules,
      DEFAULT_ATTENDANCE_CONFIG.countLateReschedules
    ),
    lateCancellationHours: Math.max(
      1,
      toNumber(config.lateCancellationHours, DEFAULT_ATTENDANCE_CONFIG.lateCancellationHours)
    ),
    lateRescheduleHours: Math.max(
      1,
      toNumber(config.lateRescheduleHours, DEFAULT_ATTENDANCE_CONFIG.lateRescheduleHours)
    ),
    validityWindow: toValidityWindow(config.validityWindow, DEFAULT_ATTENDANCE_CONFIG.validityWindow),
    notificationEvents: {
      missedAppointments: toBoolean(
        notificationEventsRaw.missedAppointments,
        DEFAULT_ATTENDANCE_CONFIG.notificationEvents.missedAppointments
      ),
      lateCancellations: toBoolean(
        notificationEventsRaw.lateCancellations,
        DEFAULT_ATTENDANCE_CONFIG.notificationEvents.lateCancellations
      ),
      lateReschedules: toBoolean(
        notificationEventsRaw.lateReschedules,
        DEFAULT_ATTENDANCE_CONFIG.notificationEvents.lateReschedules
      )
    },
    penaltyPolicy
  };
}

function validityLabel(value: ValidityWindow): string {
  return VALIDITY_OPTIONS.find((option) => option.value === value)?.label || '6 ay';
}

function ToggleButton({ checked, onClick, disabled, ariaLabel }: {checked: boolean;onClick: () => void;disabled?: boolean;ariaLabel: string;}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'relative h-6 w-11 rounded-full transition-all disabled:opacity-60 disabled:cursor-not-allowed shrink-0 mt-0.5',
        checked ? 'bg-[var(--rose-gold)]' : 'bg-muted'
      )}>
      
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full transition-all duration-200',
          checked ? 'left-[22px] bg-white' : 'left-[2px] bg-white'
        )} />
      
    </button>);

}

function OptionRow({
  icon: Icon,
  title,
  description,
  checked,
  onToggle,
  children







}: {icon: any;title: string;description: string;checked: boolean;onToggle: () => void;children?: React.ReactNode;}) {
  return (
    <div className="rounded-xl border border-border p-3 bg-muted/20">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">{title}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'relative h-6 w-11 rounded-full transition-all disabled:opacity-60 disabled:cursor-not-allowed shrink-0',
            checked ? 'bg-[var(--rose-gold)]' : 'bg-muted'
          )}>
          
          <span
            className={cn(
              'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all duration-200',
              checked ? 'left-[22px]' : 'left-[2px]'
            )} />
          
        </button>
      </div>

      {checked && children ? <div className="mt-3">{children}</div> : null}
    </div>);

}

export function AutomationsCrudPage() {
  const { apiFetch } = useAuth();
  const [searchParams] = useSearchParams();

  const sectionParam = searchParams.get('section');
  const viewMode: 'all' | 'reminder' | 'attendance' =
  sectionParam === 'reminder' ? 'reminder' : sectionParam === 'attendance' ? 'attendance' : 'all';
  const showReminderSection = viewMode !== 'attendance';
  const showAttendanceSection = viewMode !== 'reminder';

  const [items, setItems] = useState<AutomationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<SaveKey>(null);

  const [editingType, setEditingType] = useState<EditingType>(null);
  const [editReminderConfig, setEditReminderConfig] = useState<ReminderConfig | null>(null);
  const [editAttendanceConfig, setEditAttendanceConfig] = useState<AttendanceConfig | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<{items: AutomationItem[];}>('/api/admin/automations');
      setItems(response.items || []);
    } catch (err: any) {
      setError(err?.message || 'Automations could not be retrieved.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const getRule = (key: string) => items.find((item) => item.key === key);

  const reminderRule = getRule(REMINDER_KEY);
  const reminderLegacy2hRule = getRule(LEGACY_REMINDER_2H_KEY);
  const reminderLegacy24hRule = getRule(LEGACY_REMINDER_24H_KEY);

  const reminderConfig = parseReminderConfig(
    reminderRule?.config,
    reminderLegacy2hRule?.isEnabled,
    reminderLegacy24hRule?.isEnabled
  );

  const reminderEnabled =
  reminderRule?.isEnabled ??
  reminderLegacy2hRule?.isEnabled ??
  reminderLegacy24hRule?.isEnabled ??
  true;

  const attendanceRule = getRule(ATTENDANCE_KEY);
  const attendanceConfig = parseAttendanceConfig(attendanceRule?.config);
  const attendanceEnabled = attendanceRule?.isEnabled ?? true;

  const reminderBadges: string[] = [];
  if (reminderConfig.enable2h) {
    reminderBadges.push(reminderConfig.sendLocationAt2h ? '2 hours before + location' : '2 hours before');
  }
  if (reminderConfig.enable24h) {
    reminderBadges.push(reminderConfig.requestConfirmationAt24h ? '24 hours before + participation confirmation' : '24 hours before');
  }
  if (reminderConfig.enable72h) {
    reminderBadges.push('72 hours before information');
  }

  const enabledNotificationEventCount = Object.values(attendanceConfig.notificationEvents).filter(Boolean).length;

  const upsertRule = async (payload: {
    key: string;
    name: string;
    description: string;
    isEnabled: boolean;
    config: Record<string, unknown>;
  }) => {
    const current = getRule(payload.key);

    if (current) {
      const response = await apiFetch<{item: AutomationItem;}>(`/api/admin/automations/${current.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isEnabled: payload.isEnabled, config: payload.config })
      });
      const updated = response.item;
      setItems((prev) => prev.map((item) => item.id === current.id ? updated : item));
      return;
    }

    const response = await apiFetch<{item: AutomationItem;}>('/api/admin/automations', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setItems((prev) => [response.item, ...prev]);
  };

  const handleReminderToggle = async () => {
    setSavingKey('reminder');
    setError(null);

    try {
      await upsertRule({
        key: REMINDER_KEY,
        name: "Randevu Hatırlatması",
        description: 'Appointment reminder automation at 2 hours, 24 hours and 72 hours before',
        isEnabled: !reminderEnabled,
        config: reminderConfig
      });
    } catch (err: any) {
      setError(err?.message || 'Appointment reminder could not be updated.');
    } finally {
      setSavingKey(null);
    }
  };

  const handleAttendanceToggle = async () => {
    setSavingKey('attendance');
    setError(null);

    try {
      await upsertRule({
        key: ATTENDANCE_KEY,
        name: 'Appointment No-show Tracking',
        description: 'Tracks appointment violations and enforces sanction rules',
        isEnabled: !attendanceEnabled,
        config: attendanceConfig
      });
    } catch (err: any) {
      setError(err?.message || 'No-show tracking could not be updated.');
    } finally {
      setSavingKey(null);
    }
  };

  const openReminderSettings = () => {
    setEditReminderConfig(reminderConfig);
    setEditingType('reminder');
  };

  const openAttendanceSettings = () => {
    setEditAttendanceConfig(attendanceConfig);
    setEditingType('attendance');
  };

  const closeDialog = () => {
    setEditingType(null);
    setEditReminderConfig(null);
    setEditAttendanceConfig(null);
  };

  const saveReminderSettings = async () => {
    if (!editReminderConfig) {
      return;
    }

    setSavingKey('reminder');
    setError(null);

    try {
      await upsertRule({
        key: REMINDER_KEY,
        name: "Randevu Hatırlatması",
        description: 'Appointment reminder automation at 2 hours, 24 hours and 72 hours before',
        isEnabled: reminderEnabled,
        config: editReminderConfig
      });
      closeDialog();
    } catch (err: any) {
      setError(err?.message || 'Appointment reminder settings could not be saved.');
    } finally {
      setSavingKey(null);
    }
  };

  const saveAttendanceSettings = async () => {
    if (!editAttendanceConfig) {
      return;
    }

    const sanitized: AttendanceConfig = {
      ...editAttendanceConfig,
      lateCancellationHours: Math.max(1, Number(editAttendanceConfig.lateCancellationHours || 1)),
      lateRescheduleHours: Math.max(1, Number(editAttendanceConfig.lateRescheduleHours || 1))
    };

    setSavingKey('attendance');
    setError(null);

    try {
      await upsertRule({
        key: ATTENDANCE_KEY,
        name: 'Appointment No-show Tracking',
        description: 'Tracks appointment violations and enforces sanction rules',
        isEnabled: attendanceEnabled,
        config: sanitized
      });
      closeDialog();
    } catch (err: any) {
      setError(err?.message || "No-show takip ayarları kaydedilemedi.");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[var(--luxury-bg)] pb-20">
      <div className="p-4 border-b border-border bg-[var(--luxury-bg)] sticky top-0 z-10">
        <h1 className="text-2xl font-semibold mb-1">
          {viewMode === 'reminder' ?
          "WhatsApp Hatırlatma Ayarları" :
          viewMode === 'attendance' ?
          'Appointment No-show Tracking' :
          'Otomasyonlar'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {viewMode === 'reminder' ?
          'Manage appointment reminder steps in one place' :
          viewMode === 'attendance' ?
          'Manage violation rules and enforcement levels' :
          'Automatically manage appointment communications'}
        </p>
      </div>

      <div className="p-4 space-y-4">
        {error ?
        <Card className="border-red-300 bg-red-50">
            <CardContent className="p-3">
              <p className="text-sm text-red-600">{error}</p>
            </CardContent>
          </Card> :
        null}

        {showReminderSection ?
        <>
            {viewMode === 'all' ?
          <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase px-1">Hatırlatmalar</p> :
          null}

            <Card className="border border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[var(--rose-gold)] bg-[var(--rose-gold)]/12">
                      <Bell className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-base font-semibold leading-tight text-foreground">Randevu Hatırlatması</h3>
                      <p className="mt-1 text-sm leading-tight text-muted-foreground">
                        Manage reminders for 2h, 24h, and 72h before appointments from one setting.
                      </p>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {reminderBadges.length ?
                      reminderBadges.map((badge) =>
                      <span
                        key={badge}
                        className="inline-flex rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-foreground">
                        
                              {badge}
                            </span>
                      ) :

                      <span className="inline-flex rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                            Aktif hatırlatma yok
                          </span>
                      }
                      </div>

                      <button
                      type="button"
                      onClick={openReminderSettings}
                      className="mt-2 flex items-center gap-1 text-sm font-semibold text-[var(--rose-gold)] hover:text-[var(--rose-gold-dark)] transition-colors">
                      
                        Ayarları Düzenle
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <ToggleButton
                  checked={reminderEnabled}
                  onClick={() => void handleReminderToggle()}
                  disabled={savingKey === 'reminder' || loading}
                  ariaLabel={`Appointment reminder ${reminderEnabled ? 'disable' : 'enable'}`} />
                
                </div>
              </CardContent>
            </Card>
          </> :
        null}

        {showAttendanceSection ?
        <Card className="border border-border bg-card shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[var(--rose-gold)] bg-[var(--rose-gold)]/12">
                    <UserRoundX className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-base font-semibold leading-tight text-foreground">Appointment No-show Tracking</h3>
                    <p className="mt-1 text-sm leading-tight text-muted-foreground">
                      Manage late cancellation, late change, and missed appointment rules in one place.
                    </p>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="inline-flex rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-foreground">
                        Validity: {validityLabel(attendanceConfig.validityWindow)}
                      </span>
                      <span className="inline-flex rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-foreground">
                        Notification: {enabledNotificationEventCount} statuses
                      </span>
                    </div>

                    <button
                    type="button"
                    onClick={openAttendanceSettings}
                    className="mt-2 flex items-center gap-1 text-sm font-semibold text-[var(--rose-gold)] hover:text-[var(--rose-gold-dark)] transition-colors">
                    
                      Ayarları Düzenle
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <ToggleButton
                checked={attendanceEnabled}
                onClick={() => void handleAttendanceToggle()}
                disabled={savingKey === 'attendance' || loading}
                ariaLabel={`No-show tracking ${attendanceEnabled ? 'disable' : 'enable'}`} />
              
              </div>
            </CardContent>
          </Card> :
        null}
      </div>

      <Dialog open={editingType === 'reminder'} onOpenChange={(open) => !open ? closeDialog() : null}>
        <DialogContent
          className="max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto top-4 translate-y-0 sm:top-[50%] sm:translate-y-[-50%]"
          aria-describedby={undefined}>
          
          <DialogHeader>
            <DialogTitle>Randevu Hatırlatma Ayarları</DialogTitle>
          </DialogHeader>

          {editReminderConfig ?
          <div className="space-y-3 py-2">
              <OptionRow
              icon={Clock3}
              title="2 hour reminder"
              description="A short reminder message is sent."
              checked={editReminderConfig.enable2h}
              onToggle={() => setEditReminderConfig((prev) => prev ? { ...prev, enable2h: !prev.enable2h } : prev)}>
              
                <OptionRow
                icon={MapPin}
                title="Location sending"
                description="Salon location is added to the message."
                checked={editReminderConfig.sendLocationAt2h}
                onToggle={() =>
                setEditReminderConfig((prev) => prev ? { ...prev, sendLocationAt2h: !prev.sendLocationAt2h } : prev)
                } />
              
              </OptionRow>

              <OptionRow
              icon={ShieldCheck}
              title="24 hour reminder"
              description="A reminder is sent to the customer the day before."
              checked={editReminderConfig.enable24h}
              onToggle={() => setEditReminderConfig((prev) => prev ? { ...prev, enable24h: !prev.enable24h } : prev)}>
              
                <OptionRow
                icon={ShieldCheck}
                title="Participation confirmation"
                description="A participation confirmation step is added to the message."
                checked={editReminderConfig.requestConfirmationAt24h}
                onToggle={() =>
                setEditReminderConfig((prev) =>
                prev ? { ...prev, requestConfirmationAt24h: !prev.requestConfirmationAt24h } : prev
                )
                } />
              
              </OptionRow>

              <OptionRow
              icon={TriangleAlert}
              title="72 hour reminder"
              description="A general information message will be sent 3 days before the appointment."
              checked={editReminderConfig.enable72h}
              onToggle={() => setEditReminderConfig((prev) => prev ? { ...prev, enable72h: !prev.enable72h } : prev)} />
            
            </div> :
          null}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>İptal</Button>
            <Button
              onClick={() => void saveReminderSettings()}
              disabled={savingKey === 'reminder'}
              className="bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)] text-white">
              
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editingType === 'attendance'} onOpenChange={(open) => !open ? closeDialog() : null}>
        <DialogContent
          className="max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto top-4 translate-y-0 sm:top-[50%] sm:translate-y-[-50%]"
          aria-describedby={undefined}>
          
          <DialogHeader>
            <DialogTitle>No-show Takip Ayarları</DialogTitle>
          </DialogHeader>

          {editAttendanceConfig ?
          <div className="space-y-4 py-2">
              <div className="space-y-3">
                <Label>Which statuses should count as violations?</Label>

                <OptionRow
                icon={UserRoundX}
                title="missing an appointment"
                description="If the customer does not come to the appointment time, a violation record is created."
                checked={editAttendanceConfig.countMissedAppointments}
                onToggle={() =>
                setEditAttendanceConfig((prev) =>
                prev ? { ...prev, countMissedAppointments: !prev.countMissedAppointments } : prev
                )
                } />
              

                <OptionRow
                icon={CalendarX2}
                title="late cancellations"
                description="Randevuya çok kısa süre kala yapılan iptaller ihlal sayılır."
                checked={editAttendanceConfig.countLateCancellations}
                onToggle={() =>
                setEditAttendanceConfig((prev) =>
                prev ? { ...prev, countLateCancellations: !prev.countLateCancellations } : prev
                )
                }>
                
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">How many hours before should a cancellation count as late?</Label>
                    <div className="flex items-center gap-2">
                      <Input
                      type="number"
                      min={1}
                      value={editAttendanceConfig.lateCancellationHours}
                      onChange={(event) => {
                        const value = Math.max(1, Number(event.target.value || 1));
                        setEditAttendanceConfig((prev) => prev ? { ...prev, lateCancellationHours: value } : prev);
                      }} />
                    
                      <span className="text-sm text-muted-foreground">saat</span>
                    </div>
                  </div>
                </OptionRow>

                <OptionRow
                icon={TriangleAlert}
                title="late changes"
                description="Time/date changes made shortly before the appointment will be considered a violation."
                checked={editAttendanceConfig.countLateReschedules}
                onToggle={() =>
                setEditAttendanceConfig((prev) =>
                prev ? { ...prev, countLateReschedules: !prev.countLateReschedules } : prev
                )
                }>
                
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">How many hours before should a reschedule count as late?</Label>
                    <div className="flex items-center gap-2">
                      <Input
                      type="number"
                      min={1}
                      value={editAttendanceConfig.lateRescheduleHours}
                      onChange={(event) => {
                        const value = Math.max(1, Number(event.target.value || 1));
                        setEditAttendanceConfig((prev) => prev ? { ...prev, lateRescheduleHours: value } : prev);
                      }} />
                    
                      <span className="text-sm text-muted-foreground">saat</span>
                    </div>
                  </div>
                </OptionRow>
              </div>

              <div className="space-y-2">
                <Label>How long should violation records remain valid?</Label>
                <Select
                value={editAttendanceConfig.validityWindow}
                onValueChange={(value) =>
                setEditAttendanceConfig((prev) =>
                prev ? { ...prev, validityWindow: value as ValidityWindow } : prev
                )
                }>
                
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VALIDITY_OPTIONS.map((option) =>
                  <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                  )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>How should penalties be applied?</Label>
                <div className="space-y-2">
                  {ATTENDANCE_RANGES.map((range) =>
                <div
                  key={range.key}
                  className="flex flex-col gap-2 sm:grid sm:grid-cols-[80px_1fr] sm:items-center">
                  
                      <p className="text-sm font-medium leading-none sm:leading-normal">{range.label}</p>
                      <Select
                    value={editAttendanceConfig.penaltyPolicy[range.key]}
                    onValueChange={(value) =>
                    setEditAttendanceConfig((prev) =>
                    prev ?
                    {
                      ...prev,
                      penaltyPolicy: {
                        ...prev.penaltyPolicy,
                        [range.key]: value as AttendancePenaltyAction
                      }
                    } :
                    prev
                    )
                    }>
                    
                        <SelectTrigger size="sm" className="w-full min-w-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PENALTY_ACTION_OPTIONS.map((option) =>
                      <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                      )}
                        </SelectContent>
                      </Select>
                    </div>
                )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>When should post-violation notifications be sent?</Label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                  type="button"
                  onClick={() =>
                  setEditAttendanceConfig((prev) =>
                  prev ?
                  {
                    ...prev,
                    notificationEvents: {
                      ...prev.notificationEvents,
                      lateCancellations: !prev.notificationEvents.lateCancellations
                    }
                  } :
                  prev
                  )
                  }
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm text-left transition-colors',
                    editAttendanceConfig.notificationEvents.lateCancellations ?
                    'border-[var(--rose-gold)] bg-[var(--rose-gold)]/10 text-foreground' :
                    'border-border text-muted-foreground hover:border-border/80'
                  )}>
                  
                    Gec iptallerde gönder
                  </button>

                  <button
                  type="button"
                  onClick={() =>
                  setEditAttendanceConfig((prev) =>
                  prev ?
                  {
                    ...prev,
                    notificationEvents: {
                      ...prev.notificationEvents,
                      lateReschedules: !prev.notificationEvents.lateReschedules
                    }
                  } :
                  prev
                  )
                  }
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm text-left transition-colors',
                    editAttendanceConfig.notificationEvents.lateReschedules ?
                    'border-[var(--rose-gold)] bg-[var(--rose-gold)]/10 text-foreground' :
                    'border-border text-muted-foreground hover:border-border/80'
                  )}>
                  
                    Gec değişikliklerde gönder
                  </button>

                  <button
                  type="button"
                  onClick={() =>
                  setEditAttendanceConfig((prev) =>
                  prev ?
                  {
                    ...prev,
                    notificationEvents: {
                      ...prev.notificationEvents,
                      missedAppointments: !prev.notificationEvents.missedAppointments
                    }
                  } :
                  prev
                  )
                  }
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm text-left transition-colors',
                    editAttendanceConfig.notificationEvents.missedAppointments ?
                    'border-[var(--rose-gold)] bg-[var(--rose-gold)]/10 text-foreground' :
                    'border-border text-muted-foreground hover:border-border/80'
                  )}>
                  
                    Gelmedigi randevularda gönder
                  </button>
                </div>
              </div>
            </div> :
          null}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>İptal</Button>
            <Button
              onClick={() => void saveAttendanceSettings()}
              disabled={savingKey === 'attendance'}
              className="bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)] text-white">
              
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}