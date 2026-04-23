# Agent Log

- timestamp: 2026-04-23T09:20:00+03:00
- status: completed
- objective: Push register/unregister contract consistency + retry-safe hardening
- files_touched:
  - src/services/push-notifications.ts
  - src/types/mobile-api.ts
- blockers: []
- next_step: Backend ile `/api/mobile/push/register` ve `/api/mobile/push/unregister` için `provider: "expo"` doğrulama smoke testi

## Work Completed
- `PushProvider` tipi doğrudan servis katmanına bağlandı (`PUSH_PROVIDER: PushProvider = 'expo'`).
- Unregister payload tipi eklendi ve kullanıldı:
  - `PushUnregisterPayload` eklendi.
  - `unregisterPushToken` artık typed payload gönderiyor.
- Retry-safe davranış sertleştirildi:
  - `unregisterPushToken` içinde lokal token silme işlemi `apiFetch('/unregister')` başarılı olduktan sonra yapılıyor.
  - Böylece unregister başarısızsa token korunuyor ve sonraki denemede tekrar unregister yapılabiliyor.
- Register payload sözleşmesi korundu:
  - `PushRegistrationPayload` + `provider: 'expo'` zorunlu.

## Backend Assumptions
- `/api/mobile/push/register` endpointi aşağıdaki alanları kabul ediyor:
  - `token: string`
  - `provider: "expo"`
  - `platform: string`
  - `appVersion: string | null`
  - `deviceMeta: Record<string, unknown>`
- `/api/mobile/push/unregister` endpointi aşağıdaki alanları kabul ediyor:
  - `token: string`
  - `provider: "expo"`
- Register/unregister endpointleri idempotent davranmalı (aynı token tekrar gönderildiğinde fatal hata üretmemeli).
