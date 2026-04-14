import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Preferences } from '@capacitor/preferences';
import { SettingsScreen } from '../components/more/SettingsScreen';
import { useAuth } from '../context/AuthContext';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '../components/ui/alert-dialog';

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
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

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

  const handleDeleteAccountConfirm = () => {
    // Redirect to the data-deletion disclosure page as per policy
    // In a real app, this could also trigger an API call to mark for deletion
    window.open('https://kedy.com.tr/data-deletion', '_blank');
    void handleLogout();
  };

  return (
    <>
      <SettingsScreen
        isDarkMode={isDarkMode}
        onToggleDarkMode={(nextValue) => setIsDarkMode(nextValue)}
        onShowHelpCenter={() => navigate('/app/features/help-center')}
        onOpenNotificationSettings={() => navigate('/app/notification-settings', { state: { navDirection: 'forward' } })}
        onOpenNotificationsInbox={() => navigate('/app/notifications', { state: { navDirection: 'forward' } })}
        onLogout={() => {
          void handleLogout();
        }}
        onDeleteAccount={() => setShowDeleteAlert(true)}
      />

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent className="rounded-2xl max-w-[90vw]">
          <AlertDialogHeader>
            <AlertDialogTitle>Hesabınızı silmek istediğinize emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Hesabınız ve tüm salon verileriniz kalıcı olarak silinmek üzere işaretlenecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="rounded-xl mt-0">Vazgeç</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAccountConfirm}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              Evet, Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

