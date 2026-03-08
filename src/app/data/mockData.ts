import { Staff, Service, Customer, Appointment, InventoryItem, DashboardStats, StaffPerformance, Visit, CategoryOrder, ServiceCategory } from '../types';

export const categoryOrders: CategoryOrder[] = [
  { category: 'HAIR', order: 0 },
  { category: 'NAILS', order: 1 },
  { category: 'SKINCARE', order: 2 },
  { category: 'BROWS_LASHES', order: 3 },
  { category: 'BODY_CARE', order: 4 },
  { category: 'MAKEUP', order: 5 },
  { category: 'LASER', order: 6 },
  { category: 'WAXING', order: 7 },
  { category: 'CONSULTATION', order: 8 },
];

export const staff: Staff[] = [
  { 
    id: '1', 
    name: 'Sevcan', 
    role: 'Saç Uzmanı', 
    color: '#B76E79', 
    avatar: '',
    serviceIds: ['s1', 's2', 's8'],
    customPricing: { 's1': 180 }, // Sevcan için Haircut özel fiyat
  },
  { 
    id: '2', 
    name: 'Pınar', 
    role: 'Tırnak Uzmanı', 
    color: '#3C3F58', 
    avatar: '',
    serviceIds: ['s3', 's4'],
  },
  { 
    id: '3', 
    name: 'Ceren', 
    role: 'Cilt Bakım Uzmanı', 
    color: '#D4A5A5', 
    avatar: '',
    serviceIds: ['s5', 's6', 's7', 's8'],
    customDuration: { 's5': 75 }, // Ceren için Facial özel süre
  },
];

export const services: Service[] = [
  { id: 's1', name: 'Kesim & Şekillendirme', duration: 60, price: 150, color: '#B76E79', category: 'HAIR', categoryOrder: 0 },
  { id: 's2', name: 'Saç Boyama', duration: 120, price: 350, color: '#8B5A5A', category: 'HAIR', categoryOrder: 1 },
  { id: 's3', name: 'Manikür', duration: 45, price: 80, color: '#3C3F58', category: 'NAILS', categoryOrder: 0 },
  { id: 's4', name: 'Pedikür', duration: 60, price: 100, color: '#5A5E7D', category: 'NAILS', categoryOrder: 1 },
  { id: 's5', name: 'Cilt Bakımı', duration: 90, price: 200, color: '#D4A5A5', category: 'SKINCARE', categoryOrder: 0 },
  { id: 's6', name: 'Masaj', duration: 60, price: 180, color: '#7A7E9D', category: 'BODY_CARE', categoryOrder: 0 },
  { id: 's7', name: 'Kirpik Lifting', duration: 90, price: 250, color: '#B76E79', category: 'BROWS_LASHES', categoryOrder: 0 },
  { id: 's8', name: 'Makyaj', duration: 45, price: 120, color: '#D4A5A5', category: 'MAKEUP', categoryOrder: 0 },
];

export const customers: Customer[] = [
  {
    id: 'c1',
    name: 'Ayşe Yılmaz',
    phone: '+90 532 123 4567',
    email: 'ayse.yilmaz@example.com',
    visitCount: 24,
    totalSpent: 4200,
    noShowCount: 0,
    riskLevel: 'low',
    lastVisit: '2026-02-20',
    notes: 'Prefers Sevcan for haircuts. Allergic to certain hair dyes.',
  },
  {
    id: 'c2',
    name: 'Elif Demir',
    phone: '+90 533 234 5678',
    email: 'elif.demir@example.com',
    visitCount: 12,
    totalSpent: 1800,
    noShowCount: 1,
    riskLevel: 'low',
    lastVisit: '2026-02-18',
    notes: 'Regular manicure customer. Prefers natural colors.',
  },
  {
    id: 'c3',
    name: 'Zeynep Kaya',
    phone: '+90 534 345 6789',
    email: 'zeynep.kaya@example.com',
    visitCount: 8,
    totalSpent: 1200,
    noShowCount: 2,
    riskLevel: 'medium',
    lastVisit: '2026-02-15',
    notes: 'Has cancelled twice without notice. Monitor attendance.',
  },
  {
    id: 'c4',
    name: 'Fatma Özkan',
    phone: '+90 535 456 7890',
    email: 'fatma.ozkan@example.com',
    visitCount: 3,
    totalSpent: 450,
    noShowCount: 2,
    riskLevel: 'high',
    lastVisit: '2026-01-30',
    notes: 'High no-show risk. Require deposit for future bookings.',
  },
  {
    id: 'c5',
    name: 'Merve Şahin',
    phone: '+90 536 567 8901',
    email: 'merve.sahin@example.com',
    visitCount: 18,
    totalSpent: 3200,
    noShowCount: 0,
    riskLevel: 'low',
    lastVisit: '2026-02-22',
    notes: 'VIP client. Always books multiple services.',
  },
  {
    id: 'c6',
    name: 'Selin Arslan',
    phone: '+90 537 678 9012',
    email: 'selin.arslan@example.com',
    visitCount: 6,
    totalSpent: 900,
    noShowCount: 1,
    riskLevel: 'low',
    lastVisit: '2026-02-19',
    notes: 'Prefers afternoon appointments.',
  },
];

export const appointments: Appointment[] = [
  {
    id: 'a1',
    customerId: 'c1',
    customerName: 'Ayşe Yılmaz',
    staffId: '1',
    staffName: 'Sevcan',
    services: [services[0]],
    startTime: '09:00',
    endTime: '10:00',
    status: 'completed',
    date: '2026-02-26',
  },
  {
    id: 'a2',
    customerId: 'c2',
    customerName: 'Elif Demir',
    staffId: '2',
    staffName: 'Pınar',
    services: [services[2]],
    startTime: '10:00',
    endTime: '10:45',
    status: 'scheduled',
    date: '2026-02-26',
  },
  {
    id: 'a3',
    customerId: 'c5',
    customerName: 'Merve Şahin',
    staffId: '1',
    staffName: 'Sevcan',
    services: [services[0], services[1]],
    startTime: '11:00',
    endTime: '14:00',
    status: 'scheduled',
    date: '2026-02-26',
    notes: 'Sequential: Haircut then Coloring',
  },
  {
    id: 'a4',
    customerId: 'c3',
    customerName: 'Zeynep Kaya',
    staffId: '3',
    staffName: 'Ceren',
    services: [services[4]],
    startTime: '14:00',
    endTime: '15:30',
    status: 'scheduled',
    date: '2026-02-26',
  },
  {
    id: 'a5',
    customerId: 'c6',
    customerName: 'Selin Arslan',
    staffId: '2',
    staffName: 'Pınar',
    services: [services[2], services[3]],
    startTime: '15:00',
    endTime: '16:45',
    status: 'scheduled',
    date: '2026-02-26',
    notes: 'Sequential: Manicure then Pedicure',
  },
  {
    id: 'a6',
    customerId: 'c1',
    customerName: 'Ayşe Yılmaz',
    staffId: '1',
    staffName: 'Sevcan',
    services: [services[0]],
    startTime: '16:00',
    endTime: '17:00',
    status: 'scheduled',
    date: '2026-02-26',
  },
];

export const inventoryItems: InventoryItem[] = [
  { id: 'i1', name: 'Saç Boyası - Beyaz', category: 'Saç Boyası', currentStock: 3, minStock: 5, unit: 'şişe', price: 45, supplier: 'Güzellik Tedarik Co.' },
  { id: 'i2', name: 'Şampuan - Profesyonel', category: 'Saç Bakımı', currentStock: 12, minStock: 8, unit: 'şişe', price: 25, supplier: 'Salon Temelleri' },
  { id: 'i3', name: 'Tırnak Boyası - Kırmızı', category: 'Tırnak Bakımı', currentStock: 2, minStock: 4, unit: 'şişe', price: 15, supplier: 'Nail Art Pro' },
  { id: 'i4', name: 'Tırnak Boyası - Pembe', category: 'Tırnak Bakımı', currentStock: 8, minStock: 4, unit: 'şişe', price: 15, supplier: 'Nail Art Pro' },
  { id: 'i5', name: 'Yüz Maske - Nemlendirici', category: 'Cilt Bakımı', currentStock: 5, minStock: 6, unit: 'paket', price: 35, supplier: 'Güzellik Tedarik Co.' },
  { id: 'i6', name: 'Masaj Yağı', category: 'Vücut Bakımı', currentStock: 4, minStock: 3, unit: 'şişe', price: 30, supplier: 'Sağlık Ürünleri' },
  { id: 'i7', name: 'Saç Sprayi', category: 'Saç Şekillendirme', currentStock: 15, minStock: 6, unit: 'kutu', price: 20, supplier: 'Salon Temelleri' },
  { id: 'i8', name: 'Tek Kullanım Eldiveni', category: 'Malzemeler', currentStock: 45, minStock: 50, unit: 'kutu', price: 12, supplier: 'Tıbbi Tedarik Ltd.' },
];

export const dashboardStats: DashboardStats = {
  todayRevenue: 1280,
  monthRevenue: 24500,
  newCustomers: 8,
  returningCustomers: 42,
  todayAppointments: 6,
  completedAppointments: 1,
};

export const staffPerformance: StaffPerformance[] = [
  { staffId: '1', staffName: 'Sevcan', revenue: 8500, appointments: 45, avgRating: 4.9 },
  { staffId: '2', staffName: 'Pınar', revenue: 6200, appointments: 52, avgRating: 4.8 },
  { staffId: '3', staffName: 'Ceren', revenue: 9800, appointments: 38, avgRating: 4.95 },
];

export const customerVisits: Record<string, Visit[]> = {
  c1: [
    { id: 'v1', date: '2026-02-20', services: ['Kesim & Şekillendirme'], total: 150, staff: 'Sevcan', status: 'completed' },
    { id: 'v2', date: '2026-01-15', services: ['Kesim & Şekillendirme', 'Saç Boyama'], total: 500, staff: 'Sevcan', status: 'completed' },
    { id: 'v3', date: '2025-12-10', services: ['Kesim & Şekillendirme'], total: 150, staff: 'Sevcan', status: 'completed' },
  ],
  c2: [
    { id: 'v4', date: '2026-02-18', services: ['Manikür'], total: 80, staff: 'Pınar', status: 'completed' },
    { id: 'v5', date: '2026-02-01', services: ['Manikür', 'Pedikür'], total: 180, staff: 'Pınar', status: 'completed' },
  ],
  c3: [
    { id: 'v6', date: '2026-02-15', services: ['Cilt Bakımı'], total: 200, staff: 'Ceren', status: 'completed' },
    { id: 'v7', date: '2026-01-20', services: ['Cilt Bakımı'], total: 200, staff: 'Ceren', status: 'no-show' },
  ],
  c4: [
    { id: 'v8', date: '2026-01-30', services: ['Kesim & Şekillendirme'], total: 150, staff: 'Sevcan', status: 'completed' },
    { id: 'v9', date: '2026-01-10', services: ['Manikür'], total: 80, staff: 'Pınar', status: 'no-show' },
  ],
  c5: [
    { id: 'v10', date: '2026-02-22', services: ['Cilt Bakımı', 'Masaj'], total: 380, staff: 'Ceren', status: 'completed' },
    { id: 'v11', date: '2026-02-08', services: ['Kesim & Şekillendirme', 'Makyaj'], total: 270, staff: 'Sevcan', status: 'completed' },
    { id: 'v12', date: '2026-01-25', services: ['Kirpik Lifting'], total: 250, staff: 'Ceren', status: 'completed' },
  ],
};

export const revenueChartData = [
  { date: 'Mon', revenue: 3200, appointments: 12 },
  { date: 'Tue', revenue: 2800, appointments: 10 },
  { date: 'Wed', revenue: 4100, appointments: 15 },
  { date: 'Thu', revenue: 3600, appointments: 13 },
  { date: 'Fri', revenue: 5200, appointments: 18 },
  { date: 'Sat', revenue: 6800, appointments: 22 },
  { date: 'Sun', revenue: 2400, appointments: 8 },
];

export const servicePerformanceData = [
  { name: 'Kesim & Şekillendirme', value: 4500, bookings: 30 },
  { name: 'Saç Boyama', value: 7000, bookings: 20 },
  { name: 'Cilt Bakımı', value: 6000, bookings: 30 },
  { name: 'Kirpik Lifting', value: 5000, bookings: 20 },
  { name: 'Manikür', value: 2400, bookings: 30 },
  { name: 'Masaj', value: 3600, bookings: 20 },
];