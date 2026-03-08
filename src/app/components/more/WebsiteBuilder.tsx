import { useState } from 'react';
import { ArrowLeft, Globe, Instagram, MessageCircle, Camera, Check, ExternalLink, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { motion } from 'motion/react';

interface WebsiteBuilderProps {
  onBack: () => void;
}

const galleryImages = [
  { id: 1, label: 'Saç Boyama', emoji: '💇‍♀️' },
  { id: 2, label: 'Manikür', emoji: '💅' },
  { id: 3, label: 'Cilt Bakımı', emoji: '✨' },
  { id: 4, label: 'Salon', emoji: '🌸' },
];

export function WebsiteBuilder({ onBack }: WebsiteBuilderProps) {
  const [salonName, setSalonName] = useState('Beauté Salon');
  const [tagline, setTagline] = useState('Güzelliğinizi Keşfedin');
  const [description, setDescription] = useState('Istanbul\'un kalbinde, lüks ve konforun buluştuğu özel güzellik deneyimi. Uzman ekibimizle kendinizi özel hissedin.');
  const [instagram, setInstagram] = useState('@beautesalon');
  const [whatsapp, setWhatsapp] = useState('+90 532 123 4567');
  const [heroText, setHeroText] = useState('Profesyonel Bakım, Kişisel Dokunuş');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="h-full pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-background z-10 border-b border-border p-4">
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground mb-3 active:opacity-70">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Geri</span>
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--deep-indigo)]/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-[var(--deep-indigo)]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Web Sitesi Oluşturucu</h1>
              <p className="text-xs text-muted-foreground">Salonunuzun web sitesini yönetin</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-500/20">
            Yayında
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Edit Form */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-4"
        >
          {/* Salon Name & Tagline */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Salon Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Salon Adı</label>
                <input
                  value={salonName}
                  onChange={(e) => setSalonName(e.target.value)}
                  className="w-full bg-muted/40 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--rose-gold)]/30 border border-border transition-all"
                  placeholder="Salon adınız"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Slogan</label>
                <input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full bg-muted/40 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--rose-gold)]/30 border border-border transition-all"
                  placeholder="Salonunuzun sloganı"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Hero Başlığı</label>
                <input
                  value={heroText}
                  onChange={(e) => setHeroText(e.target.value)}
                  className="w-full bg-muted/40 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--rose-gold)]/30 border border-border transition-all"
                  placeholder="Ana sayfa başlığı"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Açıklama</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-muted/40 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--rose-gold)]/30 border border-border transition-all resize-none"
                  placeholder="Salonunuzun kısa açıklaması"
                />
              </div>
            </CardContent>
          </Card>

          {/* Social & Contact */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Sosyal Medya & İletişim</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5 block">
                  <Instagram className="w-3.5 h-3.5 text-pink-500" />
                  Instagram Hesabı
                </label>
                <input
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="w-full bg-muted/40 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--rose-gold)]/30 border border-border transition-all"
                  placeholder="@kullanici_adi"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5 block">
                  <MessageCircle className="w-3.5 h-3.5 text-green-500" />
                  WhatsApp Numarası
                </label>
                <input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full bg-muted/40 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--rose-gold)]/30 border border-border transition-all"
                  placeholder="+90 5xx xxx xxxx"
                />
              </div>
            </CardContent>
          </Card>

          {/* Gallery */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Galeri Görselleri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {galleryImages.map(img => (
                  <div
                    key={img.id}
                    className="aspect-square rounded-lg bg-gradient-to-br from-[var(--rose-gold)]/10 to-[var(--deep-indigo)]/10 flex flex-col items-center justify-center border-2 border-[var(--rose-gold)]/20 cursor-pointer active:scale-95 transition-transform"
                  >
                    <span className="text-2xl">{img.emoji}</span>
                    <span className="text-[9px] text-muted-foreground mt-1">{img.label}</span>
                  </div>
                ))}
              </div>
              <button className="w-full py-2.5 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground flex items-center justify-center gap-2 active:scale-95 transition-transform">
                <Camera className="w-4 h-4" />
                Fotoğraf Ekle
              </button>
            </CardContent>
          </Card>

          {/* AI Section */}
          <Card className="border-[var(--rose-gold)]/30 bg-gradient-to-r from-[var(--rose-gold)]/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--rose-gold)]/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[var(--rose-gold)]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">AI ile İçerik Üret</p>
                  <p className="text-xs text-muted-foreground">Salonunuz için otomatik metin oluştur</p>
                </div>
                <button className="px-3 py-1.5 bg-[var(--rose-gold)] text-white rounded-lg text-xs font-medium active:scale-95 transition-transform">
                  Üret
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-98 ${
              saved
                ? 'bg-green-500 text-white'
                : 'bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)] text-white'
            }`}
          >
            {saved ? (
              <span className="flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                Kaydedildi!
              </span>
            ) : (
              'Değişiklikleri Kaydet & Yayınla'
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
}