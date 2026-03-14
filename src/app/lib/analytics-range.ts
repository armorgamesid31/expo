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

function asDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
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
    // JS getDay(): 0=Pazar, 1=Pazartesi ... 6=Cumartesi
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
      return { range: null, error: 'Özel aralık için başlangıç ve bitiş tarihi seçin.' };
    }
    from = startOfLocalDay(new Date(`${params.customFromDate}T00:00:00`));
    to = endOfLocalDay(new Date(`${params.customToDate}T00:00:00`));
  }

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { range: null, error: 'Geçerli bir tarih aralığı seçin.' };
  }
  if (from > to) {
    return { range: null, error: 'Başlangıç tarihi bitiş tarihinden büyük olamaz.' };
  }

  const maxDays = 180;
  const dayDiff = Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (dayDiff > maxDays) {
    return { range: null, error: `Maksimum ${maxDays} gün seçebilirsiniz.` };
  }

  return {
    range: {
      fromIso: from.toISOString(),
      toIso: to.toISOString(),
    },
    error: null,
  };
}
