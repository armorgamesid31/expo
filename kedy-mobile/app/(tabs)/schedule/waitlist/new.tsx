import { WorkInProgressScreen } from '@/components/features/menu/WorkInProgressScreen';

export default function NewWaitlistPage() {
  return (
    <WorkInProgressScreen
      title="Yeni Bekleme Listesi Kaydý"
      subtitle="Bekleme listesi oluþturma"
      summary="Bekleme listesi formu hazýrlanýyor."
      details="Parity turunda baþlýk dili, spacing ve dönüþ CTA'larý eþitlendi. Servis-personel eþleþtirme adýmlarý sonraki turda tamamlanacak."
      backHref="/(tabs)/schedule"
    />
  );
}
