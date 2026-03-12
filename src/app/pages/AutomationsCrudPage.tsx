import { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarX2, ChevronRight, Clock3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { cn } from '../components/ui/utils';

interface AutomationItem {
  id: number;
  key: string;
  name: string;
  description: string | null;
  config: unknown;
  isEnabled: boolean;
}

type PresetKey = 'appointment_reminder_24h' | 'appointment_reminder_2h' | 'appointment_no_show_warning';

type AutomationPreset = {
  key: PresetKey;
  name: string;
  description: string;
  icon: typeof Bell;
  iconClassName: string;
  configKey: string;
  defaultValue: number;
  options: Array<{ value: number; label: string }>;
  badgeLabel: (value: number) => string;
};

const PRESETS: AutomationPreset[] = [
  {
    key: 'appointment_reminder_24h',
    name: 'Randevu Hatırlatması (24 Saat)',
    description: 'Randevudan 24 saat önce otomatik hatırlatma',
    icon: Bell,
    iconClassName: 'text-[#8bb5ff] bg-[#1d2f63]',
    configKey: 'leadHours',
    defaultValue: 24,
    options: [
      { value: 48, label: '48 saat önce' },
      { value: 24, label: '24 saat önce' },
      { value: 12, label: '12 saat önce' },
      { value: 6, label: '6 saat önce' },
    ],
    badgeLabel: (value) => `${value} saat önce`,
  },
  {
    key: 'appointment_reminder_2h',
    name: 'Randevu Hatırlatması (2 Saat)',
    description: 'Randevudan 2 saat önce kısa hatırlatma',
    icon: Clock3,
    iconClassName: 'text-[#b8a7ff] bg-[#2b2455]',
    configKey: 'leadHours',
    defaultValue: 2,
    options: [
      { value: 3, label: '3 saat önce' },
      { value: 2, label: '2 saat önce' },
      { value: 1, label: '1 saat önce' },
    ],
    badgeLabel: (value) => `${value} saat önce`,
  },
  {
    key: 'appointment_no_show_warning',
    name: 'No-Show Uyarısı',
    description: 'Randevuya gelmeyenlere otomatik bilgilendirme',
    icon: CalendarX2,
    iconClassName: 'text-[#ff9da8] bg-[#52263a]',
    configKey: 'delayMinutes',
    defaultValue: 60,
    options: [
      { value: 30, label: 'No-show sonrası 30 dk' },
      { value: 60, label: 'No-show sonrası 1 saat' },
      { value: 120, label: 'No-show sonrası 2 saat' },
    ],
    badgeLabel: (value) => {
      if (value % 60 === 0) {
        return `No-show sonrası ${value / 60} saat`;
      }
      return `No-show sonrası ${value} dk`;
    },
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asNumber(value: unknown, fallback: number): number {
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

function parseConfig(value: unknown): Record<string, unknown> {
  if (isRecord(value)) {
    return value;
  }
  return {};
}

export function AutomationsCrudPage() {
  const { apiFetch } = useAuth();
  const [items, setItems] = useState<AutomationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<PresetKey | null>(null);

  const [editingKey, setEditingKey] = useState<PresetKey | null>(null);
  const [editingTimingValue, setEditingTimingValue] = useState<number | null>(null);

  const presetMap = useMemo(
    () => new Map<PresetKey, AutomationPreset>(PRESETS.map((preset) => [preset.key, preset])),
    []
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

  const getRule = (key: PresetKey) => items.find((item) => item.key === key);

  const createRule = async (
    preset: AutomationPreset,
    payload: { isEnabled: boolean; config: Record<string, unknown> }
  ): Promise<AutomationItem> => {
    const response = await apiFetch<{ item: AutomationItem }>('/api/admin/automations', {
      method: 'POST',
      body: JSON.stringify({
        key: preset.key,
        name: preset.name,
        description: preset.description,
        isEnabled: payload.isEnabled,
        config: payload.config,
      }),
    });
    return response.item;
  };

  const updateRule = async (
    ruleId: number,
    payload: { isEnabled?: boolean; config?: Record<string, unknown> }
  ): Promise<AutomationItem> => {
    const response = await apiFetch<{ item: AutomationItem }>(`/api/admin/automations/${ruleId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.item;
  };

  const upsertRule = async (
    preset: AutomationPreset,
    payload: { isEnabled: boolean; config: Record<string, unknown> }
  ) => {
    const current = getRule(preset.key);

    let updated: AutomationItem;
    if (current) {
      updated = await updateRule(current.id, {
        isEnabled: payload.isEnabled,
        config: payload.config,
      });
      setItems((prev) => prev.map((item) => (item.id === current.id ? updated : item)));
    } else {
      updated = await createRule(preset, payload);
      setItems((prev) => [updated, ...prev]);
    }
  };

  const cards = PRESETS.map((preset) => {
    const rule = getRule(preset.key);
    const config = parseConfig(rule?.config);
    const timingValue = asNumber(config[preset.configKey], preset.defaultValue);

    return {
      preset,
      rule,
      config,
      timingValue,
      isEnabled: rule?.isEnabled ?? true,
    };
  });

  const handleToggle = async (key: PresetKey) => {
    const card = cards.find((item) => item.preset.key === key);
    if (!card) {
      return;
    }

    const { preset } = card;
    const nextEnabled = !card.isEnabled;
    const nextConfig = {
      ...card.config,
      [preset.configKey]: card.timingValue,
    };

    setSavingKey(key);
    setError(null);
    try {
      await upsertRule(preset, { isEnabled: nextEnabled, config: nextConfig });
    } catch (err: any) {
      setError(err?.message || 'Otomasyon güncellenemedi.');
    } finally {
      setSavingKey(null);
    }
  };

  const openSettings = (key: PresetKey) => {
    const card = cards.find((item) => item.preset.key === key);
    if (!card) {
      return;
    }

    setEditingKey(key);
    setEditingTimingValue(card.timingValue);
  };

  const closeSettings = () => {
    setEditingKey(null);
    setEditingTimingValue(null);
  };

  const saveSettings = async () => {
    if (!editingKey) {
      return;
    }

    const card = cards.find((item) => item.preset.key === editingKey);
    if (!card) {
      return;
    }

    const timingValue = editingTimingValue ?? card.timingValue;
    const nextConfig = {
      ...card.config,
      [card.preset.configKey]: timingValue,
    };

    setSavingKey(editingKey);
    setError(null);
    try {
      await upsertRule(card.preset, { isEnabled: card.isEnabled, config: nextConfig });
      closeSettings();
    } catch (err: any) {
      setError(err?.message || 'Ayarlar kaydedilemedi.');
    } finally {
      setSavingKey(null);
    }
  };

  const editingPreset = editingKey ? presetMap.get(editingKey) ?? null : null;

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

        <div className="space-y-3">
          {cards.map((card) => {
            const Icon = card.preset.icon;
            const isSaving = savingKey === card.preset.key;

            return (
              <Card
                key={card.preset.key}
                className="border border-[#253050] bg-gradient-to-b from-[#151f3f] to-[#11182f] text-white shadow-[0_12px_28px_-20px_rgba(1,8,24,0.95)]"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', card.preset.iconClassName)}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-base font-semibold leading-tight text-white">{card.preset.name}</h3>
                        <p className="mt-1 text-sm leading-tight text-white/75">{card.preset.description}</p>

                        <span className="inline-flex mt-2 rounded-full border border-white/10 bg-[#0b1026] px-2.5 py-1 text-[11px] font-semibold text-white/90">
                          {card.preset.badgeLabel(card.timingValue)}
                        </span>

                        <button
                          type="button"
                          onClick={() => openSettings(card.preset.key)}
                          className="mt-2 flex items-center gap-1 text-sm font-semibold text-[#ffb7c3] hover:text-[#ffd1d9] transition-colors"
                        >
                          Ayarları Düzenle
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleToggle(card.preset.key)}
                      disabled={isSaving || loading}
                      className={cn(
                        'relative h-6 w-11 rounded-full transition-all disabled:opacity-60 disabled:cursor-not-allowed shrink-0 mt-0.5',
                        card.isEnabled ? 'bg-white' : 'bg-white/25'
                      )}
                      aria-label={`${card.preset.name} ${card.isEnabled ? 'kapat' : 'aç'}`}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 h-5 w-5 rounded-full transition-all duration-200',
                          card.isEnabled ? 'left-[22px] bg-[#0b1026]' : 'left-[2px] bg-white'
                        )}
                      />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={!!editingPreset} onOpenChange={(open) => (!open ? closeSettings() : null)}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editingPreset?.name} Ayarları</DialogTitle>
          </DialogHeader>

          {editingPreset ? (
            <div className="space-y-3 py-2">
              <Label>Gönderim zamanı</Label>
              <Select
                value={String(editingTimingValue ?? editingPreset.defaultValue)}
                onValueChange={(value) => setEditingTimingValue(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {editingPreset.options.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={closeSettings}>İptal</Button>
            <Button
              onClick={() => void saveSettings()}
              disabled={!editingPreset || savingKey === editingPreset.key}
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
