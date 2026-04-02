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
  'Back': 'Geri',
  Logout: 'Cikis',
  Home: 'Ana Sayfa',
  Appointments: 'Randevular',
  Conversations: 'Konusmalar',
  Features: 'Ozellikler',
  Settings: 'Ayarlar',
  'Salon Mobile Login': 'Salon Mobil Giris',
  'Sign in with your account.': 'Hesabinizla giris yapin.',
  Password: 'Sifre',
  'Logging in...': 'Giris yapiliyor...',
  Login: 'Giris Yap',
  'Login failed.': 'Giris basarisiz.',
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
  'Log Out': 'Cikis Yap',
  Language: 'Dil',
  'App language': 'Uygulama dili',
  Turkish: 'Turkce',
  English: 'Ingilizce',
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
  Scheduled: 'Planlandi',
  Previous: 'Onceki',
  Next: 'Sonraki',
  More: 'Daha Fazla',
};

const TR_TO_EN = Object.fromEntries(
  Object.entries(EN_TO_TR).map(([key, value]) => [value, key]),
) as Record<string, string>;

function detectInitialLocale(): AppLocale {
  if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('tr')) {
    return 'tr';
  }
  return 'en';
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
  const [locale, setLocaleState] = useState<AppLocale>('tr');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await Preferences.get({ key: LOCALE_PREF_KEY });
      if (!mounted) {
        return;
      }
      if (saved.value === 'tr' || saved.value === 'en') {
        setLocaleState(saved.value);
        return;
      }
      setLocaleState(detectInitialLocale());
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
      setLocale: (next: AppLocale) => setLocaleState(next),
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
