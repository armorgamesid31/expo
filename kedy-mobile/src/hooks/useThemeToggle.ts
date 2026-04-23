import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, useColorScheme } from 'react-native';
import { STORAGE_KEYS } from '@/lib/config';

export function useThemeToggle() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const toggle = async () => {
    const next = isDark ? 'light' : 'dark';
    Appearance.setColorScheme(next);
    await AsyncStorage.setItem(STORAGE_KEYS.THEME, next);
  };

  return { isDark, toggle, colorScheme };
}
