import { useEffect, useMemo, useState } from 'react';
import { Award, Bell, Calendar, Clock3, Gift, UserPlus, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { cn } from '../components/ui/utils';

interface CampaignItem {
  id: number;
  name: string;
  type: string;
  description: string | null;
  config: unknown;
  isActive: boolean;
  createdAt?: string;
}

interface CampaignTemplate {
  key: string;
  name: string;
  type: string;
  description: string;
  bullets: string[];
  icon: any;
  config: Record<string, unknown>;
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
  },
  {
    key: 'off-peak',
    name: 'Boş Saat Doldurma',
    type: 'OFF_PEAK_FILL',
    description: 'Düşük yoğunluk saatlerinde doluluğu artırın.',
    bullets: ['Saat aralığına özel', 'Hafta içi odak', 'Kapasite optimizasyonu'],
    icon: Clock3,
    config: {
      weekdays: ['MON', 'TUE', 'WED', 'THU'],
      startHour: '12:00',
      endHour: '16:00',
      discountPercent: 15,
    },
  },
];

const TYPE_LABELS: Record<string, string> = {
  LOYALTY: 'Sadakat',
  MULTI_SERVICE_DISCOUNT: 'Çoklu Hizmet',
  REFERRAL: 'Arkadaşını Getir',
  BIRTHDAY: 'Doğum Günü',
  WINBACK: 'Geri Getirme',
  WELCOME_FIRST_VISIT: 'İlk Randevu',
  OFF_PEAK_FILL: 'Boş Saat',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function numberFromConfig(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function getConfigChips(item: CampaignItem): string[] {
  const config = isRecord(item.config) ? item.config : {};
  const chips: string[] = [];

  const discount = numberFromConfig(config.discountPercent);
  if (discount !== null) {
    chips.push(`%${discount} indirim`);
  }

  const minServiceCount = numberFromConfig(config.minServiceCount);
  if (minServiceCount !== null) {
    chips.push(`${minServiceCount}+ hizmet`);
  }

  const inactiveDays = numberFromConfig(config.inactiveDaysThreshold);
  if (inactiveDays !== null) {
    chips.push(`${inactiveDays} gün pasif`);
  }

  const pointsPerVisit = numberFromConfig(config.pointsPerVisit);
  const rewardThreshold = numberFromConfig(config.rewardThreshold);
  if (pointsPerVisit !== null && rewardThreshold !== null) {
    chips.push(`${rewardThreshold} ziyarette ödül`);
  }

  const validDaysAfterBirthday = numberFromConfig(config.validDaysAfterBirthday);
  if (validDaysAfterBirthday !== null) {
    chips.push(`${validDaysAfterBirthday} gün geçerli`);
  }

  return chips.slice(0, 3);
}

export function CampaignsCrudPage() {
  const { apiFetch } = useAuth();
  const [items, setItems] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingTemplateKey, setCreatingTemplateKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const activeTypes = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.isActive) {
        set.add(item.type);
      }
    });
    return set;
  }, [items]);

  const createFromTemplate = async (template: CampaignTemplate) => {
    setCreatingTemplateKey(template.key);
    setError(null);

    try {
      const response = await apiFetch<{ item: CampaignItem }>('/api/admin/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: template.name,
          type: template.type,
          description: template.description,
          config: template.config,
          isActive: true,
        }),
      });
      setItems((prev) => [response.item, ...prev]);
    } catch (err: any) {
      setError(err?.message || 'Kampanya oluşturulamadı.');
    } finally {
      setCreatingTemplateKey(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[var(--luxury-bg)] pb-20">
      <div className="p-4 border-b border-border bg-[var(--luxury-bg)] sticky top-0 z-10">
        <h1 className="text-2xl font-semibold mb-1">Kampanyalar</h1>
        <p className="text-sm text-muted-foreground">Hazır şablonlardan kampanya başlatın.</p>
      </div>

      <div className="p-4 space-y-4">
        {error ? (
          <Card className="border-red-300 bg-red-50">
            <CardContent className="p-3">
              <p className="text-sm text-red-600">{error}</p>
            </CardContent>
          </Card>
        ) : null}

        <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase px-1">Hazır Şablonlar</p>

        <div className="grid grid-cols-1 gap-3">
          {CAMPAIGN_TEMPLATES.map((template) => {
            const Icon = template.icon;
            const hasActiveOfType = activeTypes.has(template.type);

            return (
              <Card key={template.key} className="border border-border bg-card shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[var(--rose-gold)] bg-[var(--rose-gold)]/12">
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold leading-tight text-foreground">{template.name}</h3>
                          {hasActiveOfType ? (
                            <span className="inline-flex rounded-full border border-[var(--rose-gold)]/40 bg-[var(--rose-gold)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--rose-gold)]">
                              Aktif şablon var
                            </span>
                          ) : null}
                        </div>

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
                  </div>

                  <button
                    type="button"
                    onClick={() => void createFromTemplate(template)}
                    disabled={creatingTemplateKey !== null}
                    className={cn(
                      'mt-3 w-full rounded-md px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60',
                      'bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)]'
                    )}
                  >
                    {creatingTemplateKey === template.key ? 'Ekleniyor...' : 'Bu şablonu ekle'}
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase px-1">Mevcut Kampanyalar</p>

        {loading ? (
          <Card className="border border-border bg-card">
            <CardContent className="p-4 text-sm text-muted-foreground">Yükleniyor...</CardContent>
          </Card>
        ) : null}

        {!loading && !items.length ? (
          <Card className="border border-dashed border-border bg-card">
            <CardContent className="p-4 text-center text-sm text-muted-foreground">
              Henüz kampanya yok. Yukarıdaki hazır şablonlardan birini ekleyebilirsiniz.
            </CardContent>
          </Card>
        ) : null}

        {!loading ? (
          <div className="space-y-2">
            {items.map((item) => {
              const typeLabel = TYPE_LABELS[item.type] || item.type;
              const chips = getConfigChips(item);

              return (
                <Card key={item.id} className="border border-border bg-card">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-foreground">{item.name}</p>
                      <span
                        className={cn(
                          'text-xs font-semibold px-2 py-0.5 rounded-full border',
                          item.isActive
                            ? 'text-green-700 border-green-300 bg-green-50'
                            : 'text-muted-foreground border-border bg-muted/40'
                        )}
                      >
                        {item.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-1">
                      {typeLabel}
                      {item.description ? ` • ${item.description}` : ''}
                    </p>

                    {chips.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {chips.map((chip) => (
                          <span
                            key={chip}
                            className="inline-flex rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-foreground"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
