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
  YAxis
} from
  'recharts';
import { useAuth } from '../context/AuthContext';
import { readSnapshot, writeSnapshot } from '../lib/ui-cache';
import { AnalyticsRangeSelector } from '../components/analytics/AnalyticsRangeSelector';
import {
  AnalyticsRangePreset,
  defaultCustomDates,
  resolveAnalyticsRange
} from
  '../lib/analytics-range';

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
  topServices: Array<{ id: number; name: string; appointments: number; revenue: number; }>;
  staffPerformance: Array<{ id: number; name: string; appointments: number; revenue: number; avgRating: number; }>;
  weeklyRevenue?: Array<{ date: string; label: string; revenue: number; appointments: number; }>;
  trendRevenue?: Array<{ date: string; label: string; revenue: number; appointments: number; }>;
}

interface ReportTemplateItem {
  id: number;
  name: string;
}

const PIE_COLORS = [
  'var(--rose-gold)',
  'var(--deep-indigo)',
  'var(--rose-gold-light)',
  'var(--deep-indigo-light)',
  '#8B5A5A',
  '#7A7E9D'];


const ANALYTICS_OVERVIEW_CACHE_PREFIX = 'analytics:overview';

function analyticsOverviewCacheKey(fromIso: string, toIso: string): string {
  return `${ANALYTICS_OVERVIEW_CACHE_PREFIX}:${fromIso}:${toIso}`;
}

export function AnalyticsPage() {
  const { apiFetch } = useAuth();
  const defaults = defaultCustomDates();
  const [overview, setOverview] = useState<AnalyticsResponse | null>(null);
  const [templates, setTemplates] = useState<ReportTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [rangePreset, setRangePreset] = useState<AnalyticsRangePreset>('week');
  const [customFromDate, setCustomFromDate] = useState(defaults.fromDate);
  const [customToDate, setCustomToDate] = useState(defaults.toDate);
  const [rangeError, setRangeError] = useState<string | null>(null);

  const loadOverview = async (params: { preset: AnalyticsRangePreset; fromDate?: string; toDate?: string; }) => {
    const resolved = resolveAnalyticsRange({
      preset: params.preset,
      customFromDate: params.fromDate,
      customToDate: params.toDate
    });

    if (!resolved.range) {
      setRangeError(resolved.error || 'The time range is invalid.');
      setLoading(false);
      return;
    }

    const cacheKey = analyticsOverviewCacheKey(resolved.range.fromIso, resolved.range.toIso);
    const cachedOverview = readSnapshot<AnalyticsResponse>(cacheKey, 1000 * 60 * 60 * 24);
    if (cachedOverview) {
      setOverview(cachedOverview);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      setError(null);
      setRangeError(null);
      const analytics = await apiFetch<AnalyticsResponse>(
        `/api/admin/analytics/overview?from=${encodeURIComponent(resolved.range.fromIso)}&to=${encodeURIComponent(
          resolved.range.toIso
        )}`
      );
      setOverview(analytics);
      writeSnapshot(cacheKey, analytics);
    } catch (err: any) {
      setError(err?.message || 'Analytical data could not be retrieved.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const presetResponse = await apiFetch<{ items: ReportTemplateItem[]; }>('/api/admin/analytics/presets');
        if (mounted) {
          setTemplates(presetResponse.items);
        }
      } catch {
        if (mounted) {
          setTemplates([]);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [apiFetch]);

  useEffect(() => {
    void loadOverview({
      preset: rangePreset,
      fromDate: customFromDate,
      toDate: customToDate
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPresetChange = (preset: AnalyticsRangePreset) => {
    setRangePreset(preset);
    if (preset !== 'custom') {
      void loadOverview({
        preset,
        fromDate: customFromDate,
        toDate: customToDate
      });
    }
  };

  const onApplyCustomRange = () => {
    void loadOverview({
      preset: 'custom',
      fromDate: customFromDate,
      toDate: customToDate
    });
  };

  useEffect(() => {
    // Keep custom range values valid when user toggles quickly between presets.
    if (!customFromDate || !customToDate) {
      setCustomFromDate(defaults.fromDate);
      setCustomToDate(defaults.toDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addTemplate = async (event: FormEvent) => {
    event.preventDefault();
    if (!templateName.trim()) {
      return;
    }

    try {
      const response = await apiFetch<{ item: ReportTemplateItem; }>('/api/admin/analytics/presets', {
        method: 'POST',
        body: JSON.stringify({ name: templateName, filters: { source: 'mobile' } })
      });
      setTemplates((prev) => [response.item, ...prev]);
      setTemplateName('');
    } catch (err: any) {
      setError(err?.message || 'The report template could not be saved.');
    }
  };

  const serviceRevenueData = useMemo(
    () =>
      [...(overview?.topServices || [])].
        sort((a, b) => b.revenue - a.revenue).
        slice(0, 6).
        map((item) => ({ ...item, value: item.revenue })),
    [overview?.topServices]
  );

  const serviceDistributionData = useMemo(() => {
    const total = serviceRevenueData.reduce((sum, item) => sum + item.revenue, 0) || 1;
    return serviceRevenueData.map((item) => ({
      ...item,
      percentLabel: `${Math.round(item.revenue / total * 100)}%`
    }));
  }, [serviceRevenueData]);

  const weeklyPulse = useMemo(() => {
    const source = overview?.trendRevenue ?? overview?.weeklyRevenue;
    if (source) {
      return source.map((item) => ({
        day: item.label,
        revenue: item.revenue,
        appointments: item.appointments
      }));
    }

    return [
      { day: 'Pzt', revenue: 0, appointments: 0 },
      { day: 'Sal', revenue: 0, appointments: 0 },
      { day: 'Çar', revenue: 0, appointments: 0 },
      { day: 'Per', revenue: 0, appointments: 0 },
      { day: 'Cum', revenue: 0, appointments: 0 },
      { day: 'Cmt', revenue: 0, appointments: 0 },
      { day: 'Paz', revenue: 0, appointments: 0 }];

  }, [overview?.trendRevenue, overview?.weeklyRevenue]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0
    }).format(value || 0);

  return (
    <div className="p-4 space-y-4 pb-24">
      <div>
        <h1 className="text-xl font-semibold">Analitik</h1>
        <p className="text-xs text-muted-foreground">Track salon performance on a single screen.</p>
      </div>

      <AnalyticsRangeSelector
        compact
        preset={rangePreset}
        customFromDate={customFromDate}
        customToDate={customToDate}
        onPresetChange={onPresetChange}
        onCustomFromDateChange={setCustomFromDate}
        onCustomToDateChange={setCustomToDate}
        onApplyCustomRange={onApplyCustomRange} />

      {rangeError ? <p className="text-xs text-red-500">{rangeError}</p> : null}

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> : null}

      {overview ?
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
                    borderRadius: 10
                  }}
                  formatter={(value: number, _name: string, payload: any) => [
                    `${formatCurrency(value || 0)} • ${payload?.payload?.appointments || 0} randevu`,
                    'Günlük ciro']
                  } />

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
                const ratio = Math.min(100, Math.round(staff.revenue / Math.max(overview.metrics.revenue, 1) * 100 * 2));
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
                  </div>);

              })}
              {!overview.staffPerformance?.length ?
                <p className="text-xs text-muted-foreground">Henüz personel performans verisi yok.</p> :
                null}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-base font-semibold flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-[var(--rose-gold)]" />
              En Çok Gelir Getiren Hizmetler
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
                  stroke="var(--muted-foreground)" />

                <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 10
                  }} />

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
                  label={({ cx = 0, cy = 0, midAngle = 0, outerRadius = 0, name, percent }) => {
                    const RADIAN = Math.PI / 180;
                    const radius = Number(outerRadius) + 20;
                    const x = Number(cx) + radius * Math.cos(-Number(midAngle) * RADIAN);
                    const y = Number(cy) + radius * Math.sin(-Number(midAngle) * RADIAN);

                    return (
                      <text
                        x={x}
                        y={y}
                        fill="var(--muted-foreground)"
                        textAnchor={x > Number(cx) ? 'start' : 'end'}
                        dominantBaseline="central"
                        style={{ fontSize: 12, fontWeight: 500 }}>

                        {`${name}: ${Math.round((percent || 0) * 100)}%`}
                      </text>);

                  }}>

                  {serviceDistributionData.map((entry, idx) =>
                    <Cell key={`${entry.id}-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  )}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 10
                  }} />

              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Ort. Sepet</p>
              <p className="text-2xl font-semibold">
                {formatCurrency(
                  overview.metrics.completedAppointments > 0 ?
                    overview.metrics.revenue / overview.metrics.completedAppointments :
                    0
                )}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Memnuniyet</p>
              <p className="text-2xl font-semibold">
                {(overview.staffPerformance?.length ?
                  overview.staffPerformance.reduce((sum, item) => sum + item.avgRating, 0) /
                  overview.staffPerformance.length :
                  4.8).
                  toFixed(2)}
              </p>
            </div>
          </div>
        </> :
        null}

      <form className="space-y-2 rounded-xl border border-border bg-card p-3" onSubmit={addTemplate}>
        <p className="text-sm font-medium">Report Templates</p>
        <input
          className="w-full rounded-md border border-border px-3 py-2 text-sm"
          placeholder="şablon adı"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)} />

        <button type="submit" className="w-full rounded-md bg-[var(--rose-gold)] px-4 py-2 text-sm text-white">
          Şablon Ekle
        </button>
        <div className="space-y-1">
          {templates.map((template) =>
            <div key={template.id} className="text-xs text-muted-foreground">
              #{template.id} {template.name}
            </div>
          )}
          {!templates.length ? <p className="text-xs text-muted-foreground">Henüz şablon yok.</p> : null}
        </div>
      </form>
    </div>);

}
