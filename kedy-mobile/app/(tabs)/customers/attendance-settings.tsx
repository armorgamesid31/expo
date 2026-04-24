import { WorkInProgressScreen } from '@/components/features/menu/WorkInProgressScreen';

export default function AttendanceSettingsPage() {
  return (
    <WorkInProgressScreen
      title="Randevu İhlali"
      subtitle="Katılım ve yaptırım ayarları"
      summary="Randevu ihlali ayar ekranı hazırlanıyor."
      details="İhlal politikası ve yaptırım formları taşınma hattında. Bu turda empty/retry davranışı, metin hiyerarşisi ve CTA dili parity standardına alındı."
      backHref="/(tabs)/customers/risk-menu"
      state="empty"
    />
  );
}
