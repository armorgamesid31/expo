import { WorkInProgressScreen } from '@/components/features/menu/WorkInProgressScreen';

export default function SalonInfoFaqScreen() {
  return (
    <WorkInProgressScreen
      title="Sık Sorulan Sorular"
      subtitle="Müşteri bilgilendirme içeriği"
      summary="SSS ekranı hazırlanıyor."
      details="Ön tanımlı soru-cevap ve özel soru alanları taşınma hattında. Bu turda başlık hiyerarşisi, spacing ve geri dönüş akışı hizalandı."
      backHref="/(stack)/salon-info"
      state="empty"
    />
  );
}
