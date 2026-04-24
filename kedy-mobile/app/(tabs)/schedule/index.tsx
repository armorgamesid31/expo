import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FlatList, RefreshControl } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/providers/AuthProvider';
import { Text, View } from '@/tw';

type Appointment = {
  id: number;
  customerName?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
};

type AppointmentsResponse = {
  items: unknown[];
};

function toIsoDayWindow(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

function buildAppointmentsEndpoint(date: Date) {
  const window = toIsoDayWindow(date);
  return `/api/admin/appointments?from=${encodeURIComponent(window.from)}&to=${encodeURIComponent(window.to)}&limit=120`;
}

function getResponseItems(payload: unknown, endpoint: string): unknown[] {
  const items = (payload as { items?: unknown } | null | undefined)?.items;
  if (!Array.isArray(items)) {
    throw new Error(`Unexpected response shape from ${endpoint}: expected { items: [] }`);
  }
  return items;
}

function normalizeAppointments(payload: AppointmentsResponse, endpoint: string): Appointment[] {
  const rawItems = getResponseItems(payload, endpoint);

  return rawItems.map((item, idx) => {
    const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const idRaw = record.id;
    const fallbackId = idx + 1;
    const numericId = typeof idRaw === 'number' ? idRaw : Number(idRaw);
    return {
      id: Number.isFinite(numericId) ? numericId : fallbackId,
      customerName: typeof record.customerName === 'string' ? record.customerName : undefined,
      startTime: typeof record.startTime === 'string' ? record.startTime : undefined,
      endTime: typeof record.endTime === 'string' ? record.endTime : undefined,
      status: typeof record.status === 'string' ? record.status : undefined,
    };
  });
}

function statusText(status?: string): string {
  if (!status) return 'Bilinmiyor';
  return status;
}

export default function SchedulePage() {
  const { apiFetch } = useAuth();
  const appointmentsEndpoint = useMemo(() => buildAppointmentsEndpoint(new Date()), []);

  const { data, isLoading, isError, isRefetching, error, refetch } = useQuery({
    queryKey: ['schedule-today', appointmentsEndpoint],
    retry: 1,
    queryFn: async () => {
      const response = await apiFetch<AppointmentsResponse>(appointmentsEndpoint, {
        method: 'GET',
      });
      return normalizeAppointments(response, appointmentsEndpoint);
    },
  });

  const items = useMemo(() => data ?? [], [data]);

  const onRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const onRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const keyExtractor = useCallback((item: Appointment, idx: number) => String(item.id ?? idx), []);

  const renderItem = useCallback(
    ({ item }: { item: Appointment }) => (
      <Card>
        <Text className="font-semibold text-foreground">{item.customerName || 'İsimsiz müşteri'}</Text>
        <Text className="text-sm text-muted-foreground">
          {item.startTime || '-'} - {item.endTime || '-'}
        </Text>
        <Text className="text-xs text-muted-foreground">Durum: {statusText(item.status)}</Text>
      </Card>
    ),
    []
  );

  return (
    <Screen title="Randevular">
      {isLoading ? <Text className="text-sm text-muted-foreground">Yükleniyor...</Text> : null}
      {isError ? (
        <Card>
          <Text className="mb-3 text-sm text-destructive">
            {error instanceof Error ? error.message : 'Randevu verileri alınamadı.'}
          </Text>
          <Button title="Tekrar Dene" variant="outline" onPress={onRetry} />
        </Card>
      ) : null}
      {!isLoading && !isError && items.length === 0 ? (
        <Card>
          <Text className="text-sm text-muted-foreground">Bugün için randevu bulunamadı.</Text>
        </Card>
      ) : null}
      {!isLoading && !isError && items.length > 0 ? (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          scrollEnabled={false}
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
