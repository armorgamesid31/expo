import { useState } from 'react';
import { BarChart3, AlertTriangle, X, UserCog, CheckCircle2, Circle, Layers, Megaphone, Settings, Building2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { useNavigator } from '../../context/NavigatorContext';

interface MoreScreenProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onNavigate: (tab: string) => void;
  onOpenSettings?: () => void;
  isFeatureVisible?: (featureKey: string) => boolean;
}

export function MoreScreen({ isDarkMode, onToggleDarkMode, onNavigate, onOpenSettings, isFeatureVisible }: MoreScreenProps) {
  const { isBackAction } = useNavigator();
  const [warningModal, setWarningModal] = useState<{
    title: string;
    message: string;
    actionText?: string;
    actionTarget?: string;
    requirements?: { label: string; done: boolean; }[];
  } | null>(null);

  const managementTools = [
    {
      icon: Settings,
      label: "Ayarlar",
      action: () => {
        if (onOpenSettings) {
          onOpenSettings();
          return;
        }
        onNavigate('settings');
      },
      color: 'var(--rose-gold)'
    },
    {
      icon: Building2,
      label: "Salon Bilgileri",
      action: () => onNavigate('salon-info'),
      color: 'var(--rose-gold)'
    },
    {
      featureKey: 'operations.management',
      icon: Layers,
      label: 'Operasyon Yönetimi',
      action: () => onNavigate('operations-management'),
      color: 'var(--deep-indigo)'
    },
    {
      featureKey: 'team.management',
      icon: UserCog,
      label: "Ekip Yönetimi",
      action: () => onNavigate('team-management'),
      color: 'var(--deep-indigo)'
    },
    {
      featureKey: 'brand.growth.hub',
      icon: Megaphone,
      label: 'Marka & Büyüme',
      action: () => onNavigate('brand-growth-hub'),
      color: 'var(--rose-gold)'
    },
    {
      featureKey: 'analytics.view',
      icon: BarChart3,
      label: "Analitik",
      action: () => onNavigate('analytics'),
      color: 'var(--deep-indigo)'
    }
  ];

  return (
    <div className="h-full pb-20 relative overflow-y-auto">
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

              {warningModal.requirements && warningModal.requirements.length > 0 && (
                <div className="space-y-2 mb-5">
                  {warningModal.requirements.map((req, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white/5 p-2 rounded-lg">
                      {req.done ?
                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" /> :
                        <Circle className="w-4 h-4 text-white/40 shrink-0" />
                      }
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
                  onClick={() => setWarningModal(null)}>
                  Kapat
                </Button>
                {warningModal.actionText && (
                  <Button
                    className="flex-1 bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)] text-white rounded-lg shadow-lg border-0"
                    onClick={() => {
                      setWarningModal(null);
                      onNavigate(warningModal.actionTarget || 'dashboard');
                    }}>
                    {warningModal.actionText}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="p-4 space-y-6">
        <div>
          <div className="grid grid-cols-2 gap-3">
            {managementTools
              .filter((item) => (isFeatureVisible ? isFeatureVisible((item as any).featureKey || "") : true))
              .map((item, idx) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={idx}
                    initial={isBackAction ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: isBackAction ? 0 : 0.04 * idx,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    onClick={item.action}
                    className="group relative flex flex-col items-center justify-center p-4 rounded-2xl border border-border/50 bg-card hover:bg-muted/30 transition-all active:scale-[0.97] shadow-sm h-28 text-center"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110 duration-300"
                      style={{ backgroundColor: `${item.color}15` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: item.color }} />
                    </div>
                    <p className="font-bold text-[13px] leading-tight text-foreground">{item.label}</p>
                  </motion.button>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
