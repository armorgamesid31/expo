import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminDashboard } from '../components/dashboard/AdminDashboard';
import { DayNavigator } from '../components/analytics/DayNavigator';
import { useAuth } from '../context/AuthContext';
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

export function DashboardPage() {
  const navigate = useNavigate();
  const { apiFetch } = useAuth();
  const [checklist, setChecklist] = useState<{
    workingHours?: boolean;
    address?: boolean;
    phone?: boolean;
    service?: boolean;
    staff?: boolean;
  } | null>(null);
  const [analytics, setAnalytics] = useState<DashboardAnalyticsOverview | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayDateInputValue());
  const [rangeError, setRangeError] = useState<string | null>(null);

  const handleNavigate = (target: string) => {
    const mapping: Record<string, string> = {
      schedule: '/app/schedule',
      crm: '/app/customers',
      features: '/app/features',
      'salon-info': '/app/salon-info',
      'service-management': '/app/services',
      'staff-management': '/app/staff',
    };
    navigate(mapping[target] || target || '/app/dashboard');
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const setupResponse = await apiFetch<{ checklist?: typeof checklist }>('/api/admin/setup');
        if (mounted) {
          setChecklist(setupResponse?.checklist || null);
        }
      } catch {
        if (mounted) {
          setChecklist(null);
        }
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

    try {
      setRangeError(null);
      const analyticsResponse = await apiFetch<DashboardAnalyticsOverview>(
        `/api/admin/analytics/overview?from=${encodeURIComponent(resolved.range.fromIso)}&to=${encodeURIComponent(
          resolved.range.toIso,
        )}`,
      );
      setAnalytics(analyticsResponse || null);
    } catch {
      setAnalytics(null);
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
    <div className="space-y-3">
      <DayNavigator
        dateValue={selectedDate}
        onDateChange={onDateChange}
        onPrevDay={onPrevDay}
        onNextDay={onNextDay}
      />
      {rangeError ? <p className="px-4 text-xs text-red-500">{rangeError}</p> : null}
      <AdminDashboard onNavigate={handleNavigate} checklist={checklist} analytics={analytics} />
    </div>
  );
}
