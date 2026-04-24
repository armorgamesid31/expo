import { WorkInProgressScreen } from '@/components/features/menu/WorkInProgressScreen';

export default function TeamAccessScreen() {
  return (
    <WorkInProgressScreen
      title="Ekip ve Yetki"
      subtitle="Rol ve eriþim ayarlarý"
      summary="Bu ekranýn detay formu taþýnma hattýnda hazýrlanýyor."
      details="Parity kapsamýnda ilk adýmda menü akýþý ve baþlýk dili eþitlendi. Form ve kayýt akýþý bir sonraki turda tamamlanacak."
      backHref="/(stack)/team/management"
    />
  );
}
