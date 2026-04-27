import { useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { FlatList, RefreshControl } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/providers/AuthProvider';
import { Text, View } from '@/tw';

type Customer = {
  id?: number | string | null;
  name: string | null;
  phone?: string | null;
  appointmentCount?: number | null;
};

type CustomersResponse = {
  items: unknown[];
};

const CUSTOMERS_ENDPOINT = '/api/admin/customers?limit=100';

function getResponseItems(payload: unknown, endpoint: string): unknown[] {
  const items = (payload as { items?: unknown } | null | undefined)?.items;
  if (!Array.isArray(items)) {
    throw new Error(`Unexpected response shape from ${endpoint}: expected { items: [] }`);
  }
  return items;
}

function normalizeCustomers(payload: CustomersResponse): Customer[] {
  const rawItems = getResponseItems(payload, CUSTOMERS_ENDPOINT);

  return rawItems.map((item, idx) => {
    const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const idRaw = record.id;
    const appointmentCountRaw = record.appointmentCount;
    const normalizedCount = typeof appointmentCountRaw === 'number' ? appointmentCountRaw : Number(appointmentCountRaw);
    return {
      id: typeof idRaw === 'number' || typeof idRaw === 'string' ? idRaw : idx,
      name: typeof record.name === 'string' ? record.name : null,
      phone: typeof record.phone === 'string' ? record.phone : null,
      appointmentCount: Number.isFinite(normalizedCount) ? normalizedCount : 0,
    };
  });
}

export default function CustomersPage() {
  const router = useRouter();
  const { apiFetch } = useAuth();

  const { data, isLoading, isError, isRefetching, error, refetch } = useQuery({
    queryKey: ['customers'],
    retry: 1,
    queryFn: async () => {
      const response = await apiFetch<CustomersResponse>(CUSTOMERS_ENDPOINT, { method: 'GET' });
      return normalizeCustomers(response);
    },
  });

  const items = useMemo(() => data ?? [], [data]);

  const onRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const onRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const keyExtractor = useCallback((item: Customer, idx: number) => String(item.id ?? idx), []);
  const renderItem = useCallback(
    ({ item }: { item: Customer }) => (
      <Card>
        <View className="flex-row items-center gap-3">
          <Avatar name={item.name || 'Müşteri'} />
          <View className="flex-1 gap-0.5">
            <Text className="font-semibold text-foreground">{item.name || 'İsimsiz müşteri'}</Text>
            <Text className="text-sm text-muted-foreground">{item.phone || '-'}</Text>
            <Text className="text-xs font-medium text-muted-foreground">Randevu: {item.appointmentCount ?? 0}</Text>
          </View>
        </View>
      </Card>
    ),
    []
  );

  return (
    <Screen title="Müşteriler" subtitle="Müşteri listesi ve risk merkezi">
      <Card>
        <View className="gap-2">
          <Text className="text-base font-semibold text-foreground">Müşteri Merkezi</Text>
          <Text className="text-sm text-muted-foreground">
            Müşteri kaydı, risk merkezi ve hızlı arama aksiyonlarını bu alandan yönetin.
          </Text>
        </View>
      </Card>

      <View className="gap-3 rounded-2xl border border-border bg-card/60 p-3">
        <Input placeholder="Ad, telefon veya Instagram..." editable={false} />
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button title="Risk Merkezi" variant="outline" onPress={() => router.push('/(tabs)/customers/risk-menu')} />
          </View>
          <View className="flex-1">
            <Button title="Müşteri Ekle" onPress={() => router.push('/(tabs)/customers/new')} />
          </View>
        </View>
        <Text className="text-xs text-muted-foreground">Yeni müşteri formu ayrı ekranda açılır.</Text>
        <Text className="text-xs font-medium text-muted-foreground">Toplam müşteri: {items.length}</Text>
      </View>

      {isLoading ? <Text className="text-sm text-muted-foreground">Yükleniyor...</Text> : null}
      {isError ? (
        <Card>
          <Text className="mb-3 text-sm text-destructive">
            {error instanceof Error ? error.message : 'Müşteri verileri alınamadı.'}
          </Text>
          <Button title="Tekrar Dene" variant="outline" onPress={onRetry} />
        </Card>
      ) : null}
      {!isLoading && !isError && items.length === 0 ? (
        <Card>
          <View className="gap-1">
            <Text className="text-sm font-semibold text-foreground">Müşteri kaydı bulunamadı</Text>
            <Text className="text-sm text-muted-foreground">Yeni müşteri ekleyerek listeyi başlatabilirsiniz.</Text>
          </View>
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
