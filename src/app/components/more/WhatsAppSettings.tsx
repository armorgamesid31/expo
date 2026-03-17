import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bell, Bot, CheckCircle2, Link2, RefreshCcw, Settings2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { useAuth } from '../../context/AuthContext';

interface WhatsAppSettingsProps {
  onBack: () => void;
}

interface ChakraStatusResponse {
  connected?: boolean;
  isActive?: boolean;
  hasPlugin?: boolean;
  pluginId?: string | null;
  whatsappPhoneNumberId?: string | null;
}

export function WhatsAppSettings({ onBack }: WhatsAppSettingsProps) {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ChakraStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusRefreshing, setStatusRefreshing] = useState(false);

  const isConnected = useMemo(() => {
    if (!status) return false;
    return Boolean(status.connected) || Boolean(status.isActive);
  }, [status]);

  const loadStatus = async (refresh = false) => {
    if (refresh) {
      setStatusRefreshing(true);
    } else {
      setStatusLoading(true);
    }
    setStatusError(null);

    try {
      const response = await apiFetch<ChakraStatusResponse>(`/api/app/chakra/status?t=${Date.now()}`);
      setStatus(response);
    } catch (error: any) {
      setStatusError(error?.message || 'WhatsApp durumu alınamadı.');
    } finally {
      if (refresh) {
        setStatusRefreshing(false);
      } else {
        setStatusLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadStatus(false);
  }, []);

  const openConnectionFlow = () => {
    navigate(isConnected ? '/app/features/whatsapp-agent' : '/app/features/whatsapp-setup');
  };

  const openAgentSettings = () => {
    navigate(isConnected ? '/app/features/whatsapp-agent' : '/app/features/whatsapp-setup');
  };

  const openReminderSettings = () => {
    navigate('/app/automations?section=reminder');
  };

  return (
    <div className="h-full pb-20 overflow-y-auto">
      <div className="sticky top-0 bg-[var(--luxury-bg)] z-10 border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold">WhatsApp Ayarları</h1>
            <p className="text-sm text-muted-foreground">Bağlantı, AI ajan ve hatırlatma ayarları</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {statusError ? (
          <Card className="border-red-300 bg-red-50">
            <CardContent className="p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{statusError}</p>
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-700 flex items-center justify-center shrink-0">
                  <Link2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold leading-tight">WhatsApp Bağlantısı</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Chakra bağlantısını kurup bağlantı durumunu buradan yönetebilirsin.
                  </p>
                </div>
              </div>

              <span
                className={`text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                  isConnected ? 'bg-green-500/10 text-green-700' : 'bg-amber-500/10 text-amber-700'
                }`}
              >
                {statusLoading ? 'Kontrol ediliyor' : isConnected ? 'Bağlı' : 'Kurulum gerekli'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={openConnectionFlow}
                className="bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)] text-white"
              >
                {isConnected ? 'Bağlantıyı Yönet' : 'Bağlantıyı Başlat'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void loadStatus(true);
                }}
                disabled={statusLoading || statusRefreshing}
              >
                <RefreshCcw className={`w-4 h-4 mr-2 ${statusRefreshing ? 'animate-spin' : ''}`} />
                Yenile
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--rose-gold)]/10 text-[var(--rose-gold)] flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold leading-tight">AI WhatsApp Ajanı</p>
                <p className="text-sm text-muted-foreground mt-1">
                  SSS, konuşma tonu ve davranış kurallarını bu bölümden yönetebilirsin.
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={openAgentSettings}
              variant={isConnected ? 'default' : 'outline'}
              className={isConnected ? 'bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)] text-white' : ''}
            >
              {isConnected ? 'AI Ajan Ayarlarını Aç' : 'Önce WhatsApp Bağlantısını Tamamla'}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--deep-indigo)]/10 text-[var(--deep-indigo)] flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold leading-tight">Randevu Hatırlatma Ayarları</p>
                <p className="text-sm text-muted-foreground mt-1">
                  2 saat ve 24 saat önce gönderilen WhatsApp hatırlatma adımlarını düzenle.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-foreground">
                2 saat kala + konum
              </span>
              <span className="inline-flex rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-foreground">
                24 saat kala + katılım onayı
              </span>
            </div>

            <Button type="button" variant="outline" onClick={openReminderSettings}>
              <Settings2 className="w-4 h-4 mr-2" />
              Hatırlatma Ayarlarını Aç
            </Button>
          </CardContent>
        </Card>

        {isConnected ? (
          <Card className="border-green-300/60 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-700 mt-0.5 shrink-0" />
              <p className="text-sm text-green-800 dark:text-green-300">
                WhatsApp bağlantısı aktif. AI ajan ve hatırlatma ayarlarını güvenle güncelleyebilirsin.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
