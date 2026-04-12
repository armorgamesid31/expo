import { CalendarClock } from 'lucide-react';
import type { AnalyticsRangePreset } from '../../lib/analytics-range';

interface AnalyticsRangeSelectorProps {
  compact?: boolean;
  preset: AnalyticsRangePreset;
  customFromDate: string;
  customToDate: string;
  onPresetChange: (preset: AnalyticsRangePreset) => void;
  onÖzelFromDateChange: (value: string) => void;
  onÖzelToDateChange: (value: string) => void;
  onApplyÖzelRange: () => void;
}

const OPTIONS: Array<{ value: AnalyticsRangePreset; label: string }> = [
  { value: 'week', label: 'Bu Hafta' },
  { value: 'month', label: 'Bu Ay' },
  { value: 'last30', label: 'Son 30 Gün' },
  { value: 'custom', label: 'Özel' },
];

export function AnalyticsRangeSelector(props: AnalyticsRangeSelectorProps) {
  const compact = Boolean(props.compact);

  return (
    <div className={compact ? 'space-y-2' : 'rounded-xl border border-border bg-card p-3 space-y-3'}>
      {!compact ? (
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-[var(--rose-gold)]" />
          <p className="text-sm font-semibold">Zaman Aralığı</p>
        </div>
      ) : null}

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {compact ? <CalendarClock className="w-4 h-4 shrink-0 text-[var(--rose-gold)]" /> : null}
        {OPTIONS.map((option) => {
          const selected = props.preset === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => props.onPresetChange(option.value)}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                selected
                  ? 'border-[var(--rose-gold)] bg-[var(--rose-gold)]/15 text-[var(--rose-gold)]'
                  : 'border-border bg-background text-muted-foreground'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {props.preset === 'custom' ? (
        <div className="grid grid-cols-1 gap-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={props.customFromDate}
              onChange={(event) => props.onÖzelFromDateChange(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={props.customToDate}
              onChange={(event) => props.onÖzelToDateChange(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={props.onApplyÖzelRange}
            className="rounded-lg bg-[var(--rose-gold)] px-3 py-2 text-sm font-medium text-white"
          >
            Aralığı Uygula
          </button>
        </div>
      ) : compact ? null : (
        <p className="text-xs text-muted-foreground">
          Görünen metrikler ve grafikler seçtiğiniz zaman aralığına göre hesaplanır.
        </p>
      )}
    </div>
  );
}
