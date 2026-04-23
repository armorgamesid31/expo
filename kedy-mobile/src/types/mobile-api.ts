export type MobileRole = 'OWNER' | 'MANAGER' | 'STAFF' | 'RECEPTION' | 'FINANCE';
export type PushProvider = 'expo';

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
}

export interface PushRegistrationPayload {
  token: string;
  provider: PushProvider;
  platform: string;
  appVersion: string | null;
  deviceMeta: Record<string, unknown>;
}

export interface PushUnregisterPayload {
  token: string;
  provider: PushProvider;
}
