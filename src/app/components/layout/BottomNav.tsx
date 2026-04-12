import { LayoutDashboard, Calendar, MessagesSquare, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
  { id: 'dashboard', label: 'Ana Sayfa', icon: LayoutDashboard },
  { id: 'schedule', label: 'Randevular', icon: Calendar },
  { id: 'conversations', label: 'Konuşmalar', icon: MessagesSquare },
  { id: 'settings', label: "Ayarlar", icon: Settings }];


  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors min-w-[60px] ${
              isActive ? 'text-[var(--rose-gold)]' : 'text-muted-foreground'}`
              }>
              
              <Icon className={`w-5 h-5 ${isActive ? 'fill-[var(--rose-gold)]/10' : ''}`} />
              <span className="text-xs">{tab.label}</span>
            </button>);

        })}
      </div>
    </nav>);

}