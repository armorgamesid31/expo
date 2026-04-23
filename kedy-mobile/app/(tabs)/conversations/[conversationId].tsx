import { useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/providers/AuthProvider';
import { Text } from '@/tw';

type ConversationChannel = 'INSTAGRAM' | 'WHATSAPP';

type ConversationMessage = {
  id?: string | number | null;
  text?: string | null;
  messageType?: string | null;
  direction?: 'inbound' | 'outbound' | 'system' | null;
  eventTimestamp?: string | null;
};

type AdminConversationMessagesResponse = {
  items: ConversationMessage[];
};

type ParsedConversationRoute = {
  rawId: string;
  channel: ConversationChannel;
  conversationKey: string;
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

function parseConversationRouteParam(routeParam: string | string[] | undefined): ParsedConversationRoute | null {
  const raw = Array.isArray(routeParam) ? routeParam[0] : routeParam;
  if (!raw) return null;

  let decoded = raw.trim();
  if (!decoded) return null;

  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // Keep raw value if decoding fails.
  }

  if (!decoded.includes(':')) return null;
  const [rawChannel, ...rest] = decoded.split(':');
  const channel = rawChannel === 'INSTAGRAM' || rawChannel === 'WHATSAPP' ? rawChannel : null;
  if (!channel) return null;

  const rawKey = rest.join(':').trim();
  if (!rawKey) return null;

  const conversationKey = normalizeConversationKey(channel, rawKey);
  if (!conversationKey) return null;

  return {
    rawId: `${channel}:${conversationKey}`,
    channel,
    conversationKey,
  };
}

function toSafeErrorMessage(error: unknown, fallback: string): string {
  const message = typeof (error as { message?: unknown })?.message === 'string' ? (error as { message: string }).message.trim() : '';
  if (!message) return fallback;
  if (/^request failed \(\d+\)$/i.test(message)) return fallback;
  return message;
}

function getResponseItems(payload: unknown, endpoint: string): ConversationMessage[] {
  const items = (payload as { items?: unknown } | null | undefined)?.items;
  if (!Array.isArray(items)) {
    throw new Error(`Unexpected response shape from ${endpoint}: expected { items: [] }`);
  }
  return items as ConversationMessage[];
}

export default function ConversationDetailPage() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { apiFetch } = useAuth();
  const parsedRoute = useMemo(() => parseConversationRouteParam(conversationId), [conversationId]);
  const normalizedConversationId = parsedRoute?.rawId ?? null;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['conversation-detail', normalizedConversationId],
    enabled: Boolean(parsedRoute),
    retry: 1,
    queryFn: async () => {
      if (!parsedRoute) {
        return { items: [] };
      }

      const endpoint = `/api/admin/conversations/${parsedRoute.channel}/${encodeURIComponent(parsedRoute.conversationKey)}/messages?limit=120`;
      return apiFetch<AdminConversationMessagesResponse>(
        endpoint,
        { method: 'GET' },
      );
    },
  });

  const messages = useMemo(
    () => {
      if (!data || !parsedRoute) return [];
      const endpoint = `/api/admin/conversations/${parsedRoute.channel}/${encodeURIComponent(parsedRoute.conversationKey)}/messages?limit=120`;
      return getResponseItems(data, endpoint).map((item) => ({
        id: item.id ?? null,
        text: item.text ?? null,
        messageType: item.messageType ?? null,
        direction: item.direction ?? null,
        eventTimestamp: item.eventTimestamp ?? null,
      }));
    },
    [data, parsedRoute],
  );
  const messagesCount = messages.length;

  return (
    <Screen title="Konusma Detayi" subtitle={`ID: ${normalizedConversationId || '-'}`}>
      {!parsedRoute ? (
        <Card>
          <Text className="text-sm text-destructive">Geçersiz konuşma kimliği.</Text>
        </Card>
      ) : null}
      {isLoading ? <Text className="text-sm text-muted-foreground">Yükleniyor...</Text> : null}
      {isError ? (
        <Card>
          <Text className="mb-3 text-sm text-destructive">
            {toSafeErrorMessage(error, 'Konuşma detayı alınamadı.')}
          </Text>
          <Button title="Tekrar Dene" variant="outline" onPress={() => void refetch()} />
        </Card>
      ) : null}
      {parsedRoute && !isLoading && !isError ? (
        <Card>
          <Text className="font-semibold text-foreground">Kanal: {parsedRoute.channel}</Text>
          <Text className="text-sm text-muted-foreground">Key: {parsedRoute.conversationKey}</Text>
          <Text className="mt-2 text-xs text-muted-foreground">Mesaj sayısı: {messagesCount}</Text>
        </Card>
      ) : null}
      {parsedRoute && !isLoading && !isError && messagesCount === 0 ? (
        <Card>
          <Text className="text-sm text-muted-foreground">Bu konuşmada henüz mesaj bulunmuyor.</Text>
        </Card>
      ) : null}
    </Screen>
  );
}
