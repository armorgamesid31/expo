import { useNavigate } from 'react-router-dom';
import { AdminDashboard } from '../components/dashboard/AdminDashboard';

export function DashboardPage() {
  const navigate = useNavigate();

  const handleNavigate = (target: string) => {
    if (target === 'schedule') {
      navigate('/app/schedule');
      return;
    }
    if (target === 'crm') {
      navigate('/app/customers');
      return;
    }
    if (target === 'features') {
      navigate('/app/features');
      return;
    }
    navigate('/app/dashboard');
  };

  return <AdminDashboard onNavigate={handleNavigate} />;
}
