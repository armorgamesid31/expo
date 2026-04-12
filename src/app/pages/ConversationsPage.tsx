import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, MessageCircle, Search, Send, UserRound } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../lib/config';
import { useNavigate } from 'react-router-dom';

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
  return dt.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getPreview(item: ConversationItem): string {
  if (item.lastMessageText && item.lastMessageText.trim()) return item.lastMessageText.trim();
  if (item.lastMessageType === 'image') return '[Image]';
  if (item.lastMessageType === 'audio') return '[Audio]';
  if (item.lastMessageType === 'video') return '[Video]';
  if (item.lastMessageType === 'handover_request') return '[Handover Requested]';
  return `[${item.lastMessageType}]`;
}

function formatRelativeTime(value: string): string {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  const now = Date.now();
  const diffMs = now - dt.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d`;
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
  return `User ${item.conversationKey}`;
}

function initialsFromLabel(value: string): string {
  const cleaned = value.
  replace(/^@/, '').
  trim();
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
  value === 'AUTO_RESUME_PENDING')
  {
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
  if (mode === 'HUMAN_PENDING') return 'Human Pending';
  if (mode === 'HUMAN_ACTIVE') return "Human Aktif";
  if (mode === 'MANUAL_ALWAYS') return 'Manual Always';
  if (mode === 'AUTO_RESUME_PENDING') return 'Auto Resume';
  return 'Auto';
}

function isHandoverInProgress(mode: AutomationMode): boolean {
  return mode === 'HUMAN_PENDING' || mode === 'HUMAN_ACTIVE';
}

function findRelatedConversationKeys(
items: ConversationItem[],
selected: {channel: ChannelType;conversationKey: string;})
: Array<{channel: ChannelType;conversationKey: string;}> {
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

function mergeAndSortMessages(responses: Array<{items: MessageItem[];} | null | undefined>): MessageItem[] {
  const merged = new Map<string, MessageItem>();
  for (const response of responses) {
    const items = response?.items || [];
    for (const msg of items) {
      const providerId = typeof msg.providerMessageId === 'string' ? msg.providerMessageId.trim() : '';
      const fingerprint = providerId ?
      `provider:${providerId}` :
      `fallback:${msg.direction}|${msg.messageType}|${msg.eventTimestamp}|${msg.text || ''}`;
      if (!merged.has(fingerprint)) merged.set(fingerprint, msg);
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
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [sendingHandover, setSendingHandover] = useState(false);
  const [sendingResume, setSendingResume] = useState(false);
  const [actionInfo, setActionInfo] = useState<string | null>(null);
  const sseRefreshTimerRef = useRef<number | null>(null);
  const conversationsRef = useRef<ConversationItem[]>([]);
  const selectedConversationIdRef = useRef<string | null>(null);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);

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
    setError(null);
    try {
      const response = await apiFetch<{items: ConversationItem[];channelHealth?: ChannelHealthPayload;}>(
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
      setError(err?.message || "Konuşmalar yüklenemedi.");
    } finally {
      if (showLoading) setLoadingKonuşmalar(false);
    }
  }, [apiFetch, channelView]);

  const loadMessages = useCallback(async (channel: ChannelType, conversationKey: string, showLoading = true) => {
    if (showLoading) setLoadingMessages(true);
    setError(null);
    try {
      const relatedKeys = findRelatedConversationKeys(conversationsRef.current, { channel, conversationKey }).slice(0, 5);
      const responses = await Promise.all(
        relatedKeys.map((item) =>
        apiFetch<{items: MessageItem[];conversationState?: ConversationStatePayload;}>(
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
      setError(err?.message || "Konuşma mesajları yüklenemedi.");
    } finally {
      if (showLoading) setLoadingMessages(false);
    }
  }, [apiFetch]);

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
    if (!accessToken) return;

    const streamUrl =
    `${API_BASE_URL}/api/admin/conversations/stream` +
    `?authToken=${encodeURIComponent(accessToken)}` +
    `&channel=${encodeURIComponent(channelView)}`;
    const es = new EventSource(streamUrl);

    const scheduleRefresh = () => {
      if (sseRefreshTimerRef.current) return;
      sseRefreshTimerRef.current = window.setTimeout(() => {
        sseRefreshTimerRef.current = null;
        void loadKonuşmalar(false);
        const activeId = selectedConversationIdRef.current;
        if (activeId && activeId.includes(':')) {
          const [rawChannel, ...rest] = activeId.split(':');
          const rawKey = rest.join(':');
          if ((rawChannel === 'INSTAGRAM' || rawChannel === 'WHATSAPP') && rawKey) {
            void loadMessages(rawChannel as ChannelType, rawKey, false);
          }
        }
      }, 350);
    };

    es.addEventListener('conversation.update', scheduleRefresh);

    return () => {
      es.removeEventListener('conversation.update', scheduleRefresh);
      es.close();
      if (sseRefreshTimerRef.current) {
        window.clearTimeout(sseRefreshTimerRef.current);
        sseRefreshTimerRef.current = null;
      }
    };
  }, [accessToken, channelView, loadKonuşmalar, loadMessages]);

  const sendReply = async () => {
    if (!selectedConversation || !replyText.trim()) return;
    setSendingReply(true);
    setActionInfo(null);
    setError(null);
    try {
      await apiFetch(
        `/api/admin/conversations/${selectedConversation.channel}/${encodeURIComponent(selectedConversation.conversationKey)}/reply`,
        {
          method: 'POST',
          body: JSON.stringify({ text: replyText.trim() })
        }
      );
      setReplyText('');
      setActionInfo('Reply sent successfully.');
      await loadMessages(selectedConversation.channel, selectedConversation.conversationKey);
      await loadKonuşmalar();
    } catch (err: any) {
      setError(err?.message || 'Reply could not be sent.');
    } finally {
      setSendingReply(false);
    }
  };

  const requestHandover = async () => {
    if (!selectedConversation) return;
    setSendingHandover(true);
    setActionInfo(null);
    setError(null);
    try {
      const response = await apiFetch<{alreadyRequested?: boolean;}>(
        `/api/admin/conversations/${selectedConversation.channel}/${encodeURIComponent(selectedConversation.conversationKey)}/handover`,
        {
          method: 'POST',
          body: JSON.stringify({ note: 'Manual takeover requested by salon staff.' })
        }
      );
      setActionInfo(response?.alreadyRequested ? 'This conversation is already under human handover.' : 'Handover request created.');
      await loadMessages(selectedConversation.channel, selectedConversation.conversationKey);
      await loadKonuşmalar();
    } catch (err: any) {
      setError(err?.message || 'Handover request failed.');
    } finally {
      setSendingHandover(false);
    }
  };

  const resumeAuto = async () => {
    if (!selectedConversation) return;
    setSendingResume(true);
    setActionInfo(null);
    setError(null);
    try {
      await apiFetch(
        `/api/admin/conversations/${selectedConversation.channel}/${encodeURIComponent(selectedConversation.conversationKey)}/resume-auto`,
        { method: 'POST' }
      );
      setActionInfo('AI automation resumed for this conversation.');
      await loadMessages(selectedConversation.channel, selectedConversation.conversationKey);
      await loadKonuşmalar();
    } catch (err: any) {
      setError(err?.message || 'Resume action failed.');
    } finally {
      setSendingResume(false);
    }
  };

  const canReply = selectedConversation?.channel === 'INSTAGRAM';
  const selectedMode = normalizeAutomationMode(selectedConversation?.automationMode);
  const handoverInProgress = isHandoverInProgress(selectedMode);
  const unreadTotal = filteredKonuşmalar.reduce((sum, item) => sum + (item.unreadCount || 0), 0);
  const handoverTotal = filteredKonuşmalar.filter((item) =>
  isHandoverInProgress(normalizeAutomationMode(item.automationMode))
  ).length;
  const selectedChannelHealth = channelView === 'INSTAGRAM' ? channelHealth?.instagram : channelHealth?.whatsapp;
  const channelBlocked =
  channelView === 'INSTAGRAM' ?
  !(channelHealth?.instagram?.connected && channelHealth?.instagram?.bindingReady) :
  !channelHealth?.whatsapp?.connected;

  useEffect(() => {
    if (!channelBlocked) return;
    setSelectedConversationId(null);
    setMessages([]);
  }, [channelBlocked]);

  return (
    <div className="h-full pb-20 overflow-y-auto p-4">
      <div className="mb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Konuşmalar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Instagram ve WhatsApp için birleşik gelen kutusu.</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => {
              setChannelView('INSTAGRAM');
              setSelectedConversationId(null);
              setMessages([]);
              setSearchQuery('');
              setQuickFilter('all');
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            channelView === 'INSTAGRAM' ? 'bg-[var(--deep-indigo)] text-white' : 'text-muted-foreground'}`
            }>
            
            Instagram
          </button>
          {SHOW_WHATSAPP_INBOX ?
          <button
            type="button"
            onClick={() => {
              setChannelView('WHATSAPP');
              setSelectedConversationId(null);
              setMessages([]);
              setSearchQuery('');
              setQuickFilter('all');
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            channelView === 'WHATSAPP' ? 'bg-emerald-600 text-white' : 'text-muted-foreground'}`
            }>
            
              WhatsApp
            </button> :
          null}
        </div>

        <div className="inline-flex rounded-xl border border-border bg-card p-1">
          {(['all', 'unread', 'handover'] as QuickFilter[]).map((filter) =>
          <button
            key={filter}
            type="button"
            onClick={() => setQuickFilter(filter)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
            quickFilter === filter ? 'bg-muted text-foreground' : 'text-muted-foreground'}`
            }>
            
              {filter === 'all' ? 'All' : filter === 'unread' ? 'Unread' : 'Handover'}
            </button>
          )}
        </div>
      </div>

      {channelBlocked ?
      <div className="rounded-2xl border border-border bg-background p-6">
          <p className="text-base font-semibold">
            {channelView === 'INSTAGRAM' ? "Instagram bağlantısi gerekli" : "WhatsApp bağlantısi gerekli"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {selectedChannelHealth?.message || "Bu kanal için sohbetleri görmek önce bağlantı kurulmasını gerektirir."}
          </p>
          {selectedChannelHealth?.missingRequirements?.length ?
        <div className="mt-3 text-xs text-muted-foreground">
              Eksıkler: {selectedChannelHealth.missingRequirements.join(', ')}
            </div> :
        null}
          <Button
          type="button"
          className="mt-4"
          onClick={() =>
          navigate(channelView === 'INSTAGRAM' ? '/app/features/meta-direct' : '/app/features/whatsapp-settings', {
            state: { navDirection: 'forward' }
          })
          }>
          
            {channelView === 'INSTAGRAM' ? "Instagram Ayarları" : "WhatsApp Ayarları"}
          </Button>
        </div> :

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px,1fr]">
          <div className="rounded-2xl border border-border bg-background p-3 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-border/70 bg-muted/30 px-2 py-2">
                <p className="text-[10px] uppercase text-muted-foreground">Threads</p>
                <p className="text-base font-semibold leading-tight">{filteredKonuşmalar.length}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/30 px-2 py-2">
                <p className="text-[10px] uppercase text-muted-foreground">Unread</p>
                <p className="text-base font-semibold leading-tight">{unreadTotal}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/30 px-2 py-2">
                <p className="text-[10px] uppercase text-muted-foreground">Handover</p>
                <p className="text-base font-semibold leading-tight">{handoverTotal}</p>
              </div>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Ad, kullanıcı adı, mesaj ara"
              className="pl-9" />
            
            </div>

            {loadingKonuşmalar ?
          <div className="grid place-items-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div> :
          filteredKonuşmalar.length === 0 ?
          <p className="py-8 text-center text-xs text-muted-foreground">
                {selectedChannelHealth ? "Bağlı kanalda henuz konuşma yok." : "Bu filtreye uygun konuşma yok."}
              </p> :

          <div className="max-h-[66vh] space-y-2 overflow-y-auto pr-1">
                {filteredKonuşmalar.map((item) => {
              const id = `${item.channel}:${item.conversationKey}`;
              const active = id === selectedConversationId;
              const displayName = conversationDisplayName(item);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedConversationId(id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                  active ? 'border-[var(--deep-indigo)]/50 bg-[var(--deep-indigo)]/8' : 'border-border/70 hover:bg-muted/40'}`
                  }>
                  
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex items-center gap-2">
                          <Avatar className="size-9 border border-border/60">
                            {item.profilePicUrl ? <AvatarImage src={item.profilePicUrl} alt={displayName} /> : null}
                            <AvatarFallback className="text-[10px]">{initialsFromLabel(displayName)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{displayName}</p>
                            <p className="truncate text-[11px] text-muted-foreground">{item.profileUsername ? `@${normalizeUsername(item.profileUsername)}` : item.conversationKey}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-muted-foreground">{formatRelativeTime(item.lastEventTimestamp)}</p>
                          {item.unreadCount > 0 ?
                      <span className="mt-1 inline-flex rounded-full bg-[var(--rose-gold)]/12 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--rose-gold)]">
                              {item.unreadCount}
                            </span> :
                      null}
                        </div>
                      </div>

                      <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">{getPreview(item)}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] ${badgeClass(item.channel)}`}>{item.channel}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] ${automationBadgeClass(normalizeAutomationMode(item.automationMode))}`}>
                          {automationLabel(normalizeAutomationMode(item.automationMode))}
                        </span>
                        <span
                      className={`rounded px-1.5 py-0.5 text-[10px] ${
                      item.identityLinked ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'}`
                      }>
                      
                          {item.identityLinked ? 'Linked' : 'Unlinked'}
                        </span>
                      </div>
                    </button>);

            })}
              </div>
          }
          </div>

          <div className="rounded-2xl border border-border bg-background p-3 space-y-3">
            {selectedConversation ?
          <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-3">
                  <div className="min-w-0 flex items-center gap-3">
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
                        {selectedConversation.channel} • {selectedConversation.conversationKey}
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
                      className={`rounded px-1.5 py-0.5 text-[10px] ${
                      selectedConversation.identityLinked ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'}`
                      }>
                      
                          {selectedConversation.identityLinked ? 'Linked profile' : 'Not linked'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {handoverInProgress ?
                <Button type="button" size="sm" variant="outline" onClick={resumeAuto} disabled={sendingResume}>
                        {sendingResume ? 'Resuming...' : 'Resume AI'}
                      </Button> :
                null}
                    <Button type="button" size="sm" variant="outline" onClick={requestHandover} disabled={sendingHandover || handoverInProgress}>
                      {sendingHandover ? 'Requesting...' : handoverInProgress ? "Handover Aktif" : 'Request Handover'}
                    </Button>
                  </div>
                </div>

                <div
              ref={messagesViewportRef}
              onScroll={(event) => {
                const el = event.currentTarget;
                const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
                stickToBottomRef.current = distanceToBottom < 48;
              }}
              className="max-h-[56vh] space-y-2 overflow-y-auto rounded-xl border border-border/70 bg-muted/20 p-3">
              
                  {loadingMessages ?
              <div className="py-6 grid place-items-center text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div> :
              messages.length === 0 ?
              <p className="text-xs text-muted-foreground">Bu konuşmada mesaj yok.</p> :

              messages.map((msg) => {
                const isOutbound = msg.direction === 'outbound';
                const isSystem = msg.direction === 'system';
                const senderLabel = isSystem ?
                'System' :
                isOutbound ?
                msg.outboundSourceLabel || 'Salon' :
                "Müşteri";
                return (
                  <div
                    key={msg.id}
                    className={`max-w-[90%] rounded-lg border px-3 py-2 text-sm ${
                    isSystem ?
                    'bg-amber-50 border-amber-200 text-amber-900 mx-auto' :
                    isOutbound ?
                    'bg-[var(--deep-indigo)]/8 border-[var(--deep-indigo)]/20 ml-auto' :
                    'bg-background border-border'}`
                    }>
                    
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                            {isSystem ? <AlertTriangle className="w-3 h-3" /> : isOutbound ? <Send className="w-3 h-3" /> : <UserRound className="w-3 h-3" />}
                            <span>{senderLabel}</span>
                            <span>•</span>
                            <span>{formatTs(msg.eventTimestamp)}</span>
                          </div>
                          <p className="whitespace-pre-wrap break-words">{msg.text || `[${msg.messageType}]`}</p>
                        </div>);

              })
              }
                </div>

                <div className="rounded-xl border border-border/70 bg-background p-2">
                  <div className="flex gap-2">
                    <Input
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  placeholder={canReply ? "Manuel yanıt yaz" : "Manuel yanıt yalnızca Instagram için kullanılabilir"}
                  disabled={!canReply}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      if (canReply) void sendReply();
                    }
                  }} />
                
                    <Button type="button" onClick={sendReply} disabled={sendingReply || !replyText.trim() || !canReply}>
                      {sendingReply ? "Gönderiliyor..." : "Gönder"}
                    </Button>
                  </div>
                  {!canReply ?
              <p className="mt-2 text-[11px] text-muted-foreground">
                      WhatsApp için manuel cevap su an kapalı. Handover ile AI akışını kontrol edebilirsin.
                    </p> :
              null}
                </div>
              </> :

          <div className="py-12 text-center text-muted-foreground">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-60" />
                <p className="text-sm">Mesajları görmek için bir konuşma seçin.</p>
              </div>
          }

            {actionInfo ?
          <div className="rounded-lg border border-green-200 bg-green-50 text-green-800 px-3 py-2 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{actionInfo}</span>
              </div> :
          null}

            {error ?
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-xs">{error}</div> :
          null}
          </div>
        </div>
      }
    </div>);

}