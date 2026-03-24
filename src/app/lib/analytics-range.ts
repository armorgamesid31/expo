export type AnalyticsRangePreset = 'week' | 'month' | 'last30' | 'custom';

export interface AnalyticsResolvedRange {
  fromIso: string;
  toIso: string;
}

function startOfLocalDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfLocalDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

export function asDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayDateInputValue(): string {
  return asDateInputValue(new Date());
}

export function shiftDateInputValue(value: string, diffDays: number): string {
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return todayDateInputValue();
  }
  parsed.setDate(parsed.getDate() + diffDays);
  return asDateInputValue(parsed);
}

export function resolveSingleDayRange(dateInput: string): { range: AnalyticsResolvedRange | null; error: string | null } {
  if (!dateInput) {
    return { range: null, error: 'Select a date.' };
  }
  const base = new Date(`${dateInput}T00:00:00`);
  if (Number.isNaN(base.getTime())) {
    return { range: null, error: 'Select a valid date.' };
  }

  const from = startOfLocalDay(base);
  const to = endOfLocalDay(base);

  return {
    range: {
      fromIso: from.toISOString(),
      toIso: to.toISOString(),
    },
    error: null,
  };
}

export function defaultCustomDates() {
  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() - 6);
  return {
    fromDate: asDateInputValue(from),
    toDate: asDateInputValue(now),
  };
}

export function resolveAnalyticsRange(params: {
  preset: AnalyticsRangePreset;
  customFromDate?: string;
  customToDate?: string;
}): { range: AnalyticsResolvedRange | null; error: string | null } {
  const now = new Date();
  let from: Date;
  let to: Date;

  if (params.preset === 'week') {
    // JS getDay(): 0=Sunday, 1=Monday ... 6=Saturday
    const mondayOffset = (now.getDay() + 6) % 7;
    from = startOfLocalDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset));
    to = now;
  } else if (params.preset === 'month') {
    from = startOfLocalDay(new Date(now.getFullYear(), now.getMonth(), 1));
    to = now;
  } else if (params.preset === 'last30') {
    const start = new Date(now);
    start.setDate(now.getDate() - 29);
    from = startOfLocalDay(start);
    to = now;
  } else {
    if (!params.customFromDate || !params.customToDate) {
      return { range: null, error: 'Select a start and end date for the custom range.' };
    }
    from = startOfLocalDay(new Date(`${params.customFromDate}T00:00:00`));
    to = endOfLocalDay(new Date(`${params.customToDate}T00:00:00`));
  }

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { range: null, error: 'Select a valid date range.' };
  }
  if (from > to) {
    return { range: null, error: 'The start date cannot be greater than the end date.' };
  }

  const maxDays = 180;
  const dayDiff = Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (dayDiff > maxDays) {
    return { range: null, error: `You can select up to ${maxDays} days.` };
  }

  return {
    range: {
      fromIso: from.toISOString(),
      toIso: to.toISOString(),
    },
    error: null,
  };
}
