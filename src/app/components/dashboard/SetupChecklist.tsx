import { CheckCircle2, Circle, ChevronRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { motion } from 'motion/react';

interface SetupTask {
  id: string;
  label: string;
  description: string;
  done: boolean;
  navigateTo: string;
  order: number;
}

interface SetupChecklistProps {
  onNavigate: (screen: string) => void;
}

export function SetupChecklist({ onNavigate }: SetupChecklistProps) {
  // Zorunlu kurulum adımları - sıralı
  const tasks: SetupTask[] = [
    {
      id: 'hours',
      label: 'Çalışma Saatleri',
      description: 'Salon çalışma saatlerini belirleyin',
      done: false,
      navigateTo: 'salon-info',
      order: 1,
    },
    {
      id: 'address',
      label: 'Adres Bilgisi',
      description: 'Salon adresini ekleyin',
      done: false,
      navigateTo: 'salon-info',
      order: 2,
    },
    {
      id: 'phone',
      label: 'Telefon Numarası',
      description: 'Salon iletişim numarasını girin',
      done: false,
      navigateTo: 'salon-info',
      order: 3,
    },
    {
      id: 'service',
      label: 'Hizmet Ekle',
      description: 'En az 1 hizmet tanımlayın',
      done: false,
      navigateTo: 'service-management',
      order: 4,
    },
    {
      id: 'staff',
      label: 'Personel Ekle',
      description: 'En az 1 çalışan ekleyin',
      done: false,
      navigateTo: 'staff-management',
      order: 5,
    },
  ];

  const sortedTasks = tasks.sort((a, b) => a.order - b.order);
  const completedCount = sortedTasks.filter(t => t.done).length;
  const totalCount = sortedTasks.length;
  const progressPercentage = (completedCount / totalCount) * 100;

  return (
    <Card className="border-[var(--rose-gold)]/30 bg-gradient-to-br from-[var(--rose-gold)]/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--rose-gold)]" />
            Zorunlu Kurulum Adımları
          </CardTitle>
          <span className="text-sm font-medium text-[var(--rose-gold)]">
            {completedCount}/{totalCount}
          </span>
        </div>
        {/* Progress Bar */}
        <div className="mt-3 w-full h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[var(--rose-gold)] to-[var(--rose-gold-dark)]"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {completedCount === totalCount
            ? '🎉 Tüm zorunlu adımlar tamamlandı!'
            : 'Sistemi kullanmaya başlamak için sırayla tamamlayın'}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedTasks.map((task, index) => (
          <motion.button
            key={task.id}
            onClick={() => onNavigate(task.navigateTo)}
            className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all group ${
              task.done
                ? 'bg-green-500/5 border-green-500/20 hover:bg-green-500/10'
                : 'bg-background/50 border-border/50 hover:bg-[var(--rose-gold)]/5 hover:border-[var(--rose-gold)]/30'
            }`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0">
                {task.order}
              </div>
              {task.done ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground group-hover:text-[var(--rose-gold)] shrink-0 transition-colors" />
              )}
              <div className="text-left">
                <p className={`text-sm font-medium ${task.done ? 'text-green-700 line-through' : 'text-foreground'}`}>
                  {task.label}
                </p>
                <p className="text-xs text-muted-foreground">{task.description}</p>
              </div>
            </div>
            <ChevronRight className={`w-4 h-4 shrink-0 transition-all ${
              task.done ? 'text-green-600' : 'text-muted-foreground group-hover:text-[var(--rose-gold)] group-hover:translate-x-1'
            }`} />
          </motion.button>
        ))}
      </CardContent>
    </Card>
  );
}