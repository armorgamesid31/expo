import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, MessageCircle, Send, UserRound } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../lib/config';

type ChannelType = 'INSTAGRAM' | 'WHATSAPP';
type AutomationMode = 'AUTO' | 'HUMAN_PENDING' | 'HUMAN_ACTIVE' | 'MANUAL_ALWAYS' | 'AUTO_RESUME_PENDING';
const SHOW_WHATSAPP_INBOX = false;

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

function formatTs(value: string): string {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
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
  const cleaned = value
    .replace(/^@/, '')
    .trim();
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
    value === 'AUTO_RESUME_PENDING'
  ) {
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
  if (mode === 'HUMAN_ACTIVE') return 'Human Active';
  if (mode === 'MANUAL_ALWAYS') return 'Manual Always';
  if (mode === 'AUTO_RESUME_PENDING') return 'Auto Resume';
  return 'Auto';
}

function isHandoverInProgress(mode: AutomationMode): boolean {
  return mode === 'HUMAN_PENDING' || mode === 'HUMAN_ACTIVE';
}

function findRelatedConversationKeys(
  items: ConversationItem[],
  selected: { channel: ChannelType; conversationKey: string },
): Array<{ channel: ChannelType; conversationKey: string }> {
  const selectedItem = items.find(
    (item) => item.channel === selected.channel && item.conversationKey === selected.conversationKey,
  );
  if (!selectedItem) return [selected];

  if (selected.channel !== 'INSTAGRAM') return [selected];

  const selectedUsername = normalizeUsername(selectedItem.profileUsername);
  const selectedName = normalizeName(selectedItem.customerName);
  const selectedLinkedId =
    typeof selectedItem.linkedCustomerId === 'number' && selectedItem.linkedCustomerId > 0
      ? selectedItem.linkedCustomerId
      : null;

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
      related
        .sort((a, b) => {
          if (a.conversationKey === selected.conversationKey) return -1;
          if (b.conversationKey === selected.conversationKey) return 1;
          return (b.messageCount || 0) - (a.messageCount || 0);
        })
        .map((item) => [`${item.channel}:${item.conversationKey}`, { channel: item.channel, conversationKey: item.conversationKey }]),
    ).values(),
  );
}

function mergeAndSortMessages(responses: Array<{ items: MessageItem[] } | null | undefined>): MessageItem[] {
  const merged = new Map<string, MessageItem>();
  for (const response of responses) {
    const items = response?.items || [];
    for (const msg of items) {
      const providerId = typeof msg.providerMessageId === 'string' ? msg.providerMessageId.trim() : '';
      const fingerprint = providerId
        ? `provider:${providerId}`
        : `fallback:${msg.direction}|${msg.messageType}|${msg.eventTimestamp}|${msg.text || ''}`;
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
  const [channelView, setChannelView] = useState<ChannelType>('INSTAGRAM');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
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

  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) return null;
    return conversations.find((item) => `${item.channel}:${item.conversationKey}` === selectedConversationId) || null;
  }, [conversations, selectedConversationId]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  const loadConversations = useCallback(async (showLoading = true) => {
    if (showLoading) setLoadingConversations(true);
    setError(null);
    try {
      const response = await apiFetch<{ items: ConversationItem[] }>(
        `/api/admin/conversations?limit=60&channel=${channelView}`,
      );
      const next = response?.items || [];
      setConversations(next);
      conversationsRef.current = next;
      if (!selectedConversationIdRef.current && next.length > 0) {
        const nextId = `${next[0].channel}:${next[0].conversationKey}`;
        selectedConversationIdRef.current = nextId;
        setSelectedConversationId(nextId);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load conversations.');
    } finally {
      if (showLoading) setLoadingConversations(false);
    }
  }, [apiFetch, channelView]);

  const loadMessages = useCallback(async (channel: ChannelType, conversationKey: string, showLoading = true) => {
    if (showLoading) setLoadingMessages(true);
    setError(null);
    try {
      const relatedKeys = findRelatedConversationKeys(conversationsRef.current, { channel, conversationKey }).slice(0, 5);
      const responses = await Promise.all(
        relatedKeys.map((item) =>
          apiFetch<{ items: MessageItem[]; conversationState?: ConversationStatePayload }>(
            `/api/admin/conversations/${item.channel}/${encodeURIComponent(item.conversationKey)}/messages?limit=120`,
          ),
        ),
      );
      const response = responses[0];
      setMessages(mergeAndSortMessages(responses));
      if (response?.conversationState) {
        const patch = response.conversationState;
        setConversations((prev) =>
          prev.map((item) =>
            item.channel === channel && item.conversationKey === conversationKey
              ? {
                  ...item,
                  ...patch,
                  automationMode: normalizeAutomationMode(patch.automationMode || item.automationMode),
                }
              : item,
          ),
        );
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load conversation messages.');
    } finally {
      if (showLoading) setLoadingMessages(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedConversationId || !selectedConversationId.includes(':')) {
      setMessages([]);
      return;
    }
    const [rawChannel, ...rest] = selectedConversationId.split(':');
    const rawKey = rest.join(':');
    if ((rawChannel !== 'INSTAGRAM' && rawChannel !== 'WHATSAPP') || !rawKey) {
      setMessages([]);
      return;
    }
    void loadMessages(rawChannel as ChannelType, rawKey);
  }, [loadMessages, selectedConversationId]);

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
        void loadConversations(false);
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
  }, [accessToken, channelView, loadConversations, loadMessages]);

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
          body: JSON.stringify({ text: replyText.trim() }),
        },
      );
      setReplyText('');
      setActionInfo('Reply sent successfully.');
      await loadMessages(selectedConversation.channel, selectedConversation.conversationKey);
      await loadConversations();
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
      const response = await apiFetch<{ alreadyRequested?: boolean }>(
        `/api/admin/conversations/${selectedConversation.channel}/${encodeURIComponent(selectedConversation.conversationKey)}/handover`,
        {
          method: 'POST',
          body: JSON.stringify({ note: 'Manual takeover requested by salon staff.' }),
        },
      );
      setActionInfo(response?.alreadyRequested ? 'This conversation is already under human handover.' : 'Handover request created.');
      await loadMessages(selectedConversation.channel, selectedConversation.conversationKey);
      await loadConversations();
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
        { method: 'POST' },
      );
      setActionInfo('AI automation resumed for this conversation.');
      await loadMessages(selectedConversation.channel, selectedConversation.conversationKey);
      await loadConversations();
    } catch (err: any) {
      setError(err?.message || 'Resume action failed.');
    } finally {
      setSendingResume(false);
    }
  };

  const canReply = selectedConversation?.channel === 'INSTAGRAM';
  const selectedMode = normalizeAutomationMode(selectedConversation?.automationMode);
  const handoverInProgress = isHandoverInProgress(selectedMode);

  return (
    <div className="h-full pb-20 overflow-y-auto p-4">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-semibold">Conversations</h1>
          <p className="text-xs text-muted-foreground mt-1">Channel-based inbox for Instagram and WhatsApp.</p>
          <p className="text-xs text-muted-foreground mt-1">For Meta App Review demo, use the dedicated Instagram Inbox screen.</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => void loadConversations()} disabled={loadingConversations}>
          Refresh
        </Button>
      </div>

      <div className="inline-flex rounded-lg border border-border bg-card p-1 mb-4">
        <button
          type="button"
          onClick={() => {
            setChannelView('INSTAGRAM');
            setSelectedConversationId(null);
            setMessages([]);
          }}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${
            channelView === 'INSTAGRAM' ? 'bg-[var(--rose-gold)] text-white' : 'text-muted-foreground'
          }`}
        >
          Instagram Inbox
        </button>
        {SHOW_WHATSAPP_INBOX ? (
          <button
            type="button"
            onClick={() => {
              setChannelView('WHATSAPP');
              setSelectedConversationId(null);
              setMessages([]);
            }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              channelView === 'WHATSAPP' ? 'bg-[var(--rose-gold)] text-white' : 'text-muted-foreground'
            }`}
          >
            WhatsApp Inbox
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-4">
        <Card className="border-border/50">
          <CardContent className="p-3 space-y-2">
              <p className="text-sm font-semibold">{channelView === 'INSTAGRAM' ? 'Instagram Conversations' : 'WhatsApp Conversations'}</p>
            {loadingConversations ? (
              <div className="py-6 grid place-items-center text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3">No conversations yet.</p>
            ) : (
              <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                {conversations.map((item) => {
                  const id = `${item.channel}:${item.conversationKey}`;
                  const active = id === selectedConversationId;
                  const displayName = conversationDisplayName(item);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedConversationId(id)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        active ? 'border-[var(--deep-indigo)] bg-[var(--deep-indigo)]/5' : 'border-border hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="size-8 border border-border/60">
                            {item.profilePicUrl ? <AvatarImage src={item.profilePicUrl} alt={displayName} /> : null}
                            <AvatarFallback className="text-[10px]">{initialsFromLabel(displayName)}</AvatarFallback>
                          </Avatar>
                          <p className="text-sm font-medium truncate">{displayName}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${badgeClass(item.channel)}`}>{item.channel}</span>
                          {item.unreadCount > 0 ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--rose-gold)]/10 text-[var(--rose-gold)]">
                              {item.unreadCount}
                            </span>
                          ) : null}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${automationBadgeClass(normalizeAutomationMode(item.automationMode))}`}>
                            {automationLabel(normalizeAutomationMode(item.automationMode))}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              item.identityLinked ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'
                            }`}
                          >
                            {item.identityLinked ? 'Linked' : 'Unlinked'}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{getPreview(item)}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{formatTs(item.lastEventTimestamp)}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-3 space-y-3">
            {selectedConversation ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="size-10 border border-border/60">
                      {selectedConversation.profilePicUrl ? (
                        <AvatarImage
                          src={selectedConversation.profilePicUrl}
                          alt={conversationDisplayName(selectedConversation)}
                        />
                      ) : null}
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
                        return username ? (
                          <p className="text-[10px] text-muted-foreground truncate">@{username}</p>
                        ) : null;
                      })()}
                      <div className="mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${automationBadgeClass(selectedMode)}`}>
                          {automationLabel(selectedMode)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {handoverInProgress ? (
                      <Button type="button" size="sm" variant="outline" onClick={resumeAuto} disabled={sendingResume}>
                        {sendingResume ? 'Resuming...' : 'Resume AI'}
                      </Button>
                    ) : null}
                    <Button type="button" size="sm" variant="outline" onClick={requestHandover} disabled={sendingHandover || handoverInProgress}>
                      {sendingHandover ? 'Requesting...' : handoverInProgress ? 'Handover Active' : 'Request Handover'}
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/20 p-3 max-h-[52vh] overflow-y-auto space-y-2">
                  {loadingMessages ? (
                    <div className="py-6 grid place-items-center text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No messages in this conversation.</p>
                  ) : (
                    messages.map((msg) => {
                      const isOutbound = msg.direction === 'outbound';
                      const isSystem = msg.direction === 'system';
                      const senderLabel = isSystem
                        ? 'System'
                        : isOutbound
                          ? msg.outboundSourceLabel || 'Salon'
                          : 'Customer';
                      return (
                        <div
                          key={msg.id}
                          className={`max-w-[90%] rounded-lg border px-3 py-2 text-sm ${
                            isSystem
                              ? 'bg-amber-50 border-amber-200 text-amber-900 mx-auto'
                              : isOutbound
                                ? 'bg-[var(--deep-indigo)]/8 border-[var(--deep-indigo)]/20 ml-auto'
                                : 'bg-background border-border'
                          }`}
                        >
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                            {isSystem ? <AlertTriangle className="w-3 h-3" /> : isOutbound ? <Send className="w-3 h-3" /> : <UserRound className="w-3 h-3" />}
                            <span>{senderLabel}</span>
                            <span>•</span>
                            <span>{formatTs(msg.eventTimestamp)}</span>
                          </div>
                          <p className="whitespace-pre-wrap break-words">{msg.text || `[${msg.messageType}]`}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    placeholder={canReply ? 'Write manual reply to customer' : 'Manual replies are only enabled for Instagram right now'}
                    disabled={!canReply}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        if (canReply) void sendReply();
                      }
                    }}
                  />
                  <Button type="button" onClick={sendReply} disabled={sendingReply || !replyText.trim() || !canReply}>
                    {sendingReply ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-60" />
                <p className="text-sm">Select a conversation to view messages.</p>
              </div>
            )}

            {actionInfo ? (
              <div className="rounded-lg border border-green-200 bg-green-50 text-green-800 px-3 py-2 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{actionInfo}</span>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-xs">{error}</div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
