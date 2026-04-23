import { API_BASE_URL, ConfigError, assertApiBaseConfigured } from './config';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function buildUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  assertApiBaseConfigured();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export async function httpRequest<T>(
  path: string,
  options: RequestInit & { token?: string; salonId?: number | null } = {},
): Promise<T> {
  let requestUrl: string;
  try {
    requestUrl = buildUrl(path);
  } catch (error) {
    if (error instanceof ConfigError) {
      throw new ApiError(error.userMessage, 0, { code: error.code });
    }
    throw error;
  }

  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.token) headers.set('Authorization', `Bearer ${options.token}`);
  if (options.salonId) headers.set('x-salon-id', String(options.salonId));

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new ApiError('Network request failed. Check connectivity and API configuration.', 0, {
      reason: error instanceof Error ? error.message : String(error),
    });
  }

  if (response.status === 204) return undefined as T;

  let body: unknown = null;
  const rawText = await response.text();

  if (rawText) {
    try {
      body = JSON.parse(rawText);
    } catch {
      body = rawText;
    }
  }

  if (!response.ok) {
    const msg =
      typeof body === 'object' && body && 'message' in body
        ? String((body as { message?: string }).message || `Request failed (${response.status})`)
        : `Request failed (${response.status})`;

    throw new ApiError(msg, response.status, body);
  }

  return body as T;
}
