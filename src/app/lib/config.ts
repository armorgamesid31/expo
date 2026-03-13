function normalizeBaseUrl(value: string): string {
  return value.replace(/\/$/, '');
}

function inferApiBaseFromLocation(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const { protocol, host } = window.location;

  if (host.startsWith('mobil.')) {
    return `${protocol}//${host.replace(/^mobil\./, 'app.')}`;
  }

  return `${protocol}//${host}`;
}

const envBase = (import.meta as any).env?.VITE_API_BASE_URL;

export const API_BASE_URL = normalizeBaseUrl(
  typeof envBase === 'string' && envBase.trim() ? envBase.trim() : inferApiBaseFromLocation(),
);

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'kedy.mobile.accessToken',
  REFRESH_TOKEN: 'kedy.mobile.refreshToken',
} as const;
