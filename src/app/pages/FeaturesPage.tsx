import { useNavigate } from 'react-router-dom';
import { MoreScreen } from '../components/more/MoreScreen';
import { useAuth } from '../context/AuthContext';

export function FeaturesPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const handleNavigate = (target: string) => {
    const map: Record<string, string> = {
      crm: '/app/customers',
      analytics: '/app/analytics',
      inventory: '/app/inventory',
      campaigns: '/app/campaigns',
      automations: '/app/automations',
      'service-management': '/app/services',
      'staff-management': '/app/staff',
      'team-management': '/app/team-management',
      packages: '/app/packages',
      'salon-info': '/app/salon-info',
      blacklist: '/app/blacklist',
      'website-builder': '/app/features/website-builder',
      marketing: '/app/features/marketing',
      'help-center': '/app/features/help-center',
      'meta-direct': '/app/features/meta-direct',
      'instagram-inbox': '/app/instagram-inbox',
      'team-access': '/app/team-access',
    };

    navigate(map[target] || `/app/features/${target}`, { state: { navDirection: 'forward' } });
  };

  return (
    <MoreScreen
      isDarkMode={false}
      onToggleDarkMode={() => undefined}
      onNavigate={handleNavigate}
      isFeatureVisible={(permissionKey) => {
        if (!permissionKey) return true;
        if (permissionKey === 'team.management') {
          return (
            hasPermission('staff.manage') ||
            hasPermission('access.users.manage') ||
            hasPermission('access.roles.manage')
          );
        }
        return hasPermission(permissionKey);
      }}
    />
  );
}
