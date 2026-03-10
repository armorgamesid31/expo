import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Badge } from '../ui/badge';

interface WhatsAppAgentFaqProps {
  onBack: () => void;
}

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
    answer: 'Salon bilgileri, hizmetler ve uzman listesi güncel tutulduğunda ajan bu verileri system prompt tabanında kullanarak yanıt üretir.',
  },
];

export function WhatsAppAgentFaq({ onBack }: WhatsAppAgentFaqProps) {
  return (
    <div className="h-full pb-20 overflow-y-auto">
      <div className="sticky top-0 bg-background z-10 border-b border-border p-4">
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground mb-3 active:opacity-70">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Geri</span>
        </button>
        <h1 className="text-xl font-semibold">Standart SSS</h1>
        <p className="text-xs text-muted-foreground mt-1">Ajanın varsayılan bilgi tabanı</p>
      </div>

      <div className="p-4">
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
      </div>
    </div>
  );
}
