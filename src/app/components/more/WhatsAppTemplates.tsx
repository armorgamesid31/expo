import { useEffect, useState, useRef } from 'react';
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
  Terminal,
  Database,
  Globe,
  Activity,
  Server,
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

interface WhatsAppSyncStats {
  total: number;
  approved: number;
  lastSync: string;
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

export function WhatsAppTemplates({ onBack }: WhatsAppTemplatesProps) {
  const { apiFetch } = useAuth();
  const { setHeaderTitle } = useNavigator();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [stats, setStats] = useState<WhatsAppSyncStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHeaderTitle('Geliştirici Paneli: WhatsApp');
    return () => setHeaderTitle(null);
  }, [setHeaderTitle]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<{ templates: WhatsAppTemplate[] }>('/api/app/chakra/templates');
      setTemplates(data.templates);
    } catch (err: any) {
      setError('Bağlantı kurulamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError(null);
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Senkronizasyon isteği gönderildi...`]);
      
      const data = await apiFetch<{ 
        templates: WhatsAppTemplate[], 
        logs: string[],
        stats: WhatsAppSyncStats 
      }>('/api/app/chakra/templates/sync', {
        method: 'POST',
      });
      
      setTemplates(data.templates);
      setLogs(prev => [...prev, ...(data.logs || [])]);
      setStats(data.stats);
    } catch (err: any) {
      setError('Senkronizasyon sırasında bir hata oluştu.');
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] KRİTİK HATA: ${err.message}`]);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    void loadTemplates();
  }, []);

  const getStatusDisplay = (status: string | null) => {
    const s = status?.toUpperCase();
    if (s === 'APPROVED') return { label: 'Aktif', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle2 };
    if (s === 'PENDING' || s === 'PENDING_SUBMISSION') return { label: 'İnceleniyor', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: History };
    if (s === 'REJECTED') return { label: 'Hata', color: 'text-rose-500', bg: 'bg-rose-500/10', icon: AlertTriangle };
    return { label: 'Beklemede', color: 'text-zinc-500', bg: 'bg-zinc-500/10', icon: Info };
  };

  return (
    <div className="h-full pb-24 overflow-y-auto bg-slate-50 dark:bg-zinc-950">
      <div className="p-4 space-y-6">
        
        {/* --- Diagnostic Header --- */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-none shadow-sm bg-white dark:bg-zinc-900 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Bulut Servis</p>
                  <p className="text-sm font-bold text-emerald-500 flex items-center gap-1">
                    <Activity className="w-3 h-3" /> Online
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white dark:bg-zinc-900 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Veritabanı</p>
                  <p className="text-sm font-bold text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Bağlı
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* --- Main Action Card --- */}
        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           className="relative overflow-hidden rounded-3xl bg-[var(--deep-indigo)] p-6 text-white shadow-xl border border-white/5"
        >
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-4">
               <h2 className="text-xl font-bold flex items-center gap-2">
                 <Server className="w-5 h-5 text-amber-400" />
                 Sistem Durumu
               </h2>
               <Button
                variant="ghost"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
                className="text-white/80 hover:text-white hover:bg-white/10 bg-white/5 rounded-xl border border-white/10"
              >
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Hemen Tazele
              </Button>
            </div>
            
            <div className="flex gap-6 mt-6">
               <div className="flex-1">
                 <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Kayıtlı Akış</p>
                 <p className="text-2xl font-bold text-white mt-1">{templates.length}</p>
               </div>
               <div className="w-[1px] bg-white/10" />
               <div className="flex-1">
                 <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Aktif Onay</p>
                 <p className="text-2xl font-bold text-emerald-400 mt-1">{stats?.approved || 0}</p>
               </div>
               <div className="w-[1px] bg-white/10" />
               <div className="flex-1">
                 <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Son Senkron</p>
                 <p className="text-sm font-medium text-white/80 mt-2">
                   {stats?.lastSync ? new Date(stats.lastSync).toLocaleTimeString('tr-TR') : 'Hiç'}
                 </p>
               </div>
            </div>
          </div>
        </motion.div>

        {/* --- Diagnostic Logs (The Terminal) --- */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5" />
              SİSTEM GÜNLÜĞÜ (LOGS)
            </h3>
            <button 
              onClick={() => setShowTechnical(!showTechnical)}
              className="text-[10px] font-bold text-blue-500 hover:underline"
            >
              {showTechnical ? 'Sadeleştir' : 'Teknik Detay'}
            </button>
          </div>

          <Card className="border-none shadow-sm bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-3 bg-zinc-800/50 border-b border-zinc-800 flex items-center gap-2">
               <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
               <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
               <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
               <span className="text-[10px] font-mono text-zinc-500 ml-2">chakra_sync_v2.log</span>
            </div>
            <CardContent className="p-4 h-48 overflow-y-auto font-mono">
              <div className="space-y-1.5">
                {logs.length === 0 && (
                  <p className="text-zinc-600 text-xs italic">Senkronizasyon bekleniyor...</p>
                )}
                {logs.map((log, i) => {
                  const isError = log.includes('HATA') || log.includes('KRİTİK');
                  const isSuccess = log.includes('Başarıyla') || log.includes('tamamlandı');
                  
                  return (
                    <p key={i} className={`text-[11px] leading-relaxed break-all ${
                      isError ? 'text-rose-400' : isSuccess ? 'text-emerald-400' : 'text-zinc-400'
                    }`}>
                      <span className="text-zinc-600 mr-2">[{i+1}]</span>
                      {log}
                    </p>
                  );
                })}
                <div ref={logEndRef} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* --- Simplified Template Status Grid --- */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest px-1">AKIŞ DURUMLARI</h3>
          
          {loading ? (
             <div className="py-10 flex flex-col items-center justify-center opacity-50">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <p className="text-xs">Okunuyor...</p>
             </div>
          ) : templates.length === 0 ? (
            <Card className="border-dashed border-2 bg-transparent">
              <CardContent className="p-8 text-center text-zinc-400">
                <div className="mb-3 flex justify-center">
                  <AlertTriangle className="w-8 h-8 opacity-20" />
                </div>
                <p className="text-xs font-medium">Henüz hiçbir şablon tanımlanmamış.</p>
                <p className="text-[10px] mt-1">"Tazele" butonuna basarak ilk kurulumu başlatabilirsiniz.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {templates.map((tpl) => {
                const status = getStatusDisplay(tpl.metaStatus);
                const Icon = status.icon;
                
                return (
                  <div 
                    key={tpl.id}
                    className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${status.bg} ${status.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {EVENT_TYPE_LABELS[tpl.eventType] || tpl.eventType}
                        </p>
                        <p className="text-[10px] text-zinc-400 font-medium">
                          ID: {tpl.externalId?.substring(0, 8) || 'Yok'} • {tpl.metaCategory || 'Bilinmiyor'}
                        </p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-lg text-[10px] font-bold border border-current/10 ${status.bg} ${status.color}`}>
                       {status.label}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* --- Footer Info --- */}
        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex gap-3">
           <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
           <p className="text-[11px] text-amber-700 leading-relaxed italic">
             <strong>Not:</strong> Bu ekran geliştirme sürecinde sistemin doğru çalıştığını teyit etmek için tasarlanmıştır. 
             Mavi "Tazele" butonuna bastığınızda yapılan tüm işlemler yukarıdaki siyah kutuya kaydedilir.
           </p>
        </div>

      </div>
    </div>
  );
}
