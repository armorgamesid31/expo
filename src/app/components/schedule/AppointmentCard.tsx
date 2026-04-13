import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { motion } from 'motion/react';
import { User, Clock, ChevronRight } from 'lucide-react';
import { useNavigator } from '../../context/NavigatorContext';

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
  viewMode: 'list' | 'calendar';
  style?: React.CSSProperties;
}

export function AppointmentCard({
  customerName,
  startTime,
  endTime,
  serviceNames,
  totalPrice,
  status,
  onClick,
  viewMode,
  style
}: AppointmentCardProps) {
  const { isBackAction } = useNavigator();
  const startStr = format(new Date(startTime), 'HH:mm');
  const endStr = format(new Date(endTime), 'HH:mm');

  const statusColors: Record<UIAppointmentStatus, string> = {
    BOOKED: 'bg-primary/10 text-primary border-primary/20',
    CONFIRMED: 'bg-secondary/10 text-secondary border-secondary/20',
    UPDATED: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    NO_SHOW: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    CANCELLED: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    COMPLETED: 'bg-accent/10 text-accent border-accent/20',
    MIXED: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  };

  const initialProps = isBackAction ? false : { opacity: 0, y: 10 };

  if (viewMode === 'calendar') {
    return (
      <motion.div
        layout
        initial={initialProps}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.98 }}
        style={style}
        onClick={onClick}
        className={`absolute inset-x-1 rounded-xl border-l-4 p-2 shadow-sm cursor-pointer select-none overflow-hidden glass-card ${statusColors[status]}`}
      >
        <div className="flex flex-col h-full justify-between">
          <div>
            <p className="text-[11px] font-bold leading-tight truncate">{customerName}</p>
            <p className="text-[10px] opacity-80 truncate">{serviceNames.join(', ')}</p>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] font-medium">{startStr}-{endStr}</span>
            <span className="text-[10px] font-bold">₺{totalPrice}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={initialProps}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="glass-card p-4 rounded-2xl flex items-center justify-between cursor-pointer group"
    >
      <div className="flex items-center gap-4">
        <div className={`h-12 w-12 rounded-full flex items-center justify-center ${statusColors[status]}`}>
          <User className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            {customerName}
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColors[status]}`}>
              {status}
            </span>
          </h3>
          <p className="text-xs text-muted-foreground flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {startStr} - {endStr}
            </span>
            <span className="truncate max-w-[150px]">{serviceNames.join(', ')}</span>
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="font-bold text-foreground">₺{totalPrice}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Toplam</p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </motion.div>
  );
}
