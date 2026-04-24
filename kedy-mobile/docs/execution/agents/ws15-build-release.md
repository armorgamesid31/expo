# WS15-BUILD-RELEASE

Timestamp: 2026-04-24 00:35 +03
Status: in_progress (partially blocked)
Owner: ws15-build-release

## Objective

Verify iOS/Android preview build path for EAS and capture artifact evidence or hard blockers.

## Files touched

- `docs/execution/go-live-checklist.md`
- `docs/execution/agents/ws15-build-release.md`

## Commands and exact results

```bash
eas --version
# eas-cli/18.8.1 win32-x64 node-v22.14.0
# exit code: 0
```

```bash
eas whoami
# codexx (robot) (authenticated using EXPO_TOKEN)
# Accounts:
# • kedyapp (Role: Admin)
# exit code: 0
```

```bash
eas build --platform ios --profile preview --non-interactive
# Failed to set up credentials.
# You're in non-interactive mode. EAS CLI couldn't find any credentials suitable for internal distribution.
# Error: build command failed.
# exit code: 1
```

```bash
eas build --platform android --profile preview --non-interactive
# command timed out locally while waiting, build was created on EAS queue
```

```bash
eas build:list --limit 5
# Android build queued:
# ID: afc53e52-9466-457d-b54a-2445d970dce5
# Logs: https://expo.dev/accounts/kedyapp/projects/kedy-mobile/builds/afc53e52-9466-457d-b54a-2445d970dce5
# Status: in queue
```

## Artifact evidence

- iOS preview artifact: unavailable (blocked by iOS credentials setup in non-interactive mode)
- Android preview artifact: pending (`afc53e52-9466-457d-b54a-2445d970dce5` queued)

## Blockers

1. iOS internal distribution credentials cannot be configured in non-interactive mode.
2. Android preview build is queued but not yet finished; install/open proof unavailable.

## Next step

1. Run iOS build once in interactive mode to complete credentials bootstrap.
2. Wait Android queue completion and record APK URL + install/open proof.
3. Then update `go-live-checklist.md` (`BUILD-3`, `BUILD-4`).

```bash
eas build --platform ios --profile preview
eas build:list --limit 10
```
