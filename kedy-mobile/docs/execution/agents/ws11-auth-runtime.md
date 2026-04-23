# WS11-AUTH-RUNTIME

- Owner: WS11-AUTH-RUNTIME
- Status: completed
- Updated: 2026-04-23

## Objective
Login ekranında runtime config/auth hatalarının kullanıcıya net ve deterministik şekilde gösterilmesi.

## Files touched
- `/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/app/(auth)/login.tsx`
- `/Users/ezgi/Documents/repolar/Salonmanagementsaasapp-rn-migration/kedy-mobile/docs/execution/agents/ws11-auth-runtime.md`

## Changes
- `ApiError` tabanlı hata sınıflandırması eklendi.
- Hata eşleme kuralları netleştirildi:
  - `status=0 + code=API_BASE_URL_MISSING` -> config hatası mesajı
  - `status=0` -> network/api erişim hatası mesajı
  - `status=401` -> kimlik doğrulama hatası mesajı
  - `status>=500` -> sunucu geçici hata mesajı
- `submitError` state eklendi ve ekranda inline gösterim sağlandı.
- Kullanıcı alanlarında değişiklik olduğunda `submitError` temizleniyor.
- Submit başlangıcında eski hata temizleniyor; request sırasında buton ve input deterministic şekilde kilitli kalıyor.

## Runtime test notes (no secrets)
- Geçerli olmayan API base senaryosunda kullanıcıya config mesajı gösteriliyor.
- Ağ hatasında kullanıcıya bağlantı kontrol mesajı gösteriliyor.
- 401 senaryosunda kullanıcıya yanlış kimlik bilgisi mesajı gösteriliyor.
- Test notlarında herhangi bir credential/token saklanmadı.

## Blockers
- Yok (WS11 scope içinde).

## Next step
- WS11 çıktısı diğer agentlarla birlikte E2E smoke testte doğrulanmalı (web + iOS/Android).
