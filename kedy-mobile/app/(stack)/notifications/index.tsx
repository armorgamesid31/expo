import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FlatList, RefreshControl } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/providers/AuthProvider';
import { Text, View } from '@/tw';

type NotificationApiItem = {
  id?: number | string;
  deliveryId?: number;
  notificationId?: number;
  title?: string;
  body?: string;
  createdAt?: string;
  deliveryCreatedAt?: string;
  status?: string;
  readAt?: string | null;
  isRead?: boolean;
};

type NotificationsResponse = {
  items: NotificationApiItem[];
};

const NOTIFICATIONS_ENDPOINT = '/api/mobile/notifications?limit=30';

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
};

function getResponseItems(payload: unknown, endpoint: string): NotificationApiItem[] {
  const items = (payload as { items?: unknown } | null | undefined)?.items;
  if (!Array.isArray(items)) {
    throw new Error(`Unexpected response shape from ${endpoint}: expected { items: [] }`);
  }
  return items as NotificationApiItem[];
}

function formatTs(ts: string) {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return ts;
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function NotificationsInboxScreen() {
  const { apiFetch } = useAuth();

  const { data, isLoading, isError, isRefetching, refetch } = useQuery({
    queryKey: ['notifications-inbox'],
    retry: 1,
    queryFn: async () => apiFetch<NotificationsResponse>(NOTIFICATIONS_ENDPOINT, { method: 'GET' }),
  });

  const items = useMemo<NotificationItem[]>(() => {
    if (!data) return [];
    const rawItems = getResponseItems(data, NOTIFICATIONS_ENDPOINT);
    return rawItems.map((item, idx) => {
      const id =
        item.id ?? item.deliveryId ?? item.notificationId ?? `${item.createdAt ?? 'n'}-${idx}`;
      const createdAt = item.createdAt ?? item.deliveryCreatedAt ?? '-';
      const isRead = typeof item.isRead === 'boolean' ? item.isRead : Boolean(item.readAt);
      return {
        id: String(id),
        title: item.title || 'Bildirim',
        body: item.body || '-',
        createdAt,
        isRead,
      };
    });
  }, [data]);

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const onRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const keyExtractor = useCallback((item: NotificationItem) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: NotificationItem }) => (
      <Card>
        <View className="gap-1.5">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="font-semibold text-foreground">{item.title}</Text>
            <Text className={`text-[11px] font-semibold ${item.isRead ? 'text-muted-foreground' : 'text-primary'}`}>
              {item.isRead ? 'Okundu' : 'Yeni'}
            </Text>
          </View>
          <Text className="text-sm text-muted-foreground">{item.body}</Text>
          <Text className="text-xs text-muted-foreground">{formatTs(item.createdAt)}</Text>
        </View>
      </Card>
    ),
    []
  );

  return (
    <Screen title="Bildirimler" subtitle="Uygulama içi uyarılar ve duyurular">
      <Card>
        <View className="gap-3">
          <View className="gap-1">
            <Text className="text-base font-semibold text-foreground">Bildirim Kutusu</Text>
            <Text className="text-sm text-muted-foreground">Yeni bildirimleri takip edin ve tek dokunuşla okunduya alın.</Text>
          </View>
          <View className="flex-row items-center justify-between gap-3">
            <Text className="text-xs font-medium text-muted-foreground">Toplam: {items.length}</Text>
            <Button title="Tümünü okundu yap" variant="outline" onPress={() => {}} />
          </View>
        </View>
      </Card>

      {isLoading ? <Text className="text-sm text-muted-foreground">Yükleniyor...</Text> : null}
      {isError ? (
        <Card>
          <Text className="mb-3 text-sm text-destructive">Bildirimler alınamadı.</Text>
          <Button title="Tekrar Dene" variant="outline" onPress={onRetry} />
        </Card>
      ) : null}
      {!isLoading && !isError && items.length === 0 ? (
        <Card>
          <View className="gap-1">
            <Text className="text-sm font-semibold text-foreground">Bildirim yok</Text>
            <Text className="text-sm text-muted-foreground">Yeni uyarılar burada listelenecek.</Text>
          </View>
        </Card>
      ) : null}
      {!isLoading && !isError && items.length > 0 ? (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          refreshControl={<RefreshControl refreshing={isRefetching && !isLoading} onRefresh={onRefresh} />}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View className="h-3" />}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
        />
      ) : null}
    </Screen>
  );
}
