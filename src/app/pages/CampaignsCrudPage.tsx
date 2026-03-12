import { useEffect, useMemo, useState } from 'react';
import { Award, Bell, Calendar, Clock3, Gift, Pencil, Trash2, UserPlus, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { cn } from '../components/ui/utils';

interface CampaignItem {
  id: number;
  name: string;
  type: string;
  description: string | null;
  config: unknown;
  isActive: boolean;
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

type TemplateFieldType = 'number' | 'text' | 'select';

interface TemplateField {
  key: string;
  label: string;
  type: TemplateFieldType;
  min?: number;
  step?: number;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
}

interface CampaignTemplate {
  key: string;
  name: string;
  type: string;
  description: string;
  bullets: string[];
  icon: any;
  config: Record<string, unknown>;
  fields: TemplateField[];
}

interface CampaignDraft {
  id?: number;
  templateKey: string;
  name: string;
  type: string;
  description: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  configInputs: Record<string, string>;
}

const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    key: 'loyalty',
    name: 'Sadakat Kampanyası',
    type: 'LOYALTY',
    description: 'Düzenli gelen müşterileri puanlayarak ödüllendirin.',
    bullets: ['Her ziyarette puan', 'Belirli puanda ödül', 'Tekrar randevu teşviki'],
    icon: Award,
    config: {
      pointsPerVisit: 1,
      rewardThreshold: 5,
      rewardType: 'discount_percent',
      rewardValue: 15,
    },
    fields: [
      { key: 'pointsPerVisit', label: 'Her ziyarette puan', type: 'number', min: 1, step: 1 },
      { key: 'rewardThreshold', label: 'Ödül için ziyaret sayısı', type: 'number', min: 1, step: 1 },
      {
        key: 'rewardType',
        label: 'Ödül tipi',
        type: 'select',
        options: [
          { value: 'discount_percent', label: 'Yüzde indirim' },
          { value: 'fixed_amount', label: 'Sabit tutar' },
        ],
      },
      { key: 'rewardValue', label: 'Ödül değeri', type: 'number', min: 1, step: 1 },
    ],
  },
  {
    key: 'multi-service',
    name: 'Çoklu Hizmet İndirimi',
    type: 'MULTI_SERVICE_DISCOUNT',
    description: 'Aynı randevuda birden fazla hizmet alan müşteriyi teşvik edin.',
    bullets: ['2+ hizmette indirim', 'Sepeti büyütme', 'Ortalama ciro artışı'],
    icon: Users,
    config: {
      minServiceCount: 2,
      discountPercent: 10,
      appliesTo: 'same_appointment',
    },
    fields: [
      { key: 'minServiceCount', label: 'Minimum hizmet adedi', type: 'number', min: 2, step: 1 },
      { key: 'discountPercent', label: 'İndirim oranı (%)', type: 'number', min: 1, step: 1 },
      {
        key: 'appliesTo',
        label: 'Uygulama tipi',
        type: 'select',
        options: [
          { value: 'same_appointment', label: 'Aynı randevu' },
          { value: 'same_day', label: 'Aynı gün' },
        ],
      },
    ],
  },
  {
    key: 'referral',
    name: 'Arkadaşını Getir Kampanyası',
    type: 'REFERRAL',
    description: 'Yeni müşteri kazanımı için referans ödül sistemi kurun.',
    bullets: ['Davet eden ödülü', 'Yeni gelen ödülü', 'Süre sınırı'],
    icon: UserPlus,
    config: {
      referrerRewardPercent: 10,
      referredCustomerRewardPercent: 10,
      validityDays: 30,
    },
    fields: [
      { key: 'referrerRewardPercent', label: 'Davet eden indirimi (%)', type: 'number', min: 1, step: 1 },
      { key: 'referredCustomerRewardPercent', label: 'Yeni gelen indirimi (%)', type: 'number', min: 1, step: 1 },
      { key: 'validityDays', label: 'Kullanım süresi (gün)', type: 'number', min: 1, step: 1 },
    ],
  },
  {
    key: 'birthday',
    name: 'Doğum Günü Kampanyası',
    type: 'BIRTHDAY',
    description: 'Müşterinin doğum gününde otomatik avantaj tanımlayın.',
    bullets: ['Doğum günü indirimi', 'Kısa kullanım süresi', 'Kişisel deneyim'],
    icon: Gift,
    config: {
      discountPercent: 20,
      validDaysAfterBirthday: 7,
    },
    fields: [
      { key: 'discountPercent', label: 'İndirim oranı (%)', type: 'number', min: 1, step: 1 },
      { key: 'validDaysAfterBirthday', label: 'Doğum gününden sonra geçerlilik (gün)', type: 'number', min: 1, step: 1 },
    ],
  },
  {
    key: 'winback',
    name: 'Geri Getirme Kampanyası',
    type: 'WINBACK',
    description: 'Uzun süredir gelmeyen müşterileri tekrar aktive edin.',
    bullets: ['Pasif müşteri hedefleme', 'Tek seferlik teklif', 'Geri dönüş ölçümü'],
    icon: Bell,
    config: {
      inactiveDaysThreshold: 45,
      offerType: 'discount_percent',
      offerValue: 15,
      maxUsesPerCustomer: 1,
    },
    fields: [
      { key: 'inactiveDaysThreshold', label: 'Pasiflik eşiği (gün)', type: 'number', min: 1, step: 1 },
      {
        key: 'offerType',
        label: 'Teklif tipi',
        type: 'select',
        options: [
          { value: 'discount_percent', label: 'Yüzde indirim' },
          { value: 'fixed_amount', label: 'Sabit tutar' },
        ],
      },
      { key: 'offerValue', label: 'Teklif değeri', type: 'number', min: 1, step: 1 },
      { key: 'maxUsesPerCustomer', label: 'Müşteri başı kullanım', type: 'number', min: 1, step: 1 },
    ],
  },
  {
    key: 'welcome',
    name: 'İlk Randevu Hoş Geldin',
    type: 'WELCOME_FIRST_VISIT',
    description: 'İlk kez gelen müşteri için hoş geldin avantajı sunun.',
    bullets: ['Yeni müşteri teşviki', 'İlk randevu indirimi', 'Kısa aktivasyon süresi'],
    icon: Calendar,
    config: {
      discountPercent: 15,
      validDaysFromSignup: 14,
    },
    fields: [
      { key: 'discountPercent', label: 'İndirim oranı (%)', type: 'number', min: 1, step: 1 },
      { key: 'validDaysFromSignup', label: 'Kayıttan sonra geçerlilik (gün)', type: 'number', min: 1, step: 1 },
    ],
  },
  {
    key: 'off-peak',
    name: 'Boş Saat Doldurma',
    type: 'OFF_PEAK_FILL',
    description: 'Düşük yoğunluk saatlerinde doluluğu artırın.',
    bullets: ['Saat aralığına özel', 'Hafta içi odak', 'Kapasite optimizasyonu'],
    icon: Clock3,
    config: {
      weekdays: 'MON,TUE,WED,THU',
      startHour: '12:00',
      endHour: '16:00',
      discountPercent: 15,
    },
    fields: [
      { key: 'weekdays', label: 'Günler (MON,TUE,...)', type: 'text', placeholder: 'MON,TUE,WED,THU' },
      { key: 'startHour', label: 'Başlangıç saati', type: 'text', placeholder: '12:00' },
      { key: 'endHour', label: 'Bitiş saati', type: 'text', placeholder: '16:00' },
      { key: 'discountPercent', label: 'İndirim oranı (%)', type: 'number', min: 1, step: 1 },
    ],
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toDateTimeLocal(value?: string | null): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoOrNull(value: string): string | null {
  if (!value.trim()) {
    return null;
  }
  return new Date(value).toISOString();
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
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value || 0);
}

function templateByType(type: string): CampaignTemplate | undefined {
  return CAMPAIGN_TEMPLATES.find((item) => item.type === type);
}

function templateByKey(key: string): CampaignTemplate | undefined {
  return CAMPAIGN_TEMPLATES.find((item) => item.key === key);
}

function buildConfigInputs(template: CampaignTemplate, source?: unknown): Record<string, string> {
  const config = isRecord(source) ? source : template.config;
  const inputs: Record<string, string> = {};

  template.fields.forEach((field) => {
    const value = config[field.key];
    if (value === undefined || value === null) {
      inputs[field.key] = '';
      return;
    }
    if (Array.isArray(value)) {
      inputs[field.key] = value.join(',');
      return;
    }
    inputs[field.key] = String(value);
  });

  return inputs;
}

function parseConfigFromInputs(template: CampaignTemplate, inputs: Record<string, string>): Record<string, unknown> {
  const config: Record<string, unknown> = {};

  template.fields.forEach((field) => {
    const rawValue = (inputs[field.key] || '').trim();

    if (!rawValue) {
      return;
    }

    if (field.key === 'weekdays') {
      config[field.key] = rawValue
        .split(',')
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean);
      return;
    }

    if (field.type === 'number') {
      const numeric = Number(rawValue);
      if (Number.isFinite(numeric)) {
        config[field.key] = numeric;
      }
      return;
    }

    config[field.key] = rawValue;
  });

  return config;
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

export function CampaignsCrudPage() {
  const { apiFetch } = useAuth();
  const [items, setItems] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createDraft, setCreateDraft] = useState<CampaignDraft | null>(null);
  const [savingCreate, setSavingCreate] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailMetrics, setDetailMetrics] = useState<CampaignMetrics | null>(null);
  const [detailDraft, setDetailDraft] = useState<CampaignDraft | null>(null);
  const [savingDetail, setSavingDetail] = useState(false);
  const [deletingDetail, setDeletingDetail] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<{ items: CampaignItem[] }>('/api/admin/campaigns');
      setItems(response.items || []);
    } catch (err: any) {
      setError(err?.message || 'Kampanyalar alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
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
      name: template.name,
      type: template.type,
      description: template.description,
      isActive: true,
      startsAt: '',
      endsAt: '',
      configInputs: buildConfigInputs(template),
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
      const response = await apiFetch<{ item: CampaignItem }>('/api/admin/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: createDraft.name.trim(),
          type: createDraft.type,
          description: createDraft.description.trim() || null,
          isActive: createDraft.isActive,
          startsAt: toIsoOrNull(createDraft.startsAt),
          endsAt: toIsoOrNull(createDraft.endsAt),
          config: parseConfigFromInputs(template, createDraft.configInputs),
        }),
      });

      setItems((prev) => [response.item, ...prev]);
      setCreateDraft(null);
    } catch (err: any) {
      setError(err?.message || 'Kampanya oluşturulamadı.');
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
        name: detailItem.name,
        type: detailItem.type,
        description: detailItem.description || '',
        isActive: detailItem.isActive,
        startsAt: toDateTimeLocal(detailItem.startsAt || null),
        endsAt: toDateTimeLocal(detailItem.endsAt || null),
        configInputs: matchedTemplate ? buildConfigInputs(matchedTemplate, detailItem.config) : {},
      });
    } catch (err: any) {
      setDetailError(err?.message || 'Kampanya detayı alınamadı.');
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
      setDetailError('Bu kampanya tipi düzenleme formu için henüz desteklenmiyor.');
      return;
    }

    setSavingDetail(true);
    setDetailError(null);
    try {
      const response = await apiFetch<{ item: CampaignItem }>(`/api/admin/campaigns/${detailDraft.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: detailDraft.name.trim(),
          type: detailDraft.type,
          description: detailDraft.description.trim() || null,
          isActive: detailDraft.isActive,
          startsAt: toIsoOrNull(detailDraft.startsAt),
          endsAt: toIsoOrNull(detailDraft.endsAt),
          config: parseConfigFromInputs(template, detailDraft.configInputs),
        }),
      });

      setItems((prev) => prev.map((campaign) => (campaign.id === response.item.id ? response.item : campaign)));
      await openDetail(response.item);
    } catch (err: any) {
      setDetailError(err?.message || 'Kampanya güncellenemedi.');
    } finally {
      setSavingDetail(false);
    }
  };

  const deleteDetail = async () => {
    if (!detailDraft?.id) {
      return;
    }

    const approved = window.confirm('Bu kampanyayı silmek istediğinize emin misiniz?');
    if (!approved) {
      return;
    }

    setDeletingDetail(true);
    setDetailError(null);
    try {
      await apiFetch(`/api/admin/campaigns/${detailDraft.id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((campaign) => campaign.id !== detailDraft.id));
      setDetailOpen(false);
      setDetailDraft(null);
      setDetailMetrics(null);
    } catch (err: any) {
      setDetailError(err?.message || 'Kampanya silinemedi.');
    } finally {
      setDeletingDetail(false);
    }
  };

  const renderTemplateFields = (
    template: CampaignTemplate,
    configInputs: Record<string, string>,
    onChange: (key: string, value: string) => void
  ) => {
    return (
      <div className="space-y-3">
        {template.fields.map((field) => {
          if (field.type === 'select') {
            return (
              <div key={field.key} className="space-y-1.5">
                <Label>{field.label}</Label>
                <Select value={configInputs[field.key] || ''} onValueChange={(value) => onChange(field.key, value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options || []).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }

          return (
            <div key={field.key} className="space-y-1.5">
              <Label>{field.label}</Label>
              <Input
                type={field.type === 'number' ? 'number' : 'text'}
                min={field.min}
                step={field.step}
                placeholder={field.placeholder}
                value={configInputs[field.key] || ''}
                onChange={(event) => onChange(field.key, event.target.value)}
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-[var(--luxury-bg)] pb-20">
      <div className="p-4 border-b border-border bg-[var(--luxury-bg)] sticky top-0 z-10">
        <h1 className="text-2xl font-semibold mb-1">Kampanyalar</h1>
        <p className="text-sm text-muted-foreground">Şablonlarla kampanya başlatın, detayda performansı takip edin.</p>
      </div>

      <div className="p-4 space-y-4">
        {error ? (
          <Card className="border-red-300 bg-red-50">
            <CardContent className="p-3">
              <p className="text-sm text-red-600">{error}</p>
            </CardContent>
          </Card>
        ) : null}

        <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase px-1">Hazır Kampanya Şablonları</p>

        <div className="grid grid-cols-1 gap-3">
          {CAMPAIGN_TEMPLATES.map((template) => {
            const Icon = template.icon;
            return (
              <Card key={template.key} className="border border-border bg-card shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[var(--rose-gold)] bg-[var(--rose-gold)]/12">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold leading-tight text-foreground">{template.name}</h3>
                      <p className="mt-1 text-sm leading-tight text-muted-foreground">{template.description}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {template.bullets.map((bullet) => (
                          <span
                            key={bullet}
                            className="inline-flex rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-foreground"
                          >
                            {bullet}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Button
                    className="mt-3 w-full bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)] text-white"
                    onClick={() => openCreateFromTemplate(template)}
                    disabled={savingCreate}
                  >
                    Şablonu Ayarla
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase px-1">Aktif Kampanyalar</p>
        {loading ? (
          <Card className="border border-border bg-card">
            <CardContent className="p-4 text-sm text-muted-foreground">Yükleniyor...</CardContent>
          </Card>
        ) : null}

        {!loading && activeItems.length === 0 ? (
          <Card className="border border-dashed border-border bg-card">
            <CardContent className="p-4 text-center text-sm text-muted-foreground">Aktif kampanya yok.</CardContent>
          </Card>
        ) : null}

        {!loading && activeItems.length > 0 ? (
          <div className="space-y-2">
            {activeItems.map((item) => (
              <Card key={item.id} className="border border-border bg-card">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{item.name}</p>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full border text-green-700 border-green-300 bg-green-50">
                      Aktif
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{item.description || item.type}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDateLabel(item.startsAt || null)} - {formatDateLabel(item.endsAt || null)}
                  </p>
                  <Button variant="outline" className="mt-2 w-full" onClick={() => void openDetail(item)}>
                    <Pencil className="w-4 h-4" />
                    Detay ve Düzenle
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase px-1">Önceki Kampanyalar</p>
        {!loading && previousItems.length === 0 ? (
          <Card className="border border-dashed border-border bg-card">
            <CardContent className="p-4 text-center text-sm text-muted-foreground">Önceki kampanya yok.</CardContent>
          </Card>
        ) : null}

        {!loading && previousItems.length > 0 ? (
          <div className="space-y-2">
            {previousItems.map((item) => (
              <Card key={item.id} className="border border-border bg-card">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{item.name}</p>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full border text-muted-foreground border-border bg-muted/40">
                      Geçmiş
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{item.description || item.type}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDateLabel(item.startsAt || null)} - {formatDateLabel(item.endsAt || null)}
                  </p>
                  <Button variant="outline" className="mt-2 w-full" onClick={() => void openDetail(item)}>
                    <Pencil className="w-4 h-4" />
                    Detay ve Düzenle
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
      </div>

      <Dialog open={Boolean(createDraft)} onOpenChange={(open) => (!open ? setCreateDraft(null) : null)}>
        <DialogContent
          className="max-w-xl max-h-[calc(100dvh-2rem)] overflow-y-auto top-4 translate-y-0 sm:top-[50%] sm:translate-y-[-50%]"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>Şablon Ayarları</DialogTitle>
          </DialogHeader>

          {createDraft ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Kampanya adı</Label>
                <Input
                  value={createDraft.name}
                  onChange={(event) => setCreateDraft((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Açıklama</Label>
                <Textarea
                  value={createDraft.description}
                  onChange={(event) =>
                    setCreateDraft((prev) => (prev ? { ...prev, description: event.target.value } : prev))
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Başlangıç</Label>
                  <Input
                    type="datetime-local"
                    value={createDraft.startsAt}
                    onChange={(event) =>
                      setCreateDraft((prev) => (prev ? { ...prev, startsAt: event.target.value } : prev))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Bitiş</Label>
                  <Input
                    type="datetime-local"
                    value={createDraft.endsAt}
                    onChange={(event) => setCreateDraft((prev) => (prev ? { ...prev, endsAt: event.target.value } : prev))}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCreateDraft((prev) => (prev ? { ...prev, isActive: !prev.isActive } : prev))}
                className={cn(
                  'w-full rounded-md border px-3 py-2 text-sm text-left transition-colors',
                  createDraft.isActive
                    ? 'border-[var(--rose-gold)] bg-[var(--rose-gold)]/10 text-foreground'
                    : 'border-border text-muted-foreground'
                )}
              >
                Durum: {createDraft.isActive ? 'Aktif' : 'Pasif'}
              </button>

              {(() => {
                const template = templateByKey(createDraft.templateKey);
                if (!template) {
                  return null;
                }
                return renderTemplateFields(template, createDraft.configInputs, (key, value) =>
                  setCreateDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          configInputs: {
                            ...prev.configInputs,
                            [key]: value,
                          },
                        }
                      : prev
                  )
                );
              })()}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDraft(null)}>
              İptal
            </Button>
            <Button
              onClick={() => void handleCreateCampaign()}
              disabled={savingCreate || !createDraft?.name.trim()}
              className="bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)] text-white"
            >
              {savingCreate ? 'Kaydediliyor...' : 'Kampanyayı Oluştur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={(open) => (!open ? setDetailOpen(false) : null)}>
        <DialogContent
          className="max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto top-4 translate-y-0 sm:top-[50%] sm:translate-y-[-50%]"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>Kampanya Detayı</DialogTitle>
          </DialogHeader>

          {detailLoading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> : null}
          {detailError ? <p className="text-sm text-red-600">{detailError}</p> : null}

          {detailDraft && !detailLoading ? (
            <div className="space-y-4">
              {detailMetrics ? (
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
                      Dönem: {formatDateLabel(detailMetrics.window.start)} - {formatDateLabel(detailMetrics.window.end)}
                    </p>
                  </CardContent>
                </Card>
              ) : null}

              <div className="space-y-1.5">
                <Label>Kampanya adı</Label>
                <Input
                  value={detailDraft.name}
                  onChange={(event) => setDetailDraft((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Açıklama</Label>
                <Textarea
                  value={detailDraft.description}
                  onChange={(event) => setDetailDraft((prev) => (prev ? { ...prev, description: event.target.value } : prev))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Başlangıç</Label>
                  <Input
                    type="datetime-local"
                    value={detailDraft.startsAt}
                    onChange={(event) => setDetailDraft((prev) => (prev ? { ...prev, startsAt: event.target.value } : prev))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Bitiş</Label>
                  <Input
                    type="datetime-local"
                    value={detailDraft.endsAt}
                    onChange={(event) => setDetailDraft((prev) => (prev ? { ...prev, endsAt: event.target.value } : prev))}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailDraft((prev) => (prev ? { ...prev, isActive: !prev.isActive } : prev))}
                className={cn(
                  'w-full rounded-md border px-3 py-2 text-sm text-left transition-colors',
                  detailDraft.isActive
                    ? 'border-[var(--rose-gold)] bg-[var(--rose-gold)]/10 text-foreground'
                    : 'border-border text-muted-foreground'
                )}
              >
                Durum: {detailDraft.isActive ? 'Aktif' : 'Pasif'}
              </button>

              {(() => {
                const template = templateByType(detailDraft.type);
                if (!template) {
                  return (
                    <p className="text-xs text-muted-foreground">
                      Bu kampanya tipi için yapılandırma düzenleyicisi bulunamadı.
                    </p>
                  );
                }

                return renderTemplateFields(template, detailDraft.configInputs, (key, value) =>
                  setDetailDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          configInputs: {
                            ...prev.configInputs,
                            [key]: value,
                          },
                        }
                      : prev
                  )
                );
              })()}
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={() => void deleteDetail()}
              disabled={deletingDetail || savingDetail || !detailDraft?.id}
            >
              <Trash2 className="w-4 h-4" />
              {deletingDetail ? 'Siliniyor...' : 'Sil'}
            </Button>
            <Button
              onClick={() => void saveDetail()}
              disabled={savingDetail || deletingDetail || !detailDraft?.name.trim()}
              className="bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)] text-white"
            >
              {savingDetail ? 'Kaydediliyor...' : 'Düzenlemeyi Kaydet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
