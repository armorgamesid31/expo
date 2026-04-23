# WS7-P0-SCHEDULE-CUSTOMERS Agent Log

- timestamp: 2026-04-23T17:48:03Z
- status: completed
- objective: Align Schedule + Customers P0 screens to backend contract and stabilize list rendering with production-minimum behavior.
- files_touched:
  - app/(tabs)/schedule/index.tsx
  - app/(tabs)/customers/index.tsx
  - docs/execution/agents/ws7-p0-schedule-customers.md
- blockers: []

## Applied Changes

### 1) Endpoint alignment
- `schedule` endpoint changed:
  - from: `/api/mobile/admin/appointments?from=today&to=today`
  - to: `/api/admin/appointments?from=today&to=today&limit=120`
- `customers` endpoint changed:
  - from: `/api/mobile/admin/customers`
  - to: `/api/admin/customers?limit=100`

### 2) Null-safe response mapping for admin shapes
- Added `normalizeAppointments(payload: unknown)` in schedule screen.
- Added `normalizeCustomers(payload: unknown)` in customers screen.
- Both normalizers support:
  - `{ items: [...] }` response shape
  - direct `[...]` array fallback
  - null/invalid item fallback with safe defaults

### 3) Fixed-height container removal
- Removed brittle fixed wrapper (`style={{ height: 560 }}`) from customers screen.
- Kept list behavior smooth with deterministic render gates + virtualization knobs.

### 4) Deterministic loading/error/empty/retry
- `customers` now mirrors deterministic state gates used in schedule:
  - loading -> message
  - error -> card + retry
  - empty -> card
  - data -> list
- Refresh state unified with React Query `isRefetching` (no local spinner desync).

## Contract assumptions applied
- Admin endpoints for these two P0 screens are served under `/api/admin/*`.
- Response may come as either `{ items: [...] }` or direct array, so UI normalizes both safely.
- Appointment/customer rows may contain nullable fields and non-numeric IDs; UI falls back safely.

## Validation
- `npm run typecheck` passed.
