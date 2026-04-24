# Decisions

Last updated: 2026-04-24 03:05 +03
Owner: ORCH-CORE

1. Parity otoritesi Chrome MCP olarak kilitlendi.
- Decision: Route bazli PASS/PARTIAL/FAIL karari yalniz Chrome MCP kaniti ile verilir.
- Why: calisma kurali ve canli akis kiyasi zorunlulugu.

2. Playwright parity ciktisi yardimci kanita indirildi.
- Decision: `scripts/parity/run-parity.ts` release gate karari vermez.
- Why: parity gate tek otorite olarak Chrome MCP secildi.

3. Kritik 6 ekran faz kapisi zorunlu.
- Decision: login/schedule/customers/conversations/settings/notifications PASS olmadan faz-2 yok.
- Why: parity-first yaklasimini korumak.

4. Ekran kapanisinda uclu onay zorunlu.
- Decision: MIGRATOR tamam + PARITY-QA PASS + UX-SYSTEM-GUARD PASS.
- Why: sadece gorsel degil akis ve durum davranisini da esitlemek.

5. Native build sorunlari parity akisini durdurmaz.
- Decision: iOS/Android build sekteye ugramasi web parity turlarini durdurmaz; BUILD gate'leri non-blocking izlenir.
- Why: kullanici yonergesi ve teslim hizi.

6. Kimlik bilgileri repo icinde duz yazi tutulmaz.
- Decision: test hesabi yalniz runtime env uzerinden kullanilir.
- Why: guvenlik ve handover standardi.

7. Push backend governance release kalemi olarak acik kalir.
- Decision: invalid/missing provider icin backend `4xx` donene kadar `PUSH-4/PUSH-5` acik.
- Why: 2026-04-24 canli probe sonucunda halen `200` donuyor.

8. Schedule data window ISO date zorunlulugu.
- Decision: `app/(tabs)/schedule/index.tsx` endpoint query paramlari `today` yerine ISO start/end of day ile gonderilir.
- Why: backend `/api/admin/appointments` `from/to` icin ISO tarih bekliyor; `today` ile `400` donup ekran yuklemede kaliyordu.

9. Tabs only-index policy for Expo web parity.
- Decision: Tab root screen names `*/index` olarak tanimlandi ve nested tab routes `href:null` ile gizlendi.
- Why: webde route-sisimi tab bar (fazladan tab itemlari) parity'i bozuyordu.
