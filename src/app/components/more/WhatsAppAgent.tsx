import { useState } from 'react';
import { ArrowLeft, MessageCircle, Bot, Zap, TrendingUp, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { motion } from 'motion/react';

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

const faqItems = [
  {
    id: 'faq-hours',
    tag: 'Mesai',
    question: 'Ajan mesai saatleri dışında ne yapar?',
    answer: 'Mesai dışı mesajları nazik bir karşılama metniyle alır, müşteriye uygun saatleri sunar ve sabah vardiyasına görev olarak bırakır.',
  },
  {
    id: 'faq-pricing',
    tag: 'Fiyat',
    question: 'Ajan fiyat sorularını nasıl yanıtlar?',
    answer: 'Sistem, aktif hizmet listenizdeki güncel fiyatları kullanır. Belirsiz bir hizmet adı gelirse netleştirme sorusu sorar.',
  },
  {
    id: 'faq-cancel',
    tag: 'Randevu',
    question: 'Müşteri iptal veya erteleme isterse ne olur?',
    answer: 'Ajan talebi doğrular, uygun yeni slotları gösterir ve işlem sonucunu müşteriye tek mesajda özetler.',
  },
  {
    id: 'faq-human',
    tag: 'Operasyon',
    question: 'Hangi durumda konuşma personele devredilir?',
    answer: 'Şikayet, ödeme anlaşmazlığı, agresif dil veya sistem dışı özel talep algılanırsa konuşma otomatik olarak personele yönlendirilir.',
  },
  {
    id: 'faq-language',
    tag: 'Dil',
    question: 'Ajan birden fazla dilde yanıt verebilir mi?',
    answer: 'Evet. Müşterinin mesaj dilini algılar ve desteklenen diller arasında uygun dilde yanıt verir.',
  },
  {
    id: 'faq-training',
    tag: 'Kurulum',
    question: 'Yanıtların salonumuza göre özelleşmesi nasıl yapılır?',
    answer: 'Salon bilgileri, hizmetler ve uzman listesi güncel tutulduğunda ajan bu verileri sistem prompt tabanında kullanarak yanıt üretir.',
  },
];

export function WhatsAppAgent({ onBack }: WhatsAppAgentProps) {
  const [agentActive, setAgentActive] = useState(true);

  const conversionRate = 68;
  const totalConversations = 47;
  const resolvedByBot = 39;

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
          <div>
            <h1 className="text-xl font-semibold">AI WhatsApp Ajanı</h1>
            <p className="text-xs text-muted-foreground">Otomatik müşteri iletişimi</p>
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

        {/* FAQ */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <h2 className="font-semibold mb-3 px-1">Sık Sorulan Sorular</h2>
          <Card className="border-border/50">
            <CardContent className="p-3">
              <Accordion type="single" collapsible>
                {faqItems.map((item) => (
                  <AccordionItem key={item.id} value={item.id}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-2 text-left">
                        <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-auto">
                          {item.tag}
                        </Badge>
                        <span className="text-sm">{item.question}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-muted-foreground leading-6">{item.answer}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
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
