import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import {
  ActionPerformed,
  PushNotificationSchema,
  PushNotifications,
  Token,
} from '@capacitor/push-notifications';
import { secureGet, secureRemove, secureSet } from './secure-storage';

const PUSH_TOKEN_KEY = 'kedy.mobile.pushToken';

export const ANDROID_PUSH_CHANNEL_ID = 'kedy_general_notifications';
export const ANDROID_PUSH_CHANNEL_APPOINTMENT_ID = 'kedy_appointment_notifications';
export const ANDROID_PUSH_CHANNEL_BOOKING_CHANGE_ID = 'kedy_booking_change_notifications';
export const ANDROID_PUSH_CHANNEL_REPORT_ID = 'kedy_report_notifications';
export const ANDROID_PUSH_CHANNEL_HANDOVER_ID = 'kedy_handover_notifications';
export const PUSH_NOTIFICATION_RECEIVED_EVENT = 'kedy:push-notification-received';
export const PUSH_REGISTRATION_CHANGED_EVENT = 'kedy:push-registration-changed';

export type LocalPushPermissionState = 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied' | 'unsupported';

interface PushEventHandlers {
  onPushReceived?: (notification: PushNotificationSchema) => void;
  onPushAction?: (action: ActionPerformed) => void;
}

let pushEventHandlers: PushEventHandlers = {};

function dispatchPushEvent(eventName: string, detail?: unknown) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

async function getStoredPushToken(): Promise<string | null> {
  return secureGet(PUSH_TOKEN_KEY);
}

async function setStoredPushToken(token: string): Promise<void> {
  await secureSet(PUSH_TOKEN_KEY, token);
}

async function clearStoredPushToken(): Promise<void> {
  await secureRemove(PUSH_TOKEN_KEY);
}

async function createDefaultAndroidChannel(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (Capacitor.getPlatform() !== 'android') return;

  try {
    await Promise.all([
      PushNotifications.createChannel({
        id: ANDROID_PUSH_CHANNEL_ID,
        name: 'Kedy Bildirimleri',
        description: 'Genel operasyon bildirimleri',
        importance: 5,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: '#F97316',
        sound: 'default',
      }),
      PushNotifications.createChannel({
        id: ANDROID_PUSH_CHANNEL_APPOINTMENT_ID,
        name: 'Yeni Randevular',
        description: 'Yeni randevu odakli bildirimler',
        importance: 5,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: '#F97316',
        sound: 'new_appointment',
      }),
      PushNotifications.createChannel({
        id: ANDROID_PUSH_CHANNEL_BOOKING_CHANGE_ID,
        name: 'Randevu Degisiklikleri',
        description: 'Iptal, degisiklik ve waitlist bildirimleri',
        importance: 5,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: '#F97316',
        sound: 'booking_changed_canceled',
      }),
      PushNotifications.createChannel({
        id: ANDROID_PUSH_CHANNEL_REPORT_ID,
        name: 'Rapor Bildirimleri',
        description: 'Gun sonu ve performans raporlari',
        importance: 4,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: '#F97316',
        sound: 'report',
      }),
      PushNotifications.createChannel({
        id: ANDROID_PUSH_CHANNEL_HANDOVER_ID,
        name: 'Handover Bildirimleri',
        description: 'Mudahale ve handover gerektiren durumlar',
        importance: 5,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: '#F97316',
        sound: 'handover',
      }),
    ]);
  } catch (error) {
    console.warn('Push channel creation failed:', error);
  }
}

async function buildDeviceRegistrationPayload(): Promise<{
  appVersion: string | null;
  deviceMeta: Record<string, unknown>;
}> {
  const [appInfo, deviceInfo] = await Promise.all([
    CapacitorApp.getInfo().catch(() => null),
    Device.getInfo().catch(() => null),
  ]);

  return {
    appVersion: appInfo?.version || null,
    deviceMeta: {
      appBuild: appInfo?.build || null,
      appName: appInfo?.name || null,
      platform: Capacitor.getPlatform(),
      operatingSystem: deviceInfo?.operatingSystem || null,
      osVersion: deviceInfo?.osVersion || null,
      model: deviceInfo?.model || null,
      manufacturer: deviceInfo?.manufacturer || null,
      isVirtual: typeof deviceInfo?.isVirtual === 'boolean' ? deviceInfo.isVirtual : null,
      webViewVersion: deviceInfo?.webViewVersion || null,
      language: typeof navigator !== 'undefined' ? navigator.language : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    },
  };
}

export function setPushEventHandlers(nextHandlers: PushEventHandlers): void {
  pushEventHandlers = nextHandlers;
}

export async function getLocalPushPermissionState(): Promise<LocalPushPermissionState> {
  if (!Capacitor.isNativePlatform()) {
    return 'unsupported';
  }

  try {
    const permission = await PushNotifications.checkPermissions();
    return permission.receive as LocalPushPermissionState;
  } catch {
    return 'unsupported';
  }
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
    if (Capacitor.isNativePlatform()) {
      PushNotifications.unregister().catch(() => undefined);
    }
    await clearStoredPushToken();
    dispatchPushEvent(PUSH_REGISTRATION_CHANGED_EVENT);
  }
}

export async function initPushNotifications(
  apiFetch: <T>(path: string, options?: RequestInit) => Promise<T>,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  await createDefaultAndroidChannel();

  let permission = await PushNotifications.checkPermissions();
  if (permission.receive === 'prompt') {
    permission = await PushNotifications.requestPermissions();
  }

  if (permission.receive !== 'granted') {
    dispatchPushEvent(PUSH_REGISTRATION_CHANGED_EVENT);
    return;
  }

  const registerToken = async (tokenValue: string) => {
    const deviceContext = await buildDeviceRegistrationPayload();

    await setStoredPushToken(tokenValue);
    await apiFetch('/api/mobile/push/register', {
      method: 'POST',
      body: JSON.stringify({
        token: tokenValue,
        platform: Capacitor.getPlatform(),
        appVersion: deviceContext.appVersion,
        deviceMeta: deviceContext.deviceMeta,
      }),
    });
    dispatchPushEvent(PUSH_REGISTRATION_CHANGED_EVENT);
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
    dispatchPushEvent(PUSH_REGISTRATION_CHANGED_EVENT);
  });

  PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
    dispatchPushEvent(PUSH_NOTIFICATION_RECEIVED_EVENT, notification);
    pushEventHandlers.onPushReceived?.(notification);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
    pushEventHandlers.onPushAction?.(action);
  });

  await PushNotifications.register();
}
