import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { STORAGE_KEYS } from '@/lib/config';

type AppLocale = 'tr' | 'en';

interface LocaleContextValue {
  locale: AppLocale;
  setLocale: (next: AppLocale) => Promise<void>;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

function inferDefaultLocale(): AppLocale {
  const languageCode = getLocales()[0]?.languageCode;
  return languageCode === 'tr' ? 'tr' : 'en';
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(inferDefaultLocale());

  useEffect(() => {
    let active = true;
    (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.LOCALE);
      if (!active) return;
      if (stored === 'tr' || stored === 'en') setLocaleState(stored);
    })();
    return () => {
      active = false;
    };
  }, []);

  const setLocale = async (next: AppLocale) => {
    setLocaleState(next);
    await AsyncStorage.setItem(STORAGE_KEYS.LOCALE, next);
  };

  const value = useMemo<LocaleContextValue>(() => ({ locale, setLocale }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
