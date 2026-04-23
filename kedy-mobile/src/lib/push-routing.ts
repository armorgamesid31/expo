export type PushRouteKey = 'conversations' | 'schedule' | 'analytics' | 'notifications';

function normalizeLegacyRoute(value: unknown): PushRouteKey | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'instagram-inbox') return 'conversations';
  if (normalized === 'conversations' || normalized === 'schedule' || normalized === 'analytics' || normalized === 'notifications') {
    return normalized;
  }
  return null;
}

export function inferPushRouteFromEvent(eventType: unknown): PushRouteKey {
  if (eventType === 'HANDOVER_REQUIRED' || eventType === 'HANDOVER_REMINDER') return 'conversations';
  if (eventType === 'SAME_DAY_APPOINTMENT_CHANGE' || eventType === 'END_OF_DAY_MISSING_DATA') return 'schedule';
  if (
    eventType === 'WAITLIST_OFFER_CREATED' ||
    eventType === 'WAITLIST_OFFER_EXPIRED' ||
    eventType === 'WAITLIST_OFFER_ACCEPTED' ||
    eventType === 'WAITLIST_MATCH_FOUND'
  ) {
    return 'schedule';
  }
  if (eventType === 'DAILY_MANAGER_REPORT') return 'analytics';
  return 'notifications';
}

export function resolvePushAppPath(input: { route?: unknown; eventType?: unknown }): string {
  const route = normalizeLegacyRoute(input.route) ?? inferPushRouteFromEvent(input.eventType);
  if (route === 'schedule') return '/(tabs)/schedule';
  if (route === 'conversations') return '/(tabs)/conversations';
  if (route === 'analytics') return '/(stack)/analytics';
  return '/(stack)/notifications';
}
