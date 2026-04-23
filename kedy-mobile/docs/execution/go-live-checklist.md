# Go-Live Checklist (72h Migration)

Last updated: 2026-04-23 21:12 +03
Rule: Every gate is binary (`PASS` or `FAIL`). If evidence is missing, status is `FAIL`.

## Gate Status

| ID | Gate | Status | Evidence | Owner |
|---|---|---|---|---|
| AUTH-1 | Login works against target production API base URL | PASS | `POST /auth/login -> 200`, `GET /api/mobile/bootstrap -> 200` at 2026-04-23 21:10 +03 | ws13-auth-runtime |
| AUTH-2 | Refresh flow has no redirect/login loop (cold + warm start) | FAIL | `POST /auth/refresh -> 200` verified, but UI/device loop evidence missing | ws13-auth-runtime |
| AUTH-3 | Logout clears tokens/session and returns to login | FAIL | `POST /auth/logout -> 204` verified, but client token clear + redirect evidence missing | ws13-auth-runtime |
| AUTH-4 | Cold start session restore works with valid tokens | FAIL | No simulator/device cold-start evidence recorded in this session | ws13-auth-runtime |
| P0-1 | Schedule screen handles loading/error/empty/retry without crash | FAIL | Implementation exists; no signed QA run | ws3-p0a + ws6-qa |
| P0-2 | Customers screen handles loading/error/empty/retry without crash | FAIL | Implementation exists; no signed QA run | ws4-p0b + ws6-qa |
| P0-3 | Conversations list -> detail works with loading/error/retry | FAIL | Implementation exists; no signed QA run | ws4-p0b + ws6-qa |
| P1-1 | Settings + Notifications minimum usable path works | PASS | `GET /api/mobile/notifications?limit=5 -> 200` with populated `items[]`; compatibility mapper landed in `app/(stack)/notifications/index.tsx` at 2026-04-23 21:00 +03 | ws14-push-notifs |
| PUSH-1 | Register payload sends `provider: "expo"` | PASS | Code updated in `src/services/push-notifications.ts` | ws5-push |
| PUSH-2 | Unregister payload sends `provider: "expo"` | PASS | Code updated in `src/services/push-notifications.ts` | ws5-push |
| PUSH-3 | Backend accepts Expo token format in register/unregister | PASS | Positive probes: register/unregister with `provider:\"expo\"` returned `200 {\"ok\":true}` at 2026-04-23 21:00 +03 | ws14-push-notifs + backend |
| BUILD-1 | `npm run typecheck` passes on current branch | PASS | `npm run typecheck` -> exit code `0` at 2026-04-23 20:50 +03 | ws10-build-qa |
| BUILD-2 | Expo web smoke serves `/login` | PASS | `CI=1 npx expo start --web --non-interactive --port 8088` + `curl http://127.0.0.1:8088/login` -> `HTTP_STATUS=200` at 2026-04-23 20:51 +03 | ws10-build-qa |
| BUILD-3 | iOS preview build succeeds | FAIL | `npx eas-cli build --platform ios --profile preview --non-interactive` -> `An Expo user account is required to proceed` at 2026-04-23 20:59 +03 | ws15-build-release |
| BUILD-4 | Android preview build succeeds | FAIL | `npx eas-cli build --platform android --profile preview --non-interactive` -> `An Expo user account is required to proceed` at 2026-04-23 20:59 +03 | ws15-build-release |
| REL-1 | Open critical blockers count = 0 | FAIL | 3 open blockers remain | ORCH-1 |

## Pass criteria for go-live

- All gates above must be `PASS`.
- Any new Sev-1 bug discovered after this update sets `REL-1` to `FAIL` until closed.

## Validation evidence snippets (WS10)

```bash
npm run typecheck
# > kedy-mobile@1.0.0 typecheck
# > tsc --noEmit
# exit code: 0
```

```bash
CI=1 npx expo start --web --non-interactive --port 8088
curl -s -o /tmp/ws10-expo-web.html -w "%{http_code}" http://127.0.0.1:8088/login
# 200
# log tail includes:
# Waiting on http://localhost:8088
# Web Bundled ... expo-router/entry.js
```

## Validation evidence snippets (WS15)

```bash
npx eas-cli --version
# eas-cli/18.8.1 darwin-arm64 node-v25.4.0
```

```bash
npx eas-cli whoami
# Not logged in
```

```bash
npx eas-cli build --platform ios --profile preview --non-interactive
# An Expo user account is required to proceed.
# Either log in with eas login or set the EXPO_TOKEN environment variable...
# Error: build command failed.
```

```bash
npx eas-cli build --platform android --profile preview --non-interactive
# An Expo user account is required to proceed.
# Either log in with eas login or set the EXPO_TOKEN environment variable...
# Error: build command failed.
```

## Validation evidence snippets (WS13)

```bash
API_BASE=$(grep '^EXPO_PUBLIC_API_BASE_URL=' .env | cut -d= -f2-)
curl -sS -o /tmp/ws13-login.json -w '%{http_code}' "$API_BASE/auth/login" \
  -H 'Content-Type: application/json' \
  --data '{"email":"owner@palmbeauty.com","password":"123456"}'
# 200
```

```bash
curl -sS -o /tmp/ws13-bootstrap.json -w '%{http_code}' "$API_BASE/api/mobile/bootstrap" \
  -H "Authorization: Bearer <accessToken>"
# 200
```

```bash
curl -sS -o /tmp/ws13-refresh.json -w '%{http_code}' "$API_BASE/auth/refresh" \
  -H 'Content-Type: application/json' \
  --data '{"refreshToken":"<refreshToken>"}'
# 200
```

```bash
curl -sS -o /tmp/ws13-logout.json -w '%{http_code}' "$API_BASE/auth/logout" \
  -H 'Content-Type: application/json' \
  --data '{"refreshToken":"<refreshToken>"}'
# 204
```
