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
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ConversationRealtimeEvent, useConversationRealtimeSync } from '../lib/realtime-conversation-sync';
import { readSnapshot, writeSnapshot } from '../lib/ui-cache';
import { API_BASE_URL } from '../lib/config';
import { httpRequest } from '../lib/http';

type ChannelType = 'INSTAGRAM' | 'WHATSAPP';
type ChannelFilter = 'ALL' | ChannelType;
type AutomationMode = 'AUTO' | 'HUMAN_PENDING' | 'HUMAN_ACTIVE' | 'MANUAL_ALWAYS' | 'AUTO_RESUME_PENDING';
const SHOW_WHATSAPP_INBOX = true;
const CONVERSATIONS_SELECTED_CHANNEL_CACHE_KEY = 'conversations:selected-channel';
const CONVERSATIONS_SELECTED_ID_CACHE_KEY = 'conversations:selected-id';
const CONVERSATIONS_MOBILE_VIEW_CACHE_KEY = 'conversations:mobile-view';
const CONVERSATIONS_READ_RECEIPTS_CACHE_KEY = 'conversations:read-receipts';
const INSTAGRAM_REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;

interface ConversationItem {
  channel: ChannelType;
  conversationKey: string;
  customerName: string | null;
  profileUsername?: string | null;
  profilePicUrl?: string | null;
  lastMessageType: string;
  lastMessageText: string | null;
  lastEventTimestamp: string;
  unreadCount: number;
  messageCount: number;
  hasHandoverRequest: boolean;
  identityLinked?: boolean;
  linkedCustomerId?: number | null;
  automationMode?: AutomationMode;
  manualAlways?: boolean;
  humanPendingSince?: string | null;
  humanActiveUntil?: string | null;
  lastHumanMessageAt?: string | null;
  lastCustomerMessageAt?: string | null;
}

interface MessageItem {
  id: number;
  conversationKey?: string;
  providerMessageId: string;
  messageType: string;
  text: string | null;
  status: string;
  direction: 'inbound' | 'outbound' | 'system';
  deliveryChannel?: 'INSTAGRAM' | 'WHATSAPP';
  outboundSource?: 'AI_AGENT' | 'HUMAN_APP' | 'HUMAN_EXTERNAL' | null;
  outboundSourceLabel?: string | null;
  outboundSenderUserId?: number | null;
  outboundSenderEmail?: string | null;
  eventTimestamp: string;
}

interface ConversationStatePayload {
  automationMode?: AutomationMode;
  mode?: AutomationMode;
  manualAlways?: boolean;
  humanPendingSince?: string | null;
  humanActiveUntil?: string | null;
  lastHumanMessageAt?: string | null;
  lastCustomerMessageAt?: string | null;
}

interface InstagramChannelHealth {
  connected: boolean;
  status: string;
  message: string;
  bindingReady: boolean;
  missingRequirements?: string[];
}

interface WhatsAppChannelHealth {
  connected: boolean;
  isActive: boolean;
  hasPlugin: boolean;
  whatsappPhoneNumberId?: string | null;
  message: string;
  missingRequirements?: string[];
}

interface ChannelHealthPayload {
  instagram: InstagramChannelHealth;
  whatsapp: WhatsAppChannelHealth;
}

type ReadReceiptMap = Record<string, string>;

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
    return 'Kedy Sistem';
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
  if (msg.direction === 'system') return 'Sistem';
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
  const realtimeRefreshTimerRef = useRef<number | null>(null);
  const liveConversationTimersRef = useRef<Record<string, number>>({});
  const longPressTimerRef = useRef<number | null>(null);
  const conversationsRef = useRef<ConversationItem[]>([]);
  const readReceiptRef = useRef<ReadReceiptMap>({});
  const selectedConversationIdRef = useRef<string | null>(null);
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
    if (mobileView !== 'CHAT') return;
    const hasValidSelection =
      !!selectedConversationId &&
      conversations.some((item) => `${item.channel}:${item.conversationKey}` === selectedConversationId);
    if (hasValidSelection) return;
    setMobileView('LIST');
  }, [conversations, mobileView, selectedConversationId]);

  const fetchGetWithFallback = useCallback(
    async <T,>(path: string): Promise<{ data: T; usedFallback: boolean }> => {
      try {
        const data = await withTimeout(
          apiFetch<T>(path, { __cache: { mode: 'network-only' } }),
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
        } catch {
          if (!accessToken) {
            throw new Error('Not authenticated');
          }
          const data = await withTimeout(
            httpRequest<T>(path, {
              method: 'GET',
              token: accessToken,
              salonId: bootstrap?.salon?.id || null,
            }),
            10000,
            'Direct network fallback timed out.',
          );
          return { data, usedFallback: false };
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

  const filteredKonuşmalar = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = conversations.filter((item) => {
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
  }, [conversations, searchQuery]);

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

  const loadKonuşmalar = useCallback(async (showLoading = true) => {
    if (showLoading) setLoadingKonuşmalar(true);
    try {
      const { data: response, usedFallback } = await fetchGetWithFallback<{ items: ConversationItem[]; channelHealth?: ChannelHealthPayload; }>(
        channelView === 'ALL'
          ? '/api/admin/conversations?limit=60'
          : `/api/admin/conversations?limit=60&channel=${channelView}`
      );
      let items = response?.items || [];

      // If a channel filter is empty, transparently retry with ALL to avoid
      // leaving the user in a blank view due stale filter/cache state.
      if (items.length === 0 && channelView !== 'ALL') {
        const { data: allResponse } = await fetchGetWithFallback<{ items: ConversationItem[]; channelHealth?: ChannelHealthPayload; }>(
          '/api/admin/conversations?limit=60',
        );
        if ((allResponse?.items || []).length > 0) {
          setChannelView('ALL');
          items = allResponse.items || [];
          setChannelHealth(allResponse?.channelHealth || response?.channelHealth || null);
        } else {
          setChannelHealth(response?.channelHealth || allResponse?.channelHealth || null);
        }
      } else {
        setChannelHealth(response?.channelHealth || null);
      }

      if (usedFallback && items.length === 0 && conversationsRef.current.length > 0) {
        return;
      }

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
      if (showLoading) setLoadingKonuşmalar(false);
    }
  }, [channelView, fetchGetWithFallback]);

  const loadMessages = useCallback(async (channel: ChannelType, conversationKey: string, showLoading = true) => {
    if (showLoading) setLoadingMessages(true);
    try {
      const relatedKeys = findRelatedConversationKeys(conversationsRef.current, { channel, conversationKey }).slice(0, 5);
      let usedFallbackInAny = false;
      const responses = await Promise.all(
        relatedKeys.map((item) =>
          fetchGetWithFallback<{ items: MessageItem[]; conversationState?: ConversationStatePayload; }>(
            `/api/admin/conversations/${item.channel}/${encodeURIComponent(item.conversationKey)}/messages?limit=120`
          ).then((result) => {
            if (result.usedFallback) usedFallbackInAny = true;
            return result.data;
          }),
        )
      );
      const response = responses[0];
      const merged = mergeAndSortMessages(responses);
      if (usedFallbackInAny && merged.length === 0 && messages.length > 0) {
        return;
      }
      setMessages(merged);
      if (response?.conversationState) {
        const patch = response.conversationState;
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
      }
    } catch (err: any) {
      showToast(toUserFriendlyError(err, "Konuşma mesajları yüklenemedi."), 'error');
    } finally {
      if (showLoading) setLoadingMessages(false);
    }
  }, [fetchGetWithFallback, messages.length]);
  const scheduleRealtimeRefresh = useCallback((events?: ConversationRealtimeEvent[]) => {
    if (realtimeRefreshTimerRef.current) return;
    const activeId = selectedConversationIdRef.current;
    const activeConversationTouched = Boolean(
      activeId &&
      events?.some((event) => toConversationId(event.channel, event.conversationKey) === activeId),
    );
    const waitMs = activeConversationTouched ? 60 : 160;

    realtimeRefreshTimerRef.current = window.setTimeout(() => {
      realtimeRefreshTimerRef.current = null;

      const liveSelectedId = selectedConversationIdRef.current;
      if (liveSelectedId && liveSelectedId.includes(':')) {
        const [rawChannel, ...rest] = liveSelectedId.split(':');
        const rawKey = rest.join(':');
        if ((rawChannel === 'INSTAGRAM' || rawChannel === 'WHATSAPP') && rawKey) {
          void loadMessages(rawChannel as ChannelType, rawKey, false);
        }
      }

      void loadKonuşmalar(false);
    }, waitMs);
  }, [loadKonuşmalar, loadMessages]);

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

  useConversationRealtimeSync({
    enabled: !!accessToken,
    accessToken,
    channel: channelView === 'ALL' ? undefined : channelView,
    cursorScopeKey: 'conversations-page',
    apiFetch,
    onEvents: (events, source) => {
      if (source === 'stream') {
        markLiveConversation(
          events.map((event) => toConversationId(event.channel, event.conversationKey)),
        );
      }
      scheduleRealtimeRefresh(events);
    },
    onRequireFullRefresh: () => {
      scheduleRealtimeRefresh();
    },
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
      if (!realtimeRefreshTimerRef.current) return;
      window.clearTimeout(realtimeRefreshTimerRef.current);
      realtimeRefreshTimerRef.current = null;
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
      await Promise.all([
        loadMessages(selectedConversation.channel, normalizedEffectiveConversationKey, false),
        loadKonuşmalar(false),
      ]);
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
      await Promise.all([
        loadMessages(selectedConversation.channel, normalizedEffectiveConversationKey, false),
        loadKonuşmalar(false),
      ]);
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
      await Promise.all([
        loadMessages(selectedConversation.channel, normalizedEffectiveConversationKey, false),
        loadKonuşmalar(false),
      ]);
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
              setSelectedConversationId(null);
              setMessages([]);
              setSearchQuery('');
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
              setSelectedConversationId(null);
              setMessages([]);
              setSearchQuery('');
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
                setSelectedConversationId(null);
                setMessages([]);
                setSearchQuery('');
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
            <div className="ml-auto flex items-center gap-1.5 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              <div className="size-1 rounded-full bg-muted-foreground/40" />
              Sisteme Bağlı
            </div>
          </div>
        </div>
      )}

      {channelBlocked ?
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full rounded-[32px] border border-white/20 bg-background/40 backdrop-blur-2xl p-8 shadow-2xl text-center overflow-hidden relative"
          >
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
          </motion.div>
        </div> :

        <div className="flex flex-col h-full lg:grid lg:grid-cols-[300px,minmax(0,1fr)] gap-2 relative z-10 px-1 sm:px-2">
          <motion.div
            className={`flex flex-col bg-background/40 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden h-[calc(100dvh-11.5rem)] min-h-0 lg:h-[calc(100dvh-11.5rem)] lg:min-h-[680px] ${mobileView === 'CHAT' ? 'hidden lg:flex' : 'flex'}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex flex-wrap items-center gap-2 p-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/40 bg-background/60 shadow-sm whitespace-nowrap">
                <div className="size-2 rounded-full bg-foreground/20" />
                <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">{filteredKonuşmalar.length} Sohbet</span>
              </div>
              {handoverTotal > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 shadow-sm whitespace-nowrap">
                  <div className="size-2 rounded-full bg-amber-500" />
                  <span className="text-[10px] font-bold uppercase tracking-tight text-amber-700">{handoverTotal} Bekleyen</span>
                </div>
              )}
            </div>

            <div className="relative px-4 mb-4">
              <Search className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Ad, kullanıcı adı, mesaj ara"
                className="pl-9 h-9 border-border/40 bg-background/40 rounded-xl" />
            </div>

            {loadingKonuşmalar ?
              <div className="space-y-2 mt-2 px-2">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="flex p-2 gap-2 border border-transparent">
                    <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2 mt-1">
                      <div className="flex justify-between">
                         <Skeleton className="h-4 w-28" />
                         <Skeleton className="h-3 w-10" />
                      </div>
                      <Skeleton className="h-3 w-3/4 opacity-60" />
                    </div>
                  </div>
                ))}
              </div> :
              filteredKonuşmalar.length === 0 ?
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                  <MessageSquareDashed className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-sm font-semibold text-foreground/80">Sohbet kutusu boş</p>
                  <p className="text-xs opacity-80 mt-1">
                    {channelView === 'ALL' ? "Henüz görüntülenecek sohbet yok." : "Bu kanal için mesaj yok."}
                  </p>
                </div> :

                <div className="flex-1 min-w-0 space-y-1.5 overflow-y-auto overflow-x-hidden pr-1 pb-1 scrollbar-thin px-2">
                  <AnimatePresence mode="popLayout">
                    {filteredKonuşmalar.map((item, index) => {
                    const id = `${item.channel}:${item.conversationKey}`;
                    const active = id === selectedConversationId;
                    const isLive = !!liveConversationMap[id];
                    const displayName = conversationDisplayName(item);
                    return (
                      <motion.button
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{
                          opacity: 1,
                          scale: isLive ? [1, 1.01, 1] : 1,
                          boxShadow: isLive ?
                            ['0 0 0 rgba(99,102,241,0)', '0 0 0 3px rgba(99,102,241,0.16)', '0 0 0 rgba(99,102,241,0)'] :
                            '0 0 0 rgba(99,102,241,0)',
                        }}
                        transition={{
                          duration: isLive ? 0.45 : 0.2,
                          ease: 'easeOut',
                        }}
                        key={id}
                        type="button"
                        onClick={() => {
                          lastAutoScrolledConversationRef.current = null;
                          setSelectedConversationId(id);
                          markConversationAsReadLocal(id);
                          setMobileView('CHAT');
                        }}
                        className={`w-full max-w-full min-w-0 group rounded-[18px] p-2.5 text-left transition-all duration-300 border relative overflow-hidden ${active ? 'border-[var(--deep-indigo)]/40 bg-gradient-to-r from-[var(--deep-indigo)]/15 via-[var(--deep-indigo)]/5 to-transparent shadow-[0_8px_20px_rgba(0,0,0,0.06)]' : 'border-transparent hover:border-white/20 hover:bg-white/5'}`
                        }>
                        <div className="flex min-w-0 gap-4 relative z-10">
                          <div className="relative shrink-0">
                            <Avatar className={`size-12 border-2 transition-transform duration-300 group-hover:scale-105 ${active ? 'border-[var(--deep-indigo)]/50 shadow-lg' : 'border-white/20'}`}>
                              {item.profilePicUrl ?
                                <AvatarImage
                                  src={
                                    buildConversationAvatarSrc({
                                      channel: item.channel,
                                      conversationKey: item.conversationKey,
                                      sourceUrl: item.profilePicUrl,
                                      accessToken,
                                    }) || undefined
                                  }
                                  alt={displayName} /> :

                                null}
                              <AvatarFallback className={`font-bold text-white shadow-inner bg-gradient-to-br ${
                                index % 3 === 0 ? 'from-indigo-500 to-purple-600' : 
                                index % 3 === 1 ? 'from-violet-500 to-fuchsia-600' : 
                                'from-blue-500 to-indigo-600'
                              }`}>
                                {initialsFromLabel(displayName)}
                              </AvatarFallback>
                            </Avatar>
                            {/* Unread pulsing indicator */}
                            {item.unreadCount > 0 && (
                              <div className="absolute -top-1 -right-1 flex h-4 min-w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex min-w-4 h-4 px-1 rounded-full bg-orange-500 border border-background items-center justify-center text-[9px] leading-none text-white font-black shadow-sm">
                                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                                </span>
                              </div>
                            )}
                            {/* Channel Icon Overlay */}
                            <div className={`absolute -right-0.5 -bottom-0.5 z-20 size-5 rounded-full border-2 border-background shadow-sm flex items-center justify-center ${item.channel === 'WHATSAPP' ? 'bg-emerald-500' : 'bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-500'}`}>
                                {item.channel === 'WHATSAPP' ? <WhatsAppLogo className="size-2.5 text-white" /> : <Instagram className="size-2.5 text-white" />}
                            </div>
                          </div>
                          
                          <div className="w-0 min-w-0 flex-1 py-0">
                            <div className="flex min-w-0 items-center justify-between mb-1">
                              <div className="flex min-w-0 items-center gap-1.5">
                                {isHandoverInProgress(normalizeAutomationMode(item.automationMode)) && (
                                  <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
                                    <LifeBuoy className="size-3.5" />
                                  </span>
                                )}
                                <h4 className={`text-[15px] font-bold truncate ${active ? 'text-[var(--deep-indigo)]' : 'text-foreground/90'}`}>{displayName}</h4>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {isLive && (
                                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                )}
                                <span className="text-[12px] text-muted-foreground/80 font-semibold tracking-tighter">{formatRelativeTime(item.lastEventTimestamp)}</span>
                              </div>
                            </div>
                            <p className={`block max-w-full min-w-0 overflow-hidden text-[13px] text-ellipsis whitespace-nowrap transition-colors ${item.unreadCount > 0 ? 'text-foreground font-semibold' : 'text-muted-foreground/70'}`}>
                              {getPreview(item)}
                            </p>
                          </div>
                        </div>
                        {active && (
                          <motion.div 
                            layoutId="active-sidebar-pill"
                            className="absolute left-0 top-3 bottom-3 w-1.5 bg-[var(--deep-indigo)] rounded-r-full shadow-[0_0_15px_var(--deep-indigo)]" 
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            }
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className={`flex flex-col h-[calc(100dvh-11.5rem)] min-h-0 rounded-2xl border border-border/40 bg-background/40 backdrop-blur-xl p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden lg:h-[calc(100dvh-11.5rem)] lg:min-h-[680px] ${mobileView === 'CHAT' ? 'flex' : 'hidden lg:flex'}`}>
            {selectedConversation ?
              <>
                <div className="flex items-center justify-between gap-2 border-b border-border/40 px-1.5 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Sohbet listesine dön"
                        className="lg:hidden -ml-1 h-8 w-8 hover:bg-white/10"
                        onClick={() => setMobileView('LIST')}
                      >
                        <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                      </Button>
                    <Avatar className="size-9 border border-border/40">
                      {selectedConversation.profilePicUrl ?
                        <AvatarImage
                          src={
                            buildConversationAvatarSrc({
                              channel: selectedConversation.channel,
                              conversationKey: selectedConversation.conversationKey,
                              sourceUrl: selectedConversation.profilePicUrl,
                              accessToken,
                            }) || undefined
                          }
                          alt={conversationDisplayName(selectedConversation)} /> :

                        null}
                      <AvatarFallback className="text-xs">
                        {initialsFromLabel(conversationDisplayName(selectedConversation))}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold truncate leading-tight">
                        {conversationDisplayName(selectedConversation)}
                      </p>
                      <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                        <span className="text-[10px] min-w-0 font-bold uppercase tracking-tight text-muted-foreground/60 truncate">
                          {selectedConversation.channel === 'INSTAGRAM' ? 'Instagram Sohbeti' : 'WhatsApp Sohbeti'}
                        </span>
                        {isHandoverInProgress(normalizeAutomationMode(selectedConversation.automationMode)) && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-tight text-amber-600 shadow-sm shadow-amber-500/10">
                            <Sparkles className="size-1.5 fill-current" />
                            Canlı Destek
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  ref={messagesViewportRef}
                  onScroll={(event) => {
                    const el = event.currentTarget;
                    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
                    stickToBottomRef.current = distanceToBottom < 48;
                  }}
                  className="flex-1 min-h-0 mt-2 space-y-3 overflow-y-auto rounded-2xl border border-border/40 bg-gradient-to-b from-muted/10 to-transparent p-2 scrollbar-thin lg:min-h-[420px]">

                  {loadingMessages ?
                    <div className="space-y-6 py-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                           <Skeleton className={`h-16 w-[70%] rounded-[24px] ${i % 2 === 0 ? 'bg-[var(--deep-indigo)]/5' : 'bg-muted/30'}`} />
                        </div>
                      ))}
                    </div> :
                    messages.length === 0 ?
                      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-12">
                        <MessageCircle className="w-12 h-12 mb-4 opacity-10" />
                        <p className="text-sm font-medium">Henüz mesaj bulunmuyor</p>
                        <p className="text-xs opacity-60 mt-1">İlk mesajı siz gönderin.</p>
                      </div> :

                      <div className="flex flex-col gap-1 min-h-full pb-4">
                        <AnimatePresence initial={false}>
                          {messages.map((msg, index) => {
                            const direction = msg.direction?.toLowerCase();
                            const isOutbound = direction === 'outbound' || direction === 'outgoing' || !!msg.outboundSource;
                            const isSystem = direction === 'system';
                            const prevMsg = messages[index - 1];
                            const nextMsg = messages[index + 1];
                            
                            const isSameSenderAsPrev = !isSystem && prevMsg?.direction === msg.direction;
                            const isSameSenderAsNext = !isSystem && nextMsg?.direction === msg.direction;

                            const dt = new Date(msg.eventTimestamp);
                            const prevDt = prevMsg ? new Date(prevMsg.eventTimestamp) : null;
                            const showDateHeader = !prevDt || !isToday(dt) && format(dt, 'yyyy-MM-dd') !== format(prevDt, 'yyyy-MM-dd');

                            const senderLabel = isSystem ? 'Sistem' : isOutbound ? (msg.outboundSourceLabel || 'Siz') : "Müşteri";

                            return (
                              <React.Fragment key={msg.id || index}>
                                {showDateHeader && (
                                  <div className="flex justify-center my-8 pointer-events-none">
                                    <span className="px-4 py-1.5 rounded-full bg-background/60 backdrop-blur-xl border border-white/20 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground shadow-2xl glass-panel">
                                      {isToday(dt) ? 'Bugün' : isYesterday(dt) ? 'Dün' : format(dt, 'd MMMM yyyy', { locale: tr })}
                                    </span>
                                  </div>
                                )}
                                
                                {isSystem ? (
                                  <div className="max-w-[70%] mx-auto my-4 text-center">
                                    <div className="px-3 py-1.5 rounded-lg bg-amber-500/5 border border-amber-500/10 text-amber-700/80 text-[11px] font-medium leading-relaxed">
                                      <AlertTriangle className="size-3 inline mr-1.5 mb-0.5 opacity-60" />
                                      {msg.text}
                                    </div>
                                  </div>
                                ) : (
                                  <motion.div
                                    initial={{ opacity: 0, x: isOutbound ? 10 : -10, scale: 0.95 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} ${isSameSenderAsPrev ? 'mt-0.5' : 'mt-4'}`}
                                  >
                                    <div className={`flex flex-col max-w-[85%] lg:max-w-[75%] ${isOutbound ? 'items-end' : 'items-start'}`}>
                                      {!isSameSenderAsPrev && (
                                        <span className={`text-[10px] font-bold mb-1 opacity-40 px-3 uppercase tracking-wider ${isOutbound ? 'text-right' : 'text-left'}`}>
                                          {senderLabel}
                                        </span>
                                      )}
                                      
                                      <div className={`group relative px-4 py-2.5 shadow-sm transition-all duration-300 hover:shadow-md ${
                                        isOutbound ? 
                                          `bg-gradient-to-br from-[var(--deep-indigo)] to-indigo-600 text-white border border-indigo-500/20 ${isSameSenderAsNext && isSameSenderAsPrev ? 'rounded-[20px]' : isSameSenderAsNext ? 'rounded-t-[20px] rounded-bl-[20px] rounded-br-[8px]' : isSameSenderAsPrev ? 'rounded-b-[20px] rounded-tl-[20px] rounded-tr-[8px]' : 'rounded-[20px] rounded-tr-[4px]'}` : 
                                          `bg-card/40 backdrop-blur-lg border border-white/10 text-foreground ${isSameSenderAsNext && isSameSenderAsPrev ? 'rounded-[20px]' : isSameSenderAsNext ? 'rounded-t-[20px] rounded-br-[20px] rounded-bl-[8px]' : isSameSenderAsPrev ? 'rounded-b-[20px] rounded-tr-[20px] rounded-tl-[8px]' : 'rounded-[20px] rounded-tl-[4px]'}`
                                      }`}
                                      role="button"
                                      tabIndex={0}
                                      aria-label="Mesaj detaylarını görüntüle"
                                      onContextMenu={(event) => {
                                        event.preventDefault();
                                        openMessageMeta(msg);
                                      }}
                                      onTouchStart={() => beginLongPress(msg)}
                                      onTouchEnd={clearLongPressTimer}
                                      onTouchCancel={clearLongPressTimer}
                                      onTouchMove={clearLongPressTimer}
                                      onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                          event.preventDefault();
                                          openMessageMeta(msg);
                                        }
                                      }}>
                                        <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">
                                          {formatOperatorMessage(msg.text) || formatMessageTypeLabel(msg.messageType)}
                                        </p>
                                        <div className={`text-[9px] mt-1.5 font-bold opacity-40 flex items-center gap-1.5 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                                          {format(dt, 'HH:mm')}
                                          {isOutbound && msg.status === 'READ' && <CheckCircle2 className="size-2.5 text-sky-300" />}
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                  }
                </div>

                <div className="sticky bottom-0 z-20 mt-2 space-y-2">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-1.5">
                       <div className={`size-1.5 rounded-full ${handoverInProgress ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                       <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                         {handoverInProgress ? 'Kedy AI: Pasif' : 'Kedy AI: Aktif'}
                       </span>
                    </div>
                    {handoverInProgress ? (
                      <Button type="button" size="sm" variant="ghost" className="h-7 text-[10px] font-bold uppercase tracking-tight text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" onClick={resumeAuto} disabled={sendingResume}>
                        <Sparkles className="size-3 mr-1" />
                        {sendingResume ? 'Bot Açılıyor...' : "Botu Devreye Al"}
                      </Button>
                    ) : (
                      <Button type="button" size="sm" variant="ghost" className="h-7 text-[10px] font-bold uppercase tracking-tight text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={requestHandover} disabled={sendingHandover}>
                        <Sparkles className="size-3 mr-1" />
                        {sendingHandover ? 'Alınıyor...' : 'Ben Yanıtlayacağım'}
                      </Button>
                    )}
                  </div>
                  {instagramWindowExpired ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-[11px] text-amber-800 flex items-start gap-2">
                      <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
                      <span>Instagram 24 saat yanıt penceresi dolmuş olabilir. Mesaj gönderimi başarısız olursa müşterinin tekrar yazması gerekir.</span>
                    </div>
                  ) : null}

                  <div className="rounded-2xl border border-border/40 bg-background/80 backdrop-blur-md shadow-2xl p-2 focus-within:border-indigo-500/50 transition-all">
                    <div className="flex gap-2">
                      <Textarea
                        value={replyText}
                        onChange={(event) => setReplyText(event.target.value)}
                        placeholder={
                          instagramWindowExpired ?
                            'Instagram 24 saat penceresi dolmuş olabilir. Yine de deneyebilirsiniz.' :
                            canReply ?
                              'Mesajınızı yazın...' :
                              "Yanıtlamak için önce 'Ben Yanıtlayacağım' seçeneğine dokunun"
                        }
                        disabled={!canReply}
                        rows={1}
                        className="max-h-28 min-h-10 resize-none border-0 bg-transparent px-3 text-[15px] focus-visible:ring-0 focus-visible:ring-offset-0"
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            if (canReply) void sendReply();
                          }
                        }} />

                      <Button 
                        type="button" 
                        aria-label="Mesaj gönder" 
                        onClick={sendReply} 
                        disabled={sendingReply || !replyText.trim() || !canReply} 
                        className={`rounded-lg px-4 transition-all h-10 w-10 p-0 flex items-center justify-center shrink-0 ${replyText.trim() && canReply ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-muted text-muted-foreground'}`}>
                        {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </> :

              <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground py-20 relative">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/5 to-transparent" />
                <div className="size-24 rounded-[32px] bg-gradient-to-br from-indigo-500/10 to-transparent flex items-center justify-center mb-6 border border-indigo-500/10 shadow-inner relative overflow-hidden group">
                  <div className="absolute inset-0 bg-indigo-500/5 scale-0 group-hover:scale-100 transition-transform duration-700 rounded-full blur-2xl" />
                  <MessageCircle className="w-10 h-10 text-indigo-500/60 relative z-10" />
                </div>
                <h3 className="text-xl font-black text-foreground/90 tracking-tight">Diyalog Seçin</h3>
                <p className="text-sm mt-2 max-w-[280px] font-medium leading-relaxed opacity-60">Mesajlaşmak ve randevuları yönetmek için sol listeden bir sohbet seçebilirsiniz.</p>
              </div>
            }
          </motion.div>
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
    </div>
  );
}
