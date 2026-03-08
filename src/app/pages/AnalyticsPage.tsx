import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface AnalyticsResponse {
  metrics: {
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    noShowAppointments: number;
    totalCustomers: number;
    newCustomers: number;
    revenue: number;
  };
  topServices: Array<{ id: number; name: string; appointments: number; revenue: number }>;
}

interface PresetItem {
  id: number;
  name: string;
}

export function AnalyticsPage() {
  const { apiFetch } = useAuth();
  const [overview, setOverview] = useState<AnalyticsResponse | null>(null);
  const [presets, setPresets] = useState<PresetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [presetName, setPresetName] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [analytics, presetResponse] = await Promise.all([
        apiFetch<AnalyticsResponse>('/api/admin/analytics/overview'),
        apiFetch<{ items: PresetItem[] }>('/api/admin/analytics/presets'),
      ]);
      setOverview(analytics);
      setPresets(presetResponse.items);
    } catch (err: any) {
      setError(err?.message || 'Analitik veriler alinamadi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const addPreset = async (event: FormEvent) => {
    event.preventDefault();
    if (!presetName.trim()) {
      return;
    }

    try {
      const response = await apiFetch<{ item: PresetItem }>('/api/admin/analytics/presets', {
        method: 'POST',
        body: JSON.stringify({ name: presetName, filters: { source: 'mobile' } }),
      });
      setPresets((prev) => [response.item, ...prev]);
      setPresetName('');
    } catch (err: any) {
      setError(err?.message || 'Preset kaydedilemedi.');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Analitikler</h1>
        <p className="text-xs text-muted-foreground">Metrikler + preset create/read aktif.</p>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Yukleniyor...</p> : null}

      {overview ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Toplam randevu</p><p className="text-lg font-semibold">{overview.metrics.totalAppointments}</p></div>
          <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Tamamlanan</p><p className="text-lg font-semibold">{overview.metrics.completedAppointments}</p></div>
          <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Musteri</p><p className="text-lg font-semibold">{overview.metrics.totalCustomers}</p></div>
          <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Gelir</p><p className="text-lg font-semibold">₺{overview.metrics.revenue}</p></div>
        </div>
      ) : null}

      <div className="rounded-lg border border-border p-3">
        <p className="text-sm font-medium mb-2">Top hizmetler</p>
        <div className="space-y-2">
          {overview?.topServices.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span>{item.name}</span>
              <span className="text-muted-foreground">{item.appointments} randevu</span>
            </div>
          ))}
          {!overview?.topServices.length ? <p className="text-xs text-muted-foreground">Veri yok.</p> : null}
        </div>
      </div>

      <form className="space-y-2 rounded-lg border border-border p-3" onSubmit={addPreset}>
        <p className="text-sm font-medium">Rapor presetleri</p>
        <input className="w-full rounded-md border border-border px-3 py-2 text-sm" placeholder="Preset adi" value={presetName} onChange={(e) => setPresetName(e.target.value)} />
        <button type="submit" className="w-full rounded-md bg-[var(--rose-gold)] px-4 py-2 text-sm text-white">Preset Ekle</button>
        <div className="space-y-1">
          {presets.map((preset) => (
            <div key={preset.id} className="text-xs text-muted-foreground">#{preset.id} {preset.name}</div>
          ))}
          {!presets.length ? <p className="text-xs text-muted-foreground">Preset yok.</p> : null}
        </div>
      </form>
    </div>
  );
}
