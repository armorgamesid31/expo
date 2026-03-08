export const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'kedy.mobile.accessToken',
  REFRESH_TOKEN: 'kedy.mobile.refreshToken',
} as const;
