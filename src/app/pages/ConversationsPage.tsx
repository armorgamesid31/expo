import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, MessageCircle, Search, Send, UserRound, Sparkles, MessageSquareDashed, ChevronLeft, Instagram } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Skeleton } from '../components/ui/skeleton';
import { useAuth } from '../context/AuthContext';
import { useToasts } from '../context/ToastContext';
import { format, isToday, isYesterday } from 'date-fns';
import { tr } from 'date-fns/locale/tr';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ConversationRealtimeEvent, useConversationRealtimeSync } from '../lib/realtime-conversation-sync';

type ChannelType = 'INSTAGRAM' | 'WHATSAPP';
type AutomationMode = 'AUTO' | 'HUMAN_PENDING' | 'HUMAN_ACTIVE' | 'MANUAL_ALWAYS' | 'AUTO_RESUME_PENDING';
type QuickFilter = 'all' | 'unread' | 'handover';
const SHOW_WHATSAPP_INBOX = true;

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
  return `Kullanıcı ${item.conversationKey}`;
}

function initialsFromLabel(value: string | null | undefined): string {
  if (!value) return 'U';
  const cleaned = value.replace(/^@/, '').trim();
  if (!cleaned) return 'U';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function badgeClass(channel: ChannelType): string {
  return channel === 'INSTAGRAM' ? 'bg-fuchsia-500/10 text-fuchsia-700' : 'bg-emerald-500/10 text-emerald-700';
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

function automationBadgeClass(mode: AutomationMode): string {
  if (mode === 'HUMAN_PENDING') return 'bg-amber-500/10 text-amber-700';
  if (mode === 'HUMAN_ACTIVE') return 'bg-blue-500/10 text-blue-700';
  if (mode === 'MANUAL_ALWAYS') return 'bg-slate-500/10 text-slate-700';
  if (mode === 'AUTO_RESUME_PENDING') return 'bg-cyan-500/10 text-cyan-700';
  return 'bg-emerald-500/10 text-emerald-700';
}

function automationLabel(mode: AutomationMode): string {
  if (mode === 'HUMAN_PENDING') return 'Müşteri bekliyor';
  if (mode === 'HUMAN_ACTIVE') return "Ben yanıtlıyorum";
  if (mode === 'MANUAL_ALWAYS') return 'Manuel';
  if (mode === 'AUTO_RESUME_PENDING') return 'Bot başlayacak';
  return 'Bot yanıtlıyor';
}

function isHandoverInProgress(mode: AutomationMode): boolean {
  return mode === 'HUMAN_PENDING' || mode === 'HUMAN_ACTIVE';
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
      
      // WhatsApp messages might not have unique providerMessageIds for outbound messages in some cases,
      // or they might have different direction strings. We'll use a more comprehensive fingerprint.
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
  const { apiFetch, accessToken } = useAuth();
  const { showToast } = useToasts();
  const navigate = useNavigate();
  const [channelView, setChannelView] = useState<ChannelType>('INSTAGRAM');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [loadingKonuşmalar, setLoadingKonuşmalar] = useState(true);
  const [conversations, setKonuşmalar] = useState<ConversationItem[]>([]);
  const [channelHealth, setChannelHealth] = useState<ChannelHealthPayload | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [sendingHandover, setSendingHandover] = useState(false);
  const [sendingResume, setSendingResume] = useState(false);
  const [mobileView, setMobileView] = useState<'LIST' | 'CHAT'>('LIST');
  const realtimeRefreshTimerRef = useRef<number | null>(null);
  const conversationsRef = useRef<ConversationItem[]>([]);
  const selectedConversationIdRef = useRef<string | null>(null);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const lastAutoScrolledConversationRef = useRef<string | null>(null);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) return null;
    return conversations.find((item) => `${item.channel}:${item.conversationKey}` === selectedConversationId) || null;
  }, [conversations, selectedConversationId]);

  const filteredKonuşmalar = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return conversations.filter((item) => {
      const matchesFilter =
        quickFilter === 'all' ||
        quickFilter === 'unread' && item.unreadCount > 0 ||
        quickFilter === 'handover' && isHandoverInProgress(normalizeAutomationMode(item.automationMode));
      if (!matchesFilter) return false;
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
  }, [conversations, quickFilter, searchQuery]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
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
  }, [filteredKonuşmalar, selectedConversationId]);

  useEffect(() => {
    stickToBottomRef.current = true;
  }, [selectedConversationId]);

  const loadKonuşmalar = useCallback(async (showLoading = true) => {
    if (showLoading) setLoadingKonuşmalar(true);
    try {
      const response = await apiFetch<{ items: ConversationItem[]; channelHealth?: ChannelHealthPayload; }>(
        `/api/admin/conversations?limit=60&channel=${channelView}`
      );
      const next = response?.items || [];
      setChannelHealth(response?.channelHealth || null);
      setKonuşmalar(next);
      conversationsRef.current = next;
      if (!selectedConversationIdRef.current && next.length > 0) {
        const nextId = `${next[0].channel}:${next[0].conversationKey}`;
        selectedConversationIdRef.current = nextId;
        setSelectedConversationId(nextId);
      }
    } catch (err: any) {
      showToast(err?.message || "Konuşmalar yüklenemedi.", 'error');
    } finally {
      if (showLoading) setLoadingKonuşmalar(false);
    }
  }, [apiFetch, channelView]);

  const loadMessages = useCallback(async (channel: ChannelType, conversationKey: string, showLoading = true) => {
    if (showLoading) setLoadingMessages(true);
    try {
      const relatedKeys = findRelatedConversationKeys(conversationsRef.current, { channel, conversationKey }).slice(0, 5);
      const responses = await Promise.all(
        relatedKeys.map((item) =>
          apiFetch<{ items: MessageItem[]; conversationState?: ConversationStatePayload; }>(
            `/api/admin/conversations/${item.channel}/${encodeURIComponent(item.conversationKey)}/messages?limit=120`
          )
        )
      );
      const response = responses[0];
      setMessages(mergeAndSortMessages(responses));
      if (response?.conversationState) {
        const patch = response.conversationState;
        setKonuşmalar((prev) =>
          prev.map((item) =>
            item.channel === channel && item.conversationKey === conversationKey ?
              {
                ...item,
                ...patch,
                automationMode: normalizeAutomationMode(patch.automationMode || item.automationMode)
              } :
              item
          )
        );
      }
    } catch (err: any) {
      showToast(err?.message || "Konuşma mesajları yüklenemedi.", 'error');
    } finally {
      if (showLoading) setLoadingMessages(false);
    }
  }, [apiFetch]);
  const scheduleRealtimeRefresh = useCallback((events?: ConversationRealtimeEvent[]) => {
    if (realtimeRefreshTimerRef.current) return;
    realtimeRefreshTimerRef.current = window.setTimeout(() => {
      realtimeRefreshTimerRef.current = null;
      void loadKonuşmalar(false);

      const activeId = selectedConversationIdRef.current;
      if (!activeId || !activeId.includes(':')) {
        return;
      }

      const [rawChannel, ...rest] = activeId.split(':');
      const rawKey = rest.join(':');
      if ((rawChannel !== 'INSTAGRAM' && rawChannel !== 'WHATSAPP') || !rawKey) {
        return;
      }

      if (events && events.length > 0) {
        const affectsActiveConversation = events.some(
          (event) => `${event.channel}:${event.conversationKey}` === activeId,
        );
        if (!affectsActiveConversation) {
          return;
        }
      }

      void loadMessages(rawChannel as ChannelType, rawKey, false);
    }, 250);
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
    channel: channelView,
    cursorScopeKey: 'conversations-page',
    apiFetch,
    onEvents: (events) => {
      scheduleRealtimeRefresh(events);
    },
    onRequireFullRefresh: () => {
      scheduleRealtimeRefresh();
    },
  });

  useEffect(() => {
    return () => {
      if (!realtimeRefreshTimerRef.current) return;
      window.clearTimeout(realtimeRefreshTimerRef.current);
      realtimeRefreshTimerRef.current = null;
    };
  }, []);

  const sendReply = async () => {
    if (!selectedConversation || !replyText.trim()) return;
    setSendingReply(true);
    try {
      await apiFetch(
        `/api/admin/conversations/${selectedConversation.channel}/${encodeURIComponent(selectedConversation.conversationKey)}/reply`,
        {
          method: 'POST',
          body: JSON.stringify({ text: replyText.trim() })
        }
      );
      setReplyText('');
      showToast('Yanıt başarıyla gönderildi.', 'success');
      await loadMessages(selectedConversation.channel, selectedConversation.conversationKey, false);
      await loadKonuşmalar(false);
    } catch (err: any) {
      showToast(err?.message || "Bize ulaşın mesajı gönderilemedi.", 'error');
    } finally {
      setSendingReply(false);
    }
  };

  const requestHandover = async () => {
    if (!selectedConversation) return;
    setSendingHandover(true);
    try {
      const response = await apiFetch<{ alreadyRequested?: boolean; }>(
        `/api/admin/conversations/${selectedConversation.channel}/${encodeURIComponent(selectedConversation.conversationKey)}/handover`,
        {
          method: 'POST',
          body: JSON.stringify({ note: 'Salon personeli tarafından canlı destek istendi.' })
        }
      );
      if (response?.alreadyRequested) {
        showToast('Bu görüşme zaten canlı destek modunda.', 'info');
      } else {
        showToast('Canlı destek talebi iletildi.', 'success');
      }
      await loadMessages(selectedConversation.channel, selectedConversation.conversationKey, false);
      await loadKonuşmalar(false);
    } catch (err: any) {
      showToast(err?.message || 'Devir isteği başarısız oldu.', 'error');
    } finally {
      setSendingHandover(false);
    }
  };

  const resumeAuto = async () => {
    if (!selectedConversation) return;
    setSendingResume(true);
    try {
      await apiFetch(
        `/api/admin/conversations/${selectedConversation.channel}/${encodeURIComponent(selectedConversation.conversationKey)}/resume-auto`,
        { method: 'POST' }
      );
      showToast('Yapay zeka otomasyonu tekrar devreye alındı.', 'success');
      await loadMessages(selectedConversation.channel, selectedConversation.conversationKey, false);
      await loadKonuşmalar(false);
    } catch (err: any) {
      showToast(err?.message || 'Otomasyon başlatılamadı.', 'error');
    } finally {
      setSendingResume(false);
    }
  };

  const canReply = selectedConversation?.channel === 'INSTAGRAM' || selectedConversation?.channel === 'WHATSAPP';
  const selectedMode = normalizeAutomationMode(selectedConversation?.automationMode);
  const handoverInProgress = isHandoverInProgress(selectedMode);
  const unreadTotal = filteredKonuşmalar.reduce((sum, item) => sum + (item.unreadCount || 0), 0);
  const handoverTotal = filteredKonuşmalar.filter((item) =>
    isHandoverInProgress(normalizeAutomationMode(item.automationMode))
  ).length;
  const selectedChannelHealth = channelView === 'INSTAGRAM' ? channelHealth?.instagram : channelHealth?.whatsapp;
  const channelBlocked = channelHealth
    ? channelView === 'INSTAGRAM'
      ? !(channelHealth.instagram.connected && channelHealth.instagram.bindingReady)
      : !channelHealth.whatsapp.connected
    : false;

  useEffect(() => {
    if (!channelBlocked) return;
    setSelectedConversationId(null);
    setMessages([]);
  }, [channelBlocked]);

  return (
    <div className="h-full pb-20 overflow-y-auto p-4 sm:p-6 bg-gradient-to-br from-indigo-500/5 via-background to-fuchsia-500/5 relative">
      <div className="pointer-events-none absolute right-0 top-0 h-[400px] w-[400px] -translate-y-1/2 translate-x-1/3 rounded-full bg-[var(--deep-indigo)] mix-blend-screen opacity-10 blur-[100px]" />
      
      <div className="mb-6 relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent flex items-center gap-2">
            Sohbetler 
            <span className="inline-flex items-center justify-center rounded-full bg-[var(--deep-indigo)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--deep-indigo)]">
              Beta
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[var(--deep-indigo)]" />
            Yapay zeka destekli birleşik gelen kutusu
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3 relative z-10">
        <div className="inline-flex rounded-xl border border-border/40 bg-background/60 shadow-sm backdrop-blur-md p-1">
          <button
            type="button"
            aria-pressed={channelView === 'INSTAGRAM'}
            onClick={() => {
              setChannelView('INSTAGRAM');
              setSelectedConversationId(null);
              setMessages([]);
              setSearchQuery('');
              setQuickFilter('all');
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${channelView === 'INSTAGRAM' ? 'bg-gradient-to-br from-[var(--deep-indigo)] to-indigo-600 text-white shadow-md' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`
            }>

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
                setQuickFilter('all');
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${channelView === 'WHATSAPP' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`
              }>

              WhatsApp
            </button> :
            null}
        </div>

        <div className="inline-flex rounded-xl border border-border/40 bg-background/60 shadow-sm backdrop-blur-md p-1">
          {(['all', 'unread', 'handover'] as QuickFilter[]).map((filter) =>
            <button
              key={filter}
              type="button"
              aria-pressed={quickFilter === filter}
              onClick={() => setQuickFilter(filter)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${quickFilter === filter ? 'bg-muted text-foreground' : 'text-muted-foreground'}`
              }>

              {filter === 'all' ? 'Hepsi' : filter === 'unread' ? 'Okunmamış' : 'Canlı Destek'}
            </button>
          )}
        </div>
      </div>

      {channelBlocked ?
        <div className="rounded-2xl border border-border bg-background p-6">
          <p className="text-base font-semibold">
            {channelView === 'INSTAGRAM' ? "Instagram bağlantısı gerekli" : "WhatsApp bağlantısı gerekli"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {selectedChannelHealth?.message || "Bu kanal için sohbetleri görmek önce bağlantı kurulmasını gerektirir."}
          </p>
          {selectedChannelHealth?.missingRequirements?.length ?
            <div className="mt-3 text-xs text-muted-foreground">
              Eksikler: {selectedChannelHealth.missingRequirements.join(', ')}
            </div> :
            null}
          <Button
            type="button"
            className="mt-4"
            onClick={() =>
              navigate('/app/features/social-channels', {
                state: { navDirection: 'forward' }
              })
            }>

            {channelView === 'INSTAGRAM' ? "Instagram Ayarları" : "WhatsApp Ayarları"}
          </Button>
        </div> :

        <div className="flex flex-col h-full lg:grid lg:grid-cols-[380px,1fr] gap-4 relative z-10">
          <motion.div
            className={`flex flex-col bg-background/40 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden h-[calc(100vh-140px)] lg:h-[750px] ${mobileView === 'CHAT' ? 'hidden lg:flex' : 'flex'}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="grid grid-cols-3 gap-2 p-4">
              <div className="rounded-xl border border-border/40 bg-background/60 shadow-sm px-3 py-3">
                <p className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground mb-1">Konuşmalar</p>
                <p className="text-xl font-bold leading-tight">{filteredKonuşmalar.length}</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-background/60 shadow-sm px-3 py-3 relative overflow-hidden">
                {unreadTotal > 0 && <div className="absolute top-0 inset-x-0 h-0.5 bg-[var(--rose-gold)]" />}
                <p className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground mb-1">Okunmamış</p>
                <p className={`text-xl font-bold leading-tight ${unreadTotal > 0 ? 'text-[var(--rose-gold)]' : ''}`}>{unreadTotal}</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-background/60 shadow-sm px-3 py-3 relative overflow-hidden">
                {handoverTotal > 0 && <div className="absolute top-0 inset-x-0 h-0.5 bg-amber-500" />}
                <p className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground mb-1">Bekleyen</p>
                <p className={`text-xl font-bold leading-tight ${handoverTotal > 0 ? 'text-amber-600' : ''}`}>{handoverTotal}</p>
              </div>
            </div>

            <div className="relative px-4">
              <Search className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Ad, kullanıcı adı, mesaj ara"
                className="pl-9" />

            </div>

            {loadingKonuşmalar ?
              <div className="space-y-3 mt-4 px-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="flex p-3 gap-3 border border-transparent">
                    <Skeleton className="w-11 h-11 rounded-full shrink-0" />
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
                <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                  <MessageSquareDashed className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-sm font-semibold text-foreground/80">Sohbet kutusu boş</p>
                  <p className="text-xs opacity-80 mt-1">
                    {selectedChannelHealth ? "Bu filtrelere uygun bir mesajlaşma bulunamadı." : "Bu kanal için mesaj yok."}
                  </p>
                </div> :

                <div className="flex-1 space-y-2 overflow-y-auto pr-2 pb-2 scrollbar-thin px-4">
                  <AnimatePresence mode="popLayout">
                    {filteredKonuşmalar.map((item, index) => {
                    const id = `${item.channel}:${item.conversationKey}`;
                    const active = id === selectedConversationId;
                    const displayName = conversationDisplayName(item);
                    return (
                      <motion.button
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={id}
                        type="button"
                        onClick={() => {
                          lastAutoScrolledConversationRef.current = null;
                          setSelectedConversationId(id);
                          setMobileView('CHAT');
                        }}
                        className={`w-full group rounded-[22px] p-3.5 text-left transition-all duration-300 border relative overflow-hidden ${active ? 'border-[var(--deep-indigo)]/40 bg-gradient-to-r from-[var(--deep-indigo)]/15 via-[var(--deep-indigo)]/5 to-transparent shadow-[0_8px_20px_rgba(0,0,0,0.06)]' : 'border-transparent hover:border-white/20 hover:bg-white/5'}`
                        }>
                        <div className="flex gap-4 relative z-10">
                          <div className="relative shrink-0">
                            <Avatar className={`size-12 border-2 transition-transform duration-300 group-hover:scale-105 ${active ? 'border-[var(--deep-indigo)]/50 shadow-lg' : 'border-white/20'}`}>
                              {item.profilePicUrl ? <AvatarImage src={item.profilePicUrl} alt={displayName} /> : null}
                              <AvatarFallback className="bg-[var(--deep-indigo)]/10 text-[var(--deep-indigo)] font-bold">{initialsFromLabel(displayName)}</AvatarFallback>
                            </Avatar>
                            {/* Unread pulsing indicator */}
                            {item.unreadCount > 0 && (
                              <div className="absolute -top-1 -right-1 flex h-4.5 w-4.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4.5 w-4.5 bg-orange-500 border-2 border-background flex items-center justify-center text-[9px] text-white font-bold shadow-sm">{item.unreadCount}</span>
                              </div>
                            )}
                            {/* Channel Icon Overlay */}
                            <div className={`absolute -bottom-1 -right-1 size-5 rounded-full border-2 border-background shadow-sm flex items-center justify-center ${item.channel === 'WHATSAPP' ? 'bg-emerald-500' : 'bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-500'}`}>
                                {item.channel === 'WHATSAPP' ? <MessageCircle className="size-2.5 text-white" /> : <Instagram className="size-2.5 text-white" />}
                            </div>
                          </div>
                          
                          <div className="min-w-0 flex-1 py-0.5">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className={`text-sm font-bold truncate ${active ? 'text-[var(--deep-indigo)]' : 'text-foreground/90'}`}>{displayName}</h4>
                              <span className="text-[10px] text-muted-foreground/80 font-semibold tracking-tighter shrink-0">{formatRelativeTime(item.lastEventTimestamp)}</span>
                            </div>
                            <p className={`text-xs truncate transition-colors ${item.unreadCount > 0 ? 'text-foreground font-semibold' : 'text-muted-foreground/70'}`}>
                              {getPreview(item)}
                            </p>
                            <div className="mt-2 flex items-center gap-1.5 overflow-hidden">
                              <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${automationBadgeClass(normalizeAutomationMode(item.automationMode))}`}>
                                {automationLabel(normalizeAutomationMode(item.automationMode))}
                              </span>
                              {item.identityLinked && (
                                <span className="text-[8px] px-1.5 py-0.5 rounded-full uppercase tracking-widest font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/10">Bağlı</span>
                              )}
                            </div>
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
            className={`flex flex-col h-[calc(100vh-380px)] min-h-[360px] rounded-2xl border border-border/50 bg-background/40 backdrop-blur-xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden sm:h-[calc(100vh-260px)] sm:min-h-[520px] lg:h-[750px] ${mobileView === 'CHAT' ? 'flex' : 'hidden lg:flex'}`}>
            {selectedConversation ?
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Sohbet listesine dön"
                        className="lg:hidden -ml-2 h-8 w-8 hover:bg-white/10"
                        onClick={() => setMobileView('LIST')}
                      >
                        <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                      </Button>
                    <Avatar className="size-10 border border-border/60">
                      {selectedConversation.profilePicUrl ?
                        <AvatarImage
                          src={selectedConversation.profilePicUrl}
                          alt={conversationDisplayName(selectedConversation)} /> :

                        null}
                      <AvatarFallback className="text-xs">
                        {initialsFromLabel(conversationDisplayName(selectedConversation))}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {conversationDisplayName(selectedConversation)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedConversation.channel}
                        <span className="hidden sm:inline"> • {selectedConversation.conversationKey}</span>
                      </p>
                      {(() => {
                        const username = normalizeUsername(selectedConversation.profileUsername);
                        return username ?
                          <p className="text-[10px] text-muted-foreground truncate">@{username}</p> :
                          null;
                      })()}
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] ${automationBadgeClass(selectedMode)}`}>
                          {automationLabel(selectedMode)}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] ${selectedConversation.identityLinked ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'}`
                          }>

                          {selectedConversation.identityLinked ? 'Profil bağlı' : 'Bağlı değil'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:pb-0">
                    {selectedConversation.hasHandoverRequest ?
                      <span className="shrink-0 text-[10px] px-2 py-1 rounded bg-amber-500/10 text-amber-700">Müşteri bekliyor</span> :
                      null}
                    {handoverInProgress ?
                      <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={resumeAuto} disabled={sendingResume}>
                        {sendingResume ? 'Başlatılıyor...' : "Botu Başlat"}
                      </Button> :
                      null}
                    {!handoverInProgress ?
                      <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={requestHandover} disabled={sendingHandover}>
                        {sendingHandover ? 'Alınıyor...' : 'Ben Yanıtlayacağım'}
                      </Button> :
                      null}
                  </div>
                </div>

                <div
                  ref={messagesViewportRef}
                  onScroll={(event) => {
                    const el = event.currentTarget;
                    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
                    stickToBottomRef.current = distanceToBottom < 48;
                  }}
                  className="flex-1 min-h-0 mt-4 space-y-4 overflow-y-auto rounded-2xl border border-border/40 bg-gradient-to-b from-muted/10 to-transparent p-4 scrollbar-thin lg:min-h-[400px]">

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
                                          `bg-gradient-to-br from-[var(--deep-indigo)] to-indigo-600 text-white border border-indigo-500/20 ${isSameSenderAsNext && isSameSenderAsPrev ? 'rounded-[20px] rounded-r-md' : isSameSenderAsNext ? 'rounded-[20px] rounded-br-md' : isSameSenderAsPrev ? 'rounded-[20px] rounded-tr-md' : 'rounded-[20px] rounded-tr-sm'}` : 
                                          `bg-card/40 backdrop-blur-lg border border-white/10 text-foreground ${isSameSenderAsNext && isSameSenderAsPrev ? 'rounded-[20px] rounded-l-md' : isSameSenderAsNext ? 'rounded-[20px] rounded-bl-md' : isSameSenderAsPrev ? 'rounded-[20px] rounded-tl-md' : 'rounded-[20px] rounded-tl-sm'}`
                                      }`}>
                                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
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

                <div className="sticky bottom-0 z-20 mt-4 rounded-xl border border-border/60 bg-background shadow-sm p-2 focus-within:border-[var(--deep-indigo)]/50 focus-within:ring-1 focus-within:ring-[var(--deep-indigo)]/20 transition-all">
                  <div className="flex gap-2">
                    <Textarea
                      value={replyText}
                      onChange={(event) => setReplyText(event.target.value)}
                      placeholder={canReply ? "Mesajınızı yazın..." : "Yanıt göndermek için bir görüşme seçin"}
                      disabled={!canReply}
                      rows={1}
                      className="max-h-28 min-h-10 resize-none border-0 bg-transparent px-3 text-[15px] focus-visible:ring-0 focus-visible:ring-offset-0"
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          if (canReply) void sendReply();
                        }
                      }} />

                    <Button type="button" aria-label="Mesaj gönder" onClick={sendReply} disabled={sendingReply || !replyText.trim() || !canReply} className={`rounded-lg px-4 transition-all ${replyText.trim() ? 'bg-[var(--deep-indigo)] hover:bg-[var(--deep-indigo)]/90 text-white' : 'bg-muted text-muted-foreground'}`}>
                      {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                  {!canReply && selectedConversation?.channel === 'WHATSAPP' ?
                    <p className="mt-2 text-[11px] text-muted-foreground px-3">
                      WhatsApp için manuel cevap şu an kapalı. Kanal bağlantısını kontrol edin.
                    </p> :
                    null}
                </div>
              </> :

              <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground py-20">
                <div className="size-20 rounded-full bg-gradient-to-br from-[var(--deep-indigo)]/10 to-transparent flex items-center justify-center mb-5 border border-[var(--deep-indigo)]/5">
                  <MessageCircle className="w-8 h-8 text-[var(--deep-indigo)] opacity-80" />
                </div>
                <h3 className="text-lg font-semibold text-foreground shadow-sm">Bir Sohbet Seçin</h3>
                <p className="text-sm mt-2 max-w-[250px]">Okumak veya mesaj göndermek için sol taraftan bir konuşmaya tıklayın.</p>
              </div>
            }
          </motion.div>
        </div>
      }
    </div>);

}
