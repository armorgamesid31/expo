import { CalendarClock } from 'lucide-react';
import type { AnalyticsRangePreset } from '../../lib/analytics-range';

interface AnalyticsRangeSelectorProps {
  compact?: boolean;
  preset: AnalyticsRangePreset;
  customFromDate: string;
  customToDate: string;
  onPresetChange: (preset: AnalyticsRangePreset) => void;
  onCustomFromDateChange: (value: string) => void;
  onCustomToDateChange: (value: string) => void;
  onApplyCustomRange: () => void;
}

const OPTIONS: Array<{ value: AnalyticsRangePreset; label: string }> = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom' },
];

export function AnalyticsRangeSelector(props: AnalyticsRangeSelectorProps) {
  const compact = Boolean(props.compact);

  return (
    <div className={compact ? 'space-y-2' : 'rounded-xl border border-border bg-card p-3 space-y-3'}>
      {!compact ? (
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-[var(--rose-gold)]" />
          <p className="text-sm font-semibold">Time Range</p>
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
              onChange={(event) => props.onCustomFromDateChange(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={props.customToDate}
              onChange={(event) => props.onCustomToDateChange(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={props.onApplyCustomRange}
            className="rounded-lg bg-[var(--rose-gold)] px-3 py-2 text-sm font-medium text-white"
          >
            Apply Range
          </button>
        </div>
      ) : compact ? null : (
        <p className="text-xs text-muted-foreground">
          Görünen metrik ve grafikler seçtiğin zaman aralığına göre hesaplanır.
        </p>
      )}
    </div>
  );
}
