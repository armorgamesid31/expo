import { useState } from 'react';
import { Package, AlertTriangle, TrendingDown, Plus, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { inventoryItems } from '../../data/mockData';

export function InventoryList() {
  const [items, setItems] = useState(inventoryItems);

  const lowStockItems = items.filter(item => item.currentStock <= item.minStock);
  const okStockItems = items.filter(item => item.currentStock > item.minStock);

  const adjustStock = (id: string, amount: number) => {
    setItems(prev => prev.map(item => 
      item.id === id 
        ? { ...item, currentStock: Math.max(0, item.currentStock + amount) }
        : item
    ));
  };

  const renderItem = (item: typeof items[0]) => {
    const isLowStock = item.currentStock <= item.minStock;
    const stockPercentage = (item.currentStock / item.minStock) * 100;

    return (
      <Card key={item.id} className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm">{item.name}</h3>
                {isLowStock && (
                  <Badge variant="destructive" className="bg-red-500/10 text-red-700 dark:text-red-300 text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Low
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{item.category}</p>
            </div>
          </div>

          {/* Stock Level Bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Stok Seviyesi</span>
              <span className="font-semibold">
                {item.currentStock} / {item.minStock} {item.unit}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  isLowStock ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, stockPercentage)}%` }}
              />
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 mb-3 pb-3 border-b border-border/50">
            <div>
              <p className="text-xs text-muted-foreground">Fiyat</p>
              <p className="font-semibold text-sm">₺{item.price}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tedarikçi</p>
              <p className="font-semibold text-sm truncate">{item.supplier}</p>
            </div>
          </div>

          {/* Quick Adjust */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex-1">Hızlı Ayarla:</span>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => adjustStock(item.id, -1)}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => adjustStock(item.id, 1)}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-full pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-background z-10 border-b border-border p-4">
        <h1 className="text-2xl font-semibold mb-4">Envanter</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-card rounded-lg border border-border">
            <Package className="w-5 h-5 text-[var(--rose-gold)] mb-2" />
            <p className="text-2xl font-bold">{items.length}</p>
            <p className="text-xs text-muted-foreground">Toplam Ürün</p>
          </div>
          <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
            <TrendingDown className="w-5 h-5 text-red-600 mb-2" />
            <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
            <p className="text-xs text-red-700 dark:text-red-300">Düşük Stok Uyarısı</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Low Stock Items */}
        {lowStockItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h2 className="font-semibold text-red-600">Düşük Stoklu Ürünler</h2>
              <Badge variant="destructive" className="ml-auto">{lowStockItems.length}</Badge>
            </div>
            <div className="space-y-3">
              {lowStockItems.map(renderItem)}
            </div>
          </div>
        )}

        {/* Normal Stock Items */}
        <div>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            Stokta
          </h2>
          <div className="space-y-3">
            {okStockItems.map(renderItem)}
          </div>
        </div>
      </div>
    </div>
  );
}