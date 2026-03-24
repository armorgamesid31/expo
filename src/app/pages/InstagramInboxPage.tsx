import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, MessageCircle, Send, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../context/AuthContext';

interface ConversationItem {
  conversationKey: string;
  customerName: string | null;
  lastMessageType: string;
  lastMessageText: string | null;
  lastEventTimestamp: string;
  unreadCount: number;
  messageCount: number;
  hasHandoverRequest: boolean;
}

interface MessageItem {
  id: number;
  providerMessageId: string;
  messageType: string;
  text: string | null;
  status: string;
  direction: 'inbound' | 'outbound' | 'system';
  eventTimestamp: string;
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

export function InstagramInboxPage() {
  const navigate = useNavigate();
  const { apiFetch } = useAuth();

  const [loadingConversations, setLoadingConversations] = useState(true);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [sendingHandover, setSendingHandover] = useState(false);
  const [actionInfo, setActionInfo] = useState<string | null>(null);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.conversationKey === selectedKey) || null,
    [conversations, selectedKey],
  );

  const loadConversations = async () => {
    setLoadingConversations(true);
    setError(null);
    try {
      const response = await apiFetch<{ items: ConversationItem[] }>('/api/admin/instagram-inbox/conversations?limit=40');
      const next = response?.items || [];
      setConversations(next);
      if (!selectedKey && next.length > 0) {
        setSelectedKey(next[0].conversationKey);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load conversations.');
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadMessages = async (conversationKey: string) => {
    setLoadingMessages(true);
    setError(null);
    try {
      const response = await apiFetch<{ items: MessageItem[] }>(
        `/api/admin/instagram-inbox/conversations/${encodeURIComponent(conversationKey)}/messages?limit=120`,
      );
      setMessages(response?.items || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load conversation messages.');
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    void loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedKey) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  const sendReply = async () => {
    if (!selectedKey || !replyText.trim()) {
      return;
    }

    setSendingReply(true);
    setActionInfo(null);
    setError(null);
    try {
      await apiFetch(`/api/admin/instagram-inbox/conversations/${encodeURIComponent(selectedKey)}/reply`, {
        method: 'POST',
        body: JSON.stringify({ text: replyText.trim() }),
      });
      setReplyText('');
      setActionInfo('Reply sent successfully.');
      await loadMessages(selectedKey);
      await loadConversations();
    } catch (err: any) {
      setError(err?.message || 'Reply could not be sent.');
    } finally {
      setSendingReply(false);
    }
  };

  const requestHandover = async () => {
    if (!selectedKey) return;

    setSendingHandover(true);
    setActionInfo(null);
    setError(null);
    try {
      await apiFetch(`/api/admin/instagram-inbox/conversations/${encodeURIComponent(selectedKey)}/handover`, {
        method: 'POST',
        body: JSON.stringify({ note: 'Manual takeover requested by salon staff.' }),
      });
      setActionInfo('Handover request created.');
      await loadMessages(selectedKey);
      await loadConversations();
    } catch (err: any) {
      setError(err?.message || 'Handover request failed.');
    } finally {
      setSendingHandover(false);
    }
  };

  return (
    <div className="h-full pb-20 overflow-y-auto">
      <div className="sticky top-0 bg-[var(--luxury-bg)] z-10 border-b border-border p-4">
        <button
          type="button"
          onClick={() => navigate('/app/features', { state: { navDirection: 'back' } })}
          className="flex items-center gap-2 text-muted-foreground mb-3 active:opacity-70"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Instagram Conversation Center</h1>
            <p className="text-xs text-muted-foreground mt-1">
              View DMs, send manual replies, and hand over AI conversations to staff.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Automated replies may be used. Human handover is available for all conversations.
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => void loadConversations()} disabled={loadingConversations}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-4">
        <Card className="border-border/50">
          <CardContent className="p-3 space-y-2">
            <p className="text-sm font-semibold">Conversations</p>
            {loadingConversations ? (
              <div className="py-6 grid place-items-center text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3">No Instagram conversations yet.</p>
            ) : (
              <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                {conversations.map((item) => {
                  const active = item.conversationKey === selectedKey;
                  return (
                    <button
                      key={item.conversationKey}
                      type="button"
                      onClick={() => setSelectedKey(item.conversationKey)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        active ? 'border-[var(--deep-indigo)] bg-[var(--deep-indigo)]/5' : 'border-border hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{item.customerName || `User ${item.conversationKey}`}</p>
                        {item.unreadCount > 0 ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--rose-gold)]/10 text-[var(--rose-gold)]">
                            {item.unreadCount}
                          </span>
                        ) : null}
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
                  <div>
                    <p className="text-sm font-semibold">
                      {selectedConversation.customerName || `User ${selectedConversation.conversationKey}`}
                    </p>
                    <p className="text-xs text-muted-foreground">Key: {selectedConversation.conversationKey}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedConversation.hasHandoverRequest ? (
                      <span className="text-[10px] px-2 py-1 rounded bg-amber-500/10 text-amber-700">Handover requested</span>
                    ) : null}
                    <Button type="button" size="sm" variant="outline" onClick={requestHandover} disabled={sendingHandover}>
                      {sendingHandover ? 'Requesting...' : 'Request Handover'}
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
                            <span>{isSystem ? 'System' : isOutbound ? 'Salon' : 'Customer'}</span>
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
                    placeholder="Write manual reply to customer"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void sendReply();
                      }
                    }}
                  />
                  <Button type="button" onClick={sendReply} disabled={sendingReply || !replyText.trim()}>
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
              <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-xs">
                {error}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
