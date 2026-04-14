import { useState } from 'react';
import { 
  ArrowLeft, 
  Sparkles, 
  MessageSquare, 
  Volume2, 
  BrainCircuit, 
  Save,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { useNavigator } from '../context/NavigatorContext';
import { useEffect } from 'react';

export function AISettingsPage({ onBack }: { onBack: () => void }) {
  const [isEnabled, setIsEnabled] = useState(true);
  const [tone, setTone] = useState<'friendly' | 'professional' | 'balanced'>('friendly');
  const [success, setSuccess] = useState(false);
  const { setHeaderTitle, setHeaderActions } = useNavigator();

  const handleSave = () => {
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  useEffect(() => {
    setHeaderTitle('Yapay Zeka Ayarları');
    setHeaderActions(
      <Button 
        size="sm" 
        className="bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)] text-white gap-2 h-9 px-4 rounded-xl shadow-lg border-0"
        onClick={handleSave}
      >
        {success ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        <span>{success ? 'Kaydedildi' : 'Kaydet'}</span>
      </Button>
    );
    return () => {
      setHeaderTitle(null);
      setHeaderActions(null);
    };
  }, [setHeaderTitle, setHeaderActions, success]);

  return (
    <div className="h-full pb-20 overflow-y-auto">

      <div className="p-4 space-y-6">
        {/* Main Toggle */}
        <Card className="border-[var(--rose-gold)]/20 bg-[var(--rose-gold)]/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--rose-gold)]/20 flex items-center justify-center">
                <BrainCircuit className="w-5 h-5 text-[var(--rose-gold)]" />
              </div>
              <div>
                <Label className="text-sm font-bold">Yapay Zeka Asistanı</Label>
                <p className="text-[11px] text-muted-foreground">Tüm kanallarda otomatik yanıtları yönetir</p>
              </div>
            </div>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </CardContent>
        </Card>

        {/* Tone Selection */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Yanıt Tonu</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'friendly', label: 'Samimi', icon: MessageSquare },
              { id: 'balanced', label: 'Dengeli', icon: BrainCircuit },
              { id: 'professional', label: 'Kurumsal', icon: Volume2 }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setTone(item.id as any)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  tone === item.id 
                    ? 'border-[var(--rose-gold)] bg-[var(--rose-gold)]/10 text-[var(--rose-gold)]' 
                    : 'border-border bg-card text-muted-foreground'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-bold">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Options */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Gelişmiş Ayarlar</h3>
          <Card className="border-border/50 divide-y divide-border/50">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Randevu Yönlendirmesi</p>
                <p className="text-[11px] text-muted-foreground">Asistan müşteriyi randevuya teşvik etsin</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Emoji Kullanımı</p>
                <p className="text-[11px] text-muted-foreground">Yanıtlarda emoji kullanarak samimiyeti artırır</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">AI Bilgilendirmesi</p>
                <p className="text-[11px] text-muted-foreground">Yapay zeka olduğunu müşteriye belirtsin</p>
              </div>
              <Switch />
            </div>
          </Card>
        </div>

        <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[var(--rose-gold)]" />
            <p className="text-xs font-bold">Önemli Bilgi</p>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Burada yapacağınız değişiklikler, WhatsApp ve Instagram kanallarınızda aktif olan tüm asistanların davranışlarını anlık olarak günceller.
          </p>
        </div>
      </div>
    </div>
  );
}
