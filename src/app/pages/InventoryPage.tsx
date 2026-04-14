import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Package, Plus, Minus, Boxes } from 'lucide-react';
import { Skeleton } from '../components/ui/skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { cn } from '../components/ui/utils';
import { useNavigator } from '../context/NavigatorContext';

interface InventoryItem {
  id: number;
  name: string;
  category: string | null;
  unit: string;
  currentStock: number;
  minStock: number;
  lowStock: boolean;
}

export function InventoryPage() {
  const { apiFetch } = useAuth();
  const { setHeaderTitle } = useNavigator();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', category: '', unit: 'adet', currentStock: 0, minStock: 0 });

  useEffect(() => {
    setHeaderTitle('Envanter');
    setHeaderActions(
      <button
        type="button"
        onClick={() => {
          const formElement = document.getElementById('inventory-create-form') as HTMLFormElement;
          if (formElement) formElement.requestSubmit();
        }}
        disabled={saving}
        className="h-10 px-4 rounded-xl bg-[var(--rose-gold)] text-white inline-flex items-center gap-2 font-bold shadow-lg border-0 transition-all active:scale-95 disabled:opacity-60"
      >
        <Plus className="h-4 w-4" />
        <span>Ekle</span>
      </button>
    );
    return () => {
      setHeaderTitle(null);
      setHeaderActions(null);
    };
  }, [setHeaderTitle, setHeaderActions, saving]);


  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // Trying to fetch from admin endpoint, fallback to app if common pattern
      const response = await apiFetch<{ items: InventoryItem[]; }>('/api/admin/inventory/items');
      setItems(response.items || []);
    } catch (err: any) {
      setError(err?.message || "Envanter verileri alınamadı.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;

    setSaving(true);
    setError(null);
    try {
      await apiFetch('/api/admin/inventory/items', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      setForm({ name: '', category: '', unit: 'adet', currentStock: 0, minStock: 0 });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Kayıt eklenemedi.');
    } finally {
      setSaving(false);
    }
  };

  const adjust = async (id: number, type: 'IN' | 'OUT') => {
    try {
      await apiFetch(`/api/admin/inventory/items/${id}/adjust`, {
        method: 'POST',
        body: JSON.stringify({ type, quantity: 1 })
      });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Stok güncellenemedi.');
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-24 bg-background">
      <div className="p-4 space-y-6">
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-xs italic">
            {error}
          </div>
        ) : null}

        {/* Create Form */}
        <section>
          <h2 className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase mb-3 px-1">YENİ ÜRÜN EKLE</h2>
          <Card className="border-border shadow-sm rounded-2xl">
            <CardContent className="p-4">
              <form id="inventory-create-form" className="grid grid-cols-2 gap-3" onSubmit={createItem}>
                <div className="col-span-2">
                  <Input 
                    placeholder="Ürün Adı" 
                    value={form.name} 
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="h-11 rounded-xl"
                  />
                </div>
                <Input 
                  placeholder="Kategori" 
                  value={form.category} 
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="h-11 rounded-xl"
                />
                <Input 
                  placeholder="Birim (adet, ml)" 
                  value={form.unit} 
                  onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
                  className="h-11 rounded-xl"
                />
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground ml-2 uppercase">MEVCUT STOK</label>
                  <Input 
                    type="number" 
                    min={0} 
                    value={form.currentStock} 
                    onChange={(e) => setForm((prev) => ({ ...prev, currentStock: Number(e.target.value) }))}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground ml-2 uppercase">KRİTİK SINIR</label>
                  <Input 
                    type="number" 
                    min={0} 
                    value={form.minStock} 
                    onChange={(e) => setForm((prev) => ({ ...prev, minStock: Number(e.target.value) }))}
                    className="h-11 rounded-xl"
                  />
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* Inventory List */}
        <section className="space-y-3">
          <h2 className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase mb-3 px-1">STOKTAKİ ÜRÜNLER</h2>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : items.length > 0 ? (
            <div className="space-y-3">
              {items.map((item) => (
                <Card key={item.id} className="border-border rounded-2xl overflow-hidden shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                          item.lowStock ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-600"
                        )}>
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{item.name}</p>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{item.category || 'Genel'}</p>
                        </div>
                      </div>
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg",
                        item.lowStock ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                      )}>
                        {item.lowStock ? 'KRİTİK' : 'NORMAL'}
                      </span>
                    </div>

                    <div className="mt-5 flex items-end justify-between">
                      <div className="space-y-1">
                        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">GÜNCEL DURUM</p>
                        <p className="text-xl font-black">
                          {item.currentStock} <span className="text-xs font-bold text-muted-foreground">{item.unit}</span>
                          <span className="text-[10px] font-medium text-muted-foreground ml-2 opacity-60">(Sınır: {item.minStock})</span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-10 w-10 p-0 rounded-xl border-border bg-card text-foreground shadow-sm active:scale-90"
                          onClick={() => void adjust(item.id, 'OUT')}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-10 w-10 p-0 rounded-xl border-border bg-card text-foreground shadow-sm active:scale-90"
                          onClick={() => void adjust(item.id, 'IN')}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState 
              icon={Boxes}
              title="Henüz ürün yok"
              description="Sisteminizde kayıtlı ürün bulunamadı. Hemen yukarıdaki kısımdan ekleyebilirsiniz."
            />
          )}
        </section>
      </div>
    </div>
  );
}