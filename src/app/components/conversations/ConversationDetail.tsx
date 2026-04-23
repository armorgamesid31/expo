import React from 'react';
import { ChevronLeft, Sparkles, MessageCircle, AlertTriangle, Loader2, SendHorizontal, LifeBuoy } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';
import { Textarea } from '../ui/textarea';
import { ConversationBubble } from './ConversationBubble';
import type { ConversationItem, MessageItem } from './types';
import { motion } from 'framer-motion';

interface ConversationDetailProps {
  mobileView: 'LIST' | 'CHAT';
  setMobileView: (val: 'LIST' | 'CHAT') => void;
  selectedConversation: ConversationItem | null;
  messages: MessageItem[];
  loadingMessages: boolean;
  replyText: string;
  setReplyText: (val: string) => void;
  canReply: boolean;
  sendingReply: boolean;
  sendReply: () => Promise<void>;
  handoverInProgress: boolean;
  sendingHandover: boolean;
  sendingResume: boolean;
  requestHandover: () => void;
  resumeAuto: () => void;
  instagramWindowExpired: boolean;
  messagesViewportRef: React.RefObject<HTMLDivElement>;
  openLinkedCustomerProfile: (item: ConversationItem) => void;
  navigateBack: () => void;

  // Utils
  conversationDisplayName: (item: ConversationItem) => string;
  buildConversationAvatarSrc: (item: ConversationItem) => string | null;
  initialsFromLabel: (label: string) => string;
  isHandoverInProgress: (mode: string) => boolean;
  normalizeAutomationMode: (mode: unknown) => string;
  formatOperatorMessage: (val: string | null | undefined) => string;
  formatMessageTypeLabel: (val: string) => string;
  openMessageMeta: (msg: MessageItem) => void;
  beginLongPress: (msg: MessageItem) => void;
  clearLongPressTimer: () => void;
  stickToBottomRef: React.MutableRefObject<boolean>;
}

export function ConversationDetail({
  mobileView,
  setMobileView,
  selectedConversation,
  messages,
  loadingMessages,
  replyText,
  setReplyText,
  canReply,
  sendingReply,
  sendReply,
  handoverInProgress,
  sendingHandover,
  sendingResume,
  requestHandover,
  resumeAuto,
  instagramWindowExpired,
  messagesViewportRef,
  openLinkedCustomerProfile,
  navigateBack,
  conversationDisplayName,
  buildConversationAvatarSrc,
  initialsFromLabel,
  isHandoverInProgress: isHandoverInProgressUtil,
  normalizeAutomationMode,
  formatOperatorMessage,
  formatMessageTypeLabel,
  openMessageMeta,
  beginLongPress,
  clearLongPressTimer,
  stickToBottomRef
}: ConversationDetailProps) {

  return (
    <div className={`flex flex-col h-[100dvh] lg:h-[calc(100dvh-11.5rem)] min-h-0 rounded-2xl border border-border/40 bg-background p-2 shadow-sm overflow-hidden lg:min-h-[680px] ${mobileView === 'CHAT' ? 'flex fixed inset-0 z-50 lg:relative lg:inset-auto lg:z-auto safe-top' : 'hidden lg:flex'}`}>
      {selectedConversation ? (
        <>
          <div className="flex items-center justify-between gap-2 border-b border-border/40 px-1.5 pb-2 pt-2 lg:pt-0">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Sohbet listesine dön"
                className="lg:hidden -ml-1 h-10 w-10 hover:bg-white/10 shrink-0"
                onClick={() => {
                  setMobileView('LIST');
                  navigateBack();
                }}
              >
                <ChevronLeft className="w-6 h-6 text-foreground" />
              </Button>
              <button
                type="button"
                onClick={() => void openLinkedCustomerProfile(selectedConversation)}
                className="min-h-11 min-w-0 flex items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deep-indigo)]/40 cursor-pointer group"
                aria-label="Sohbet profilini aç"
              >
                <Avatar className="size-10 border border-white/10 group-hover:border-[var(--deep-indigo)]/30 transition-colors shadow-sm">
                  {selectedConversation.profilePicUrl ?
                    <AvatarImage src={buildConversationAvatarSrc(selectedConversation) || undefined} alt={conversationDisplayName(selectedConversation)} /> 
                  : null}
                  <AvatarFallback className="text-xs bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold">
                    {initialsFromLabel(conversationDisplayName(selectedConversation))}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-[15px] font-bold truncate leading-tight group-hover:text-[var(--deep-indigo)] transition-colors">
                    {conversationDisplayName(selectedConversation)}
                  </p>
                  <div className="flex items-center gap-1.5 min-w-0 overflow-hidden mt-0.5">
                    <span className="text-[11px] min-w-0 font-medium tracking-tight text-muted-foreground/70 truncate">
                      {selectedConversation.channel === 'INSTAGRAM' ? 'Instagram' : 'WhatsApp'}
                    </span>
                    {isHandoverInProgressUtil(normalizeAutomationMode(selectedConversation.automationMode)) && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-600 shadow-sm shadow-amber-500/5">
                        <Sparkles className="size-2 fill-current" />
                        Canlı Destek
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div
            ref={messagesViewportRef}
            onScroll={(event) => {
              const el = event.currentTarget;
              const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
              stickToBottomRef.current = distanceToBottom < 48;
            }}
            className="flex-1 min-h-0 mt-2 space-y-3 overflow-y-auto rounded-[20px] bg-gradient-to-b from-transparent to-background/5 p-2 scrollbar-thin lg:min-h-[420px]"
          >
            {loadingMessages ? (
              <div className="space-y-6 py-4 px-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                      <Skeleton className={`h-16 w-[70%] rounded-[24px] ${i % 2 === 0 ? 'bg-[var(--deep-indigo)]/5' : 'bg-muted/30'}`} />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-12">
                <MessageCircle className="w-12 h-12 mb-4 opacity-10" />
                <p className="text-sm font-medium">Henüz mesaj bulunmuyor</p>
                <p className="text-xs opacity-60 mt-1">İlk mesajı siz gönderin.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1 min-h-full pb-4 px-1">
                {messages.map((msg, index) => (
                  <ConversationBubble
                    key={msg.id || index}
                    msg={msg}
                    prevMsg={messages[index - 1] || null}
                    nextMsg={messages[index + 1] || null}
                    formatOperatorMessage={formatOperatorMessage}
                    formatMessageTypeLabel={formatMessageTypeLabel}
                    openMessageMeta={openMessageMeta}
                    beginLongPress={beginLongPress}
                    clearLongPressTimer={clearLongPressTimer}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="mt-2 space-y-2 pb-safe">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                  <div className={`size-2 rounded-full ${handoverInProgress ? 'bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {handoverInProgress ? 'Kedy AI: Pasif' : 'Kedy AI: Aktif'}
                  </span>
              </div>
              {handoverInProgress ? (
                <Button type="button" size="sm" variant="ghost" className="h-8 text-[11px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 rounded-full" onClick={resumeAuto} disabled={sendingResume}>
                  <Sparkles className="size-3.5 mr-1.5" />
                  {sendingResume ? 'Bot Açılıyor...' : "Botu Devreye Al"}
                </Button>
              ) : (
                <Button type="button" size="sm" variant="ghost" className="h-8 text-[11px] font-bold uppercase tracking-wider text-amber-600 hover:text-amber-700 hover:bg-amber-50/50 rounded-full" onClick={requestHandover} disabled={sendingHandover}>
                  <LifeBuoy className="size-3.5 mr-1.5" />
                  {sendingHandover ? 'Alınıyor...' : 'Ben Yanıtlayacağım'}
                </Button>
              )}
            </div>
            
            <motion.div layout>
              {instagramWindowExpired && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] font-medium text-amber-700 flex items-start gap-2 backdrop-blur-md mb-2 mx-1"
                >
                  <AlertTriangle className="size-4 mt-0.5 shrink-0 text-amber-600" />
                  <span>Instagram 24 saat yanıt penceresi dolmuş olabilir. Mesaj gönderimi başarısız olursa müşterinin tekrar yazması gerekir.</span>
                </motion.div>
              )}

              <div className="rounded-[24px] border border-white/10 bg-background shadow-md p-1 focus-within:border-[var(--deep-indigo)]/40 transition-all duration-300 mx-1 mb-1">
                <div className="flex gap-2 items-end">
                  <Textarea
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    placeholder={
                      instagramWindowExpired ?
                        'Instagram penceresi dolmuş olabilir. Yine de deneyebilirsiniz.' :
                        canReply ?
                          'Mesajınızı yazın...' :
                          "Yanıtlamak için önce 'Ben Yanıtlayacağım' seçeneğine dokunun"
                    }
                    disabled={!canReply}
                    rows={1}
                    className="max-h-32 min-h-[44px] py-3 resize-none border-0 bg-transparent px-3 text-[15px] focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        if (canReply) void sendReply();
                      }
                    }} 
                  />

                  <Button 
                    type="button" 
                    aria-label="Mesaj gönder" 
                    onClick={sendReply} 
                    disabled={sendingReply || !replyText.trim() || !canReply} 
                    className={`rounded-full transition-all duration-300 h-11 w-11 p-0 flex items-center justify-center shrink-0 mb-0.5 ${replyText.trim() && canReply ? 'bg-gradient-to-br from-[var(--deep-indigo)] to-indigo-600 shadow-[0_4px_12px_rgba(99,102,241,0.3)] hover:shadow-[0_4px_16px_rgba(99,102,241,0.4)] hover:scale-105 text-white' : 'bg-muted/50 text-muted-foreground'}`}
                  >
                    {sendingReply ? <Loader2 className="w-5 h-5 animate-spin" /> : <SendHorizontal className="w-5 h-5 ml-0.5" />}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground py-20 relative">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/5 to-transparent" />
          <div className="size-24 rounded-[32px] bg-gradient-to-br from-indigo-500/10 to-transparent flex items-center justify-center mb-6 border border-indigo-500/10 shadow-inner relative overflow-hidden group">
            <div className="absolute inset-0 bg-indigo-500/5 scale-0 group-hover:scale-100 transition-transform duration-700 rounded-full blur-2xl" />
            <MessageCircle className="w-10 h-10 text-indigo-500/60 relative z-10" />
          </div>
          <h3 className="text-xl font-black text-foreground/90 tracking-tight">Diyalog Seçin</h3>
          <p className="text-sm mt-2 max-w-[280px] font-medium leading-relaxed opacity-60">Mesajlaşmak ve randevuları yönetmek için sol listeden bir sohbet seçebilirsiniz.</p>
        </div>
      )}
    </div>
  );
}
