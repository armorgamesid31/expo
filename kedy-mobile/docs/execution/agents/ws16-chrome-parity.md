# WS16 Chrome Parity Auditor

Last updated: 2026-04-23 22:28 +03
Status: BLOCKED (tooling)
Owner: ws16-chrome-parity

## Mission
Compare original local web vs migrated Expo web in mobile viewport using Chrome DevTools MCP.

## Environment
- Original web: `http://127.0.0.1:5173`
- Expo web: `http://127.0.0.1:8082`

## Attempt log (this cycle)
1. Tried opening Chrome MCP pages for `http://127.0.0.1:5173/auth/login`.
2. MCP returned profile lock error first, then persistent `Transport closed` on all `chrome-devtools/*` calls (`new_page`, `list_pages`).
3. Killed stale local Chrome/Chromium processes and retried.
4. Error persisted: no usable MCP browser session could be established.

## Routes requested for audit
- `/auth/login`
- `/app/schedule` (or equivalent)
- `/app/customers` (or equivalent)
- `/app/conversations` (or equivalent)
- `/app/settings` (or equivalent)
- `/app/notifications` (or equivalent)

## Parity verdicts (this cycle)
| Route | Original | Expo | Verdict | Gap note |
|---|---|---|---|---|
| `/auth/login` | Not audited (MCP blocked) | Not audited (MCP blocked) | FAIL | Chrome MCP transport unavailable, no mobile viewport comparison possible. |
| `/app/schedule` (or equivalent) | Not audited | Not audited | FAIL | Same blocker. |
| `/app/customers` (or equivalent) | Not audited | Not audited | FAIL | Same blocker. |
| `/app/conversations` (or equivalent) | Not audited | Not audited | FAIL | Same blocker. |
| `/app/settings` (or equivalent) | Not audited | Not audited | FAIL | Same blocker. |
| `/app/notifications` (or equivalent) | Not audited | Not audited | FAIL | Same blocker. |

## Blockers
- `PARITY-1`: Chrome DevTools MCP transport is closed; route-level mobile parity cannot run.
- `PARITY-2`: Because WS16 is comparison-only, no fallback audit method is allowed in this cycle.

## Next step
1. Restore Chrome DevTools MCP transport/session.
2. Re-run same six routes in mobile viewport.
3. Publish PASS/PARTIAL/FAIL with concrete visual + core flow notes and screenshots.
