import { WorkInProgressScreen } from '@/components/features/menu/WorkInProgressScreen';

export default function AttendanceSettingsPage() {
  return (
    <WorkInProgressScreen
      title="Randevu Ýhlali"
      subtitle="Katýlým ve yaptýrým ayarlarý"
      summary="Randevu ihlali ayarlarý ekraný hazýrlanýyor."
      details="Loading/empty/error/retry davranýþlarý parity þablonuna taþýndý. Kural seti ve kayýt API baðlarý bir sonraki turda tamamlanacak."
      backHref="/(tabs)/customers/risk-menu"
    />
  );
}
