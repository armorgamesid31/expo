import { useNavigate } from 'react-router-dom';
import { Layers, Package, Boxes, ChevronRight, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function OperationsStudioPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const canServices = hasPermission('services.manage');
  const canPackages = hasPermission('packages.manage');
  const canInventory = hasPermission('inventory.manage');
  const canCustomers = hasPermission('customers.manage');

  if (!canServices && !canPackages && !canInventory && !canCustomers) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-semibold">Operations Studio</h1>
        <p className="text-sm text-muted-foreground mt-2">
          You do not have permission to open operations tools.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Operations Studio</h1>
      <p className="text-sm text-muted-foreground">
        Manage customers, services, package operations, and inventory from one workspace.
      </p>

      <div className="space-y-3">
        {canCustomers ? (
          <button
            type="button"
            onClick={() => navigate('/app/customers', { state: { navDirection: 'forward' } })}
            className="w-full rounded-xl border border-border bg-card p-4 text-left"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--deep-indigo)]/15 grid place-items-center">
                  <Users className="h-5 w-5 text-[var(--deep-indigo)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Customer Management</p>
                  <p className="text-xs text-muted-foreground">Profiles, notes, history, and attendance</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        ) : null}

        {canServices ? (
          <button
            type="button"
            onClick={() => navigate('/app/services', { state: { navDirection: 'forward' } })}
            className="w-full rounded-xl border border-border bg-card p-4 text-left"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--rose-gold)]/15 grid place-items-center">
                  <Layers className="h-5 w-5 text-[var(--rose-gold)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Service Management</p>
                  <p className="text-xs text-muted-foreground">Service catalog, categories, and settings</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        ) : null}

        {canPackages ? (
          <button
            type="button"
            onClick={() => navigate('/app/packages', { state: { navDirection: 'forward' } })}
            className="w-full rounded-xl border border-border bg-card p-4 text-left"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--deep-indigo)]/15 grid place-items-center">
                  <Package className="h-5 w-5 text-[var(--deep-indigo)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Package Management</p>
                  <p className="text-xs text-muted-foreground">Templates, quotas, and customer package balances</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        ) : null}

        {canInventory ? (
          <button
            type="button"
            onClick={() => navigate('/app/inventory', { state: { navDirection: 'forward' } })}
            className="w-full rounded-xl border border-border bg-card p-4 text-left"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--rose-gold)]/15 grid place-items-center">
                  <Boxes className="h-5 w-5 text-[var(--rose-gold)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Inventory</p>
                  <p className="text-xs text-muted-foreground">Stock items, movements, and adjustments</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        ) : null}
      </div>
    </div>
  );
}
