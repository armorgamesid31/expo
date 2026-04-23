# WS12-API-CONTRACT

- Agent: ws12-api-contract
- Date: 2026-04-23
- Status: completed

## Scope (owned files only)
- `app/(tabs)/schedule/index.tsx`
- `app/(tabs)/customers/index.tsx`
- `app/(tabs)/conversations/index.tsx`
- `app/(tabs)/conversations/[conversationId].tsx`
- `app/(stack)/notifications/index.tsx`

## Contract verification and normalization actions
1. Kept endpoint namespaces aligned to active backend contracts:
- Schedule: `GET /api/admin/appointments?from=today&to=today&limit=120`
- Customers: `GET /api/admin/customers?limit=100`
- Conversations list: `GET /api/admin/conversations?limit=120`
- Conversations detail: `GET /api/admin/conversations/{channel}/{conversationKey}/messages?limit=120`
- Notifications inbox: `GET /api/mobile/notifications?limit=30`

2. Removed stale fallback assumptions that masked contract issues:
- Removed `[]` top-level response fallback for schedule/customers/notifications.
- Removed `array | { items }` dual-shape tolerance in notifications.
- Enforced strict `{ items: [] }` shape guards per endpoint.
- Contract mismatch now fails fast with explicit error: `Unexpected response shape from <endpoint>: expected { items: [] }`.

3. Deterministic UI behavior preserved:
- All screens keep `loading / error / empty / retry` behavior.
- Refresh remains deterministic (`isRefetching` + `refetch`).

## Files changed
- `/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/app/(tabs)/schedule/index.tsx`
- `/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/app/(tabs)/customers/index.tsx`
- `/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/app/(tabs)/conversations/index.tsx`
- `/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/app/(tabs)/conversations/[conversationId].tsx`
- `/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/app/(stack)/notifications/index.tsx`
- `/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/docs/execution/agents/ws12-api-contract.md`

## Validation
- `npm run typecheck` => PASS

## Remaining risks
- If backend currently returns bare array for any of these endpoints, screens now correctly fail (visible error) until backend is aligned.
- Conversations channel enum is intentionally strict (`INSTAGRAM | WHATSAPP`); new channels will be filtered out until contract is expanded.
- Notifications endpoint still needs runtime proof against production-like dataset to confirm all required fields are always present.
