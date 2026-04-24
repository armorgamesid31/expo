import { MenuScreen } from '@/components/features/menu/MenuScreen';

const items = [
  {
    id: 'blacklist',
    title: 'Kara Liste',
    description: 'Yasaklı müşteri kayıtlarını görüntüle ve yönet.',
    href: '/(stack)/blacklist',
  },
  {
    id: 'attendance-settings',
    title: 'Randevu İhlali',
    description: 'İhlal sayımı ve yaptırım kurallarını düzenle.',
    href: '/(tabs)/customers/attendance-settings',
  },
];

export default function RiskMenuPage() {
  return <MenuScreen title="Risk ve Yasaklama" subtitle="Risk merkezi" items={items} />;
}
