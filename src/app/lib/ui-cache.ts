const KEY_PREFIX = 'kedy_ui_snapshot_v1:';
const DATA_CHANGE_BROADCAST_KEY = `${KEY_PREFIX}data_change`;
const DATA_CHANGE_EVENT = 'kedy:data-change';

interface SnapshotEnvelope<T> {
  ts: number;
  value: T;
}

function buildKey(key: string): string {
  return `${KEY_PREFIX}${key}`;
}

export function readSnapshot<T>(key: string, maxAgeMs?: number): T | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(buildKey(key));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as SnapshotEnvelope<T>;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.ts !== 'number') {
      return null;
    }

    if (typeof maxAgeMs === 'number' && maxAgeMs > 0) {
      const age = Date.now() - parsed.ts;
      if (age > maxAgeMs) {
        return null;
      }
    }

    return parsed.value;
  } catch {
    return null;
  }
}

export function writeSnapshot<T>(key: string, value: T): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const payload: SnapshotEnvelope<T> = {
      ts: Date.now(),
      value,
    };
    window.localStorage.setItem(buildKey(key), JSON.stringify(payload));
  } catch {
    // ignore storage failures
  }
}

export function removeSnapshot(key: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(buildKey(key));
  } catch {
    // ignore storage failures
  }
}

export function notifyDataChanged(domains: string[] = []): void {
  if (typeof window === 'undefined') {
    return;
  }

  const payload = {
    ts: Date.now(),
    domains
  };

  try {
    window.localStorage.setItem(DATA_CHANGE_BROADCAST_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage failures
  }

  try {
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT, { detail: payload }));
  } catch {
    // ignore event dispatch failures
  }
}

export function subscribeDataChanged(listener: (domains: string[]) => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const onCustom = (event: Event) => {
    const detail = (event as CustomEvent<{ domains?: string[]; }>).detail;
    listener(Array.isArray(detail?.domains) ? detail.domains : []);
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== DATA_CHANGE_BROADCAST_KEY || !event.newValue) {
      return;
    }
    try {
      const parsed = JSON.parse(event.newValue) as { domains?: string[]; };
      listener(Array.isArray(parsed?.domains) ? parsed.domains : []);
    } catch {
      listener([]);
    }
  };

  window.addEventListener(DATA_CHANGE_EVENT, onCustom as EventListener);
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener(DATA_CHANGE_EVENT, onCustom as EventListener);
    window.removeEventListener('storage', onStorage);
  };
}
