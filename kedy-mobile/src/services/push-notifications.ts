import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { STORAGE_KEYS } from '@/lib/config';
import { secureGet, secureRemove, secureSet } from '@/services/secure-storage';
import type {
  PushProvider,
  PushRegistrationPayload,
  PushUnregisterPayload,
} from '@/types/mobile-api';

const PUSH_PROVIDER: PushProvider = 'expo';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function getCurrentPushToken() {
  return await secureGet(STORAGE_KEYS.PUSH_TOKEN);
}

export async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Varsayilan',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F07122',
    });
  }

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return null;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await secureSet(STORAGE_KEYS.PUSH_TOKEN, token);

  return token;
}

export async function unregisterPushToken(
  apiFetch: <T>(path: string, options?: RequestInit) => Promise<T>,
): Promise<void> {
  const token = await getCurrentPushToken();
  if (!token) return;

  const payload: PushUnregisterPayload = { token, provider: PUSH_PROVIDER };
  await apiFetch('/api/mobile/push/unregister', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  // Keep token for retry if request fails; only clear on successful unregister.
  await secureRemove(STORAGE_KEYS.PUSH_TOKEN);
}

export async function syncPushToken(
  apiFetch: <T>(path: string, options?: RequestInit) => Promise<T>,
): Promise<void> {
  const token = await registerForPush();
  if (!token) return;

  const payload: PushRegistrationPayload = {
    token,
    provider: PUSH_PROVIDER,
    platform: Platform.OS,
    appVersion: Application.nativeApplicationVersion ?? null,
    deviceMeta: {
      appBuild: Application.nativeBuildVersion ?? null,
      appName: Application.applicationName ?? null,
      platform: Platform.OS,
      operatingSystem: Device.osName ?? null,
      osVersion: Device.osVersion ?? null,
      model: Device.modelName ?? null,
      manufacturer: Device.manufacturer ?? null,
      isVirtual: Device.isDevice === false,
    },
  };

  await apiFetch('/api/mobile/push/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
