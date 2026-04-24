import { MenuScreen } from '@/components/features/menu/MenuScreen';

const items = [
  {
    id: 'basic',
    title: 'Temel Bilgiler',
    description: 'Salon adý, iletiþim ve profil özetini yönetin.',
    href: '/(stack)/salon-info/basic',
  },
  {
    id: 'faq',
    title: 'Sýk Sorulan Sorular',
    description: 'Salon bilgi ekranýndaki SSS içeriðini güncelleyin.',
    href: '/(stack)/salon-info/faq',
  },
];

export default function SalonInfoScreen() {
  return <MenuScreen title="Salon Bilgileri" subtitle="Salon bilgi yönetimi" items={items} />;
}
