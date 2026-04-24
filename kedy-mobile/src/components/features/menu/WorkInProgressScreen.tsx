import { usePathname, useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text, View } from '@/tw';

export function WorkInProgressScreen({
  title,
  subtitle,
  summary,
  details,
  backHref,
  primaryLabel = 'Tekrar Dene',
}: {
  title: string;
  subtitle: string;
  summary: string;
  details: string;
  backHref: string;
  primaryLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Screen title={title} subtitle={subtitle}>
      <Card>
        <View className="gap-2">
          <Text className="text-base font-semibold text-foreground">{summary}</Text>
          <Text className="text-sm text-muted-foreground">{details}</Text>
        </View>
      </Card>

      <View className="gap-3">
        <Button title={primaryLabel} variant="outline" onPress={() => router.replace(pathname as never)} />
        <Button title="Listeye Dön" variant="secondary" onPress={() => router.push(backHref as never)} />
      </View>
    </Screen>
  );
}
