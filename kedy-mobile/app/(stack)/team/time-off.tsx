import { WorkInProgressScreen } from '@/components/features/menu/WorkInProgressScreen';

export default function TeamTimeOffScreen() {
  return (
    <WorkInProgressScreen
      title="Tatil ve Ýzin Yönetimi"
      subtitle="Ekip uygunluk yönetimi"
      summary="Ýzin ve tatil detay ekraný hazýrlanýyor."
      details="Müsaitlik motoru ile entegre izin kurallarý taþýnýrken menü ve geri dönüþ akýþý parity seviyesinde çalýþýr durumda tutuluyor."
      backHref="/(stack)/team/management"
    />
  );
}
