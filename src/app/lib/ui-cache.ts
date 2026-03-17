const KEY_PREFIX = 'kedy_ui_snapshot_v1:';

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

