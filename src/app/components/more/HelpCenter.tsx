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
    question: 'Randevu nasıl oluşturabilirim?',
    answer: 'Takvim sekmesinden istediğiniz tarih ve saate tıklayın, ardından müşteri, hizmet ve çalışan bilgilerini seçerek randevu oluşturun. Alternatif olarak, WhatsApp AI Ajanı da otomatik randevu oluşturabilir.',
    category: 'Randevu Yönetimi',
  },
  {
    question: 'Müşteri no-show durumunda ne yapmalıyım?',
    answer: 'Randevuya gelmeyen müşteriler otomatik olarak kaydedilir. CRM bölümünden müşteri detaylarına giderek no-show sayısını görebilir, 3+ no-show yapan müşteriler için otomatik kara liste önerisi alabilirsiniz.',
    category: 'Randevu Yönetimi',
  },
  {
    question: 'Kara listeye nasıl müşteri eklerim?',
    answer: 'Özellikler > Kara Liste bölümüne gidin. Yeni müşteri ekle butonuna tıklayıp müşteri bilgilerini girin veya mevcut müşteri listesinden seçim yapın. Kara listedeki müşteriler randevu alamaz.',
    category: 'Müşteri Yönetimi',
  },
  {
    question: 'WhatsApp AI Ajanı nasıl çalışır?',
    answer: 'AI Ajan, WhatsApp Business API ile entegre çalışarak müşteri mesajlarını otomatik yanıtlar. Randevu alma, iptal/değişiklik ve SSS yanıtlama özelliklerini aktif ederek ajanın yeteneklerini belirleyebilirsiniz.',
    category: 'AI ve Otomasyon',
  },
  {
    question: 'Hangi otomasyonları kurabilirim?',
    answer: 'WhatsApp Ayarları bölümünden randevu hatırlatıcılarını, Müşteri Yönetimi > Randevuya Gelmeme Takibi bölümünden ihlal bildirimlerini yönetebilirsiniz. Tüm mesajlar WhatsApp üzerinden gönderilir.',
    category: 'AI ve Otomasyon',
  },
  {
    question: 'Kampanya nasıl oluşturabilirim?',
    answer: 'Pazarlama Otomasyonu bölümünden yeni kampanya oluştur butonuna tıklayın. Müşteri segmenti seçin (VIP, pasif müşteriler, sık gelenler), mesajınızı yazın ve WhatsApp ile gönderin.',
    category: 'Pazarlama',
  },
  {
    question: 'Müşteri segmentleri nedir?',
    answer: 'Sistem, müşterilerinizi otomatik olarak davranışlarına göre gruplar: VIP müşteriler (₺3000+ harcama), pasif müşteriler (3+ ay gelmeyenler), sık gelenler (ayda 2+ ziyaret). Bu segmentlere özel kampanyalar gönderebilirsiniz.',
    category: 'Pazarlama',
  },
  {
    question: 'Sadakat programı nasıl çalışır?',
    answer: 'Her harcamadan puan kazanan müşteriler, biriken puanları indirim olarak kullanabilir. Kampanyalar bölümünden sadakat programı ayarlarını düzenleyebilir, puan oranını ve minimum kullanım limitini belirleyebilirsiniz.',
    category: 'Kampanyalar',
  },
  {
    question: 'Arkadaş davet programı nasıl kullanılır?',
    answer: 'Müşterileriniz, Kampanyalar bölümünden aldıkları davet linklerini arkadaşlarıyla paylaşabilir. Her başarılı davet için hem davet eden hem de gelen kişi ödül kazanır.',
    category: 'Kampanyalar',
  },
  {
    question: 'Web sitemi nasıl yönetebilirim?',
    answer: 'Web Sitesi Oluşturucu bölümünden salon adı, slogan, açıklama, sosyal medya linkleri ve galeri görselleri gibi bilgileri düzenleyebilirsiniz. Değişiklikler anında yayına alınır.',
    category: 'Web Sitesi',
  },
  {
    question: 'Analitik raporları nasıl görüntülerim?',
    answer: 'Ana Sayfa bölümünden Performans Analizi kartına tıklayın. Gelir trendleri, hizmet dağılımı, çalışan performansı ve doluluk oranı gibi detaylı metrikleri görüntüleyebilirsiniz. Periyot seçiciden istediğiniz zaman aralığını seçin.',
    category: 'Raporlama',
  },
  {
    question: 'Yeni çalışan nasıl eklerim?',
    answer: 'Özellikler > Çalışan Yönetimi bölümüne gidin. Yeni çalışan ekle butonuna tıklayıp ad, rol, uzmanlık alanları ve çalışma saatlerini girin. Çalışanlar randevu oluştururken seçilebilir hale gelir.',
    category: 'Çalışan Yönetimi',
  },
  {
    question: 'Hizmet fiyatlarını nasıl güncellerim?',
    answer: 'Özellikler > Hizmet Yönetimi bölümünden güncellemek istediğiniz hizmete tıklayın. Fiyat, süre ve açıklama bilgilerini düzenleyip kaydedin. Yeni fiyatlar anında geçerli olur.',
    category: 'Hizmet Yönetimi',
  },
  {
    question: 'Birden fazla salon şubesi yönetebilir miyim?',
    answer: 'Evet, Enterprise planınızda birden fazla salon ekleyebilir ve merkezi bir panelden tüm şubelerinizi yönetebilirsiniz. Her şube için ayrı çalışan, hizmet ve randevu yönetimi mümkündür.',
    category: 'Salon Yönetimi',
  },
  {
    question: 'Müşteri notlarını nasıl kullanabilirim?',
    answer: 'CRM bölümünden müşteri detayına giderek notlar ekleyebilirsiniz. Bu notlar, alerjiler, tercihler, özel talepler gibi önemli bilgileri saklamak için kullanılır ve tüm çalışanlar tarafından görülebilir.',
    category: 'Müşteri Yönetimi',
  },
];

const categories = [...new Set(faqData.map(item => item.category))];

export function HelpCenter({ onBack }: HelpCenterProps) {
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');

  const filteredFAQs = selectedCategory === 'Tümü' 
    ? faqData 
    : faqData.filter(item => item.category === selectedCategory);

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
            <h1 className="text-2xl font-semibold">Yardım Merkezi</h1>
            <p className="text-sm text-muted-foreground">Sık sorulan sorular ve destek</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Category Filter */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('Tümü')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === 'Tümü' 
                  ? 'bg-[var(--rose-gold)] text-white' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              Tümü ({faqData.length})
            </button>
            {categories.map(cat => {
              const count = faqData.filter(item => item.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat 
                      ? 'bg-[var(--rose-gold)] text-white' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* FAQ List */}
        <motion.div 
          initial={{ opacity: 0, y: 12 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4, delay: 0.05 }}
          className="space-y-2"
        >
          {filteredFAQs.map((item, idx) => (
            <Card key={idx} className="border-border/50">
              <CardContent className="p-4">
                <button
                  onClick={() => setExpandedItem(expandedItem === idx ? null : idx)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-1">{item.question}</p>
                      {expandedItem !== idx && (
                        <p className="text-xs text-[var(--rose-gold)]">{item.category}</p>
                      )}
                    </div>
                    {expandedItem === idx ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    )}
                  </div>
                </button>
                {expandedItem === idx && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="mt-3 pt-3 border-t border-border"
                  >
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
                    <div className="mt-2">
                      <span className="text-xs text-[var(--rose-gold)] bg-[var(--rose-gold)]/10 px-2 py-1 rounded-full">
                        {item.category}
                      </span>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          ))}
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
