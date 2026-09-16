# 10 — Doküman Review: Hatalar, Eksiklikler, Tutarsızlıklar

> Oluşturulma: 2026-09-17. Tüm `docs/` dosyaları ve kaynak kodla çapraz kontrol yapılarak derlendi.
> Her madde bağımsız — öncelikli olandan başlayarak listelenmiştir.

---

## A) Doküman ↔ Kod Çelişkileri (kritik)

### A1 — `01-PRD-STOREFRONT-ASTRO` hâlâ "Cloudflare Workers" diyor
**Dosya:** `01-PRD-STOREFRONT-ASTRO.md` — "Teknik Yaklaşım" bölümü
**Sorun:** "Cloudflare Workers'a edge deploy" yazıyor. Gerçek uygulama `@astrojs/node`
adaptörü ile çalışıyor. Karar `07` günlüğünde (Faz 4 girdisi) belgelenmiş ama 01
PRD güncellenmemiş.
**Düzeltme:** "Teknik Yaklaşım"daki Cloudflare cümlesini şununla değiştir:
> Yerel geliştirme/derleme `@astrojs/node` adaptörü ile; Cloudflare Workers'a geçiş
> `astro.config.mjs`'te tek satır değişiklik (adaptör swap). Bkz. [[07-KARAR-GECMISI]].

### A2 — `02-PRD-MARKETPLACE-CORE` başlığında "Mercur 2.0" — gerçek sürüm 2.3.4
**Dosya:** `02-PRD-MARKETPLACE-CORE.md` — başlık (`# 02 — PRD: Marketplace Çekirdeği (Medusa.js v2 + Mercur 2.0)`)
**Sorun:** `00-MASTER-PRD` §3 tablosu ve `07` günlüğü sürümü 2.3.4 olarak düzeltti
ama 02 başlığı hâlâ "Mercur 2.0" diyor.
**Düzeltme:** Başlığı `Mercur 2.3.4` yap.

### A3 — `02-PRD` Kapsam dahilinde "Designer modülü" var ama Designer ertelendi
**Dosya:** `02-PRD-MARKETPLACE-CORE.md` — "Kapsam DAHİLİNDE" → "Designer, SalesChannel
gibi custom modüller" maddesi
**Sorun:** `00-MASTER-PRD` §3 "Designer rolü: Ertelendi" diyor. 02'de kapsam listesinde
görmek çelişkili.
**Düzeltme:** O satırı "SalesChannel gibi custom modüller (Designer rolü ertelendi —
bkz. [[00-MASTER-PRD]] §7)" şeklinde güncelle.

### A4 — `02-PRD` Uygulama Durumu bölümü yok
**Dosya:** `02-PRD-MARKETPLACE-CORE.md`
**Sorun:** 01, 03, 05 PRD'lerinde "Uygulama Durumu" bölümü var. 02'de hiç yok.
Mercur vendor panel, komisyon, sipariş grubu, seed — ne çalışıyor ne çalışmıyor
dokümanda görünmüyor.
**Düzeltme:** 02'ye "Uygulama Durumu (2026-09-16)" bölümü ekle: seed, vendor panel
(seller@/studio@), publishable key, smoke test.

---

## B) Uygulama Eksikliği — PRD'de var, kodda/belgede kanıt yok

### B1 — `04-PRD-GUVEN-VE-KALITE` — hiçbir özelliğinin uygulandığına dair kayıt yok
**Dosya:** `04-PRD-GUVEN-VE-KALITE.md`
**Sorun:** Kapsam listesindeki özellikler:
- Reputasyon skoru (teslimat uyumu, kalite, iptal oranı, yanıt hızı, hacim)
- Soğuk başlangıç nötr puanı
- Keşif payı (%20 ağırlıklı rastgele dağıtım)
- Maksimum pay tavanı (%30 bölgesel tavan)
- Yeni üretici koruma dönemi (ilk 10-15 sipariş)
- Kademeli dosya erişimi (G-code/STL eşiği)

Hiçbirinde "Uygulama Durumu" bölümü yok. Kaynak kodda `match_engine.ts` var ve
unit testleri var (`tests/unit/match_engine.spec.ts`) — ama hangi özellikler
gerçekten uygulandı, hangisi henüz plan olarak kaldı belirsiz.
**Düzeltme:** 04'e "Uygulama Durumu" bölümü ekle; hangi maddelerin `match_engine`'e
girdiğini, hangilerinin ertelendiğini net yaz.

### B2 — `dispute` workflow için Sistem A'da unit test yok
**Kodda durum:** `open-dispute.ts`, `resolve-dispute.ts`, `release-payout.ts`
workflow'ları var. `payout-provider.unit.spec.ts` sadece `computeReleaseAt`'i test
ediyor (19 test bildirilen, ama dispute senaryoları — on_hold → paid, on_hold →
cancelled, tekrar çözme reddi — test listesinde görünmüyor).
**Risk:** 07 günlüğü "canlı `medusa exec` ile doğrulandı" diyor ama otomatik regresyon
testi yok. Dispute workflow'u ileri ki bir değişiklikle sessizce bozulabilir.
**Düzeltme:** `dispute.unit.spec.ts` oluştur — bu review'daki TDD görevidir (bkz. §E).

### B3 — `Akış 4` (bölgesel kapasite cron) uygulandı mı?
**Dosya:** `09-API-SOZLESMESI.md` — Akış 4
**Sorun:** `GET /api/v1/region-capability` Sistem B'de tanımlanmış, Sistem A'nın bunu
"günlük/saatlik cron ile çekip önbelleğe alması" gerekiyor. Sistem A kaynak kodunda
bu cron job görünmüyor (`src/jobs/` altında: sadece `daily-reconciliation` ve
`release-due-payouts`). Storefront'un bölgesel kişiselleştirme için bu veriye ihtiyaç
duyup duymadığı da belirsiz (MVP tek bölge TR/TRY).
**Düzeltme:** 09'a veya 03'e "Akış 4 ertelendi / tek bölge MVP'sinde gerek yok" notu düş.

---

## C) Sözleşme / Şema Belirsizlikleri

### C1 — `09-API-SOZLESMESI` Akış 3: `status` vs `state` çakışması
**Dosya:** `09-API-SOZLESMESI.md` — Akış 3 yanıtı
**Sorun:**
```json
{
  "status": "delivered",   // webhook payload'ındaki durum adı
  "state": "delivered"     // outbound_webhook_events.state: delivered | failed
}
```
İkisi de aynı değeri taşıyabilir ama isimleri ve anlamları farklı. `status` = üretim
talebinin yaşam döngüsü durumu; `state` = webhook teslim durumu. Uzlaştırma kodu
hangisini kullanıyor net değil — kafa karıştırıcı.
**Düzeltme:** Yanıt şemasında açıkça ayır:
```json
{
  "production_status": "delivered",   // Akış 2'deki status değeri
  "delivery_state": "delivered"       // outbound_webhook_events.state
}
```
Veya en az inline yorum ekle.

### C2 — `09-API-SOZLESMESI` Akış 2 yanıtı: `payout_duplicate` anlamı belirsiz
**Dosya:** `09-API-SOZLESMESI.md` — Akış 2 yanıtı
```json
{ "received": true, "status_applied": true, "payout_recorded": true, "payout_duplicate": false, "payout_paid": true }
```
`payout_duplicate: true` iken `payout_paid` ne olur? Atlandığı için `false` mi,
yoksa zaten ödendiği için `true` mu döner? Idempotency davranışı belirsiz.
**Düzeltme:** Açıklama ekle: "aynı `instruction_id` ikinci kez gelirse `payout_duplicate:
true`, `payout_recorded: false`, `payout_paid: false` döner (işlem atlandı)."

### C3 — `09-API-SOZLESMESI` güvenlik: "mTLS" alternatifi planlanmış ama hiç ele alınmamış
**Dosya:** `09-API-SOZLESMESI.md` — Güvenlik Kuralları
**Sorun:** "Her istek karşılıklı API anahtarı veya mTLS ile doğrulanmalı" diyor.
Gerçek uygulama yalnızca `Authorization: Bearer` kullanıyor. mTLS için herhangi
bir plan veya kapsam dışı notu yok.
**Düzeltme:** Notu güncelle: "MVP'de `Authorization: Bearer {API_KEY}` kullanılıyor.
mTLS production geçişi için ayrı iş kalemi."

---

## D) Wikilink / Referans Hataları

### D1 — `07-KARAR-GECMISI` içinde `[[project-fabrmatch]]` wikilinki yanlış
**Dosya:** `07-KARAR-GECMISI-VE-DEGISIM-GUNLUGU.md` — "Anlaşmazlık çözüm süreci"
girdisi, son paragraf
**Sorun:** `[[project-fabrmatch]]` bir Obsidian doc değil, hafıza (`memory/`)
dosyasının adı. Obsidian vault bu dosyayı bulamaz, kırık link.
**Düzeltme:** `[[00-MASTER-PRD]]` veya düz metin ile değiştir.

### D2 — `03-PRD-URETICI-AGI` eski klasöre referans veriyor
**Dosya:** `03-PRD-URETICI-AGI.md` — üst not
**Sorun:** "eski `sistem-b-uretici-agi/` klasöründeki tüm dosyalar (01-09)" deniyor.
Bu klasör artık mevcut değil (Obsidian vault'a taşındı), wikilink yok, kırık.
**Düzeltme:** Referansı kaldır veya "bkz. `07-KARAR-GECMISI`" ile değiştir.

### D3 — `01-PRD` üst notu kırık referans ("eski" dosyalar)
**Dosya:** `01-PRD-STOREFRONT-ASTRO.md` — üst not
**Sorun:** "eski `sistem-a-magaza/06-TEKNOLOJI-STACK.md` ve `04-B2C-SITE-AKISI.md`"
referansı — bu dosyalar docs/ altında yok.
**Düzeltme:** Referansı kaldır ya da "bkz. [[07-KARAR-GECMISI]]" yap.

---

## E) Eksik Günlük

### E1 — 2026-09-17 günlüğü yok
**Sorun:** Storefront + panel tasarım yenileme (Hero3D, MobileMenu, tokens.css)
2026-09-17 tarihli hafıza notlarında belgelenmiş ama `docs/gunlukler/2026-09-17.md`
oluşturulmamış.
**Düzeltme:** Günlük dosyasını oluştur (bkz. §F).

---

## F) TDD Öncelik Listesi (bu review'dan çıkan test borcu)

Aşağıdakiler PRD'de "doğrulandı" deniyor ama otomatik test yok:

| # | Test edilecek davranış | Sistem | Mevcut durum |
|---|---|---|---|
| T1 | `open-dispute` → `payout_instruction` `on_hold`'a geçiyor | Sistem A | Yalnızca canlı `medusa exec` |
| T2 | `resolve-dispute(manufacturer)` → `on_hold` talimat `paid` oluyor | Sistem A | Yalnızca canlı curl |
| T3 | `resolve-dispute(buyer)` → `on_hold` talimat `cancelled` oluyor | Sistem A | Yalnızca canlı curl |
| T4 | Çözülmüş dispute tekrar çözülmeye çalışılırsa hata fırlatıyor | Sistem A | Yalnızca canlı curl |
| T5 | `release-due-payouts`: anlaşmazlıksız + süresi dolmuş talimat `paid` oluyor | Sistem A | `computeReleaseAt` var, ama job mantığı test edilmiyor |
| T6 | `release-due-payouts`: `on_hold` olan talimat serbest bırakılmıyor | Sistem A | Yok |
| T7 | Bilinmeyen `production_request_id` için dispute açma reddediliyor | Sistem A | Yalnızca canlı curl |
| T8 | `match_engine` — keşif payı (%20 rastgele) doğru uygulanıyor mu? | Sistem B | `match_engine.spec.ts` var, içeriği kontrol edilmeli |
| T9 | Üretici kapasitesi %30 bölgesel tavanı aşmıyor | Sistem B | Belirsiz |

---

## G) Genel Notlar (kod/ürün değil, doküman kalitesi)

- `06-PRD-TASARIM-SISTEMI` Madde 5 "KESINLIKLE YAPILMAYACAKLAR" listesi fazla kural
  koyuyor ama "gradient yok" kuralına rağmen `Hero3D.tsx` canvas içinde renk
  gradientleri olabilir — canvas/WebGL 06'nın scope'u dışında mı? Açıklık yok.
- `00-MASTER-PRD §4.1` son güncelleme 2026-09-16, ama 2026-09-17'de storefront/panel
  tasarım yenileme yapıldı — §4.1 güncel değil.
- `05-PRD` Başarı Kriteri 3 ("Günlük uzlaştırma raporu kasıtlı yaratılan bir
  senaryoyu doğru tespit ediyor") — bu PRD kriteri değil, zaten uçtan uca doğrulandı.
  "Tamamlandı" olarak işaretlenmeli ya da "başarı kanıtı" olarak bırakılmalı.

---

> Sonraki adım önerisi: F→T1–T7 dispute birim testlerini TDD ile yaz (Sistem A,
> `npm run test:unit`). Bu en yüksek risk/test açığı olan alan.
