import { WorkInProgressScreen } from '@/components/features/menu/WorkInProgressScreen';

export default function TeamTimeOffScreen() {
  return (
    <WorkInProgressScreen
      title="Tatil ve İzin Yönetimi"
      subtitle="Ekip uygunluk yönetimi"
      summary="Tatil ve izin ekranı hazırlanıyor."
      details="Salon tatilleri ve personel izin kuralları taşınma hattında. Bu turda empty/retry davranışı ve geri dönüş CTA'ları parity standardına çekildi."
      backHref="/(stack)/team/management"
      state="empty"
    />
  );
}
