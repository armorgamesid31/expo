# Handover

Last updated: 2026-04-24 02:10 +03
Current owner: ORCH-CORE

## Read order

1. `docs/execution/work-items.md`
2. `docs/execution/blockers.md`
3. `docs/execution/decisions.md`
4. `docs/execution/go-live-checklist.md`
5. `docs/execution/agent-topology.md`

## Current snapshot

- 6-agent işletim modeli aktif.
- Parity authority Chrome MCP olarak kilitlendi.
- Kritik 6 ekran halen parity closure turunda.
- Push backend validation (`PUSH-4/PUSH-5`) açık.
- Native build kanıtları paralel takipte; parity akışı non-blocking.

## Immediate next cycle

1. MIGRATOR-CORE: login/schedule/customers parity farkları.
2. MIGRATOR-MENU: settings/notifications + stack parity farkları.
3. PARITY-QA: Chrome MCP kanıt matrisi güncellemesi.
4. UX-SYSTEM-GUARD: state parity doğrulaması.
5. API-NATIVE-STABILIZER: push negative probes + build smoke takibi.

## Rules for takeover

- Her tur sonunda `docs/execution/*` zorunlu güncelle.
- Gizli bilgi/token/hesap şifresi repo dosyasına yazma.
- Ekran DONE kararı için üçlü onay kuralını ihlal etme.
