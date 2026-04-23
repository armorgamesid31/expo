# WS15-BUILD-RELEASE

Timestamp: 2026-04-23 20:59 +03
Status: completed (blocked)
Owner: ws15-build-release

## Objective

Verify iOS/Android preview build path for EAS and capture artifact evidence or hard blockers.

## Files touched

- `docs/execution/go-live-checklist.md`
- `docs/execution/agents/ws15-build-release.md`

## Commands and exact results

```bash
npx eas --version
# npm error could not determine executable to run
# exit code: 1
```

```bash
npx eas-cli --version
# eas-cli/18.8.1 darwin-arm64 node-v25.4.0
# exit code: 0
```

```bash
npx eas-cli whoami
# Not logged in
# exit code: 1
```

```bash
npx eas-cli build --platform ios --profile preview --non-interactive
# An Expo user account is required to proceed.
# Either log in with eas login or set the EXPO_TOKEN environment variable if you're using EAS CLI on CI
# Error: build command failed.
# exit code: 1
```

```bash
npx eas-cli build --platform android --profile preview --non-interactive
# An Expo user account is required to proceed.
# Either log in with eas login or set the EXPO_TOKEN environment variable if you're using EAS CLI on CI
# Error: build command failed.
# exit code: 1
```

## Artifact evidence

- iOS preview artifact: unavailable (blocked by missing Expo auth token/session)
- Android preview artifact: unavailable (blocked by missing Expo auth token/session)

## Blockers

1. No authenticated Expo session (`eas whoami` returns `Not logged in`).
2. `EXPO_TOKEN` is not set in current environment.
3. Without (1) or (2), EAS cloud builds cannot start; BUILD-3/BUILD-4 remain FAIL.

## Next step

Set `EXPO_TOKEN` (or run `eas-cli login`) and rerun:

```bash
npx eas-cli build --platform ios --profile preview --non-interactive
npx eas-cli build --platform android --profile preview --non-interactive
```
