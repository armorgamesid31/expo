import React from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { tr } from 'date-fns/locale/tr';
import { AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import type { MessageItem } from './types';

interface ConversationBubbleProps {
  msg: MessageItem;
  prevMsg: MessageItem | null;
  nextMsg: MessageItem | null;
  formatOperatorMessage: (val: string | null | undefined) => string;
  formatMessageTypeLabel: (val: string) => string;
  openMessageMeta: (msg: MessageItem) => void;
  beginLongPress: (msg: MessageItem) => void;
  clearLongPressTimer: () => void;
}

export function ConversationBubble({
  msg,
  prevMsg,
  nextMsg,
  formatOperatorMessage,
  formatMessageTypeLabel,
  openMessageMeta,
  beginLongPress,
  clearLongPressTimer
}: ConversationBubbleProps) {
  const direction = msg.direction?.toLowerCase();
  const isOutbound = direction === 'outbound' || direction === 'outgoing' || !!msg.outboundSource;
  const isSystem = direction === 'system';
  
  const isSameSenderAsPrev = !isSystem && prevMsg?.direction === msg.direction;
  const isSameSenderAsNext = !isSystem && nextMsg?.direction === msg.direction;

  const dt = new Date(msg.eventTimestamp);
  const prevDt = prevMsg ? new Date(prevMsg.eventTimestamp) : null;
  const showDateHeader = !prevDt || (!isToday(dt) && format(dt, 'yyyy-MM-dd') !== format(prevDt, 'yyyy-MM-dd'));

  const senderLabel = isSystem ? 'Sistem' : isOutbound ? (msg.outboundSourceLabel || 'Siz') : "Müşteri";
  const isAIAgent = msg.outboundSource === 'AI_AGENT';

  return (
    <React.Fragment>
      {showDateHeader && (
        <div className="flex justify-center my-8 pointer-events-none">
          <span className="px-4 py-1.5 rounded-full bg-background/60 backdrop-blur-xl border border-white/20 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground shadow-lg glass-panel">
            {isToday(dt) ? 'Bugün' : isYesterday(dt) ? 'Dün' : format(dt, 'd MMMM yyyy', { locale: tr })}
          </span>
        </div>
      )}
      
      {isSystem ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-[70%] mx-auto my-4 text-center"
        >
          <div className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700/80 text-[11px] font-medium leading-relaxed backdrop-blur-md shadow-sm">
            <AlertTriangle className="size-3 inline mr-1.5 mb-0.5 opacity-60" />
            {msg.text}
          </div>
        </motion.div>
      ) : (
        <motion.div 
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} ${isSameSenderAsPrev ? 'mt-0.5' : 'mt-4'}`}
        >
          <div className={`flex flex-col max-w-[85%] lg:max-w-[75%] ${isOutbound ? 'items-end' : 'items-start'}`}>
            {!isSameSenderAsPrev && (
              <span className={`text-[10px] font-bold mb-1 opacity-50 px-3 uppercase tracking-widest flex items-center gap-1 ${isOutbound ? 'text-right' : 'text-left'}`}>
                {isAIAgent && <Sparkles className="size-2.5 text-indigo-500" />}
                {senderLabel}
              </span>
            )}
            
            <div 
              className={`group relative px-4 py-2.5 transition-all duration-300 ${
                isOutbound ? 
                  isAIAgent ? 
                    // Liquid Glass for AI bot
                    `bg-indigo-500/15 backdrop-blur-xl border border-indigo-500/30 text-foreground shadow-[0_4px_24px_rgba(99,102,241,0.15)] ${isSameSenderAsNext && isSameSenderAsPrev ? 'rounded-[20px]' : isSameSenderAsNext ? 'rounded-t-[20px] rounded-bl-[20px] rounded-br-[8px]' : isSameSenderAsPrev ? 'rounded-b-[20px] rounded-tl-[20px] rounded-tr-[8px]' : 'rounded-[20px] rounded-tr-[4px]'}` 
                  : 
                    // Brand Accent for Human
                    `bg-gradient-to-br from-[var(--deep-indigo)] to-indigo-600 text-white shadow-md ${isSameSenderAsNext && isSameSenderAsPrev ? 'rounded-[20px]' : isSameSenderAsNext ? 'rounded-t-[20px] rounded-bl-[20px] rounded-br-[8px]' : isSameSenderAsPrev ? 'rounded-b-[20px] rounded-tl-[20px] rounded-tr-[8px]' : 'rounded-[20px] rounded-tr-[4px]'}` 
                : 
                  // Customer Bubble
                  `bg-card/60 backdrop-blur-xl border border-white/10 text-foreground shadow-sm ${isSameSenderAsNext && isSameSenderAsPrev ? 'rounded-[20px]' : isSameSenderAsNext ? 'rounded-t-[20px] rounded-br-[20px] rounded-bl-[8px]' : isSameSenderAsPrev ? 'rounded-b-[20px] rounded-tr-[20px] rounded-tl-[8px]' : 'rounded-[20px] rounded-tl-[4px]'}`
              }`}
              onContextMenu={(event) => {
                event.preventDefault();
                openMessageMeta(msg);
              }}
              onTouchStart={() => beginLongPress(msg)}
              onTouchEnd={clearLongPressTimer}
              onTouchCancel={clearLongPressTimer}
              onTouchMove={clearLongPressTimer}
              title="Mesaj detayı için sağ tık / uzun basın"
            >
              {/* Optional: Glossy reflection for AI */}
              {isAIAgent && (
                <div className="absolute inset-0 rounded-inherit border border-white/20 pointer-events-none opacity-50 mix-blend-overlay" />
              )}
              
              <p className={`text-[14.5px] leading-[1.4] whitespace-pre-wrap break-words ${isOutbound && !isAIAgent ? 'text-white/95' : 'text-foreground/90'}`}>
                {formatOperatorMessage(msg.text) || formatMessageTypeLabel(msg.messageType)}
              </p>
              
              <div className={`text-[9px] mt-1.5 font-mono font-medium opacity-60 flex items-center gap-1.5 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                {format(dt, 'HH:mm')}
                {isOutbound && msg.status === 'READ' && <CheckCircle2 className="size-3 text-sky-400" />}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </React.Fragment>
  );
}
