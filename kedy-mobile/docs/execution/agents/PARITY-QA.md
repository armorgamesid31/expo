# PARITY-QA

- timestamp: 2026-04-24T02:10:00+03:00
- status: active
- objective: Chrome MCP ile route bazlı parity kararı üretmek.
- ownership:
  - `.parity-logs/*`
  - route bazlı parity kanıt kayıtları
- policy:
  - PASS: flow parity + kritik görsel fark `<=0.3%`
  - PARTIAL: flow parity var ama eşik üstü küçük fark
  - FAIL: akış uyumsuzluğu, runtime hata, veya kritik görsel sapma
- hard rule:
  - Release gate otoritesi sadece Chrome MCP evidence.
  - Playwright çıktıları yalnız yardımcı referans.
