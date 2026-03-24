export type UserRole = 'admin' | 'specialist';

export type RiskLevel = 'low' | 'medium' | 'high';

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show';

export type ServiceCategory = 
  | 'HAIR' 
  | 'LASER' 
  | 'SKINCARE' 
  | 'NAILS' 
  | 'BROWS_LASHES' 
  | 'WAXING' 
  | 'BODY_CARE' 
  | 'MAKEUP' 
  | 'CONSULTATION';

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  HAIR: 'Hair',
  LASER: 'Lazer Epilasyon',
  SKINCARE: 'Skin Care',
  NAILS: 'Nail',
  BROWS_LASHES: 'Eyebrow & Eyelash',
  WAXING: 'waxing',
  BODY_CARE: 'Body Care',
  MAKEUP: 'Makyaj',
  CONSULTATION: 'Consulting',
};

export interface Staff {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  color: string;
  serviceIds?: string[]; // İlişkili hizmet ID'leri
  customPricing?: Record<string, number>; // serviceId -> özel fiyat
  customDuration?: Record<string, number>; // serviceId -> özel süre
}

export interface Service {
  id: string;
  name: string;
  duration: number; // minutes
  price: number;
  color: string;
  category: ServiceCategory;
  categoryOrder?: number; // Kategori içindeki sıralama
  allowSpecialistSelection?: boolean; // Customer uzman seçebilir mi?
}

export interface CategoryOrder {
  category: ServiceCategory;
  order: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar?: string;
  visitCount: number;
  totalSpent: number;
  noShowCount: number;
  riskLevel: RiskLevel;
  lastVisit: string;
  notes: string;
}

export interface Appointment {
  id: string;
  customerId: string;
  customerName: string;
  staffId: string;
  staffName: string;
  services: Service[];
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  date: string;
  notes?: string;
}

export interface Visit {
  id: string;
  date: string;
  services: string[];
  total: number;
  staff: string;
  status: AppointmentStatus;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  unit: string;
  price: number;
  supplier: string;
}

export interface DashboardStats {
  todayRevenue: number;
  monthRevenue: number;
  newCustomers: number;
  returningCustomers: number;
  todayAppointments: number;
  completedAppointments: number;
}

export interface StaffPerformance {
  staffId: string;
  staffName: string;
  revenue: number;
  appointments: number;
  avgRating: number;
}