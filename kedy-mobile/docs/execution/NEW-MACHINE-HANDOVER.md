# New Machine / New Codex Account Handover

Last updated: 2026-04-24 02:10 +03

Bu dosya yeni makinede parity-first yürütmeyi hızlıca ayağa kaldırmak içindir.

## 1) Read order
1. `docs/execution/work-items.md`
2. `docs/execution/blockers.md`
3. `docs/execution/decisions.md`
4. `docs/execution/go-live-checklist.md`
5. `docs/execution/handover.md`
6. `docs/execution/agents/*.md`

## 2) Current state
- 6-agent model aktif.
- Parity authority Chrome MCP.
- Açık kritik kalemler:
  - `PARITY-CORE-1`
  - `PUSH-2`
- Native build kalemleri (`BUILD-3/BUILD-4`) parity fazında non-blocking takipte.

## 3) Bootstrap (Windows)
```powershell
cd C:\Users\berka\projeler\expo\kedy-mobile
npm ci
```

`.env` (yoksa):
```env
EXPO_PUBLIC_API_BASE_URL=https://app.berkai.shop
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
```

Source + target runtime:
```powershell
npm run parity:start-local
```

Beklenen:
- Source: `http://127.0.0.1:5173`
- Target: `http://127.0.0.1:8082`

## 4) Chrome MCP parity workflow
- Her tur için 2-4 route kıyası yap.
- Her route için şunları kaydet:
  - visual parity sonucu
  - flow parity sonucu (login/redirect/nav/form/retry)
  - PASS/PARTIAL/FAIL kararı
- Kanıtları `.parity-logs/` ve ilgili agent loguna yaz.

## 5) Push governance closure (`meta` ile koordineli)
- Pozitif probe (`provider:"expo"`) çalışmaya devam etmeli.
- Negatif probe (`invalid/missing provider`) `4xx` olmalı.
- Sonuçları `blockers.md` ve `go-live-checklist.md` içine işle.

## 6) Secret policy
- Token ve kimlik bilgileri repo dosyasına yazılmaz.
- Sadece runtime env ile kullanılır:
```powershell
$env:PARITY_EMAIL="<email>"
$env:PARITY_PASSWORD="<password>"
$env:EXPO_TOKEN="<token>"
```
