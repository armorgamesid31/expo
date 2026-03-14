import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminDashboard } from '../components/dashboard/AdminDashboard';
import { useAuth } from '../context/AuthContext';

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
        const [setupResponse, analyticsResponse] = await Promise.all([
          apiFetch<{ checklist?: typeof checklist }>('/api/admin/setup'),
          apiFetch<DashboardAnalyticsOverview>('/api/admin/analytics/overview'),
        ]);
        if (mounted) {
          setChecklist(setupResponse?.checklist || null);
          setAnalytics(analyticsResponse || null);
        }
      } catch {
        if (mounted) {
          setChecklist(null);
          setAnalytics(null);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [apiFetch]);

  return <AdminDashboard onNavigate={handleNavigate} checklist={checklist} analytics={analytics} />;
}
