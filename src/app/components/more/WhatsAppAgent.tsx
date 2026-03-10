import { useEffect, useState } from 'react';
import { ArrowLeft, MessageCircle, Bot, Zap, TrendingUp, CheckCircle2, XCircle, ChevronRight, CircleHelp, Plus, Pencil, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';

interface WhatsAppAgentProps {
  onBack: () => void;
}

const conversations = [
  {
    id: 1,
    name: 'Ayşe Yılmaz',
    message: 'Cumartesi için randevu alabilirim mi?',
    time: '14:23',
    resolved: true,
    converted: true,
  },
  {
    id: 2,
    name: 'Elif Demir',
    message: 'Manikür fiyatlarınız nedir?',
    time: '13:45',
    resolved: true,
    converted: false,
  },
  {
    id: 3,
    name: 'Zeynep Kaya',
    message: 'Perşembe randevumu iptal etmek istiyorum',
    time: '12:10',
    resolved: true,
    converted: false,
  },
  {
    id: 4,
    name: 'Merve Şahin',
    message: 'Saç boyama ne kadar sürer?',
    time: '11:30',
    resolved: false,
    converted: false,
  },
];

const salonFaqQuestions = [
  { id: 'faq-working-hours', question: 'Çalışma saatleriniz ve uygun günleriniz nedir?' },
  { id: 'faq-cancellation', question: 'İptal ve değişiklik politikanız nedir?' },
  { id: 'faq-payment', question: 'Hangi ödeme yöntemlerini kabul ediyorsunuz?' },
  { id: 'faq-late-policy', question: 'Geç kalınan randevularda politikanız nedir?' },
  { id: 'faq-first-visit', question: 'İlk ziyaret müşterileri için özel bilgilendirme var mı?' },
  { id: 'faq-whatsapp-response', question: 'Müşteriler mesajlara ortalama ne kadar sürede yanıt alır?' },
];

export function WhatsAppAgent({ onBack }: WhatsAppAgentProps) {
  const navigate = useNavigate();
  const { apiFetch } = useAuth();
  const [agentActive, setAgentActive] = useState(true);
  const [isFaqExpanded, setIsFaqExpanded] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [tone, setTone] = useState<'friendly' | 'professional' | 'balanced'>('balanced');
  const [answerLength, setAnswerLength] = useState<'short' | 'medium' | 'detailed'>('medium');
  const [emojiUsage, setEmojiUsage] = useState<'off' | 'low' | 'normal'>('low');
  const [bookingGuidance, setBookingGuidance] = useState<'low' | 'medium' | 'high'>('medium');
  const [handoverThreshold, setHandoverThreshold] = useState<'early' | 'balanced' | 'late'>('balanced');
  const [salonFaqAnswers, setSalonFaqAnswers] = useState<Record<string, string>>({
    'faq-working-hours': 'Hafta içi 09:00-20:00, Cumartesi 10:00-18:00, Pazar kapalıyız.',
    'faq-cancellation': 'Randevu saatinden en az 4 saat önce ücretsiz iptal/değişiklik yapabilirsiniz.',
    'faq-payment': 'Nakit, kredi kartı ve havale ile ödeme kabul ediyoruz.',
    'faq-late-policy': '15 dakikadan fazla gecikmede slot uygunluğuna göre yeni saat önerilir.',
    'faq-first-visit': 'İlk ziyarette kısa bir ihtiyaç analizi yapıyoruz ve önerilen paketleri sunuyoruz.',
    'faq-whatsapp-response': 'Çalışma saatlerinde ortalama 5-10 dakika içinde geri dönüş sağlıyoruz.',
  });

  const conversionRate = 68;
  const totalConversations = 47;
  const resolvedByBot = 39;
  const toneExamples: Record<typeof tone, string> = {
    friendly: '"Merhaba, size hemen yardımcı olayım. Uygun bir saat bulalım mi?"',
    professional: '"Talebinizi aldım. Uygun zaman aralığını kontrol ederek net bir öneri paylaşabilirim."',
    balanced: '"Müsait saatleri kontrol edip size en uygun randevu seçeneğini hemen iletebilirim."',
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await apiFetch<{
          settings?: {
            tone?: 'friendly' | 'professional' | 'balanced';
            answerLength?: 'short' | 'medium' | 'detailed';
            emojiUsage?: 'off' | 'low' | 'normal';
            bookingGuidance?: 'low' | 'medium' | 'high';
            handoverThreshold?: 'early' | 'balanced' | 'late';
            faqAnswers?: Record<string, string>;
          };
        }>('/api/admin/whatsapp-agent/settings');

        if (!active || !response?.settings) return;
        if (response.settings.tone) setTone(response.settings.tone);
        if (response.settings.answerLength) setAnswerLength(response.settings.answerLength);
        if (response.settings.emojiUsage) setEmojiUsage(response.settings.emojiUsage);
        if (response.settings.bookingGuidance) setBookingGuidance(response.settings.bookingGuidance);
        if (response.settings.handoverThreshold) setHandoverThreshold(response.settings.handoverThreshold);
        if (response.settings.faqAnswers) {
          setSalonFaqAnswers((prev) => ({ ...prev, ...response.settings.faqAnswers }));
        }
      } catch (error) {
        console.error('WhatsApp agent settings load failed:', error);
      }
    })();
    return () => {
      active = false;
    };
  }, [apiFetch]);

  async function saveSettings() {
    setIsSaving(true);
    try {
      await apiFetch('/api/admin/whatsapp-agent/settings', {
        method: 'PUT',
        body: JSON.stringify({
          tone,
          answerLength,
          emojiUsage,
          bookingGuidance,
          handoverThreshold,
          faqAnswers: salonFaqAnswers,
        }),
      });
      setEditingQuestionId(null);
    } catch (error) {
      console.error('WhatsApp agent settings save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="h-full pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-background z-10 border-b border-border p-4">
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground mb-3 active:opacity-70">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Geri</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">AI WhatsApp Ajanı</h1>
              <p className="text-xs text-muted-foreground">Otomatik müşteri iletişimi</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/app/features/whatsapp-agent-faq')}
              className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground active:opacity-70 mt-0.5"
              aria-label="AI agent standart SSS ekranını aç"
            >
              <CircleHelp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Agent Status */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className={`border-2 transition-all ${agentActive ? 'border-green-500/30 bg-green-500/5' : 'border-border/50'}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${agentActive ? 'bg-green-500' : 'bg-muted'}`}>
                    <Bot className={`w-6 h-6 ${agentActive ? 'text-white' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="font-semibold">Ajan Durumu</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={`w-2 h-2 rounded-full ${agentActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                      <span className={`text-sm ${agentActive ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {agentActive ? 'Aktif — Mesajları yanıtlıyor' : 'Pasif'}
                      </span>
                    </div>
                  </div>
                </div>
                <Switch checked={agentActive} onCheckedChange={setAgentActive} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Conversation Insights */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
          <h2 className="font-semibold mb-3 px-1">Konuşma Analizi</h2>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <Card className="border-border/50">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-[var(--rose-gold)]">{totalConversations}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Bu Hafta</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-green-600">%{conversionRate}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Dönüşüm</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-[var(--deep-indigo)]">{resolvedByBot}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Bot Çözdü</p>
              </CardContent>
            </Card>
          </div>

          {/* Conversion Bar */}
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[var(--rose-gold)]" />
                  Randevu Dönüşüm Oranı
                </span>
                <span className="text-sm font-bold text-[var(--rose-gold)]">%{conversionRate}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[var(--rose-gold)] to-green-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${conversionRate}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">{totalConversations} konuşmadan {Math.round(totalConversations * conversionRate / 100)} randevu oluşturuldu</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Conversations */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
          <h2 className="font-semibold mb-3 px-1">Son Konuşmalar</h2>
          <div className="space-y-2">
            {conversations.map((conv) => (
              <Card key={conv.id} className="border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[var(--rose-gold)]/10 flex items-center justify-center text-sm font-semibold text-[var(--rose-gold)] shrink-0">
                      {conv.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{conv.name}</p>
                        {conv.converted && (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-700 text-[10px] py-0 h-4">Randevu</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{conv.message}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] text-muted-foreground">{conv.time}</span>
                      {conv.resolved ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Salon FAQ Management */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="font-semibold">Salon SSS ve Ajan Ayarları</h2>
            <Button type="button" className="h-8 px-3 text-xs" onClick={saveSettings} disabled={isSaving}>
              {isSaving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
            </Button>
          </div>
          <Card className="border-border/50">
            <CardContent className="p-4 space-y-4">
              <Card className="border-border/50">
                <CardContent className="p-3">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between text-left"
                    onClick={() => setIsFaqExpanded((prev) => !prev)}
                  >
                    <div>
                      <p className="text-sm font-semibold">Sık Sorulan Sorular</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        WhatsApp ajanınızın salonunuza verdiği cevapları kişiselleştirmek için bu alanı doldurun.
                      </p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isFaqExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </CardContent>
              </Card>

              {isFaqExpanded ? (
                <div className="space-y-2">
                  {salonFaqQuestions.map((item) => {
                    const answer = (salonFaqAnswers[item.id] || '').trim();
                    const answered = answer.length > 0;
                    const isEditing = editingQuestionId === item.id;
                    return (
                      <Card key={item.id} className="border-border/50">
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2">
                            <div className={`w-2 h-2 rounded-full mt-1.5 ${answered ? 'bg-green-500' : 'bg-amber-500'}`} />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{item.question}</p>
                              {!isEditing ? (
                                <p className="text-xs text-muted-foreground mt-2 leading-5">
                                  {answered ? answer : 'Henüz cevaplanmadı.'}
                                </p>
                              ) : (
                                <div className="mt-2 space-y-2">
                                  <textarea
                                    value={salonFaqAnswers[item.id] || ''}
                                    onChange={(e) => setSalonFaqAnswers((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                    placeholder="Bu soruya salonunuza özel cevabı yazın"
                                    rows={3}
                                    className="w-full rounded-md border border-border px-3 py-2 text-sm resize-none"
                                  />
                                  <div className="flex gap-2">
                                    <Button type="button" size="sm" onClick={saveSettings} disabled={isSaving}>
                                      {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                                    </Button>
                                    <Button type="button" size="sm" variant="outline" onClick={() => setEditingQuestionId(null)}>
                                      Vazgeç
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                            {!isEditing ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="w-8 h-8 shrink-0"
                                onClick={() => setEditingQuestionId(item.id)}
                                aria-label={answered ? 'Cevabı düzenle' : 'Cevap ekle'}
                              >
                                {answered ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                              </Button>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : null}

              <Card className="border-border/50">
                <CardContent className="p-3 space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Konuşma tonu</p>
                    <p className="text-xs text-muted-foreground">Ajanın müşteriyle konuşurken kullanacağı genel üslup.</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant={tone === 'friendly' ? 'default' : 'outline'} onClick={() => setTone('friendly')}>Sevecen ve Samimi</Button>
                      <Button type="button" variant={tone === 'professional' ? 'default' : 'outline'} onClick={() => setTone('professional')}>Profesyonel</Button>
                      <Button type="button" className="col-span-2" variant={tone === 'balanced' ? 'default' : 'outline'} onClick={() => setTone('balanced')}>Dengeli</Button>
                    </div>
                    <p className="text-xs text-muted-foreground border border-border/60 rounded-md p-2 bg-muted/30">
                      Örnek yaklaşım: {toneExamples[tone]}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Cevap uzunluğu</p>
                    <p className="text-xs text-muted-foreground">Müşteriye kısa mı, detaylı mı yanıt verileceğini belirler.</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button type="button" variant={answerLength === 'short' ? 'default' : 'outline'} onClick={() => setAnswerLength('short')}>Kısa</Button>
                      <Button type="button" variant={answerLength === 'medium' ? 'default' : 'outline'} onClick={() => setAnswerLength('medium')}>Orta</Button>
                      <Button type="button" variant={answerLength === 'detailed' ? 'default' : 'outline'} onClick={() => setAnswerLength('detailed')}>Detaylı</Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Emoji kullanımı</p>
                    <p className="text-xs text-muted-foreground">Yanıtlarda emoji yoğunluğunu kontrol eder.</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button type="button" variant={emojiUsage === 'off' ? 'default' : 'outline'} onClick={() => setEmojiUsage('off')}>Kapalı</Button>
                      <Button type="button" variant={emojiUsage === 'low' ? 'default' : 'outline'} onClick={() => setEmojiUsage('low')}>Az</Button>
                      <Button type="button" variant={emojiUsage === 'normal' ? 'default' : 'outline'} onClick={() => setEmojiUsage('normal')}>Normal</Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Randevuya yönlendirme seviyesi</p>
                    <p className="text-xs text-muted-foreground">Konuşma içinde müşteriyi randevu adımına ne kadar aktif yönlendireceğini belirler.</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button type="button" variant={bookingGuidance === 'low' ? 'default' : 'outline'} onClick={() => setBookingGuidance('low')}>Düşük</Button>
                      <Button type="button" variant={bookingGuidance === 'medium' ? 'default' : 'outline'} onClick={() => setBookingGuidance('medium')}>Orta</Button>
                      <Button type="button" variant={bookingGuidance === 'high' ? 'default' : 'outline'} onClick={() => setBookingGuidance('high')}>Yüksek</Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">İnsan personele devir eşiği</p>
                    <p className="text-xs text-muted-foreground">Müşteri memnuniyeti riski, karmaşık talep veya şikayet durumunda ajanın görüşmeyi ne kadar erken gerçek personele devredeceğini belirler.</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button type="button" variant={handoverThreshold === 'early' ? 'default' : 'outline'} onClick={() => setHandoverThreshold('early')}>Erken Devir</Button>
                      <Button type="button" variant={handoverThreshold === 'balanced' ? 'default' : 'outline'} onClick={() => setHandoverThreshold('balanced')}>Dengeli</Button>
                      <Button type="button" variant={handoverThreshold === 'late' ? 'default' : 'outline'} onClick={() => setHandoverThreshold('late')}>Geç Devir</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </CardContent>
          </Card>
        </motion.div>

        {/* Zap CTA */}
        <Card className="border-0 bg-gradient-to-br from-green-600 to-[var(--deep-indigo)] overflow-hidden">
          <CardContent className="p-5 relative">
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5" />
            <div className="flex items-center gap-3 relative z-10">
              <Zap className="w-6 h-6 text-white" />
              <div className="text-white">
                <p className="font-semibold text-sm">Ajanı WhatsApp'a bağla</p>
                <p className="text-xs text-white/70 mt-0.5">+90 544 xxx xxxx numaranızı doğrulayın</p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/60 ml-auto" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
