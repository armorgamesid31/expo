import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token } from '@capacitor/push-notifications';
import { secureGet, secureSet, secureRemove } from './secure-storage';

const PUSH_TOKEN_KEY = 'kedy.mobile.pushToken';

async function getStoredPushToken(): Promise<string | null> {
  return secureGet(PUSH_TOKEN_KEY);
}

async function setStoredPushToken(token: string): Promise<void> {
  await secureSet(PUSH_TOKEN_KEY, token);
}

async function clearStoredPushToken(): Promise<void> {
  await secureRemove(PUSH_TOKEN_KEY);
}

export async function unregisterPushToken(
  apiFetch: <T>(path: string, options?: RequestInit) => Promise<T>,
): Promise<void> {
  const token = await getStoredPushToken();
  if (!token) return;

  try {
    await apiFetch('/api/mobile/push/unregister', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  } catch (error) {
    console.warn('Push unregister failed:', error);
  } finally {
    await clearStoredPushToken();
  }
}

export async function initPushNotifications(
  apiFetch: <T>(path: string, options?: RequestInit) => Promise<T>,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  let permission = await PushNotifications.checkPermissions();
  if (permission.receive === 'prompt') {
    permission = await PushNotifications.requestPermissions();
  }

  if (permission.receive !== 'granted') {
    return;
  }

  const registerToken = async (tokenValue: string) => {
    await setStoredPushToken(tokenValue);
    await apiFetch('/api/mobile/push/register', {
      method: 'POST',
      body: JSON.stringify({
        token: tokenValue,
        platform: Capacitor.getPlatform(),
      }),
    });
  };

  PushNotifications.removeAllListeners().catch(() => undefined);

  PushNotifications.addListener('registration', async (token: Token) => {
    try {
      await registerToken(token.value);
    } catch (error) {
      console.warn('Push registration callback failed:', error);
    }
  });

  PushNotifications.addListener('registrationError', (error) => {
    console.warn('Push registration error:', error);
  });

  PushNotifications.addListener('pushNotificationReceived', (_notification) => {
    // In-app inbox is backend-backed; no-op here for V1.
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (_action) => {
    // Navigation/deep-link handling is managed by notification inbox in V1.
  });

  await PushNotifications.register();
}
