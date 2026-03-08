import { useState, useEffect } from 'react';
import { BottomNav } from './components/layout/BottomNav';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { StaffTimeline } from './components/schedule/StaffTimeline';
import { CustomerList } from './components/crm/CustomerList';
import { InventoryList } from './components/inventory/InventoryList';
import { PerformanceCharts } from './components/analytics/PerformanceCharts';
import { MoreScreen } from './components/more/MoreScreen';
import { SettingsScreen } from './components/more/SettingsScreen';
import { WhatsAppAgent } from './components/more/WhatsAppAgent';
import { WebsiteBuilder } from './components/more/WebsiteBuilder';
import { MarketingAutomation } from './components/more/MarketingAutomation';
import { ServiceManagement } from './components/more/ServiceManagement';
import { StaffManagement } from './components/more/StaffManagement';
import { SalonInfo } from './components/more/SalonInfo';
import { Blacklist } from './components/more/Blacklist';
import { Campaigns } from './components/more/Campaigns';
import { Automations } from './components/more/Automations';
import { HelpCenter } from './components/more/HelpCenter';
import { WhatsAppSetup } from './components/more/WhatsAppSetup';

// Sub-screens that live under "More" tab
const MORE_SUB_SCREENS = ['whatsapp-agent', 'whatsapp-setup', 'website-builder', 'marketing', 'service-management', 'staff-management', 'salon-info', 'blacklist', 'campaigns', 'automations', 'help-center'];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(isDark);
    if (isDark) document.documentElement.classList.add('dark');
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleNavigate = (tab: string) => setActiveTab(tab);

  // Highlight the correct bottom-nav tab for sub-screens
  const activeNavTab = MORE_SUB_SCREENS.includes(activeTab) ? 'features' : activeTab;

  const renderContent = () => {
    if (activeTab === 'dashboard') {
      return <AdminDashboard onNavigate={handleNavigate} />;
    }
    if (activeTab === 'schedule')  return <StaffTimeline onNavigate={handleNavigate} />;
    if (activeTab === 'crm')       return <CustomerList />;
    if (activeTab === 'analytics') return <PerformanceCharts onBack={() => setActiveTab('features')} />;
    if (activeTab === 'inventory') return <InventoryList />;

    if (activeTab === 'whatsapp-agent') return <WhatsAppAgent onBack={() => setActiveTab('features')} />;
    if (activeTab === 'whatsapp-setup') return <WhatsAppSetup onBack={() => setActiveTab('features')} />;
    if (activeTab === 'website-builder') return <WebsiteBuilder onBack={() => setActiveTab('features')} />;
    if (activeTab === 'marketing') return <MarketingAutomation onBack={() => setActiveTab('features')} />;

    if (activeTab === 'service-management') return <ServiceManagement onBack={() => setActiveTab('features')} />;
    if (activeTab === 'staff-management') return <StaffManagement onBack={() => setActiveTab('features')} />;
    if (activeTab === 'salon-info') return <SalonInfo onBack={() => setActiveTab('features')} />;
    if (activeTab === 'blacklist') return <Blacklist onBack={() => setActiveTab('features')} />;
    if (activeTab === 'campaigns') return <Campaigns onBack={() => setActiveTab('features')} />;
    if (activeTab === 'automations') return <Automations onBack={() => setActiveTab('features')} />;
    if (activeTab === 'help-center') return <HelpCenter onBack={() => setActiveTab('features')} />;

    if (activeTab === 'features') {
      return (
        <MoreScreen
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          onNavigate={handleNavigate}
        />
      );
    }

    if (activeTab === 'settings') {
      return (
        <SettingsScreen
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          onShowHelpCenter={() => setActiveTab('help-center')}
        />
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[var(--luxury-bg)]">
      <main className="h-screen overflow-y-auto">
        {renderContent()}
      </main>

      <BottomNav activeTab={activeNavTab} onTabChange={setActiveTab} />
    </div>
  );
}