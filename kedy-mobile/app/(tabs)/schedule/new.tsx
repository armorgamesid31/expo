import { WorkInProgressScreen } from '@/components/features/menu/WorkInProgressScreen';

export default function NewSchedulePage() {
  return (
    <WorkInProgressScreen
      title="Yeni Randevu"
      subtitle="Randevu oluşturma"
      summary="Yeni randevu ekranı hazırlanıyor."
      details="Müşteri, hizmet ve saat adımları taşınma hattında. Bu turda metin hiyerarşisi ile empty/retry geri bildirimleri kaynak akışla hizalandı."
      backHref="/(tabs)/schedule"
      state="empty"
    />
  );
}
