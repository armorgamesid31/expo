# Work Items

Last updated: 2026-04-24 03:05 +03
Source of truth owner: ORCH-CORE

## Active operating model

- Persistent: `ORCH-CORE`, `PARITY-QA`, `UX-SYSTEM-GUARD`
- Temporary: `MIGRATOR-CORE`, `MIGRATOR-MENU`, `API-NATIVE-STABILIZER`
- Definition: `docs/execution/agent-topology.md`

## Current cycle (Cycle-02)

- Source (`5173`) + target (`8082`) local runtime zorunlu.
- Parity otoritesi Chrome MCP; Playwright ciktilari sadece yardimci referans.
- Kritik 6 ekran PASS olmadan faz-2 baslamaz.

## Task board

1. [IN_PROGRESS] ORCH cycle dispatch and gate sync
- Owner: ORCH-CORE
- Scope: 2-4 ekran/tur atama, blocker onceliklendirme, docs kapanisi.

2. [IN_PROGRESS] Critical 6 parity closure
- Owner: MIGRATOR-CORE
- Scope: login/schedule/customers/conversations/settings/notifications parity farklarini kapat.
- Done rule: MIGRATOR + PARITY-QA + UX-SYSTEM-GUARD uclu onay.
- 2026-04-24 update:
  - Login screen source hierarchy parity aligned (debug text removed).
  - Schedule endpoint window fixed to ISO day range (`from/to`), removing perpetual loading on 400.
  - Tabs route inflation fixed to 5-item nav (`schedule/customers/create/conversations/menu`).

3. [IN_PROGRESS] Menu/stack parity closure
- Owner: MIGRATOR-MENU
- Scope: team/salon-info/feature alt route'lari route-route kapat.

4. [IN_PROGRESS] Chrome MCP parity evidence pipeline
- Owner: PARITY-QA
- Scope: route bazli PASS/PARTIAL/FAIL matrisi, snapshot/screenshot, akis notlari.
- Evidence root: `.parity-logs/` + ilgili agent logu.
- Latest evidence set:
  - `chrome-source-login-pass1.png` / `chrome-target-login-pass1.png`
  - `chrome-source-schedule-pass1.png` / `chrome-target-schedule-pass2.png`
  - `chrome-source-customers-route.png` / `chrome-target-customers-route.png`
  - `chrome-source-conversations-route.png` / `chrome-target-conversations-route.png`
  - `chrome-source-settings-route.png` / `chrome-target-settings-route.png`
  - `chrome-source-notifications-route.png` / `chrome-target-notifications-route.png`

5. [IN_PROGRESS] UX state parity governance
- Owner: UX-SYSTEM-GUARD
- Scope: loading/empty/error/retry ve geri bildirim tutarliligi.

6. [IN_PROGRESS] Auth/push/native stability
- Owner: API-NATIVE-STABILIZER
- Scope: auth/session kanitlari, push contract kapanisi, Android/iOS build-smoke.
- Latest evidence (2026-04-24): login=200, bootstrap=200, push register/unregister expo=200, bad/missing provider=200.
- Policy: Native build sekteye ugrasa bile web parity akisi durmaz (non-blocking takip).

## Next 3 tasks

1. Login + shell ust bosluk/tipografi farklarini kapat ve Chrome MCP ile tekrar kiyasla.
2. Schedule + Customers interaction parity (filter/form/retry) kapatip PASS'e cek.
3. Push negative probe (`invalid/missing provider`) backend tarafinda 4xx kapanisini dogrula.

## Risky files (first audit)

- `app/(auth)/login.tsx`
- `app/(tabs)/schedule/index.tsx`
- `app/(tabs)/customers/index.tsx`
- `app/(tabs)/conversations/[conversationId].tsx`
- `app/(stack)/notifications/index.tsx`
- `src/services/push-notifications.ts`
