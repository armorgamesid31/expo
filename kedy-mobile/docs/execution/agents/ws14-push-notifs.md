# WS14-PUSH-NOTIFS

Last updated: 2026-04-23 21:00 +03
Status: completed
Owner: ws14-push-notifs

## Objective
Re-verify push + notifications assumptions with current code, apply minimal hardening where brittle, and record go-live impact.

## Scope ownership
- `src/services/push-notifications.ts`
- `src/types/mobile-api.ts`
- `app/(stack)/notifications/index.tsx`
- `docs/execution/blockers.md`
- `docs/execution/decisions.md`
- `docs/execution/agents/ws14-push-notifs.md`

## Probe evidence (2026-04-23)
Using `owner@palmbeauty.com` account on `https://app.berkai.shop`:

1. Positive flow:
- `POST /auth/login` -> success, access token received.
- `GET /api/mobile/bootstrap` -> `HTTP 200`.
- `POST /api/mobile/push/register` with `provider:"expo"` -> `HTTP 200 {"ok":true}`.
- `POST /api/mobile/push/unregister` with `provider:"expo"` -> `HTTP 200 {"ok":true}`.

2. Negative flow:
- `POST /api/mobile/push/register` with `provider:"fcm"` -> `HTTP 200 {"ok":true}`.
- `POST /api/mobile/push/register` with missing `provider` -> `HTTP 200 {"ok":true}`.

3. Notifications payload probe:
- `GET /api/mobile/notifications?limit=5` -> `HTTP 200`, populated `items[]`.
- Returned fields include delivery-centric keys (`deliveryId`, `deliveryCreatedAt`, `readAt`) plus message keys (`title`, `body`, `createdAt`).

## Code changes
- Updated [notifications/index.tsx](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/app/(stack)/notifications/index.tsx):
  - Added compatibility mapping for response shape `{items: []}` and raw `[]`.
  - Added null-safe id mapping: `id | deliveryId | notificationId`.
  - Added read-status mapping: `isRead | readAt`.
  - Replaced local refresh state with `isRefetching`.
  - Stabilized callbacks and removed fixed-height list container.

## Unchanged by design
- `src/services/push-notifications.ts` remains strict client-side contract (`provider: "expo"`).
- `src/types/mobile-api.ts` already strict and remained compatible.

## Go-live impact
- Functional push integration remains usable on mobile client.
- Go-live is still blocked by backend governance gap (`PUSH-4/PUSH-5`) until invalid/missing provider is rejected with `4xx` and schema is published.
- Notifications screen contract brittleness risk is reduced and `P1-1` is closed from frontend perspective.

## Validation
- `npm run typecheck` -> PASS.
