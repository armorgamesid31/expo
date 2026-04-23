# Blockers

Last updated: 2026-04-23 21:00 +03
Owner: ORCH-3

## Open blockers

1. iOS/Android preview build evidence missing
- ID: `BUILD-3` / `BUILD-4`
- Owner: ws5-build-release
- Impact: release path unproven, go-live blocked.
- Current evidence:
  - `BUILD-1` and `BUILD-2` are PASS with command evidence in [ws10-build-qa.md](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/docs/execution/agents/ws10-build-qa.md).
  - iOS/Android artifacts missing in [go-live-checklist.md](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/docs/execution/go-live-checklist.md).
- Required closure evidence:
  - `eas build --platform ios --profile preview` log + build ID/link + install/open smoke result.
  - `eas build --platform android --profile preview` log + build ID/link + install/open smoke result.

2. Push backend provider/schema validation is permissive
- ID: `PUSH-4` / `PUSH-5`
- Owner: backend owner + ws9-push-e2e
- Impact: client/server push contract governance incomplete, go-live blocked.
- Current evidence:
  - Positive probe works (`provider:"expo"`) in [ws9-push-e2e.md](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/docs/execution/agents/ws9-push-e2e.md).
  - Negative probes also pass (`provider:"fcm"` and missing provider both `HTTP 200`) in [ws9-push-e2e.md](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/docs/execution/agents/ws9-push-e2e.md).
  - WS14 re-probe confirms same permissive behavior at `2026-04-23 21:00 +03` (`provider:"fcm"` and missing provider both `HTTP 200 {"ok":true}`).
- Required closure evidence:
  - Backend validation change reference (PR/commit).
  - Negative probes rerun with `4xx` results.
  - Published schema/examples for register/unregister payloads.

3. Full-screen parity audit not completed
- ID: `PARITY-1`
- Owner: ws6-chrome-parity
- Impact: full transfer completeness cannot be claimed.
- Current evidence:
  - P0 screens hardened and endpoint-aligned in [ws7-p0-schedule-customers.md](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/docs/execution/agents/ws7-p0-schedule-customers.md) and [ws8-p0-conversations.md](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/docs/execution/agents/ws8-p0-conversations.md).
  - Route-by-route original vs migrated parity matrix is missing.
- Required closure evidence:
  - Chrome MCP report: each route marked `PASS/PARTIAL/FAIL` with missing behavior notes.
  - Explicit count of remaining non-parity screens.

## Recently closed blockers

- `API-1` endpoint mismatch for P0 is resolved by WS7+WS8 evidence:
  - Schedule/Customers aligned to `/api/admin/*` in [ws7-p0-schedule-customers.md](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/docs/execution/agents/ws7-p0-schedule-customers.md).
  - Conversations list/detail aligned to `/api/admin/*` in [ws8-p0-conversations.md](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/docs/execution/agents/ws8-p0-conversations.md).
- `AUTH-1..AUTH-4` runtime messaging hardening completed in [ws11-auth-runtime.md](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/docs/execution/agents/ws11-auth-runtime.md).
- `P1-1` notifications response contract risk is resolved by WS14:
  - Live probe (`GET /api/mobile/notifications?limit=5`) returned populated `items[]` with fields including `deliveryId`, `title`, `body`, `createdAt|deliveryCreatedAt`, `readAt`.
  - UI compatibility mapper added for `{ items: [] }` and `[]` with id/read fallbacks in [notifications/index.tsx](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/app/(stack)/notifications/index.tsx).
