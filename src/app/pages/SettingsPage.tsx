import { SettingsScreen } from '../components/more/SettingsScreen';

export function SettingsPage() {
  return (
    <SettingsScreen
      isDarkMode={false}
      onToggleDarkMode={() => undefined}
      onShowHelpCenter={() => undefined}
    />
  );
}
