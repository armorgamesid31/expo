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
        <Text className="font-semibold text-foreground">{item.title}</Text>
        <Text className="text-sm text-muted-foreground">{item.body}</Text>
        <Text className="text-xs text-muted-foreground">
          {item.createdAt} · {item.isRead ? 'Okundu' : 'Yeni'}
        </Text>
      </Card>
    ),
    [],
  );

  return (
    <Screen title="Notifications Inbox" subtitle="Minimum usable bildirim kutusu">
      {isLoading ? <Text className="text-sm text-muted-foreground">Yükleniyor...</Text> : null}
      {isError ? (
        <Card>
          <Text className="mb-3 text-sm text-destructive">Bildirimler alınamadı.</Text>
          <Button title="Tekrar Dene" variant="outline" onPress={onRetry} />
        </Card>
      ) : null}
      {!isLoading && !isError && items.length === 0 ? (
        <Card>
          <Text className="text-sm text-muted-foreground">Henüz bildirim yok.</Text>
        </Card>
      ) : null}
      {!isLoading && !isError && items.length > 0 ? (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
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
