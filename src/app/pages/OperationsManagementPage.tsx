import { useNavigate } from 'react-router-dom';
import { Layers, Package, Boxes, Users, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../components/ui/utils';

import { useNavigator } from '../context/NavigatorContext';
import { useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

export function OperationsManagementPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { setHeaderTitle } = useNavigator();

  const canServices = hasPermission('services.manage');
  const canPackages = hasPermission('packages.manage');
  const canInventory = hasPermission('inventory.manage');
  const canCustomers = hasPermission('customers.manage');
  const canImports = hasPermission('imports.manage');

  useEffect(() => {
    setHeaderTitle('Operasyon Yönetimi');
    return () => setHeaderTitle(null);
  }, [setHeaderTitle]);

  if (!canServices && !canPackages && !canInventory && !canCustomers && !canImports) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">
          Operasyon araçlarını açmak için yetkiniz bulunmamaktadır.
        </p>
      </div>
    );
  }

  const tools = [
    {
      id: 'customers',
      label: 'Müşteri Yönetimi',
      description: 'Müşteri profilleri, randevu geçmişi ve alışkanlık takibi',
      icon: Users,
      color: 'var(--deep-indigo)',
      path: '/app/customers',
      permission: canCustomers
    },
    {
      id: 'services',
      label: 'Hizmet Yönetimi',
      description: 'Hizmet listesi, süre tanımları ve kategoriler',
      icon: Layers,
      color: 'var(--rose-gold)',
      path: '/app/services',
      permission: canServices
    },
    {
      id: 'packages',
      label: 'Paket Yönetimi',
      description: 'Seans bazlı paketler ve kullanım şablonları',
      icon: Package,
      color: 'var(--deep-indigo)',
      path: '/app/packages',
      permission: canPackages
    },
    {
      id: 'inventory',
      label: 'Envanter',
      description: 'Ürün stokları, sarf malzemeleri ve kritik seviye takibi',
      icon: Boxes,
      color: 'var(--rose-gold)',
      path: '/app/inventory',
      permission: canInventory
    }
  ];

  return (
    <div className="p-4 space-y-3 bg-background h-full overflow-y-auto">
      <div className="space-y-3">
        {tools.filter(t => t.permission).map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() =>
              navigate(tool.path, {
                state: { navDirection: 'forward', from: '/app/operations-management' }
              })
            }
            className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm active:scale-[0.98] transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-4 flex-1">
                <div 
                  className="h-10 w-10 rounded-xl grid place-items-center shrink-0"
                  style={{ backgroundColor: `color-mix(in srgb, ${tool.color}, transparent 85%)` }}
                >
                  <tool.icon className="h-5 w-5" style={{ color: tool.color }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold leading-none mb-1.5">{tool.label}</p>
                  <p className="text-xs text-muted-foreground leading-tight line-clamp-2">{tool.description}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
