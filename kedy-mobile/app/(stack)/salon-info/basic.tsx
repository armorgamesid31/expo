import { WorkInProgressScreen } from '@/components/features/menu/WorkInProgressScreen';

export default function SalonInfoBasicScreen() {
  return (
    <WorkInProgressScreen
      title="Temel Bilgiler"
      subtitle="Salon profil bilgileri"
      summary="Temel bilgiler ekranı hazırlanıyor."
      details="Salon adı, adres, iletişim ve çalışma saatleri formu taşınıyor. Bu turda metin düzeni ve empty/retry davranışı parity çizgisine getirildi."
      backHref="/(stack)/salon-info"
      state="empty"
    />
  );
}
