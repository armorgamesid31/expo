import { useState } from 'react';
import { Search, ChevronRight, TrendingUp, AlertTriangle } from 'lucide-react';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { customers } from '../../data/mockData';
import { Customer } from '../../types';
import { CustomerDetail } from './CustomerDetail';

export function CustomerList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRiskBadgeStyle = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
      default:
        return 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20';
    }
  };

  const getRiskIcon = (level: string) => {
    if (level === 'high' || level === 'medium') {
      return <AlertTriangle className="w-3 h-3" />;
    }
    return null;
  };

  if (selectedCustomer) {
    return <CustomerDetail customer={selectedCustomer} onBack={() => setSelectedCustomer(null)} />;
  }

  return (
    <div className="h-full pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-background z-10 border-b border-border p-4">
        <h1 className="text-2xl font-semibold mb-4">Customer Management</h1>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search for customers..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="text-center p-3 bg-card rounded-lg border border-border">
            <p className="text-2xl font-bold text-[var(--rose-gold)]">{customers.length}</p>
            <p className="text-xs text-muted-foreground">Toplam</p>
          </div>
          <div className="text-center p-3 bg-card rounded-lg border border-border">
            <p className="text-2xl font-bold text-green-600">
              {customers.filter(c => c.riskLevel === 'low').length}
            </p>
            <p className="text-xs text-muted-foreground">Low Risk</p>
          </div>
          <div className="text-center p-3 bg-card rounded-lg border border-border">
            <p className="text-2xl font-bold text-red-600">
              {customers.filter(c => c.riskLevel === 'high').length}
            </p>
            <p className="text-xs text-muted-foreground">High Risk</p>
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="p-4 space-y-3">
        {filteredCustomers.map(customer => (
          <Card 
            key={customer.id}
            className="border-border/50 cursor-pointer hover:border-[var(--rose-gold)]/50 transition-all active:scale-98"
            onClick={() => setSelectedCustomer(customer)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{customer.name}</h3>
                    <Badge 
                      variant="outline"
                      className={`text-xs ${getRiskBadgeStyle(customer.riskLevel)}`}
                    >
                      {getRiskIcon(customer.riskLevel)}
                      <span className="ml-1 capitalize">{customer.riskLevel === 'low' ? 'low' : customer.riskLevel === 'medium' ? 'orta' : 'high'}</span>
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{customer.phone}</p>
                  <p className="text-xs text-muted-foreground">{customer.email}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>

              <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border/50">
                <div>
                  <p className="text-xs text-muted-foreground">Ziyaret</p>
                  <p className="text-sm font-semibold">{customer.visitCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Harcama</p>
                  <p className="text-sm font-semibold text-[var(--rose-gold)]">
                    ₺{customer.totalSpent.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">No-show</p>
                  <p className="text-sm font-semibold">{customer.noShowCount}</p>
                </div>
              </div>

              {customer.riskLevel === 'high' && (
                <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-xs text-red-700 dark:text-red-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    High risk - Deposit required for booking
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}