# Blockers

Last updated: 2026-04-24 03:05 +03
Owner: ORCH-CORE

## Open blockers

1. `PARITY-CORE-1` - Pixel+Flow parity not closed
- Owner: PARITY-QA + UX-SYSTEM-GUARD + MIGRATOR-CORE/MENU
- Impact: `%100` parity hedefi saglanmadi.
- Current evidence: `.parity-logs/latest/parity-report.md` (legacy), Chrome MCP route kanitlari kismi.
- Closure evidence:
  - Kritik 6 ekran icin Chrome MCP PASS
  - Ekran basi kritik fark esigi `<=0.3%`
  - 2026-04-24 ilerleme: login + schedule loading blocker kapandi, route-level source/target screenshot seti uretildi.

2. `PUSH-4/PUSH-5` - Backend push provider validation permissive
- Owner: API-NATIVE-STABILIZER + backend owner (`meta`)
- Impact: client/server contract governance eksik.
- Current evidence: 2026-04-24 live negative probe sonucunda `provider=fcm` ve `provider missing` istekleri hala `200` donuyor.
- Closure evidence:
  - backend validation degisikligi (PR/commit)
  - negative probe sonuclari `4xx`
  - register/unregister payload ornekleri guncel

## Non-blocking tracked items

1. `BUILD-3/BUILD-4` - iOS/Android preview build kanitlari
- Owner: API-NATIVE-STABILIZER
- Rule: parity akisina blocker degil; web parity turlari build sekteye ugrasa da devam eder.
- Expected evidence:
  - build ID/link
  - install/open smoke sonucu

## Recently closed

- `API-1` P0 endpoint mismatch closure (`/api/admin/*` hizasi).
- `P1-1` notifications response shape compatibility closure.

## 2026-04-24 03:41 +03 PARITY-QA blocker update

- `PARITY-CORE-1` durumu devam ediyor.
- Chrome MCP mobile route matrix: PASS 0 / PARTIAL 5 / FAIL 1
- `settings` route FAIL (IA/yapi source ile kritik uyumsuz).
- Diger kritik route'lar PARTIAL seviyede; PASS kapanisi yok.
- Kanit: `.parity-logs/latest/{login,schedule,customers,conversations,settings,notifications}-{source,target}.png`

## 2026-04-24 13:00 +03 blocker delta

- `PARITY-CORE-1` acik kaldi (PASS sayisi 0).
- Kritik iyilesme: `settings` artik FAIL degil, PARTIAL.
- Kapanis icin kalan durum: 6 route'un da PASS seviyesine cikmasi gerekiyor.
- Kanit: `.parity-logs/latest/*-r2.png`
