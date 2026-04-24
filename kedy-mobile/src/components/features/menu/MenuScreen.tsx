import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Pressable, Text, View } from '@/tw';

type MenuItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  ctaLabel?: string;
};

export function MenuScreen({
  title,
  subtitle,
  items,
  emptyMessage = 'Bu bölümde gösterilecek menü bulunamadı.',
  errorMessage,
  onRetry,
  retryLabel = 'Tekrar Dene',
}: {
  title: string;
  subtitle?: string;
  items: MenuItem[];
  emptyMessage?: string;
  errorMessage?: string | null;
  onRetry?: (() => void) | null;
  retryLabel?: string;
}) {
  const router = useRouter();

  return (
    <Screen title={title} subtitle={subtitle}>
      {errorMessage ? (
        <Card>
          <View className="gap-3">
            <View className="gap-1">
              <Text className="text-sm font-semibold text-destructive">Bir sorun oluştu</Text>
              <Text className="text-sm text-muted-foreground">{errorMessage}</Text>
            </View>
            {onRetry ? <Button title={retryLabel} variant="outline" onPress={onRetry} /> : null}
          </View>
        </Card>
      ) : null}

      {!errorMessage && items.length === 0 ? (
        <Card>
          <View className="gap-3">
            <View className="gap-1">
              <Text className="text-sm font-semibold text-foreground">Henüz içerik yok</Text>
              <Text className="text-sm text-muted-foreground">{emptyMessage}</Text>
            </View>
            {onRetry ? <Button title={retryLabel} variant="outline" onPress={onRetry} /> : null}
          </View>
        </Card>
      ) : null}

      {items.map((item) => (
        <Pressable key={item.id} onPress={() => router.push(item.href as never)} className="active:opacity-90">
          <Card>
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1 gap-1.5">
                <Text className="text-base font-semibold text-foreground">{item.title}</Text>
                <Text className="text-sm text-muted-foreground">{item.description}</Text>
              </View>
              <View className="items-end gap-1.5">
                <Text className="text-xs font-semibold text-primary">{item.ctaLabel ?? 'Aç'}</Text>
                <ChevronRight size={16} color="#71717A" />
              </View>
            </View>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
