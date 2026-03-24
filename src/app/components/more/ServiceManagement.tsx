import { useState } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { services as initialServices, categoryOrders as initialCategoryOrders } from '../../data/mockData';
import { Service, ServiceCategory, SERVICE_CATEGORY_LABELS, CategoryOrder } from '../../types';
import { Badge } from '../ui/badge';

interface ServiceManagementProps {
  onBack: () => void;
}

export function ServiceManagement({ onBack }: ServiceManagementProps) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [categoryOrders, setCategoryOrders] = useState<CategoryOrder[]>(initialCategoryOrders);
  const [expandedCategories, setExpandedCategories] = useState<Set<ServiceCategory>>(new Set(['HAIR']));
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Service>>({});

  // Categoryleri sırala
  const sortedCategories = [...categoryOrders]
    .sort((a, b) => a.order - b.order)
    .map(co => co.category);

  // Categoryye göre hizmetleri grupla
  const getServicesByCategory = (category: ServiceCategory) => {
    return services
      .filter(s => s.category === category)
      .sort((a, b) => (a.categoryOrder || 0) - (b.categoryOrder || 0));
  };

  const toggleCategory = (category: ServiceCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const openAddDialog = (category: ServiceCategory) => {
    const categoryServices = getServicesByCategory(category);
    const maxOrder = categoryServices.length > 0 
      ? Math.max(...categoryServices.map(s => s.categoryOrder || 0))
      : -1;
    
    setFormData({ 
      category, 
      categoryOrder: maxOrder + 1,
      duration: 60,
      price: 0,
      color: '#B76E79'
    });
    setEditingService(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (service: Service) => {
    setFormData(service);
    setEditingService(service);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.duration || !formData.price || !formData.category) {
      return;
    }

    if (editingService) {
      // Updateme
      setServices(services.map(s => s.id === editingService.id ? { ...formData as Service } : s));
    } else {
      // New ekleme
      const newService: Service = {
        id: `s${Date.now()}`,
        name: formData.name!,
        duration: formData.duration!,
        price: formData.price!,
        color: formData.color || '#B76E79',
        category: formData.category!,
        categoryOrder: formData.categoryOrder || 0,
        allowSpecialistSelection: formData.allowSpecialistSelection || false,
      };
      setServices([...services, newService]);
    }

    setIsDialogOpen(false);
    setFormData({});
  };

  const handleDelete = (serviceId: string) => {
    if (confirm('Are you sure you want to delete this service?')) {
      setServices(services.filter(s => s.id !== serviceId));
    }
  };

  const moveCategoryUp = (index: number) => {
    if (index === 0) return;
    const newOrders = [...categoryOrders];
    [newOrders[index], newOrders[index - 1]] = [newOrders[index - 1], newOrders[index]];
    newOrders[index].order = index;
    newOrders[index - 1].order = index - 1;
    setCategoryOrders(newOrders);
  };

  const moveCategoryDown = (index: number) => {
    if (index === categoryOrders.length - 1) return;
    const newOrders = [...categoryOrders];
    [newOrders[index], newOrders[index + 1]] = [newOrders[index + 1], newOrders[index]];
    newOrders[index].order = index;
    newOrders[index + 1].order = index + 1;
    setCategoryOrders(newOrders);
  };

  return (
    <div className="h-full pb-20 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-border bg-[var(--luxury-bg)] sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">Service Management</h1>
            <p className="text-sm text-muted-foreground">Services and categories</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {sortedCategories.map((category, catIndex) => {
          const categoryServices = getServicesByCategory(category);
          const isExpanded = expandedCategories.has(category);
          const categoryOrderItem = categoryOrders.find(co => co.category === category);

          return (
            <Card key={category} className="border-border/50 overflow-hidden">
              {/* Category Header */}
              <div 
                className="p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleCategory(category)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveCategoryUp(catIndex);
                      }}
                      disabled={catIndex === 0}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveCategoryDown(catIndex);
                      }}
                      disabled={catIndex === sortedCategories.length - 1}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{SERVICE_CATEGORY_LABELS[category]}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {categoryServices.length} hizmet
                      </Badge>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openAddDialog(category);
                    }}
                    className="shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Services List */}
              {isExpanded && categoryServices.length > 0 && (
                <div className="divide-y divide-border/30">
                  {categoryServices.map((service) => (
                    <CardContent key={service.id} className="p-4 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg shrink-0"
                          style={{ backgroundColor: service.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{service.name}</p>
                          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                            <span>{service.duration} dk</span>
                            <span>₺{service.price}</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(service)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(service.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  ))}
                </div>
              )}

              {isExpanded && categoryServices.length === 0 && (
                <CardContent className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No services in this category yet
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => openAddDialog(category)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add First Service
                  </Button>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Edit Service' : 'Add New Service'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Service Name</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Cutting & Styling"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration || ''}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  placeholder="60"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Fiyat (₺)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price || ''}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  placeholder="150"
                />
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
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={formData.color || '#B76E79'}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#B76E79"
                  className="flex-1"
                />
              </div>
            </div>

            {!editingService && (
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: ServiceCategory) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {SERVICE_CATEGORY_LABELS[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="specialist-selection">Allow Specialist Selection</Label>
                <Switch
                  id="specialist-selection"
                  checked={formData.allowSpecialistSelection || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, allowSpecialistSelection: checked })}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                If enabled, customers can choose their preferred specialist for this service
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.name || !formData.duration || !formData.price || !formData.category}
              style={{ backgroundColor: 'var(--rose-gold)', color: 'white' }}
            >
              {editingService ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}