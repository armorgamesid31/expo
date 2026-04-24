import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { FlatList, RefreshControl } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
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
  const message =
    typeof (error as { message?: unknown })?.message === 'string' ? (error as { message: string }).message.trim() : '';
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

function channelLabel(channel: ConversationChannel): string {
  if (channel === 'INSTAGRAM') return 'Instagram';
  if (channel === 'WHATSAPP') return 'WhatsApp';
  return channel;
}

export default function ConversationsPage() {
  const router = useRouter();
  const { apiFetch } = useAuth();
  const [channelFilter, setChannelFilter] = useState<'ALL' | ConversationChannel>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLocaleLowerCase('tr');

    return items.filter((item) => {
      if (channelFilter !== 'ALL' && item.channel !== channelFilter) return false;
      if (!normalizedSearch) return true;

      const haystack = `${item.customerName ?? ''} ${item.lastMessage ?? ''} ${item.conversationKey}`.toLocaleLowerCase('tr');
      return haystack.includes(normalizedSearch);
    });
  }, [channelFilter, items, searchQuery]);

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
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: ConversationListItem }) => (
      <Pressable onPress={() => handlePressConversation(item.conversationId)} className="active:opacity-90">
        <Card>
          <View className="gap-1.5">
            <Text className="font-semibold text-foreground">{item.customerName || 'İsimsiz kullanıcı'}</Text>
            <Text className="text-sm text-muted-foreground">{item.lastMessage || 'Son mesaj yok'}</Text>
            <Text className="text-xs font-medium text-muted-foreground">Kanal: {channelLabel(item.channel)}</Text>
          </View>
        </Card>
      </Pressable>
    ),
    [handlePressConversation]
  );

  return (
    <Screen title="Konuşmalar" subtitle="WhatsApp ve Instagram sohbetleri">
      <View className="gap-3 rounded-2xl border border-border bg-card/60 p-3">
        <View className="gap-1">
          <Text className="text-base font-semibold text-foreground">Sohbet Kutusu</Text>
          <Text className="text-sm text-muted-foreground">Kanal filtresiyle konuşmaları hızlıca daraltın.</Text>
        </View>

        <View className="flex-row gap-2">
          <Button title="Tümü" variant={channelFilter === 'ALL' ? 'primary' : 'outline'} onPress={() => setChannelFilter('ALL')} />
          <Button
            title="Instagram"
            variant={channelFilter === 'INSTAGRAM' ? 'primary' : 'outline'}
            onPress={() => setChannelFilter('INSTAGRAM')}
          />
          <Button
            title="WhatsApp"
            variant={channelFilter === 'WHATSAPP' ? 'primary' : 'outline'}
            onPress={() => setChannelFilter('WHATSAPP')}
          />
        </View>

        <View className="flex-row gap-4">
          <Text className="text-sm text-muted-foreground">{filteredItems.length} SOHBET</Text>
          <Text className="text-sm text-muted-foreground">0 BEKLEYEN</Text>
        </View>

        <Input
          placeholder="Ad, kullanıcı adı, mesaj ara"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {isLoading ? <Text className="text-sm text-muted-foreground">Yükleniyor...</Text> : null}
      {isError ? (
        <Card>
          <Text className="mb-3 text-sm text-destructive">{toSafeErrorMessage(error, 'Konuşma verileri alınamadı.')}</Text>
          <Button title="Tekrar Dene" variant="outline" onPress={() => void refetch()} />
        </Card>
      ) : null}
      {!isLoading && !isError && filteredItems.length === 0 ? (
        <Card>
          <View className="gap-1">
            <Text className="text-sm font-semibold text-foreground">Sohbet kutusu boş</Text>
            <Text className="text-sm text-muted-foreground">Henüz görüntülenecek konuşma yok.</Text>
          </View>
        </Card>
      ) : null}
      {!isLoading && !isError && filteredItems.length > 0 ? (
        <FlatList
          data={filteredItems}
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
