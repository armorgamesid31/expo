# New Machine / New Codex Account Handover

Last updated: 2026-04-23 21:30 +03

This file is the single entrypoint for a new Codex account/machine to finish migration and ship production-ready.

## 1) Read order (do not skip)
1. `docs/execution/work-items.md`
2. `docs/execution/blockers.md`
3. `docs/execution/decisions.md`
4. `docs/execution/go-live-checklist.md`
5. `docs/execution/handover.md`
6. `docs/execution/agents/*.md`

## 2) Current state
- Completed: auth/core migration, P0 endpoint alignment, push client contract, notifications compatibility mapping, typecheck.
- Open go-live blockers:
  - `BUILD-3/BUILD-4`: iOS/Android preview artifact proof missing.
  - `PUSH-4/PUSH-5`: backend still accepts invalid/missing push provider.
  - `PARITY-1`: Chrome MCP route parity matrix missing (transport instability happened in prior session).
- Existing Android build link (previous run):
  - https://expo.dev/accounts/kedyapp/projects/kedy-mobile/builds/b02637bc-63d7-4e61-b1e2-ad1a56d63a29

## 3) Bootstrap on new machine
```bash
cd /Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile
npm ci
```

Create `kedy-mobile/.env` if missing:
```bash
EXPO_PUBLIC_API_BASE_URL=https://app.berkai.shop
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
```

Run Expo:
```bash
npx expo start -c
```

Expected:
- Expo web: `http://localhost:8082` (or next free port)
- Original web app (repo root): usually `http://localhost:5173`

## 4) EAS setup + builds (required for BUILD-3/BUILD-4)
```bash
export EXPO_TOKEN=<NEW_TOKEN>
npx eas-cli whoami
```

If project is not linked:
```bash
npx eas-cli init --non-interactive --force
```

Run preview builds:
```bash
npx eas-cli build --platform ios --profile preview --non-interactive
npx eas-cli build --platform android --profile preview --non-interactive
```

If iOS fails with credentials in non-interactive mode, rerun iOS once in interactive mode to set credentials:
```bash
npx eas-cli build --platform ios --profile preview
```

For evidence capture:
```bash
npx eas-cli build:list --limit 10
```
Record build IDs/links and install/open proof in `docs/execution/go-live-checklist.md`.

## 5) Push governance closure (required for PUSH-4/PUSH-5)
Positive probes (must stay `200`):
- `POST /api/mobile/push/register` with `provider:"expo"`.
- `POST /api/mobile/push/unregister` with `provider:"expo"`.

Negative probes (must become `4xx` after backend fix):
- `provider:"fcm"`
- missing `provider`

When backend fix is deployed:
1. Rerun probes.
2. Update `docs/execution/blockers.md` and `docs/execution/decisions.md`.
3. Mark `PUSH-4/PUSH-5` closed with command evidence.

## 6) Chrome parity audit closure (required for PARITY-1)
Use Chrome MCP in mobile viewport and compare original vs migrated for:
- login
- schedule
- customers
- conversations (list + detail)
- settings
- notifications

Rule: parity standard is `Visual + Core Flow` (not pixel perfect).

Output must include route table with:
- `PASS / PARTIAL / FAIL`
- missing behavior note

Update:
- `docs/execution/agents/ws16-chrome-parity.md`
- `docs/execution/work-items.md`

## 7) Production-ready definition (exit criteria)
Release is ready only when all are true:
1. `docs/execution/go-live-checklist.md` all gates are `PASS`.
2. `docs/execution/blockers.md` open blockers count is `0`.
3. Evidence exists for:
   - iOS + Android preview build IDs/links
   - auth runtime flows
   - push positive/negative probes
   - parity matrix

## 8) Working protocol for continuity
- Keep exactly one source of truth in docs:
  - `work-items.md`, `blockers.md`, `decisions.md`, `handover.md`
- For each work cycle, append/update:
  - what changed
  - evidence commands/results
  - remaining blocker owner
- Do not store tokens in repo files.
- Use ephemeral session export for secrets:
```bash
export EXPO_TOKEN=...
```
