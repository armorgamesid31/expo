import { useEffect, useMemo, useState } from 'react';
import { Award, Bell, Calendar, Clock3, Gift, Pencil, Trash2, UserPlus, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { cn } from '../components/ui/utils';

interface CampaignItem {
  id: number;
  name: string;
  type: string;
  description: string | null;
  config: unknown;
  isActive: boolean;
  priority?: number | null;
  deliveryMode?: 'AUTO' | 'MANUAL' | null;
  maxGlobalUsage?: number | null;
  maxPerCustomer?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt?: string | null;
}

interface CampaignMetricsBlock {
  appointmentCount: number;
  completedCount: number;
  cancelledCount: number;
  newCustomerCount: number;
  revenueEstimate: number;
}

interface CampaignMetrics {
  window: {
    start: string;
    end: string;
    previousStart: string;
    previousEnd: string;
  };
  current: CampaignMetricsBlock;
  previous: CampaignMetricsBlock;
  deltas: {
    appointmentPercent: number;
    newCustomerPercent: number;
    revenuePercent: number;
  };
}

interface CampaignDetailResponse {
  item: CampaignItem;
  metrics: CampaignMetrics;
}

type TemplateFieldType = 'number' | 'select' | 'multi-select';
type TemplateFieldValueKind = 'number' | 'string' | 'boolean' | 'stringArray';

interface TemplateField {
  key: string;
  label: string;
  type: TemplateFieldType;
  valueKind: TemplateFieldValueKind;
  min?: number;
  step?: number;
  options?: Array<{ value: string; label: string; }>;
}

interface CampaignTemplate {
  key: string;
  name: string;
  type: string;
  bullets: string[];
  icon: any;
  config: Record<string, unknown>;
  fields: TemplateField[];
}

interface CampaignDraft {
  id?: number;
  templateKey: string;
  type: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  priority: string;
  deliveryMode: 'AUTO' | 'MANUAL';
  maxGlobalUsage: string;
  maxPerCustomer: string;
  configInputs: Record<string, string>;
}

const WEEKDAY_OPTIONS: Array<{ value: string; label: string; }> = [
  { value: 'MON', label: 'Pzt' },
  { value: 'TUE', label: 'Sal' },
  { value: 'WED', label: 'Wed' },
  { value: 'THU', label: 'Per' },
  { value: 'FRI', label: 'Cum' },
  { value: 'SAT', label: 'Cts' },
  { value: 'SUN', label: 'Paz' }];


const TIME_OPTIONS: Array<{ value: string; label: string; }> = [
  { value: '09:00', label: '09:00' },
  { value: '10:00', label: '10:00' },
  { value: '11:00', label: '11:00' },
  { value: '12:00', label: '12:00' },
  { value: '13:00', label: '13:00' },
  { value: '14:00', label: '14:00' },
  { value: '15:00', label: '15:00' },
  { value: '16:00', label: '16:00' },
  { value: '17:00', label: '17:00' },
  { value: '18:00', label: '18:00' },
  { value: '19:00', label: '19:00' },
  { value: '20:00', label: '20:00' },
  { value: '21:00', label: '21:00' }];


const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    key: 'loyalty',
    name: "Sadakat Kampanyası",
    type: 'LOYALTY',
    bullets: ['Puan sistemi', 'Reappointment incentive'],
    icon: Award,
    config: {
      pointsPerVisit: 1,
      rewardThreshold: 5,
      rewardType: 'discount_percent',
      rewardValue: 15
    },
    fields: [
      { key: 'pointsPerVisit', label: 'Her ziyarette puan', type: 'number', valueKind: 'number', min: 1, step: 1 },
      { key: 'rewardThreshold', label: 'Number of visits for rewards', type: 'number', valueKind: 'number', min: 1, step: 1 },
      {
        key: 'rewardType',
        label: 'Reward tipi',
        type: 'select',
        valueKind: 'string',
        options: [
          { value: 'discount_percent', label: 'percent discount' },
          { value: 'fixed_amount', label: 'Sabit tutar' }]

      },
      { key: 'rewardValue', label: 'Reward value', type: 'number', valueKind: 'number', min: 1, step: 1 }]

  },
  {
    key: 'multi-service',
    name: "Çoklu Hizmet İndirimi",
    type: 'MULTI_SERVICE_DISCOUNT',
    bullets: ['2+ servicete campaign', 'Enlarge cart'],
    icon: Users,
    config: {
      minServiceCount: 2,
      discountType: 'discount_percent',
      discountValue: 10,
      appliesTo: 'same_appointment'
    },
    fields: [
      { key: 'minServiceCount', label: 'Minimum hizmet sayisi', type: 'number', valueKind: 'number', min: 2, step: 1 },
      {
        key: 'discountType',
        label: 'Discount type',
        type: 'select',
        valueKind: 'string',
        options: [
          { value: 'discount_percent', label: 'percent discount' },
          { value: 'fixed_amount', label: 'Sabit tutar' }]

      },
      { key: 'discountValue', label: 'discount value', type: 'number', valueKind: 'number', min: 1, step: 1 },
      {
        key: 'appliesTo',
        label: 'Uygulama tipi',
        type: 'select',
        valueKind: 'string',
        options: [
          { value: 'same_appointment', label: 'aynı randevu' },
          { value: 'same_day', label: 'same days' }]

      }]

  },
  {
    key: 'referral',
    name: "Arkadaşını Getir Kampanyası",
    type: 'REFERRAL',
    bullets: ['Fixed/Percent reward', 'İlk randevu tetikleme kuralı'],
    icon: UserPlus,
    config: {
      rewardType: 'discount_percent',
      referrerRewardValue: 10,
      referredCustomerRewardValue: 10,
      activationTiming: 'first_appointment',
      combineWithWelcomeCampaign: false
    },
    fields: [
      {
        key: 'rewardType',
        label: 'Discount type',
        type: 'select',
        valueKind: 'string',
        options: [
          { value: 'discount_percent', label: 'percent discount' },
          { value: 'fixed_amount', label: 'Sabit tutar' }]

      },
      {
        key: 'referrerRewardValue',
        label: 'Inviter reward',
        type: 'number',
        valueKind: 'number',
        min: 1,
        step: 1
      },
      {
        key: "referredMüşteriRewardValue",
        label: 'newcomer award',
        type: 'number',
        valueKind: 'number',
        min: 1,
        step: 1
      },
      {
        key: 'activationTiming',
        label: 'When should it be activated?',
        type: 'select',
        valueKind: 'string',
        options: [
          { value: 'first_appointment', label: 'İlk randevuda geçerli' },
          { value: 'after_first_completed', label: "İlk randevu tamamlandıktan sonra" }]

      },
      {
        key: 'combineWithWelcomeCampaign',
        label: 'Combine with first time customer campaign?',
        type: 'select',
        valueKind: 'boolean',
        options: [
          { value: 'false', label: 'No' },
          { value: 'true', label: 'Evet' }]

      }]

  },
  {
    key: 'birthday',
    name: "Doğum Günü Kampanyası",
    type: 'BIRTHDAY',
    bullets: ['Fixed/Percentage discount', 'Short usage duration'],
    icon: Gift,
    config: {
      discountType: 'discount_percent',
      discountValue: 20,
      validDaysAfterBirthday: 7
    },
    fields: [
      {
        key: 'discountType',
        label: 'Discount type',
        type: 'select',
        valueKind: 'string',
        options: [
          { value: 'discount_percent', label: 'percent discount' },
          { value: 'fixed_amount', label: 'Sabit tutar' }]

      },
      { key: 'discountValue', label: 'discount value', type: 'number', valueKind: 'number', min: 1, step: 1 },
      {
        key: 'validDaysAfterBirthday',
        label: 'Validity after birthday (days)',
        type: 'number',
        valueKind: 'number',
        min: 1,
        step: 1
      }]

  },
  {
    key: 'winback',
    name: "Geri Kazanım Kampanyası",
    type: 'WINBACK',
    bullets: ['30-60 days pasif customer hedefi', 'Tek seferlik teklif'],
    icon: Bell,
    config: {
      inactiveDaysThreshold: 30,
      offerType: 'discount_percent',
      offerValue: 15
    },
    fields: [
      {
        key: 'inactiveDaysThreshold',
        label: 'passivity threshold',
        type: 'select',
        valueKind: 'number',
        options: [
          { value: '30', label: '30 days' },
          { value: '45', label: '45 days' },
          { value: '60', label: '60 days' }]

      },
      {
        key: 'offerType',
        label: 'Teklif tipi',
        type: 'select',
        valueKind: 'string',
        options: [
          { value: 'discount_percent', label: 'percent discount' },
          { value: 'fixed_amount', label: 'Sabit tutar' }]

      },
      { key: 'offerValue', label: 'bid value', type: 'number', valueKind: 'number', min: 1, step: 1 }]

  },
  {
    key: 'welcome',
    name: 'İlk Randevuya Hoş Geldin',
    type: 'WELCOME_FIRST_VISIT',
    bullets: ['Fixed/Percentage discount', 'Use with arknamebring'],
    icon: Calendar,
    config: {
      discountType: 'discount_percent',
      discountValue: 15,
      combineWithReferralCampaign: false
    },
    fields: [
      {
        key: 'discountType',
        label: 'Discount type',
        type: 'select',
        valueKind: 'string',
        options: [
          { value: 'discount_percent', label: 'percent discount' },
          { value: 'fixed_amount', label: 'Sabit tutar' }]

      },
      { key: 'discountValue', label: 'discount value', type: 'number', valueKind: 'number', min: 1, step: 1 },
      {
        key: 'combineWithReferralCampaign',
        label: 'Should it be combined with the Bring Your Arkname campaign?',
        type: 'select',
        valueKind: 'boolean',
        options: [
          { value: 'false', label: 'No' },
          { value: 'true', label: 'Evet' }]

      }]

  },
  {
    key: 'off-peak',
    name: 'Filling Empty Hours',
    type: 'OFF_PEAK_FILL',
    bullets: ['Day selection', 'Time selection', 'Fixed/Percentage discount'],
    icon: Clock3,
    config: {
      weekdays: ['MON', 'TUE', 'WED', 'THU'],
      startHour: '12:00',
      endHour: '16:00',
      discountType: 'discount_percent',
      discountValue: 15
    },
    fields: [
      {
        key: 'weekdays',
        label: 'Valid days',
        type: 'multi-select',
        valueKind: 'stringArray',
        options: WEEKDAY_OPTIONS
      },
      {
        key: 'startHour',
        label: 'start time',
        type: 'select',
        valueKind: 'string',
        options: TIME_OPTIONS
      },
      {
        key: 'endHour',
        label: 'end time',
        type: 'select',
        valueKind: 'string',
        options: TIME_OPTIONS
      },
      {
        key: 'discountType',
        label: 'Discount type',
        type: 'select',
        valueKind: 'string',
        options: [
          { value: 'discount_percent', label: 'percent discount' },
          { value: 'fixed_amount', label: 'Sabit tutar' }]

      },
      { key: 'discountValue', label: 'discount value', type: 'number', valueKind: 'number', min: 1, step: 1 }]

  }];


function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toDateInput(value?: string | null): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 10);
}

function toIsoFromDateOrNull(value: string): string | null {
  if (!value.trim()) {
    return null;
  }
  return new Date(`${value}T00:00:00`).toISOString();
}

function formatDateLabel(value?: string | null): string {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleDateString('tr-TR');
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0
  }).format(value || 0);
}

function getDeltaClassName(value: number): string {
  if (value > 0) {
    return 'text-green-600';
  }
  if (value < 0) {
    return 'text-red-500';
  }
  return 'text-muted-foreground';
}

function templateByType(type: string): CampaignTemplate | undefined {
  return CAMPAIGN_TEMPLATES.find((template) => template.type === type);
}

function templateByKey(key: string): CampaignTemplate | undefined {
  return CAMPAIGN_TEMPLATES.find((template) => template.key === key);
}

function displayCampaignName(item: CampaignItem): string {
  const template = templateByType(item.type);
  if (template) {
    return template.name;
  }
  return item.name || item.type;
}

function buildConfigInputs(template: CampaignTemplate, source?: unknown): Record<string, string> {
  const fromConfig = isRecord(source) ? source : template.config;
  const inputs: Record<string, string> = {};

  template.fields.forEach((field) => {
    const value = fromConfig[field.key];

    if (value === undefined || value === null) {
      inputs[field.key] = '';
      return;
    }

    if (Array.isArray(value)) {
      inputs[field.key] = value.map(String).join(',');
      return;
    }

    inputs[field.key] = String(value);
  });

  return inputs;
}

function parseConfigFromInputs(template: CampaignTemplate, configInputs: Record<string, string>): Record<string, unknown> {
  const config: Record<string, unknown> = {};

  template.fields.forEach((field) => {
    const raw = (configInputs[field.key] || '').trim();
    if (!raw) {
      return;
    }

    if (field.valueKind === 'number') {
      const numeric = Number(raw);
      if (Number.isFinite(numeric)) {
        config[field.key] = numeric;
      }
      return;
    }

    if (field.valueKind === 'boolean') {
      config[field.key] = raw === 'true';
      return;
    }

    if (field.valueKind === 'stringArray') {
      config[field.key] = raw.
        split(',').
        map((entry) => entry.trim()).
        filter(Boolean);
      return;
    }

    config[field.key] = raw;
  });

  return config;
}

export function CampaignsCrudPage() {
  const { apiFetch } = useAuth();

  const [items, setItems] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [createDraft, setCreateDraft] = useState<CampaignDraft | null>(null);
  const [savingCreate, setSavingCreate] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailMetrics, setDetailMetrics] = useState<CampaignMetrics | null>(null);
  const [detailDraft, setDetailDraft] = useState<CampaignDraft | null>(null);
  const [savingDetail, setSavingDetail] = useState(false);
  const [deletingDetail, setDeletingDetail] = useState(false);

  const loname = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<{ items: CampaignItem[]; }>('/api/admin/campaigns');
      setItems(response.items || []);
    } catch (err: any) {
      setError(err?.message || 'Campaigns cannot be received.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loname();
  }, []);

  const now = new Date();
  const activeItems = useMemo(
    () =>
      items.filter((item) => {
        if (!item.isActive) {
          return false;
        }
        if (!item.endsAt) {
          return true;
        }
        return new Date(item.endsAt) >= now;
      }),
    [items]
  );

  const previousItems = useMemo(
    () =>
      items.filter((item) => {
        if (!item.isActive) {
          return true;
        }
        if (!item.endsAt) {
          return false;
        }
        return new Date(item.endsAt) < now;
      }),
    [items]
  );

  const openCreateFromTemplate = (template: CampaignTemplate) => {
    setCreateDraft({
      templateKey: template.key,
      type: template.type,
      isActive: true,
      startsAt: '',
      endsAt: '',
      priority: '100',
      deliveryMode: template.type === 'BIRTHDAY' || template.type === 'WINBACK' || template.type === 'WELCOME_FIRST_VISIT' ? 'AUTO' : 'MANUAL',
      maxGlobalUsage: '',
      maxPerCustomer: '',
      configInputs: buildConfigInputs(template)
    });
  };

  const handleCreateCampaign = async () => {
    if (!createDraft) {
      return;
    }
    const template = templateByKey(createDraft.templateKey);
    if (!template) {
      return;
    }

    setSavingCreate(true);
    setError(null);
    try {
      const response = await apiFetch<{ item: CampaignItem; }>('/api/admin/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: template.name,
          type: createDraft.type,
          description: null,
          isActive: true,
          priority: Number(createDraft.priority || 100),
          deliveryMode: createDraft.deliveryMode,
          maxGlobalUsage: createDraft.maxGlobalUsage ? Number(createDraft.maxGlobalUsage) : null,
          maxPerCustomer: createDraft.maxPerCustomer ? Number(createDraft.maxPerCustomer) : null,
          startsAt: toIsoFromDateOrNull(createDraft.startsAt),
          endsAt: toIsoFromDateOrNull(createDraft.endsAt),
          config: parseConfigFromInputs(template, createDraft.configInputs)
        })
      });

      setItems((prev) => [response.item, ...prev]);
      setCreateDraft(null);
      setShowTemplatePicker(false);
    } catch (err: any) {
      setError(err?.message || "Kampanya oluşturulamadı.");
    } finally {
      setSavingCreate(false);
    }
  };

  const openDetail = async (item: CampaignItem) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailMetrics(null);
    setDetailDraft(null);

    try {
      const response = await apiFetch<CampaignDetailResponse>(`/api/admin/campaigns/${item.id}`);
      const detailItem = response.item;
      const matchedTemplate = templateByType(detailItem.type);

      setDetailMetrics(response.metrics);
      setDetailDraft({
        id: detailItem.id,
        templateKey: matchedTemplate?.key || '',
        type: detailItem.type,
        isActive: detailItem.isActive,
        startsAt: toDateInput(detailItem.startsAt || null),
        endsAt: toDateInput(detailItem.endsAt || null),
        priority: String(detailItem.priority ?? 100),
        deliveryMode: detailItem.deliveryMode === 'AUTO' ? 'AUTO' : 'MANUAL',
        maxGlobalUsage: detailItem.maxGlobalUsage ? String(detailItem.maxGlobalUsage) : '',
        maxPerCustomer: detailItem.maxPerCustomer ? String(detailItem.maxPerCustomer) : '',
        configInputs: matchedTemplate ? buildConfigInputs(matchedTemplate, detailItem.config) : {}
      });
    } catch (err: any) {
      setDetailError(err?.message || "Kampanya detayları alınamadı.");
    } finally {
      setDetailLoading(false);
    }
  };

  const saveDetail = async () => {
    if (!detailDraft?.id) {
      return;
    }
    const template = templateByType(detailDraft.type);
    if (!template) {
      setDetailError('The editing field is not defined for this campaign type.');
      return;
    }

    setSavingDetail(true);
    setDetailError(null);
    try {
      const response = await apiFetch<{ item: CampaignItem; }>(`/api/admin/campaigns/${detailDraft.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          type: detailDraft.type,
          description: null,
          isActive: detailDraft.isActive,
          priority: Number(detailDraft.priority || 100),
          deliveryMode: detailDraft.deliveryMode,
          maxGlobalUsage: detailDraft.maxGlobalUsage ? Number(detailDraft.maxGlobalUsage) : null,
          maxPerCustomer: detailDraft.maxPerCustomer ? Number(detailDraft.maxPerCustomer) : null,
          startsAt: toIsoFromDateOrNull(detailDraft.startsAt),
          endsAt: toIsoFromDateOrNull(detailDraft.endsAt),
          config: parseConfigFromInputs(template, detailDraft.configInputs)
        })
      });

      setItems((prev) => prev.map((item) => item.id === response.item.id ? response.item : item));
      await openDetail(response.item);
    } catch (err: any) {
      setDetailError(err?.message || "Kampanya güncellenemedi.");
    } finally {
      setSavingDetail(false);
    }
  };

  const deleteDetail = async () => {
    if (!detailDraft?.id) {
      return;
    }

    if (!window.confirm('Bu kampanyayı silmek istediğinizden emin misiniz?')) {
      return;
    }

    setDeletingDetail(true);
    setDetailError(null);
    try {
      await apiFetch(`/api/admin/campaigns/${detailDraft.id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((item) => item.id !== detailDraft.id));
      setDetailOpen(false);
      setDetailDraft(null);
      setDetailMetrics(null);
    } catch (err: any) {
      setDetailError(err?.message || "Kampanya silinemedi.");
    } finally {
      setDeletingDetail(false);
    }
  };

  const publishDetail = async () => {
    if (!detailDraft?.id) return;
    try {
      await apiFetch<{ item: CampaignItem; }>(`/api/admin/campaigns/${detailDraft.id}/publish`, { method: 'POST' });
      await loname();
      await openDetail({ id: detailDraft.id, name: '', type: detailDraft.type, description: null, config: {}, isActive: true });
    } catch (err: any) {
      setDetailError(err?.message || "Kampanya yayınlanamadı.");
    }
  };

  const sendDetail = async () => {
    if (!detailDraft?.id) return;
    try {
      await apiFetch(`/api/admin/campaigns/${detailDraft.id}/send`, { method: 'POST' });
      setDetailError(null);
    } catch (err: any) {
      setDetailError(err?.message || "Kampanya gönderilemedi.");
    }
  };

  const renderTemplateFields = (
    template: CampaignTemplate,
    configInputs: Record<string, string>,
    onChange: (key: string, value: string) => void) =>

    <div className="space-y-3">
      {template.fields.map((field) => {
        if (field.type === 'multi-select') {
          const currentValues = (configInputs[field.key] || '').
            split(',').
            map((item) => item.trim()).
            filter(Boolean);

          return (
            <div key={field.key} className="space-y-1.5">
              <Label>{field.label}</Label>
              <div className="flex flex-wrap gap-2">
                {(field.options || []).map((option) => {
                  const isSelected = currentValues.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        const nextValues = isSelected ?
                          currentValues.filter((value) => value !== option.value) :
                          [...currentValues, option.value];
                        onChange(field.key, nextValues.join(','));
                      }}
                      className={cn(
                        'rounded-md border px-3 py-1.5 text-sm transition-colors',
                        isSelected ?
                          'border-[var(--rose-gold)] bg-[var(--rose-gold)]/10 text-foreground' :
                          'border-border text-muted-foreground'
                      )}>

                      {option.label}
                    </button>);

                })}
              </div>
            </div>);

        }

        if (field.type === 'select') {
          return (
            <div key={field.key} className="space-y-1.5">
              <Label>{field.label}</Label>
              <Select value={configInputs[field.key] || ''} onValueChange={(value) => onChange(field.key, value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {(field.options || []).map((option) =>
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>);

        }

        return (
          <div key={field.key} className="space-y-1.5">
            <Label>{field.label}</Label>
            <Input
              type="number"
              min={field.min}
              step={field.step}
              value={configInputs[field.key] || ''}
              onChange={(event) => onChange(field.key, event.target.value)} />

          </div>);

      })}
    </div>;


  return (
    <div className="h-full overflow-y-auto bg-[var(--luxury-bg)] pb-20">
      <div className="p-4 border-b border-border bg-[var(--luxury-bg)] sticky top-0 z-10">
        <h1 className="text-2xl font-semibold mb-1">Campaigns</h1>
        <p className="text-sm text-muted-foreground">Yeni bir kampanya oluştürün ve performansı detaylı takip edin.</p>
      </div>

      <div className="p-4 space-y-4">
        {error ?
          <Card className="border-red-300 bg-red-50">
            <CardContent className="p-3">
              <p className="text-sm text-red-600">{error}</p>
            </CardContent>
          </Card> :
          null}

        <Button
          className="w-full bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)] text-white"
          onClick={() => setShowTemplatePicker((prev) => !prev)}>

          {showTemplatePicker ? "Şablonları Gizle" : "Yeni Kampanya Oluştur"}
        </Button>

        {showTemplatePicker ?
          <div className="grid grid-cols-1 gap-3">
            {CAMPAIGN_TEMPLATES.map((template) => {
              const Icon = template.icon;
              return (
                <Card key={template.key} className="border border-border bg-card shnameow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[var(--rose-gold)] bg-[var(--rose-gold)]/12">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold lenameing-tight text-foreground">{template.name}</h3>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {template.bullets.map((bullet) =>
                            <span
                              key={bullet}
                              className="inline-flex rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-foreground">

                              {bullet}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button className="mt-3 w-full" variant="outline" onClick={() => openCreateFromTemplate(template)}>
                      Şablon Olarak Kaydet
                    </Button>
                  </CardContent>
                </Card>);

            })}
          </div> :
          null}

        <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase px-1">Aktif Campaigns</p>

        {loading ?
          <Card className="border border-border bg-card">
            <CardContent className="p-4 text-sm text-muted-foreground">Yükleniyor...</CardContent>
          </Card> :
          null}

        {!loading && activeItems.length === 0 ?
          <Card className="border border-dashed border-border bg-card">
            <CardContent className="p-4 text-center text-sm text-muted-foreground">Aktif campaign yok.</CardContent>
          </Card> :
          null}

        {!loading && activeItems.length > 0 ?
          <div className="space-y-2">
            {activeItems.map((item) =>
              <Card key={item.id} className="border border-border bg-card">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{displayCampaignName(item)}</p>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full border text-green-700 border-green-300 bg-green-50">
                      Aktif
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDateLabel(item.startsAt || null)} - {formatDateLabel(item.endsAt || null)}
                  </p>
                  <Button variant="outline" className="mt-2 w-full" onClick={() => void openDetail(item)}>
                    <Pencil className="w-4 h-4" />
                    Detay ve Düzenle
                  </Button>
                </CardContent>
              </Card>
            )}
          </div> :
          null}

        <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase px-1">Firstki Campaigns</p>

        {!loading && previousItems.length === 0 ?
          <Card className="border border-dashed border-border bg-card">
            <CardContent className="p-4 text-center text-sm text-muted-foreground">Firstki campaign yok.</CardContent>
          </Card> :
          null}

        {!loading && previousItems.length > 0 ?
          <div className="space-y-2">
            {previousItems.map((item) =>
              <Card key={item.id} className="border border-border bg-card">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{displayCampaignName(item)}</p>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full border text-muted-foreground border-border bg-muted/40">
                      History
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDateLabel(item.startsAt || null)} - {formatDateLabel(item.endsAt || null)}
                  </p>
                  <Button variant="outline" className="mt-2 w-full" onClick={() => void openDetail(item)}>
                    <Pencil className="w-4 h-4" />
                    Detay ve Düzenle
                  </Button>
                </CardContent>
              </Card>
            )}
          </div> :
          null}
      </div>

      <Dialog open={Boolean(createDraft)} onOpenChange={(open) => !open ? setCreateDraft(null) : null}>
        <DialogContent
          className="max-w-xl max-h-[calc(100dvh-2rem)] overflow-y-auto top-4 translate-y-0 sm:top-[50%] sm:translate-y-[-50%]"
          aria-describedby={undefined}>

          <DialogHeader>
            <DialogTitle>Şablon Ayarları</DialogTitle>
          </DialogHeader>

          {createDraft ?
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Başlangıç Tarihi</Label>
                  <Input
                    type="date"
                    value={createDraft.startsAt}
                    onChange={(event) => setCreateDraft((prev) => prev ? { ...prev, startsAt: event.target.value } : prev)} />

                </div>
                <div className="space-y-1.5">
                  <Label>End date</Label>
                  <Input
                    type="date"
                    value={createDraft.endsAt}
                    onChange={(event) => setCreateDraft((prev) => prev ? { ...prev, endsAt: event.target.value } : prev)} />

                </div>
                <div className="space-y-1.5">
                  <Label>Öncelik</Label>
                  <Input
                    type="number"
                    value={createDraft.priority}
                    onChange={(event) => setCreateDraft((prev) => prev ? { ...prev, priority: event.target.value } : prev)} />

                </div>
                <div className="space-y-1.5">
                  <Label>Teslimat Modu</Label>
                  <Select
                    value={createDraft.deliveryMode}
                    onValueChange={(value: 'AUTO' | 'MANUAL') =>
                      setCreateDraft((prev) => prev ? { ...prev, deliveryMode: value } : prev)
                    }>

                    <SelectTrigger>
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AUTO">AUTO</SelectItem>
                      <SelectItem value="MANUAL">MANUEL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Maks. Genel Kullanım</Label>
                  <Input
                    type="number"
                    value={createDraft.maxGlobalUsage}
                    onChange={(event) =>
                      setCreateDraft((prev) => prev ? { ...prev, maxGlobalUsage: event.target.value } : prev)
                    } />

                </div>
                <div className="space-y-1.5">
                  <Label>Müşteri Başına Maks.</Label>
                  <Input
                    type="number"
                    value={createDraft.maxPerCustomer}
                    onChange={(event) =>
                      setCreateDraft((prev) => prev ? { ...prev, maxPerCustomer: event.target.value } : prev)
                    } />

                </div>
              </div>

              {(() => {
                const template = templateByKey(createDraft.templateKey);
                if (!template) {
                  return null;
                }
                return renderTemplateFields(template, createDraft.configInputs, (key, value) =>
                  setCreateDraft((prev) =>
                    prev ?
                      {
                        ...prev,
                        configInputs: {
                          ...prev.configInputs,
                          [key]: value
                        }
                      } :
                      prev
                  )
                );
              })()}
            </div> :
            null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDraft(null)}>
              İptal
            </Button>
            <Button
              onClick={() => void handleCreateCampaign()}
              disabled={savingCreate}
              className="bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)] text-white">

              {savingCreate ? "Kaydediliyor..." : "Kampanya Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={(open) => !open ? setDetailOpen(false) : null}>
        <DialogContent
          className="max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto top-4 translate-y-0 sm:top-[50%] sm:translate-y-[-50%]"
          aria-describedby={undefined}>

          <DialogHeader>
            <DialogTitle>Kampanya Detayları</DialogTitle>
          </DialogHeader>

          {detailLoading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> : null}
          {detailError ? <p className="text-sm text-red-600">{detailError}</p> : null}

          {detailDraft && !detailLoading ?
            <div className="space-y-4">
              {detailMetrics ?
                <Card className="border border-border bg-card">
                  <CardContent className="p-3 space-y-3">
                    <p className="text-sm font-semibold">Performance Summary</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="rounded-md border border-border p-2">
                        <p className="text-xs text-muted-foreground">Appointment</p>
                        <p className="text-lg font-semibold">{detailMetrics.current.appointmentCount}</p>
                        <p className={cn('text-xs', getDeltaClassName(detailMetrics.deltas.appointmentPercent))}>
                          %{detailMetrics.deltas.appointmentPercent}
                        </p>
                      </div>
                      <div className="rounded-md border border-border p-2">
                        <p className="text-xs text-muted-foreground">New customer</p>
                        <p className="text-lg font-semibold">{detailMetrics.current.newCustomerCount}</p>
                        <p className={cn('text-xs', getDeltaClassName(detailMetrics.deltas.newCustomerPercent))}>
                          %{detailMetrics.deltas.newCustomerPercent}
                        </p>
                      </div>
                      <div className="rounded-md border border-border p-2">
                        <p className="text-xs text-muted-foreground">Gelir (tahmini)</p>
                        <p className="text-lg font-semibold">{formatCurrency(detailMetrics.current.revenueEstimate)}</p>
                        <p className={cn('text-xs', getDeltaClassName(detailMetrics.deltas.revenuePercent))}>
                          %{detailMetrics.deltas.revenuePercent}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Period: {formatDateLabel(detailMetrics.window.start)} - {formatDateLabel(detailMetrics.window.end)}
                    </p>
                  </CardContent>
                </Card> :
                null}

              <p className="text-sm font-medium text-foreground">
                {templateByType(detailDraft.type)?.name || detailDraft.type}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Başlangıç Tarihi</Label>
                  <Input
                    type="date"
                    value={detailDraft.startsAt}
                    onChange={(event) => setDetailDraft((prev) => prev ? { ...prev, startsAt: event.target.value } : prev)} />

                </div>
                <div className="space-y-1.5">
                  <Label>End date</Label>
                  <Input
                    type="date"
                    value={detailDraft.endsAt}
                    onChange={(event) => setDetailDraft((prev) => prev ? { ...prev, endsAt: event.target.value } : prev)} />

                </div>
                <div className="space-y-1.5">
                  <Label>Öncelik</Label>
                  <Input
                    type="number"
                    value={detailDraft.priority}
                    onChange={(event) => setDetailDraft((prev) => prev ? { ...prev, priority: event.target.value } : prev)} />

                </div>
                <div className="space-y-1.5">
                  <Label>Teslimat Modu</Label>
                  <Select
                    value={detailDraft.deliveryMode}
                    onValueChange={(value: 'AUTO' | 'MANUAL') =>
                      setDetailDraft((prev) => prev ? { ...prev, deliveryMode: value } : prev)
                    }>

                    <SelectTrigger>
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AUTO">AUTO</SelectItem>
                      <SelectItem value="MANUAL">MANUEL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Maks. Genel Kullanım</Label>
                  <Input
                    type="number"
                    value={detailDraft.maxGlobalUsage}
                    onChange={(event) =>
                      setDetailDraft((prev) => prev ? { ...prev, maxGlobalUsage: event.target.value } : prev)
                    } />

                </div>
                <div className="space-y-1.5">
                  <Label>Müşteri Başına Maks.</Label>
                  <Input
                    type="number"
                    value={detailDraft.maxPerCustomer}
                    onChange={(event) =>
                      setDetailDraft((prev) => prev ? { ...prev, maxPerCustomer: event.target.value } : prev)
                    } />

                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailDraft((prev) => prev ? { ...prev, isActive: !prev.isActive } : prev)}
                className={cn(
                  'w-full rounded-md border px-3 py-2 text-sm text-left transition-colors',
                  detailDraft.isActive ?
                    'border-[var(--rose-gold)] bg-[var(--rose-gold)]/10 text-foreground' :
                    'border-border text-muted-foreground'
                )}>

                Durum: {detailDraft.isActive ? 'Aktif' : 'Pasif'}
              </button>

              {(() => {
                const template = templateByType(detailDraft.type);
                if (!template) {
                  return (
                    <p className="text-xs text-muted-foreground">
                      Bu kampanya tipinde düzenleme yapılamaz.
                    </p>);

                }

                return renderTemplateFields(template, detailDraft.configInputs, (key, value) =>
                  setDetailDraft((prev) =>
                    prev ?
                      {
                        ...prev,
                        configInputs: {
                          ...prev.configInputs,
                          [key]: value
                        }
                      } :
                      prev
                  )
                );
              })()}
            </div> :
            null}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => void publishDetail()}
              disabled={deletingDetail || savingDetail || !detailDraft?.id}>

              Yayinla
            </Button>
            <Button
              variant="outline"
              onClick={() => void sendDetail()}
              disabled={deletingDetail || savingDetail || !detailDraft?.id}>

              Gönder
            </Button>
            <Button
              variant="destructive"
              onClick={() => void deleteDetail()}
              disabled={deletingDetail || savingDetail || !detailDraft?.id}>

              <Trash2 className="w-4 h-4" />
              {deletingDetail ? "Siliniyor..." : 'Sil'}
            </Button>
            <Button
              onClick={() => void saveDetail()}
              disabled={savingDetail || deletingDetail || !detailDraft?.id}
              className="bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)] text-white">

              {savingDetail ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}
