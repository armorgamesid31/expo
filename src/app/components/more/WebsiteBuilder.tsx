import { useEffect, useMemo, useRef, useState, type ChangeEventHandler } from 'react';
import { ArrowLeft, Globe, Instagram, MessageCircle, Camera, Check, Sparkles, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';

interface WebsiteBuilderProps {
  onGeri: () => void;
}

interface GalleryImageItem {
  id: string;
  label: string;
  imageUrl?: string;
  emoji?: string;
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
  }>;
}

const defaultGalleryImages: GalleryImageItem[] = [
  { id: 'seed-1', label: 'Hair Coloring', emoji: '💇‍♀️' },
  { id: 'seed-2', label: 'Manicure', emoji: '💅' },
  { id: 'seed-3', label: 'Skin Care', emoji: '✨' },
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
  const city = cityHint?.trim() || 'in your city';

  return {
    heroText: `${salonName} take care of yourself with`,
    tagline: `${city} professional beauty experience`,
    description:
      `${salonName}, with its expert team hair, skin, and care delivers reliable results in its services. ` +
      'The hygienic salon environment turns every visit into a pleasant experience with quality products and personalized touches.'
  };
}

export function WebsiteBuilder({ onGeri }: WebsiteBuilderProps) {
  const { apiFetch, bootstrap } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string; } | null>(null);

  const [salonName, setSalonName] = useState('Beauté Salon');
  const [tagline, setTagline] = useState('Discover Your Beauty');
  const [description, setDescription] = useState(
    "A special beauty experience where luxury and comfort meet in the heart of Istanbul. Feel special with our expert team."
  );
  const [instagram, setInstagram] = useState('@beautesalon');
  const [whatsapp, setWhatsapp] = useState('+90 532 123 4567');
  const [heroText, setHeroText] = useState('Professional Care, Personal Touch');
  const [galleryImages, setGalleryImages] = useState<GalleryImageItem[]>(defaultGalleryImages);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const response = await apiFetch<WebsiteContentResponse>('/api/admin/website/content');

        if (!mounted) {
          return;
        }

        setSalonName(response.salon.name || bootstrap?.salon?.name || salonName);
        setTagline(response.salon.tagline || 'Discover Your Beauty');
        setHeroText(response.salon.heroText || response.salon.tagline || 'Professional Care, Personal Touch');
        setDescription(response.salon.about || description);
        setInstagram(response.salon.instagramUrl || '@beautesalon');
        setWhatsapp(response.salon.whatsappPhone || '+90 532 123 4567');

        if (response.gallery.length > 0) {
          setGalleryImages(
            response.gallery.map((image) => ({
              id: `db-${image.id}`,
              label: image.altText || 'Hall Image',
              imageUrl: image.imageUrl
            }))
          );
        } else {
          setGalleryImages(defaultGalleryImages);
        }
      } catch (error) {
        console.error('Website content load failed:', error);
        if (mounted) {
          setStatus({ type: 'error', message: 'The website content could not be loaded. Default content is used.' });
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
        displayOrder: index
      }));
  }, [galleryImages]);

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
      setStatus({ type: 'success', message: 'New text suggestions were produced.' });
    } catch (error) {
      console.warn('Website generate endpoint failed, using local fallback:', error);
      const fallback = buildLocalWebsiteCopy(salonName, bootstrap?.salon?.city || undefined);
      setHeroText(fallback.heroText);
      setTagline(fallback.tagline);
      setDescription(fallback.description);
      setStatus({ type: 'success', message: 'Local replacement text suggestions were generated.' });
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
          instagram: normalizeInstagram(instagram),
          whatsapp,
          gallery: galleryPayload
        })
      });

      setStatus({ type: 'success', message: 'Website content has been saved and published.' });
    } catch (error) {
      console.error('Website content save failed:', error);
      setStatus({ type: 'error', message: 'An error occurred during saveme. Please try again.' });
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
        const replaceIndex = next.findIndex((item) => !item.imageUrl);

        const newImage: GalleryImageItem = {
          id: `local-${Date.now()}`,
          label: file.name.replace(/\.[^/.]+$/, ''),
          imageUrl: reader.result
        };

        if (replaceIndex >= 0) {
          next[replaceIndex] = newImage;
          return next;
        }

        if (next.length >= 8) {
          next[next.length - 1] = newImage;
          return next;
        }

        return [...next, newImage];
      });

      setStatus({ type: 'success', message: "Fotoğraf eklendi. Kaydet ile yayınlayabilirsiniz." });
    };
    reader.onerror = () => {
      setStatus({ type: 'error', message: 'The photo could not be read.' });
    };

    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return (
    <div className="h-full pb-20">
      <div className="sticky top-0 bg-background z-10 border-b border-border p-4">
        <button onClick={onGeri} className="flex items-center gap-2 text-muted-foreground mb-3 active:opacity-70">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Geri</span>
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--deep-indigo)]/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-[var(--deep-indigo)]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Website Builder</h1>
              <p className="text-xs text-muted-foreground">Salon web sitenizi yönetin</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-500/20">
            Live
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
                <label className="text-xs text-muted-foreground mb-1 block">Salon Name</label>
                <input
                  value={salonName}
                  onChange={(e) => setSalonName(e.target.value)}
                  className="w-full bg-muted/40 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--rose-gold)]/30 border border-border transition-all"
                  placeholder="Salon adınız" />

              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Slogan</label>
                <input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full bg-muted/40 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--rose-gold)]/30 border border-border transition-all"
                  placeholder="Salonunuzun sloganı" />

              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Hero Title</label>
                <input
                  value={heroText}
                  onChange={(e) => setHeroText(e.target.value)}
                  className="w-full bg-muted/40 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--rose-gold)]/30 border border-border transition-all"
                  placeholder="Ana sayfa başlığı" />

              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-muted/40 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--rose-gold)]/30 border border-border transition-all resize-none"
                  placeholder="Salonunuzun kısa açıklaması" />

              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Sosyal Medya ve İletişim</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5 block">
                  <Instagram className="w-3.5 h-3.5 text-pink-500" />
                  Instagram Account
                </label>
                <input
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="w-full bg-muted/40 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--rose-gold)]/30 border border-border transition-all"
                  placeholder="@kullanıcı_adi" />

              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5 block">
                  <MessageCircle className="w-3.5 h-3.5 text-green-500" />
                  WhatsApp Number
                </label>
                <input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full bg-muted/40 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--rose-gold)]/30 border border-border transition-all"
                  placeholder="+90 5xx xxx xxxx" />

              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Gallery Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {galleryImages.map((img) =>
                  <div
                    key={img.id}
                    className="aspect-square rounded-lg bg-gradient-to-br from-[var(--rose-gold)]/10 to-[var(--deep-indigo)]/10 flex flex-col items-center justify-center border-2 border-[var(--rose-gold)]/20 overflow-hidden">

                    {img.imageUrl ?
                      <img src={img.imageUrl} alt={img.label} className="h-full w-full object-cover" /> :

                      <>
                        <span className="text-2xl">{img.emoji || '✨'}</span>
                        <span className="text-[9px] text-muted-foreground mt-1">{img.label}</span>
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
            </CardContent>
          </Card>

          <Card className="border-[var(--rose-gold)]/30 bg-gradient-to-r from-[var(--rose-gold)]/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--rose-gold)]/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[var(--rose-gold)]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Generate Content with AI</p>
                  <p className="text-xs text-muted-foreground">Generate automatic text for your salon</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void handleGenerate();
                  }}
                  disabled={isGenerating}
                  className="px-3 py-1.5 bg-[var(--rose-gold)] text-white rounded-lg text-xs font-medium active:scale-95 transition-transform disabled:opacity-70 disabled:cursor-not-allowed">

                  {isGenerating ? 'Being produced...' : 'produce'}
                </button>
              </div>
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