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

type RealtimeEventReady = {
  latestCursor?: unknown;
  channel?: unknown;
};

type RealtimeEventHeartbeat = {
  latestCursor?: unknown;
};

type RealtimeWireMessage = {
  type?: unknown;
  payload?: unknown;
};

type RealtimeSyncRequired = {
  latestCursor?: unknown;
};

type UseConversationRealtimeSyncOptions = {
  enabled: boolean;
  accessToken: string | null;
  channel?: ChannelType | null;
  cursorScopeKey: string;
  apiFetch: <T>(
    path: string,
    options?: RequestInit & { __cache?: { mode?: 'swr' | 'network-only' | 'cache-only' } },
  ) => Promise<T>;
  onEvents: (events: ConversationRealtimeEvent[], source: 'stream' | 'sync') => void | Promise<void>;
  onRequireFullRefresh: (reason: 'gap' | 'reconnect') => void | Promise<void>;
  onStatusChange?: (status: RealtimeSyncStatus) => void;
};

const BACKOFF_MIN_MS = 500;
const BACKOFF_MAX_MS = 15000;

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

function buildRealtimeWsUrl(): string {
  const base = API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  if (!base) {
    return '/api/admin/conversations/ws';
  }

  const wsBase = base.startsWith('https://')
    ? `wss://${base.slice('https://'.length)}`
    : base.startsWith('http://')
      ? `ws://${base.slice('http://'.length)}`
      : base;

  return `${wsBase.replace(/\/$/, '')}/api/admin/conversations/ws`;
}

export function useConversationRealtimeSync(options: UseConversationRealtimeSyncOptions): void {
  const cursorRef = useRef<number>(0);
  const reconnectAttemptRef = useRef(0);
  const socketRef = useRef<WebSocket | null>(null);
  const recoverTimerRef = useRef<number | null>(null);
  const destroyedRef = useRef(false);
  const statusRef = useRef<RealtimeSyncStatus>('connecting');

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

    const applyCursor = (next: number, allowRollback = false) => {
      const safeNext = Number.isInteger(next) && next >= 0 ? next : 0;
      if (!allowRollback && safeNext <= cursorRef.current) return;
      if (allowRollback && safeNext === cursorRef.current) return;
      cursorRef.current = safeNext;
      persistCursor(options.cursorScopeKey, options.channel || null, safeNext);
    };

    const clearRecoverTimer = () => {
      if (recoverTimerRef.current) {
        window.clearTimeout(recoverTimerRef.current);
        recoverTimerRef.current = null;
      }
    };

    const closeSocket = () => {
      const socket = socketRef.current;
      socketRef.current = null;
      if (!socket) return;
      socket.close();
    };

    const scheduleReconnect = () => {
      if (destroyedRef.current) return;
      const attempt = reconnectAttemptRef.current;
      reconnectAttemptRef.current += 1;
      const waitMs = computeBackoffMs(attempt);
      clearRecoverTimer();
      setStatus('degraded');
      recoverTimerRef.current = window.setTimeout(() => {
        openSocket();
      }, waitMs);
    };

    const openSocket = () => {
      if (destroyedRef.current) return;

      setStatus('connecting');

      let socket: WebSocket;
      try {
        socket = new WebSocket(buildRealtimeWsUrl());
      } catch (error) {
        console.warn('[realtime-sync] websocket open failed:', error);
        scheduleReconnect();
        return;
      }

      socketRef.current = socket;

      socket.onopen = () => {
        setStatus('recovering');
        const subscribePayload = {
          type: 'subscribe',
          payload: {
            authToken: options.accessToken,
            cursor: cursorRef.current,
            channel: options.channel || null,
          },
        };
        socket.send(JSON.stringify(subscribePayload));
      };

      socket.onmessage = async (event) => {
        const wire = safeParse<RealtimeWireMessage>(String(event.data || ''));
        if (!wire || typeof wire.type !== 'string') return;

        if (wire.type === 'ready') {
          reconnectAttemptRef.current = 0;
          const payload = (wire.payload || {}) as RealtimeEventReady;
          applyCursor(toSafeCursor(payload.latestCursor), true);
          setStatus('live');
          return;
        }

        if (wire.type === 'conversation.update') {
          const payload = (wire.payload || null) as ConversationRealtimeEvent | null;
          if (!payload) return;

          const nextCursor = toSafeCursor(payload.cursor);
          if (nextCursor > 0 && nextCursor <= cursorRef.current) {
            return;
          }

          await onEventsRef.current([payload], 'stream');
          applyCursor(nextCursor);
          return;
        }

        if (wire.type === 'heartbeat') {
          const payload = (wire.payload || {}) as RealtimeEventHeartbeat;
          applyCursor(toSafeCursor(payload.latestCursor));
          return;
        }

        if (wire.type === 'sync_required') {
          const payload = (wire.payload || {}) as RealtimeSyncRequired;
          await onRequireFullRefreshRef.current('gap');
          applyCursor(toSafeCursor(payload.latestCursor), true);
          return;
        }

        if (wire.type === 'error') {
          console.warn('[realtime-sync] websocket server error payload:', wire.payload);
        }
      };

      socket.onerror = () => {
        if (destroyedRef.current) return;
        closeSocket();
        scheduleReconnect();
      };

      socket.onclose = () => {
        if (destroyedRef.current) return;
        closeSocket();
        scheduleReconnect();
      };
    };

    const handleLifecycleSync = () => {
      if (destroyedRef.current) return;
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        openSocket();
      }
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

    openSocket();

    return () => {
      destroyedRef.current = true;
      clearRecoverTimer();
      closeSocket();
      document.removeEventListener('visibilitychange', visibilityHandler);
      window.removeEventListener('focus', focusHandler);
      window.removeEventListener('online', onlineHandler);
    };
  }, [options.accessToken, options.channel, options.cursorScopeKey, options.enabled]);
}
