import { httpRequest } from './http';
import { readSnapshot, writeSnapshot } from './ui-cache';

const CONTENT_RUNTIME_CACHE_PREFIX = 'content-runtime:v1';
const DEFAULT_LOCALE = 'tr-TR';
const CONTENT_RUNTIME_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24;
const DEFAULT_SURFACE = 'mobile_app';
const DEFAULT_PAGE = 'app_shell';

export interface ContentRuntimeTenantContext {
  tenantId?: number | null;
  tenantSlug?: string | null;
  salonId?: number | null;
}

export interface ContentRuntimeBundle {
  locale: string;
  version?: string | null;
  values?: Record<string, unknown>;
  content?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ContentRuntimeCacheEnvelope {
  locale: string;
  tenantId: number | null;
  tenantSlug: string | null;
  fetchedAt: string;
  payload: ContentRuntimeBundle;
}

export interface FetchContentRuntimeInput {
  token: string;
  locale?: string | null;
  tenant?: ContentRuntimeTenantContext;
  surface?: string;
  page?: string;
}

function normalizeLocale(value?: string | null): string {
  const candidate = (value || '').trim();
  return candidate || DEFAULT_LOCALE;
}

export function resolveRuntimeLocale(explicitLocale?: string | null): string {
  if (explicitLocale && explicitLocale.trim()) {
    return normalizeLocale(explicitLocale);
  }

  if (typeof navigator !== 'undefined' && typeof navigator.language === 'string' && navigator.language.trim()) {
    return normalizeLocale(navigator.language);
  }

  return DEFAULT_LOCALE;
}

function normalizeTenantContext(tenant?: ContentRuntimeTenantContext) {
  const tenantId = tenant?.tenantId ?? tenant?.salonId ?? null;
  const tenantSlug =
    typeof tenant?.tenantSlug === 'string' && tenant.tenantSlug.trim()
      ? tenant.tenantSlug.trim()
      : null;

  return { tenantId, tenantSlug };
}

function runtimeCacheKey(locale: string, tenantId: number | null, tenantSlug: string | null): string {
  return `${CONTENT_RUNTIME_CACHE_PREFIX}:${locale}:${tenantId ?? 'none'}:${tenantSlug ?? 'none'}`;
}

export function getCachedContentRuntimeBundle(
  locale?: string | null,
  tenant?: ContentRuntimeTenantContext,
): ContentRuntimeBundle | null {
  const resolvedLocale = resolveRuntimeLocale(locale);
  const { tenantId, tenantSlug } = normalizeTenantContext(tenant);
  const key = runtimeCacheKey(resolvedLocale, tenantId, tenantSlug);

  const envelope = readSnapshot<ContentRuntimeCacheEnvelope>(key, CONTENT_RUNTIME_CACHE_MAX_AGE_MS);
  return envelope?.payload || null;
}

export function cacheContentRuntimeBundle(
  bundle: ContentRuntimeBundle,
  tenant?: ContentRuntimeTenantContext,
): void {
  const resolvedLocale = resolveRuntimeLocale(bundle?.locale);
  const normalizedBundle: ContentRuntimeBundle = {
    ...(bundle || {}),
    locale: resolvedLocale,
  };
  const { tenantId, tenantSlug } = normalizeTenantContext(tenant);
  const key = runtimeCacheKey(resolvedLocale, tenantId, tenantSlug);

  const envelope: ContentRuntimeCacheEnvelope = {
    locale: resolvedLocale,
    tenantId,
    tenantSlug,
    fetchedAt: new Date().toISOString(),
    payload: normalizedBundle,
  };

  writeSnapshot(key, envelope);
}

export async function fetchContentRuntimeBundle(
  input: FetchContentRuntimeInput,
): Promise<ContentRuntimeBundle> {
  const locale = resolveRuntimeLocale(input.locale);
  const { tenantId, tenantSlug } = normalizeTenantContext(input.tenant);
  const surface = input.surface || DEFAULT_SURFACE;
  const page = input.page || DEFAULT_PAGE;
  const params = new URLSearchParams();
  params.set('surface', surface);
  params.set('page', page);
  params.set('locale', locale);

  if (tenantId !== null && tenantId !== undefined) {
    params.set('salonId', String(tenantId));
  }

  if (tenantSlug) {
    params.set('tenantSlug', tenantSlug);
  }

  const response = await httpRequest<ContentRuntimeBundle>(
    `/api/content/runtime?${params.toString()}`,
    {
      method: 'GET',
      token: input.token,
      salonId: tenantId,
    },
  );

  if (response && typeof response === 'object') {
    return {
      ...response,
      locale: resolveRuntimeLocale((response as ContentRuntimeBundle).locale || locale),
    };
  }

  return { locale };
}

export async function prefetchContentRuntimeBundle(
  input: FetchContentRuntimeInput,
): Promise<void> {
  try {
    const bundle = await fetchContentRuntimeBundle(input);
    cacheContentRuntimeBundle(bundle, input.tenant);
  } catch {
    // Best-effort: content prefetch should never impact auth/bootstrap flow.
  }
}
