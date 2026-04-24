import { usePathname, useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text, View } from '@/tw';

type WorkState = 'empty' | 'error' | 'loading';

export function WorkInProgressScreen({
  title,
  subtitle,
  summary,
  details,
  backHref,
  primaryLabel = 'Tekrar Dene',
  state = 'empty',
}: {
  title: string;
  subtitle: string;
  summary: string;
  details: string;
  backHref: string;
  primaryLabel?: string;
  state?: WorkState;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const stateTitle =
    state === 'loading'
      ? 'İçerik hazırlanıyor'
      : state === 'error'
      ? 'İçerik alınamadı'
      : 'Henüz içerik yok';

  const stateText =
    state === 'loading'
      ? 'Ekran bileşenleri yükleniyor. Birkaç saniye içinde tekrar deneyin.'
      : state === 'error'
      ? 'Ekran verisi alınamadı. Tekrar deneyebilir veya listeye dönebilirsiniz.'
      : 'Bu bölümde gösterilecek kayıt henüz oluşmadı. Tekrar deneyebilir veya listeye dönebilirsiniz.';

  return (
    <Screen title={title} subtitle={subtitle}>
      <Card>
        <View className="gap-2">
          <Text className="text-base font-semibold text-foreground">{summary}</Text>
          <Text className="text-sm text-muted-foreground">{details}</Text>
        </View>
      </Card>

      <Card>
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">{stateTitle}</Text>
          <Text className="text-sm text-muted-foreground">{stateText}</Text>
        </View>
      </Card>

      <View className="gap-3">
        <Button title={primaryLabel} variant="outline" onPress={() => router.replace(pathname as never)} />
        <Button title="Listeye Dön" variant="secondary" onPress={() => router.push(backHref as never)} />
      </View>
    </Screen>
  );
}
