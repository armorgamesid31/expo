import { WorkInProgressScreen } from '@/components/features/menu/WorkInProgressScreen';

export default function NewSchedulePage() {
  return (
    <WorkInProgressScreen
      title="Yeni Randevu"
      subtitle="Randevu oluþturma"
      summary="Yeni randevu formu hazýrlanýyor."
      details="Ekran akýþý parity kuralýna göre korunuyor. Form adýmlarý ve müþteri-hizmet seçimi bir sonraki turda taþýnacak."
      backHref="/(tabs)/schedule"
    />
  );
}
