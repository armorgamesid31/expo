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
    question: 'Nasıl randevu oluşturabilirim?',
    answer:
      'Takvim sekmesinden tarih ve saati seçin, ardından müşteri, hizmet ve personel bilgilerini girerek randevu oluşturun. WhatsApp Yapay Zeka Asistanı da otomatik randevu oluşturabilir.',
    category: 'Randevu Yönetimi'
  },
  {
    question: 'Müşteri no-show durumunda ne yapmalıyım?',
    answer:
      'Randevuya gelmeyen müşteriler otomatik kaydedilir. CRM bölümünde müşteri detayından no-show sayısını görebilir, 3+ no-show yapanlar için kara liste önerisi alabilirsiniz.',
    category: 'Randevu Yönetimi'
  },
  {
    question: 'Müşterileri kara listeye nasıl eklerim?',
    answer:
      'Özellikler > Kara Liste bölümüne gidin. Yeni müşteri ekleyin veya mevcut müşterilerden seçin. Kara listedeki müşteriler randevu oluşturamaz.',
    category: 'Müşteri Yönetimi'
  },
  {
    question: 'WhatsApp Yapay Zeka Asistanı nasıl çalışır?',
    answer:
      'Yapay zeka asistanı WhatsApp Business API ile entegre çalışır ve mesajlara otomatik yanıt verir. Randevu alma, iptal/değişiklik ve SSS yanıtlarını ayarlayabilirsiniz.',
    category: 'AI ve Otomasyon'
  },
  {
    question: 'Hangi otomasyonları kullanabilirim?',
    answer:
      'WhatsApp Ayarları bölümünden randevu hatırlatmalarını, Müşteri Yönetimi > Randevu No-show Takibi bölümünden ihlal bildirimlerini yönetebilirsiniz.',
    category: 'AI ve Otomasyon'
  },
  {
    question: 'Kampanya nasıl oluşturabilirim?',
    answer:
      'Pazarlama Otomasyonu bölümünden yeni kampanya oluştur butonuna tıklayın. Segment seçin, mesajınızı yazın ve WhatsApp üzerinden gönderin.',
    category: 'Pazarlama'
  },
  {
    question: 'Müşteri segmentleri nedir?',
    answer:
      'Sistem müşterileri davranışlarına göre otomatik gruplar: VIP (₺3000+), pasif (3+ ay gelmeyen), sık gelen (ayda 2+ ziyaret). Segmentlere özel kampanya gönderebilirsiniz.',
    category: 'Pazarlama'
  },
  {
    question: 'Sadakat programı nasıl çalışır?',
    answer:
      'Müşteriler harcamaya göre puan kazanır ve bu puanları indirimde kullanır. Kampanyalar bölümünden puan oranı ve kullanım limitlerini düzenleyebilirsiniz.',
    category: 'Kampanyalar'
  },
  {
    question: 'Web sitemi nasıl yönetebilirim?',
    answer:
      'Web Sitesi Oluşturucu bölümünden salon adı, slogan, açıklama, sosyal medya bağlantıları ve galeri görsellerini düzenleyebilirsiniz.',
    category: 'Web Sitesi'
  },
  {
    question: 'Analitik raporları nasıl görüntülerim?',
    answer:
      'Ana sayfadaki Performans Analizi kartından ciro trendleri, hizmet dağılımı, personel performansı ve doluluk oranını görüntüleyebilirsiniz.',
    category: 'Raporlama'
  },
  {
    question: 'Yeni personel nasıl eklerim?',
    answer:
      'Özellikler > Personel Yönetimi bölümüne gidin, yeni personel ekleyin ve ad, rol, uzmanlık alanı ile çalışma saatlerini girin.',
    category: 'Personel Yönetimi'
  },
  {
    question: 'Hizmet fiyatlarını nasıl güncellerim?',
    answer:
      'Özellikler > Hizmet Yönetimi bölümünde ilgili hizmeti açıp fiyat, süre ve açıklama alanlarını düzenleyerek kaydedin.',
    category: 'Hizmet Yönetimi'
  },
  {
    question: 'Birden fazla şubeyi yönetebilir miyim?',
    answer:
      'Evet. Uygun planlarda birden fazla şubeyi tek panelden yönetebilir, her şube için ayrı personel/hizmet/randevu takibi yapabilirsiniz.',
    category: 'Salon Yönetimi'
  },
  {
    question: 'Müşteri notlarını nasıl kullanırım?',
    answer:
      'CRM bölümünde müşteri detayına not ekleyebilirsiniz. Alerji, tercih ve özel talepler gibi bilgiler ekip tarafından görülebilir.',
    category: 'Müşteri Yönetimi'
  }
];

const categories = [...new Set(faqData.map((item) => item.category))];

export function HelpCenter({ onBack }: HelpCenterProps) {
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');

  const filteredFAQs = selectedCategory === 'Tümü' ? faqData : faqData.filter((item) => item.category === selectedCategory);

  return (
    <div className="h-full pb-20 overflow-y-auto">
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
            <h1 className="text-2xl font-semibold">Yardım Merkezi</h1>
            <p className="text-sm text-muted-foreground">SSS ve destek</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('Tümü')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === 'Tümü' ? 'bg-[var(--rose-gold)] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              Tümü ({faqData.length})
            </button>
            {categories.map((cat) => {
              const count = faqData.filter((item) => item.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat ? 'bg-[var(--rose-gold)] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="space-y-2"
        >
          {filteredFAQs.map((item, idx) => (
            <Card key={idx} className="border-border/50">
              <CardContent className="p-4">
                <button onClick={() => setExpandedItem(expandedItem === idx ? null : idx)} className="w-full text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-1">{item.question}</p>
                      {expandedItem !== idx ? <p className="text-xs text-[var(--rose-gold)]">{item.category}</p> : null}
                    </div>
                    {expandedItem === idx ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    )}
                  </div>
                </button>
                {expandedItem === idx ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="mt-3 pt-3 border-t border-border"
                  >
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
                    <div className="mt-2">
                      <span className="text-xs text-[var(--rose-gold)] bg-[var(--rose-gold)]/10 px-2 py-1 rounded-full">{item.category}</span>
                    </div>
                  </motion.div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <Card className="border-[var(--deep-indigo)]/20 bg-gradient-to-br from-[var(--deep-indigo)]/5 to-transparent">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--deep-indigo)]/10 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-[var(--deep-indigo)]" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Sorunuz mu var?</h3>
                  <p className="text-xs text-muted-foreground">Destek ekibimizle iletişime geçin</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="w-full text-xs h-9">
                  <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                  Canlı Destek
                </Button>
                <Button variant="outline" className="w-full text-xs h-9">
                  <Mail className="w-3.5 h-3.5 mr-1.5" />
                  E-posta Gönder
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
