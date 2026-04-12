import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { asDateInputValue } from '../../lib/analytics-range';

interface DayNavigatorProps {
  dateValue: string;
  onDateChange: (next: string) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
}

function formatTurkishDayLabel(value: string): string {
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return 'Tarih seçin';
  }

  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(parsed);
}

export function DayNavigator(props: DayNavigatorProps) {
  const [open, setOpen] = useState(false);

  const selectedDate = useMemo(() => {
    const parsed = new Date(`${props.dateValue}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }, [props.dateValue]);

  return (
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={props.onPrevDay}
        className="h-8 w-8 rounded-full border border-border bg-card text-muted-foreground"
        aria-label="Önceki gün"
      >
        <ChevronLeft className="mx-auto h-4 w-4" />
      </button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="min-w-[190px] rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground"
          >
            {formatTurkishDayLabel(props.dateValue)}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="center"
          sideOffset={8}
          collisionPadding={12}
          className="w-auto max-w-[calc(100vw-1.5rem)] p-2"
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(day) => {
              if (!day) {
                return;
              }
              props.onDateChange(asDateInputValue(day));
              setOpen(false);
            }}
            initialFocus
            showOutsideDays
          />
        </PopoverContent>
      </Popover>

      <button
        type="button"
        onClick={props.onNextDay}
        className="h-8 w-8 rounded-full border border-border bg-card text-muted-foreground"
        aria-label="Sonraki gün"
      >
        <ChevronRight className="mx-auto h-4 w-4" />
      </button>

    </div>
  );
}
