import { useMemo, useRef } from 'react';
import { useRouter } from 'expo-router';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text, View } from '@/tw';

export default function CreatePage() {
  const router = useRouter();
  const ref = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['35%'], []);

  return (
    <Screen title="Olustur" subtitle="Bottom sheet pattern standardı">
      <Button title="Hizli Eylemler" onPress={() => ref.current?.expand()} />
      <BottomSheet ref={ref} index={-1} snapPoints={snapPoints} enablePanDownToClose>
        <BottomSheetView style={{ padding: 16, gap: 12 }}>
          <Text className="text-base font-semibold text-foreground">Hizli islemler</Text>
          <View className="gap-2">
            <Button title="Yeni Randevu" onPress={() => router.push('/(tabs)/schedule/new')} />
            <Button title="Yeni Musteri" variant="secondary" onPress={() => router.push('/(tabs)/customers/new')} />
            <Button title="Waitlist Kaydi" variant="outline" onPress={() => router.push('/(tabs)/schedule/waitlist/new')} />
          </View>
        </BottomSheetView>
      </BottomSheet>
    </Screen>
  );
}
