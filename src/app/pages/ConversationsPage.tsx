import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, MessageCircle, Search, Send, MessageSquareDashed, ChevronLeft, Instagram, Sparkles, SendHorizontal, LifeBuoy } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Skeleton } from '../components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useAuth } from '../context/AuthContext';
import { useToasts } from '../context/ToastContext';
import { format, isToday, isYesterday } from 'date-fns';
import { tr } from 'date-fns/locale/tr';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ConversationRealtimeEvent, RealtimeSyncStatus, useConversationRealtimeSync } from '../lib/realtime-conversation-sync';
import { readSnapshot, writeSnapshot } from '../lib/ui-cache';
import { API_BASE_URL } from '../lib/config';
import { httpRequest } from '../lib/http';
import { ConversationsList } from '../components/conversations/ConversationsList';
import { ConversationDetail } from '../components/conversations/ConversationDetail';

import type {
  ChannelType,
  ChannelFilter,
  AutomationMode,
  ConversationItem,
  MessageItem,
  ConversationStatePayload,
  InstagramChannelHealth,
  WhatsAppChannelHealth,
  ChannelHealthPayload,
  LinkedCustomerProfile,
  BlacklistCheckResult,
  ReadReceiptMap
} from '../components/conversations/types';
const SHOW_WHATSAPP_INBOX = true;
const CONVERSATIONS_SELECTED_CHANNEL_CACHE_KEY = 'conversations:selected-channel';
const CONVERSATIONS_SELECTED_ID_CACHE_KEY = 'conversations:selected-id';
const CONVERSATIONS_MOBILE_VIEW_CACHE_KEY = 'conversations:mobile-view';
const CONVERSATIONS_READ_RECEIPTS_CACHE_KEY = 'conversations:read-receipts';
const INSTAGRAM_REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;


function WhatsAppLogo({ className }: { className?: string; }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M12.04 2C6.52 2 2.05 6.48 2.05 11.99c0 1.77.46 3.5 1.34 5.03L2 22l5.13-1.35a9.94 9.94 0 0 0 4.9 1.25h.01c5.52 0 9.99-4.48 9.99-9.99A9.95 9.95 0 0 0 12.04 2zm5.82 14.17c-.25.71-1.45 1.36-2 1.44-.52.08-1.17.11-1.89-.12-.44-.14-1-.33-1.72-.64-3.02-1.31-4.98-4.36-5.13-4.56-.15-.2-1.23-1.63-1.23-3.11 0-1.48.78-2.2 1.06-2.5.27-.3.6-.37.8-.37.2 0 .4 0 .57.01.18.01.42-.07.66.5.25.6.84 2.08.91 2.23.08.15.13.33.03.53-.1.2-.15.33-.3.5-.15.18-.31.4-.44.53-.15.15-.3.31-.13.61.18.3.78 1.28 1.67 2.08 1.15 1.03 2.11 1.35 2.41 1.5.3.15.47.13.65-.08.18-.2.74-.86.94-1.16.2-.3.4-.25.68-.15.28.1 1.77.84 2.07.99.31.15.51.23.58.35.08.13.08.74-.17 1.45z"
      />
    </svg>
  );
}

function formatTs(value: string): string {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  
  if (isToday(dt)) {
    return format(dt, 'HH:mm');
  } else if (isYesterday(dt)) {
    return 'Dün ' + format(dt, 'HH:mm');
  } else {
    return format(dt, 'd MMM HH:mm', { locale: tr });
  }
}

function getPreview(item: ConversationItem): string {
  if (item.lastMessageText && item.lastMessageText.trim()) return formatOperatorMessage(item.lastMessageText.trim());
  if (item.lastMessageType === 'image') return '[Görüntü]';
  if (item.lastMessageType === 'audio') return '[Ses]';
  if (item.lastMessageType === 'video') return '[Video]';
  if (item.lastMessageType === 'handover_request') return 'Müşteri temsilci bekliyor';
  if (item.lastMessageType === 'echo_template') return 'Otomatik yanıt gönderildi.';
  return `[${item.lastMessageType}]`;
}

function formatOperatorMessage(value: string | null | undefined): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return '';
  if (/^\[echo_template\]$/i.test(text)) return 'Otomatik yanıt gönderildi.';
  if (/^\[Used tools:/i.test(text)) {
    const withoutToolLog = text.replace(/^\[Used tools:[\s\S]*\]\s*/i, '').trim();
    return withoutToolLog || 'Asistan hizmet bilgisini kontrol etti.';
  }
  return text;
}

function isInstagramReplyWindowExpired(lastCustomerMessageAt?: string | null): boolean {
  if (typeof lastCustomerMessageAt !== 'string' || !lastCustomerMessageAt.trim()) return false;
  const lastCustomerTs = new Date(lastCustomerMessageAt).getTime();
  if (!Number.isFinite(lastCustomerTs)) return false;
  return Date.now() - lastCustomerTs > INSTAGRAM_REPLY_WINDOW_MS;
}

function formatMessageTypeLabel(type: string): string {
  if (type === 'echo_template') return 'Otomatik yanıt gönderildi.';
  return `[${type}]`;
}

function formatRelativeTime(value: string): string {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  const now = Date.now();
  const diffMs = now - dt.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'şimdi';
  if (diffMin < 60) return `${diffMin}dk`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}sa`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}g`;
  return formatTs(value);
}

function toUserFriendlyError(err: any, fallback: string): string {
  const raw =
    (typeof err?.body?.message === 'string' && err.body.message.trim()) ||
    (typeof err?.message === 'string' && err.message.trim()) ||
    '';
  if (!raw) return fallback;
  if (/^request failed \(\d+\)$/i.test(raw)) return fallback;
  return raw;
}

function normalizeUsername(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/^@/, '');
  return trimmed || null;
}

function normalizeName(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
}

function conversationDisplayName(item: Pick<ConversationItem, 'customerName' | 'profileUsername' | 'conversationKey'>): string {
  if (item.customerName && item.customerName.trim()) return item.customerName.trim();
  const username = normalizeUsername(item.profileUsername);
  if (username) return `@${username}`;
  return 'İsimsiz Kullanıcı';
}

function initialsFromLabel(value: string | null | undefined): string {
  if (!value) return 'U';
  const cleaned = value.replace(/^@/, '').trim();
  if (!cleaned) return 'U';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function normalizeAutomationMode(value: unknown): AutomationMode {
  if (
    value === 'AUTO' ||
    value === 'HUMAN_PENDING' ||
    value === 'HUMAN_ACTIVE' ||
    value === 'MANUAL_ALWAYS' ||
    value === 'AUTO_RESUME_PENDING') {
    return value;
  }
  return 'AUTO';
}

function buildConversationAvatarSrc(input: {
  channel: ChannelType;
  conversationKey: string;
  sourceUrl: string | null | undefined;
  accessToken: string | null | undefined;
}): string | null {
  const source = typeof input.sourceUrl === 'string' ? input.sourceUrl.trim() : '';
  if (!source) return null;
  const token = typeof input.accessToken === 'string' ? input.accessToken.trim() : '';
  if (!token) return source;

  const params = new URLSearchParams({
    channel: input.channel,
    conversationKey: input.conversationKey,
    sourceUrl: source,
    authToken: token,
  });
  return `${API_BASE_URL}/api/admin/conversations/profile-image?${params.toString()}`;
}

function isHandoverInProgress(mode: AutomationMode): boolean {
  return mode === 'HUMAN_PENDING' || mode === 'HUMAN_ACTIVE';
}

function channelLabel(channel: ChannelType | undefined): string {
  if (channel === 'INSTAGRAM') return 'Instagram';
  if (channel === 'WHATSAPP') return 'WhatsApp';
  return 'Uygulama';
}

function realtimeStatusMeta(status: RealtimeSyncStatus): {
  label: string;
  dotClass: string;
  badgeClass: string;
} {
  if (status === 'live') {
    return {
      label: 'Canlı',
      dotClass: 'bg-emerald-500',
      badgeClass: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20',
    };
  }
  if (status === 'recovering' || status === 'connecting') {
    return {
      label: 'Toparlanıyor',
      dotClass: 'bg-amber-500',
      badgeClass: 'text-amber-700 bg-amber-500/10 border-amber-500/20',
    };
  }
  return {
    label: 'Zayıf',
    dotClass: 'bg-rose-500',
    badgeClass: 'text-rose-700 bg-rose-500/10 border-rose-500/20',
  };
}

function normalizeConversationKeyForClient(channel: ChannelType, conversationKey: string): string {
  const trimmed = conversationKey.trim();
  if (!trimmed) return '';
  const prefix = `${channel}:`;
  if (trimmed.startsWith(prefix)) {
    return trimmed.slice(prefix.length).trim();
  }
  return trimmed;
}

function toConversationId(channel: ChannelType, conversationKey: string): string {
  const normalizedKey = normalizeConversationKeyForClient(channel, conversationKey);
  return `${channel}:${normalizedKey || conversationKey.trim()}`;
}

function normalizeConversationRouteParam(value: string | undefined): string | null {
  if (!value) return null;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }
  if (!decoded.includes(':')) return null;
  const [rawChannel, ...rest] = decoded.split(':');
  const channel = rawChannel === 'INSTAGRAM' || rawChannel === 'WHATSAPP' ? rawChannel : null;
  const key = rest.join(':').trim();
  if (!channel || !key) return null;
  const normalizedKey = normalizeConversationKeyForClient(channel, key);
  return normalizedKey ? `${channel}:${normalizedKey}` : null;
}

async function withTimeout<T>(task: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    task.
      then((value) => resolve(value)).
      catch((error) => reject(error)).
      finally(() => window.clearTimeout(timeoutId));
  });
}

function describeMessageSource(msg: MessageItem, selectedChannel?: ChannelType): string {
  const activeChannel = msg.deliveryChannel || selectedChannel;
  if (msg.direction === 'inbound') {
    return `${channelLabel(activeChannel)} uygulaması`;
  }
  if (msg.direction === 'system') {
    return `${channelLabel(activeChannel)} · Kedy Sistem`;
  }

  if (msg.outboundSource === 'AI_AGENT') {
    return 'Kedy AI';
  }
  if (msg.outboundSource === 'HUMAN_APP') {
    return 'Kedy App';
  }
  return `${channelLabel(activeChannel)} uygulaması`;
}

function describeMessageAuthor(msg: MessageItem): string {
  if (msg.direction === 'inbound') return 'Müşteri';
  if (msg.direction === 'system') {
    const displayName =
      typeof msg.systemActorDisplayName === 'string' ? msg.systemActorDisplayName.trim() : '';
    if (displayName) return displayName;
    const email = typeof msg.systemActorEmail === 'string' ? msg.systemActorEmail.trim() : '';
    if (email) return email;
    if (Number.isInteger(Number(msg.systemActorUserId)) && Number(msg.systemActorUserId) > 0) {
      return `Kullanıcı #${Number(msg.systemActorUserId)}`;
    }
    return 'Sistem';
  }
  if (msg.outboundSource === 'AI_AGENT') return 'Kedy AI';

  const senderEmail = typeof msg.outboundSenderEmail === 'string' ? msg.outboundSenderEmail.trim() : '';
  if (senderEmail) return senderEmail;
  const sourceLabel = typeof msg.outboundSourceLabel === 'string' ? msg.outboundSourceLabel.trim() : '';
  if (sourceLabel) return sourceLabel;
  return 'Salon Ekibi';
}

function findRelatedConversationKeys(
  items: ConversationItem[],
  selected: { channel: ChannelType; conversationKey: string; })
  : Array<{ channel: ChannelType; conversationKey: string; }> {
  const selectedItem = items.find(
    (item) => item.channel === selected.channel && item.conversationKey === selected.conversationKey
  );
  if (!selectedItem) return [selected];

  if (selected.channel !== 'INSTAGRAM') return [selected];

  const selectedUsername = normalizeUsername(selectedItem.profileUsername);
  const selectedName = normalizeName(selectedItem.customerName);
  const selectedLinkedId =
    typeof selectedItem.linkedCustomerId === 'number' && selectedItem.linkedCustomerId > 0 ?
      selectedItem.linkedCustomerId :
      null;

  const related = items.filter((item) => {
    if (item.channel !== 'INSTAGRAM') return false;
    if (item.conversationKey === selectedItem.conversationKey) return true;

    const linkedId = typeof item.linkedCustomerId === 'number' && item.linkedCustomerId > 0 ? item.linkedCustomerId : null;
    if (selectedLinkedId && linkedId && selectedLinkedId === linkedId) return true;

    const itemUsername = normalizeUsername(item.profileUsername);
    if (selectedUsername && itemUsername && selectedUsername === itemUsername) return true;

    const itemName = normalizeName(item.customerName);
    if (selectedName && itemName && selectedName === itemName) return true;

    return false;
  });

  return Array.from(
    new Map(
      related.
        sort((a, b) => {
          if (a.conversationKey === selected.conversationKey) return -1;
          if (b.conversationKey === selected.conversationKey) return 1;
          return (b.messageCount || 0) - (a.messageCount || 0);
        }).
        map((item) => [`${item.channel}:${item.conversationKey}`, { channel: item.channel, conversationKey: item.conversationKey }])
    ).values()
  );
}

function mergeAndSortMessages(responses: Array<{ items: MessageItem[]; } | null | undefined>): MessageItem[] {
  const merged = new Map<string, MessageItem>();
  for (const response of responses) {
    const items = response?.items || [];
    for (const msg of items) {
      const providerId = typeof msg.providerMessageId === 'string' ? msg.providerMessageId.trim() : '';
      const direction = (msg.direction || '').toLowerCase();
      const text = (msg.text || '').trim();
      
      const fingerprint = providerId ?
        `provider:${providerId}` :
        `fallback:${direction}|${msg.messageType}|${msg.eventTimestamp}|${text.substring(0, 100)}`;
        
      if (!merged.has(fingerprint)) {
        merged.set(fingerprint, msg);
      }
    }
  }
  return Array.from(merged.values()).sort((a, b) => {
    const tsA = new Date(a.eventTimestamp).getTime();
    const tsB = new Date(b.eventTimestamp).getTime();
    if (!Number.isFinite(tsA) || !Number.isFinite(tsB)) return 0;
    return tsA - tsB;
  });
}

export function ConversationsPage() {
  const { apiFetch, accessToken, bootstrap } = useAuth();
  const { showToast } = useToasts();
  const navigate = useNavigate();
  const location = useLocation();
  const { conversationId: conversationRouteId } = useParams<{ conversationId?: string }>();
  const normalizedRouteConversationId = useMemo(
    () => normalizeConversationRouteParam(conversationRouteId),
    [conversationRouteId]
  );
  const [channelView, setChannelView] = useState<ChannelFilter>(() => {
    const cached = readSnapshot<ChannelFilter>(CONVERSATIONS_SELECTED_CHANNEL_CACHE_KEY, 1000 * 60 * 60 * 24 * 180);
    return cached === 'ALL' || cached === 'WHATSAPP' || cached === 'INSTAGRAM' ? cached : 'ALL';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingKonuşmalar, setLoadingKonuşmalar] = useState(true);
  const [conversations, setKonuşmalar] = useState<ConversationItem[]>([]);
  const [channelHealth, setChannelHealth] = useState<ChannelHealthPayload | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(() => {
    const cached = readSnapshot<string>(CONVERSATIONS_SELECTED_ID_CACHE_KEY, 1000 * 60 * 60 * 24 * 180);
    if (typeof cached !== 'string' || !cached.includes(':')) return null;
    const [rawChannel, ...rest] = cached.split(':');
    const channel = rawChannel === 'INSTAGRAM' || rawChannel === 'WHATSAPP' ? rawChannel : null;
    const joinedKey = rest.join(':').trim();
    if (!channel || !joinedKey) return null;
    const normalizedKey = normalizeConversationKeyForClient(channel, joinedKey);
    return normalizedKey ? `${channel}:${normalizedKey}` : null;
  });
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [sendingResume, setSendingResume] = useState(false);
  const [sendingHandover, setSendingHandover] = useState(false);
  const [pressedMessage, setPressedMessage] = useState<MessageItem | null>(null);
  const [linkedCustomerProfileOpen, setLinkedCustomerProfileOpen] = useState(false);
  const [linkedCustomerProfileLoading, setLinkedCustomerProfileLoading] = useState(false);
  const [linkedCustomerProfileError, setLinkedCustomerProfileError] = useState<string | null>(null);
  const [linkedCustomerProfile, setLinkedCustomerProfile] = useState<LinkedCustomerProfile | null>(null);
  const [linkedCustomerBanStatus, setLinkedCustomerBanStatus] = useState<BlacklistCheckResult | null>(null);
  const [linkedCustomerBanLoading, setLinkedCustomerBanLoading] = useState(false);
  const [linkedCustomerBanSaving, setLinkedCustomerBanSaving] = useState(false);
  const [linkedCustomerBanReason, setLinkedCustomerBanReason] = useState('');
  const [linkedCustomerBanError, setLinkedCustomerBanError] = useState<string | null>(null);
  const [profileModalConversation, setProfileModalConversation] = useState<ConversationItem | null>(null);
  const [manualComposeConversationId, setManualComposeConversationId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'LIST' | 'CHAT'>(() => {
    const cached = readSnapshot<'LIST' | 'CHAT'>(CONVERSATIONS_MOBILE_VIEW_CACHE_KEY, 1000 * 60 * 60 * 24 * 180);
    return cached === 'CHAT' ? 'CHAT' : 'LIST';
  });
  const [readReceiptMap, setReadReceiptMap] = useState<ReadReceiptMap>(() => {
    const cached = readSnapshot<ReadReceiptMap>(CONVERSATIONS_READ_RECEIPTS_CACHE_KEY, 1000 * 60 * 60 * 24 * 180);
    if (!cached || typeof cached !== 'object') return {};
    return cached;
  });
  const [liveConversationMap, setLiveConversationMap] = useState<Record<string, number>>({});
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeSyncStatus>('connecting');
  const realtimeRefreshTimerRef = useRef<number | null>(null);
  const realtimeMessagesRefreshTimerRef = useRef<number | null>(null);
  const degradedRefreshTimerRef = useRef<number | null>(null);
  const degradedRefreshAttemptRef = useRef(0);
  const listRefreshInFlightRef = useRef(false);
  const messagesRefreshInFlightRef = useRef(false);
  const messagesLoadSeqRef = useRef(0);
  const liveConversationTimersRef = useRef<Record<string, number>>({});
  const longPressTimerRef = useRef<number | null>(null);
  const conversationsRef = useRef<ConversationItem[]>([]);
  const readReceiptRef = useRef<ReadReceiptMap>({});
  const selectedConversationIdRef = useRef<string | null>(null);
  const messagesRef = useRef<MessageItem[]>([]);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const lastAutoScrolledConversationRef = useRef<string | null>(null);

  useEffect(() => {
    writeSnapshot(CONVERSATIONS_SELECTED_CHANNEL_CACHE_KEY, channelView);
  }, [channelView]);

  useEffect(() => {
    writeSnapshot(CONVERSATIONS_SELECTED_ID_CACHE_KEY, selectedConversationId);
  }, [selectedConversationId]);

  useEffect(() => {
    writeSnapshot(CONVERSATIONS_MOBILE_VIEW_CACHE_KEY, mobileView);
  }, [mobileView]);

  useEffect(() => {
    writeSnapshot(CONVERSATIONS_READ_RECEIPTS_CACHE_KEY, readReceiptMap);
    readReceiptRef.current = readReceiptMap;
  }, [readReceiptMap]);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (mobileView !== 'CHAT') return;
    const hasValidSelection =
      !!selectedConversationId &&
      conversations.some((item) => `${item.channel}:${item.conversationKey}` === selectedConversationId);
    if (hasValidSelection) return;
    setMobileView('LIST');
  }, [conversations, mobileView, selectedConversationId]);

  useEffect(() => {
    if (!normalizedRouteConversationId) return;

    const isDetailRoute = location.pathname.startsWith('/app/conversations/');
    if (loadingKonuşmalar) {
      return;
    }

    const routeConversationExists = conversations.some(
      (item) => `${item.channel}:${item.conversationKey}` === normalizedRouteConversationId,
    );

    if (!routeConversationExists) {
      if (selectedConversationId === normalizedRouteConversationId) {
        setSelectedConversationId(null);
      }
      setMobileView('LIST');
      if (isDetailRoute) {
        navigate('/app/conversations', { replace: true, state: { navDirection: 'back' } });
      }
      return;
    }

    if (normalizedRouteConversationId !== selectedConversationId) {
      setSelectedConversationId(normalizedRouteConversationId);
    }
    setMobileView('CHAT');
  }, [
    conversations,
    loadingKonuşmalar,
    location.pathname,
    navigate,
    normalizedRouteConversationId,
    selectedConversationId,
  ]);

  useEffect(() => {
    const isDetailRoute = location.pathname.startsWith('/app/conversations/');
    if (!isDetailRoute) {
      return;
    }

    if (!selectedConversationId) {
      navigate('/app/conversations', { replace: true, state: { navDirection: 'back' } });
      return;
    }

    const targetPath = `/app/conversations/${encodeURIComponent(selectedConversationId)}`;
    if (location.pathname === targetPath) return;
    navigate(targetPath, { replace: true, state: { navDirection: 'forward', from: '/app/conversations' } });
  }, [location.pathname, navigate, selectedConversationId]);

  const fetchGetWithFallback = useCallback(
    async <T,>(path: string): Promise<{ data: T; usedFallback: boolean }> => {
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      try {
        // Conversations are realtime-sensitive; bypass central GET cache in fresh reads.
        const data = await withTimeout(
          httpRequest<T>(path, {
            method: 'GET',
            token: accessToken,
            salonId: bootstrap?.salon?.id || null,
          }),
          10000,
          'Network request timed out.',
        );
        return { data, usedFallback: false };
      } catch {
        try {
          const data = await withTimeout(
            apiFetch<T>(path, { __cache: { mode: 'swr' } }),
            5000,
            'Cache fallback timed out.',
          );
          return { data, usedFallback: true };
        } catch (fallbackError) {
          throw fallbackError;
        }
      }
    },
    [accessToken, apiFetch, bootstrap?.salon?.id],
  );

  const markConversationAsReadLocal = useCallback((conversationId: string | null) => {
    if (!conversationId) return;
    const matched = conversationsRef.current.find(
      (item) => `${item.channel}:${item.conversationKey}` === conversationId,
    );
    const acknowledgedAt = matched?.lastEventTimestamp || new Date().toISOString();
    setReadReceiptMap((prev) => {
      const existing = prev[conversationId];
      if (existing && new Date(existing).getTime() >= new Date(acknowledgedAt).getTime()) {
        return prev;
      }
      return {
        ...prev,
        [conversationId]: acknowledgedAt,
      };
    });
    setKonuşmalar((prev) =>
      prev.map((item) => {
        const itemId = `${item.channel}:${item.conversationKey}`;
        if (itemId !== conversationId || item.unreadCount <= 0) return item;
        return { ...item, unreadCount: 0 };
      }),
    );
  }, []);

  const markLiveConversation = useCallback((conversationIds: string[]) => {
    if (!conversationIds.length) return;

    const now = Date.now();
    setLiveConversationMap((prev) => {
      const next = { ...prev };
      for (const id of conversationIds) {
        next[id] = now;
      }
      return next;
    });

    for (const id of conversationIds) {
      if (liveConversationTimersRef.current[id]) {
        window.clearTimeout(liveConversationTimersRef.current[id]);
      }
      liveConversationTimersRef.current[id] = window.setTimeout(() => {
        setLiveConversationMap((prev) => {
          if (!(id in prev)) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        });
        delete liveConversationTimersRef.current[id];
      }, 1400);
    }
  }, []);

  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) return null;
    return conversations.find((item) => `${item.channel}:${item.conversationKey}` === selectedConversationId) || null;
  }, [conversations, selectedConversationId]);

  const refreshLinkedCustomerBanStatus = useCallback(
    async (conversation: ConversationItem, profile: LinkedCustomerProfile | null) => {
      const query = new URLSearchParams();
      const linkedCustomerId = profile?.customer?.id;
      if (Number.isInteger(Number(linkedCustomerId)) && Number(linkedCustomerId) > 0) {
        query.set('customerId', String(linkedCustomerId));
      }

      if (conversation.channel === 'WHATSAPP') {
        query.set('phone', conversation.conversationKey);
        query.set('channel', 'WHATSAPP');
      } else {
        query.set('channel', 'INSTAGRAM');
        query.set('subjectNormalized', conversation.conversationKey.replace(/^INSTAGRAM:/i, '').trim().toLowerCase());
      }

      if (!query.toString()) {
        setLinkedCustomerBanStatus(null);
        return;
      }

      setLinkedCustomerBanLoading(true);
      setLinkedCustomerBanError(null);
      try {
        const response = await apiFetch<BlacklistCheckResult>(`/api/admin/blacklist/check?${query.toString()}`);
        setLinkedCustomerBanStatus(response);
      } catch (err: any) {
        setLinkedCustomerBanStatus(null);
        setLinkedCustomerBanError(toUserFriendlyError(err, 'Yasak durumu alınamadı.'));
      } finally {
        setLinkedCustomerBanLoading(false);
      }
    },
    [apiFetch],
  );

  const openLinkedCustomerProfile = useCallback(async (conversation: ConversationItem) => {
    const parsedId =
      typeof conversation.linkedCustomerId === 'number' ? conversation.linkedCustomerId : Number(conversation.linkedCustomerId);
    setProfileModalConversation(conversation);
    setLinkedCustomerProfileOpen(true);
    setLinkedCustomerProfile(null);
    setLinkedCustomerProfileError(null);
    setLinkedCustomerBanStatus(null);
    setLinkedCustomerBanReason('');
    setLinkedCustomerBanError(null);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      setLinkedCustomerProfileLoading(false);
      void refreshLinkedCustomerBanStatus(conversation, null);
      return;
    }
    setLinkedCustomerProfileLoading(true);
    try {
      const response = await apiFetch<LinkedCustomerProfile>(`/api/admin/customers/${parsedId}`);
      setLinkedCustomerProfile(response);
      await refreshLinkedCustomerBanStatus(conversation, response);
    } catch (err: any) {
      setLinkedCustomerProfileError(toUserFriendlyError(err, 'Müşteri profili açılamadı.'));
      setLinkedCustomerProfile(null);
      await refreshLinkedCustomerBanStatus(conversation, null);
    } finally {
      setLinkedCustomerProfileLoading(false);
    }
  }, [apiFetch, refreshLinkedCustomerBanStatus]);

  const toggleLinkedCustomerBan = useCallback(async () => {
    if (!profileModalConversation || linkedCustomerBanSaving) return;
    setLinkedCustomerBanSaving(true);
    setLinkedCustomerBanError(null);
    try {
      if (linkedCustomerBanStatus?.blocked && linkedCustomerBanStatus.entryId) {
        await apiFetch(`/api/admin/blacklist/${linkedCustomerBanStatus.entryId}`, {
          method: 'PATCH',
          body: JSON.stringify({ isActive: false }),
        });
        showToast('Yasak kaldırıldı.', 'success');
      } else {
        const payload: Record<string, unknown> = {
          reason: linkedCustomerBanReason.trim() || 'Sohbet profilinden manuel yasaklama',
          fullName: linkedCustomerProfile?.customer?.name || profileModalConversation.customerName || null,
        };
        if (linkedCustomerProfile?.customer?.id) {
          payload.customerId = linkedCustomerProfile.customer.id;
        }
        if (profileModalConversation.channel === 'WHATSAPP') {
          payload.phone = profileModalConversation.conversationKey;
          payload.channel = 'WHATSAPP';
        } else {
          payload.channel = 'INSTAGRAM';
          payload.subjectNormalized = profileModalConversation.conversationKey
            .replace(/^INSTAGRAM:/i, '')
            .trim()
            .toLowerCase();
        }
        await apiFetch('/api/admin/blacklist', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast('Müşteri yasaklandı.', 'success');
      }
      await refreshLinkedCustomerBanStatus(profileModalConversation, linkedCustomerProfile);
    } catch (err: any) {
      setLinkedCustomerBanError(toUserFriendlyError(err, 'Yasak durumu güncellenemedi.'));
    } finally {
      setLinkedCustomerBanSaving(false);
    }
  }, [
    apiFetch,
    linkedCustomerBanReason,
    linkedCustomerBanSaving,
    linkedCustomerBanStatus,
    linkedCustomerProfile,
    profileModalConversation,
    refreshLinkedCustomerBanStatus,
    showToast,
  ]);

  const filteredKonuşmalar = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = conversations.filter((item) => {
      if (channelView !== 'ALL' && item.channel !== channelView) return false;
      if (!query) return true;
      const haystack = [
        conversationDisplayName(item),
        item.profileUsername || '',
        item.lastMessageText || '',
        item.conversationKey].

        join(' ').
        toLowerCase();
      return haystack.includes(query);
    });
    return filtered.sort((a, b) => {
      const aHandover = isHandoverInProgress(normalizeAutomationMode(a.automationMode));
      const bHandover = isHandoverInProgress(normalizeAutomationMode(b.automationMode));
      if (aHandover !== bHandover) return aHandover ? -1 : 1;
      return new Date(b.lastEventTimestamp).getTime() - new Date(a.lastEventTimestamp).getTime();
    });
  }, [channelView, conversations, searchQuery]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    if (loadingKonuşmalar) return;
    if (!filteredKonuşmalar.length) {
      setSelectedConversationId(null);
      selectedConversationIdRef.current = null;
      setMessages([]);
      return;
    }

    const isSelectedVisible =
      !!selectedConversationId &&
      filteredKonuşmalar.some((item) => `${item.channel}:${item.conversationKey}` === selectedConversationId);

    if (!isSelectedVisible) {
      const nextId = `${filteredKonuşmalar[0].channel}:${filteredKonuşmalar[0].conversationKey}`;
      setSelectedConversationId(nextId);
      selectedConversationIdRef.current = nextId;
    }
  }, [filteredKonuşmalar, loadingKonuşmalar, selectedConversationId]);

  useEffect(() => {
    stickToBottomRef.current = true;
  }, [selectedConversationId]);

  useEffect(() => {
    markConversationAsReadLocal(selectedConversationId);
  }, [markConversationAsReadLocal, selectedConversationId]);

  const loadKonuşmalar = useCallback(async (showLoading = true, cacheMode: 'swr' | 'network-only' = 'swr') => {
    const shouldToggleLoading = showLoading && conversationsRef.current.length === 0;
    if (shouldToggleLoading) setLoadingKonuşmalar(true);
    try {
      const response = cacheMode === 'network-only' && accessToken
        ? await withTimeout(
          httpRequest<{ items: ConversationItem[]; channelHealth?: ChannelHealthPayload; }>(
            '/api/admin/conversations?limit=120',
            {
              method: 'GET',
              token: accessToken,
              salonId: bootstrap?.salon?.id || null,
            },
          ),
          10000,
          'Conversations network request timed out.',
        )
        : await apiFetch<{ items: ConversationItem[]; channelHealth?: ChannelHealthPayload; }>(
          '/api/admin/conversations?limit=120',
          { __cache: { mode: cacheMode } },
        );
      const items = response?.items || [];
      setChannelHealth(response?.channelHealth || null);

      const selectedId = selectedConversationIdRef.current;
      const next = items.map((item) => {
        const id = `${item.channel}:${item.conversationKey}`;
        const seenAt = readReceiptRef.current[id];
        const alreadySeen =
          !!seenAt && Number.isFinite(new Date(seenAt).getTime()) &&
          new Date(seenAt).getTime() >= new Date(item.lastEventTimestamp).getTime();
        if ((selectedId && id === selectedId && item.unreadCount > 0) || (alreadySeen && item.unreadCount > 0)) {
          return { ...item, unreadCount: 0 };
        }
        return item;
      });
      setKonuşmalar(next);
      conversationsRef.current = next;
      if (!selectedConversationIdRef.current && next.length > 0) {
        const nextId = `${next[0].channel}:${next[0].conversationKey}`;
        selectedConversationIdRef.current = nextId;
        setSelectedConversationId(nextId);
      }
    } catch (err: any) {
      showToast(toUserFriendlyError(err, "Konuşmalar yüklenemedi."), 'error');
    } finally {
      if (shouldToggleLoading) setLoadingKonuşmalar(false);
    }
  }, [accessToken, apiFetch, bootstrap?.salon?.id, showToast]);

  const applyConversationStatePatch = useCallback(
    (channel: ChannelType, conversationKey: string, patch?: ConversationStatePayload | null) => {
      if (!patch) return;
      const rawMode = patch.automationMode || patch.mode;
      setKonuşmalar((prev) =>
        prev.map((item) =>
          item.channel === channel && item.conversationKey === conversationKey ?
            {
              ...item,
              ...patch,
              automationMode: rawMode ? normalizeAutomationMode(rawMode) : item.automationMode
            } :
            item
        )
      );
    },
    [],
  );

  const loadMessages = useCallback(async (
    channel: ChannelType,
    conversationKey: string,
    showLoading = true,
    preferFresh = false,
  ) => {
    const seq = messagesLoadSeqRef.current + 1;
    messagesLoadSeqRef.current = seq;
    if (showLoading) setLoadingMessages(true);
    try {
      const relatedKeys = findRelatedConversationKeys(conversationsRef.current, { channel, conversationKey }).slice(0, 3);
      const primary = relatedKeys[0] || { channel, conversationKey };

      const primaryPath = `/api/admin/conversations/${primary.channel}/${encodeURIComponent(primary.conversationKey)}/messages?limit=120`;
      const primaryResult = preferFresh
        ? await (async () => {
          try {
            const data = await withTimeout(
              httpRequest<{ items: MessageItem[]; conversationState?: ConversationStatePayload; }>(
                primaryPath,
                {
                  method: 'GET',
                  token: accessToken || '',
                  salonId: bootstrap?.salon?.id || null,
                },
              ),
              8000,
              'Fresh messages request timed out.',
            );
            return { data, usedFallback: false } as const;
          } catch {
            return await fetchGetWithFallback<{ items: MessageItem[]; conversationState?: ConversationStatePayload; }>(primaryPath);
          }
        })()
        : await fetchGetWithFallback<{ items: MessageItem[]; conversationState?: ConversationStatePayload; }>(primaryPath);
      if (messagesLoadSeqRef.current !== seq) return;

      const primaryItems = primaryResult.data?.items || [];
      const primaryMerged = mergeAndSortMessages([primaryResult.data]);
      if (primaryResult.usedFallback && primaryMerged.length === 0 && messagesRef.current.length > 0) {
        return;
      }

      setMessages(primaryItems.length > 0 ? primaryMerged : []);
      applyConversationStatePatch(channel, conversationKey, primaryResult.data?.conversationState);

      if (relatedKeys.length > 1) {
        const extraKeys = relatedKeys.slice(1);
        void Promise.allSettled(
          extraKeys.map((item) =>
            fetchGetWithFallback<{ items: MessageItem[]; conversationState?: ConversationStatePayload; }>(
              `/api/admin/conversations/${item.channel}/${encodeURIComponent(item.conversationKey)}/messages?limit=120`
            ).then((result) => result.data)
          )
        ).then((settled) => {
          if (messagesLoadSeqRef.current !== seq) return;
          if (selectedConversationIdRef.current !== `${channel}:${conversationKey}`) return;
          const successful = settled
            .filter((entry): entry is PromiseFulfilledResult<{ items: MessageItem[]; conversationState?: ConversationStatePayload; }> => entry.status === 'fulfilled')
            .map((entry) => entry.value);
          if (!successful.length) return;
          const merged = mergeAndSortMessages([primaryResult.data, ...successful]);
          if (!merged.length) return;
          setMessages(merged);
          applyConversationStatePatch(channel, conversationKey, primaryResult.data?.conversationState);
        });
      }
    } catch (err: any) {
      showToast(toUserFriendlyError(err, "Konuşma mesajları yüklenemedi."), 'error');
    } finally {
      if (showLoading) setLoadingMessages(false);
    }
  }, [accessToken, applyConversationStatePatch, bootstrap?.salon?.id, fetchGetWithFallback, showToast]);

  const refreshConversationList = useCallback(async () => {
    if (listRefreshInFlightRef.current) return;
    listRefreshInFlightRef.current = true;
    try {
      await loadKonuşmalar(false, 'network-only');
    } finally {
      listRefreshInFlightRef.current = false;
    }
  }, [loadKonuşmalar]);

  const refreshActiveConversationMessages = useCallback(async () => {
    if (messagesRefreshInFlightRef.current) return;
    const liveSelectedId = selectedConversationIdRef.current;
    if (!liveSelectedId || !liveSelectedId.includes(':')) return;
    const [rawChannel, ...rest] = liveSelectedId.split(':');
    const rawKey = rest.join(':');
    if ((rawChannel !== 'INSTAGRAM' && rawChannel !== 'WHATSAPP') || !rawKey) return;
    messagesRefreshInFlightRef.current = true;
    try {
      await loadMessages(rawChannel as ChannelType, rawKey, false, true);
    } finally {
      messagesRefreshInFlightRef.current = false;
    }
  }, [loadMessages]);

  const scheduleRealtimeRefresh = useCallback((events?: ConversationRealtimeEvent[]) => {
    if (realtimeRefreshTimerRef.current) return;
    const activeId = selectedConversationIdRef.current;
    const activeConversationTouched = Boolean(
      activeId &&
      events?.some((event) => toConversationId(event.channel, event.conversationKey) === activeId),
    );
    const waitMs = activeConversationTouched ? 120 : 220;

    realtimeRefreshTimerRef.current = window.setTimeout(() => {
      realtimeRefreshTimerRef.current = null;
      void refreshConversationList();
    }, waitMs);
  }, [refreshConversationList]);

  const scheduleActiveMessagesRefresh = useCallback((waitMs = 80) => {
    if (realtimeMessagesRefreshTimerRef.current) return;
    realtimeMessagesRefreshTimerRef.current = window.setTimeout(() => {
      realtimeMessagesRefreshTimerRef.current = null;
      void refreshActiveConversationMessages();
    }, waitMs);
  }, [refreshActiveConversationMessages]);

  useEffect(() => {
    void loadKonuşmalar();
  }, [loadKonuşmalar]);

  useEffect(() => {
    if (!selectedConversationId || !selectedConversationId.includes(':')) {
      setMessages([]);
      return;
    }
    const [rawChannel, ...rest] = selectedConversationId.split(':');
    const rawKey = rest.join(':');
    if (rawChannel !== 'INSTAGRAM' && rawChannel !== 'WHATSAPP' || !rawKey) {
      setMessages([]);
      return;
    }
    void loadMessages(rawChannel as ChannelType, rawKey);
  }, [loadMessages, selectedConversationId]);

  useLayoutEffect(() => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    if (!stickToBottomRef.current) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [messages, selectedConversationId]);

  useEffect(() => {
    const viewport = messagesViewportRef.current;
    if (!viewport || !messages.length || !selectedConversationId) return;
    if (!viewport.getClientRects().length) return;
    const firstLoadForConversation = lastAutoScrolledConversationRef.current !== selectedConversationId;
    if (!firstLoadForConversation && !stickToBottomRef.current) return;
    const scrollToLatest = () => {
      viewport.scrollTop = viewport.scrollHeight;
    };
    lastAutoScrolledConversationRef.current = selectedConversationId;
    const frame = window.requestAnimationFrame(scrollToLatest);
    const timer = window.setTimeout(scrollToLatest, 150);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [messages.length, mobileView, selectedConversationId]);

  useEffect(() => {
    if (realtimeStatus !== 'degraded') {
      degradedRefreshAttemptRef.current = 0;
      if (degradedRefreshTimerRef.current) {
        window.clearTimeout(degradedRefreshTimerRef.current);
        degradedRefreshTimerRef.current = null;
      }
      return;
    }

    const nextDelayMs = () => {
      const hidden = document.visibilityState !== 'visible';
      const attempt = degradedRefreshAttemptRef.current;
      const base = hidden ? 2500 : 900;
      const step = hidden ? 1500 : 700;
      const max = hidden ? 12000 : 5000;
      return Math.min(max, base + attempt * step);
    };

    const scheduleNext = () => {
      if (degradedRefreshTimerRef.current) return;
      degradedRefreshTimerRef.current = window.setTimeout(async () => {
        degradedRefreshTimerRef.current = null;
        await Promise.all([refreshConversationList(), refreshActiveConversationMessages()]);
        degradedRefreshAttemptRef.current = Math.min(degradedRefreshAttemptRef.current + 1, 10);
        scheduleNext();
      }, nextDelayMs());
    };

    scheduleNext();
    return () => {
      if (!degradedRefreshTimerRef.current) return;
      window.clearTimeout(degradedRefreshTimerRef.current);
      degradedRefreshTimerRef.current = null;
    };
  }, [realtimeStatus, refreshActiveConversationMessages, refreshConversationList]);

  useConversationRealtimeSync({
    enabled: !!accessToken,
    accessToken,
    channel: undefined,
    cursorScopeKey: 'conversations-page',
    apiFetch,
    onEvents: (events, source) => {
      if (source === 'stream') {
        const touchedIds = events.map((event) => toConversationId(event.channel, event.conversationKey));
        markLiveConversation(touchedIds);
        const activeId = selectedConversationIdRef.current;
        if (activeId) {
          scheduleActiveMessagesRefresh(60);
        }
      }
      scheduleRealtimeRefresh(events);
    },
    onRequireFullRefresh: () => {
      scheduleActiveMessagesRefresh(80);
      scheduleRealtimeRefresh();
    },
    onStatusChange: setRealtimeStatus,
  });

  useEffect(() => {
    return () => {
      for (const timerId of Object.values(liveConversationTimersRef.current)) {
        window.clearTimeout(timerId);
      }
      liveConversationTimersRef.current = {};
    };
  }, []);

  useEffect(() => {
    return () => {
      if (realtimeRefreshTimerRef.current) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
        realtimeRefreshTimerRef.current = null;
      }
      if (realtimeMessagesRefreshTimerRef.current) {
        window.clearTimeout(realtimeMessagesRefreshTimerRef.current);
        realtimeMessagesRefreshTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (!degradedRefreshTimerRef.current) return;
      window.clearTimeout(degradedRefreshTimerRef.current);
      degradedRefreshTimerRef.current = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (!longPressTimerRef.current) return;
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    };
  }, []);

  const clearLongPressTimer = useCallback(() => {
    if (!longPressTimerRef.current) return;
    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  }, []);

  const openMessageMeta = useCallback((msg: MessageItem) => {
    clearLongPressTimer();
    setPressedMessage(msg);
  }, [clearLongPressTimer]);

  const beginLongPress = useCallback((msg: MessageItem) => {
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      setPressedMessage(msg);
      longPressTimerRef.current = null;
    }, 420);
  }, [clearLongPressTimer]);

  const sendReply = async () => {
    if (!selectedConversation || !replyText.trim()) return;
    setSendingReply(true);
    try {
      if (selectedConversation.channel === 'INSTAGRAM' && instagramWindowExpired) {
        showToast('Instagram 24 saat penceresi dolmuş olabilir. Gönderim başarısız olursa müşterinin tekrar yazması gerekir.', 'info');
      }
      const response = await apiFetch<{ item?: MessageItem & { conversationKey?: string; }; }>(
        `/api/admin/conversations/${selectedConversation.channel}/${encodeURIComponent(selectedConversation.conversationKey)}/reply`,
        {
          method: 'POST',
          body: JSON.stringify({ text: replyText.trim() })
        }
      );
      const effectiveConversationKey =
        (typeof response?.item?.conversationKey === 'string' && response.item.conversationKey.trim())
          ? response.item.conversationKey.trim()
          : selectedConversation.conversationKey;
      const normalizedEffectiveConversationKey = normalizeConversationKeyForClient(
        selectedConversation.channel,
        effectiveConversationKey,
      );
      if (normalizedEffectiveConversationKey !== selectedConversation.conversationKey) {
        const nextSelectedId = `${selectedConversation.channel}:${normalizedEffectiveConversationKey}`;
        setSelectedConversationId(nextSelectedId);
        selectedConversationIdRef.current = nextSelectedId;
      }
      setReplyText('');
      showToast('Yanıt başarıyla gönderildi.', 'success');
      await loadMessages(selectedConversation.channel, normalizedEffectiveConversationKey, false, true);
      scheduleRealtimeRefresh();
    } catch (err: any) {
      if (err?.body?.errorCode === 'INSTAGRAM_WINDOW_EXPIRED') {
        showToast('Instagram 24 saat penceresi dolduğu için mesaj gönderilemez. Müşterinin tekrar yazması gerekiyor.', 'error');
        return;
      }
      showToast(toUserFriendlyError(err, 'Mesaj gönderilemedi.'), 'error');
    } finally {
      setSendingReply(false);
    }
  };

  const resumeAuto = async () => {
    if (!selectedConversation) return;
    setSendingResume(true);
    try {
      const response = await apiFetch<{ conversationKey?: string; state?: { mode?: AutomationMode; automationMode?: AutomationMode; manualAlways?: boolean; }; }>(
        `/api/admin/conversations/${selectedConversation.channel}/${encodeURIComponent(selectedConversation.conversationKey)}/resume-auto`,
        { method: 'POST' }
      );
      const effectiveConversationKey =
        (typeof response?.conversationKey === 'string' && response.conversationKey.trim())
          ? response.conversationKey.trim()
          : selectedConversation.conversationKey;
      const normalizedEffectiveConversationKey = normalizeConversationKeyForClient(
        selectedConversation.channel,
        effectiveConversationKey,
      );
      if (normalizedEffectiveConversationKey !== selectedConversation.conversationKey) {
        const nextSelectedId = `${selectedConversation.channel}:${normalizedEffectiveConversationKey}`;
        setSelectedConversationId(nextSelectedId);
        selectedConversationIdRef.current = nextSelectedId;
      }
      const stateMode = response?.state?.automationMode || response?.state?.mode;
      if (response?.state) {
        setKonuşmalar((prev) =>
          prev.map((item) =>
            item.channel === selectedConversation.channel &&
            (
              item.conversationKey === selectedConversation.conversationKey ||
              item.conversationKey === normalizedEffectiveConversationKey
            ) ?
              {
                ...item,
                manualAlways: typeof response.state?.manualAlways === 'boolean' ? response.state.manualAlways : item.manualAlways,
                automationMode: normalizeAutomationMode(stateMode || item.automationMode),
              } :
              item
          )
        );
      }
      setManualComposeConversationId(null);
      showToast('Yapay zeka otomasyonu tekrar devreye alındı.', 'success');
      await loadMessages(selectedConversation.channel, normalizedEffectiveConversationKey, false, true);
      scheduleRealtimeRefresh();
    } catch (err: any) {
      showToast(toUserFriendlyError(err, 'Otomasyon başlatılamadı.'), 'error');
    } finally {
      setSendingResume(false);
    }
  };

  const requestHandover = async () => {
    if (!selectedConversation) return;
    setSendingHandover(true);
    try {
      const response = await apiFetch<{ conversationKey?: string; state?: { mode?: AutomationMode; automationMode?: AutomationMode; manualAlways?: boolean; }; }>(
        `/api/admin/conversations/${selectedConversation.channel}/${encodeURIComponent(selectedConversation.conversationKey)}/handover`,
        { method: 'POST' }
      );
      const effectiveConversationKey =
        (typeof response?.conversationKey === 'string' && response.conversationKey.trim())
          ? response.conversationKey.trim()
          : selectedConversation.conversationKey;
      const normalizedEffectiveConversationKey = normalizeConversationKeyForClient(
        selectedConversation.channel,
        effectiveConversationKey,
      );
      const nextSelectedId = `${selectedConversation.channel}:${normalizedEffectiveConversationKey}`;
      if (normalizedEffectiveConversationKey !== selectedConversation.conversationKey) {
        setSelectedConversationId(nextSelectedId);
        selectedConversationIdRef.current = nextSelectedId;
      }
      const stateMode = response?.state?.automationMode || response?.state?.mode;
      if (response?.state) {
        setKonuşmalar((prev) =>
          prev.map((item) =>
            item.channel === selectedConversation.channel &&
            (
              item.conversationKey === selectedConversation.conversationKey ||
              item.conversationKey === normalizedEffectiveConversationKey
            ) ?
              {
                ...item,
                manualAlways: typeof response.state?.manualAlways === 'boolean' ? response.state.manualAlways : item.manualAlways,
                automationMode: normalizeAutomationMode(stateMode || item.automationMode),
              } :
              item
          )
        );
        setManualComposeConversationId(nextSelectedId);
      } else {
        setManualComposeConversationId(nextSelectedId);
      }
      showToast('Manuel yanıt modu açıldı.', 'success');
      await loadMessages(selectedConversation.channel, normalizedEffectiveConversationKey, false, true);
      scheduleRealtimeRefresh();
    } catch (err: any) {
      setManualComposeConversationId(null);
      showToast(toUserFriendlyError(err, 'Talep iletilemedi.'), 'error');
    } finally {
      setSendingHandover(false);
    }
  };

  const isSupportedReplyChannel = selectedConversation?.channel === 'INSTAGRAM' || selectedConversation?.channel === 'WHATSAPP';
  const selectedMode = normalizeAutomationMode(selectedConversation?.automationMode);
  const handoverInProgress =
    isHandoverInProgress(selectedMode) ||
    Boolean(selectedConversationId && manualComposeConversationId === selectedConversationId);
  const manualReplyUnlocked =
    handoverInProgress ||
    selectedMode === 'MANUAL_ALWAYS' ||
    (selectedConversationId && manualComposeConversationId === selectedConversationId);
  const instagramWindowExpired =
    selectedConversation?.channel === 'INSTAGRAM' &&
    isInstagramReplyWindowExpired(selectedConversation.lastCustomerMessageAt);
  const canReply = Boolean(isSupportedReplyChannel && manualReplyUnlocked);
  const channelScopedConversations = useMemo(() => {
    if (channelView === 'ALL') return conversations;
    return conversations.filter((item) => item.channel === channelView);
  }, [conversations, channelView]);
  const handoverTotal = channelScopedConversations.filter((item) =>
    isHandoverInProgress(normalizeAutomationMode(item.automationMode))
  ).length;
  const selectedChannelHealth = channelView === 'INSTAGRAM' ? channelHealth?.instagram : channelView === 'WHATSAPP' ? channelHealth?.whatsapp : null;
  const channelBlocked = channelHealth
    ? channelView === 'INSTAGRAM'
      ? !(channelHealth.instagram.connected && channelHealth.instagram.bindingReady)
      : channelView === 'WHATSAPP'
        ? !channelHealth.whatsapp.connected
        : false
    : false;
  const realtimeBadge = realtimeStatusMeta(realtimeStatus);

  useEffect(() => {
    if (!channelBlocked) return;
    setSelectedConversationId(null);
    setMessages([]);
  }, [channelBlocked]);

  return (
    <div className="h-full w-full max-w-full overflow-x-hidden pb-20 overflow-y-auto px-0 py-2 bg-gradient-to-br from-indigo-500/5 via-background to-fuchsia-500/5 relative">
      <div className="pointer-events-none absolute right-0 top-0 h-[400px] w-[400px] -translate-y-1/2 translate-x-1/3 rounded-full bg-[var(--deep-indigo)] mix-blend-screen opacity-10 blur-[100px]" />
      <div className={`mb-2 relative z-10 ${mobileView === 'CHAT' ? 'hidden lg:flex' : 'flex'} flex-wrap items-center gap-2 px-1 sm:px-2`}>
        <div className="flex w-full sm:w-auto min-w-0 rounded-2xl border border-border/50 bg-background/70 shadow-sm backdrop-blur-md p-1">
          <button
            type="button"
            aria-pressed={channelView === 'ALL'}
            onClick={() => {
              setChannelView('ALL');
            }}
            className={`inline-flex min-w-0 flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 ${
              channelView === 'ALL'
                ? 'bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-md'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            Tümü
          </button>
          <button
            type="button"
            aria-pressed={channelView === 'INSTAGRAM'}
            onClick={() => {
              setChannelView('INSTAGRAM');
            }}
            className={`inline-flex min-w-0 flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 ${
              channelView === 'INSTAGRAM'
                ? 'bg-gradient-to-br from-[var(--deep-indigo)] to-indigo-600 text-white shadow-md'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            <Instagram className="size-3.5" />
            Instagram
          </button>
          {SHOW_WHATSAPP_INBOX ?
            <button
              type="button"
              aria-pressed={channelView === 'WHATSAPP'}
              onClick={() => {
                setChannelView('WHATSAPP');
              }}
              className={`inline-flex min-w-0 flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                channelView === 'WHATSAPP'
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              <WhatsAppLogo className="size-3.5" />
              WhatsApp
            </button> :
            null}
        </div>
      </div>

      {!channelBlocked && selectedChannelHealth && (
        <div className="mt-2 overflow-hidden rounded-2xl border border-border/50 bg-background/50 shadow-sm backdrop-blur-md px-4 py-3 sm:mx-2 mb-4 mx-1">
          <div className="flex items-center gap-3">
            <div className={`size-2 rounded-full animate-pulse ${
              channelView === 'INSTAGRAM' ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : channelView === 'WHATSAPP' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-500 shadow-[0_0_8px_rgba(100,116,139,0.5)]'
            }`} />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">
              Mesaj Kanalı Aktif
            </span>
            <div className={`ml-auto flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${realtimeBadge.badgeClass}`}>
              <div className={`size-1.5 rounded-full ${realtimeBadge.dotClass}`} />
              {realtimeBadge.label}
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              <div className="size-1 rounded-full bg-muted-foreground/40" />
              Sisteme Bağlı
            </div>
          </div>
        </div>
      )}

      {channelBlocked ?
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 relative z-10">
          <div className="max-w-md w-full rounded-[32px] border border-white/20 bg-background/40 backdrop-blur-2xl p-8 shadow-2xl text-center overflow-hidden relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-fuchsia-500 via-indigo-500 to-emerald-500" />
            <div className={`size-20 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg ${channelView === 'INSTAGRAM' ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 text-white' : 'bg-emerald-500 text-white'}`}>
              {channelView === 'INSTAGRAM' ? <Instagram className="size-10" /> : <MessageCircle className="size-10" />}
            </div>
            
            <h2 className="text-2xl font-bold tracking-tight mb-2">
              {channelView === 'INSTAGRAM' ? "Instagram'ı Bağlayın" : "WhatsApp'ı Bağlayın"}
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-8">
              {selectedChannelHealth?.message || "Müşterilerinizle iletişime geçmek ve yapay zeka asistanını devreye almak için önce kanal bağlantısını tamamlamalısınız."}
            </p>

            {selectedChannelHealth?.missingRequirements?.length ? (
              <div className="mb-8 p-4 rounded-2xl bg-muted/50 border border-border/40 text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Eksik Gereksinimler</p>
                <ul className="space-y-1.5">
                  {selectedChannelHealth.missingRequirements.map((req, i) => (
                    <li key={i} className="text-xs flex items-center gap-2 font-medium">
                      <div className="size-1 rounded-full bg-rose-500" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <Button
              type="button"
              className="w-full h-12 rounded-2xl bg-[var(--deep-indigo)] hover:bg-[var(--deep-indigo)]/90 text-white font-bold shadow-xl shadow-[var(--deep-indigo)]/20 group"
              onClick={() =>
                navigate('/app/features/social-channels', {
                  state: { navDirection: 'forward' }
                })
              }>
              Hemen Bağla
              <ChevronLeft className="size-4 ml-2 rotate-180 transition-transform group-hover:translate-x-1" />
            </Button>
            
            <p className="mt-6 text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
              Kedy Akıllı Mesajlaşma Altyapısı
            </p>
          </div>
        </div> :

        
        <div className="flex flex-col h-[100dvh] lg:h-full lg:grid lg:grid-cols-[300px,minmax(0,1fr)] gap-2 relative z-10 px-1 sm:px-2">
          <div className={`flex flex-col h-[calc(100dvh-11.5rem)] min-h-0 lg:h-[calc(100dvh-11.5rem)] lg:min-h-[680px] ${mobileView === 'CHAT' ? 'hidden lg:flex' : 'flex'}`}>
            <ConversationsList
              filteredConversations={filteredKonuşmalar}
              conversations={conversations}
              loading={loadingKonuşmalar}
              channelView={channelView}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedConversationId={selectedConversationId}
              liveConversationMap={liveConversationMap}
              onSelectConversation={(id) => {
                lastAutoScrolledConversationRef.current = null;
                setSelectedConversationId(id);
                markConversationAsReadLocal(id);
                setMobileView('CHAT');
                navigate(`/app/conversations/${encodeURIComponent(id)}`, {
                  state: { navDirection: 'forward', from: '/app/conversations' },
                });
              }}
              handoverTotal={handoverTotal}
              conversationDisplayName={conversationDisplayName}
              buildConversationAvatarSrc={(item) => buildConversationAvatarSrc({
                channel: item.channel,
                conversationKey: item.conversationKey,
                sourceUrl: item.profilePicUrl,
                accessToken
              })}
              initialsFromLabel={initialsFromLabel}
              getPreview={getPreview}
              formatRelativeTime={formatRelativeTime}
              isHandoverInProgress={(mode) => isHandoverInProgress(mode as AutomationMode)}
              normalizeAutomationMode={normalizeAutomationMode}
              WhatsAppLogo={WhatsAppLogo}
            />
          </div>
          
          <ConversationDetail
            mobileView={mobileView}
            setMobileView={setMobileView}
            selectedConversation={selectedConversation}
            messages={messages}
            loadingMessages={loadingMessages}
            replyText={replyText}
            setReplyText={setReplyText}
            canReply={canReply}
            sendingReply={sendingReply}
            sendReply={sendReply}
            handoverInProgress={handoverInProgress}
            sendingHandover={sendingHandover}
            sendingResume={sendingResume}
            requestHandover={requestHandover}
            resumeAuto={resumeAuto}
            instagramWindowExpired={instagramWindowExpired}
            messagesViewportRef={messagesViewportRef}
            openLinkedCustomerProfile={openLinkedCustomerProfile}
            navigateBack={() => navigate('/app/conversations', { state: { navDirection: 'back' } })}
            conversationDisplayName={conversationDisplayName}
            buildConversationAvatarSrc={(item) => buildConversationAvatarSrc({
              channel: item.channel,
              conversationKey: item.conversationKey,
              sourceUrl: item.profilePicUrl,
              accessToken
            })}
            initialsFromLabel={initialsFromLabel}
            isHandoverInProgress={(mode) => isHandoverInProgress(mode as AutomationMode)}
            normalizeAutomationMode={normalizeAutomationMode}
            formatOperatorMessage={formatOperatorMessage}
            formatMessageTypeLabel={formatMessageTypeLabel}
            openMessageMeta={openMessageMeta}
            beginLongPress={beginLongPress}
            clearLongPressTimer={clearLongPressTimer}
            stickToBottomRef={stickToBottomRef}
          />
        </div>
      }
      <Dialog
        open={Boolean(pressedMessage)}
        onOpenChange={(open) => {
          if (!open) setPressedMessage(null);
        }}>
        <DialogContent className="max-w-[420px] rounded-2xl border border-border/40 bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Mesaj Detayı</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Kaynak ve gönderen bilgisi
            </DialogDescription>
          </DialogHeader>
          {pressedMessage && (
            <div className="space-y-2 text-sm">
              <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Kaynak</p>
                <p className="font-medium">{describeMessageSource(pressedMessage, selectedConversation?.channel)}</p>
              </div>
              <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Yazan</p>
                <p className="font-medium">{describeMessageAuthor(pressedMessage)}</p>
              </div>
              <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tarih</p>
                <p className="font-medium">
                  {format(new Date(pressedMessage.eventTimestamp), 'd MMMM yyyy HH:mm', { locale: tr })}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={linkedCustomerProfileOpen}
        onOpenChange={(open) => {
          setLinkedCustomerProfileOpen(open);
          if (!open) {
            setProfileModalConversation(null);
            setLinkedCustomerProfile(null);
            setLinkedCustomerProfileError(null);
            setLinkedCustomerProfileLoading(false);
            setLinkedCustomerBanStatus(null);
            setLinkedCustomerBanReason('');
            setLinkedCustomerBanError(null);
            setLinkedCustomerBanLoading(false);
          }
        }}>
        <DialogContent className="max-w-[520px] rounded-2xl border border-border/40 bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Sohbet Profili</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Kayıtlı müşteri bilgisi ve sohbet özeti
            </DialogDescription>
          </DialogHeader>
          {profileModalConversation ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/20 px-3 py-3">
                <Avatar className="size-20 border border-border/40">
                  {profileModalConversation.profilePicUrl ?
                    <AvatarImage
                      src={
                        buildConversationAvatarSrc({
                          channel: profileModalConversation.channel,
                          conversationKey: profileModalConversation.conversationKey,
                          sourceUrl: profileModalConversation.profilePicUrl,
                          accessToken,
                        }) || undefined
                      }
                      alt={conversationDisplayName(profileModalConversation)} /> :
                    null}
                  <AvatarFallback className="text-sm">
                    {initialsFromLabel(conversationDisplayName(profileModalConversation))}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{conversationDisplayName(profileModalConversation)}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {profileModalConversation.channel === 'INSTAGRAM' ? 'Instagram' : 'WhatsApp'}
                  </p>
                </div>
                <span
                  className={`ml-auto rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight ${
                    linkedCustomerProfile ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'
                  }`}>
                  {linkedCustomerProfile ? 'Kayıtlı' : 'Kayıtsız'}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Instagram Kullanıcı Adı</p>
                  <p className="font-medium">
                    {linkedCustomerProfile?.customer.instagram ?
                      `@${linkedCustomerProfile.customer.instagram.replace(/^@/, '')}` :
                      profileModalConversation.profileUsername ?
                        `@${profileModalConversation.profileUsername.replace(/^@/, '')}` :
                        '-'}
                  </p>
                </div>
                <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">WhatsApp Numarası</p>
                  <p className="font-medium">
                    {profileModalConversation.channel === 'WHATSAPP' ? profileModalConversation.conversationKey : linkedCustomerProfile?.customer.phone || '-'}
                  </p>
                </div>
                <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Alınan Hizmet Sayısı</p>
                  <p className="font-medium">{linkedCustomerProfile?.summary.totalBookings ?? 0}</p>
                </div>
                <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Randevu İhlali</p>
                  <p className="font-medium">{linkedCustomerProfile?.summary.noShowCount ?? 0}</p>
                </div>
                <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Toplam Harcama</p>
                  <p className="font-medium">
                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(linkedCustomerProfile?.summary.totalRevenue || 0)}
                  </p>
                </div>
                <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Kampanya Durumları</p>
                  <p className="font-medium">
                    Pazarlama İzni: {linkedCustomerProfile ? (linkedCustomerProfile.customer.acceptMarketing ? 'Açık' : 'Kapalı') : 'Bilinmiyor'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Son Kampanya: {linkedCustomerProfile?.discount?.lastNotificationStatus || (linkedCustomerProfile ? 'Gönderim kaydı yok' : 'Kayıtlı değil')}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Yasaklama</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      linkedCustomerBanStatus?.blocked
                        ? 'bg-red-500/10 text-red-700'
                        : 'bg-emerald-500/10 text-emerald-700'
                    }`}>
                    {linkedCustomerBanStatus?.blocked ? 'YASAKLI' : 'AKTİF'}
                  </span>
                </div>
                {!linkedCustomerBanStatus?.blocked ? (
                  <input
                    type="text"
                    value={linkedCustomerBanReason}
                    onChange={(event) => setLinkedCustomerBanReason(event.target.value)}
                    placeholder="Yasak nedeni (opsiyonel)"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">Sebep: {linkedCustomerBanStatus?.reason || 'Belirtilmedi'}</p>
                )}
                <button
                  type="button"
                  onClick={() => void toggleLinkedCustomerBan()}
                  disabled={linkedCustomerBanSaving || linkedCustomerBanLoading}
                  className={`w-full rounded-md px-3 py-2 text-sm text-white disabled:opacity-60 ${
                    linkedCustomerBanStatus?.blocked ? 'bg-zinc-700' : 'bg-red-600'
                  }`}>
                  {linkedCustomerBanSaving
                    ? 'İşleniyor...'
                    : linkedCustomerBanStatus?.blocked
                      ? 'Yasağı Kaldır'
                      : 'Yasakla'}
                </button>
                {linkedCustomerBanLoading ? <p className="text-xs text-muted-foreground">Durum kontrol ediliyor...</p> : null}
                {linkedCustomerBanError ? <p className="text-xs text-red-500">{linkedCustomerBanError}</p> : null}
              </div>
            </div>
          ) : null}
          {linkedCustomerProfileLoading ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : null}
          {!linkedCustomerProfileLoading && linkedCustomerProfileError ? (
            <p className="text-sm text-red-500">{linkedCustomerProfileError}</p>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
