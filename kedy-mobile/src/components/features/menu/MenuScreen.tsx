import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
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
  emptyMessage = 'Bu bölümde gösterilecek menü bulunamadý.',
}: {
  title: string;
  subtitle?: string;
  items: MenuItem[];
  emptyMessage?: string;
}) {
  const router = useRouter();

  return (
    <Screen title={title} subtitle={subtitle}>
      {items.length === 0 ? (
        <Card>
          <Text className="text-sm text-muted-foreground">{emptyMessage}</Text>
        </Card>
      ) : null}

      {items.map((item) => (
        <Pressable key={item.id} onPress={() => router.push(item.href as never)}>
          <Card>
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1 gap-1">
                <Text className="text-base font-semibold text-foreground">{item.title}</Text>
                <Text className="text-sm text-muted-foreground">{item.description}</Text>
              </View>
              <View className="items-end gap-1">
                <Text className="text-xs font-medium text-primary">{item.ctaLabel ?? 'Aç'}</Text>
                <ChevronRight size={16} color="#71717A" />
              </View>
            </View>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
