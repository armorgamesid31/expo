import { Clock, TrendingUp, Star, Calendar } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { appointments, staff } from '../../data/mockData';
import { Badge } from '../ui/badge';

export function SpecialistDashboard() {
  // Mock data for logged-in specialist (Sevcan)
  const currentStaff = staff[0];
  const myAppointments = appointments.filter(a => a.staffId === currentStaff.id);
  const nextAppointment = myAppointments.find(a => a.status === 'scheduled');
  
  const todayPoints = 450; // Mock points earned today
  const monthlyGoal = 5000;
  const monthlyProgress = 3200;
  const progressPercent = (monthlyProgress / monthlyGoal) * 100;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="pt-6 px-4">
        <h1 className="text-2xl font-semibold mb-1">Merhaba, {currentStaff.name}</h1>
        <p className="text-muted-foreground text-sm">Bugünü harika yapmaya hazır mısın!</p>
      </div>

      {/* Next Client Card - Large Focus */}
      {nextAppointment && (
        <div className="px-4">
          <Card className="border-2 border-[var(--rose-gold)]/30 bg-gradient-to-br from-[var(--rose-gold)]/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Sıradaki Müşteri</p>
                  <h2 className="text-2xl font-semibold">{nextAppointment.customerName}</h2>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[var(--rose-gold)]">{nextAppointment.startTime}</p>
                  <p className="text-xs text-muted-foreground">45 dk sonra</p>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                {nextAppointment.services.map((service, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-2 text-sm p-2 rounded-lg bg-card"
                  >
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: service.color }}
                    />
                    <span>{service.name}</span>
                    <span className="text-muted-foreground ml-auto">{service.duration} min</span>
                  </div>
                ))}
              </div>

              {nextAppointment.notes && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    <strong>Not:</strong> {nextAppointment.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Points & Stats */}
      <div className="grid grid-cols-2 gap-4 px-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--deep-indigo)]/10 flex items-center justify-center">
                <Star className="w-4 h-4 text-[var(--deep-indigo)]" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[var(--deep-indigo)]">+{todayPoints}</p>
            <p className="text-xs text-muted-foreground">Bugün Kazanılan Puan</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--rose-gold)]/10 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-[var(--rose-gold)]" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[var(--rose-gold)]">{myAppointments.length}</p>
            <p className="text-xs text-muted-foreground">Bugünkü Randevular</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Goal Progress */}
      <div className="px-4">
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[var(--rose-gold)]" />
                <span className="font-medium">Aylık Hedef</span>
              </div>
              <span className="text-sm text-muted-foreground">
                ₺{monthlyProgress.toLocaleString()} / ₺{monthlyGoal.toLocaleString()}
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[var(--rose-gold)] to-[var(--rose-gold-dark)] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              %{Math.round(progressPercent)} tamamlandı - Harikasın!
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Schedule Preview */}
      <div className="px-4">
        <h2 className="text-lg font-semibold mb-3">Bugünün Programı</h2>
        <div className="space-y-2">
          {myAppointments.map((apt) => (
            <Card key={apt.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="text-center min-w-[60px]">
                    <p className="text-sm font-semibold">{apt.startTime}</p>
                    <p className="text-xs text-muted-foreground">{apt.endTime}</p>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{apt.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {apt.services.map(s => s.name).join(', ')}
                    </p>
                  </div>
                  <Badge 
                    variant={apt.status === 'completed' ? 'secondary' : 'default'}
                    className={apt.status === 'completed' ? 'bg-green-500/10 text-green-700 dark:text-green-300' : ''}
                  >
                    {apt.status === 'completed' ? (
                      <Clock className="w-3 h-3" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-[var(--rose-gold)] animate-pulse" />
                    )}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}