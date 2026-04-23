import React, { useRef } from 'react';
import { Search, Instagram, LifeBuoy, MessageSquareDashed } from 'lucide-react';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import type { ConversationItem, ChannelFilter } from './types';

interface ConversationsListProps {
  conversations: ConversationItem[];
  filteredConversations: ConversationItem[];
  loading: boolean;
  channelView: ChannelFilter;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedConversationId: string | null;
  liveConversationMap: Record<string, boolean>;
  onSelectConversation: (id: string) => void;
  handoverTotal: number;
  
  // Utils
  conversationDisplayName: (item: ConversationItem) => string;
  buildConversationAvatarSrc: (item: ConversationItem) => string | null;
  initialsFromLabel: (label: string) => string;
  getPreview: (item: ConversationItem) => string;
  formatRelativeTime: (ts: string) => string;
  isHandoverInProgress: (mode: string) => boolean;
  normalizeAutomationMode: (mode: unknown) => string;
  WhatsAppLogo: React.FC<{ className?: string }>;
}

export function ConversationsList({
  filteredConversations,
  loading,
  channelView,
  searchQuery,
  setSearchQuery,
  selectedConversationId,
  liveConversationMap,
  onSelectConversation,
  handoverTotal,
  conversationDisplayName,
  buildConversationAvatarSrc,
  initialsFromLabel,
  getPreview,
  formatRelativeTime,
  isHandoverInProgress,
  normalizeAutomationMode,
  WhatsAppLogo
}: ConversationsListProps) {

  return (
    <div className="flex flex-col h-full bg-background/40 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden min-h-0">
      <div className="px-4 pt-4 pb-1">
        <h1 className="text-lg font-semibold tracking-tight">Konuşmalar</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2 p-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/40 bg-background/60 shadow-sm whitespace-nowrap">
          <div className="size-2 rounded-full bg-foreground/20" />
          <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">{filteredConversations.length} Sohbet</span>
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

      {loading ? (
        <div className="space-y-2 mt-2 px-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="flex p-2 gap-2 border border-transparent">
              <Skeleton className="w-12 h-12 rounded-[16px] shrink-0" />
              <div className="flex-1 space-y-2 mt-1">
                <div className="flex justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-10" />
                </div>
                <Skeleton className="h-3 w-3/4 opacity-60" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredConversations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
          <MessageSquareDashed className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-sm font-semibold text-foreground/80">Sohbet kutusu boş</p>
          <p className="text-xs opacity-80 mt-1">
            {channelView === 'ALL' ? "Henüz görüntülenecek sohbet yok." : "Bu kanal için mesaj yok."}
          </p>
        </div>
      ) : (
        <div className="flex-1 min-w-0 space-y-1.5 overflow-y-auto overflow-x-hidden pr-1 pb-1 scrollbar-thin px-2">
          <AnimatePresence>
            {filteredConversations.map((item, index) => {
              const id = `${item.channel}:${item.conversationKey}`;
              const active = id === selectedConversationId;
              const isLive = !!liveConversationMap[id];
              const displayName = conversationDisplayName(item);
              const unread = item.unreadCount > 0;

              return (
                <motion.button
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                  whileTap={{ scale: 0.98 }}
                  key={id}
                  type="button"
                  onClick={() => onSelectConversation(id)}
                  className={`w-full max-w-full min-w-0 group rounded-[20px] p-2.5 text-left transition-colors duration-200 border relative overflow-hidden ${
                    active 
                      ? 'border-[var(--deep-indigo)]/40 bg-[var(--deep-indigo)]/5 shadow-[0_4px_12px_rgba(0,0,0,0.03)]' 
                      : 'border-transparent hover:border-white/20 hover:bg-white/5'
                  } ${isLive ? 'ring-2 ring-[var(--deep-indigo)]/20 ring-offset-1 ring-offset-transparent' : ''}`}
                  >
                  <div className="flex min-w-0 gap-3 relative z-10">
                    <div className="relative shrink-0">
                      <Avatar className={`size-[50px] rounded-[18px] transition-transform duration-300 group-hover:scale-105 ${active ? 'shadow-md border border-[var(--deep-indigo)]/30' : 'border border-white/10'}`}>
                        {item.profilePicUrl ?
                          <AvatarImage src={buildConversationAvatarSrc(item) || undefined} alt={displayName} /> 
                        : null}
                        <AvatarFallback className={`font-bold text-white shadow-inner bg-gradient-to-br ${
                          index % 3 === 0 ? 'from-indigo-500 to-purple-600' : 
                          index % 3 === 1 ? 'from-violet-500 to-fuchsia-600' : 
                          'from-blue-500 to-indigo-600'
                        }`}>
                          {initialsFromLabel(displayName)}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Unread indicator */}
                      {unread && (
                        <div className="absolute -top-1 -right-1 flex h-4 min-w-4 z-20">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                          <span className="relative inline-flex min-w-4 h-4 px-1 rounded-full bg-orange-500 border-2 border-background items-center justify-center text-[9px] leading-none text-white font-black shadow-sm">
                            {item.unreadCount > 99 ? '99+' : item.unreadCount}
                          </span>
                        </div>
                      )}

                      {/* Channel Icon Overlay */}
                      <div className={`absolute -right-1 -bottom-1 z-20 size-5 rounded-full border-2 border-background shadow-sm flex items-center justify-center ${item.channel === 'WHATSAPP' ? 'bg-emerald-500' : 'bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-500'}`}>
                          {item.channel === 'WHATSAPP' ? <WhatsAppLogo className="size-2.5 text-white" /> : <Instagram className="size-2.5 text-white" />}
                      </div>
                    </div>
                    
                    <div className="w-0 min-w-0 flex-1 py-0.5 flex flex-col justify-center">
                      <div className="flex min-w-0 items-center justify-between mb-1 gap-2">
                        <div className="flex min-w-0 items-center gap-1.5 flex-1">
                          {isHandoverInProgress(normalizeAutomationMode(item.automationMode)) && (
                            <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
                              <LifeBuoy className="size-2.5" />
                            </span>
                          )}
                          <h4 className={`text-[15px] font-bold truncate ${active ? 'text-[var(--deep-indigo)]' : 'text-foreground/90'}`}>
                            {displayName}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isLive && (
                            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          )}
                          <span className={`text-[11px] font-mono font-medium tracking-tighter ${unread ? 'text-[var(--deep-indigo)] font-bold' : 'text-muted-foreground/70'}`}>
                            {formatRelativeTime(item.lastEventTimestamp)}
                          </span>
                        </div>
                      </div>
                      <p className={`block max-w-full min-w-0 overflow-hidden text-[13px] text-ellipsis whitespace-nowrap transition-colors ${unread ? 'text-foreground font-semibold' : 'text-muted-foreground/70'}`}>
                        {getPreview(item)}
                      </p>
                    </div>
                  </div>
                  {active && (
                    <motion.div 
                      layoutId="active-indicator"
                      className="absolute left-0 top-3 bottom-3 w-1 bg-[var(--deep-indigo)] rounded-r-full shadow-[0_0_12px_var(--deep-indigo)]" 
                    />
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
