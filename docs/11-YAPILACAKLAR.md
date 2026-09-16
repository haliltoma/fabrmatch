# 11 — Yapılacaklar Listesi

> Bu dosya `docs/10-DOKUMAN-REVIEW.md` incelemesinden çıkan açık iş kalemlerini
> yönetir. Her kalem tamamlandığında `[x]` işaretle ve `07-KARAR-GECMISI`'ne
> tarihli girdi düş.

---

## P0 — Askıdaki Sistem: 04-PRD Güven & Adil Eşleştirme

`04-PRD-GUVEN-VE-KALITE.md` PRD'si "kapsam dahilinde" olarak işaretli ama
hiçbir maddesi uygulanmamış. Eşleştirme motoru (`match_engine.ts`) var ama
"adil eşleştirme" vaadi için gereken mekanizmalar eksik.

- [ ] **P0-1** Reputasyon skoru hesaplama servisi
  - Girdi: teslimat uyumu, kalite notu, iptal oranı, yanıt hızı, tamamlanan hacim
  - Çıktı: 0–100 arası skalar skor
  - Sistem B `manufacturer` modeline `reputation_score` sütunu ekle
  - Her `delivered` + `quality_check` olayında otomatik güncelle

- [ ] **P0-2** Soğuk başlangıç nötr puanı
  - Yeni üretici skor = 0 değil, ağırlıklı platform ortalaması
  - `match_engine.ts`'e katıl (şu an skor 0'dan başlıyor olabilir — kontrol et)

- [ ] **P0-3** Keşif payı (%20 ağırlıklı rastgele dağıtım)
  - Eşleştirme havuzunun %20'si skora bakılmaksızın rastgele seçilen üreticiye ayrılır
  - `match_engine.ts`'e "exploration" kolu ekle; seed ile tekrarlanabilir test yaz

- [ ] **P0-4** Maksimum pay tavanı (bölgesel %30 tavan)
  - Bir üreticinin bölgesel toplam aktif taleplerinin %30'undan fazlasını alamama kuralı
  - `match_engine.ts` veya `matching_service.ts`'e kural ekle
  - Unit test: yüksek hacimli simülasyonda tavan aşılmıyor

- [ ] **P0-5** Yeni üretici koruma dönemi (ilk 10–15 sipariş)
  - Bu dönemde üreticiye düşük riskli (küçük baskı, kısa süre) işler önceliklendirilir
  - `match_engine.ts`'e `is_protected_period(manufacturer)` yardımcısı

- [ ] **P0-6** Kademeli dosya erişimi
  - < 20 sipariş → G-code / view-only (ham STL paylaşılmaz)
  - ≥ 20 sipariş → lisanslı STL + watermark + süreli erişim (presigned URL)
  - Sistem A'da dosya erişim katmanı; [[09-API-SOZLESMESI]] `design_reference`
    akışının güncellenmesi gerekiyor mu değerlendir

---

## P1 — Test Borcu: Dispute Workflow (Sistem A)

Tüm dispute senaryoları "canlı `medusa exec`" ile doğrulandı — otomatik test yok.
`apps/store/packages/api/src/lib/__tests__/dispute.unit.spec.ts` oluşturulmalı.

- [ ] **T1** `open-dispute` → `payout_instruction` durumu `on_hold`'a geçiyor
- [ ] **T2** `resolve-dispute(manufacturer)` → `on_hold` talimat `paid` oluyor
- [ ] **T3** `resolve-dispute(buyer)` → `on_hold` talimat `cancelled` oluyor
- [ ] **T4** Çözülmüş dispute tekrar çözülmeye çalışılırsa hata fırlatıyor
- [ ] **T5** `release-due-payouts`: anlaşmazlıksız + süresi dolmuş talimat `paid` oluyor
- [ ] **T6** `release-due-payouts`: `on_hold` talimat serbest bırakılmıyor
- [ ] **T7** Bilinmeyen `production_request_id` için dispute açma reddediliyor

Çalıştırma: `npm run test:unit` (`apps/store/packages/api/`)

---

## P2 — Doküman Tutarsızlıkları (10-DOKUMAN-REVIEW §A–D)

- [ ] **D1** `01-PRD-STOREFRONT-ASTRO` — "Cloudflare Workers" → `@astrojs/node` (bkz. 10 §A1)
- [ ] **D2** `02-PRD-MARKETPLACE-CORE` — başlık "Mercur 2.0" → 2.3.4 (bkz. 10 §A2)
- [ ] **D3** `02-PRD-MARKETPLACE-CORE` — "Designer modülü" kapsam listesinden çıkar (bkz. 10 §A3)
- [ ] **D4** `02-PRD-MARKETPLACE-CORE` — "Uygulama Durumu" bölümü ekle (bkz. 10 §A4)
- [ ] **D5** `04-PRD-GUVEN-VE-KALITE` — "Uygulama Durumu" bölümü ekle (bkz. 10 §B1)
- [ ] **D6** `09-API-SOZLESMESI` Akış 3 — `status` / `state` ayrımını netleştir (bkz. 10 §C1)
- [ ] **D7** `09-API-SOZLESMESI` Akış 4 — "tek bölge MVP'de uygulanmadı" notu ekle (bkz. 10 §B3)
- [ ] **D8** `07-KARAR-GECMISI` — `[[project-fabrmatch]]` wikilink'ini düzelt (bkz. 10 §D1)
- [ ] **D9** `03-PRD` ve `01-PRD` — artık olmayan eski klasör referanslarını kaldır (bkz. 10 §D2-3)
- [ ] **D10** `00-MASTER-PRD §4.1` — 2026-09-17 tasarım yenileme notu ekle
- [ ] **D11** `docs/gunlukler/2026-09-17.md` — eksik günlük dosyası oluştur

---

## P3 — Ertelenen Ürün Kalemleri (PRD kapsamında ama bu turda yapılmadı)

- [ ] Alıcı tarafından dispute açma — `POST /store/disputes` (şu an yalnızca admin)
- [ ] Üretici Stripe Connect onboarding UI — `stripe_account_id` hâlâ sadece DB sütunu
- [ ] Özel tasarım STL dosyası saklama (presigned URL, S3/R2)
- [ ] Çoklu bölge/dil algılama (şu an tek TR/TRY bölgesi)
- [ ] Sipariş kalemi bazlı adet düzeltmesi (custom design quantity=1 sınırlaması)

---

> Bkz. [[10-DOKUMAN-REVIEW]] — tüm maddelerin detaylı gerekçeleri orada.
> Tamamlananlar buradan `[x]` ile işaretlenir; önemli kararlar [[07-KARAR-GECMISI]]'ne eklenir.
