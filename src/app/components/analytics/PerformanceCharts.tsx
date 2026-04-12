import { TrendingUp, Award, DollarSign, ArrowLeft, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { staffPerformance, servicePerformanceData } from '../../data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Button } from '../ui/button';
import { useState } from 'react';

interface PerformanceChartsProps {
  onBack: () => void;
}

export function PerformanceCharts({ onBack }: PerformanceChartsProps) {
  const COLORS = ['#B76E79', '#3C3F58', '#D4A5A5', '#5A5E7D', '#8B5A5A', '#7A7E9D'];
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  const periodLabels = {
    week: 'Last 7 Days',
    month: 'February 2026',
    quarter: 'Q1 2026',
    year: '2026'
  };

  return (
    <div className="h-full pb-20 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-background z-10 border-b border-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">Performans Analizi</h1>
            <p className="text-sm text-muted-foreground">{periodLabels[selectedPeriod]}</p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          {(['week', 'month', 'quarter', 'year'] as const).map((period) =>
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
            selectedPeriod === period ?
            'bg-[var(--rose-gold)] text-white' :
            'bg-muted text-muted-foreground'}`
            }>
            
              {period === 'week' && 'Hafta'}
              {period === 'month' && 'Ay'}
              {period === 'quarter' && 'Quarter'}
              {period === 'year' && 'Year'}
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Staff Performance */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-[var(--rose-gold)]" />
              Personel Performansı
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {staffPerformance.map((staff, idx) =>
            <div key={staff.staffId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: COLORS[idx] }}>
                    
                      {staff.staffName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{staff.staffName}</p>
                      <p className="text-xs text-muted-foreground">{staff.appointments} appointment</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[var(--rose-gold)]">₺{staff.revenue.toLocaleString()}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Award className="w-3 h-3" />
                      <span>{staff.avgRating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${staff.revenue / 10000 * 100}%`,
                    backgroundColor: COLORS[idx]
                  }} />
                
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Services Chart */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[var(--rose-gold)]" />
              En Çok Gelir Getiren Hizmetler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={servicePerformanceData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  stroke="var(--muted-foreground)" />
                
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="var(--muted-foreground)" />
                
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px'
                  }} />
                
                <Bar dataKey="value" fill="var(--rose-gold)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Service Distribution */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[var(--rose-gold)]" />
              Hizmet Gelir Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={servicePerformanceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value">
                  
                  {servicePerformanceData.map((entry, index) =>
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  )}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px'
                  }} />
                
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[var(--rose-gold)]/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-[var(--rose-gold)]" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ort. Sepet</p>
                  <p className="text-xl font-bold">₺245</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[var(--deep-indigo)]/10 flex items-center justify-center">
                  <Award className="w-6 h-6 text-[var(--deep-indigo)]" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Memnuniyet</p>
                  <p className="text-xl font-bold">4.87</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>);

}