import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminDashboard } from '../components/dashboard/AdminDashboard';
import { AnalyticsRangeSelector } from '../components/analytics/AnalyticsRangeSelector';
import { useAuth } from '../context/AuthContext';
import {
  AnalyticsRangePreset,
  defaultCustomDates,
  resolveAnalyticsRange,
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
  const defaults = defaultCustomDates();
  const [checklist, setChecklist] = useState<{
    workingHours?: boolean;
    address?: boolean;
    phone?: boolean;
    service?: boolean;
    staff?: boolean;
  } | null>(null);
  const [analytics, setAnalytics] = useState<DashboardAnalyticsOverview | null>(null);
  const [rangePreset, setRangePreset] = useState<AnalyticsRangePreset>('week');
  const [customFromDate, setCustomFromDate] = useState(defaults.fromDate);
  const [customToDate, setCustomToDate] = useState(defaults.toDate);
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

  const loadAnalytics = async (params: { preset: AnalyticsRangePreset; fromDate?: string; toDate?: string }) => {
    const resolved = resolveAnalyticsRange({
      preset: params.preset,
      customFromDate: params.fromDate,
      customToDate: params.toDate,
    });

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
    void loadAnalytics({
      preset: rangePreset,
      fromDate: customFromDate,
      toDate: customToDate,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPresetChange = (preset: AnalyticsRangePreset) => {
    setRangePreset(preset);
    if (preset !== 'custom') {
      void loadAnalytics({
        preset,
        fromDate: customFromDate,
        toDate: customToDate,
      });
    }
  };

  const onApplyCustomRange = () => {
    void loadAnalytics({
      preset: 'custom',
      fromDate: customFromDate,
      toDate: customToDate,
    });
  };

  return (
    <div className="space-y-3">
      <div className="px-4 pt-4">
        <AnalyticsRangeSelector
          preset={rangePreset}
          customFromDate={customFromDate}
          customToDate={customToDate}
          onPresetChange={onPresetChange}
          onCustomFromDateChange={setCustomFromDate}
          onCustomToDateChange={setCustomToDate}
          onApplyCustomRange={onApplyCustomRange}
        />
        {rangeError ? <p className="mt-2 text-xs text-red-500">{rangeError}</p> : null}
      </div>
      <AdminDashboard onNavigate={handleNavigate} checklist={checklist} analytics={analytics} />
    </div>
  );
}
