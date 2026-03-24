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
    question: 'What does the agent do outside of working hours?',
    answer: 'Receives out-of-hours messages with a polite greeting text, offers convenient hours to the customer, and assigns them to the morning shift.',
  },
  {
    id: 'faq-pricing',
    tag: 'Fiyat',
    question: 'How does the agent answer pricing questions?',
    answer: 'The system uses current prices from your active service list. If an unclear service name comes up, it asks a clarifying question.',
  },
  {
    id: 'faq-cancel',
    tag: 'Appointment',
    question: 'What happens if the customer requests cancellation or postponement?',
    answer: 'The agent verifies the request, displays available new slots, and summarizes the transaction result in a single message to the client.',
  },
  {
    id: 'faq-human',
    tag: 'Operasyon',
    question: 'In what situation is the conversation delegated to staff?',
    answer: 'If a complaint, payment dispute, aggressive language or special request outside the system is detected, the conversation is automatically directed to staff.',
  },
  {
    id: 'faq-language',
    tag: 'Dil',
    question: 'Can the agent respond in multiple languages?',
    answer: 'Yes. It detects the customer\'s message language and responds in the appropriate language among the supported languages.',
  },
  {
    id: 'faq-training',
    tag: 'Setup',
    question: 'How to customize the answers according to our salon?',
    answer: 'When the salon information, services and expert list are kept up to date, the agent produces a response using this data based on the system prompt.',
  },
];

export function WhatsAppAgentFaq({ onBack }: WhatsAppAgentFaqProps) {
  return (
    <div className="h-full pb-20 overflow-y-auto">
      <div className="sticky top-0 bg-background z-10 border-b border-border p-4">
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground mb-3 active:opacity-70">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>
        <h1 className="text-xl font-semibold">Standard FAQ</h1>
        <p className="text-xs text-muted-foreground mt-1">Agent default knowledge base</p>
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
