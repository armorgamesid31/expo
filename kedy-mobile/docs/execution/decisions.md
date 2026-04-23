# Decisions

Last updated: 2026-04-23 21:00 +03
Owner: ORCH-3

1. NativeWind stays in migration scope.
- Decision: keep current NativeWind stack; no styling-system migration during go-live path.
- Why: avoids destabilizing already-hardened P0 flows.

2. Expo 54 build line is frozen.
- Decision: keep `react-native-reanimated@4.x`, `react-native-worklets@0.5.1`, `babel-preset-expo~54.0.10`, stable `react-native-css`.
- Why: prevent dependency drift during final cycle.

3. Push client contract is Expo-only and typed.
- Decision: client sends `provider: "expo"` for register/unregister.
- Why: deterministic payload contract on mobile side.

4. Backend push governance is an explicit go-live gate.
- Decision: go-live requires backend to reject invalid/missing provider with `4xx` and publish schema examples.
- Why: WS9 negative probes proved current backend is permissive.
- Evidence: [ws9-push-e2e.md](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/docs/execution/agents/ws9-push-e2e.md), WS14 re-probe (`2026-04-23 21:00 +03`) with same result.

5. P0 data routes are locked to active admin namespace.
- Decision: Schedule, Customers, Conversations use `/api/admin/*` contracts.
- Why: prior `/api/mobile/*` mismatch caused runtime data gaps.
- Evidence: [ws7-p0-schedule-customers.md](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/docs/execution/agents/ws7-p0-schedule-customers.md), [ws8-p0-conversations.md](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/docs/execution/agents/ws8-p0-conversations.md)

6. Login runtime error taxonomy is fixed.
- Decision: login errors are surfaced as config/network/401/5xx with deterministic inline + toast behavior.
- Why: reduce operator confusion and support faster field diagnostics.
- Evidence: [ws11-auth-runtime.md](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/docs/execution/agents/ws11-auth-runtime.md)

7. Production readiness requires evidence-first checklist.
- Decision: every go-live gate is PASS only with concrete evidence artifacts.
- Why: avoid subjective readiness claims.
- Evidence: [go-live-checklist.md](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/docs/execution/go-live-checklist.md)

8. Lightweight multi-agent continuation remains docs-only.
- Decision: keep takeover model in `work-items.md`, `blockers.md`, `decisions.md`, `handover.md`, and per-agent logs.
- Why: maintain handover safety without heavy orchestration framework.

9. Notifications inbox mapping is compatibility-first and backend-shape tolerant.
- Decision: notifications UI accepts both `{ items: [] }` and raw `[]`, and normalizes id/read fields from `id|deliveryId|notificationId` and `isRead|readAt`.
- Why: live data probe returned delivery-centric fields (`deliveryId`, `readAt`, `deliveryCreatedAt`) and strict single-shape assumption is brittle.
- Evidence: WS14 live probe against `GET /api/mobile/notifications?limit=5` and mapping update in [notifications/index.tsx](/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/app/(stack)/notifications/index.tsx).
