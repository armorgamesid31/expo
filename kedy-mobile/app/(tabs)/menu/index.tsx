import { useRouter } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Pressable, Text, View } from '@/tw';

const links = [
  { label: 'Analytics', href: '/(stack)/analytics' },
  { label: 'Inventory', href: '/(stack)/inventory' },
  { label: 'Campaigns', href: '/(stack)/campaigns' },
  { label: 'Automations', href: '/(stack)/automations' },
  { label: 'Services', href: '/(stack)/services' },
  { label: 'Staff', href: '/(stack)/staff' },
  { label: 'Settings', href: '/(stack)/settings' },
  { label: 'Features', href: '/(stack)/features' },
];

export default function MenuPage() {
  const router = useRouter();
  return (
    <Screen title="Menu" subtitle="Yonetim merkezleri">
      {links.map((item) => (
        <Pressable key={item.href} onPress={() => router.push(item.href as never)}>
          <Card>
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-foreground">{item.label}</Text>
              <Text className="text-sm text-muted-foreground">Ac</Text>
            </View>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
