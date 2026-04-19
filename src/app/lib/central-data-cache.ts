import { Preferences } from '@capacitor/preferences';

const CACHE_PREFIX = 'kedy.mobile.data-cache:';
const CACHE_INDEX_KEY = `${CACHE_PREFIX}__index__`;

export type CentralCacheMode = 'swr' | 'network-only' | 'cache-only';

export interface CentralCacheEntry<T = unknown> {
  value: T;
  updatedAt: number;
}

export interface CentralCacheDescriptor {
  key: string;
  scope: string;
  path: string;
  method: 'GET';
  lastAccessedAt: number;
}

const memoryCache = new Map<string, CentralCacheEntry>();
const descriptorRegistry = new Map<string, CentralCacheDescriptor>();
const inFlight = new Map<string, Promise<unknown>>();
let indexLoaded = false;

function composeStorageKey(key: string) {
  return `${CACHE_PREFIX}${key}`;
}

function serializeDescriptor(descriptor: CentralCacheDescriptor) {
  return JSON.stringify(descriptor);
}

function now() {
  return Date.now();
}

async function loadIndexIfNeeded() {
  if (indexLoaded) return;
  indexLoaded = true;
  try {
    const raw = await Preferences.get({ key: CACHE_INDEX_KEY });
    if (!raw.value) return;
    const parsed = JSON.parse(raw.value) as CentralCacheDescriptor[];
    for (const item of parsed || []) {
      if (item?.key) {
        descriptorRegistry.set(item.key, item);
      }
    }
  } catch (error) {
    console.warn('Failed to load central cache index:', error);
  }
}

async function persistIndex() {
  try {
    const descriptors = Array.from(descriptorRegistry.values()).sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
    await Preferences.set({
      key: CACHE_INDEX_KEY,
      value: JSON.stringify(descriptors),
    });
  } catch (error) {
    console.warn('Failed to persist central cache index:', error);
  }
}

async function readPersistedEntry<T>(key: string): Promise<CentralCacheEntry<T> | null> {
  try {
    const raw = await Preferences.get({ key: composeStorageKey(key) });
    if (!raw.value) return null;
    const parsed = JSON.parse(raw.value) as CentralCacheEntry<T>;
    if (!parsed || typeof parsed.updatedAt !== 'number') return null;
    return parsed;
  } catch (error) {
    console.warn(`Failed to read central cache entry (${key}):`, error);
    return null;
  }
}

async function writePersistedEntry<T>(key: string, entry: CentralCacheEntry<T>) {
  try {
    await Preferences.set({
      key: composeStorageKey(key),
      value: JSON.stringify(entry),
    });
  } catch (error) {
    console.warn(`Failed to write central cache entry (${key}):`, error);
  }
}

function cacheKeyOf(scope: string, path: string) {
  return `${scope}:GET:${path}`;
}

export function buildCentralCacheKey(scope: string, path: string) {
  return cacheKeyOf(scope, path);
}

export async function readCentralCache<T>(key: string): Promise<CentralCacheEntry<T> | null> {
  const memory = memoryCache.get(key) as CentralCacheEntry<T> | undefined;
  if (memory) return memory;
  const persisted = await readPersistedEntry<T>(key);
  if (persisted) {
    memoryCache.set(key, persisted as CentralCacheEntry);
  }
  return persisted;
}

export async function writeCentralCache<T>(key: string, value: T, descriptor: Omit<CentralCacheDescriptor, 'key' | 'method' | 'lastAccessedAt'>) {
  const entry: CentralCacheEntry<T> = {
    value,
    updatedAt: now(),
  };
  memoryCache.set(key, entry as CentralCacheEntry);
  await writePersistedEntry(key, entry);

  await loadIndexIfNeeded();
  descriptorRegistry.set(key, {
    key,
    method: 'GET',
    scope: descriptor.scope,
    path: descriptor.path,
    lastAccessedAt: now(),
  });
  void persistIndex();
}

export async function touchCentralDescriptor(key: string, descriptor: Omit<CentralCacheDescriptor, 'key' | 'method' | 'lastAccessedAt'>) {
  await loadIndexIfNeeded();
  const existing = descriptorRegistry.get(key);
  descriptorRegistry.set(key, {
    key,
    method: 'GET',
    scope: descriptor.scope,
    path: descriptor.path,
    lastAccessedAt: now(),
    ...(existing ? { scope: existing.scope, path: existing.path } : {}),
  });
  void persistIndex();
}

export function queueCentralRevalidate<T>(key: string, fetcher: () => Promise<T>) {
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = (async () => {
    try {
      return await fetcher();
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise as Promise<unknown>);
  return promise;
}

export async function resolveCentralGet<T>(params: {
  scope: string;
  path: string;
  mode: CentralCacheMode;
  fetchNetwork: () => Promise<T>;
}) {
  const key = cacheKeyOf(params.scope, params.path);
  await touchCentralDescriptor(key, { scope: params.scope, path: params.path });

  if (params.mode === 'network-only') {
    const fresh = await queueCentralRevalidate(key, params.fetchNetwork);
    await writeCentralCache(key, fresh, { scope: params.scope, path: params.path });
    return fresh;
  }

  const cached = await readCentralCache<T>(key);
  if (cached?.value !== undefined) {
    if (params.mode === 'swr') {
      void queueCentralRevalidate(key, params.fetchNetwork).then(async (fresh) => {
        await writeCentralCache(key, fresh, { scope: params.scope, path: params.path });
      }).catch(() => undefined);
    }
    return cached.value;
  }

  if (params.mode === 'cache-only') {
    throw new Error('Cached data not found.');
  }

  const fresh = await queueCentralRevalidate(key, params.fetchNetwork);
  await writeCentralCache(key, fresh, { scope: params.scope, path: params.path });
  return fresh;
}

export async function revalidateAllCentralCache(
  refetcher: (descriptor: CentralCacheDescriptor) => Promise<unknown>,
) {
  await loadIndexIfNeeded();
  const descriptors = Array.from(descriptorRegistry.values());
  if (!descriptors.length) return;

  await Promise.all(
    descriptors.map(async (descriptor) => {
      try {
        const fresh = await queueCentralRevalidate(descriptor.key, () => refetcher(descriptor));
        await writeCentralCache(descriptor.key, fresh, { scope: descriptor.scope, path: descriptor.path });
      } catch {
        // Background refresh failures are intentionally ignored.
      }
    }),
  );
}

export function descriptorFromPath(scope: string, path: string) {
  const key = cacheKeyOf(scope, path);
  return {
    key,
    scope,
    path,
    method: 'GET' as const,
    lastAccessedAt: now(),
  };
}

export function clearCentralMemoryCache() {
  memoryCache.clear();
}

export function stableDescriptorToken(descriptor: CentralCacheDescriptor) {
  return serializeDescriptor(descriptor);
}
