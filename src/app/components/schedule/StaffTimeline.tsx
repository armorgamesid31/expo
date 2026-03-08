import { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { staff, appointments } from '../../data/mockData';
import { ScrollArea } from '../ui/scroll-area';
import { AppointmentModal } from './AppointmentModal';

interface StaffTimelineProps {
  onNavigate?: (tab: string) => void;
}

export function StaffTimeline({ onNavigate }: StaffTimelineProps) {
  const [showModal, setShowModal] = useState(false);
  
  // Generate time slots from 9 AM to 8 PM
  const timeSlots = Array.from({ length: 12 }, (_, i) => {
    const hour = 9 + i;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  const getAppointmentsForStaffAtTime = (staffId: string, time: string) => {
    return appointments.filter(apt => {
      if (apt.staffId !== staffId || apt.status === 'cancelled') return false;
      const [aptHour] = apt.startTime.split(':').map(Number);
      const [slotHour] = time.split(':').map(Number);
      const [endHour] = apt.endTime.split(':').map(Number);
      return aptHour <= slotHour && slotHour < endHour;
    });
  };

  const calculateBlockHeight = (startTime: string, endTime: string) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const durationInMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    return (durationInMinutes / 60) * 80; // 80px per hour
  };

  const calculateTopOffset = (startTime: string, slotTime: string) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [slotHour] = slotTime.split(':').map(Number);
    const offsetMinutes = (startHour * 60 + startMin) - (slotHour * 60);
    return (offsetMinutes / 60) * 80;
  };

  return (
    <div className="h-full pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-background z-10 border-b border-border">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold">Randevu Takvimi</h1>
            <Button 
              size="sm" 
              className="bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)]"
              onClick={() => setShowModal(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Yeni Randevu
            </Button>
          </div>
          
          {/* Date Navigation */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center">
              <p className="font-semibold">Perşembe, 26 Şubat</p>
              <p className="text-xs text-muted-foreground">Bugün</p>
            </div>
            <Button variant="ghost" size="sm">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Timeline Grid */}
      <ScrollArea className="h-[calc(100vh-240px)] relative">
        <div className="flex">
          {/* Time Column */}
          <div className="sticky left-0 bg-background z-10 w-16 border-r border-border">
            <div className="h-12" /> {/* Header spacer */}
            {timeSlots.map((time) => (
              <div key={time} className="h-20 border-b border-border/50 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">{time}</span>
              </div>
            ))}
          </div>

          {/* Staff Columns */}
          <div className="flex flex-1 overflow-x-auto">
            {staff.map((member) => (
              <div key={member.id} className="min-w-[140px] flex-1 border-r border-border">
                {/* Staff Header */}
                <div className="h-12 border-b border-border p-2 bg-card/50 sticky top-0">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: member.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate">{member.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{member.role}</p>
                    </div>
                  </div>
                </div>

                {/* Time Slots */}
                <div className="relative">
                  {timeSlots.map((time, idx) => {
                    const aptsAtTime = getAppointmentsForStaffAtTime(member.id, time);
                    const firstSlotApt = aptsAtTime.find(apt => apt.startTime === time);

                    return (
                      <div 
                        key={time}
                        className="h-20 border-b border-border/50 p-1 hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        {firstSlotApt && (
                          <div
                            className="absolute left-1 right-1 rounded-lg p-2 shadow-sm overflow-hidden"
                            style={{
                              backgroundColor: `${firstSlotApt.services[0].color}20`,
                              borderLeft: `3px solid ${firstSlotApt.services[0].color}`,
                              height: `${calculateBlockHeight(firstSlotApt.startTime, firstSlotApt.endTime) - 4}px`,
                              top: `${48 + (idx * 80) + calculateTopOffset(firstSlotApt.startTime, time)}px`,
                            }}
                          >
                            <p className="text-xs font-medium truncate">{firstSlotApt.customerName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {firstSlotApt.services[0].name}
                            </p>
                            {firstSlotApt.services.length > 1 && (
                              <div className="mt-1 flex items-center gap-1">
                                <div 
                                  className="w-1.5 h-1.5 rounded-full" 
                                  style={{ backgroundColor: firstSlotApt.services[1].color }}
                                />
                                <p className="text-[9px] text-muted-foreground truncate">
                                  +{firstSlotApt.services[1].name}
                                </p>
                              </div>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {firstSlotApt.startTime} - {firstSlotApt.endTime}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Legend */}
      <div className="fixed bottom-20 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border p-3">
        <div className="flex items-center gap-4 justify-center flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-green-500/20 border-l-2 border-green-500" />
            <span className="text-xs text-muted-foreground">Tamamlandı</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[var(--rose-gold)]/20 border-l-2 border-[var(--rose-gold)]" />
            <span className="text-xs text-muted-foreground">Planlandı</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-amber-500/20 border-l-2 border-amber-500" />
            <span className="text-xs text-muted-foreground">Ardışık Hizmet</span>
          </div>
        </div>
      </div>

      <AppointmentModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}