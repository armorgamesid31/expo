# Campaign UX Revamp

## Hedef
Kampanya yönetim sayfasını salon sahibi için çok daha anlaşılır, temiz ve kullanımı kolay hale getirmek.
Ses notlarındaki geri bildirimler esas alındı.

---

## Görevler

- [ ] **1. Form Temizliği — `CampaignsCrudPage.tsx`**
  - `priority` (Öncelik) alanını form UI'dan kaldır (state'te tutmaya devam et ama sahaya gösterme)
  - Teslimat Modu'ndaki `AUTO`/`MANUAL` labellerini "Otomatik" / "Manuel" yap
  - Her iki maoda Türkçe açıklamalı toggle-button grup yap (dropdown değil)
  - Doğrulama: Dialog açılınca Öncelik alanı görünmüyor, mod seçimi buton grubu olarak görünüyor

- [ ] **2. Tooltip/Açıklama Eklentileri — `CampaignsCrudPage.tsx`**
  - "Maks. Genel Kullanım" → tooltip: *"Bu kampanya toplamda kaç kez kullanılabilir? Boş bırakırsanız sınırsız olur."*
  - "Müşteri Başına Maks." → tooltip: *"Aynı müşteri bu kampanyadan kaç kez yararlanabilir?"*
  - Her alanın Label yanına `HelpCircle` ikonu + `title` attribute ile basit tooltip
  - Doğrulama: İkon üzerine hover yapınca açıklama görünüyor

- [ ] **3. Label & Option Yazı Düzeltmeleri — `CAMPAIGN_TEMPLATES` sabiti**
  - Tüm option label'larını düzelt: `"yüzde indirim"` → `"Yüzde İndirim"`, `"Sabit tutar"` → `"Sabit Tutar"`, `"aynı randevu"` → `"Aynı Randevu"` vb.
  - Field label'ları tutarlı hale getir: `"indirim değeri"` → `"İndirim Değeri"`, `"pasiflik eşiği"` → `"Pasiflik Eşiği"` vb.
  - Doğrulama: Tüm seçenekler büyük harfle başlıyor

- [ ] **4. Sadakat Kampanyasına "Ücretsiz Hizmet" Ödülü — `CAMPAIGN_TEMPLATES`**
  - `loyalty.fields` içindeki `rewardType` options listesine `{ value: 'free_service', label: 'Ücretsiz Hizmet' }` ekle
  - `rewardValue` alanına `rewardType === 'free_service'` olunca "Hizmet adı" string input'u gösterecek koşullu mantık ekle
  - Doğrulama: Sadakat şablonunda "Ücretsiz Hizmet" seçince değer alanı değişiyor

- [ ] **5. Doğum Günü Kampanyasına "Ücretsiz Hizmet" Opsiyonu — `CAMPAIGN_TEMPLATES`**
  - `birthday.fields` içindeki `discountType` options listesine `{ value: 'free_service', label: 'Ücretsiz Hizmet' }` ekle
  - Aynı koşullu mantık: free_service seçilince value alanı sayısal değil metin olsun
  - Doğrulama: Doğum günü şablonunda opsiyonlar görünür

- [ ] **6. n8n Workflow Güncellemesi — `salon_automation_hub.json`**
  - Mevcut tek hatırlatıcı node'unu 3'e böl: 72s kala, 24s kala, 2s kala (her biri ayrı SQL window + şablon)
  - Doğum günü akışını 2 node'a böl: `doğum_günü - 7 gün` (hazırlık) ve `doğum_günü = bugün` (kutlama), birinden biri gider (flag kontrolü)
  - Geri kazanım node'una 30/45/60 gün Window filtresi ekle (config'den okunacak)
  - Doğrulama: JSON import hatasız ve node'lar doğru pencereler sorguluyor

---

## Bitti Sayılır
- [ ] Kampanya dialog'u açınca Öncelik alanı yok, mod buton grubu olarak görünüyor
- [ ] Tüm label ve option metinleri büyük harfle başlıyor
- [ ] Sadakat ve Doğum Günü kampanyalarında "Ücretsiz Hizmet" seçilebiliyor
- [ ] n8n workflow'unda 3 hatırlatıcı, 2 doğum günü senaryosu ve 30/45/60 gün winback var
