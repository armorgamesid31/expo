import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
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
    answer: 'Mesai saatleri dışındaki mesajları nazik bir karşılama metni ile kabul eder, müşteriye uygun saat seçenekleri sunar ve sabah vardiyasına devreder.',
  },
  {
    id: 'faq-pricing',
    tag: 'Fiyat',
    question: 'Asistan fiyat sorularını nasıl yanıtlar?',
    answer: 'Aktif hizmet listenizdeki güncel fiyatları kullanır. Eğer tam anlaşılmayan bir hizmet sorulursa netleştirici sorular sorarak doğru fiyatı iletir.',
  },
  {
    id: 'faq-cancel',
    tag: 'Randevu',
    question: 'Müşteri iptal veya erteleme isterse ne olur?',
    answer: 'Talebi doğrular, uygun yeni saatleri listeler ve işlem sonucunu tek bir özet mesajı olarak müşteriye iletir.',
  },
  {
    id: 'faq-human',
    tag: 'Operasyon',
    question: 'Hangi durumlarda sohbet personele devredilir?',
    answer: 'Şikayet, ödeme itirazı, agresif dil veya sistem dışı özel bir talep algılandığında sohbet otomatik olarak salon personeline yönlendirilir.',
  },
  {
    id: 'faq-language',
    tag: 'Dil',
    question: 'Asistan çok dilli yanıt verebilir mi?',
    answer: 'Evet. Müşterinin gönderdiği mesajın dilini otomatik olarak algılar ve desteklenen diller arasından uygun olanı seçerek o dilde iletişimi sürdürür.',
  },
  {
    id: 'faq-training',
    tag: 'Kurulum',
    question: 'Yanıtlar salonumuza göre nasıl özelleştirilir?',
    answer: 'Salon bilgileri, hizmet fiyatları ve personel listeniz güncel tutulduğunda; asistan bu verileri işleyip size özel yapılandırılmış sistem kurallarına göre dinamik yanıtlar üretir.',
  },
];

export function WhatsAppAgentFaq({ onGeri }: WhatsAppAgentFaqProps) {
  return (
    <div className="h-full pb-20 overflow-y-auto">
      <div className="sticky top-0 z-10 border-b border-border bg-gradient-to-b from-background to-background/95 backdrop-blur-md">
        <div className="p-4 pb-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onGeri} className="shrink-0 -ml-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold tracking-tight">Sıkça Sorulan Sorular</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Asistan bilgi bankası ve çalışma mantığı</p>
            </div>
          </div>
        </div>
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
