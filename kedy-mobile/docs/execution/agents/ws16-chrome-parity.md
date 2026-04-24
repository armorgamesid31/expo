# WS16 Playwright Parity Auditor

Last updated: 2026-04-24 00:40 +03
Status: COMPLETED
Owner: ws16-chrome-parity

## Mission
Compare original local web vs migrated Expo web in mobile viewport.

## Tooling
- Playwright (`Pixel 5` emulation) was used for this cycle.
- Artifact root: `kedy-mobile/.parity-logs/`
  - JSON report: `.parity-logs/parity-result.json`
  - Screenshots: `.parity-logs/screens/*.png`

## Environment
- Original web: `http://127.0.0.1:5173`
- Expo web: `http://127.0.0.1:8082`

## Routes audited
- Original: `/auth/login`, `/app/schedule`, `/app/customers`, `/app/conversations`, `/app/settings`, `/app/notifications`
- Expo: `/login`, `/schedule`, `/customers`, `/conversations`, `/settings`, `/notifications`

## Parity verdicts (this cycle)
| Route | Original final URL | Expo final URL | Verdict | Gap note |
|---|---|---|---|---|
| Login | `/auth/login` | `/login` | PASS | Both load login form without runtime error text. |
| Schedule | `/auth/login` (redirect) | `/login` (redirect) | PASS | Both enforce unauthenticated redirect-to-login behavior. |
| Customers | `/auth/login` (redirect) | `/login` (redirect) | PASS | Redirect behavior parity is consistent. |
| Conversations | `/auth/login` (redirect) | `/login` (redirect) | PASS | Redirect behavior parity is consistent. |
| Settings | `/auth/login` (redirect) | `/login` (redirect) | PASS | Redirect behavior parity is consistent. |
| Notifications | `/auth/login` (redirect) | `/login` (redirect) | PASS | Redirect behavior parity is consistent. |

## Closure statement
- `PARITY-1` closure evidence is available in `.parity-logs/parity-result.json` plus 12 screenshots.
- Remaining parity depth (post-login deep behavior) is covered by separate functional QA gates, not WS16 route parity gate.

---

## Cycle-01 addendum (2026-04-24 01:13 +03)

- Tooling was upgraded to scripted headless pipeline: `scripts/parity/run-parity.ts`.
- Command: `npm run parity:cycle`.
- New canonical artifact path:
  - `.parity-logs/latest/parity-report.md`
  - `.parity-logs/latest/parity-report.json`

Result summary:
- Flow parity: PASS on all mapped routes.
- Pixel parity: FAIL on all mapped routes.
- Observed diff ratios:
  - iPhone12: ~`11.335%`
  - Pixel5: ~`10.047%`

Operational decision:
- Keep `PARITY-1` as historical route-audit closure.
- Open strict blocker `PARITY-CORE-1` for `%100 Pixel+Flow` target until all mapped routes are <= `0.3%`.
