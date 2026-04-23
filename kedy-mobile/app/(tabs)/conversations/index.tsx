import { useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { FlatList, RefreshControl } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/providers/AuthProvider';
import { Pressable, Text, View } from '@/tw';

type ConversationChannel = 'INSTAGRAM' | 'WHATSAPP';

type AdminConversationItem = {
  channel?: ConversationChannel | null;
  conversationKey?: string | null;
  customerName?: string | null;
  lastMessage?: string | null;
  lastMessageText?: string | null;
};

type AdminConversationsResponse = {
  items: AdminConversationItem[];
};

type ConversationListItem = {
  conversationId: string;
  channel: ConversationChannel;
  conversationKey: string;
  customerName: string | null;
  lastMessage: string | null;
};

function normalizeConversationKey(channel: ConversationChannel, raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const prefixed = `${channel}:`;
  if (trimmed.startsWith(prefixed)) {
    return trimmed.slice(prefixed.length).trim();
  }

  return trimmed;
}

function toConversationId(channel: ConversationChannel, conversationKey: string): string {
  return `${channel}:${conversationKey}`;
}

function toSafeErrorMessage(error: unknown, fallback: string): string {
  const message = typeof (error as { message?: unknown })?.message === 'string' ? (error as { message: string }).message.trim() : '';
  if (!message) return fallback;
  if (/^request failed \(\d+\)$/i.test(message)) return fallback;
  return message;
}

const CONVERSATIONS_ENDPOINT = '/api/admin/conversations?limit=120';

function getResponseItems(payload: unknown, endpoint: string): AdminConversationItem[] {
  const items = (payload as { items?: unknown } | null | undefined)?.items;
  if (!Array.isArray(items)) {
    throw new Error(`Unexpected response shape from ${endpoint}: expected { items: [] }`);
  }
  return items as AdminConversationItem[];
}

export default function ConversationsPage() {
  const router = useRouter();
  const { apiFetch } = useAuth();

  const { data, isLoading, isError, isRefetching, error, refetch } = useQuery({
    queryKey: ['conversations'],
    retry: 1,
    queryFn: async () => apiFetch<AdminConversationsResponse>(CONVERSATIONS_ENDPOINT, { method: 'GET' }),
  });

  const items = useMemo<ConversationListItem[]>(() => {
    if (!data) return [];
    const source = getResponseItems(data, CONVERSATIONS_ENDPOINT);

    return source
      .map((item) => {
        const channel = item.channel === 'INSTAGRAM' || item.channel === 'WHATSAPP' ? item.channel : null;
        const rawKey = typeof item.conversationKey === 'string' ? item.conversationKey : '';
        if (!channel || !rawKey.trim()) return null;

        const conversationKey = normalizeConversationKey(channel, rawKey);
        if (!conversationKey) return null;

        return {
          conversationId: toConversationId(channel, conversationKey),
          channel,
          conversationKey,
          customerName: item.customerName ?? null,
          lastMessage: item.lastMessageText ?? item.lastMessage ?? null,
        };
      })
      .filter((entry): entry is ConversationListItem => Boolean(entry));
  }, [data]);

  const onRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const keyExtractor = useCallback((item: ConversationListItem) => item.conversationId, []);
  const handlePressConversation = useCallback(
    (conversationId: string | null | undefined) => {
      if (!conversationId || !conversationId.includes(':')) {
        return;
      }

      router.push(`/(tabs)/conversations/${encodeURIComponent(conversationId)}` as never);
    },
    [router],
  );
  const renderItem = useCallback(
    ({ item }: { item: ConversationListItem }) => (
      <Pressable onPress={() => handlePressConversation(item.conversationId)}>
        <Card>
          <Text className="font-semibold text-foreground">{item.customerName || 'Musteri'}</Text>
          <Text className="text-sm text-muted-foreground">{item.lastMessage || 'Son mesaj yok'}</Text>
          <Text className="text-xs text-muted-foreground">
            Kanal: {item.channel} | Key: {item.conversationKey}
          </Text>
        </Card>
      </Pressable>
    ),
    [handlePressConversation],
  );

  return (
    <Screen title="Konusmalar" subtitle="P0 dönüşüm ekranı">
      {isLoading ? <Text className="text-sm text-muted-foreground">Yükleniyor...</Text> : null}
      {isError ? (
        <Card>
          <Text className="mb-3 text-sm text-destructive">
            {toSafeErrorMessage(error, 'Konuşma verisi alınamadı.')}
          </Text>
          <Button title="Tekrar Dene" variant="outline" onPress={() => void refetch()} />
        </Card>
      ) : null}
      {!isLoading && !isError && items.length === 0 ? (
        <Card>
          <Text className="text-sm text-muted-foreground">Aktif konuşma bulunamadı.</Text>
        </Card>
      ) : null}
      {!isLoading && !isError && items.length > 0 ? (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          refreshControl={<RefreshControl refreshing={isRefetching && !isLoading} onRefresh={onRefresh} />}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View className="h-3" />}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews
        />
      ) : null}
    </Screen>
  );
}
