# Agent Logs

Purpose: Each sub-agent writes progress in its own file to enable safe takeover by another agent/session/account.

Rules:
- One file per workstream agent.
- Append-only updates with timestamp.
- Include: objective, files touched, status, blockers, next step.
- If agent stops, successor continues in same file under "takeover" entry.

Orchestrator files:
- `orchestrator.md`: global status, cross-stream blockers, priorities.

Worker files:
- `ws1-build.md`
- `ws2-core.md`
- `ws3-p0a.md`
- `ws4-p0b.md`
- `ws5-push.md`
- `ws6-qa.md`
