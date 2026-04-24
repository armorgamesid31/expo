# Agent Logs

Purpose: 6-agent modeli ile parity-first yürütmeyi izlemek.

## Persistent agents
- `ORCH-CORE.md`
- `PARITY-QA.md`
- `UX-SYSTEM-GUARD.md`

## Temporary agents
- `MIGRATOR-CORE.md`
- `MIGRATOR-MENU.md`
- `API-NATIVE-STABILIZER.md`

## Legacy logs
- `orchestrator.md`
- `ws*.md`

## Rules
- Güncellemeler timestamp ile append edilir.
- Her agent kaydı şunları içerir: objective, scope, blockers, next step.
- Tur sonu zorunlu kapanış dosyaları:
  - `docs/execution/work-items.md`
  - `docs/execution/blockers.md`
  - `docs/execution/decisions.md`
  - `docs/execution/go-live-checklist.md`
  - `docs/execution/handover.md`
- Ekran DONE kararı: MIGRATOR + PARITY-QA + UX-SYSTEM-GUARD onayı.
