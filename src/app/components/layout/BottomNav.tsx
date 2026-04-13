import { motion } from 'motion/react';
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
    { id: 'settings', label: "Yönetim", icon: Settings }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-panel border-t border-border z-50 safe-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors min-w-[60px] ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-12 h-[2px] bg-primary"
                  transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                />
              )}
              
              <motion.div
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'fill-primary/10' : ''}`} />
              </motion.div>
              
              <span className={`text-[10px] font-medium transition-all ${isActive ? 'opacity-100 transform -translate-y-0.5' : 'opacity-70'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
