import { useEffect, useMemo, useRef, useState, type ChangeEventHandler } from 'react';
import { Globe, Instagram, MessageCircle, Camera, Check, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useNavigator } from '../../context/NavigatorContext';

interface WebsiteBuilderProps {
  onBack?: () => void;
}

interface GalleryImageItem {
  id: string;
  label: string;
  imageUrl?: string;
  emoji?: string;
  categoryId?: number | null;
}

interface ServiceCategory {
  id: number;
  name: string;
}

interface WebsiteContentResponse {
  salon: {
    name: string;
    tagline: string | null;
    heroText: string | null;
    about: string | null;
    instagramUrl: string | null;
    whatsappPhone: string | null;
  };
  gallery: Array<{
    id: number;
    imageUrl: string;
    altText: string | null;
    displayOrder: number | null;
    categoryId: number | null;
  }>;
}

const defaultGalleryImages: GalleryImageItem[] = [
  { id: 'seed-1', label: 'Saç Boyama', emoji: '💇‍♀️' },
  { id: 'seed-2', label: 'Manikür', emoji: '💅' },
  { id: 'seed-3', label: 'Cilt Bakımı', emoji: '✨' },
  { id: 'seed-4', label: 'Salon', emoji: '🌸' }];


function normalizeInstagram(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const username = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  return `https://instagram.com/${username}`;
}

function buildLocalWebsiteCopy(name: string, cityHint?: string) {
  const salonName = name.trim() || 'Salonunuz';
  const city = cityHint?.trim() || 'şehrinizde';

  return {
    heroText: `${salonName} ile kendinize vakit ayırın`,
    tagline: `${city} profesyonel güzellik deneyimi`,
    description:
      `${salonName}, uzman ekibi ve kaliteli hizmet anlayışıyla saç, cilt ve vücut bakımında güvenilir sonuçlar sunar. ` +
      'Hijyenik salon ortamımız, kaliteli ürünler ve kişiye özel dokunuşlarla her ziyaretinizi keyifli bir deneyime dönüştürür.'
  };
}

const ShimmerOverlay = () => (
  <motion.div
    initial={{ x: '-100%' }}
    animate={{ x: '100%' }}
    transition={{
      repeat: Infinity,
      duration: 1.5,
      ease: "linear",
    }}
    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent z-[1]"
  />
);

export function WebsiteBuilder({ onBack: _onBack }: WebsiteBuilderProps) {
  const { apiFetch, bootstrap } = useAuth();
  const { setHeaderTitle } = useNavigator();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string; } | null>(null);

  const [salonName, setSalonName] = useState('Güzellik Salonu');
  const [tagline, setTagline] = useState('Güzelliğinizi Keşfedin');
  const [description, setDescription] = useState(
    "Lüks ve konforun buluştuğu özel bir güzellik deneyimi. Uzman ekibimizle kendinizi özel hissedin."
  );
  const [heroText, setHeroText] = useState('Profesyonel Bakım, Kişisel Dokunuş');
  const [galleryImages, setGalleryImages] = useState<GalleryImageItem[]>(defaultGalleryImages);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  useEffect(() => {
    setHeaderTitle('Web Sitesi Ayarları');
    return () => setHeaderTitle(null);
  }, [setHeaderTitle]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [content, catResponse] = await Promise.all([
          apiFetch<WebsiteContentResponse>('/api/admin/website/content'),
          apiFetch<{ items: ServiceCategory[] }>('/api/admin/service-categories')
        ]);

        if (!mounted) {
          return;
        }

        setCategories(catResponse?.items || []);
        setSalonName(content.salon.name || bootstrap?.salon?.name || salonName);
        setTagline(content.salon.tagline || 'Güzelliğinizi Keşfedin');
        setHeroText(content.salon.heroText || content.salon.tagline || 'Profesyonel Bakım, Kişisel Dokunuş');
        setDescription(content.salon.about || description);

        if (content.gallery.length > 0) {
          setGalleryImages(
            content.gallery.map((image) => ({
              id: `db-${image.id}`,
              label: image.altText || 'Salon Görseli',
              imageUrl: image.imageUrl,
              categoryId: image.categoryId
            }))
          );
        } else {
          setGalleryImages(defaultGalleryImages);
        }
      } catch (error) {
        console.error('Website data load failed:', error);
        if (mounted) {
          setStatus({ type: 'error', message: 'Web sitesi içeriği yüklenemedi. Varsayılan içerik kullanılıyor.' });
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiFetch]);

  const galleryPayload = useMemo(() => {
    return galleryImages.
      filter((item) => Boolean(item.imageUrl)).
      map((item, index) => ({
        imageUrl: item.imageUrl!,
        altText: item.label,
        displayOrder: index,
        categoryId: item.categoryId || null
      }));
  }, [galleryImages]);

  const filteredGallery = useMemo(() => {
    if (selectedCategoryId === null) {
      return galleryImages;
    }
    return galleryImages.filter(img => img.categoryId === selectedCategoryId || (!img.imageUrl && !img.emoji));
  }, [galleryImages, selectedCategoryId]);

  const handleGenerate = async () => {
    setStatus(null);
    setIsGenerating(true);

    try {
      const result = await apiFetch<{ generated: { heroText: string; tagline: string; description: string; }; }>(
        '/api/admin/website/generate',
        {
          method: 'POST',
          body: JSON.stringify({
            salonName,
            tagline,
            description,
            city: bootstrap?.salon?.city || null
          })
        }
      );

      setHeroText(result.generated.heroText);
      setTagline(result.generated.tagline);
      setDescription(result.generated.description);
      setStatus({ type: 'success', message: 'Yeni metin önerileri oluşturuldu.' });
    } catch (error) {
      console.warn('Website generate endpoint failed, using local fallback:', error);
      const fallback = buildLocalWebsiteCopy(salonName, bootstrap?.salon?.city || undefined);
      setHeroText(fallback.heroText);
      setTagline(fallback.tagline);
      setDescription(fallback.description);
      setStatus({ type: 'success', message: 'Yerel yedek metin önerileri oluşturuldu.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setStatus(null);
    setIsSaving(true);

    try {
      await apiFetch('/api/admin/website/content', {
        method: 'PUT',
        body: JSON.stringify({
          salonName,
          tagline,
          heroText,
          description,
          gallery: galleryPayload
        })
      });

      setStatus({ type: 'success', message: 'Web sitesi içeriği kaydedildi ve yayınlandı.' });
    } catch (error) {
      console.error('Website content save failed:', error);
      setStatus({ type: 'error', message: 'Kaydetme sırasında bir hata oluştu. Lütfen tekrar deneyin.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoSelected: ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return;
      }

      setGalleryImages((prev) => {
        const next = [...prev];
        const replaceIndex = next.findIndex((item) => !item.imageUrl && (item.categoryId === selectedCategoryId || (!item.categoryId && !selectedCategoryId)));

        const newImage: GalleryImageItem = {
          id: `local-${Date.now()}`,
          label: file.name.replace(/\.[^/.]+$/, ''),
          imageUrl: reader.result,
          categoryId: selectedCategoryId
        };

        if (replaceIndex >= 0) {
          next[replaceIndex] = newImage;
          return next;
        }

        if (next.length >= 24) {
          next[next.length - 1] = newImage;
          return next;
        }

        return [...next, newImage];
      });

      setStatus({ type: 'success', message: "Fotoğraf eklendi. Kaydet ile yayınlayabilirsiniz." });
    };
    reader.onerror = () => {
      setStatus({ type: 'error', message: 'Fotoğraf okunamadı.' });
    };

    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return (
    <div className="h-full pb-20">
      <div className="sticky top-0 bg-background z-10 border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--deep-indigo)]/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-[var(--deep-indigo)]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Web Sitesi Oluşturucu</h1>
              <p className="text-xs text-muted-foreground">Salon web sitenizi yönetin</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-500/20">
            Yayında
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-4">

          {status &&
            <div
              className={`rounded-lg border p-3 text-sm flex items-start gap-2 ${status.type === 'success' ?
                  'border-green-500/30 bg-green-500/10 text-green-700' :
                  'border-red-500/30 bg-red-500/10 text-red-700'}`
              }>

              {status.type === 'success' ? <Check className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
              <span>{status.message}</span>
            </div>
          }

          {isLoading &&
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
              Web sitesi içeriği yükleniyor...
            </div>
          }

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
                  placeholder="Salon adınız" />

              </div>
              <div className="relative">
                <label className="text-xs text-muted-foreground mb-1 block">Slogan</label>
                <div className="relative overflow-hidden rounded-lg">
                  <AnimatePresence mode="wait">
                    {isGenerating ? (
                      <motion.div
                        key="shimmer-tagline"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-[42px] w-full bg-muted/60 relative overflow-hidden"
                      >
                        <ShimmerOverlay />
                      </motion.div>
                    ) : (
                      <motion.div
                        key={tagline}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <input
                          value={tagline}
                          onChange={(e) => setTagline(e.target.value)}
                          className="w-full bg-muted/40 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--rose-gold)]/30 border border-border transition-all"
                          placeholder="Salonunuzun sloganı" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="relative">
                <label className="text-xs text-muted-foreground mb-1 block">Ana Başlık</label>
                <div className="relative overflow-hidden rounded-lg">
                  <AnimatePresence mode="wait">
                    {isGenerating ? (
                      <motion.div
                        key="shimmer-hero"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-[42px] w-full bg-muted/60 relative overflow-hidden"
                      >
                        <ShimmerOverlay />
                      </motion.div>
                    ) : (
                      <motion.div
                        key={heroText}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                      >
                        <input
                          value={heroText}
                          onChange={(e) => setHeroText(e.target.value)}
                          className="w-full bg-muted/40 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--rose-gold)]/30 border border-border transition-all"
                          placeholder="Ana sayfa başlığı" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="relative">
                <label className="text-xs text-muted-foreground mb-1 block">Açıklama</label>
                <div className="relative overflow-hidden rounded-lg">
                  <AnimatePresence mode="wait">
                    {isGenerating ? (
                      <motion.div
                        key="shimmer-desc"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-[80px] w-full bg-muted/60 relative overflow-hidden"
                      >
                        <ShimmerOverlay />
                      </motion.div>
                    ) : (
                      <motion.div
                        key={description}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                      >
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={3}
                          className="w-full bg-muted/40 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--rose-gold)]/30 border border-border transition-all resize-none"
                          placeholder="Salonunuzun kısa açıklaması" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </CardContent>
          </Card>

          <motion.div
            animate={isGenerating ? {
              boxShadow: [
                "0 0 0px 0px rgba(var(--rose-gold-rgb), 0)",
                "0 0 15px 2px rgba(var(--rose-gold-rgb), 0.3)",
                "0 0 0px 0px rgba(var(--rose-gold-rgb), 0)"
              ]
            } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
            className={`border rounded-xl transition-all ${isGenerating ? 'border-[var(--rose-gold)]/50 bg-[var(--rose-gold)]/5' : 'border-[var(--rose-gold)]/30 bg-gradient-to-r from-[var(--rose-gold)]/5 to-transparent'}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <motion.div 
                  animate={isGenerating ? { rotate: 360 } : {}}
                  transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                  className="w-10 h-10 rounded-xl bg-[var(--rose-gold)]/10 flex items-center justify-center"
                >
                  <Sparkles className={`w-5 h-5 text-[var(--rose-gold)] ${isGenerating ? 'animate-pulse' : ''}`} />
                </motion.div>
                <div className="flex-1">
                  <p className="text-sm font-medium">AI ile Üret</p>
                  <p className="text-xs text-muted-foreground">Profesyonel tanıtım metinleri üretin</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void handleGenerate();
                  }}
                  disabled={isGenerating}
                  className="px-3 py-1.5 bg-[var(--rose-gold)] text-white rounded-lg text-xs font-medium active:scale-95 transition-transform disabled:opacity-70 disabled:cursor-not-allowed shadow-sm flex items-center gap-2">

                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Üretiliyor...
                    </>
                  ) : 'Üret'}
                </button>
              </div>
            </CardContent>
          </motion.div>

          <Card className="border-border/50">
            <CardHeader className="pb-3 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Galeri Görselleri
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar">
                <button
                  onClick={() => setSelectedCategoryId(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                    selectedCategoryId === null ? 'bg-[var(--rose-gold)] text-white' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  }`}>
                  Genel
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                      selectedCategoryId === cat.id ? 'bg-[var(--rose-gold)] text-white' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                    }`}>
                    {cat.name}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-2 mb-3">
                {filteredGallery.map((img) =>
                  <div
                    key={img.id}
                    className="aspect-square rounded-lg bg-gradient-to-br from-[var(--rose-gold)]/10 to-[var(--deep-indigo)]/10 flex flex-col items-center justify-center border-2 border-[var(--rose-gold)]/20 overflow-hidden relative group">

                    {img.imageUrl ?
                      <>
                        <img src={img.imageUrl} alt={img.label} className="h-full w-full object-cover" />
                        <button 
                          onClick={() => setGalleryImages(prev => prev.filter(p => p.id !== img.id))}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          ×
                        </button>
                      </> :
                      <>
                        <span className="text-2xl">{img.emoji || '✨'}</span>
                        <span className="text-[9px] text-muted-foreground mt-1 text-center px-1 truncate w-full">{img.label}</span>
                      </>
                    }
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelected} />

              <button
                type="button"
                onClick={handleAddPhotoClick}
                className="w-full py-2.5 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground flex items-center justify-center gap-2 active:scale-95 transition-transform">

                <Camera className="w-4 h-4" />
                Fotoğraf Ekle
              </button>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                Seçili kategoriye göre fotoğraf ekleyebilirsiniz.
              </p>
            </CardContent>
          </Card>



          <button
            type="button"
            onClick={() => {
              void handleSave();
            }}
            disabled={isSaving}
            className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-98 bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)] text-white disabled:opacity-70 disabled:cursor-not-allowed">

            {isSaving ? "Kaydediliyor..." : "Değişiklikleri Kaydet ve Yayınla"}
          </button>
        </motion.div>
      </div>
    </div>);

}
