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
  permissions?: string[];
  accessVersion?: number;
  subscription: {
    plan: string;
    status: string;
  };
  setupChecklist?: {
    workingHours: boolean;
    address: boolean;
    phone: boolean;
    service: boolean;
    staff: boolean;
    completed: boolean;
  };
  setup?: {
    workStartHour: number | null;
    workEndHour: number | null;
    slotInterval: number | null;
    workingDays: string[] | null;
  };
}

export interface AccessPermissionDefinition {
  key: string;
  module: string;
  description: string | null;
  isCritical: boolean;
}

export interface AccessPermissionsResponse {
  permissions: AccessPermissionDefinition[];
  rolePermissions: Record<string, string[]>;
  roles: Array<'OWNER' | 'MANAGER' | 'RECEPTION' | 'STAFF' | 'FINANCE'>;
}

export interface AccessUserItem {
  id: number;
  email: string;
  displayName: string | null;
  role: 'OWNER' | 'MANAGER' | 'RECEPTION' | 'STAFF' | 'FINANCE';
  isActive: boolean;
  passwordResetRequired: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  linkedStaff: { id: number; name: string } | null;
}

export interface AdminAppointmentItem {
  id: number;
  startTime: string;
  endTime: string;
  status: string;
  paymentMethod?: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER' | null;
  paymentRecordedAt?: string | null;
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

export interface AdminAppointmentRescheduleCandidate {
  staffId: number;
  name: string;
  title?: string | null;
  available: boolean;
  reason?: string;
}

export interface AdminAppointmentReschedulePreviewItem {
  appointmentId: number;
  serviceId: number;
  serviceName: string;
  currentStartTime: string;
  currentEndTime: string;
  newStartTime: string;
  newEndTime: string;
  preferenceMode: 'ANY' | 'SPECIFIC';
  preferredStaffId: number | null;
  selectedStaffId: number | null;
  needsManualChoice: boolean;
  candidates: AdminAppointmentRescheduleCandidate[];
  reason?: string;
}

export interface AdminAppointmentReschedulePreviewResponse {
  items: AdminAppointmentReschedulePreviewItem[];
  requiresManualSelection: boolean;
  hasConflicts: boolean;
  conflicts: Array<{
    appointmentId: number;
    reason: string;
  }>;
}

export interface AdminAppointmentRescheduleCommitResponse {
  batchId: string;
  previousAppointmentIds: number[];
  items: AdminAppointmentItem[];
}

export interface AdminCustomerItem {
  id: number;
  name: string | null;
  phone: string;
  instagram: string | null;
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

export interface PackageServiceBalanceItem {
  id: number;
  serviceId: number;
  initialQuota: number;
  remainingQuota: number;
  service?: {
    id: number;
    name: string;
  } | null;
}

export interface PackageTemplateItem {
  id: number;
  salonId: number;
  name: string;
  scopeType: 'SINGLE_SERVICE' | 'POOL';
  isActive: boolean;
  price: number | null;
  validityDays: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  services: Array<{
    id: number;
    serviceId: number;
    initialQuota: number;
    service?: {
      id: number;
      name: string;
    } | null;
  }>;
}

export interface CustomerPackageItem {
  id: number;
  customerId: number;
  packageTemplateId: number | null;
  sourceType: 'TEMPLATE' | 'CUSTOM';
  scopeType: 'SINGLE_SERVICE' | 'POOL';
  status: 'ACTIVE' | 'DEPLETED' | 'EXPIRED' | 'CANCELLED';
  name: string;
  startsAt: string | null;
  expiresAt: string | null;
  price: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  template?: {
    id: number;
    name: string;
  } | null;
  serviceBalances: PackageServiceBalanceItem[];
}

export interface PackageLedgerItem {
  id: number;
  customerPackageId: number | null;
  packageName: string | null;
  serviceId: number | null;
  serviceName: string | null;
  appointmentId: number | null;
  actionType:
    | 'ASSIGNED'
    | 'AUTO_CONSUME'
    | 'AUTO_RESTORE'
    | 'MANUAL_ADJUST'
    | 'SKIPPED_NO_ELIGIBLE_PACKAGE'
    | 'SKIPPED_EXPIRED';
  delta: number;
  balanceAfter: number | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AppointmentStatusUpdateResponse {
  item: AdminAppointmentItem;
  packageAutomation: {
    previousStatus: string;
    nextStatus: string;
    events: Array<{
      type: string;
      serviceId: number;
      customerPackageId?: number;
      balanceAfter?: number;
    }>;
  };
}

export interface NotificationPreferences {
  masterEnabled: boolean;
  eventConfig: {
    events?: Partial<
      Record<
        'HANDOVER_REQUIRED' | 'HANDOVER_REMINDER' | 'SAME_DAY_APPOINTMENT_CHANGE' | 'END_OF_DAY_MISSING_DATA' | 'DAILY_MANAGER_REPORT',
        boolean
      >
    >;
    [key: string]: unknown;
  };
}

export interface NotificationInboxItem {
  deliveryId: number;
  channel: 'IN_APP' | 'PUSH';
  status: 'PENDING' | 'SENT' | 'SKIPPED' | 'FAILED';
  readAt: string | null;
  deliveryCreatedAt: string;
  notificationId: number;
  eventType: 'HANDOVER_REQUIRED' | 'HANDOVER_REMINDER' | 'SAME_DAY_APPOINTMENT_CHANGE' | 'END_OF_DAY_MISSING_DATA' | 'DAILY_MANAGER_REPORT';
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

export interface PushDeviceStatusItem {
  id: number;
  platform: string;
  tokenMasked: string;
  appVersion: string | null;
  deviceMeta: Record<string, unknown> | null;
  isActive: boolean;
  lastSeenAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PushStatusResponse {
  providerConfigured: boolean;
  providerSource: 'BASE64' | 'JSON' | 'NONE';
  providerError: string | null;
  activeDeviceCount: number;
  devices: PushDeviceStatusItem[];
}

export interface PushDeliverySummary {
  PENDING: number;
  SENT: number;
  SKIPPED: number;
  FAILED: number;
}

export interface PushTestResponse {
  ok: boolean;
  scheduled: boolean;
  delaySeconds: number;
  notificationId: number | null;
  inAppDeliveryCount: number;
  pushDeliveryCount: number;
  pushDeliverySummary: PushDeliverySummary;
  providerConfigured: boolean;
  providerSource: 'BASE64' | 'JSON' | 'NONE';
  providerError: string | null;
}

export interface CampaignItem {
  id: number;
  name: string;
  type: string;
  description: string | null;
  config: Record<string, unknown> | null;
  isActive: boolean;
  priority: number;
  deliveryMode: 'AUTO' | 'MANUAL';
  maxGlobalUsage: number | null;
  maxPerCustomer: number | null;
  publishedAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignPricingPreviewResponse {
  currency: 'TRY';
  subtotal: number;
  discountTotal: number;
  finalTotal: number;
  lines: Array<{
    serviceId: number;
    listPrice: number;
    discountTotal: number;
    finalPrice: number;
    packageCovered: boolean;
    appliedCampaigns: Array<{
      campaignId: number;
      campaignType: string;
      campaignName: string;
      amount: number;
    }>;
  }>;
  appliedCampaigns: Array<{
    campaignId: number;
    campaignType: string;
    campaignName: string;
    amount: number;
  }>;
}
