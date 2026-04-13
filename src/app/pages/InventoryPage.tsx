import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Package, Plus, Minus, AlertTriangle, Boxes, Search } from 'lucide-react';
import { Skeleton } from '../components/ui/skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

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
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', category: '', unit: 'adet', currentStock: 0, minStock: 0 });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<{ items: InventoryItem[]; }>('/api/admin/inventory/items');
      setItems(response.items);
    } catch (err: any) {
      setError(err?.message || "Envanter verileri alınamadı.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      return;
    }

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
    <div className="h-full overflow-y-auto bg-[var(--luxury-bg)] pb-24">
      <div className="p-4 border-b border-border bg-[var(--luxury-bg)] sticky top-0 z-10">
        <h1 className="text-2xl font-semibold mb-1">Envanter</h1>
        <p className="text-sm text-muted-foreground">Ürün stoklarını ve sarf malzemelerini yönetin.</p>
      </div>

      <div className="p-4 space-y-6">
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm italic">
            {error}
          </div>
        ) : null}

        {/* Create Form */}
        <section>
          <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3 px-1">YENİ ÜRÜN EKLE</h2>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <form className="grid grid-cols-2 gap-3" onSubmit={createItem}>
                <div className="col-span-2">
                  <Input 
                    placeholder="Ürün Adı" 
                    value={form.name} 
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} 
                  />
                </div>
                <Input 
                  placeholder="Kategori" 
                  value={form.category} 
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} 
                />
                <Input 
                  placeholder="Birim (örn: adet, ml)" 
                  value={form.unit} 
                  onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))} 
                />
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground ml-1 uppercase">Mevcut Stok</label>
                  <Input 
                    type="number" 
                    min={0} 
                    value={form.currentStock} 
                    onChange={(e) => setForm((prev) => ({ ...prev, currentStock: Number(e.target.value) }))} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground ml-1 uppercase">Kritik Seviye</label>
                  <Input 
                    type="number" 
                    min={0} 
                    value={form.minStock} 
                    onChange={(e) => setForm((prev) => ({ ...prev, minStock: Number(e.target.value) }))} 
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={saving} 
                  className="col-span-2 bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)] text-white"
                >
                  {saving ? "Ekleniyor..." : "Ürün Kaydet"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* Inventory List */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3 px-1">STOKTAKİ ÜRÜNLER</h2>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 rounded-2xl border border-border/50 bg-card p-4 space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-12" />
                    <Skeleton className="h-8 w-12" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length > 0 ? (
            <div className="space-y-2">
              {items.map((item) => (
                <Card key={item.id} className="border-border/50 overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          item.lowStock ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-600"
                        )}>
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.category || 'Genel Kategori'}</p>
                        </div>
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full",
                        item.lowStock ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                      )}>
                        {item.lowStock ? 'Kritik Seviye' : 'Stabil'}
                      </span>
                    </div>

                    <div className="mt-4 flex items-end justify-between">
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-tight">GÜNCEL DURUM</p>
                        <p className="text-lg font-bold">
                          {item.currentStock} <span className="text-sm font-normal text-muted-foreground">{item.unit}</span>
                          <span className="text-[10px] font-normal text-muted-foreground ml-2">(Sınır: {item.minStock})</span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-9 w-10 p-0 border-border/50"
                          onClick={() => void adjust(item.id, 'OUT')}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-9 w-10 p-0 border-border/50"
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
              title="Envanter Boş"
              description="Henüz hiçbir stok kalemi eklenmemiş. Yukarıdaki formu kullanarak ilk ürününüzü ekleyebilirsiniz."
            />
          )}
        </section>
      </div>
    </div>
  );
}