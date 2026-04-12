import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { WhatsAppAgent } from '../components/more/WhatsAppAgent';
import { WhatsAppSetup } from '../components/more/WhatsAppSetup';
import { WebsiteBuilder } from '../components/more/WebsiteBuilder';
import { MarketingAutomation } from '../components/more/MarketingAutomation';
import { ServiceManagement } from '../components/more/ServiceManagement';
import { StaffManagement } from '../components/more/StaffManagement';
import { SalonInfo } from '../components/more/SalonInfo';
import { Blacklist } from '../components/more/Blacklist';
import { Campaigns } from '../components/more/Campaigns';
import { Automations } from '../components/more/Automations';
import { HelpCenter } from '../components/more/HelpCenter';
import { WhatsAppAgentFaq } from '../components/more/WhatsAppAgentFaq';
import { WhatsAppSettings } from '../components/more/WhatsAppSettings';
import { MetaDirectSetup } from '../components/more/MetaDirectSetup';
import { SocialChannelsHub } from '../components/more/SocialChannelsHub';

export function FeatureDetailPage() {
  const { featureKey } = useParams();
  const navigate = useNavigate();

  const onBack = () => navigate('/app/features', { state: { navDirection: 'back' } });

  if (featureKey === 'whatsapp-settings') return <WhatsAppSettings onBack={onBack} />;
  if (featureKey === 'whatsapp-agent') return <WhatsAppAgent onBack={onBack} />;
  if (featureKey === 'whatsapp-agent-faq') return <WhatsAppAgentFaq onBack={() => navigate('/app/features/whatsapp-agent', { state: { navDirection: 'back' } })} />;
  if (featureKey === 'whatsapp-setup') return <WhatsAppSetup onBack={onBack} />;
  if (featureKey === 'website-builder') return <WebsiteBuilder onBack={onBack} />;
  if (featureKey === 'marketing') return <MarketingAutomation onBack={onBack} />;
  if (featureKey === 'service-management') return <ServiceManagement onBack={onBack} />;
  if (featureKey === 'staff-management') return <StaffManagement onBack={onBack} />;
  if (featureKey === 'salon-info') return <SalonInfo onBack={onBack} />;
  if (featureKey === 'blacklist') return <Blacklist onBack={onBack} />;
  if (featureKey === 'campaigns') return <Campaigns onBack={onBack} />;
  if (featureKey === 'automations') return <Automations onBack={onBack} />;
  if (featureKey === 'help-center') return <HelpCenter onBack={onBack} />;
  if (featureKey === 'meta-direct') return <MetaDirectSetup onBack={onBack} />;
  if (featureKey === 'social-channels') return <SocialChannelsHub onBack={onBack} />;
  if (featureKey === 'crm') return <Navigate to="/app/customers" replace />;
  if (featureKey === 'analytics') return <Navigate to="/app/analytics" replace />;
  if (featureKey === 'inventory') return <Navigate to="/app/inventory" replace />;

  return (
    <div className="p-4">
      <p className="text-sm text-muted-foreground">Özellik bulunamadı.</p>
      <button type="button" onClick={onBack} className="mt-3 text-sm underline">
        Geri Dön
      </button>
    </div>
  );
}
