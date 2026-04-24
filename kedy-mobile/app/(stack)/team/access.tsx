import { WorkInProgressScreen } from '@/components/features/menu/WorkInProgressScreen';

export default function TeamAccessScreen() {
  return (
    <WorkInProgressScreen
      title="Ekip ve Yetki"
      subtitle="Roller ve erişim ayarları"
      summary="Ekip ve yetki ekranı hazırlanıyor."
      details="Kullanıcı, rol ve yetki formları taşınma hattında. Bu turda menü akışı, metin hiyerarşisi ve geri dönüş CTA'ları hizalandı."
      backHref="/(stack)/team/management"
      state="empty"
    />
  );
}
