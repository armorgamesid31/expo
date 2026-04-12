import { useState } from 'react';
import { ArrowLeft, HelpCircle, ChevronDown, ChevronUp, MessageCircle, Mail } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { motion } from 'motion/react';

interface HelpCenterProps {
  onBack: () => void;
}

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
{
  question: 'How can I make an appointment?',
  answer: 'Click on the date and time you want from the Calendar tab, then create an appointment by selecting customer, service and employee information. Alternatively, WhatsApp AI Agent can also create automatic appointments.',
  category: 'Appointment Management'
},
{
  question: 'What should I do in case of customer no-show?',
  answer: "Müşteriler who do not show up for an appointment are automatically recorded. You can see the number of no-shows by going to customer details in the CRM section, and get an automatic blacklist recommendation for customers who have made 3+ no-shows.",
  category: 'Appointment Management'
},
{
  question: 'How do I add customers to the blacklist?',
  answer: 'Go to Properties > Blacklist. Click the add new customer button and enter customer information or select from the existing customer list. Blacklisted customers cannot make an appointment.',
  category: "Müşteri Yönetimi"
},
{
  question: 'How does WhatsApp AI Agent work?',
  answer: 'AI Agent works integrated with WhatsApp Business API and automatically responds to customer messages. You can determine the agent\'s capabilities by activating the appointment making, cancellation/change and FAQ answering features.',
  category: 'AI ve Otomasyon'
},
{
  question: 'What automations can I install?',
  answer: "You can manage appointment reminders in WhatsApp Ayarları and violation notifications in Müşteri Yönetimi > Appointment No-Show Tracking. All messages are sent via WhatsApp.",
  category: 'AI ve Otomasyon'
},
{
  question: 'How can I create a campaign?',
  answer: 'Click on the create new campaign button in the Marketing Automation section. Choose a customer segment (VIP, passive customers, frequent visitors), write your message and send it via WhatsApp.',
  category: 'Marketing'
},
{
  question: 'What are customer segments?',
  answer: 'The system automatically groups your customers based on their behavior: VIP customers (₺3000+ spend), passive customers (3+ months absent), frequent visitors (2+ visits per month). You can send special campaigns to these segments.',
  category: 'Marketing'
},
{
  question: 'How does the loyalty program work?',
  answer: "Müşteriler who earn points for every spending can use the accumulated points as a discount. You can edit the loyalty program settings, determine the point rate and minimum usage limit in the Campaigns section.",
  category: 'Campaigns'
},
{
  question: 'How to use the friend invitation program?',
  answer: 'Your customers can share the invitation links they receive from the Campaigns section with their friends. For each successful invitation, both the inviter and the person receiving receive a reward.',
  category: 'Campaigns'
},
{
  question: 'How can I manage my website?',
  answer: 'You can edit information such as salon name, slogan, description, social media links and gallery images from the Website Creator section. Changes go live immediately.',
  category: 'Web Sitesi'
},
{
  question: 'How do I view analytical reports?',
  answer: 'Click on the Performance Analysis card from the Home section. You can view detailed metrics such as revenue trends, service distribution, employee performance and occupancy rate. Select the time period you want from the period selector.',
  category: 'Raporlama'
},
{
  question: 'How do I add a new employee?',
  answer: "Go to Properties > Employee Management. Click the Ekle new employee button and enter the name, role, areas of expertise and working hours. Employees become selectable when creating an appointment.",
  category: 'Employee Management'
},
{
  question: 'How do I update service prices?',
  answer: "Click on the service you want to update in the Properties > Hizmet Yönetimi section. Düzenle and save price, duration and description information. New prices take effect immediately.",
  category: "Hizmet Yönetimi"
},
{
  question: 'Can I manage more than one salon branch?',
  answer: 'Yes, you can add multiple salons in your Enterprise plan and manage all your branches from a central panel. Separate employee, service and appointment management is possible for each branch.',
  category: 'Hall Management'
},
{
  question: 'How can I use customer notes?',
  answer: 'You can add notes by going to customer details in the CRM section. These notes are used to store important information such as allergies, preferences, special requests, and are visible to all employees.',
  category: "Müşteri Yönetimi"
}];


const categories = [...new Set(faqData.map((item) => item.category))];

export function HelpCenter({ onBack }: HelpCenterProps) {
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filteredFAQs = selectedCategory === 'All' ?
  faqData :
  faqData.filter((item) => item.category === selectedCategory);

  return (
    <div className="h-full pb-20 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-background z-10 border-b border-border p-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Ayarlara Dön
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--deep-indigo)]/10 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-[var(--deep-indigo)]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Help Center</h1>
            <p className="text-sm text-muted-foreground">FAQ and support</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Category Filter */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              selectedCategory === 'All' ?
              'bg-[var(--rose-gold)] text-white' :
              'bg-muted text-muted-foreground hover:bg-muted/70'}`
              }>
              
              All ({faqData.length})
            </button>
            {categories.map((cat) => {
              const count = faqData.filter((item) => item.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat ?
                  'bg-[var(--rose-gold)] text-white' :
                  'bg-muted text-muted-foreground hover:bg-muted/70'}`
                  }>
                  
                  {cat} ({count})
                </button>);

            })}
          </div>
        </motion.div>

        {/* FAQ List */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="space-y-2">
          
          {filteredFAQs.map((item, idx) =>
          <Card key={idx} className="border-border/50">
              <CardContent className="p-4">
                <button
                onClick={() => setExpandedItem(expandedItem === idx ? null : idx)}
                className="w-full text-left">
                
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-1">{item.question}</p>
                      {expandedItem !== idx &&
                    <p className="text-xs text-[var(--rose-gold)]">{item.category}</p>
                    }
                    </div>
                    {expandedItem === idx ?
                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" /> :

                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  }
                  </div>
                </button>
                {expandedItem === idx &&
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="mt-3 pt-3 border-t border-border">
                
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
                    <div className="mt-2">
                      <span className="text-xs text-[var(--rose-gold)] bg-[var(--rose-gold)]/10 px-2 py-1 rounded-full">
                        {item.category}
                      </span>
                    </div>
                  </motion.div>
              }
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Contact Support */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <Card className="border-[var(--deep-indigo)]/20 bg-gradient-to-br from-[var(--deep-indigo)]/5 to-transparent">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--deep-indigo)]/10 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-[var(--deep-indigo)]" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Sorunuz mu var?</h3>
                  <p className="text-xs text-muted-foreground">Contact our support team</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="w-full text-xs h-9">
                  <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                  Canlı Destek
                </Button>
                <Button variant="outline" className="w-full text-xs h-9">
                  <Mail className="w-3.5 h-3.5 mr-1.5" />
                  Gönder Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>);

}