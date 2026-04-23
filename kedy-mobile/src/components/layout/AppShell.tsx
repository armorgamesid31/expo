import { useMemo } from 'react';
import { Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View } from '@/tw';

export function AppShell({ children }: { children: React.ReactNode }) {
  const className = useMemo(
    () => (Platform.OS === 'web' ? 'mx-auto w-full max-w-screen-md flex-1 bg-background' : 'flex-1 bg-background'),
    [],
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View className={className}>{children}</View>
    </SafeAreaView>
  );
}
