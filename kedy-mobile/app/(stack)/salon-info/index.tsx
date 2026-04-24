import { MenuScreen } from '@/components/features/menu/MenuScreen';

const items = [
  {
    id: 'basic',
    title: 'Temel Bilgiler',
    description: 'Salon kimliği, adres, iletişim ve çalışma saatleri.',
    href: '/(stack)/salon-info/basic',
  },
  {
    id: 'faq',
    title: 'Sık Sorulan Sorular',
    description: 'Müşterilerin sık sorduğu sorular için hazır cevaplar.',
    href: '/(stack)/salon-info/faq',
  },
];

export default function SalonInfoScreen() {
  return <MenuScreen title="Salon Bilgileri" subtitle="Salon kimliği ve içerik yönetimi" items={items} />;
}
