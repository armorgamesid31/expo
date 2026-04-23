import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/providers/AuthProvider';
import { LocaleProvider } from '@/providers/LocaleProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { ToastProvider } from '@/providers/ToastProvider';
import '../src/styles/global.css';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LocaleProvider>
        <ToastProvider>
          <QueryProvider>
            <AuthProvider>
              <StatusBar style="auto" />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(stack)" />
              </Stack>
            </AuthProvider>
          </QueryProvider>
        </ToastProvider>
      </LocaleProvider>
    </GestureHandlerRootView>
  );
}
