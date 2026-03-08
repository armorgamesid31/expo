import { API_BASE_URL } from './config';

export class ApiError extends Error {
  status: number;
  body: any;

  constructor(message: string, status: number, body: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function buildUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
}

export async function httpRequest<T>(
  path: string,
  options: RequestInit & { token?: string; salonId?: number | null } = {},
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  if (options.salonId) {
    headers.set('x-salon-id', String(options.salonId));
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  let body: any = null;
  const rawText = await response.text();

  if (rawText) {
    try {
      body = JSON.parse(rawText);
    } catch {
      body = rawText;
    }
  }

  if (!response.ok) {
    const message = body?.message || `Request failed (${response.status})`;
    throw new ApiError(message, response.status, body);
  }

  return body as T;
}
