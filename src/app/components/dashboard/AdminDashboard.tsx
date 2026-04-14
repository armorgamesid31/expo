import { TrendingUp, Users, UserCheck, UserPlus, DollarSign } from 'lucide-react';
import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SetupChecklist } from './SetupChecklist';
import { Skeleton } from '../ui/skeleton';

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
  const weekData = analyticsSeries ?
    analyticsSeries :
    [
      { label: 'Pzt', revenue: 0, appointments: 0, date: '' },
      { label: 'Sal', revenue: 0, appointments: 0, date: '' },
      { label: 'Çar', revenue: 0, appointments: 0, date: '' },
      { label: 'Per', revenue: 0, appointments: 0, date: '' },
      { label: 'Cum', revenue: 0, appointments: 0, date: '' },
      { label: 'Cmt', revenue: 0, appointments: 0, date: '' },
      { label: 'Paz', revenue: 0, appointments: 0, date: '' }];

  const todayPoint = weekData[weekData.length - 1];
  const monthlyRevenue = analytics?.metrics?.revenue || 0;
  const newCustomers = analytics?.metrics?.newCustomers || 0;
  const totalCustomers = analytics?.metrics?.totalCustomers || 0;
  const returningCustomers = Math.max(totalCustomers - newCustomers, 0);
  const completedAppointments = analytics?.metrics?.completedAppointments || 0;
  const totalAppointments = analytics?.metrics?.totalAppointments || 0;
  const checklistReady = checklist !== undefined;
  const setupCompleted =
    checklistReady && (
      Boolean(checklist?.completed) ||
      Boolean(checklist?.workingHours && checklist?.address && checklist?.phone && checklist?.service && checklist?.staff));

  const stats = [
    {
      title: 'Seçilen Gün Cirosu',
      value: `₺${(todayPoint?.revenue || 0).toLocaleString('tr-TR')}`,
      subtitle: `Seçilen aralıktaki son gün • ${todayPoint?.appointments || 0} randevu`,
      icon: DollarSign,
      color: 'var(--rose-gold)'
    },
    {
      title: 'Aylık Toplam',
      value: `₺${monthlyRevenue.toLocaleString('tr-TR')}`,
      subtitle: `${completedAppointments}/${totalAppointments} randevu tamamlandı`,
      icon: TrendingUp,
      color: 'var(--deep-indigo)'
    },
    {
      title: "Yeni Müşteri",
      value: newCustomers.toString(),
      subtitle: 'Bu ay',
      icon: UserPlus,
      color: 'var(--rose-gold-light)'
    },
    {
      title: "Sadık Müşteriler",
      value: returningCustomers.toString(),
      subtitle: "Geri Dönen Müşteriler",
      icon: UserCheck,
      color: 'var(--deep-indigo-light)'
    }];


  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="pt-6 px-1">
        <h1 className="text-2xl font-semibold mb-1">Hoş geldin</h1>
        <p className="text-muted-foreground text-sm">Salon performans özetin</p>
      </div>

      {dayNavigator ? <div className="px-1">{dayNavigator}</div> : null}
      {rangeError ? <p className="px-1 text-xs text-red-500">{rangeError}</p> : null}

      {/* Setup Checklist - Displayed only if empty state is true */}
      {onNavigate && checklistReady && !setupCompleted &&
        <div className="px-1">
          <SetupChecklist onNavigate={onNavigate} checklist={checklist} />
        </div>
      }

      {/* Stats Grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 px-1">
        {analytics ? stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border-border/50 overflow-hidden hover:shadow-sm transition-shadow h-full">
              <CardContent className="p-4 flex flex-col h-full justify-between">
                <div>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mb-3"
                    style={{ backgroundColor: `${stat.color}20` }}>
                    <Icon className="w-5 h-5 transition-transform group-hover:scale-110" style={{ color: stat.color }} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-1 mt-2">{stat.subtitle}</p>
              </CardContent>
            </Card>);

        }) : [1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-border/50 overflow-hidden h-full">
            <CardContent className="p-4 space-y-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-3 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Salon Pulse Chart */}
      <div className="px-1">
        <Card className="border-border/50 overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--rose-gold)] animate-pulse" />
              Salon Nabzı - Bu Hafta
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!analytics ? (
              <div className="h-[200px] flex items-end gap-2 pb-2">
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                  <Skeleton key={i} className="flex-1" style={{ height: `${20 + Math.random() * 60}%` }} />
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={weekData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--rose-gold)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--rose-gold)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid key="grid" strokeDasharray="3 3" opacity={0.1} />
                  <XAxis
                    key="xaxis"
                    dataKey="label"
                    tick={{ fontSize: 10, fontWeight: 600 }}
                    stroke="var(--muted-foreground)" />

                  <YAxis
                    key="yaxis"
                    tick={{ fontSize: 10, fontWeight: 600 }}
                    stroke="var(--muted-foreground)" />

                  <Tooltip
                    key="tooltip"
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                    }}
                    formatter={(value: any) => [`₺${Number(value || 0).toLocaleString('tr-TR')}`, 'Ciro']} />

                  <Area
                    key="area-revenue"
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--rose-gold)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRevenue)" />

                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="px-1">
        <h2 className="text-lg font-semibold mb-3">Hızlı Erişim</h2>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => onNavigate?.('/app/customers')} className="p-4 bg-gradient-to-br from-[var(--rose-gold)] to-[var(--rose-gold-dark)] text-white rounded-xl text-left shadow-lg active:scale-95 transition-transform flex flex-col justify-between h-24">
            <Users className="w-6 h-6" />
            <p className="font-medium text-sm">Tüm Müşteriler</p>
          </button>
          <button onClick={() => onNavigate?.('/app/analytics')} className="p-4 bg-gradient-to-br from-[var(--deep-indigo)] to-[var(--deep-indigo-light)] text-white rounded-xl text-left shadow-lg active:scale-95 transition-transform flex flex-col justify-between h-24">
            <TrendingUp className="w-6 h-6" />
            <p className="font-medium text-sm">Analitik Raporu</p>
          </button>
        </div>
      </div>
    </div>);

}
