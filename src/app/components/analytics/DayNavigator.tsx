import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';

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
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center justify-center gap-3 px-4 pt-4">
      <button
        type="button"
        onClick={props.onPrevDay}
        className="h-8 w-8 rounded-full border border-border bg-card text-muted-foreground"
        aria-label="Önceki gün"
      >
        <ChevronLeft className="mx-auto h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => {
          if (!inputRef.current) return;
          if (typeof inputRef.current.showPicker === 'function') {
            inputRef.current.showPicker();
          } else {
            inputRef.current.click();
          }
        }}
        className="min-w-[190px] rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground"
      >
        {formatTurkishDayLabel(props.dateValue)}
      </button>

      <button
        type="button"
        onClick={props.onNextDay}
        className="h-8 w-8 rounded-full border border-border bg-card text-muted-foreground"
        aria-label="Sonraki gün"
      >
        <ChevronRight className="mx-auto h-4 w-4" />
      </button>

      <input
        ref={inputRef}
        type="date"
        value={props.dateValue}
        onChange={(event) => props.onDateChange(event.target.value)}
        className="sr-only"
        aria-label="Tarih seçici"
      />
    </div>
  );
}
