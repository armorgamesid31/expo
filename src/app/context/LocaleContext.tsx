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
  'Next Customer': 'Sonraki Musteri',
  "Today's Appointments": 'Bugunun Randevulari',
  "Today's Schedule": 'Bugunun Takvimi',
  'All mandatory steps completed!': 'Tum zorunlu adimlar tamamlandi!',
  'All Customers': 'Tum Musteriler',
  'Analytics Report': 'Analitik Raporu',
  'Search for customers...': 'Musteri ara...',
  'Recommendation:': 'Oneri:',
  'Call Customer': 'Musteriyi Ara',
  'Staff Performance': 'Personel Performansi',
  'Service Revenue Distribution': 'Hizmet Gelir Dagilimi',
  'Create a new appointment by selecting customer, service, and date': 'Musteri, hizmet ve tarih secerek yeni randevu olusturun',
  'Select Customer': 'Musteri Sec',
  'Search by name or phone...': 'Ad veya telefonla ara...',
  'Select Service': 'Hizmet Sec',
  'Create Appointment': 'Randevu Olustur',
  'Business details and working hours': 'Isletme bilgileri ve calisma saatleri',
  'Google Maps Business Link': 'Google Haritalar Isletme Baglantisi',
  'Saved!': 'Kaydedildi!',
  'Save Changes': 'Degisiklikleri Kaydet',
  'Edit Settings': 'Ayarlari Duzenle',
  'Send as Separate Message': 'Ayri Mesaj Olarak Gonder',
  'Go to WhatsApp Settings': 'WhatsApp Ayarlarina Git',
  'Conversation Analytics': 'Konusma Analitigi',
  'Recent Conversations': 'Son Konusmalar',
  'Agent Settings': 'Asistan Ayarlari',
  'Early Handover': 'Erken Devir',
  'Late Handover': 'Gec Devir',
  'Connection activity could not be updated.': 'Baglanti durumu guncellenemedi.',
  'Connection passive': 'Baglanti pasif',
  'Connection, AI agent, and reminder settings': 'Baglanti, AI asistan ve hatirlatma ayarlari',
  'Connection status': 'Baglanti durumu',
  'Connection completed': 'Baglanti tamamlandi',
  'Manage send steps for 2 and 24 hours before appointment.': 'Randevudan 2 ve 24 saat once gonderim adimlarini yonetin.',
  'Open Reminder Settings': 'Hatirlatma Ayarlarini Ac',
  'Open AI Agent Settings': 'AI Asistan Ayarlarini Ac',
  'Back to Settings': 'Ayarlara Don',
  All: 'Tumu',
  'Live Support': 'Canli Destek',
  'Send Email': 'E-posta Gonder',
  'Status could not be retrieved. Refresh the page.': 'Durum alinamadi. Sayfayi yenileyin.',
  'Connection process continues...': 'Baglanti sureci devam ediyor...',
  'WhatsApp Connection Health': 'WhatsApp Baglanti Durumu',
  'Loading live status...': 'Canli durum yukleniyor...',
  'Test Mode: Open AI Agent Screen': 'Test Modu: AI Asistan Ekranini Ac',
  'Test Mode: Continue as Connected': 'Test Modu: Bagli Olarak Devam Et',
  'Bring Your Friend Campaign': 'Arkadasini Getir Kampanyasi',
  'Invite a Friend': 'Arkadas Davet Et',
  'Campaign Name *': 'Kampanya Adi *',
  'Create Campaign': 'Kampanya Olustur',
  'Create Program': 'Program Olustur',
  'Campaign Status': 'Kampanya Durumu',
  'Create New Campaign': 'Yeni Kampanya Olustur',
  'Campaign Sent!': 'Kampanya Gonderildi!',
  'Campaign Details': 'Kampanya Detaylari',
  'Customer Segment': 'Musteri Segmenti',
  'Send Campaign': 'Kampanya Gonder',
  'Customer Segments': 'Musteri Segmentleri',
  'Campaign Performance': 'Kampanya Performansi',
  'Meta Direct Connection': 'Meta Direct Baglantisi',
  'Instagram Login onboarding for Instagram DM.': 'Instagram DM icin Instagram Login kurulum akisi.',
  'Instagram DM Connection': 'Instagram DM Baglantisi',
  'Connection Flow': 'Baglanti Akisi',
  'Staff Management': 'Personel Yonetimi',
  'Add First Staff Member': 'Ilk Personeli Ekle',
  'Edit Employee': 'Personeli Duzenle',
  'Add New Employee': 'Yeni Personel Ekle',
  'Team & Access': 'Ekip ve Yetkiler',
  'Manage team accounts and role-based access permissions.': 'Ekip hesaplarini ve rol bazli yetkileri yonetin.',
  'Team Users': 'Ekip Kullanicilari',
  'Create Team User': 'Ekip Kullanicisi Olustur',
  'Create User': 'Kullanici Olustur',
  'Team Members': 'Ekip Uyeleri',
  'Service unmatched': 'Hizmet eslesmedi',
  'Staff unmatched': 'Personel eslesmedi',
  'Refresh failed': 'Yenileme basarisiz',
  'Open conflicts:': 'Acik cakismalar:',
  'Package Management': 'Paket Yonetimi',
  'Edit Template': 'Sablonu Duzenle',
  'New Template': 'Yeni Sablon',
  'Cancel Edit': 'Duzenlemeyi Iptal Et',
  'Single Service': 'Tek Hizmet',
  'Add Service': 'Hizmet Ekle',
  'Update Template': 'Sablonu Guncelle',
  'Create Template': 'Sablon Olustur',
  'Loading templates...': 'Sablonlar yukleniyor...',
  'Customer phone number is mandatory.': 'Musteri telefon numarasi zorunludur.',
  'Customer name and phone are required.': 'Musteri adi ve telefon zorunludur.',
  'Loading schedule...': 'Takvim yukleniyor...',
  'Loading waitlist...': 'Bekleme listesi yukleniyor...',
  'Salon added': 'Salon ekledi',
  'Customer added': 'Musteri ekledi',
  'Working...': 'Isleniyor...',
  'Send Offer': 'Teklif Gonder',
  'Not recorded': 'Kayitli degil',
  'Complete & Payment': 'Tamamla ve Odeme Al',
  'Update Payment': 'Odemeyi Guncelle',
  'Complete & Checkout': 'Tamamla ve Odeme Islemi',
  'New Package Sale': 'Yeni Paket Satisi',
  'Package name': 'Paket adi',
  'Loading active packages...': 'Aktif paketler yukleniyor...',
  'Checkout Summary': 'Odeme Ozeti',
  'No conversation matches this filter.': 'Bu filtreye uygun konusma yok.',
  Linked: 'Bagli',
  Unlinked: 'Bagsiz',
  'Linked profile': 'Bagli profil',
  'Not linked': 'Bagli degil',
  'Resuming...': 'Devam ettiriliyor...',
  'Resume AI': 'AI Devam Ettir',
  'Requesting...': 'Talep gonderiliyor...',
  'Handover Active': 'Devir Aktif',
  'Request Handover': 'Devir Talep Et',
  'No messages in this conversation.': 'Bu konusmada mesaj yok.',
  System: 'Sistem',
  'Type a manual reply': 'Manuel yanit yazin',
  'Manual reply is available only for Instagram': 'Manuel yanit sadece Instagram icin kullanilabilir',
  'Sending...': 'Gonderiliyor...',
  Send: 'Gonder',
  'Select a conversation to view messages.': 'Mesajlari gormek icin bir konusma secin.',
};

function detectInitialLocale(): AppLocale {
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
  const dictionary = EN_TO_TR;
  return Object.entries(dictionary)
    .sort((a, b) => b[0].length - a[0].length)
    .map(([from, to]) => [new RegExp(escapeRegExp(from), 'gi'), to]);
}

function fixTurkishText(input: string): string {
  const replacements: Array<[RegExp, string]> = [
    [/\bYukleniyor\b/g, 'Yükleniyor'],
    [/\bIptal\b/g, 'İptal'],
    [/\bOneri\b/g, 'Öneri'],
    [/\bCikis\b/g, 'Çıkış'],
    [/\bKonusmalar\b/g, 'Konuşmalar'],
    [/\bKonusma\b/g, 'Konuşma'],
    [/\bOzellikler\b/g, 'Özellikler'],
    [/\bDuzenle\b/g, 'Düzenle'],
    [/\bOlustur\b/g, 'Oluştur'],
    [/\bGuncelle\b/g, 'Güncelle'],
    [/\bUyari\b/g, 'Uyarı'],
    [/\bIstege\b/g, 'İsteğe'],
    [/\bBagli\b/g, 'Bağlı'],
    [/\bDegil\b/g, 'Değil'],
    [/\bMusteri\b/g, 'Müşteri'],
    [/\bSure\b/g, 'Süre'],
    [/\bOdeme\b/g, 'Ödeme'],
    [/\bOdemeler\b/g, 'Ödemeler'],
    [/\bKullanilan\b/g, 'Kullanılan'],
    [/\bDus\b/g, 'Düş'],
    [/\bBol\b/g, 'Böl'],
    [/\bGelismis\b/g, 'Gelişmiş'],
    [/\bSali\b/g, 'Salı'],
    [/\bCarsamba\b/g, 'Çarşamba'],
    [/\bPersembe\b/g, 'Perşembe'],
    [/\bGiris\b/g, 'Giriş'],
    [/\bSifre\b/g, 'Şifre'],
    [/\bBasarisiz\b/g, 'Başarısız'],
    [/\bIsletme\b/g, 'İşletme'],
    [/\bKisisel\b/g, 'Kişisel'],
    [/\bSik\b/g, 'Sık'],
    [/\bTurkce\b/g, 'Türkçe'],
    [/\bIngilizce\b/g, 'İngilizce'],
    [/\bYonetim\b/g, 'Yönetim'],
    [/\bCalisma\b/g, 'Çalışma'],
    [/\bAyarlarini\b/g, 'Ayarlarını'],
    [/\bAciklama\b/g, 'Açıklama'],
    [/\bBaglanti\b/g, 'Bağlantı'],
    [/\bGonderim\b/g, 'Gönderim'],
    [/\bHatirlatma\b/g, 'Hatırlatma'],
    [/\bAsistani\b/g, 'Asistanı'],
    [/\bTum\b/g, 'Tüm'],
  ];

  let output = input;
  for (const [pattern, replacement] of replacements) {
    output = output.replace(pattern, replacement);
  }
  return output;
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

  if (locale === 'tr') {
    return fixTurkishText(output);
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
    setLocaleState('tr');
    void Preferences.set({ key: LOCALE_PREF_KEY, value: 'tr' });
  }, []);

  useEffect(() => {
    void Preferences.set({ key: LOCALE_PREF_KEY, value: locale });
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale: () => setLocaleState('tr'),
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
