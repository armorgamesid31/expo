# WS10-BUILD-QA

- Timestamp: 2026-04-23 20:51 +03
- Status: completed
- Objective: Run feasible local acceptance checks and attach executable evidence to go-live checklist.

## Ownership scope

- `docs/execution/go-live-checklist.md`
- `docs/execution/agents/ws10-build-qa.md`

## Commands executed

```bash
npm run typecheck
```

Result:

- Exit code: `0`
- Output:
  - `> kedy-mobile@1.0.0 typecheck`
  - `> tsc --noEmit`

```bash
CI=1 npx expo start --web --non-interactive --port 8088
curl -s -o /tmp/ws10-expo-web.html -w "%{http_code}" http://127.0.0.1:8088/login
```

Result:

- HTTP status: `200`
- Evidence from log tail:
  - `Waiting on http://localhost:8088`
  - `Web Bundled ... expo-router/entry.js`

## Checklist updates applied

- `BUILD-1`: `PASS` with current-session evidence.
- `BUILD-2`: `PASS` with current-session web smoke evidence.
- `BUILD-3`: `FAIL` explicitly marked unresolved (missing iOS preview build artifact).
- `BUILD-4`: `FAIL` explicitly marked unresolved (missing Android preview build artifact).

## Unresolved items

- iOS preview build proof not produced in this session.
- Android preview build proof not produced in this session.
