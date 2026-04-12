import { useState } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, User, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { staff as initialStaff, services as initialServices } from '../../data/mockData';
import { Staff, Service, SERVICE_CATEGORY_LABELS } from '../../types';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Switch } from '../ui/switch';

interface StaffManagementProps {
  onBack: () => void;
}

export function StaffManagement({ onBack }: StaffManagementProps) {
  const [staffList, setStaffList] = useState<Staff[]>(initialStaff);
  const [services] = useState<Service[]>(initialServices);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Staff>>({});
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [customPricing, setCustomPricing] = useState<Record<string, number>>({});
  const [customDuration, setCustomDuration] = useState<Record<string, number>>({});
  const [customPricingEnabled, setCustomPricingEnabled] = useState<Record<string, boolean>>({});
  const [customDurationEnabled, setCustomDurationEnabled] = useState<Record<string, boolean>>({});

  // En az 1 hizmet olmalı
  const hasServices = services.length > 0;

  const openAddDialog = () => {
    setFormData({ color: '#B76E79' });
    setEditingStaff(null);
    setSelectedServices(new Set());
    setCustomPricing({});
    setCustomDuration({});
    setCustomPricingEnabled({});
    setCustomDurationEnabled({});
    setIsDialogOpen(true);
  };

  const openEditDialog = (staff: Staff) => {
    setFormData(staff);
    setEditingStaff(staff);
    setSelectedServices(new Set(staff.serviceIds || []));
    setCustomPricing(staff.customPricing || {});
    setCustomDuration(staff.customDuration || {});

    // Enabled state'leri ayarla
    const pricingEnabled: Record<string, boolean> = {};
    const durationEnabled: Record<string, boolean> = {};

    (staff.serviceIds || []).forEach((serviceId) => {
      pricingEnabled[serviceId] = !!staff.customPricing?.[serviceId];
      durationEnabled[serviceId] = !!staff.customDuration?.[serviceId];
    });

    setCustomPricingEnabled(pricingEnabled);
    setCustomDurationEnabled(durationEnabled);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.role || selectedServices.size === 0) {
      return;
    }

    // Sadece etkin olan custom fiyat ve süreleri kaydet
    const finalCustomPricing: Record<string, number> = {};
    const finalCustomDuration: Record<string, number> = {};

    selectedServices.forEach((serviceId) => {
      if (customPricingEnabled[serviceId] && customPricing[serviceId]) {
        finalCustomPricing[serviceId] = customPricing[serviceId];
      }
      if (customDurationEnabled[serviceId] && customDuration[serviceId]) {
        finalCustomDuration[serviceId] = customDuration[serviceId];
      }
    });

    const staffData: Staff = {
      id: editingStaff?.id || `staff${Date.now()}`,
      name: formData.name!,
      role: formData.role!,
      color: formData.color || '#B76E79',
      avatar: formData.avatar,
      serviceIds: Array.from(selectedServices),
      customPricing: Object.keys(finalCustomPricing).length > 0 ? finalCustomPricing : undefined,
      customDuration: Object.keys(finalCustomDuration).length > 0 ? finalCustomDuration : undefined
    };

    if (editingStaff) {
      setStaffList(staffList.map((s) => s.id === editingStaff.id ? staffData : s));
    } else {
      setStaffList([...staffList, staffData]);
    }

    setIsDialogOpen(false);
    setFormData({});
  };

  const handleDelete = (staffId: string) => {
    if (confirm('Bu personeli silmek istediğinizden emin misiniz?')) {
      setStaffList(staffList.filter((s) => s.id !== staffId));
    }
  };

  const toggleService = (serviceId: string) => {
    const newSelected = new Set(selectedServices);
    if (newSelected.has(serviceId)) {
      newSelected.delete(serviceId);
      // Remove custom pricing/duration for unselected service
      const newPricing = { ...customPricing };
      const newDuration = { ...customDuration };
      const newPricingEnabled = { ...customPricingEnabled };
      const newDurationEnabled = { ...customDurationEnabled };
      delete newPricing[serviceId];
      delete newDuration[serviceId];
      delete newPricingEnabled[serviceId];
      delete newDurationEnabled[serviceId];
      setCustomPricing(newPricing);
      setCustomDuration(newDuration);
      setCustomPricingEnabled(newPricingEnabled);
      setCustomDurationEnabled(newDurationEnabled);
    } else {
      newSelected.add(serviceId);
    }
    setSelectedServices(newSelected);
  };

  const getServiceById = (id: string) => services.find((s) => s.id === id);

  // Group services by category
  const servicesByCategory = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  return (
    <div className="h-full pb-20 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-border bg-[var(--luxury-bg)] sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">Personel Management</h1>
            <p className="text-sm text-muted-foreground">Personel ve yetkiler</p>
          </div>
          <Button
            onClick={openAddDialog}
            disabled={!hasServices}
            style={{ backgroundColor: hasServices ? 'var(--rose-gold)' : undefined, color: hasServices ? 'white' : undefined }}>
            
            <Plus className="w-4 h-4 mr-1" />
            Ekle
          </Button>
        </div>

        {!hasServices &&
        <Alert className="mt-3 border-amber-500/50 bg-amber-500/10">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-800">
              To add staff, define at least one service first.
            </AlertDescription>
          </Alert>
        }
      </div>

      {/* Staff List */}
      <div className="p-4 space-y-3">
        {staffList.map((staff) =>
        <Card key={staff.id} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div
                className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 text-white"
                style={{ backgroundColor: staff.color }}>
                
                  {staff.avatar ?
                <img src={staff.avatar} alt={staff.name} className="w-full h-full rounded-full object-cover" /> :

                <User className="w-7 h-7" />
                }
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">{staff.name}</h3>
                  <p className="text-sm text-muted-foreground">{staff.role}</p>
                  
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {(staff.serviceIds || []).map((serviceId) => {
                    const service = getServiceById(serviceId);
                    if (!service) return null;

                    const hasCustomPrice = !!staff.customPricing?.[serviceId];
                    const hasCustomDuration = !!staff.customDuration?.[serviceId];

                    return (
                      <Badge
                        key={serviceId}
                        variant="secondary"
                        className="text-xs"
                        style={{
                          backgroundColor: hasCustomPrice || hasCustomDuration ? `${service.color}20` : undefined,
                          borderColor: hasCustomPrice || hasCustomDuration ? service.color : undefined
                        }}>
                        
                          {service.name}
                          {(hasCustomPrice || hasCustomDuration) &&
                        <span className="ml-1 text-[10px] opacity-70">
                              {hasCustomPrice && `₺${staff.customPricing![serviceId]}`}
                              {hasCustomPrice && hasCustomDuration && ' • '}
                              {hasCustomDuration && `${staff.customDuration![serviceId]}dk`}
                            </span>
                        }
                        </Badge>);

                  })}
                  </div>
                </div>

                <div className="flex gap-1 shrink-0">
                  <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => openEditDialog(staff)}>
                  
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDelete(staff.id)}>
                  
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {staffList.length === 0 && hasServices &&
        <Card className="border-border/50">
            <CardContent className="p-12 text-center">
              <div
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ backgroundColor: 'var(--rose-gold)15' }}>
              
                <User className="w-8 h-8" style={{ color: 'var(--rose-gold)' }} />
              </div>
              <p className="text-muted-foreground mb-4">Yok staff added yet</p>
              <Button onClick={openAddDialog} style={{ backgroundColor: 'var(--rose-gold)', color: 'white' }}>
                <Plus className="w-4 h-4 mr-1" />
                İlk Personeli Ekle
              </Button>
            </CardContent>
          </Card>
        }
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {editingStaff ? "Düzenle Employee" : "Ekle New Employee"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Ad Soyad *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Örneğin: Ayşe Yılmaz" />
                
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Unvan *</Label>
                <Input
                  id="role"
                  value={formData.role || ''}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="Örn: Saç Uzmanı" />
                
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Renk</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.color || '#B76E79'}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-16 h-10 p-1" />
                
                <Input
                  value={formData.color || '#B76E79'}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#B76E79"
                  className="flex-1" />
                
              </div>
            </div>

            {/* Services */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Hizmetler *</Label>
                <span className="text-xs text-muted-foreground">
                  {selectedServices.size} services selected
                </span>
              </div>

              {selectedServices.size === 0 &&
              <Alert className="border-amber-500/50 bg-amber-500/10">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-xs text-amber-800">
                    You must select at least one service
                  </AlertDescription>
                </Alert>
              }

              <div className="space-y-3 max-h-[400px] overflow-y-auto border border-border/50 rounded-lg p-3">
                {Object.entries(servicesByCategory).map(([category, categoryServices]) =>
                <div key={category} className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {SERVICE_CATEGORY_LABELS[category as keyof typeof SERVICE_CATEGORY_LABELS]}
                    </h4>
                    <div className="space-y-3 pl-2">
                      {categoryServices.map((service) => {
                      const isSelected = selectedServices.has(service.id);
                      const showCustomOptions = isSelected;

                      return (
                        <div key={service.id} className="space-y-2">
                            <div className="flex items-center gap-3">
                              <Checkbox
                              id={`service-${service.id}`}
                              checked={isSelected}
                              onCheckedChange={() => toggleService(service.id)} />
                            
                              <div
                              className="w-6 h-6 rounded"
                              style={{ backgroundColor: service.color }} />
                            
                              <label
                              htmlFor={`service-${service.id}`}
                              className="flex-1 text-sm font-medium cursor-pointer">
                              
                                {service.name}
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({service.duration}dk • ₺{service.price})
                                </span>
                              </label>
                            </div>

                            {/* Özel Fiyat ve Süre */}
                            {showCustomOptions &&
                          <div className="ml-9 space-y-2 p-3 bg-muted/30 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <Switch
                                id={`custom-price-${service.id}`}
                                checked={customPricingEnabled[service.id] || false}
                                onCheckedChange={(checked) => {
                                  setCustomPricingEnabled({ ...customPricingEnabled, [service.id]: checked });
                                  if (!checked) {
                                    const newPricing = { ...customPricing };
                                    delete newPricing[service.id];
                                    setCustomPricing(newPricing);
                                  }
                                }} />
                              
                                  <Label htmlFor={`custom-price-${service.id}`} className="text-xs flex-1">
                                    Özel Fiyat
                                  </Label>
                                  {customPricingEnabled[service.id] &&
                              <Input
                                type="number"
                                value={customPricing[service.id] || ''}
                                onChange={(e) => setCustomPricing({
                                  ...customPricing,
                                  [service.id]: parseFloat(e.target.value)
                                })}
                                placeholder={`${service.price}`}
                                className="w-24 h-8 text-xs" />

                              }
                                </div>

                                <div className="flex items-center gap-3">
                                  <Switch
                                id={`custom-duration-${service.id}`}
                                checked={customDurationEnabled[service.id] || false}
                                onCheckedChange={(checked) => {
                                  setCustomDurationEnabled({ ...customDurationEnabled, [service.id]: checked });
                                  if (!checked) {
                                    const newDuration = { ...customDuration };
                                    delete newDuration[service.id];
                                    setCustomDuration(newDuration);
                                  }
                                }} />
                              
                                  <Label htmlFor={`custom-duration-${service.id}`} className="text-xs flex-1">
                                    Özel Süre
                                  </Label>
                                  {customDurationEnabled[service.id] &&
                              <Input
                                type="number"
                                value={customDuration[service.id] || ''}
                                onChange={(e) => setCustomDuration({
                                  ...customDuration,
                                  [service.id]: parseInt(e.target.value)
                                })}
                                placeholder={`${service.duration}`}
                                className="w-24 h-8 text-xs" />

                              }
                                </div>
                              </div>
                          }
                          </div>);

                    })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              İptal
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name || !formData.role || selectedServices.size === 0}
              style={{ backgroundColor: 'var(--rose-gold)', color: 'white' }}>
              
              {editingStaff ? "Güncelle" : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}