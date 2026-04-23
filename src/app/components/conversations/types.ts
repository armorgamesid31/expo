export type ChannelType = 'INSTAGRAM' | 'WHATSAPP';
export type ChannelFilter = 'ALL' | ChannelType;
export type AutomationMode = 'AUTO' | 'HUMAN_PENDING' | 'HUMAN_ACTIVE' | 'MANUAL_ALWAYS' | 'AUTO_RESUME_PENDING';

export interface ConversationItem {
  channel: ChannelType;
  conversationKey: string;
  customerName: string | null;
  profileUsername?: string | null;
  profilePicUrl?: string | null;
  lastMessageType: string;
  lastMessageText: string | null;
  lastEventTimestamp: string;
  unreadCount: number;
  messageCount: number;
  hasHandoverRequest: boolean;
  identityLinked?: boolean;
  linkedCustomerId?: number | null;
  automationMode?: AutomationMode;
  manualAlways?: boolean;
  humanPendingSince?: string | null;
  humanActiveUntil?: string | null;
  lastHumanMessageAt?: string | null;
  lastCustomerMessageAt?: string | null;
}

export interface MessageItem {
  id: number;
  conversationKey?: string;
  providerMessageId: string;
  messageType: string;
  text: string | null;
  status: string;
  direction: 'inbound' | 'outbound' | 'system';
  deliveryChannel?: 'INSTAGRAM' | 'WHATSAPP';
  outboundSource?: 'AI_AGENT' | 'HUMAN_APP' | 'HUMAN_EXTERNAL' | null;
  outboundSourceLabel?: string | null;
  outboundSenderUserId?: number | null;
  outboundSenderEmail?: string | null;
  systemAction?: string | null;
  systemActorUserId?: number | null;
  systemActorEmail?: string | null;
  systemActorDisplayName?: string | null;
  eventTimestamp: string;
  raw?: Record<string, unknown>;
}

export interface ConversationStatePayload {
  automationMode?: AutomationMode;
  mode?: AutomationMode;
  manualAlways?: boolean;
  humanPendingSince?: string | null;
  humanActiveUntil?: string | null;
  lastHumanMessageAt?: string | null;
  lastCustomerMessageAt?: string | null;
}

export interface InstagramChannelHealth {
  connected: boolean;
  status: string;
  message: string;
  bindingReady: boolean;
  missingRequirements?: string[];
}

export interface WhatsAppChannelHealth {
  connected: boolean;
  isActive: boolean;
  hasPlugin: boolean;
  whatsappPhoneNumberId?: string | null;
  message: string;
  missingRequirements?: string[];
}

export interface ChannelHealthPayload {
  instagram: InstagramChannelHealth;
  whatsapp: WhatsAppChannelHealth;
}

export interface LinkedCustomerProfile {
  customer: {
    id: number;
    name: string | null;
    phone: string;
    instagram?: string | null;
    birthDate?: string | null;
    acceptMarketing?: boolean | null;
  };
  summary: {
    totalAppointmentDays: number;
    totalRevenue: number;
    noShowRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    noShowCount: number;
    totalBookings: number;
  };
  discount?: {
    kind: 'PERCENT' | 'FIXED';
    value: number;
    note: string | null;
    notifyCustomer: boolean;
    messageTemplate: string | null;
    lastNotificationStatus: string | null;
    updatedAt: string;
  } | null;
}

export interface BlacklistCheckResult {
  blocked: boolean;
  reason: string | null;
  entryId: number | null;
  matchType: 'CUSTOMER' | 'PHONE' | 'IDENTITY' | null;
}

export type ReadReceiptMap = Record<string, string>;
