# WS13-AUTH-RUNTIME

Last updated: 2026-04-23 21:12 +03
Status: completed

## Objective
Validate login/refresh/logout/cold-start behaviors locally, harden auth edge cases if needed, update AUTH go-live gates with evidence.

## Files touched
- src/providers/AuthProvider.tsx
- app/(auth)/login.tsx
- docs/execution/go-live-checklist.md
- docs/execution/agents/ws13-auth-runtime.md

## What changed
1. Fixed a cold-start refresh token regression in `AuthProvider` bootstrap flow.
- Before: if `rotateAccess(storedRefreshToken)` rotated to a new refresh token, bootstrap later overwrote state/ref with stale `storedRefreshToken`.
- After: bootstrap now resolves refresh token from `refreshTokenRef.current || storedRefreshToken` and persists that in state/ref.

2. Hardened login UX mapping for rate-limit responses.
- Added explicit `429` message in `app/(auth)/login.tsx`.

3. Updated AUTH gates in go-live checklist with evidence-based PASS/FAIL.

## Evidence commands and results
```bash
API_BASE=$(grep '^EXPO_PUBLIC_API_BASE_URL=' .env | cut -d= -f2-)
# API_BASE=https://app.berkai.shop

curl -sS -o /tmp/ws13-login.json -w '%{http_code}' "$API_BASE/auth/login" \
  -H 'Content-Type: application/json' \
  --data '{"email":"owner@palmbeauty.com","password":"123456"}'
# LOGIN_STATUS=200

curl -sS -o /tmp/ws13-refresh.json -w '%{http_code}' "$API_BASE/auth/refresh" \
  -H 'Content-Type: application/json' \
  --data '{"refreshToken":"<login.refreshToken>"}'
# REFRESH_STATUS=200

curl -sS -o /tmp/ws13-logout.json -w '%{http_code}' "$API_BASE/auth/logout" \
  -H 'Content-Type: application/json' \
  --data '{"refreshToken":"<refresh.refreshToken>"}'
# LOGOUT_STATUS=204

curl -sS -o /tmp/ws13-bootstrap.json -w '%{http_code}' "$API_BASE/api/mobile/bootstrap" \
  -H 'Authorization: Bearer <login.accessToken>'
# BOOTSTRAP_STATUS=200

npm run typecheck
# exit code: 0
```

## AUTH gate status decisions
- AUTH-1: PASS (login + bootstrap against target API base URL verified)
- AUTH-2: FAIL (no UI/device evidence yet for no-loop across warm/cold)
- AUTH-3: FAIL (server logout verified, but client-side token clear + redirect evidence missing)
- AUTH-4: FAIL (no simulator/device cold-start session restore run recorded)

## Unresolved gaps
1. Need simulator/device run video/log proving auth refresh does not create loop (AUTH-2).
2. Need simulator/device proof that logout clears local tokens and routes to login (AUTH-3).
3. Need simulator/device cold-start proof for valid stored tokens (AUTH-4).

## Next step handover
Run auth runtime smoke on simulator/device:
- login -> app background/foreground -> token expiry/refresh path
- logout -> verify route + secure storage cleared
- cold start with valid token pair -> bootstrap success without flicker/loop
