import { useState } from 'react';
import { ArrowLeft, Bell, Clock, MapPin, Star, CalendarCheck, Settings2, ChevronRight, Zap, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface AutomationsProps {
  onBack: () => void;
}

interface Automation {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  enabled: boolean;
  category: 'reminder' | 'feedback' | 'info';
  timing?: string;
  details: string;
  settings?: AutomationSetting[];
}

interface AutomationSetting {
  key: string;
  label: string;
  type: 'time' | 'toggle' | 'select';
  value: string | boolean;
  options?: { value: string; label: string }[];
}

const initialAutomations: Automation[] = [
  {
    id: 'reminder-24h',
    name: 'Appointment Reminder (24 Hours)',
    description: 'Automatic reminder 24 hours before appointment',
    icon: Bell,
    color: '#3B82F6',
    enabled: true,
    category: 'reminder',
    timing: '24 hours ago',
    details: 'Appointment date, time, service and employee information is sent to the customer via WhatsApp.',
    settings: [
      { key: 'timing', label: 'Shipping Time', type: 'select', value: '24h', options: [
        { value: '48h', label: '48 hours ago' },
        { value: '24h', label: '24 hours ago' },
        { value: '12h', label: '12 hours ago' },
        { value: '6h', label: '6 hours ago' },
      ]},
      { key: 'includeDirections', label: 'Add Directions', type: 'toggle', value: true },
      { key: 'confirmButton', label: 'Add Confirmation Button', type: 'toggle', value: true },
    ],
  },
  {
    id: 'reminder-2h',
    name: 'Appointment Reminder (2 Hours)',
    description: 'Quick reminder 2 hours before the appointment',
    icon: Clock,
    color: '#8B5CF6',
    enabled: true,
    category: 'reminder',
    timing: '2 hours ago',
    details: 'The customer is reminded of his appointment with a short WhatsApp message.',
    settings: [
      { key: 'timing', label: 'Shipping Time', type: 'select', value: '2h', options: [
        { value: '3h', label: '3 hours ago' },
        { value: '2h', label: '2 hours ago' },
        { value: '1h', label: '1 hour ago' },
      ]},
    ],
  },
  {
    id: 'directions',
    name: 'Directions Message',
    description: 'Salon location and directions before your appointment',
    icon: MapPin,
    color: '#22C55E',
    enabled: true,
    category: 'info',
    timing: 'With reminder',
    details: 'Directions are sent to the customer via a Google Maps link. The map URL from Hall Information is used.',
    settings: [
      { key: 'standalone', label: 'Send as Separate Message', type: 'toggle', value: false },
      { key: 'includeParking', label: 'Add Parking Info', type: 'toggle', value: true },
    ],
  },
  {
    id: 'post-visit',
    name: 'Post-Visit Thank You',
    description: 'Thank you message after the appointment is completed',
    icon: Star,
    color: '#F59E0B',
    enabled: true,
    category: 'feedback',
    timing: '2 saat sonra',
    details: 'A thank you message and satisfaction survey are sent to the customer.',
    settings: [
      { key: 'timing', label: 'Shipping Time', type: 'select', value: '2h_after', options: [
        { value: '1h_after', label: '1 saat sonra' },
        { value: '2h_after', label: '2 saat sonra' },
        { value: '24h_after', label: 'the next day' },
      ]},
      { key: 'includeRating', label: 'Request Score Evaluation', type: 'toggle', value: true },
      { key: 'includeRebookLink', label: 'Reappointment Link', type: 'toggle', value: true },
    ],
  },
  {
    id: 'no-show-warning',
    name: 'No-Show Alert',
    description: 'Automatic information for customers who miss appointments',
    icon: CalendarCheck,
    color: '#EF4444',
    enabled: true,
    category: 'reminder',
    timing: '1 hour after no-show',
    details: 'An information message is sent to the customer who does not attend the appointment. A blacklist warning is added to those who perform 3+ no-shows.',
    settings: [
      { key: 'autoBlacklist', label: 'Auto Blacklist (3+ no-shows)', type: 'toggle', value: false },
      { key: 'includeReschedule', label: 'Reappointment Link', type: 'toggle', value: true },
    ],
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  reminder: 'Reminders',
  feedback: 'Feedback',
  info: 'Information',
};

const CATEGORY_ORDER = ['reminder', 'info', 'feedback'];

export function Automations({ onBack }: AutomationsProps) {
  const [automations, setAutomations] = useState<Automation[]>(initialAutomations);
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState<AutomationSetting[]>([]);

  const toggleAutomation = (id: string) => {
    setAutomations(automations.map(a =>
      a.id === id ? { ...a, enabled: !a.enabled } : a
    ));
  };

  const openSettings = (automation: Automation) => {
    setSelectedAutomation(automation);
    setLocalSettings(automation.settings ? [...automation.settings.map(s => ({ ...s }))] : []);
    setIsSettingsOpen(true);
  };

  const updateLocalSetting = (key: string, value: string | boolean) => {
    setLocalSettings(localSettings.map(s =>
      s.key === key ? { ...s, value } : s
    ));
  };

  const saveSettings = () => {
    if (!selectedAutomation) return;
    setAutomations(automations.map(a =>
      a.id === selectedAutomation.id ? { ...a, settings: localSettings } : a
    ));
    setIsSettingsOpen(false);
  };

  const activeCount = automations.filter(a => a.enabled).length;

  const groupedAutomations = CATEGORY_ORDER.map(cat => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    items: automations.filter(a => a.category === cat),
  })).filter(g => g.items.length > 0);

  return (
    <div className="h-full pb-20 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-[var(--luxury-bg)] z-10 border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">Otomasyonlar</h1>
            <p className="text-sm text-muted-foreground">Automated notifications and reminders</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border/50 bg-gradient-to-br from-green-500/5 to-transparent">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{activeCount}</p>
                <p className="text-[10px] text-muted-foreground">Aktif Otomasyon</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-gradient-to-br from-[var(--rose-gold)]/5 to-transparent">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--rose-gold)]/10 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-[var(--rose-gold)]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--rose-gold)]">847</p>
                <p className="text-[10px] text-muted-foreground">Sent This Month</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Grouped Automations */}
        {groupedAutomations.map(group => (
          <div key={group.category}>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">
              {group.label}
            </h3>
            <div className="space-y-2">
              {group.items.map(automation => {
                const Icon = automation.icon;
                return (
                  <Card
                    key={automation.id}
                    className={`border-border/50 transition-all ${automation.enabled ? '' : 'opacity-60'}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${automation.color}15` }}
                        >
                          <Icon className="w-5 h-5" style={{ color: automation.color }} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-sm text-foreground leading-tight">{automation.name}</h4>
                            <Switch
                              checked={automation.enabled}
                              onCheckedChange={() => toggleAutomation(automation.id)}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{automation.description}</p>

                          <div className="flex items-center gap-2 flex-wrap">
                            {automation.timing && (
                              <Badge variant="secondary" className="text-[10px] py-0 h-4">
                                {automation.timing}
                              </Badge>
                            )}
                          </div>

                          {automation.settings && automation.settings.length > 0 && (
                            <button
                              onClick={() => openSettings(automation)}
                              className="mt-2 flex items-center gap-1 text-xs text-[var(--rose-gold)] hover:text-[var(--rose-gold-dark)] transition-colors"
                            >
                              <Settings2 className="w-3 h-3" />
                              Edit Settings
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}

        {/* Info Card */}
        <Card className="border-[var(--deep-indigo)]/20 bg-[var(--deep-indigo)]/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MessageCircle className="w-5 h-5 text-[var(--deep-indigo)] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm mb-1">Message Usage</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  WhatsApp messages are sent through Business API.
                  Your monthly quota: <span className="font-semibold text-foreground">1.000 WhatsApp</span>
                </p>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">WhatsApp usage</span>
                    <span className="font-medium">672 / 1.000</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-green-500" style={{ width: '67.2%' }} />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAutomation && (() => {
                const Icon = selectedAutomation.icon;
                return <Icon className="w-5 h-5" style={{ color: selectedAutomation.color }} />;
              })()}
              {selectedAutomation?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {selectedAutomation?.details}
            </p>

            <div className="space-y-4 border-t border-border pt-4">
              {localSettings.map(setting => (
                <div key={setting.key}>
                  {setting.type === 'toggle' ? (
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">{setting.label}</Label>
                      <Switch
                        checked={setting.value as boolean}
                        onCheckedChange={(checked) => updateLocalSetting(setting.key, checked)}
                      />
                    </div>
                  ) : setting.type === 'select' ? (
                    <div className="space-y-2">
                      <Label>{setting.label}</Label>
                      <Select
                        value={setting.value as string}
                        onValueChange={(val) => updateLocalSetting(setting.key, val)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {setting.options?.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : setting.type === 'time' ? (
                    <div className="space-y-2">
                      <Label>{setting.label}</Label>
                      <Input
                        type="time"
                        value={setting.value as string}
                        onChange={(e) => updateLocalSetting(setting.key, e.target.value)}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveSettings}
              style={{ backgroundColor: 'var(--rose-gold)', color: 'white' }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}