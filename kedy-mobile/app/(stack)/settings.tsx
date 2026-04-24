import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, ChevronRight, HelpCircle, Palette, Shield, Smartphone, UserRound } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Switch } from '@/components/ui/Switch';
import { useAuth } from '@/providers/AuthProvider';
import { Pressable, Text, View } from '@/tw';

type SettingsBootstrap = {
  user?: { name?: string; role?: string };
  salon?: { name?: string };
  permissions?: string[];
};

type SettingsItem = {
  key: string;
  label: string;
  sub: string;
  href?: string;
  icon: 'bell' | 'shield' | 'user' | 'phone' | 'help' | 'palette';
  isThemeToggle?: boolean;
};

type SettingsGroup = {
  title: string;
  items: SettingsItem[];
};

const settingGroups: SettingsGroup[] = [
  {
    title: 'Hesap ve İşletme',
    items: [
      {
        key: 'profile',
        label: 'Profil Bilgileri',
        sub: 'Kişisel bilgiler ve fotoğraf',
        href: '/(stack)/salon-info/basic',
        icon: 'user',
      },
      {
        key: 'appearance',
        label: 'Görünüm',
        sub: 'Tema ve yazı tipi',
        icon: 'palette',
        isThemeToggle: true,
      },
      {
        key: 'security',
        label: 'Güvenlik',
        sub: 'Şifre ve iki aşamalı doğrulama',
        href: '/(stack)/team/access',
        icon: 'shield',
      },
    ],
  },
  {
    title: 'Bildirimler',
    items: [
      {
        key: 'notification-inbox',
        label: 'Bildirim Kutusu',
        sub: 'Uygulama içi uyarılar',
        href: '/(stack)/notifications',
        icon: 'bell',
      },
      {
        key: 'notification-settings',
        label: 'Bildirim Ayarları',
        sub: 'Push ve olay tercihleri',
        href: '/(stack)/notifications/settings',
        icon: 'phone',
      },
    ],
  },
  {
    title: 'Destek ve Gizlilik',
    items: [
      {
        key: 'help-center',
        label: 'Yardım Merkezi',
        sub: 'Sık sorulan sorular',
        href: '/(stack)/salon-info/faq',
        icon: 'help',
      },
      {
        key: 'delete-account',
        label: 'Hesabımı Sil',
        sub: 'Verilerinizi kalıcı olarak temizleyin',
        icon: 'shield',
      },
    ],
  },
];

function renderRowIcon(icon: SettingsItem['icon']) {
  if (icon === 'bell') return <Bell size={18} color="#B76E79" />;
  if (icon === 'phone') return <Smartphone size={18} color="#B76E79" />;
  if (icon === 'help') return <HelpCircle size={18} color="#4F46E5" />;
  if (icon === 'palette') return <Palette size={18} color="#4F46E5" />;
  if (icon === 'shield') return <Shield size={18} color="#4F46E5" />;
  return <UserRound size={18} color="#B76E79" />;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { apiFetch, bootstrap, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['settings-bootstrap'],
    retry: 1,
    queryFn: async () => apiFetch<SettingsBootstrap>('/api/mobile/bootstrap', { method: 'GET' }),
  });

  const effective = data ?? bootstrap ?? null;

  const userRole = useMemo(() => effective?.user?.role || '-', [effective]);
  const userName = useMemo(() => effective?.user?.name || '-', [effective]);
  const salonName = useMemo(() => effective?.salon?.name || '-', [effective]);
  const permissionCount = useMemo(() => effective?.permissions?.length ?? 0, [effective]);

  return (
    <Screen title="Ayarlar" subtitle="Uygulama tercihlerinizi yönetin">
      {isLoading ? <Text className="text-sm text-muted-foreground">Yükleniyor...</Text> : null}
      {isError ? (
        <Card>
          <Text className="mb-3 text-sm text-destructive">Ayar özeti alınamadı.</Text>
          <Button title="Tekrar Dene" variant="outline" onPress={() => void refetch()} />
        </Card>
      ) : null}

      <Card>
        <View className="gap-2">
          <Text className="text-base font-semibold text-foreground">Hesap Özeti</Text>
          <Text className="text-sm text-muted-foreground">Kullanıcı: {userName}</Text>
          <Text className="text-sm text-muted-foreground">Rol: {userRole}</Text>
          <Text className="text-sm text-muted-foreground">Salon: {salonName}</Text>
          <Text className="text-sm text-muted-foreground">Yetki sayısı: {permissionCount}</Text>
        </View>
      </Card>

      {settingGroups.map((group) => (
        <View key={group.title} className="gap-2">
          <Text className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.title}</Text>
          <Card>
            <View className="gap-1">
              {group.items.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    if (item.isThemeToggle) {
                      setDarkMode((prev) => !prev);
                      return;
                    }
                    if (item.href) {
                      router.push(item.href as never);
                    }
                  }}
                  className="active:opacity-90">
                  <View className="flex-row items-center gap-3 rounded-xl px-2 py-2.5">
                    <View className="h-9 w-9 items-center justify-center rounded-lg bg-muted/50">{renderRowIcon(item.icon)}</View>
                    <View className="flex-1 gap-0.5">
                      <Text className="text-sm font-semibold text-foreground">{item.label}</Text>
                      <Text className="text-xs text-muted-foreground">{item.sub}</Text>
                    </View>
                    {item.isThemeToggle ? <Switch value={darkMode} onValueChange={setDarkMode} /> : <ChevronRight size={16} color="#71717A" />}
                  </View>
                </Pressable>
              ))}
            </View>
          </Card>
        </View>
      ))}

      <Button title="Çıkış Yap" variant="outline" onPress={() => void logout()} />
      <Text className="text-xs text-muted-foreground">Salon OS Enterprise v3.2.0</Text>
      <Text className="text-xs text-muted-foreground/70">Geliştirici: Figma Make AI</Text>
    </Screen>
  );
}
