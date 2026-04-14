import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  History,
  MessageSquare,
  RefreshCw,
  Info,
  ChevronRight,
  ShieldCheck,
  Zap,
  TrendingDown,
  TrendingUp,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { useAuth } from '../../context/AuthContext';
import { useNavigator } from '../../context/NavigatorContext';

interface WhatsAppTemplate {
  id: number;
  eventType: string;
  templateName: string | null;
  templateContent: string | null;
  metaCategory: string | null;
  metaStatus: string | null;
  lastSyncAt: string | null;
}

interface WhatsAppTemplatesProps {
  onBack: () => void;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  CONFIRMATION: 'Randevu Onayı',
  REMINDER: 'Randevu Hatırlatma',
  CANCELLATION: 'Randevu İptali',
  SATISFACTION_SURVEY: 'Doğrulama & Diğer',
};

const CATEGORY_LABELS: Record<string, string> = {
  UTILITY: 'Maliyet: Düşük (Bilgilendirme)',
  MARKETING: 'Maliyet: Yüksek (Pazarlama)',
  AUTHENTICATION: 'Maliyet: Standart (Doğrulama)',
};

export function WhatsAppTemplates({ onBack }: WhatsAppTemplatesProps) {
  const { apiFetch } = useAuth();
  const { setHeaderTitle } = useNavigator();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHeaderTitle('Mesajlaşma Akışları');
    return () => setHeaderTitle(null);
  }, [setHeaderTitle]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<{ templates: WhatsAppTemplate[] }>('/api/app/chakra/templates');
      setTemplates(data.templates);
    } catch (err: any) {
      setError('Mesaj akışları yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const data = await apiFetch<{ templates: WhatsAppTemplate[] }>('/api/app/chakra/templates/sync', {
        method: 'POST',
      });
      setTemplates(data.templates);
    } catch (err: any) {
      setError('Senkronizasyon başarısız.');
    } finally {
      setSyncing(false);
    }
  };

  const handleAppeal = async (id: number) => {
    try {
      await apiFetch(`/api/app/chakra/templates/${id}/appeal`, { method: 'POST' });
      alert('İtiraz isteği iletildi. Meta incelemesi sonrası durum güncellenecektir.');
      void loadTemplates();
    } catch (err: any) {
      alert('İtiraz iletilemedi.');
    }
  };

  useEffect(() => {
    void loadTemplates();
  }, []);

  const getStatusDisplay = (status: string | null) => {
    const s = status?.toUpperCase();
    if (s === 'APPROVED') return { label: 'Aktif & Hazır', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle2 };
    if (s === 'PENDING' || s === 'PENDING_SUBMISSION') return { label: 'Meta İnceliyor', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: History };
    if (s === 'REJECTED') return { label: 'Düzenleme Gerekli', color: 'text-rose-500', bg: 'bg-rose-500/10', icon: AlertTriangle };
    if (s === 'APPEALED') return { label: 'İtiraz Edildi', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: ShieldCheck };
    return { label: 'Durum Bilinmiyor', color: 'text-zinc-500', bg: 'bg-zinc-500/10', icon: Info };
  };

  return (
    <div className="h-full pb-24 overflow-y-auto bg-slate-50 dark:bg-zinc-950">
      <div className="p-4 space-y-6">
        {/* --- Header Health Hero --- */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-3xl bg-[var(--deep-indigo)] p-6 text-white shadow-2xl border border-white/5"
        >
          {/* Decorative gradients */}
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-[var(--rose-gold)]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 shadow-lg">
                <Zap className="w-6 h-6 text-amber-400" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
                className="text-white/80 hover:text-white hover:bg-white/10 bg-white/5 rounded-xl border border-white/5"
              >
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Tazele
              </Button>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Akıllı Mesajlaşma</h2>
            <p className="text-white/60 text-sm mt-1 leading-relaxed">
              Meta onaylı profesyonel mesajlaşma akışlarınız otomatik olarak yönetilir.
            </p>

            <div className="mt-6 flex items-center gap-4 bg-white/5 rounded-2xl p-4 border border-white/5">
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Sağlık Durumu</p>
                <p className="text-lg font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                  %100 Güvenli
                </p>
              </div>
              <div className="h-10 w-[1px] bg-white/10" />
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Son Kontrol</p>
                <p className="text-sm font-medium text-white/80 mt-1">Az Önce</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* --- Templates List --- */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest leading-none">OTOMATİK AKIŞLAR</h3>
            {templates.length > 0 && (
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                {templates.length} AKTİF
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p className="text-sm font-medium">Akışlar yapılandırılıyor...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center rounded-2xl border border-rose-500/20 bg-rose-500/5">
              <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-3" />
              <p className="text-sm text-rose-600 font-medium">{error}</p>
              <Button variant="ghost" className="mt-4 text-xs" onClick={() => void loadTemplates()}>Tekrar Dene</Button>
            </div>
          ) : (
            <AnimatePresence>
              {templates.map((tpl, idx) => {
                const status = getStatusDisplay(tpl.metaStatus);
                const Icon = status.icon;
                const isMarketing = tpl.metaCategory === 'MARKETING';

                return (
                  <motion.div
                    key={tpl.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className="cursor-default"
                  >
                    <Card className="group relative overflow-hidden border-border/40 bg-white/70 dark:bg-zinc-900/50 backdrop-blur-md shadow-sm active:scale-[0.98] transition-all hover:shadow-md hover:border-border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${status.bg} ${status.color} border border-current/10`}>
                                {status.label}
                              </span>
                              {isMarketing && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/10 flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3" />
                                  YÜKSEK MALİYET
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-zinc-900 dark:text-white truncate">
                              {EVENT_TYPE_LABELS[tpl.eventType] || tpl.templateName || 'Bilinmeyen Akış'}
                            </h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-1 italic">
                              "{tpl.templateContent || 'İçerik hazırlanıyor...'}"
                            </p>
                          </div>
                          <div className={`shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center ${status.bg} ${status.color} shadow-inner`}>
                            <Icon className="w-5 h-5" />
                          </div>
                        </div>

                        {/* Cost Disclaimer */}
                        {isMarketing && (
                          <div className="mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-[11px] text-amber-700 dark:text-amber-400 flex gap-2">
                            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <div className="space-y-2">
                              <p>Meta bu şablonun kategorisini <strong>'Pazarlama'</strong> olarak güncelledi. Bu durum gönderim başına maliyeti artırabilir.</p>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAppeal(tpl.id)}
                                  className="h-7 text-[10px] bg-amber-100 hover:bg-amber-200 border-amber-200 text-amber-800 rounded-lg px-3 font-bold"
                                >
                                  Maliyete İtiraz Et
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open('https://business.facebook.com/wa/manage/templates/', '_blank')}
                                  className="h-7 text-[10px] text-amber-700 hover:text-amber-800 hover:bg-transparent rounded-lg font-medium p-0"
                                >
                                  Meta Yöneticisi <ExternalLink className="w-2.5 h-2.5 ml-1" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {!isMarketing && tpl.metaCategory && (
                          <div className="mt-4 flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                            <div className="flex items-center gap-1.5 text-zinc-500">
                               <TrendingDown className="w-3 h-3 text-emerald-500" />
                               {CATEGORY_LABELS[tpl.metaCategory] || tpl.metaCategory}
                            </div>
                            <span>{tpl.lastSyncAt ? new Date(tpl.lastSyncAt).toLocaleDateString('tr-TR') : ''}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* --- Help Section --- */}
        <div className="bg-white/40 dark:bg-zinc-900/30 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800">
          <h5 className="text-sm font-bold flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-indigo-500" />
            Akışlar Hakkında Bilgi
          </h5>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Mesaj akışları Kedy tarafından optimize edilmiştir. Meta'nın onay süreci genellikle 2-24 saat sürer. 
            Onaylanmayan şablonlar için sistemimiz otomatik olarak düzeltme isteği gönderir.
          </p>
        </div>
      </div>
    </div>
  );
}
