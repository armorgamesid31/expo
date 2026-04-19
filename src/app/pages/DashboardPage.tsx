import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminDashboard } from '../components/dashboard/AdminDashboard';
import { DayNavigator } from '../components/analytics/DayNavigator';
import { useAuth } from '../context/AuthContext';
import { readSnapshot, writeSnapshot } from '../lib/ui-cache';
import {
  resolveSingleDayRange,
  shiftDateInputValue,
  todayDateInputValue,
} from '../lib/analytics-range';

interface DashboardAnalyticsOverview {
  metrics: {
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    noShowAppointments: number;
    totalCustomers: number;
    newCustomers: number;
    revenue: number;
  };
  weeklyRevenue?: Array<{
    date: string;
    label: string;
    revenue: number;
    appointments: number;
  }>;
  trendRevenue?: Array<{
    date: string;
    label: string;
    revenue: number;
    appointments: number;
  }>;
}

type DashboardChecklist = {
  workingHours?: boolean;
  address?: boolean;
  phone?: boolean;
  service?: boolean;
  staff?: boolean;
  completed?: boolean;
};

const DASHBOARD_CHECKLIST_CACHE_KEY = 'dashboard:checklist';
const DASHBOARD_ANALYTICS_CACHE_PREFIX = 'dashboard:analytics:single-day';
const DASHBOARD_SELECTED_DATE_CACHE_KEY = 'dashboard:selected-date';

function analyticsCacheKey(fromIso: string, toIso: string): string {
  return `${DASHBOARD_ANALYTICS_CACHE_PREFIX}:${fromIso}:${toIso}`;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { apiFetch, bootstrap } = useAuth();
  const [checklist, setChecklist] = useState<DashboardChecklist | null | undefined>(() => {
    if (bootstrap?.setupChecklist) {
      return bootstrap.setupChecklist;
    }
    return readSnapshot<DashboardChecklist>(DASHBOARD_CHECKLIST_CACHE_KEY, 1000 * 60 * 60 * 24 * 30) || undefined;
  });
  const [analytics, setAnalytics] = useState<DashboardAnalyticsOverview | null>(() => {
    const todayRange = resolveSingleDayRange(todayDateInputValue()).range;
    if (!todayRange) {
      return null;
    }
    return readSnapshot<DashboardAnalyticsOverview>(
      analyticsCacheKey(todayRange.fromIso, todayRange.toIso),
      1000 * 60 * 60 * 24,
    );
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const cachedDate = readSnapshot<string>(DASHBOARD_SELECTED_DATE_CACHE_KEY, 1000 * 60 * 60 * 24 * 90);
    return cachedDate || todayDateInputValue();
  });
  const [rangeError, setRangeError] = useState<string | null>(null);

  useEffect(() => {
    writeSnapshot(DASHBOARD_SELECTED_DATE_CACHE_KEY, selectedDate);
  }, [selectedDate]);

  const handleNavigate = (target: string) => {
    const mapping: Record<string, string> = {
      schedule: '/app/schedule',
      crm: '/app/customers',
      features: '/app/features',
      'salon-info': '/app/salon-info',
      'service-management': '/app/services',
      'staff-management': '/app/staff',
    };
    navigate(mapping[target] || target || '/app/dashboard', { state: { navDirection: 'forward' } });
  };

  useEffect(() => {
    if (!bootstrap?.setupChecklist) {
      return;
    }
    setChecklist(bootstrap.setupChecklist);
    writeSnapshot(DASHBOARD_CHECKLIST_CACHE_KEY, bootstrap.setupChecklist);
  }, [bootstrap?.setupChecklist]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const setupResponse = await apiFetch<{ checklist?: DashboardChecklist | null }>('/api/admin/setup');
        if (mounted) {
          const nextChecklist = setupResponse?.checklist ?? null;
          if (nextChecklist !== null) {
            setChecklist(nextChecklist);
            writeSnapshot(DASHBOARD_CHECKLIST_CACHE_KEY, nextChecklist);
          } else {
            setChecklist(null);
          }
        }
      } catch {
        // Keep bootstrap/cached snapshot on request failure to avoid UI flicker.
      }
    })();

    return () => {
      mounted = false;
    };
  }, [apiFetch]);

  const loadAnalytics = async (dateInput: string) => {
    const resolved = resolveSingleDayRange(dateInput);

    if (!resolved.range) {
      setRangeError(resolved.error || 'Zaman aralığı geçersiz.');
      return;
    }

    const cacheKey = analyticsCacheKey(resolved.range.fromIso, resolved.range.toIso);
    const cached = readSnapshot<DashboardAnalyticsOverview>(cacheKey, 1000 * 60 * 60 * 24);
    if (cached) {
      setAnalytics(cached);
    }

    try {
      setRangeError(null);
      const analyticsResponse = await apiFetch<DashboardAnalyticsOverview>(
        `/api/admin/analytics/overview?from=${encodeURIComponent(resolved.range.fromIso)}&to=${encodeURIComponent(
          resolved.range.toIso,
        )}`,
      );
      setAnalytics(analyticsResponse || null);
      if (analyticsResponse) {
        writeSnapshot(cacheKey, analyticsResponse);
      }
    } catch {
      // Keep last known data if request fails.
    }
  };

  useEffect(() => {
    void loadAnalytics(selectedDate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDateChange = (nextDate: string) => {
    setSelectedDate(nextDate);
    void loadAnalytics(nextDate);
  };

  const onPrevDay = () => {
    const next = shiftDateInputValue(selectedDate, -1);
    setSelectedDate(next);
    void loadAnalytics(next);
  };

  const onNextDay = () => {
    const next = shiftDateInputValue(selectedDate, 1);
    setSelectedDate(next);
    void loadAnalytics(next);
  };

  return (
    <AdminDashboard
      onNavigate={handleNavigate}
      checklist={checklist}
      analytics={analytics}
      rangeError={rangeError}
      dayNavigator={
        <DayNavigator
          dateValue={selectedDate}
          onDateChange={onDateChange}
          onPrevDay={onPrevDay}
          onNextDay={onNextDay}
        />
      }
    />
  );
}
