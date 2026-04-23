# Work Items

Last updated: 2026-04-23 22:28 +03
Source of truth owner: ORCH-3

## Active tasks

1. [DONE] Expo 54 dependency freeze and baseline verification
- Owner: ws1-build
- Scope: pin toolchain and verify install/typecheck/web boot
- Evidence: [ws1-build.md](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/docs/execution/agents/ws1-build.md)

2. [DONE] Auth/session restore hardening
- Owner: ws2-core
- Scope: bootstrap cleanup, refresh single-flight, cold start stability
- Evidence: [ws2-core.md](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/docs/execution/agents/ws2-core.md)

3. [DONE] Push contract alignment (`provider=expo`)
- Owner: ws5-push
- Scope: register/unregister payload contract + retry-safe unregister
- Evidence: [ws5-push.md](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/docs/execution/agents/ws5-push.md)

4. [DONE] P0-A hardening (Login + Schedule)
- Owner: ws3-p0a
- Scope: validation, loading/error/empty/retry, refresh/perf hardening
- Evidence: [ws3-p0a.md](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/docs/execution/agents/ws3-p0a.md)

5. [DONE] P0-B hardening (Customers + Conversations)
- Owner: ws4-p0b
- Scope: null-safe list/detail flow, refresh safety, perf knobs
- Evidence: [ws4-p0b.md](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/docs/execution/agents/ws4-p0b.md)

6. [DONE] QA checklist gate hardened (binary pass/fail)
- Owner: ws6-qa
- Scope: evidence-first checklist update and blocker surfacing
- Evidence: [ws6-qa.md](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/docs/execution/agents/ws6-qa.md)

7. [DONE] P0 endpoint contract alignment (Schedule + Customers)
- Owner: ws7-p0-schedule-customers
- Scope: move to `/api/admin/*`, normalize response shapes, deterministic states
- Evidence: [ws7-p0-schedule-customers.md](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/docs/execution/agents/ws7-p0-schedule-customers.md)

8. [DONE] P0 endpoint contract alignment (Conversations list/detail)
- Owner: ws8-p0-conversations
- Scope: move to `/api/admin/*`, stable `conversationId`, deterministic states
- Evidence: [ws8-p0-conversations.md](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/docs/execution/agents/ws8-p0-conversations.md)

9. [DONE] Push E2E probe evidence capture
- Owner: ws9-push-e2e
- Scope: positive/negative probes against backend push endpoints
- Evidence: [ws9-push-e2e.md](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/docs/execution/agents/ws9-push-e2e.md)

10. [DONE] Build QA baseline evidence capture
- Owner: ws10-build-qa
- Scope: typecheck + expo web smoke evidence
- Evidence: [ws10-build-qa.md](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/docs/execution/agents/ws10-build-qa.md), [go-live-checklist.md](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/docs/execution/go-live-checklist.md)

11. [DONE] Login runtime error clarity hardening
- Owner: ws11-auth-runtime
- Scope: deterministic error messages for config/network/401/5xx
- Evidence: [ws11-auth-runtime.md](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/docs/execution/agents/ws11-auth-runtime.md)

12. [IN_PROGRESS] iOS/Android preview build proof capture
- Owner: ws5-build-release
- Scope: `eas build --platform ios/android --profile preview` + install/open proof
- Evidence status: pending (`BUILD-3`, `BUILD-4`)

13. [IN_PROGRESS] Backend push validation governance closure
- Owner: backend owner + ws9-push-e2e
- Scope: enforce provider/schema validation (`invalid/missing provider -> 4xx`)
- Evidence status: pending (`PUSH-4`, `PUSH-5`)

14. [BLOCKED] Full-screen parity audit via Chrome MCP
- Owner: ws16-chrome-parity
- Scope: original web vs migrated expo web route-by-route `PASS/PARTIAL/FAIL`
- Evidence status: blocked by `chrome-devtools/*` transport (`Transport closed`) in this cycle; see `ws16-chrome-parity.md`

## Next 3 tasks

1. Restore Chrome DevTools MCP transport/session, then rerun WS16 six-route mobile parity audit.
2. Run and capture iOS + Android preview builds with install/open proof; close `BUILD-3/BUILD-4`.
3. Backend push validation fix + negative probes rerun (`provider=fcm`, missing provider -> `4xx`); close `PUSH-4/PUSH-5`.

## Recently touched files

- `app/(tabs)/schedule/index.tsx`
- `app/(tabs)/customers/index.tsx`
- `app/(tabs)/conversations/index.tsx`
- `app/(tabs)/conversations/[conversationId].tsx`
- `app/(auth)/login.tsx`
- `docs/execution/agents/ws7-p0-schedule-customers.md`
- `docs/execution/agents/ws8-p0-conversations.md`
- `docs/execution/agents/ws9-push-e2e.md`
- `docs/execution/agents/ws10-build-qa.md`
- `docs/execution/agents/ws11-auth-runtime.md`
- `docs/execution/agents/ws16-chrome-parity.md`
- `docs/execution/go-live-checklist.md`

## Risky files

- `app/(tabs)/conversations/[conversationId].tsx` (channel/key parsing edge cases)
- `app/(stack)/notifications/index.tsx` (response shape still unconfirmed)
- `src/services/push-notifications.ts` (depends on backend validation governance)
- `eas.json` (release path not yet proven)
- Chrome MCP session/transport instability blocks parity closure (`PARITY-1`)
