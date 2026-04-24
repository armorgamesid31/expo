# PARITY-QA

- timestamp: 2026-04-24T03:41:00+03:00
- status: active
- objective: Chrome MCP ile mobil viewport route bazli parity karari uretmek.
- ownership:
  - `.parity-logs/*`
  - route bazli parity kanit kayitlari
- policy:
  - PASS: flow parity + kritik gorsel fark `<=0.3%`
  - PARTIAL: flow parity var ama kritik gorsel farklar suruyor
  - FAIL: akis uyumsuzlugu, runtime hata, veya kritik IA sapmasi
- hard rule:
  - Release gate otoritesi sadece Chrome MCP evidence.
  - Playwright ciktilari yalniz yardimci referans.

## Cycle-02 / Chrome MCP Mobile QA (390x844)

- source: `http://127.0.0.1:5173`
- target: `http://127.0.0.1:8082`
- runtime login: `[REDACTED_RUNTIME_CREDENTIALS]`
- screenshot root: `.parity-logs/latest`

### Route matrix

1. `login` -> `PARTIAL`
- visual parity: Baslik/metin ayni; source'ta logo var, target'ta logo yok.
- flow parity: Iki tarafta da login sonrasi `schedule` redirect calisiyor.
- evidence:
  - `.parity-logs/latest/login-source.png`
  - `.parity-logs/latest/login-target.png`

2. `schedule` -> `PARTIAL`
- visual parity: Source'ta top banner + hizli arama + tarih label semantigi farkli; target daha sade.
- flow parity: Route aciliyor, tab/nav calisiyor, bu turda surekli loading kalmadi.
- technical note (loading hipotezi): Hedefte bu tur loading lock yok; schedule ekraninda console error yok, fetch tarafinda sadece `GET /api/mobile/bootstrap [304]` goruldu. Olasi onceki neden tarih penceresi/istek parametre uyumsuzlugu veya bootstrap cache/sync gecikmesi.
- evidence:
  - `.parity-logs/latest/schedule-source.png`
  - `.parity-logs/latest/schedule-target.png`

3. `customers` -> `PARTIAL`
- visual parity: Veri ve temel aksiyonlar uyumlu; source'ta banner/hizli arama katmani farkli.
- flow parity: `schedule -> customers` gecisi iki tarafta da calisiyor.
- evidence:
  - `.parity-logs/latest/customers-source.png`
  - `.parity-logs/latest/customers-target.png`

4. `conversations` -> `PARTIAL`
- visual parity: Genel yapi benzer; waiting count ve kart yogunlugu/spacing farki var.
- flow parity: Route ve tab nav calisiyor; liste render iki tarafta da stabil.
- evidence:
  - `.parity-logs/latest/conversations-source.png`
  - `.parity-logs/latest/conversations-target.png`

5. `settings` -> `FAIL`
- visual parity: Bilgi mimarisi farkli (source: profil/guvenlik/destek; target: hesap ozeti + ekip/yetki bloklari).
- flow parity: Route aciliyor ama ekran yapisi source ile birebir degil.
- evidence:
  - `.parity-logs/latest/settings-source.png`
  - `.parity-logs/latest/settings-target.png`

6. `notifications` -> `PARTIAL`
- visual parity: Icerik listesi mevcut; top header/badge/list item sunumu ve tipografi farkli.
- flow parity: Route aciliyor ve veri listesi geliyor; retry state bu turda tetiklenmedi.
- evidence:
  - `.parity-logs/latest/notifications-source.png`
  - `.parity-logs/latest/notifications-target.png`

### Summary

- PASS: `0`
- PARTIAL: `5`
- FAIL: `1`
- open parity blocker: `PARITY-CORE-1` (kritik 6 ekranin hicbiri PASS seviyesine cikmadi)

## Cycle-03 / Chrome MCP Mobile Re-check (2026-04-24 13:00 +03)

- viewport: `390x844x3,mobile,touch`
- source: `http://127.0.0.1:5173`
- target: `http://127.0.0.1:8082`
- runtime login: `[REDACTED_RUNTIME_CREDENTIALS]`
- evidence root: `.parity-logs/latest`

### Route matrix (re-measure)

1. `login` -> `PARTIAL`
- visual: metin hiyerarsisi yakin; source logo + hedefte logo yok.
- flow: iki tarafta da login -> schedule redirect OK.
- evidence: `login-source-r2.png`, `login-target-r2.png`

2. `schedule` -> `PARTIAL`
- visual: top banner/hizli arama/tarih label semantigi farkli.
- flow: route aciliyor, loading lock tekrarlanmadi.
- evidence: `schedule-source-r2.png`, `schedule-target-r2.png`

3. `customers` -> `PARTIAL`
- visual: liste ve aksiyonlar var; source'ta ust katman farkli.
- flow: tab gecisi ve route acilisi OK.
- evidence: `customers-source-r2.png`, `customers-target-r2.png`

4. `conversations` -> `PARTIAL`
- visual: genel yapi benzer; sayac/kart yogunlugu ve spacing farki suruyor.
- flow: route acilisi OK.
- evidence: `conversations-source-r2.png`, `conversations-target-r2.png`

5. `settings` -> `PARTIAL` (onceki: FAIL)
- visual: onceki FAIL'e gore belirgin iyilesme; ana bolumler source ile hizalanmis.
- kalan fark: source'taki ust banner/back-nav ve alt nav davranisi hedefte farkli.
- flow: route acilisi OK.
- evidence: `settings-source-r2.png`, `settings-target-r2.png`

6. `notifications` -> `PARTIAL`
- visual: liste var; item sunumu ve ust/alt katman farklari suruyor.
- flow: route acilisi OK.
- evidence: `notifications-source-r2.png`, `notifications-target-r2.png`

### Re-check summary

- PASS: `0`
- PARTIAL: `6`
- FAIL: `0`
- delta: `settings` durumu `FAIL -> PARTIAL`
