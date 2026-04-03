import { useNavigate } from 'react-router-dom';
import { MoreScreen } from '../components/more/MoreScreen';

export function FeaturesPage() {
  const navigate = useNavigate();

  const handleNavigate = (target: string) => {
    const map: Record<string, string> = {
      crm: '/app/customers',
      analytics: '/app/analytics',
      inventory: '/app/inventory',
      campaigns: '/app/campaigns',
      automations: '/app/automations',
      'service-management': '/app/services',
      'staff-management': '/app/staff',
      packages: '/app/packages',
      'salon-info': '/app/salon-info',
      blacklist: '/app/blacklist',
      'website-builder': '/app/features/website-builder',
      marketing: '/app/features/marketing',
      'help-center': '/app/features/help-center',
      'meta-direct': '/app/features/meta-direct',
      'instagram-inbox': '/app/instagram-inbox',
    };

    navigate(map[target] || `/app/features/${target}`, { state: { navDirection: 'forward' } });
  };

  return (
    <MoreScreen
      isDarkMode={false}
      onToggleDarkMode={() => undefined}
      onNavigate={handleNavigate}
    />
  );
}
