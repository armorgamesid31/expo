import { format } from 'date-fns';
import { motion, useAnimation } from 'motion/react';
import { User, Clock, ChevronRight, Zap } from 'lucide-react';
import { useNavigator } from '../../context/NavigatorContext';
import { useEffect, useRef, useState } from 'react';

export type UIAppointmentStatus = 'BOOKED' | 'CONFIRMED' | 'UPDATED' | 'NO_SHOW' | 'CANCELLED' | 'COMPLETED' | 'MIXED';

interface AppointmentCardProps {
  customerName: string;
  customerPhone: string;
  startTime: string;
  endTime: string;
  serviceNames: string[];
  totalPrice: number;
  status: UIAppointmentStatus;
  onClick?: () => void;
  onLongPress?: () => void;
  viewMode: 'list' | 'calendar';
  style?: React.CSSProperties;
}

export function AppointmentCard({
  customerName,
  customerPhone,
  startTime,
  endTime,
  serviceNames,
  totalPrice,
  status,
  onClick,
  onLongPress,
  viewMode,
  style
}: AppointmentCardProps) {
  const { isBackAction } = useNavigator();
  const controls = useAnimation();
  const [isPressing, setIsPressing] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const startStr = format(new Date(startTime), 'HH:mm');
  const endStr = format(new Date(endTime), 'HH:mm');

  const statusColors: Record<UIAppointmentStatus, { 
    bg: string; 
    text: string; 
    border: string; 
    accent: string;
    gradient: string;
  }> = {
    BOOKED: { 
      bg: 'bg-blue-50/80 dark:bg-blue-900/30', 
      text: 'text-blue-700 dark:text-blue-200', 
      border: 'border-blue-400/40', 
      accent: 'bg-blue-500',
      gradient: 'from-blue-500/10 to-transparent'
    },
    CONFIRMED: { 
      bg: 'bg-emerald-50/80 dark:bg-emerald-900/30', 
      text: 'text-emerald-700 dark:text-emerald-200', 
      border: 'border-emerald-400/40', 
      accent: 'bg-emerald-500',
      gradient: 'from-emerald-500/10 to-transparent'
    },
    UPDATED: { 
      bg: 'bg-amber-50/80 dark:bg-amber-900/30', 
      text: 'text-amber-700 dark:text-amber-200', 
      border: 'border-amber-400/40', 
      accent: 'bg-amber-500',
      gradient: 'from-amber-500/10 to-transparent'
    },
    NO_SHOW: { 
      bg: 'bg-rose-50/80 dark:bg-rose-900/30', 
      text: 'text-rose-700 dark:text-rose-200', 
      border: 'border-rose-400/40', 
      accent: 'bg-rose-500',
      gradient: 'from-rose-500/10 to-transparent'
    },
    CANCELLED: { 
      bg: 'bg-slate-50/80 dark:bg-slate-800/30', 
      text: 'text-slate-600 dark:text-slate-300', 
      border: 'border-slate-400/40', 
      accent: 'bg-slate-400',
      gradient: 'from-slate-400/10 to-transparent'
    },
    COMPLETED: { 
      bg: 'bg-indigo-50/80 dark:bg-indigo-900/30', 
      text: 'text-indigo-700 dark:text-indigo-200', 
      border: 'border-indigo-400/40', 
      accent: 'bg-indigo-500',
      gradient: 'from-indigo-500/10 to-transparent'
    },
    MIXED: { 
      bg: 'bg-violet-50/80 dark:bg-violet-900/30', 
      text: 'text-violet-700 dark:text-violet-200', 
      border: 'border-violet-400/40', 
      accent: 'bg-violet-500',
      gradient: 'from-violet-500/10 to-transparent'
    },
  };

  const statusLabels: Record<UIAppointmentStatus, string> = {
    BOOKED: 'Yeni',
    CONFIRMED: 'Onaylı',
    UPDATED: 'Güncel',
    NO_SHOW: 'Gelmedi',
    CANCELLED: 'İptal',
    COMPLETED: 'Bitti',
    MIXED: 'Karma',
  };

  const startPress = () => {
    setIsPressing(true);
    pressTimer.current = setTimeout(() => {
      if (onLongPress) {
        onLongPress();
        controls.start({ scale: 1.02, transition: { duration: 0.2 } });
      }
    }, 600);
  };

  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    setIsPressing(false);
    controls.start({ scale: 1, transition: { duration: 0.2 } });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onLongPress) onLongPress();
  };

  const initialProps = isBackAction ? false : { opacity: 0, y: 10 };

  if (viewMode === 'calendar') {
    const config = statusColors[status];
    return (
      <motion.div
        layout
        initial={initialProps}
        animate={controls}
        whileTap={{ scale: 0.98 }}
        style={style}
        onClick={onClick}
        onContextMenu={handleContextMenu}
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
        className={`absolute inset-x-0.5 rounded-xl border-2 shadow-sm cursor-pointer select-none overflow-hidden backdrop-blur-md ${config.bg} ${config.border} transition-colors duration-300`}
      >
        {/* Shadow Overlay for Premium Feel */}
        <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient}`} />
        
        {/* Left Accent Bar */}
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${config.accent} opacity-80`} />
        
        <div className="relative flex flex-col h-full justify-between p-2 pl-3">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-1">
              <p className={`text-[11px] font-black leading-tight truncate ${config.text}`}>
                {customerName}
              </p>
              {onLongPress && <Zap className={`h-2.5 w-2.5 ${config.text} opacity-50`} />}
            </div>
            <p className={`text-[10px] font-bold truncate leading-none mt-1 opacity-70 ${config.text}`}>
              {serviceNames.join(', ')}
            </p>
          </div>
          <div className="flex items-end justify-between">
            <span className={`text-[10px] font-black tracking-tight ${config.text}`}>{startStr}</span>
            <span className={`text-[11px] font-black ${config.text}`}>₺{totalPrice}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  const config = statusColors[status];
  return (
    <motion.div
      layout
      initial={initialProps}
      animate={controls}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      onContextMenu={handleContextMenu}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      className="glass-card p-4 rounded-2xl flex items-center justify-between cursor-pointer group active:bg-muted/50 transition-all duration-300 border-2 border-transparent hover:border-primary/20"
    >
      <div className="flex items-center gap-4">
        <div className={`h-11 w-11 rounded-2xl flex items-center justify-center border-2 ${config.bg} ${config.border} shadow-inner`}>
          <User className={`h-5 w-5 ${config.text}`} />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-sm tracking-tight text-foreground flex items-center gap-2">
            {customerName}
            <span className={`text-[9px] px-2 py-0.5 rounded-lg border-2 font-black uppercase tracking-wider ${config.bg} ${config.border} ${config.text}`}>
              {statusLabels[status]}
            </span>
          </h3>
          <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-primary/60" />
              {startStr} - {endStr}
            </span>
            <span className="truncate max-w-[120px] opacity-80">{serviceNames.join(', ')}</span>
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="font-black text-sm text-foreground italic">₺{totalPrice}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold opacity-60">Tutar</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </motion.div>
  );
}
