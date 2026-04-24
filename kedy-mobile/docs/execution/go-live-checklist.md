# Go-Live Checklist (Parity-First)

Last updated: 2026-04-24 03:05 +03
Rule: Gate kaniti yoksa durum `FAIL` kabul edilir.

## Gate status

| ID | Gate | Status | Blocking | Evidence | Owner |
|---|---|---|---|---|---|
| PARITY-1 | Login visual + flow parity | FAIL | YES | Chrome MCP full PASS kaniti eksik | PARITY-QA + MIGRATOR-CORE |
| PARITY-2 | Schedule visual + flow parity | FAIL | YES | Chrome MCP full PASS kaniti eksik | PARITY-QA + MIGRATOR-CORE |
| PARITY-3 | Customers visual + flow parity | FAIL | YES | Chrome MCP full PASS kaniti eksik | PARITY-QA + MIGRATOR-CORE |
| PARITY-4 | Conversations visual + flow parity | FAIL | YES | Chrome MCP full PASS kaniti eksik | PARITY-QA + MIGRATOR-CORE |
| PARITY-5 | Settings visual + flow parity | FAIL | YES | Chrome MCP full PASS kaniti eksik | PARITY-QA + MIGRATOR-MENU |
| PARITY-6 | Notifications visual + flow parity | FAIL | YES | Chrome MCP full PASS kaniti eksik | PARITY-QA + MIGRATOR-MENU |
| UX-1 | Loading/empty/error/retry parity (critical 6) | FAIL | YES | UX guard sign-off eksik | UX-SYSTEM-GUARD |
| AUTH-1 | Login/auth bootstrap works on target API | PASS | YES | 2026-04-24 probe: `POST /auth/login=200`, `GET /api/mobile/bootstrap=200` | API-NATIVE-STABILIZER |
| PUSH-1 | Push register/unregister expo provider contract | PASS | YES | 2026-04-24 probe: `register(expo)=200`, `unregister(expo)=200` | API-NATIVE-STABILIZER |
| PUSH-2 | Invalid/missing provider rejected by backend (`4xx`) | FAIL | YES | 2026-04-24 negative probe: `provider=fcm -> 200`, `provider missing -> 200` | API-NATIVE-STABILIZER + backend |
| BUILD-3 | iOS preview build + smoke evidence | FAIL | NO | Non-blocking: iOS build kesintisi web parity akisini durdurmaz | API-NATIVE-STABILIZER |
| BUILD-4 | Android preview build + smoke evidence | FAIL | NO | Non-blocking: Android build kesintisi web parity akisini durdurmaz | API-NATIVE-STABILIZER |
| REL-1 | Blocking gates closed (`YES` blockers = 0) | FAIL | YES | parity + push acik | ORCH-CORE |

## Pass criteria

- Kritik 6 ekranin tamami Chrome MCP'de PASS.
- UX-1 PASS.
- Push validation gate (`PUSH-2`) PASS.
- `REL-1` PASS.

## Evidence policy

- Kanit tek kaynak: `docs/execution/*` + `.parity-logs/*`.
- Kimlik bilgileri dokumana yazilmaz; komut orneklerinde placeholder kullanilir.
- Native build gate'leri (`BUILD-3/BUILD-4`) kayit zorunlulugudur; web parity kapanisini bloke etmez.

## Command templates (redacted)

```bash
API_BASE=<EXPO_PUBLIC_API_BASE_URL>
curl -sS -o /tmp/login.json -w '%{http_code}' "$API_BASE/auth/login" \
  -H 'Content-Type: application/json' \
  --data '{"email":"<PARITY_EMAIL>","password":"<PARITY_PASSWORD>"}'
```

```bash
curl -sS -o /tmp/register.json -w '%{http_code}' "$API_BASE/api/mobile/push/register" \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'Content-Type: application/json' \
  --data '{"provider":"expo","token":"<EXPO_PUSH_TOKEN>"}'
```
