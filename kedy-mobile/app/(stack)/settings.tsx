import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/providers/AuthProvider';
import { Pressable, Text, View } from '@/tw';

type SettingsBootstrap = {
  user?: { name?: string; role?: string };
  salon?: { name?: string };
  permissions?: string[];
};

const links = [
  { label: 'Notifications Inbox', href: '/(stack)/notifications' },
  { label: 'Notification Settings', href: '/(stack)/notifications/settings' },
  { label: 'Notification Role Matrix', href: '/(stack)/notifications/role-matrix' },
  { label: 'Team Access', href: '/(stack)/team/access' },
  { label: 'Team Management', href: '/(stack)/team/management' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { apiFetch, bootstrap } = useAuth();

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
    <Screen title="Settings" subtitle="Minimum usable yönetim ve bildirim ayarları">
      {isLoading ? <Text className="text-sm text-muted-foreground">Yükleniyor...</Text> : null}
      {isError ? (
        <Card>
          <Text className="mb-3 text-sm text-destructive">Ayarlar özeti alınamadı.</Text>
          <Button title="Tekrar Dene" variant="outline" onPress={() => void refetch()} />
        </Card>
      ) : null}

      <Card>
        <Text className="text-base font-semibold text-foreground">Hesap Özeti</Text>
        <View className="mt-3 gap-1">
          <Text className="text-sm text-muted-foreground">Kullanıcı: {userName}</Text>
          <Text className="text-sm text-muted-foreground">Rol: {userRole}</Text>
          <Text className="text-sm text-muted-foreground">Salon: {salonName}</Text>
          <Text className="text-sm text-muted-foreground">Yetki sayısı: {permissionCount}</Text>
        </View>
      </Card>

      {links.map((item) => (
        <Pressable key={item.href} onPress={() => router.push(item.href as never)}>
          <Card>
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-foreground">{item.label}</Text>
              <Text className="text-sm text-muted-foreground">Aç</Text>
            </View>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
