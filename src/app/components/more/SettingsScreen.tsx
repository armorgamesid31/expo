import { ChevronRight, Bell, Shield, Smartphone, HelpCircle, LogOut, User, Palette } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';

interface SettingsScreenProps {
  isDarkMode: boolean;
  onToggleDarkMode: (nextValue: boolean) => void;
  onShowHelpCenter?: () => void;
  onOpenNotificationSettings?: () => void;
  onOpenNotificationsInbox?: () => void;
  onLogout?: () => void;
}

export function SettingsScreen({
  isDarkMode,
  onToggleDarkMode,
  onShowHelpCenter,
  onOpenNotificationSettings,
  onOpenNotificationsInbox,
  onLogout,
}: SettingsScreenProps) {
  const settingGroups = [
    {
      title: "Account & Business",
      items: [
        { icon: User, label: "Profile Information", description: "Personal details and photo", color: "var(--rose-gold)" },
        { icon: Palette, label: "Appearance", description: "Theme and font", color: "var(--deep-indigo)", isThemeToggle: true },
        { icon: Shield, label: "Security", description: "Password and two-step verification", color: "var(--rose-gold)" },
      ]
    },
    {
      title: "Notifications",
      items: [
        { icon: Bell, label: "Notification Inbox", description: "In-app alerts", color: "var(--deep-indigo)", onClick: onOpenNotificationsInbox },
        { icon: Smartphone, label: "Notification Settings", description: "Push ve event tercihleri", color: "var(--rose-gold)", onClick: onOpenNotificationSettings },
      ]
    },
    {
      title: "Support",
      items: [
        { icon: HelpCircle, label: "Help Center", description: "Frequently asked questions", color: "var(--deep-indigo)", onClick: onShowHelpCenter },
      ]
    }
  ];

  return (
    <div className="h-full pb-20 overflow-y-auto">
      <div className="p-4 border-b border-border bg-[var(--luxury-bg)] sticky top-0 z-10">
        <h1 className="text-2xl font-semibold mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your app preferences</p>
      </div>

      <div className="p-4 space-y-6">
        {settingGroups.map((group, gIdx) => (
          <div key={gIdx}>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">
              {group.title}
            </h3>
            <Card className="border-border/50 divide-y divide-border/30">
              {group.items.map((item, iIdx) => {
                const Icon = item.icon;
                return (
                  <CardContent 
                    key={iIdx} 
                    className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={item.onClick}
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${item.color}15` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: item.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                      </div>
                      
                      {item.isThemeToggle ? (
                        <Switch checked={isDarkMode} onCheckedChange={onToggleDarkMode} />
                      ) : item.hasSwitch ? (
                        <Switch defaultChecked />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                      )}
                    </div>
                  </CardContent>
                );
              })}
            </Card>
          </div>
        ))}

        <div className="pt-2">
          <Button
            variant="outline"
            className="w-full border-red-500/20 text-red-600 hover:bg-red-500/10 hover:border-red-500/30 transition-all font-medium py-6 rounded-xl"
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </Button>
          <div className="mt-4 text-center">
            <p className="text-[10px] text-muted-foreground">Salon OS Enterprise v3.2.0</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">Developer: Figma Make AI</p>
          </div>
        </div>
      </div>
    </div>
  );
}
