import { WorkInProgressScreen } from '@/components/features/menu/WorkInProgressScreen';

export default function SalonInfoBasicScreen() {
  return (
    <WorkInProgressScreen
      title="Temel Bilgiler"
      subtitle="Salon profil bilgileri"
      summary="Temel bilgiler formu hazýrlanýyor."
      details="Bu adýmda baþlýk, spacing ve geri dönüþ davranýþý parity ile hizalandý. Form alanlarý kaynak uygulamadaki düzenle bir sonraki turda tamamlanacak."
      backHref="/(stack)/salon-info"
    />
  );
}
