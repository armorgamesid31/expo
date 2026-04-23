import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/tw';

export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <Screen title={title} subtitle="Bu ekran RN dönüşüm hattında hazırlandı.">
      <Card>
        <Text className="text-sm text-muted-foreground">Detay bileşenleri sonraki iterasyonda ekran bazlı taşınacaktır.</Text>
      </Card>
    </Screen>
  );
}
