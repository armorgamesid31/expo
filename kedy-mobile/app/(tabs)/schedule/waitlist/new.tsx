import { WorkInProgressScreen } from '@/components/features/menu/WorkInProgressScreen';

export default function NewWaitlistPage() {
  return (
    <WorkInProgressScreen
      title="Yeni Bekleme Listesi Kaydı"
      subtitle="Bekleme listesi oluşturma"
      summary="Bekleme listesi ekranı hazırlanıyor."
      details="Servis-personel eşleştirme ve kayıt adımı taşınıyor. Bu turda ekran hiyerarşisi, spacing ve retry CTA davranışı parity seviyesine çekildi."
      backHref="/(tabs)/schedule"
      state="empty"
    />
  );
}
