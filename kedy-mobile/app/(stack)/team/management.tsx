import { MenuScreen } from '@/components/features/menu/MenuScreen';

const items = [
  {
    id: 'staff',
    title: 'Personel Yönetimi',
    description: 'Personel profilleri, atamalar ve hizmet yetkileri.',
    href: '/(stack)/staff',
  },
  {
    id: 'access',
    title: 'Ekip ve Yetki',
    description: 'Ekip kullanıcı hesapları, roller ve yetkiler.',
    href: '/(stack)/team/access',
  },
  {
    id: 'time-off',
    title: 'Tatil ve İzin Yönetimi',
    description: 'Salon tatilleri ve personel izin tarihleri.',
    href: '/(stack)/team/time-off',
  },
];

export default function TeamManagementScreen() {
  return <MenuScreen title="Ekip Yönetimi" subtitle="Ekip kullanıcıları, roller ve izinler" items={items} />;
}
