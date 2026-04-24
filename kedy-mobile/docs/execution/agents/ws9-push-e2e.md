# WS9-PUSH-E2E

Last updated: 2026-04-23 21:04 +03
Status: completed
Owner: ws9-push-e2e

## Objective
Validate push endpoint contract assumptions for Expo provider and record verified vs unverified go-live evidence.

## Scope ownership
- `docs/execution/agents/ws9-push-e2e.md`
- `docs/execution/blockers.md`
- `docs/execution/decisions.md`

## Evidence

1. Login + bootstrap + push register/unregister with `provider: "expo"`.

```bash
API_BASE="https://app.berkai.shop"
curl -X POST "$API_BASE/auth/login" ...
curl -X GET "$API_BASE/api/mobile/bootstrap" -H "Authorization: Bearer <access>"
curl -X POST "$API_BASE/api/mobile/push/register" \
  -H "Authorization: Bearer <access>" -H "x-salon-id: 2" \
  --data '{"token":"ExpoPushToken[ws9_probe_token]","provider":"expo","platform":"ios","appVersion":"1.0.0","deviceMeta":{"probe":true,"source":"ws9-push-e2e"}}'
curl -X POST "$API_BASE/api/mobile/push/unregister" \
  -H "Authorization: Bearer <access>" -H "x-salon-id: 2" \
  --data '{"token":"ExpoPushToken[ws9_probe_token]","provider":"expo"}'
```

Observed response:
- register: `{"ok":true}` + `HTTP_STATUS:200`
- unregister: `{"ok":true}` + `HTTP_STATUS:200`

2. Negative probe for provider strictness.

```bash
curl -X POST "$API_BASE/api/mobile/push/register" ... \
  --data '{"token":"ExpoPushToken[ws9_bad_provider]","provider":"fcm","platform":"ios","appVersion":"1.0.0","deviceMeta":{"probe":true}}'

curl -X POST "$API_BASE/api/mobile/push/register" ... \
  --data '{"token":"ExpoPushToken[ws9_missing_provider]","platform":"ios","appVersion":"1.0.0","deviceMeta":{"probe":true}}'
```

Observed response:
- bad provider (`fcm`): `{"ok":true}` + `HTTP_STATUS:200`
- missing provider: `{"ok":true}` + `HTTP_STATUS:200`

## Verified
- Backend currently accepts Expo register payload with `provider: "expo"` and Expo-style token string.
- Backend currently accepts Expo unregister payload with `provider: "expo"`.

## Unverified / risk
- Backend does **not** enforce provider contract strictly (accepts invalid/missing provider), so server-side contract is effectively permissive.
- Token format strictness is unverified (`ExpoPushToken[...]` pattern not validated server-side).
- Idempotency semantics are inferred (same token calls did not fail) but not formally specified.

## Go-live statement
- Expo push contract is functionally usable today.
- Contract governance is incomplete until backend validation rules are enforced and documented.

## Unresolved blockers
- `PUSH-4`: Backend must enforce `provider === "expo"` (or documented allowlist) and reject malformed/missing provider with `4xx`.
- `PUSH-5`: Backend should validate token format/provider compatibility and publish explicit API schema for register/unregister.

## Next step
Backend owner to implement input validation + schema docs, then WS9 reruns the same probes and expects `400/422` for invalid provider/missing provider.

## Re-probe addendum (2026-04-24 00:30 +03)

Command output:

```bash
BAD_PROVIDER_STATUS=200
MISSING_PROVIDER_STATUS=200
```

Conclusion:
- Provider validation still permissive in production API.
- `PUSH-4` and `PUSH-5` remain open.
