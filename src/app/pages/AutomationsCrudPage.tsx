import { useEffect, useState } from 'react';
import { Bell, CalendarX2, ChevronRight, MapPin, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { cn } from '../components/ui/utils';

interface AutomationItem {
  id: number;
  key: string;
  name: string;
  description: string | null;
  config: unknown;
  isEnabled: boolean;
}

type SaveKey = 'reminder' | 'no-show' | null;
type EditingType = 'reminder' | 'no-show' | null;

const REMINDER_KEY = 'appointment_reminder';
const LEGACY_REMINDER_24H_KEY = 'appointment_reminder_24h';
const LEGACY_REMINDER_2H_KEY = 'appointment_reminder_2h';
const NO_SHOW_KEY = 'appointment_no_show_warning';

interface ReminderConfig {
  enable2h: boolean;
  enable24h: boolean;
  enable72h: boolean;
  sendLocationAt2h: boolean;
  requestConfirmationAt24h: boolean;
}

interface NoShowConfig {
  delayMinutes: number;
  minimumChangeHours: number;
}

const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  enable2h: true,
  enable24h: true,
  enable72h: false,
  sendLocationAt2h: true,
  requestConfirmationAt24h: true,
};

const DEFAULT_NO_SHOW_CONFIG: NoShowConfig = {
  delayMinutes: 60,
  minimumChangeHours: 12,
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

function parseReminderConfig(
  raw: unknown,
  legacy2hEnabled?: boolean,
  legacy24hEnabled?: boolean
): ReminderConfig {
  const config = isRecord(raw) ? raw : {};

  return {
    enable2h: toBoolean(config.enable2h, legacy2hEnabled ?? DEFAULT_REMINDER_CONFIG.enable2h),
    enable24h: toBoolean(config.enable24h, legacy24hEnabled ?? DEFAULT_REMINDER_CONFIG.enable24h),
    enable72h: toBoolean(config.enable72h, DEFAULT_REMINDER_CONFIG.enable72h),
    sendLocationAt2h: toBoolean(config.sendLocationAt2h, DEFAULT_REMINDER_CONFIG.sendLocationAt2h),
    requestConfirmationAt24h: toBoolean(config.requestConfirmationAt24h, DEFAULT_REMINDER_CONFIG.requestConfirmationAt24h),
  };
}

function parseNoShowConfig(raw: unknown, fallbackMinimumChangeHours: number): NoShowConfig {
  const config = isRecord(raw) ? raw : {};

  return {
    delayMinutes: Math.max(15, toNumber(config.delayMinutes, DEFAULT_NO_SHOW_CONFIG.delayMinutes)),
    minimumChangeHours: Math.max(
      1,
      toNumber(config.minimumChangeHours, fallbackMinimumChangeHours || DEFAULT_NO_SHOW_CONFIG.minimumChangeHours)
    ),
  };
}

function noShowLabel(delayMinutes: number): string {
  if (delayMinutes % 60 === 0) {
    return `No-show sonrası ${delayMinutes / 60} saat`;
  }
  return `No-show sonrası ${delayMinutes} dk`;
}

function ToggleButton({ checked, onClick, disabled, ariaLabel }: { checked: boolean; onClick: () => void; disabled?: boolean; ariaLabel: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'relative h-6 w-11 rounded-full transition-all disabled:opacity-60 disabled:cursor-not-allowed shrink-0 mt-0.5',
        checked ? 'bg-white' : 'bg-white/25'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full transition-all duration-200',
          checked ? 'left-[22px] bg-[#0b1026]' : 'left-[2px] bg-white'
        )}
      />
    </button>
  );
}

function OptionRow({
  icon: Icon,
  title,
  description,
  checked,
  onToggle,
  disabled,
  children,
}: {
  icon: any;
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
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
          disabled={disabled}
          className={cn(
            'relative h-6 w-11 rounded-full transition-all disabled:opacity-60 disabled:cursor-not-allowed shrink-0',
            checked ? 'bg-[var(--rose-gold)]' : 'bg-muted'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all duration-200',
              checked ? 'left-[22px]' : 'left-[2px]'
            )}
          />
        </button>
      </div>

      {checked && children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

export function AutomationsCrudPage() {
  const { apiFetch } = useAuth();

  const [items, setItems] = useState<AutomationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<SaveKey>(null);

  const [editingType, setEditingType] = useState<EditingType>(null);
  const [editReminderConfig, setEditReminderConfig] = useState<ReminderConfig | null>(null);
  const [editNoShowDelay, setEditNoShowDelay] = useState<number>(DEFAULT_NO_SHOW_CONFIG.delayMinutes);
  const [editNoShowMinChangeHours, setEditNoShowMinChangeHours] = useState<number>(
    DEFAULT_NO_SHOW_CONFIG.minimumChangeHours
  );

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<{ items: AutomationItem[] }>('/api/admin/automations');
      setItems(response.items || []);
    } catch (err: any) {
      setError(err?.message || 'Otomasyonlar alınamadı.');
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

  const reminderRawConfig = isRecord(reminderRule?.config) ? reminderRule.config : {};
  const legacyReminderMinChangeHours = Math.max(
    1,
    toNumber(reminderRawConfig.minChangeHoursAt72h, DEFAULT_NO_SHOW_CONFIG.minimumChangeHours)
  );

  const noShowRule = getRule(NO_SHOW_KEY);
  const noShowConfig = parseNoShowConfig(noShowRule?.config, legacyReminderMinChangeHours);
  const noShowEnabled = noShowRule?.isEnabled ?? true;

  const reminderBadges: string[] = [];
  if (reminderConfig.enable2h) {
    reminderBadges.push(reminderConfig.sendLocationAt2h ? '2 saat kala + konum' : '2 saat kala');
  }
  if (reminderConfig.enable24h) {
    reminderBadges.push(reminderConfig.requestConfirmationAt24h ? '24 saat kala + katılım onayı' : '24 saat kala');
  }
  if (reminderConfig.enable72h) {
    reminderBadges.push(`72 saat kala + en az ${noShowConfig.minimumChangeHours} saat kala değişiklik uyarısı`);
  }

  const upsertRule = async (payload: {
    key: string;
    name: string;
    description: string;
    isEnabled: boolean;
    config: Record<string, unknown>;
  }) => {
    const current = getRule(payload.key);

    if (current) {
      const response = await apiFetch<{ item: AutomationItem }>(`/api/admin/automations/${current.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isEnabled: payload.isEnabled, config: payload.config }),
      });
      const updated = response.item;
      setItems((prev) => prev.map((item) => (item.id === current.id ? updated : item)));
      return;
    }

    const response = await apiFetch<{ item: AutomationItem }>('/api/admin/automations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setItems((prev) => [response.item, ...prev]);
  };

  const handleReminderToggle = async () => {
    setSavingKey('reminder');
    setError(null);

    try {
      await upsertRule({
        key: REMINDER_KEY,
        name: 'Randevu Hatırlatma',
        description: '2 saat, 24 saat ve 72 saat kala randevu hatırlatma otomasyonu',
        isEnabled: !reminderEnabled,
        config: reminderConfig,
      });
    } catch (err: any) {
      setError(err?.message || 'Randevu hatırlatma güncellenemedi.');
    } finally {
      setSavingKey(null);
    }
  };

  const handleNoShowToggle = async () => {
    setSavingKey('no-show');
    setError(null);

    try {
      await upsertRule({
        key: NO_SHOW_KEY,
        name: 'No-Show Uyarısı',
        description: 'Randevuya gelmeyen müşterilere otomatik bilgilendirme',
        isEnabled: !noShowEnabled,
        config: noShowConfig,
      });
    } catch (err: any) {
      setError(err?.message || 'No-show otomasyonu güncellenemedi.');
    } finally {
      setSavingKey(null);
    }
  };

  const openReminderSettings = () => {
    setEditReminderConfig(reminderConfig);
    setEditingType('reminder');
  };

  const openNoShowSettings = () => {
    setEditNoShowDelay(noShowConfig.delayMinutes);
    setEditNoShowMinChangeHours(noShowConfig.minimumChangeHours);
    setEditingType('no-show');
  };

  const closeDialog = () => {
    setEditingType(null);
    setEditReminderConfig(null);
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
        name: 'Randevu Hatırlatma',
        description: '2 saat, 24 saat ve 72 saat kala randevu hatırlatma otomasyonu',
        isEnabled: reminderEnabled,
        config: editReminderConfig,
      });
      closeDialog();
    } catch (err: any) {
      setError(err?.message || 'Randevu hatırlatma ayarları kaydedilemedi.');
    } finally {
      setSavingKey(null);
    }
  };

  const saveNoShowSettings = async () => {
    const delay = Math.max(15, Number(editNoShowDelay || 15));
    const minimumChangeHours = Math.max(1, Number(editNoShowMinChangeHours || 1));

    setSavingKey('no-show');
    setError(null);

    try {
      await upsertRule({
        key: NO_SHOW_KEY,
        name: 'No-Show Uyarısı',
        description: 'Randevuya gelmeyen müşterilere otomatik bilgilendirme',
        isEnabled: noShowEnabled,
        config: { delayMinutes: delay, minimumChangeHours },
      });
      closeDialog();
    } catch (err: any) {
      setError(err?.message || 'No-show ayarları kaydedilemedi.');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[var(--luxury-bg)] pb-20">
      <div className="p-4 border-b border-border bg-[var(--luxury-bg)] sticky top-0 z-10">
        <h1 className="text-2xl font-semibold mb-1">Otomasyonlar</h1>
        <p className="text-sm text-muted-foreground">Randevu iletişimlerini otomatik yönet</p>
      </div>

      <div className="p-4 space-y-4">
        {error ? (
          <Card className="border-red-300 bg-red-50">
            <CardContent className="p-3">
              <p className="text-sm text-red-600">{error}</p>
            </CardContent>
          </Card>
        ) : null}

        <p className="text-xs font-semibold tracking-[0.08em] text-[#7E88A9] uppercase px-1">Hatırlatmalar</p>

        <Card className="border border-[#253050] bg-gradient-to-b from-[#151f3f] to-[#11182f] text-white shadow-[0_12px_28px_-20px_rgba(1,8,24,0.95)]">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[#8bb5ff] bg-[#1d2f63]">
                  <Bell className="w-5 h-5" />
                </div>

                <div className="min-w-0">
                  <h3 className="text-base font-semibold leading-tight text-white">Randevu Hatırlatma</h3>
                  <p className="mt-1 text-sm leading-tight text-white/75">
                    Tek ayardan 2 saat, 24 saat ve 72 saat önce hatırlatma kurgusunu yönet.
                  </p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {reminderBadges.length ? (
                      reminderBadges.map((badge) => (
                        <span key={badge} className="inline-flex rounded-full border border-white/10 bg-[#0b1026] px-2.5 py-1 text-[11px] font-semibold text-white/90">
                          {badge}
                        </span>
                      ))
                    ) : (
                      <span className="inline-flex rounded-full border border-white/10 bg-[#0b1026] px-2.5 py-1 text-[11px] font-semibold text-white/75">
                        Aktif hatırlatma yok
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={openReminderSettings}
                    className="mt-2 flex items-center gap-1 text-sm font-semibold text-[#ffb7c3] hover:text-[#ffd1d9] transition-colors"
                  >
                    Ayarları Düzenle
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <ToggleButton
                checked={reminderEnabled}
                onClick={() => void handleReminderToggle()}
                disabled={savingKey === 'reminder' || loading}
                ariaLabel={`Randevu hatırlatma ${reminderEnabled ? 'kapat' : 'aç'}`}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-[#253050] bg-gradient-to-b from-[#151f3f] to-[#11182f] text-white shadow-[0_12px_28px_-20px_rgba(1,8,24,0.95)]">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[#ff9da8] bg-[#52263a]">
                  <CalendarX2 className="w-5 h-5" />
                </div>

                <div className="min-w-0">
                  <h3 className="text-base font-semibold leading-tight text-white">No-Show Uyarısı</h3>
                  <p className="mt-1 text-sm leading-tight text-white/75">Randevuya gelmeyen müşterilere otomatik bilgilendirme.</p>

                  <span className="inline-flex mt-2 rounded-full border border-white/10 bg-[#0b1026] px-2.5 py-1 text-[11px] font-semibold text-white/90">
                    {noShowLabel(noShowConfig.delayMinutes)}
                  </span>

                  <button
                    type="button"
                    onClick={openNoShowSettings}
                    className="mt-2 flex items-center gap-1 text-sm font-semibold text-[#ffb7c3] hover:text-[#ffd1d9] transition-colors"
                  >
                    Ayarları Düzenle
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <ToggleButton
                checked={noShowEnabled}
                onClick={() => void handleNoShowToggle()}
                disabled={savingKey === 'no-show' || loading}
                ariaLabel={`No-show uyarısı ${noShowEnabled ? 'kapat' : 'aç'}`}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={editingType === 'reminder'} onOpenChange={(open) => (!open ? closeDialog() : null)}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Randevu Hatırlatma Ayarları</DialogTitle>
          </DialogHeader>

          {editReminderConfig ? (
            <div className="space-y-3 py-2">
              <OptionRow
                icon={MapPin}
                title="2 saat kala hatırlatma"
                description="Kısa hatırlatma mesajı gönderilir."
                checked={editReminderConfig.enable2h}
                onToggle={() => setEditReminderConfig((prev) => (prev ? { ...prev, enable2h: !prev.enable2h } : prev))}
              >
                <OptionRow
                  icon={MapPin}
                  title="Konum gönderimi"
                  description="Mesaja salon konumu eklenir."
                  checked={editReminderConfig.sendLocationAt2h}
                  onToggle={() =>
                    setEditReminderConfig((prev) => (prev ? { ...prev, sendLocationAt2h: !prev.sendLocationAt2h } : prev))
                  }
                />
              </OptionRow>

              <OptionRow
                icon={ShieldCheck}
                title="24 saat kala hatırlatma"
                description="Müşteriye bir gün önce hatırlatma gönderilir."
                checked={editReminderConfig.enable24h}
                onToggle={() => setEditReminderConfig((prev) => (prev ? { ...prev, enable24h: !prev.enable24h } : prev))}
              >
                <OptionRow
                  icon={ShieldCheck}
                  title="Katılım onayı"
                  description="Mesaja katılım onayı adımı eklenir."
                  checked={editReminderConfig.requestConfirmationAt24h}
                  onToggle={() =>
                    setEditReminderConfig((prev) =>
                      prev ? { ...prev, requestConfirmationAt24h: !prev.requestConfirmationAt24h } : prev
                    )
                  }
                />
              </OptionRow>

              <OptionRow
                icon={TriangleAlert}
                title="72 saat kala hatırlatma"
                description="Randevu değişiklik kuralı için ön bilgilendirme gönderilir."
                checked={editReminderConfig.enable72h}
                onToggle={() => setEditReminderConfig((prev) => (prev ? { ...prev, enable72h: !prev.enable72h } : prev))}
              >
                <p className="text-xs text-muted-foreground">
                  Bu mesajdaki “en az X saat kala değişiklik” değeri No-Show ayarlarından yönetilir.
                </p>
              </OptionRow>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>İptal</Button>
            <Button
              onClick={() => void saveReminderSettings()}
              disabled={savingKey === 'reminder'}
              className="bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)] text-white"
            >
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editingType === 'no-show'} onOpenChange={(open) => (!open ? closeDialog() : null)}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>No-Show Uyarı Ayarı</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label>Gönderim zamanı</Label>
            <Select value={String(editNoShowDelay)} onValueChange={(value) => setEditNoShowDelay(Number(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">No-show sonrası 30 dk</SelectItem>
                <SelectItem value="60">No-show sonrası 1 saat</SelectItem>
                <SelectItem value="120">No-show sonrası 2 saat</SelectItem>
              </SelectContent>
            </Select>

            <div className="space-y-2">
              <Label>Randevu değişikliği için minimum süre</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={editNoShowMinChangeHours}
                  onChange={(event) => {
                    const value = Math.max(1, Number(event.target.value || 1));
                    setEditNoShowMinChangeHours(value);
                  }}
                />
                <span className="text-sm text-muted-foreground">saat</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>İptal</Button>
            <Button
              onClick={() => void saveNoShowSettings()}
              disabled={savingKey === 'no-show'}
              className="bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)] text-white"
            >
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
