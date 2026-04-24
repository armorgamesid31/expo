# Agent Topology (6-Agent Model)

Last updated: 2026-04-24 02:10 +03
Owner: ORCH-CORE

## Persistent agents (always on)

1. `ORCH-CORE`
- Tur planlama, görev atama (2-4 ekran), blocker/gate kararı.
- Her tur sonunda zorunlu doküman kapanışı:
  - `docs/execution/work-items.md`
  - `docs/execution/blockers.md`
  - `docs/execution/decisions.md`
  - `docs/execution/go-live-checklist.md`
  - `docs/execution/handover.md`
  - `docs/execution/agents/*.md`

2. `PARITY-QA`
- Chrome MCP ile source/target route parity kıyası.
- Her route için kanıt üretir: snapshot/screenshot, flow sonucu, PASS/PARTIAL/FAIL.

3. `UX-SYSTEM-GUARD`
- Tipografi/spacing/interaction/state parity denetimi.
- `loading/empty/error/retry` farkını blocker olarak işaretler.

## Temporary agents (cycle scoped)

4. `MIGRATOR-CORE`
- Kritik 6 ekran: `login`, `schedule`, `customers`, `conversations`, `settings`, `notifications`.

5. `MIGRATOR-MENU`
- Team/SalonInfo/Feature alt route'ları ve stack ekranları.

6. `API-NATIVE-STABILIZER`
- Auth/session, push contract, Android/iOS build-smoke kanıtları.

## Execution policy

- Parity otoritesi: yalnız Chrome MCP.
- Bir ekranın `done` olma koşulu:
  1. MIGRATOR tamam
  2. PARITY-QA = PASS
  3. UX-SYSTEM-GUARD = PASS
- Web parity kapanışı build gate'lerinden bağımsız ilerler.
- Native build gate'leri paralelde takip edilir ve mümkün olan en erken turda kanıtlanır.

## Stop condition

- Faz-1: kritik 6 ekranın tamamı PASS.
- Faz-2: kapsam route'larının tamamı PASS.
- `blockers.md` içinde parity blocker sayısı `0`.
- Push/backend contract açık kritik issue `0`.
