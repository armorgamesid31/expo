import { useEffect, useRef } from 'react';
import { API_BASE_URL } from './config';

type ChannelType = 'INSTAGRAM' | 'WHATSAPP';

export type RealtimeSyncStatus = 'connecting' | 'live' | 'recovering' | 'degraded';

export type ConversationRealtimeEvent = {
  cursor: number;
  salonId: number;
  channel: ChannelType;
  conversationKey: string;
  eventType: string;
  messageEventId: number | null;
  eventTimestamp: string;
};

type RealtimeSyncResponse = {
  events: ConversationRealtimeEvent[];
  latestCursor: number;
  hasGap: boolean;
  requiresFullRefresh: boolean;
};

type RealtimeEventReady = {
  latestCursor?: unknown;
  channel?: unknown;
};

type RealtimeEventHeartbeat = {
  latestCursor?: unknown;
};

type UseConversationRealtimeSyncOptions = {
  enabled: boolean;
  accessToken: string | null;
  channel?: ChannelType | null;
  cursorScopeKey: string;
  apiFetch: <T>(path: string, options?: RequestInit) => Promise<T>;
  onEvents: (events: ConversationRealtimeEvent[], source: 'stream' | 'sync') => void | Promise<void>;
  onRequireFullRefresh: (reason: 'gap' | 'reconnect') => void | Promise<void>;
  onStatusChange?: (status: RealtimeSyncStatus) => void;
};

const BACKOFF_MIN_MS = 500;
const BACKOFF_MAX_MS = 15000;
const SYNC_LIMIT = 300;

function toSafeCursor(value: unknown): number {
  const numeric = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  if (!Number.isInteger(numeric) || numeric <= 0) {
    return 0;
  }
  return numeric;
}

function toSessionKey(scope: string, channel?: ChannelType | null): string {
  return `kedy.realtime.cursor.${scope}.${channel || 'ALL'}`;
}

function readStoredCursor(scope: string, channel?: ChannelType | null): number {
  try {
    const value = window.sessionStorage.getItem(toSessionKey(scope, channel));
    return toSafeCursor(value);
  } catch {
    return 0;
  }
}

function persistCursor(scope: string, channel: ChannelType | null | undefined, cursor: number): void {
  try {
    window.sessionStorage.setItem(toSessionKey(scope, channel), String(cursor));
  } catch {
    // no-op
  }
}

function computeBackoffMs(attempt: number): number {
  const base = Math.min(BACKOFF_MAX_MS, BACKOFF_MIN_MS * Math.pow(2, Math.max(0, attempt)));
  const jitter = Math.floor(Math.random() * 300);
  return Math.min(BACKOFF_MAX_MS, base + jitter);
}

function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function useConversationRealtimeSync(options: UseConversationRealtimeSyncOptions): void {
  const cursorRef = useRef<number>(0);
  const reconnectAttemptRef = useRef(0);
  const streamRef = useRef<EventSource | null>(null);
  const recoverTimerRef = useRef<number | null>(null);
  const destroyedRef = useRef(false);
  const statusRef = useRef<RealtimeSyncStatus>('connecting');
  const syncInFlightRef = useRef(false);

  const onEventsRef = useRef(options.onEvents);
  const onRequireFullRefreshRef = useRef(options.onRequireFullRefresh);
  const onStatusChangeRef = useRef(options.onStatusChange);
  onEventsRef.current = options.onEvents;
  onRequireFullRefreshRef.current = options.onRequireFullRefresh;
  onStatusChangeRef.current = options.onStatusChange;

  useEffect(() => {
    if (!options.enabled || !options.accessToken) {
      return;
    }

    destroyedRef.current = false;
    cursorRef.current = readStoredCursor(options.cursorScopeKey, options.channel || null);

    const setStatus = (next: RealtimeSyncStatus) => {
      if (statusRef.current === next) return;
      statusRef.current = next;
      onStatusChangeRef.current?.(next);
    };

    const applyCursor = (next: number) => {
      if (next <= cursorRef.current) return;
      cursorRef.current = next;
      persistCursor(options.cursorScopeKey, options.channel || null, next);
    };

    const runSync = async (reason: 'startup' | 'reconnect' | 'lifecycle'): Promise<void> => {
      if (syncInFlightRef.current) return;
      syncInFlightRef.current = true;
      try {
        setStatus('recovering');
        const params = new URLSearchParams();
        params.set('since', String(cursorRef.current));
        params.set('limit', String(SYNC_LIMIT));
        if (options.channel) {
          params.set('channel', options.channel);
        }

        const response = await options.apiFetch<RealtimeSyncResponse>(
          `/api/admin/conversations/realtime/sync?${params.toString()}`,
        );

        if (response.requiresFullRefresh || response.hasGap) {
          await onRequireFullRefreshRef.current(reason === 'startup' ? 'reconnect' : 'gap');
          applyCursor(toSafeCursor(response.latestCursor));
          return;
        }

        const events = Array.isArray(response.events) ? response.events : [];
        if (events.length > 0) {
          await onEventsRef.current(events, 'sync');
          for (const event of events) {
            applyCursor(toSafeCursor(event.cursor));
          }
        }
        applyCursor(toSafeCursor(response.latestCursor));
      } catch (error) {
        console.warn('[realtime-sync] sync failed:', error);
        setStatus('degraded');
      } finally {
        syncInFlightRef.current = false;
      }
    };

    const clearRecoverTimer = () => {
      if (recoverTimerRef.current) {
        window.clearTimeout(recoverTimerRef.current);
        recoverTimerRef.current = null;
      }
    };

    const closeStream = () => {
      const stream = streamRef.current;
      streamRef.current = null;
      if (!stream) return;
      stream.close();
    };

    const openStream = () => {
      if (destroyedRef.current) return;

      setStatus('connecting');
      const params = new URLSearchParams();
      params.set('authToken', options.accessToken || '');
      params.set('cursor', String(cursorRef.current));
      if (options.channel) {
        params.set('channel', options.channel);
      }
      const streamUrl = `${API_BASE_URL}/api/admin/conversations/stream?${params.toString()}`;
      const stream = new EventSource(streamUrl);
      streamRef.current = stream;

      stream.addEventListener('ready', (event) => {
        reconnectAttemptRef.current = 0;
        const payload = safeParse<RealtimeEventReady>((event as MessageEvent).data || '{}');
        if (!payload) return;
        applyCursor(toSafeCursor(payload.latestCursor));
        setStatus('live');
      });

      stream.addEventListener('conversation.update', async (event) => {
        const payload = safeParse<ConversationRealtimeEvent>((event as MessageEvent).data || '{}');
        if (!payload) return;
        await onEventsRef.current([payload], 'stream');
        applyCursor(toSafeCursor(payload.cursor));
      });

      stream.addEventListener('heartbeat', (event) => {
        const payload = safeParse<RealtimeEventHeartbeat>((event as MessageEvent).data || '{}');
        if (!payload) return;
        applyCursor(toSafeCursor(payload.latestCursor));
      });

      stream.onerror = () => {
        if (destroyedRef.current) return;
        closeStream();
        const attempt = reconnectAttemptRef.current;
        reconnectAttemptRef.current += 1;
        const waitMs = computeBackoffMs(attempt);
        clearRecoverTimer();
        recoverTimerRef.current = window.setTimeout(async () => {
          await runSync('reconnect');
          openStream();
        }, waitMs);
      };
    };

    const handleLifecycleSync = () => {
      if (destroyedRef.current) return;
      void runSync('lifecycle');
    };

    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        handleLifecycleSync();
      }
    };

    const focusHandler = () => handleLifecycleSync();
    const onlineHandler = () => handleLifecycleSync();

    document.addEventListener('visibilitychange', visibilityHandler);
    window.addEventListener('focus', focusHandler);
    window.addEventListener('online', onlineHandler);

    void runSync('startup').finally(() => {
      openStream();
    });

    return () => {
      destroyedRef.current = true;
      clearRecoverTimer();
      closeStream();
      document.removeEventListener('visibilitychange', visibilityHandler);
      window.removeEventListener('focus', focusHandler);
      window.removeEventListener('online', onlineHandler);
    };
  }, [options.accessToken, options.apiFetch, options.channel, options.cursorScopeKey, options.enabled]);
}
