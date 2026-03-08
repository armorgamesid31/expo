import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminDashboard } from '../components/dashboard/AdminDashboard';
import { useAuth } from '../context/AuthContext';

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
        const response = await apiFetch<{ checklist?: typeof checklist }>('/api/admin/setup');
        if (mounted) {
          setChecklist(response?.checklist || null);
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

  return <AdminDashboard onNavigate={handleNavigate} checklist={checklist} />;
}
