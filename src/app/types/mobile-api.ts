export type MobileRole = 'OWNER' | 'MANAGER' | 'STAFF' | 'RECEPTION' | 'FINANCE';

export interface BootstrapResponse {
  user: {
    id: number;
    name: string;
    role: MobileRole;
  };
  salon: {
    id: number;
    name: string;
    slug: string | null;
    city: string | null;
    country: string | null;
  };
  capabilities: Record<string, boolean | string>;
  featureFlags: Record<string, boolean>;
  subscription: {
    plan: string;
    status: string;
  };
}

export interface AdminAppointmentItem {
  id: number;
  startTime: string;
  endTime: string;
  status: string;
  customerName: string;
  customerPhone: string;
  service: {
    id: number;
    name: string;
    duration: number;
    price: number;
    requiresSpecialist?: boolean;
  };
  staff: {
    id: number;
    name: string;
    title?: string | null;
  };
}

export interface AdminAppointmentsResponse {
  from: string;
  to: string;
  items: AdminAppointmentItem[];
  count: number;
}

export interface AdminCustomerItem {
  id: number;
  name: string | null;
  phone: string;
  gender: string | null;
  birthDate: string | null;
  acceptMarketing: boolean | null;
  appointmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCustomersResponse {
  items: AdminCustomerItem[];
  nextCursor: string | null;
  hasMore: boolean;
}
