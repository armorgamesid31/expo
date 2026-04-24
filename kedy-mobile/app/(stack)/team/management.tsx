import { MenuScreen } from '@/components/features/menu/MenuScreen';

const items = [
  {
    id: 'staff',
    title: 'Personel Yönetimi',
    description: 'Personel profillerini ve görev daðýlýmlarýný yönetin.',
    href: '/(stack)/staff',
  },
  {
    id: 'access',
    title: 'Ekip ve Yetki',
    description: 'Rol ve eriþim izinlerini düzenleyin.',
    href: '/(stack)/team/access',
  },
  {
    id: 'time-off',
    title: 'Tatil ve Ýzin Yönetimi',
    description: 'Salon tatilleri ve ekip izinleri takibini açýn.',
    href: '/(stack)/team/time-off',
  },
];

export default function TeamManagementScreen() {
  return <MenuScreen title="Ekip Yönetimi" subtitle="Ekip operasyon menüsü" items={items} />;
}
