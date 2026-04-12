import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';

type AppLocale = 'tr' | 'en';

interface LocaleContextValue {
  locale: AppLocale;
  setLocale: (next: AppLocale) => void;
}

const LOCALE_PREF_KEY = 'kedy.mobile.locale';

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

const EN_TO_TR: Record<string, string> = {
  'Loading...': 'Yukleniyor...',
  Loading: 'Yukleniyor',
  Back: 'Geri',
  Logout: 'Cikis',
  'Log Out': 'Cikis Yap',
  Home: 'Ana Sayfa',
  Dashboard: 'Panel',
  Appointments: 'Randevular',
  Conversations: 'Konusmalar',
  Conversation: 'Konusma',
  Features: 'Ozellikler',
  Settings: 'Ayarlar',
  Profile: 'Profil',
  Search: 'Ara',
  Filter: 'Filtre',
  Clear: 'Temizle',
  Save: 'Kaydet',
  Cancel: 'Iptal',
  Confirm: 'Onayla',
  Continue: 'Devam Et',
  Delete: 'Sil',
  Edit: 'Duzenle',
  Add: 'Ekle',
  Remove: 'Kaldir',
  Create: 'Olustur',
  Update: 'Guncelle',
  Retry: 'Tekrar Dene',
  Success: 'Basarili',
  Error: 'Hata',
  Warning: 'Uyari',
  Optional: 'Istege Bagli',
  Required: 'Zorunlu',
  Name: 'Ad',
  Description: 'Aciklama',
  Status: 'Durum',
  Active: 'Aktif',
  Inactive: 'Pasif',
  Enabled: 'Etkin',
  Disabled: 'Devre Disi',
  Connect: 'Baglan',
  Connected: 'Bagli',
  Disconnected: 'Bagli Degil',
  Reconnect: 'Yeniden Baglan',
  Disconnect: 'Baglantiyi Kes',
  Connection: 'Baglanti',
  Sync: 'Esitle',
  'Last sync': 'Son esitleme',
  'Not connected': 'Bagli Degil',
  'No data': 'Veri yok',
  'No conversations yet': 'Henuz konusma yok',
  'No appointments found': 'Randevu bulunamadi',
  'No customers found': 'Musteri bulunamadi',
  Customer: 'Musteri',
  Customers: 'Musteriler',
  Service: 'Hizmet',
  Services: 'Hizmetler',
  Staff: 'Personel',
  Employee: 'Personel',
  Employees: 'Personeller',
  Specialist: 'Uzman',
  Specialists: 'Uzmanlar',
  Category: 'Kategori',
  Categories: 'Kategoriler',
  Price: 'Fiyat',
  Duration: 'Sure',
  Notes: 'Notlar',
  Phone: 'Telefon',
  Email: 'E-posta',
  Address: 'Adres',
  Date: 'Tarih',
  Time: 'Saat',
  Start: 'Baslangic',
  End: 'Bitis',
  'Start time': 'Baslangic saati',
  'End time': 'Bitis saati',
  Total: 'Toplam',
  Subtotal: 'Ara toplam',
  Payment: 'Odeme',
  Payments: 'Odemeler',
  Checkout: 'Odeme Islemi',
  Cash: 'Nakit',
  Card: 'Kart',
  Transfer: 'Havale/EFT',
  Other: 'Diger',
  Package: 'Paket',
  Packages: 'Paketler',
  Quota: 'Hak',
  Remaining: 'Kalan',
  Used: 'Kullanilan',
  'Use package': 'Paketten Dus',
  'Sell package': 'Paket Sat',
  'Single payment': 'Tekil Odeme',
  Group: 'Grup',
  Split: 'Bol',
  Advanced: 'Gelismis',
  'Advanced split': 'Gelismis bolme',
  New: 'Yeni',
  'New package': 'Yeni paket',
  Existing: 'Mevcut',
  'Existing package': 'Mevcut paket',
  'All services': 'Tum hizmetler',
  'Business hours': 'Calisma saatleri',
  Monday: 'Pazartesi',
  Tuesday: 'Sali',
  Wednesday: 'Carsamba',
  Thursday: 'Persembe',
  Friday: 'Cuma',
  Saturday: 'Cumartesi',
  Sunday: 'Pazar',
  'Salon Mobile Login': 'Salon Mobil Giris',
  'Sign in with your account.': 'Hesabinizla giris yapin.',
  'Forgot password?': 'Sifremi unuttum?',
  Password: 'Sifre',
  Username: 'Kullanici adi',
  'Logging in...': 'Giris yapiliyor...',
  Login: 'Giris Yap',
  'Login failed.': 'Giris basarisiz.',
  'Try again': 'Tekrar dene',
  'Manage your app preferences': 'Uygulama tercihlerinizi yonetin',
  'Account & Business': 'Hesap ve Isletme',
  'Profile Information': 'Profil Bilgileri',
  'Personal details and photo': 'Kisisel bilgiler ve fotograf',
  Appearance: 'Gorunum',
  'Theme and font': 'Tema ve yazi tipi',
  Security: 'Guvenlik',
  'Password and two-step verification': 'Sifre ve iki adimli dogrulama',
  Notifications: 'Bildirimler',
  'Appointment Reminders': 'Randevu Hatirlaticilari',
  'WhatsApp notifications': 'WhatsApp bildirimleri',
  'Push Notifications': 'Anlik Bildirimler',
  'In-app alerts': 'Uygulama ici uyari',
  Support: 'Destek',
  'Help Center': 'Yardim Merkezi',
  'Frequently asked questions': 'Sik sorulan sorular',
  Language: 'Dil',
  'App language': 'Uygulama dili',
  Turkish: 'Turkce',
  English: 'Ingilizce',
  'Change language': 'Dili degistir',
  'Management tools and advanced modules': 'Yonetim araclari ve gelismis moduller',
  'Management Tools': 'Yonetim Araclari',
  'Advanced Modules': 'Gelismis Moduller',
  'Service Management': 'Hizmet Yonetimi',
  'Services and categories': 'Hizmetler ve kategoriler',
  'Employee Management': 'Personel Yonetimi',
  'Salon Information': 'Salon Bilgileri',
  'Business details and hours': 'Isletme bilgileri ve saatler',
  'Customer Management': 'Musteri Yonetimi',
  'CRM profiles + attendance tracking': 'CRM profilleri + katilim takibi',
  Analytics: 'Analitik',
  Inventory: 'Envanter',
  'Instagram Inbox': 'Instagram Gelen Kutusu',
  Instagram: 'Instagram',
  WhatsApp: 'WhatsApp',
  'Instagram connection': 'Instagram baglantisi',
  'WhatsApp connection': 'WhatsApp baglantisi',
  'Connect Instagram': 'Instagram bagla',
  'Connect WhatsApp': 'WhatsApp bagla',
  'Reconnect Instagram': 'Instagrami yeniden bagla',
  'Reconnect WhatsApp': 'WhatsAppi yeniden bagla',
  'Disconnect Instagram': 'Instagram baglantisini kes',
  'Disconnect WhatsApp': 'WhatsApp baglantisini kes',
  'Account changed': 'Hesap degisti',
  'Number changed': 'Numara degisti',
  'Replace connection': 'Baglantiyi degistir',
  'Connection settings': 'Baglanti ayarlari',
  'Conversation center + manual handover': 'Konusma merkezi + manuel devir',
  'Meta Direct': 'Meta Direct',
  'Instagram DM connection and management': 'Instagram DM baglanti ve yonetimi',
  'Website Settings': 'Web Sitesi Ayarlari',
  'Online booking site management': 'Online rezervasyon sitesi yonetimi',
  Campaigns: 'Kampanyalar',
  'Loyalty and referral programs': 'Sadakat ve referans programlari',
  'Salon Owner': 'Salon Sahibi',
  'Premium Plan': 'Premium Plan',
  Close: 'Kapat',
  Today: 'Bugun',
  Completed: 'Tamamlandi',
  Pending: 'Beklemede',
  Cancelled: 'Iptal edildi',
  Confirmed: 'Onaylandi',
  'In progress': 'Devam ediyor',
  Scheduled: 'Planlandi',
  Upcoming: 'Yaklasan',
  Previous: 'Onceki',
  Next: 'Sonraki',
  More: 'Daha Fazla',
  'View all': 'Tumunu gor',
  'Open settings': 'Ayarlari ac',
  'Go to settings': 'Ayarlara git',
  'Try setup': 'Kuruluma git',
  'Set up now': 'Simdi kur',
  'Not available': 'Mevcut degil',
  'Coming soon': 'Yakin zamanda',
  'Something went wrong': 'Bir seyler ters gitti',
  'Please try again later.': 'Lutfen daha sonra tekrar deneyin.',
};

const TR_TO_EN = Object.fromEntries(
  Object.entries(EN_TO_TR).map(([key, value]) => [value, key]),
) as Record<string, string>;

function detectInitialLocale(): AppLocale {
  // Product decision: Turkish-first rollout.
  return 'tr';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const textNodeSource = new WeakMap<Text, string>();
const attrSource = new WeakMap<Element, Map<string, string>>();

function setOriginalAttr(element: Element, attr: string, value: string) {
  let map = attrSource.get(element);
  if (!map) {
    map = new Map<string, string>();
    attrSource.set(element, map);
  }
  if (!map.has(attr)) {
    map.set(attr, value);
  }
}

function buildMatcherMap(locale: AppLocale): [RegExp, string][] {
  const dictionary = locale === 'tr' ? EN_TO_TR : TR_TO_EN;
  return Object.entries(dictionary)
    .sort((a, b) => b[0].length - a[0].length)
    .map(([from, to]) => [new RegExp(escapeRegExp(from), 'g'), to]);
}

function translateTextValue(input: string, locale: AppLocale): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return input;
  }

  let output = input;
  const rules = buildMatcherMap(locale);
  for (const [pattern, replacement] of rules) {
    output = output.replace(pattern, replacement);
  }

  return output;
}

function translateElementTree(root: ParentNode, locale: AppLocale): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode() as Text | null;

  while (textNode) {
    const original = textNodeSource.get(textNode) ?? textNode.nodeValue ?? '';
    if (!textNodeSource.has(textNode)) {
      textNodeSource.set(textNode, original);
    }
    const translated = translateTextValue(original, locale);
    if (translated !== textNode.nodeValue) {
      textNode.nodeValue = translated;
    }
    textNode = walker.nextNode() as Text | null;
  }

  const elements = root instanceof Element ? [root, ...Array.from(root.querySelectorAll('*'))] : [];
  for (const element of elements) {
    for (const attr of ['placeholder', 'aria-label', 'title']) {
      const current = element.getAttribute(attr);
      if (!current) {
        continue;
      }
      setOriginalAttr(element, attr, current);
      const source = attrSource.get(element)?.get(attr) ?? current;
      const translated = translateTextValue(source, locale);
      if (translated !== current) {
        element.setAttribute(attr, translated);
      }
    }
  }
}

function LocaleDomTranslator({ locale }: { locale: AppLocale }) {
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.lang = locale;
    translateElementTree(document.body, locale);

    observerRef.current?.disconnect();
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              const textNode = node as Text;
              const original = textNodeSource.get(textNode) ?? textNode.nodeValue ?? '';
              if (!textNodeSource.has(textNode)) {
                textNodeSource.set(textNode, original);
              }
              textNode.nodeValue = translateTextValue(original, locale);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              translateElementTree(node as Element, locale);
            }
          });
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    observerRef.current = observer;
    return () => observer.disconnect();
  }, [locale]);

  return null;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(detectInitialLocale());

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const stored = await Preferences.get({ key: LOCALE_PREF_KEY });
        const savedLocale = stored.value === 'tr' || stored.value === 'en' ? stored.value : null;
        // Force Turkish as default even when legacy stored value is "en".
        const nextLocale = (savedLocale === 'tr' ? 'tr' : detectInitialLocale()) as AppLocale;
        if (mounted) {
          setLocaleState(nextLocale);
        }
      } catch {
        if (mounted) {
          setLocaleState(detectInitialLocale());
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    void Preferences.set({ key: LOCALE_PREF_KEY, value: locale });
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale: (next) => setLocaleState(next),
    }),
    [locale],
  );

  return (
    <LocaleContext.Provider value={value}>
      <LocaleDomTranslator locale={locale} />
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
}
