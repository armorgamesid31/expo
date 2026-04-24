import { MenuScreen } from '@/components/features/menu/MenuScreen';

const items = [
  {
    id: 'blacklist',
    title: 'Kara Liste',
    description: 'Yasaklý müþteri kayýtlarýný görüntüleyin ve yönetin.',
    href: '/(stack)/blacklist',
  },
  {
    id: 'attendance-settings',
    title: 'Randevu Ýhlali',
    description: 'Ýhlal sayýmý ve yaptýrým kurallarýný düzenleyin.',
    href: '/(tabs)/customers/attendance-settings',
  },
];

export default function RiskMenuPage() {
  return <MenuScreen title="Risk ve Yasaklama" subtitle="Risk merkezi" items={items} />;
}
