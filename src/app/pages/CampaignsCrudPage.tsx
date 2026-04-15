import { useState, useEffect, useMemo } from 'react';
import { Skeleton } from '../components/ui/skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Award, Bell, Calendar, Clock3, Gift, Pencil, Trash2, UserPlus, Users, Sparkles, History, Info, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { cn } from '../components/ui/utils';
import { useNavigator } from '../context/NavigatorContext';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '../components/ui/accordion';
import { Plus } from 'lucide-react';

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
  { value: 'WED', label: 'Çar' },
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
    bullets: ['Puan sistemi', 'Yeniden randevu teşviki'],
    icon: Award,
    config: {
      pointsPerVisit: 1,
      rewardThreshold: 5,
      rewardType: 'discount_percent',
      rewardValue: 15
    },
    fields: [
      { key: 'pointsPerVisit', label: 'Her ziyarette kaç damga verilsin?', type: 'number', valueKind: 'number', min: 1, step: 1 },
      { key: 'rewardThreshold', label: 'Hangi ziyarette ödül kazanılsın?', type: 'number', valueKind: 'number', min: 1, step: 1 },
      {
        key: 'rewardType',
        label: 'Kazanılacak Ödül Nedir?',
        type: 'select',
        valueKind: 'string',
        options: [
          { value: 'discount_percent', label: 'Yüzde İndirim' },
          { value: 'fixed_amount', label: 'Sabit Tutar' },
          { value: 'free_service', label: 'Ücretsiz Hizmet' }
        ]
      },
      { key: 'rewardValue', label: 'Ödül Değeri (İndirim Miktarı)', type: 'number', valueKind: 'number', min: 1, step: 1 }
    ]
  },
  {
    key: 'multi-service',
    name: "Çoklu Hizmet İndirimi",
    type: 'MULTI_SERVICE_DISCOUNT',
    bullets: ['2+ hizmette kampanya', 'Sepeti büyüt'],
    icon: Users,
    config: {
      minServiceCount: 2,
      discountType: 'discount_percent',
      discountValue: 10,
      appliesTo: 'same_appointment'
    },
    fields: [
      { key: 'minServiceCount', label: 'Minimum Hizmet Sayısı', type: 'number', valueKind: 'number', min: 2, step: 1 },
      {
        key: 'discountType',
        label: 'İndirim Tipi',
        type: 'select',
        valueKind: 'string',
        options: [
          { value: 'discount_percent', label: 'Yüzde İndirim' },
          { value: 'fixed_amount', label: 'Sabit Tutar' },
          { value: 'free_service', label: 'Ücretsiz Hizmet' }
        ]
      },
      { key: 'discountValue', label: 'İndirim Değeri', type: 'number', valueKind: 'number', min: 1, step: 1 },
      {
        key: 'appliesTo',
        label: 'Uygulama Tipi',
        type: 'select',
        valueKind: 'string',
        options: [
          { value: 'same_appointment', label: 'Aynı Randevu' },
          { value: 'same_day', label: 'Aynı Gün' }
        ]
      }
    ]
  },
  {
    key: 'referral',
    name: "Arkadaşını Getir Kampanyası",
    type: 'REFERRAL',
    bullets: ['Sabit/Yüzde ödül', 'İlk randevu tetikleme kuralı'],
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
        label: 'İndirim Tipi',
        type: 'select',
        valueKind: 'string',
        options: [
          { value: 'discount_percent', label: 'Yüzde İndirim' },
          { value: 'fixed_amount', label: 'Sabit Tutar' },
          { value: 'free_service', label: 'Ücretsiz Hizmet' }
        ]
      },
      {
        key: 'referrerRewardValue',
        label: 'Davet Eden Ödülü',
        type: 'number',
        valueKind: 'number',
        min: 1,
        step: 1
      },
      {
        key: 'referredCustomerRewardValue',
        label: 'Yeni Gelen Ödülü',
        type: 'number',
        valueKind: 'number',
        min: 1,
        step: 1
      },
      {
        key: 'activationTiming',
        label: 'Ne Zaman Aktif Edilmeli?',
        type: 'select',
        valueKind: 'string',
        options: [
          { value: 'first_appointment', label: 'İlk Randevuda Geçerli' },
          { value: 'after_first_completed', label: "İlk Randevu Tamamlandıktan Sonra" }
        ]
      },
      {
        key: 'combineWithWelcomeCampaign',
        label: 'Hoş Geldin Kampanyasıyla Birleştirilsin mi?',
        type: 'select',
        valueKind: 'boolean',
        options: [
          { value: 'false', label: 'Hayır' },
          { value: 'true', label: 'Evet' }
        ]
      }
    ]
  },
  {
    key: 'birthday',
    name: "Doğum Günü Kampanyası",
    type: 'BIRTHDAY',
    bullets: ['Sabit/Yüzde indirim', 'Kısa kullanım süresi'],
    icon: Gift,
    config: {
      discountType: 'discount_percent',
      discountValue: 20,
      validDaysAfterBirthday: 7
    },
    fields: [
      {
        key: 'discountType',
        label: 'İndirim Tipi',
        type: 'select',
        valueKind: 'string',
        options: [
          { value: 'discount_percent', label: 'Yüzde İndirim' },
          { value: 'fixed_amount', label: 'Sabit Tutar' },
          { value: 'free_service', label: 'Ücretsiz Hizmet' }
        ]
      },
      { key: 'discountValue', label: 'İndirim Değeri', type: 'number', valueKind: 'number', min: 1, step: 1 },
      {
        key: 'validityWindow',
        label: 'Geçerlilik Süresi (Gün)',
        type: 'number',
        valueKind: 'number',
        min: 1,
        step: 1
      }
    ]
  },
  {
    key: 'winback',
    name: "Geri Kazanım Kampanyası",
    type: 'WINBACK',
    bullets: ['30-60 gün pasif müşteri hedefi', 'Tek seferlik teklif'],
    icon: Bell,
    config: {
      inactiveDaysThreshold: 30,
      offerType: 'discount_percent',
      offerValue: 15
    },
    fields: [
      {
        key: 'inactiveDaysThreshold',
        label: 'Pasiflik Eşiği',
        type: 'select',
        valueKind: 'number',
        options: [
          { value: '30', label: '30 Gün' },
          { value: '45', label: '45 Gün' },
          { value: '60', label: '60 Gün' }
        ]
      },
      {
        key: 'offerType',
        label: 'Teklif Tipi',
        type: 'select',
        valueKind: 'string',
        options: [
          { value: 'discount_percent', label: 'Yüzde İndirim' },
          { value: 'fixed_amount', label: 'Sabit Tutar' },
          { value: 'free_service', label: 'Ücretsiz Hizmet' }
        ]
      },
      { key: 'offerValue', label: 'Teklif Değeri', type: 'number', valueKind: 'number', min: 1, step: 1 }
    ]
  },
  {
    key: 'welcome',
    name: 'İlk Randevuya Hoş Geldin',
    type: 'WELCOME_FIRST_VISIT',
    bullets: ['Sabit/Yüzde indirim', 'Arkadaşını getir ile kullanın'],
    icon: Calendar,
    config: {
      discountType: 'discount_percent',
      discountValue: 15,
      combineWithReferralCampaign: false
    },
    fields: [
      {
        key: 'discountType',
        label: 'İndirim Tipi',
        type: 'select',
        valueKind: 'string',
        options: [
          { value: 'discount_percent', label: 'Yüzde İndirim' },
          { value: 'fixed_amount', label: 'Sabit Tutar' },
          { value: 'free_service', label: 'Ücretsiz Hizmet' }
        ]
      },
      { key: 'discountValue', label: 'İndirim Değeri', type: 'number', valueKind: 'number', min: 1, step: 1 },
      {
        key: 'combineWithReferralCampaign',
        label: 'Arkadaşını Getir ile Birleşsin mi?',
        type: 'select',
        valueKind: 'boolean',
        options: [
          { value: 'false', label: 'Hayır' },
          { value: 'true', label: 'Evet' }
        ]
      }
    ]
  },
  {
    key: 'off-peak',
    name: 'Boş Saatleri Doldurma',
    type: 'OFF_PEAK_FILL',
    bullets: ['Gün seçimi', 'Saat seçimi', 'Sabit/Yüzde indirim'],
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
        label: 'Geçerli Günler',
        type: 'multi-select',
        valueKind: 'stringArray',
        options: WEEKDAY_OPTIONS
      },
      {
        key: 'startHour',
        label: 'Başlangıç Saati',
        type: 'select',
        valueKind: 'string',
        options: TIME_OPTIONS
      },
      {
        key: 'endHour',
        label: 'Bitiş Saati',
        type: 'select',
        valueKind: 'string',
        options: TIME_OPTIONS
      },
      {
        key: 'discountType',
        label: 'İndirim Tipi',
        type: 'select',
        valueKind: 'string',
        options: [
          { value: 'discount_percent', label: 'Yüzde İndirim' },
          { value: 'fixed_amount', label: 'Sabit Tutar' },
          { value: 'free_service', label: 'Ücretsiz Hizmet' }
        ]
      },
      { key: 'discountValue', label: 'İndirim Değeri', type: 'number', valueKind: 'number', min: 1, step: 1 }
    ]
  }
];


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
  const { setHeaderTitle, setHeaderActions } = useNavigator();

  const [items, setItems] = useState<CampaignItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
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

  const fetchCampaigns = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<{ items: CampaignItem[]; }>('/api/admin/campaigns');
      setItems(response.items || []);
    } catch (err: any) {
      setError(err?.message || 'Kampanyalar alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await apiFetch<{ items: ServiceItem[]; }>('/api/admin/services');
      setServices(response.items || []);
    } catch (err) {
      console.error('Services fetch error:', err);
    }
  };

  useEffect(() => {
    setHeaderTitle('Kampanyalar');
    setHeaderActions(
      <button
        type="button"
        onClick={() => setShowTemplatePicker((prev) => !prev)}
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
    void fetchCampaigns();
    void fetchServices();
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
      setDetailError('Bu kampanya türü için düzenleme alanı tanımlanmamış.');
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
    <div className="space-y-4">
      {template.fields.map((field) => {
        if (field.type === 'multi-select') {
          const currentValues = (configInputs[field.key] || '').
            split(',').
            map((item) => item.trim()).
            filter(Boolean);

          return (
            <div key={field.key} className="space-y-2">
              <Label className="text-sm font-medium">{field.label}</Label>
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
                        'rounded-xl border px-3 py-2 text-xs font-semibold transition-all shadow-sm',
                        isSelected ?
                          'border-[var(--rose-gold)] bg-[var(--rose-gold)] text-white' :
                          'border-border bg-card text-muted-foreground hover:bg-muted'
                      )}>

                      {option.label}
                    </button>);

                })}
              </div>
            </div>);

        }

        if (field.type === 'select') {
          return (
            <div key={field.key} className="space-y-2">
              <Label className="text-sm font-medium">{field.label}</Label>
              <Select value={configInputs[field.key] || ''} onValueChange={(value) => onChange(field.key, value)}>
                <SelectTrigger className="rounded-xl border-border bg-card">
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
          <div key={field.key} className="space-y-2">
            <Label className="text-sm font-medium">{field.label}</Label>
            <Input
              type="number"
              className="rounded-xl border-border bg-card"
              min={field.min}
              step={field.step}
              value={configInputs[field.key] || ''}
              onChange={(event) => onChange(field.key, event.target.value)} />

          </div>);

      })}

      {/* Dynamic Free Service Selector */}
      {configInputs.rewardType === 'free_service' || configInputs.offerType === 'free_service' || configInputs.discountType === 'free_service' ? (
        <div className="space-y-2 pt-2 border-t border-dashed border-border">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-bold text-[var(--rose-gold)]">Ücretsiz Verilecek Hizmet</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>Müşteriye hediye edilecek hizmeti seçin.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select 
            value={configInputs.rewardServiceId || ''} 
            onValueChange={(value) => onChange('rewardServiceId', value)}
          >
            <SelectTrigger className="rounded-xl border-[var(--rose-gold)]/30 bg-[var(--rose-gold)]/5">
              <SelectValue placeholder="Hizmet Seçin" />
            </SelectTrigger>
            <SelectContent>
              {services.map((service) => (
                <SelectItem key={service.id} value={String(service.id)}>
                  {service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>;


  return (
    <div className="h-full overflow-y-auto bg-background pb-20">


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

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <Card key={i} className="border border-border bg-card">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : activeItems.length === 0 ? (
          <EmptyState 
            icon={Sparkles}
            title="Aktif Kampanya Yok"
            description="Şu an aktif bir kampanya bulunmuyor. Yeni bir tane oluşturarak satışlarınızı artırabilirsiniz."
          />
        ) : (
          <div className="space-y-2">
            {activeItems.map((item) => (
              <Card key={item.id} className="border border-border bg-card hover:shadow-sm transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{displayCampaignName(item)}</p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-3.5 h-3.5 text-muted-foreground/60" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Bu kampanya {item.type} türündedir.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border text-[var(--luxury-emerald)] border-[var(--luxury-emerald-light)]/20 bg-[var(--luxury-emerald-light)]/5 cursor-help whitespace-nowrap">
                            Aktif
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Kampanya şu an aktif ve yayında.</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {formatDateLabel(item.startsAt || null)} - {formatDateLabel(item.endsAt || null)}
                  </p>
                  <Button variant="outline" size="sm" className="mt-2 w-full text-xs h-9 rounded-xl border-[var(--rose-gold)]/20 text-[var(--rose-gold)] hover:bg-[var(--rose-gold)]/5" onClick={() => void openDetail(item)}>
                    <Pencil className="w-3.5 h-3.5 mr-2" />
                    Kampanyayı Yönet
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="pt-4 pb-2">
          <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase px-1">Önceki Kampanyalar</p>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1].map(i => (
              <Card key={i} className="border border-border bg-card opacity-60">
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : previousItems.length === 0 ? (
          <EmptyState 
            icon={History}
            title="Geçmiş Kaydı Yok"
            description="Tamamlanmış bir kampanya geçmişi henüz bulunmuyor."
            className="py-6"
          />
        ) : (
          <div className="space-y-2">
            {previousItems.map((item) => (
              <Card key={item.id} className="border border-border bg-card opacity-80">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground text-sm">{displayCampaignName(item)}</p>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border text-muted-foreground border-border bg-muted/40">
                      Geçmiş
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {formatDateLabel(item.startsAt || null)} - {formatDateLabel(item.endsAt || null)}
                  </p>
                  <Button variant="outline" size="sm" className="mt-2 w-full text-xs h-9" onClick={() => void openDetail(item)}>
                    <Pencil className="w-3.5 h-3.5 mr-2" />
                    Detay ve Düzenle
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
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
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="advanced" className="border-none">
                  <AccordionTrigger className="text-xs font-semibold text-muted-foreground hover:no-underline py-2">
                    Gelişmiş Ayarlar (Tarih, Limitler vb.)
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label>Başlangıç Tarihi</Label>
                        <Input
                          type="date"
                          value={createDraft.startsAt}
                          onChange={(event) => setCreateDraft((prev) => prev ? { ...prev, startsAt: event.target.value } : prev)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Bitiş Tarihi</Label>
                        <Input
                          type="date"
                          value={createDraft.endsAt}
                          onChange={(event) => setCreateDraft((prev) => prev ? { ...prev, endsAt: event.target.value } : prev)} />
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
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

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
                    <p className="text-sm font-semibold">Performans Özeti</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="rounded-md border border-border p-2">
                        <p className="text-xs text-muted-foreground">Randevu</p>
                        <p className="text-lg font-semibold">{detailMetrics.current.appointmentCount}</p>
                        <p className={cn('text-xs', getDeltaClassName(detailMetrics.deltas.appointmentPercent))}>
                          %{detailMetrics.deltas.appointmentPercent}
                        </p>
                      </div>
                      <div className="rounded-md border border-border p-2">
                        <p className="text-xs text-muted-foreground">Yeni müşteri</p>
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
                  <Label>Bitiş Tarihi</Label>
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

              Yayınla
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
