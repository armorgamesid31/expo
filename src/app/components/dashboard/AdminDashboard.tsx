import { TrendingUp, Users, UserCheck, UserPlus, DollarSign } from 'lucide-react';
import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SetupChecklist } from './SetupChecklist';

interface AdminDashboardProps {
  onNavigate?: (screen: string) => void;
  dayNavigator?: ReactNode;
  rangeError?: string | null;
  checklist?: {
    workingHours?: boolean;
    address?: boolean;
    phone?: boolean;
    service?: boolean;
    staff?: boolean;
    completed?: boolean;
  } | null;
  analytics?: {
    metrics: {
      totalAppointments: number;
      completedAppointments: number;
      cancelledAppointments: number;
      noShowAppointments: number;
      totalCustomers: number;
      newCustomers: number;
      revenue: number;
    };
    weeklyRevenue?: Array<{
      date: string;
      label: string;
      revenue: number;
      appointments: number;
    }>;
    trendRevenue?: Array<{
      date: string;
      label: string;
      revenue: number;
      appointments: number;
    }>;
  } | null;
}

export function AdminDashboard({ onNavigate, dayNavigator, rangeError, checklist, analytics }: AdminDashboardProps) {
  const analyticsSeries = analytics?.trendRevenue ?? analytics?.weeklyRevenue;
  const weekData = analyticsSeries
    ? analyticsSeries
    : [
        { label: 'Pzt', revenue: 0, appointments: 0, date: '' },
        { label: 'Sal', revenue: 0, appointments: 0, date: '' },
        { label: 'Çar', revenue: 0, appointments: 0, date: '' },
        { label: 'Per', revenue: 0, appointments: 0, date: '' },
        { label: 'Cum', revenue: 0, appointments: 0, date: '' },
        { label: 'Cmt', revenue: 0, appointments: 0, date: '' },
        { label: 'Paz', revenue: 0, appointments: 0, date: '' },
      ];
  const todayPoint = weekData[weekData.length - 1];
  const monthlyRevenue = analytics?.metrics?.revenue || 0;
  const newCustomers = analytics?.metrics?.newCustomers || 0;
  const totalCustomers = analytics?.metrics?.totalCustomers || 0;
  const returningCustomers = Math.max(totalCustomers - newCustomers, 0);
  const completedAppointments = analytics?.metrics?.completedAppointments || 0;
  const totalAppointments = analytics?.metrics?.totalAppointments || 0;
  const setupCompleted =
    Boolean(checklist?.completed) ||
    Boolean(checklist?.workingHours && checklist?.address && checklist?.phone && checklist?.service && checklist?.staff);

  const stats = [
    {
      title: 'Son Gün Cirosu',
      value: `₺${(todayPoint?.revenue || 0).toLocaleString('tr-TR')}`,
      subtitle: `Seçili aralıkta son gün • ${todayPoint?.appointments || 0} randevu`,
      icon: DollarSign,
      color: 'var(--rose-gold)',
    },
    {
      title: 'Aylık Toplam',
      value: `₺${monthlyRevenue.toLocaleString('tr-TR')}`,
      subtitle: `${completedAppointments}/${totalAppointments} randevu tamamlandı`,
      icon: TrendingUp,
      color: 'var(--deep-indigo)',
    },
    {
      title: 'Yeni Müşteriler',
      value: newCustomers.toString(),
      subtitle: 'Bu ay',
      icon: UserPlus,
      color: 'var(--rose-gold-light)',
    },
    {
      title: 'Sadık Müşteriler',
      value: returningCustomers.toString(),
      subtitle: 'Tekrar gelenler',
      icon: UserCheck,
      color: 'var(--deep-indigo-light)',
    },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="pt-6 px-4">
        <h1 className="text-2xl font-semibold mb-1">Hoş geldiniz</h1>
        <p className="text-muted-foreground text-sm">Salonunuzun performans özeti</p>
      </div>

      {dayNavigator ? <div className="px-4">{dayNavigator}</div> : null}
      {rangeError ? <p className="px-4 text-xs text-red-500">{rangeError}</p> : null}

      {/* Setup Checklist - Displayed only if empty state is true */}
      {onNavigate && !setupCompleted && (
        <div className="px-4">
          <SetupChecklist onNavigate={onNavigate} checklist={checklist} />
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 px-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border-border/50 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${stat.color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: stat.color }} />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-semibold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Salon Pulse Chart */}
      <div className="px-4">
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--rose-gold)] animate-pulse" />
              Salon Nabzı - Bu Hafta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weekData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--rose-gold)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--rose-gold)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid key="grid" strokeDasharray="3 3" opacity={0.1} />
                <XAxis 
                  key="xaxis"
                  dataKey="label" 
                  tick={{ fontSize: 12 }}
                  stroke="var(--muted-foreground)"
                />
                <YAxis 
                  key="yaxis"
                  tick={{ fontSize: 12 }}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip 
                  key="tooltip"
                  contentStyle={{ 
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: any) => [`₺${Number(value || 0).toLocaleString('tr-TR')}`, 'Ciro']}
                />
                <Area 
                  key="area-revenue"
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="var(--rose-gold)" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="px-4">
        <h2 className="text-lg font-semibold mb-3">Hızlı Erişim</h2>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => onNavigate?.('/app/customers')} className="p-4 bg-gradient-to-br from-[var(--rose-gold)] to-[var(--rose-gold-dark)] text-white rounded-xl text-left shadow-lg active:scale-95 transition-transform">
            <Users className="w-6 h-6 mb-2" />
            <p className="font-medium text-sm">Tüm Müşteriler</p>
          </button>
          <button onClick={() => onNavigate?.('/app/analytics')} className="p-4 bg-gradient-to-br from-[var(--deep-indigo)] to-[var(--deep-indigo-light)] text-white rounded-xl text-left shadow-lg active:scale-95 transition-transform">
            <TrendingUp className="w-6 h-6 mb-2" />
            <p className="font-medium text-sm">Analiz Raporu</p>
          </button>
        </div>
      </div>
    </div>
  );
}
