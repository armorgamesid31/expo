# Parity Scripts

## Amaç
Bu klasördeki scriptler lokal kaynak (`Salonmanagementsaasapp`) ve hedef (`kedy-mobile`) uygulamayı aynı anda kaldırmak ve yardımcı parity artefaktı üretmek içindir.

Karar otoritesi:
- Release gate için tek otorite **Chrome MCP parity kanıtı**dır.
- `run-parity.ts` çıktısı sadece legacy yardımcı rapordur.

## Komutlar
- `npm run parity:start-local`
  - Kaynak (`5173`) ve hedef (`8082`) uygulamalarını lokalde ayağa kaldırır.
- `npm run parity:run`
  - Legacy Playwright parity raporu üretir (yardımcı amaçlı).
- `npm run parity:cycle`
  - `start-local` + `parity:run` çalıştırır (yardımcı amaçlı).

## Çıktılar
- `.parity-logs/latest/parity-report.json`
- `.parity-logs/latest/parity-report.md`
- Ekran görüntüleri: `.parity-logs/<timestamp>/*.png`

## Güvenlik
- Login bilgileri dosyaya yazılmaz.
- Script çalıştırmak için shell'de geçici env zorunludur:
  - `PARITY_EMAIL`
  - `PARITY_PASSWORD`
