import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Badge } from '../ui/badge';

interface WhatsAppAgentFaqProps {
  onGeri: () => void;
}

const faqItems = [
  {
    id: 'faq-hours',
    tag: 'Mesai',
    question: 'Asistan çalışma saatleri dışında ne yapar?',
    answer: 'Mesai dışı mesajları nazik bir karşılama metni ile alır, müşteriye uygun saatler sunar ve onları sabah vardiyasına atar.',
  },
  {
    id: 'faq-pricing',
    tag: 'Fiyat',
    question: 'Asistan fiyat sorularını nasıl yanıtlar?',
    answer: 'Sistem, aktif hizmet listenizdeki güncel fiyatları kullanır. Net olmayan bir hizmet adı gelirse, açıklayıcı bir soru sorar.',
  },
  {
    id: 'faq-cancel',
    tag: 'Randevu',
    question: 'Müşteri iptal veya erteleme isterse ne olur?',
    answer: 'Ajan talebi doğrular, mevcut yeni boşlukları görüntüler ve işlem sonucunu müşteriye tek bir mesajda özetler.',
  },
  {
    id: 'faq-human',
    tag: 'Operasyon',
    question: 'Konuşma hangi durumlarda personele devredilir?',
    answer: 'Bir şikayet, ödeme anlaşmazlığı, agresif dil veya sistem dışı özel bir talep algılanırsa, konuşma otomatik olarak personele yönlendirilir.',
  },
  {
    id: 'faq-language',
    tag: 'Dil',
    question: 'Can the agent respond in multiple languages?',
    answer: 'Evet. Müşterinin mesaj dilini algılar ve desteklenen diller arasından uygun dilde yanıt verir.',
  },
  {
    id: 'faq-training',
    tag: 'Setup',
    question: 'Yanıtlar salonumuza göre nasıl özelleştirilir?',
    answer: 'Salon bilgileri, hizmetler ve uzman listesi güncel tutulduğunda, ajan sistem komutuna dayanarak bu verileri kullanarak bir yanıt üretir.',
  },
];

export function WhatsAppAgentFaq({ onGeri }: WhatsAppAgentFaqProps) {
  return (
    <div className="h-full pb-20 overflow-y-auto">
      <div className="sticky top-0 bg-background z-10 border-b border-border p-4">
        <button onClick={onGeri} className="flex items-center gap-2 text-muted-foreground mb-3 active:opacity-70">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Geri</span>
        </button>
        <h1 className="text-xl font-semibold">Standart SSS</h1>
        <p className="text-xs text-muted-foreground mt-1">Ajan varsayılan bilgi tabanı</p>
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
