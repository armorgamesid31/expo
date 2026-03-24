import { useState } from 'react';
import { X, Search, AlertCircle, Sparkles } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { customers, staff, services } from '../../data/mockData';

interface AppointmentModalProps {
  open: boolean;
  onClose: () => void;
}

export function AppointmentModal({ open, onClose }: AppointmentModalProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [autoAssign, setAutoAssign] = useState(true);
  const [selectedDate, setSelectedDate] = useState('2026-02-26');
  const [selectedTime, setSelectedTime] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const hasConflict = selectedTime && selectedStaff && selectedServices.length > 0;
  const showConflictWarning = hasConflict && Math.random() > 0.7; // Mock conflict detection

  // Seçili hizmetlerden herhangi biri uzman seçimi gerektiriyor mu?
  const requiresSpecialistSelection = selectedServices.some(serviceId => {
    const service = services.find(s => s.id === serviceId);
    return service?.allowSpecialistSelection;
  });

  // Specialist selection gerektiren hizmetler varsa otomatik atamayı devre dışı bırak
  const canAutoAssign = !requiresSpecialistSelection;

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const totalDuration = selectedServices.reduce((sum, id) => {
    const service = services.find(s => s.id === id);
    return sum + (service?.duration || 0);
  }, 0);

  const totalPrice = selectedServices.reduce((sum, id) => {
    const service = services.find(s => s.id === id);
    return sum + (service?.price || 0);
  }, 0);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle>New Appointment</SheetTitle>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <SheetDescription className="sr-only">
              Create a new appointment by selecting customer, service, and date
            </SheetDescription>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Customer Selection */}
            <div className="space-y-3">
              <Label>Select Customer</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {filteredCustomers.slice(0, 5).map(customer => (
                  <button
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer.id)}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      selectedCustomer === customer.id
                        ? 'border-[var(--rose-gold)] bg-[var(--rose-gold)]/5'
                        : 'border-border hover:border-[var(--rose-gold)]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.phone}</p>
                      </div>
                      <Badge 
                        variant="secondary"
                        className={
                          customer.riskLevel === 'high' ? 'bg-red-500/10 text-red-700 dark:text-red-300' :
                          customer.riskLevel === 'medium' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' :
                          'bg-green-500/10 text-green-700 dark:text-green-300'
                        }
                      >
                        {customer.riskLevel}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Multi-Service Selection */}
            <div className="space-y-3">
              <Label>Select Service</Label>
              <div className="grid grid-cols-2 gap-2">
                {services.map(service => (
                  <button
                    key={service.id}
                    onClick={() => toggleService(service.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedServices.includes(service.id)
                        ? 'border-[var(--rose-gold)] bg-[var(--rose-gold)]/5'
                        : 'border-border hover:border-[var(--rose-gold)]/50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div 
                        className="w-3 h-3 rounded-full mt-0.5" 
                        style={{ backgroundColor: service.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs truncate">{service.name}</p>
                        <p className="text-xs text-muted-foreground">{service.duration} min</p>
                        <p className="text-xs font-semibold mt-1">₺{service.price}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {selectedServices.length > 1 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Sequential booking: Services will be applied in sequence
                  </p>
                </div>
              )}
              {selectedServices.length > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Duration:</span>
                  <span className="font-semibold">{totalDuration} dakika</span>
                </div>
              )}
            </div>

            {/* Staff Selection with Auto-assign */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Personel Ata</Label>
                {canAutoAssign && (
                  <div className="flex items-center gap-2">
                    <Switch checked={autoAssign} onCheckedChange={setAutoAssign} />
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Auto-assign
                    </span>
                  </div>
                )}
              </div>
              
              {requiresSpecialistSelection && (
                <div className="p-3 bg-[var(--rose-gold)]/10 border border-[var(--rose-gold)]/20 rounded-lg">
                  <p className="text-xs text-[var(--rose-gold)]">
                    Specialist selection is required for selected services
                  </p>
                </div>
              )}

              {(!autoAssign || requiresSpecialistSelection) && (
                <div className="grid grid-cols-3 gap-2">
                  {staff.map(member => (
                    <button
                      key={member.id}
                      onClick={() => setSelectedStaff(member.id)}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        selectedStaff === member.id
                          ? 'border-[var(--rose-gold)] bg-[var(--rose-gold)]/5'
                          : 'border-border hover:border-[var(--rose-gold)]/50'
                      }`}
                    >
                      <div 
                        className="w-8 h-8 rounded-full mx-auto mb-2" 
                        style={{ backgroundColor: member.color }}
                      />
                      <p className="font-medium text-xs">{member.name}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tarih</Label>
                <Input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Saat</Label>
                <Input 
                  type="time" 
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                />
              </div>
            </div>

            {/* Conflict Detection */}
            {showConflictWarning && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">
                    Time Conflict Detected
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {selectedStaff ? staff.find(s => s.id === selectedStaff)?.name : 'Selected staff'} already has another appointment at this time. Please select a different time.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border p-4 space-y-3">
            {selectedServices.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Toplam:</span>
                <span className="text-lg font-bold text-[var(--rose-gold)]">₺{totalPrice}</span>
              </div>
            )}
            <Button 
              className="w-full bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)] h-12"
              disabled={!selectedCustomer || selectedServices.length === 0 || !selectedTime}
            >
              Create Appointment
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}