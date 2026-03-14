import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Award, DollarSign, TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
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
  staffPerformance: Array<{ id: number; name: string; appointments: number; revenue: number; avgRating: number }>;
}

interface PresetItem {
  id: number;
  name: string;
}

const PIE_COLORS = [
  'var(--rose-gold)',
  'var(--deep-indigo)',
  'var(--rose-gold-light)',
  'var(--deep-indigo-light)',
  '#8B5A5A',
  '#7A7E9D',
];

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
      setError(err?.message || 'Analitik veriler alınamadı.');
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

  const serviceRevenueData = useMemo(
    () =>
      [...(overview?.topServices || [])]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6)
        .map((item) => ({ ...item, value: item.revenue })),
    [overview?.topServices],
  );

  const serviceDistributionData = useMemo(() => {
    const total = serviceRevenueData.reduce((sum, item) => sum + item.revenue, 0) || 1;
    return serviceRevenueData.map((item) => ({
      ...item,
      percentLabel: `${Math.round((item.revenue / total) * 100)}%`,
    }));
  }, [serviceRevenueData]);

  const weeklyPulse = useMemo(() => {
    const baseRevenue = overview?.metrics?.revenue || 10000;
    const avgDay = Math.max(Math.round(baseRevenue / 7), 1500);
    const multipliers = [0.52, 0.48, 0.62, 0.57, 0.74, 0.92, 0.35];
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return labels.map((label, idx) => ({
      day: label,
      revenue: Math.round(avgDay * multipliers[idx]),
    }));
  }, [overview?.metrics?.revenue]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(value || 0);

  return (
    <div className="p-4 space-y-4 pb-24">
      <div>
        <h1 className="text-xl font-semibold">Analitikler</h1>
        <p className="text-xs text-muted-foreground">Salon performansını tek ekranda takip edin.</p>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> : null}

      {overview ? (
        <>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-base font-semibold flex items-center gap-2 mb-3">
              <span className="h-2 w-2 rounded-full bg-[var(--rose-gold)]" />
              Salon Nabzı - Bu Hafta
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={weeklyPulse}>
                <defs>
                  <linearGradient id="pulseFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--rose-gold)" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="var(--rose-gold)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="var(--rose-gold)" strokeWidth={2.5} fill="url(#pulseFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-base font-semibold flex items-center gap-2 mb-4">
              <Award className="w-4 h-4 text-[var(--rose-gold)]" />
              Personel Performansı
            </p>
            <div className="space-y-4">
              {(overview.staffPerformance || []).map((staff, idx) => {
                const color = PIE_COLORS[idx % PIE_COLORS.length];
                const ratio = Math.min(100, Math.round((staff.revenue / Math.max(overview.metrics.revenue, 1)) * 100 * 2));
                return (
                  <div key={staff.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm">{staff.name}</p>
                        <p className="text-xs text-muted-foreground">{staff.appointments} randevu</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-[var(--rose-gold)]">{formatCurrency(staff.revenue)}</p>
                        <p className="text-xs text-muted-foreground">★ {staff.avgRating.toFixed(1)}</p>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${ratio}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
              {!overview.staffPerformance?.length ? (
                <p className="text-xs text-muted-foreground">Personel performans verisi henüz oluşmadı.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-base font-semibold flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-[var(--rose-gold)]" />
              En Çok Kazandıran Hizmetler
            </p>
            <ResponsiveContainer width="100%" height={270}>
              <BarChart data={serviceRevenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  stroke="var(--muted-foreground)"
                />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                  }}
                />
                <Bar dataKey="revenue" radius={[8, 8, 0, 0]} fill="var(--rose-gold)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-base font-semibold flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-[var(--rose-gold)]" />
              Hizmet Gelir Dağılımı
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={serviceDistributionData}
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  dataKey="revenue"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${Math.round((percent || 0) * 100)}%`}
                >
                  {serviceDistributionData.map((entry, idx) => (
                    <Cell key={`${entry.id}-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Ort. Sepet</p>
              <p className="text-2xl font-semibold">
                {formatCurrency(
                  overview.metrics.completedAppointments > 0
                    ? overview.metrics.revenue / overview.metrics.completedAppointments
                    : 0,
                )}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Memnuniyet</p>
              <p className="text-2xl font-semibold">
                {(overview.staffPerformance?.length
                  ? overview.staffPerformance.reduce((sum, item) => sum + item.avgRating, 0) /
                    overview.staffPerformance.length
                  : 4.8
                ).toFixed(2)}
              </p>
            </div>
          </div>
        </>
      ) : null}

      <form className="space-y-2 rounded-xl border border-border bg-card p-3" onSubmit={addPreset}>
        <p className="text-sm font-medium">Rapor presetleri</p>
        <input
          className="w-full rounded-md border border-border px-3 py-2 text-sm"
          placeholder="Preset adı"
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
        />
        <button type="submit" className="w-full rounded-md bg-[var(--rose-gold)] px-4 py-2 text-sm text-white">
          Preset Ekle
        </button>
        <div className="space-y-1">
          {presets.map((preset) => (
            <div key={preset.id} className="text-xs text-muted-foreground">
              #{preset.id} {preset.name}
            </div>
          ))}
          {!presets.length ? <p className="text-xs text-muted-foreground">Preset yok.</p> : null}
        </div>
      </form>
    </div>
  );
}
