import Constants from 'expo-constants';

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/$/, '');
}

const envBase = process.env.EXPO_PUBLIC_API_BASE_URL;
const extraBase = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;
const envPushEnabled = process.env.EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS;
const extraPushEnabled = Constants.expoConfig?.extra?.enablePushNotifications;

export const API_BASE_URL = normalizeBaseUrl(
  typeof envBase === 'string' && envBase.trim()
    ? envBase.trim()
    : typeof extraBase === 'string' && extraBase.trim()
      ? extraBase.trim()
      : '',
);

export const ENABLE_PUSH_NOTIFICATIONS =
  typeof envPushEnabled === 'string'
    ? ['1', 'true', 'yes', 'on'].includes(envPushEnabled.trim().toLowerCase())
    : Boolean(extraPushEnabled);

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'kedy.mobile.accessToken',
  REFRESH_TOKEN: 'kedy.mobile.refreshToken',
  THEME: 'kedy.theme',
  LOCALE: 'kedy.mobile.locale',
  PUSH_TOKEN: 'kedy.mobile.pushToken',
} as const;

export class ConfigError extends Error {
  code: 'API_BASE_URL_MISSING';
  userMessage: string;

  constructor(message: string, code: 'API_BASE_URL_MISSING', userMessage: string) {
    super(message);
    this.name = 'ConfigError';
    this.code = code;
    this.userMessage = userMessage;
  }
}

export function assertApiBaseConfigured() {
  if (!API_BASE_URL) {
    throw new ConfigError(
      'API base URL is missing. Set EXPO_PUBLIC_API_BASE_URL in your environment.',
      'API_BASE_URL_MISSING',
      'Application configuration is incomplete. Please set EXPO_PUBLIC_API_BASE_URL and restart the app.',
    );
  }
}
