import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Preferences } from '@capacitor/preferences';
import { SettingsScreen } from '../components/more/SettingsScreen';
import { useAuth } from '../context/AuthContext';

const THEME_PREF_KEY = 'kedy.mobile.theme.dark';

export function SettingsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof document === 'undefined') {
      return false;
    }
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const pref = await Preferences.get({ key: THEME_PREF_KEY });
        if (!mounted) {
          return;
        }
        setIsDarkMode(pref.value === '1');
      } catch (error) {
        console.warn('Theme preference load failed:', error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    void Preferences.set({ key: THEME_PREF_KEY, value: isDarkMode ? '1' : '0' });
  }, [isDarkMode]);

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login', { replace: true });
  };

  return (
    <SettingsScreen
      isDarkMode={isDarkMode}
      onToggleDarkMode={(nextValue) => setIsDarkMode(nextValue)}
      onShowHelpCenter={() => navigate('/app/features/help-center')}
      onOpenNotificationSettings={() => navigate('/app/notification-settings', { state: { navDirection: 'forward' } })}
      onOpenNotificationsInbox={() => navigate('/app/notifications', { state: { navDirection: 'forward' } })}
      onLogout={() => {
        void handleLogout();
      }}
    />
  );
}
