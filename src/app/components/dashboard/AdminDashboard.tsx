import { TrendingUp, Users, UserCheck, UserPlus, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { dashboardStats, revenueChartData } from '../../data/mockData';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SetupChecklist } from './SetupChecklist';

interface AdminDashboardProps {
  onNavigate?: (screen: string) => void;
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const stats = [
    {
      title: "Bugünün Cirosu",
      value: `₺${dashboardStats.todayRevenue.toLocaleString()}`,
      subtitle: `${dashboardStats.completedAppointments}/${dashboardStats.todayAppointments} randevu`,
      icon: DollarSign,
      color: 'var(--rose-gold)',
    },
    {
      title: 'Aylık Toplam',
      value: `₺${dashboardStats.monthRevenue.toLocaleString()}`,
      subtitle: 'Geçen aya göre +%18',
      icon: TrendingUp,
      color: 'var(--deep-indigo)',
    },
    {
      title: 'Yeni Müşteriler',
      value: dashboardStats.newCustomers.toString(),
      subtitle: 'Bu ay',
      icon: UserPlus,
      color: 'var(--rose-gold-light)',
    },
    {
      title: 'Sadık Müşteriler',
      value: dashboardStats.returningCustomers.toString(),
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

      {/* Setup Checklist - Displayed only if empty state is true */}
      {onNavigate && (
        <div className="px-4">
          <SetupChecklist onNavigate={onNavigate} />
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
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--rose-gold)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--rose-gold)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid key="grid" strokeDasharray="3 3" opacity={0.1} />
                <XAxis 
                  key="xaxis"
                  dataKey="date" 
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
          <button className="p-4 bg-gradient-to-br from-[var(--rose-gold)] to-[var(--rose-gold-dark)] text-white rounded-xl text-left shadow-lg active:scale-95 transition-transform">
            <Users className="w-6 h-6 mb-2" />
            <p className="font-medium text-sm">Tüm Müşteriler</p>
          </button>
          <button className="p-4 bg-gradient-to-br from-[var(--deep-indigo)] to-[var(--deep-indigo-light)] text-white rounded-xl text-left shadow-lg active:scale-95 transition-transform">
            <TrendingUp className="w-6 h-6 mb-2" />
            <p className="font-medium text-sm">Analiz Raporu</p>
          </button>
        </div>
      </div>
    </div>
  );
}