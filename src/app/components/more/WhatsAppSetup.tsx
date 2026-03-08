import { useState } from 'react';
import { ArrowLeft, MessageCircle, CheckCircle2, Circle, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

interface WhatsAppSetupProps {
  onBack: () => void;
}

type SetupStep = 'business' | 'waba' | 'complete';

export function WhatsAppSetup({ onBack }: WhatsAppSetupProps) {
  const [currentStep, setCurrentStep] = useState<SetupStep>('business');
  const [isConnecting, setIsConnecting] = useState(false);
  const [businessConnected, setBusinessConnected] = useState(false);
  const [wabaConnected, setWabaConnected] = useState(false);

  const handleConnectBusiness = async () => {
    setIsConnecting(true);
    
    // Simüle edilmiş bağlantı - gerçek BSP SDK entegrasyonunda bu kısımda
    // Meta Business SDK çağrısı yapılacak
    setTimeout(() => {
      setBusinessConnected(true);
      setIsConnecting(false);
      setCurrentStep('waba');
    }, 2000);
  };

  const handleConnectWABA = async () => {
    setIsConnecting(true);
    
    // Simüle edilmiş WABA bağlantısı - gerçek BSP SDK entegrasyonunda bu kısımda
    // WhatsApp Business API bağlantısı yapılacak
    setTimeout(() => {
      setWabaConnected(true);
      setIsConnecting(false);
      setCurrentStep('complete');
    }, 2000);
  };

  const steps = [
    {
      id: 'business' as SetupStep,
      title: 'Meta Business Hesabı',
      description: 'WhatsApp Business platformuna erişmek için Meta Business hesabınızı bağlayın',
      completed: businessConnected,
      action: handleConnectBusiness,
      actionLabel: 'Business Hesabı Bağla',
    },
    {
      id: 'waba' as SetupStep,
      title: 'WhatsApp Business Hesabı',
      description: 'WhatsApp Business API (WABA) hesabınızı sisteme entegre edin',
      completed: wabaConnected,
      action: handleConnectWABA,
      actionLabel: 'WABA Hesabı Bağla',
      disabled: !businessConnected,
    },
  ];

  const allCompleted = businessConnected && wabaConnected;

  return (
    <div className="h-full pb-20 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-border bg-[var(--luxury-bg)] sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">WhatsApp Kurulumu</h1>
            <p className="text-sm text-muted-foreground">Meta Business ve WABA hesaplarını bağlayın</p>
          </div>
          {allCompleted && (
            <Badge className="bg-green-500/10 text-green-700 border-green-500/20">
              Tamamlandı
            </Badge>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Status Card */}
        <Card className="border-[#22C55E]/30 bg-gradient-to-br from-[#22C55E]/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#22C55E]/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-[#22C55E]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">AI WhatsApp Ajanı</h3>
                <p className="text-xs text-muted-foreground">Otomatik müşteri iletişimi ve randevu yönetimi</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                {businessConnected ? (
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                ) : (
                  <Circle className="w-3 h-3 text-muted-foreground" />
                )}
                <span className={businessConnected ? 'text-green-700' : 'text-muted-foreground'}>
                  Business Hesabı
                </span>
              </div>
              <span className="text-muted-foreground">•</span>
              <div className="flex items-center gap-1">
                {wabaConnected ? (
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                ) : (
                  <Circle className="w-3 h-3 text-muted-foreground" />
                )}
                <span className={wabaConnected ? 'text-green-700' : 'text-muted-foreground'}>
                  WABA Hesabı
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Alert */}
        {!allCompleted && (
          <Card className="border-[var(--rose-gold)]/30 bg-[var(--rose-gold)]/5">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-[var(--rose-gold)] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">WhatsApp Business API Kurulumu</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    WhatsApp Ajanı'nı kullanabilmek için Meta tarafından onaylı bir Business Service Provider (BSP) üzerinden bağlantı kurmanız gerekmektedir. 
                    Bu işlem birkaç dakika sürebilir.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Setup Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const isActive = currentStep === step.id;
            const isPending = !step.completed && !step.disabled;
            
            return (
              <Card
                key={step.id}
                className={`border-border/50 transition-all ${
                  isActive ? 'ring-2 ring-[var(--rose-gold)]/50' : ''
                } ${step.disabled ? 'opacity-50' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-bold shrink-0">
                      {step.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <span className="text-muted-foreground">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base mb-1">{step.title}</CardTitle>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                    {step.completed && (
                      <Badge className="bg-green-500/10 text-green-700 border-green-500/20 text-xs">
                        Bağlandı
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {!step.completed && (
                    <Button
                      onClick={step.action}
                      disabled={step.disabled || isConnecting}
                      className="w-full rounded-lg"
                      style={{
                        backgroundColor: step.disabled ? undefined : 'var(--rose-gold)',
                        color: step.disabled ? undefined : 'white',
                      }}
                      variant={step.disabled ? 'outline' : 'default'}
                    >
                      {isConnecting && isActive ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Bağlanıyor...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          {step.actionLabel}
                        </>
                      )}
                    </Button>
                  )}
                  {step.completed && (
                    <div className="text-xs text-muted-foreground bg-green-500/5 p-3 rounded-lg border border-green-500/20">
                      ✓ Hesap başarıyla bağlandı ve doğrulandı
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Completion Card */}
        {allCompleted && (
          <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-transparent">
            <CardContent className="p-5">
              <div className="text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Kurulum Tamamlandı!</h3>
                  <p className="text-sm text-muted-foreground">
                    WhatsApp Ajanı artık aktif ve müşterilerinizle iletişim kurmaya hazır
                  </p>
                </div>
                <Button
                  onClick={onBack}
                  className="w-full rounded-lg"
                  style={{ backgroundColor: 'var(--rose-gold)', color: 'white' }}
                >
                  Ana Sayfaya Dön
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Technical Info */}
        <Card className="border-border/50 bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Teknik Bilgi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="text-[var(--rose-gold)] font-bold">•</span>
              <p>BSP (Business Service Provider) üzerinden güvenli bağlantı sağlanır</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[var(--rose-gold)] font-bold">•</span>
              <p>Meta Business Manager hesabınıza erişim izni gereklidir</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[var(--rose-gold)] font-bold">•</span>
              <p>WABA hesabı Meta tarafından onaylanmış olmalıdır</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[var(--rose-gold)] font-bold">•</span>
              <p>Kurulum sonrası mesaj şablonlarınızı yönetebilirsiniz</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
