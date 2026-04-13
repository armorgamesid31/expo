import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Search, UserX, Plus, ShieldCheck, UserCheck } from 'lucide-react';
import { Skeleton } from '../components/ui/skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { cn } from '../components/ui/utils';

interface BlacklistItem {
  id: number;
  fullName: string | null;
  phone: string | null;
  reason: string | null;
  isActive: boolean;
}

export function BlacklistPage() {
  const { apiFetch } = useAuth();
  const [items, setItems] = useState<BlacklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ fullName: '', phone: '', reason: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const load = async (search = '') => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (search.trim()) {
        query.set('search', search.trim());
      }
      const response = await apiFetch<{ items: BlacklistItem[]; }>(
        `/api/admin/blacklist${query.toString() ? `?${query.toString()}` : ''}`
      );
      setItems(response.items);
    } catch (err: any) {
      setError(err?.message || 'Kara liste alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(searchQuery);
  }, [searchQuery]);

  const createItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.phone.trim()) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await apiFetch<{ item: BlacklistItem; }>('/api/admin/blacklist', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      setItems((prev) => [response.item, ...prev]);
      setForm({ fullName: '', phone: '', reason: '' });
    } catch (err: any) {
      setError(err?.message || 'Kayıt eklenemedi.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (item: BlacklistItem) => {
    try {
      const response = await apiFetch<{ item: BlacklistItem; }>(`/api/admin/blacklist/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !item.isActive })
      });
      setItems((prev) => prev.map((current) => current.id === item.id ? response.item : current));
    } catch (err: any) {
      setError(err?.message || 'Durum güncellenemedi.');
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[var(--luxury-bg)] pb-24">
      <div className="p-4 border-b border-border bg-[var(--luxury-bg)] sticky top-0 z-10">
        <h1 className="text-2xl font-semibold mb-1">Kara Liste</h1>
        <p className="text-sm text-muted-foreground">İstenmeyen randevu taleplerini engellemek için müşteri listesini yönetin.</p>
      </div>

      <div className="p-4 space-y-6">
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm italic">
            {error}
          </div>
        ) : null}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="İsim, telefon veya neden ile arayın..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)} 
          />
        </div>

        {/* Add Form */}
        <section>
          <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3 px-1 flex items-center gap-2">
            <Plus className="w-3 h-3" /> YENİ ENGELLEME EKLE
          </h2>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <form className="space-y-3" onSubmit={createItem}>
                <Input 
                  placeholder="Ad Soyad" 
                  value={form.fullName} 
                  onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))} 
                />
                <Input 
                  placeholder="Telefon Numarası" 
                  value={form.phone} 
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} 
                />
                <Input 
                  placeholder="Engelleme Nedeni" 
                  value={form.reason} 
                  onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))} 
                />
                <Button 
                  type="submit" 
                  disabled={saving} 
                  className="w-full bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)] text-white"
                >
                  {saving ? "Ekleniyor..." : "Kara Listeye Ekle"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* Blacklist Items */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3 px-1 flex items-center gap-2">
            <ShieldAlert className="w-3 h-3 text-red-500" /> ENGELLENENLER
          </h2>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-xl border border-border/50 bg-card p-3">
                  <div className="flex justify-between items-center h-full">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length > 0 ? (
            <div className="space-y-2">
              {items.map((item) => (
                <Card key={item.id} className={cn(
                  "border-border/50 transition-all",
                  !item.isActive && "opacity-60 grayscale-[0.5]"
                )}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          item.isActive ? "bg-red-50 text-red-500" : "bg-zinc-100 text-zinc-500"
                        )}>
                          {item.isActive ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{item.fullName || item.phone || `#${item.id}`}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.phone || "Telefon yok"} • {item.reason || "Sebep belirtilmedi"}</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => void toggle(item)} 
                        className={cn(
                          "h-8 px-2 text-xs font-medium border border-transparent",
                          item.isActive ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        )}
                      >
                        {item.isActive ? (
                          <span className="flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> Aktif</span>
                        ) : (
                          <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Pasif</span>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState 
              icon={ShieldCheck}
              title="Kara Liste Temiz"
              description="Şu an için engellenmiş herhangi bir müşteri bulunmuyor."
            />
          )}
        </section>
      </div>
    </div>
  );
}