import { useEffect, useState } from 'react';
import { Bell, BarChart3, Package, Sparkles, MessageCircle, Globe, Users, AlertTriangle, X, Briefcase, UserCog, Building2, Zap, Target, CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { useAuth } from '../../context/AuthContext';

interface MoreScreenProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onNavigate: (tab: string) => void;
}

export function MoreScreen({ isDarkMode, onToggleDarkMode, onNavigate }: MoreScreenProps) {
  const { apiFetch } = useAuth();
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [whatsappStatusLoaded, setWhatsappStatusLoaded] = useState(false);
  const [warningModal, setWarningModal] = useState<{ 
    title: string; 
    message: string; 
    actionText?: string; 
    actionTarget?: string;
    requirements?: { label: string; done: boolean }[];
  } | null>(null);

  const handleFeatureClick = (
    tab: string, 
    conditionMet: boolean, 
    warningData: { 
      title: string; 
      message: string; 
      actionText?: string; 
      actionTarget?: string;
      requirements?: { label: string; done: boolean }[];
    }
  ) => {
    if (conditionMet) {
      onNavigate(tab);
    } else {
      setWarningModal(warningData);
    }
  };

  // Yönetim Araçları — her zaman üstte
  const managementTools = [
    {
      icon: Briefcase,
      label: 'Hizmet Yönetimi',
      description: 'Hizmetler ve kategoriler',
      action: () => onNavigate('service-management'),
      color: 'var(--rose-gold)',
    },
    {
      icon: UserCog,
      label: 'Çalışan Yönetimi',
      description: 'Personel ve yetkiler',
      action: () => onNavigate('staff-management'),
      color: 'var(--deep-indigo)',
    },
    {
      icon: Building2,
      label: 'Salon Bilgileri',
      description: 'İşletme detayları ve saatler',
      action: () => onNavigate('salon-info'),
      color: 'var(--rose-gold)',
    },
    {
      icon: Users,
      label: 'Müşteri Yönetimi',
      description: 'CRM profilleri + kara liste',
      action: () => onNavigate('crm'),
      color: 'var(--rose-gold)',
    },
    {
      icon: BarChart3,
      label: 'Analitikler',
      description: 'Raporlar',
      action: () => onNavigate('analytics'),
      color: 'var(--deep-indigo)',
    },
    {
      icon: Package,
      label: 'Envanter',
      description: 'Stok takibi',
      action: () => onNavigate('inventory'),
      color: 'var(--rose-gold)',
    },
  ];

  // Gelişmiş Modüller — Altta
  const advancedModules = [
    {
      icon: MessageCircle,
      label: 'AI WhatsApp Ajanı',
      description: 'Otomatik müşteri iletişimi',
      action: () => onNavigate('whatsapp-setup'),
      color: '#22C55E',
      badge: whatsappStatusLoaded ? (whatsappConnected ? 'Bağlı' : 'Kurulum') : 'Kontrol',
      badgeColor: whatsappStatusLoaded
        ? (whatsappConnected ? 'bg-green-500/10 text-green-700' : 'bg-amber-500/10 text-amber-700')
        : 'bg-muted text-muted-foreground',
    },
    {
      icon: Globe,
      label: 'Web Sitesi Ayarları',
      description: 'Online randevu sitesi yönetimi',
      action: () => onNavigate('website-builder'),
      color: 'var(--deep-indigo)',
      badge: 'Yayında',
      badgeColor: 'bg-[var(--deep-indigo)]/10 text-[var(--deep-indigo)]',
    },
    {
      icon: Target,
      label: 'Kampanyalar',
      description: 'Sadakat ve tavsiye programları',
      action: () => onNavigate('campaigns'),
      color: 'var(--rose-gold)',
      badge: '2 aktif',
      badgeColor: 'bg-[var(--rose-gold)]/10 text-[var(--rose-gold)]',
    },
    {
      icon: Zap,
      label: 'Otomasyonlar',
      description: 'Hatırlatmalar ve bildirimler',
      action: () => onNavigate('automations'),
      color: '#8B5CF6',
      badge: '5 aktif',
      badgeColor: 'bg-purple-500/10 text-purple-700',
    },
  ];

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const status = await apiFetch<{ connected?: boolean; isActive?: boolean; hasPlugin?: boolean }>('/api/app/chakra/status');
        if (!mounted) {
          return;
        }
        setWhatsappConnected(Boolean(status?.connected) || Boolean(status?.isActive));
      } catch (error) {
        console.warn('Chakra status fetch failed in MoreScreen:', error);
        if (mounted) {
          setWhatsappConnected(false);
        }
      } finally {
        if (mounted) {
          setWhatsappStatusLoaded(true);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [apiFetch]);

  return (
    <div className="h-full pb-20 relative overflow-y-auto">
      {/* Warning Modal Overlay */}
      {warningModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
          <Card className="w-full max-w-sm border-border/50 shadow-2xl bg-[var(--deep-indigo)] text-white">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <button onClick={() => setWarningModal(null)} className="p-1 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <h3 className="text-lg font-semibold mb-2">{warningModal.title}</h3>
              <p className="text-white/70 text-sm mb-4 leading-relaxed">{warningModal.message}</p>
              
              {/* Requirements List */}
              {warningModal.requirements && warningModal.requirements.length > 0 && (
                <div className="space-y-2 mb-5">
                  {warningModal.requirements.map((req, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white/5 p-2 rounded-lg">
                      {req.done ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-white/40 shrink-0" />
                      )}
                      <span className={`text-xs ${req.done ? 'text-green-400 line-through' : 'text-white/90'}`}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 rounded-lg bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white" 
                  onClick={() => setWarningModal(null)}
                >
                  Kapat
                </Button>
                {warningModal.actionText && (
                  <Button 
                    className="flex-1 bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)] text-white rounded-lg shadow-lg border-0"
                    onClick={() => {
                      setWarningModal(null);
                      onNavigate(warningModal.actionTarget || 'dashboard');
                    }}
                  >
                    {warningModal.actionText}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="p-4 border-b border-border bg-[var(--luxury-bg)] sticky top-0 z-10">
        <h1 className="text-2xl font-semibold mb-1">Özellikler</h1>
        <p className="text-sm text-muted-foreground">Yönetim araçları ve gelişmiş modüller</p>
      </div>

      <div className="p-4 space-y-8">
        {/* Profile Card Summary */}
        <Card className="border-border/50 bg-gradient-to-br from-[var(--rose-gold)]/10 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--rose-gold)] to-[var(--rose-gold-dark)] flex items-center justify-center text-white text-xl font-bold shadow-inner">
                A
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  Salon Sahibi
                </h2>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--rose-gold)]" />
                  <span className="text-xs font-semibold text-[var(--rose-gold)]">
                    Premium Paket
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Yönetim Araçları — Üstte */}
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 px-1">Yönetim Araçları</h3>
          <div className="grid grid-cols-2 gap-3">
            {managementTools.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Card
                  key={idx}
                  className="border-border/50 cursor-pointer hover:border-[var(--rose-gold)]/50 transition-all active:scale-98 shadow-sm"
                  onClick={item.action}
                >
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${item.color}15` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: item.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm leading-tight mb-0.5">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight line-clamp-1">{item.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Gelişmiş Modüller — Altta */}
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 px-1">Gelişmiş Modüller</h3>
          <div className="grid grid-cols-2 gap-3">
            {advancedModules.map((mod, idx) => {
              const Icon = mod.icon;
              return (
                <Card
                  key={idx}
                  className="border-border/50 cursor-pointer hover:border-[var(--rose-gold)]/40 transition-all active:scale-[0.98] overflow-hidden group shadow-sm"
                  onClick={mod.action}
                >
                  <CardContent className="p-4 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
                        style={{ backgroundColor: `${mod.color}15` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: mod.color }} />
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${mod.badgeColor}`}>
                        {mod.badge}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm mb-1 leading-tight">{mod.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{mod.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="text-center text-[10px] text-muted-foreground pt-4 opacity-60">
          <p>Salon OS Enterprise — v3.2.0</p>
        </div>
      </div>
    </div>
  );
}
