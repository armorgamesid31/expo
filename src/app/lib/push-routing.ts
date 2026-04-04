export type PushRouteKey = 'instagram-inbox' | 'schedule' | 'analytics' | 'notifications';

function isPushRouteKey(value: unknown): value is PushRouteKey {
  return value === 'instagram-inbox' || value === 'schedule' || value === 'analytics' || value === 'notifications';
}

export function inferPushRouteFromEvent(eventType: unknown): PushRouteKey {
  if (eventType === 'HANDOVER_REQUIRED' || eventType === 'HANDOVER_REMINDER') {
    return 'instagram-inbox';
  }
  if (eventType === 'SAME_DAY_APPOINTMENT_CHANGE' || eventType === 'END_OF_DAY_MISSING_DATA') {
    return 'schedule';
  }
  if (eventType === 'DAILY_MANAGER_REPORT') {
    return 'analytics';
  }
  return 'notifications';
}

export function resolvePushRoute(input: { route?: unknown; eventType?: unknown }): PushRouteKey {
  if (isPushRouteKey(input.route)) {
    return input.route;
  }
  return inferPushRouteFromEvent(input.eventType);
}

export function resolvePushAppPath(input: { route?: unknown; eventType?: unknown }): string {
  return `/app/${resolvePushRoute(input)}`;
}
