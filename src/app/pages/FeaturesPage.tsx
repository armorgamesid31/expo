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
      'whatsapp-settings': '/app/features/whatsapp-settings',
      'service-management': '/app/services',
      'staff-management': '/app/staff',
      'salon-info': '/app/salon-info',
      blacklist: '/app/blacklist',
      'website-builder': '/app/features/website-builder',
      'whatsapp-setup': '/app/features/whatsapp-setup',
      'whatsapp-agent': '/app/features/whatsapp-agent',
      marketing: '/app/features/marketing',
      'help-center': '/app/features/help-center',
    };

    navigate(map[target] || `/app/features/${target}`);
  };

  return (
    <MoreScreen
      isDarkMode={false}
      onToggleDarkMode={() => undefined}
      onNavigate={handleNavigate}
    />
  );
}
