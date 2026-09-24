# Fabrmatch — Pazarlama ve Satış Planı

> Tarih: 2026-09-23 · Amaç: Fabrmatch'i 3D baskı print-on-demand alanında **en önde satış yapan** platform yapmak için
> araştırılmış, uygulanabilir bir plan. Ürün/teknik eksikler: `docs/GAP_ANALYSIS.md` · İş listesi: `docs/tasks.md` (M paketi) ·
> Tasarım: `docs/DESIGN.md`.
>
> **Kaynak disiplini:** Her iddianın yanında kaynak türü var. `[doğrulandı]` = okuduğum sayfa/skill; `[snippet]` = yalnız arama sonucu
> özeti (sayfa açılamadı); `[öneri]` = benim mantıksal çıkarımım, doğrulanmadı. Rakip rakamları bu belgede **uydurulmadı**;
> doğrulanamayanlar "araştırılacak" diye işaretli.

---

## 1. Kısa strateji (5 madde)

1. **Pazarlama = ürün özelliği + kanal.** Fabrmatch'in satılabilir farkları zaten kodda: emanetli ödeme, adil eşleştirme, anonim üretici, dispute süreci, yerel üretim. Pazarlama bunları _kanıtlanabilir_ şekilde göstermeli (gerçek foto, gerçek yorum, gerçek süre).
2. **Önce arz (üretici), sonra talep.** İki taraflı pazaryerinde kısıtlı taraf çoğunlukla arzdır; 3D baskıda kapasitesi boş yazıcı sahibi bulmak ve _etkinleştirmek_ birinci iş `[doğrulandı: marketplace GTM rehberi, §3]`.
3. **Dar başla:** tek şehir, tek teknoloji (FDM), tek iş tipi (Etsy/Shopify satıcıları için özel 3D ürün üretimi) → likidite kanıtlandıktan sonra genişle.
4. **Sızıntıyı kapat, sonra reklam ver.** Aktivasyon/dönüşüm bozukken trafik artırmak parayı yakar `[doğrulandı: AARRR primer]`. Bu yüzden R0–R1 (doğruluk, ödeme, bildirim) pazarlama harcamasından önce gelir.
5. **Miras kanal = SEO + araçlar.** Bizde ücretsiz araç yapacak çekirdek var: anlık fiyat motoru, STL analizi. Bunları herkese açık araç olarak yayınlamak hem trafik hem lead getirir (§6).

---

## 2. Pazar ve rakipler

### 2.1 Doğrulanan bilgiler

| Rakip                                 | Ne yapıyor                                                                                                                  | Kaynak                                                                        |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Craftcloud (All3DP)**               | Fiyat karşılaştırma agregatörü; anlık teklif, minimum sipariş yok; "yaklaşık 200 doğrulanmış üretici" ağından teklif toplar | `[snippet]` all3dp.com (Mar 2026), craftcloud3d.com                           |
| Craftcloud zayıf yönü (rakip iddiası) | "Nihai fiyat gümrük+kargo yüzünden gösterilenden %30–50 yüksek olabilir"                                                    | `[snippet]` niro3d.cz blogu — **rakibin kendi pazarlama metni, doğrulanmadı** |
| **Xometry Türkiye**                   | Endüstriyel 3D baskı hizmeti, "6 teknoloji", tek noktadan üretim; TR alan adı mevcut                                        | `[snippet]` xometry.com.tr (sayfa 403, içerik alınamadı)                      |
| **Printful / Printify / Gelato**      | Sanatçı ve Etsy/Shopify satıcıları için POD; mağaza entegrasyonu ana değer                                                  | `[snippet]` shopify.com, printkk.com (2026)                                   |

### 2.2 Araştırılacak (yapılmadı — doğrulamadan karar verme)

- Treatstock, Shapeways, Sculpteo, JLC3DP, PCBWay, Hubs (Protolabs Network) — fiyat, teslim süresi, TR'ye gönderim, marka konumu.
- Türkiye'de yerel 3D baskı servisleri ve pazar yerleri (isim/fiyat listesi çıkarılmalı); Trendyol/Hepsiburada 3D ürün kategorileri.
- Aylık arama hacmi: "3d baskı hizmeti", "3d yazıcı çıktı", "stl baskı" gibi TR anahtar kelimeleri (Search Console/Keyword aracı gerekli).
- **Yöntem:** `competitors` ve `competitor-profiling` skill'leri (§9) ile her rakip için sayfa-sayfa profil; sonuçlar `docs/marketing/competitors/` altına.

### 2.3 Konumlandırma önerisi `[öneri]`

| Rakip modeli                  | Onların vaadi       | Bizim ayrışmamız                                                                                                 |
| ----------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Fiyat agregatörü (Craftcloud) | "En ucuzu bul"      | **Adil eşleştirme + emanet:** fiyat karşılaştırma değil, güvenle teslim; şeffaf toplam fiyat (kargo+vergi dahil) |
| Endüstriyel (Xometry)         | Büyük kurumsal RFQ  | **Küçük satıcı ve hobici için hızlı, yerel, uygun** (kurumsal RFQ Faz 8'de)                                      |
| POD (Printify)                | Mağaza entegrasyonu | **3D ürün için POD**: aynı model, otomatik yerel üretim, satıcı stok tutmaz                                      |

Tek cümlelik vaat adayları (A/B test edilecek, bkz. §11): _"Modelini gönder, yakınındaki doğrulanmış üreticiden basılı parçayı al — ödemen teslime kadar güvende."_

### 2.4 Hedef kitleler (ICP)

| Segment                                       | İş                                     | Kanal                                            | Öncelik           |
| --------------------------------------------- | -------------------------------------- | ------------------------------------------------ | ----------------- |
| **A. Arz: yazıcı sahipleri**                  | Boş kapasiteyi gelire çevir            | Doğrudan temas (outbound), topluluklar, referans | **1. öncelik**    |
| **B. Etsy/Shopify satıcıları (özel 3D ürün)** | Stoksuz üretim, marj                   | SEO, Printify-tarzı entegrasyon (R4), içerik     | 2                 |
| **C. Hobi/maker alıcılar**                    | Tek seferlik baskı, figür, yedek parça | SEO + ücretsiz araçlar, sosyal video             | 2                 |
| **D. KOBİ/prototip**                          | Hızlı, düşük adetli parça              | RFQ, LinkedIn, e-posta                           | 3 (Faz 8 sonrası) |

---

## 3. İki taraflı pazaryeri: soğuk başlangıç planı

Kaynak: marketplace GTM rehberi (tomba.io, Ağu 2026) `[doğrulandı — tek blog kaynağı, kesin kural değil, referans çerçeve]` ve arama sonuçları (kısıtlı taraf önce, dar kama).

1. **Kısıtlı tarafı seç → arz.** İlk 60–70 gün (bütçenin %60–70'i) üretici kazanmaya harcanır.
2. **Dar başlangıç ("beachhead"): tek şehir, tek teknoloji, tek iş.** Öneri: **İstanbul + FDM (PLA/PETG) + özel ürün üretimi.** (Demo veri zaten İstanbul.) Şehir/teknoloji kararı için §16 açık karar.
3. **Arz edinimi = elle, hedefli:** 300–500 kişilik elle puanlanmış liste (maker topluluk yöneticileri, Instagram/YouTube 3D baskı üreticileri, atölyeler, üniversite fablab'ları); ilk mesaj **talep kanıtıyla** açılır: _"Bu hafta X adet sipariş bekliyor, kapasiten uygun."_ — talep kanıtı için önce bekleme listesi/sipariş toplamak gerekir (§8).
4. **Concierge onboarding:** ilk 20 üreticinin yazıcı/malzeme/kapasite kaydını biz yaparız (gelecekte `X-13` sihirbazı bunu otomatikleştirir). Ölçü: **14 günde canlı listeleme/aktif yazıcı**, kayıt sayısı değil.
5. **Üretici için ilk garanti:** yeni üretici keşif kotası zaten kodda (`explorationRate`) — pazarlamada "ilk siparişlerde adil şans" olarak kullan; ilk N siparişte komisyon indirimi düşünülebilir (§7).
6. **Talep tarafı:** üretici ağı 10+ aktif yazıcıya ulaşınca SEO/araç/sosyal kanalları açılır; öncesinde trafik = "eşleşmedi" (kötü ilk deneyim).

### Likidite metrikleri (GMV değil)

Rehberdeki referans hedefler `[doğrulandı: aynı blog; kendi verimizle güncelle]`:

- **Listelerin 30 günde işlem görme oranı (likidite):** %25–40 hedef bölge.
- **Üretici aktivasyonu:** 6. ayda %75+ (kayıt olan üreticinin aktif yazıcı+kapasite girmesi).
- **Alıcı tekrar oranı (90 gün):** %30+ — "PMF için en iyi tek vekil".
- Bizim ürüne özgü: **teklif kabul oranı**, **ilk teklife kadar süre**, **eşleşme başarı oranı (`unmatched` yüzdesi)**, **zamanında teslim**, **dispute oranı**, **yeni üretici payı** (PRD §15 ile aynı; `R3-T8` paneli).

---

## 4. AARRR planı (Acquisition → Activation → Retention → Referral → Revenue)

Kaynak çerçeve: marketing-plan `aarrr-framework` `[doğrulandı]`. Kural: **bağlayıcı kısıtı bul, önce onu çöz.**

### Bugünkü teşhis `[öneri]`

| Aşama       | Durum                                                                                                             | Bağlayıcı mı?                          |
| ----------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Acquisition | Trafik kaynağı yok (SEO/sosyal/araç yok); yalnız sahte veri                                                       | Evet, ama üreticisiz talep işe yaramaz |
| Activation  | Kayıt→ilk sipariş akışı var; e-posta doğrulama zorunlu değil, gerçek ödeme yok, ilk teklife kadar süre bilinmiyor | **Evet (en yüksek kaldıraç)**          |
| Retention   | Bildirim yok, tekrar sipariş yok                                                                                  | Sonra                                  |
| Referral    | Yok                                                                                                               | Sonra                                  |
| Revenue     | Komisyon config hatası (B1), vergi/fatura yok                                                                     | Lansman öncesi zorunlu                 |

→ **Sıra:** (1) Activation'ı sağlamlaştır (R0–R1) + arz edin, (2) Acquisition'ı aç (SEO/araçlar/beklemelistesi), (3) Retention/Referral, (4) Revenue optimizasyonu.

### 4.1 Acquisition (edinim)

| Hareket                              | Hedef segment | Not / bağlı görev                                                                                                 |
| ------------------------------------ | ------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Üretici outbound + topluluk** (§3) | A             | Yalnız elle, hedefli; toplu spam yok (`cold-email`, `prospecting` skill'leri; yerel KVKK/İYS uyumu, §13)          |
| **Programatik SEO + içerik** (§5)    | B, C          | Vitrin sayfaları zaten var; şehir/malzeme/kullanım sayfaları                                                      |
| **Ücretsiz araçlar** (§6)            | B, C          | Anlık fiyat hesaplayıcı, STL kontrol aracı                                                                        |
| **Sosyal video (üretim time-lapse)** | C             | Gerçek siparişlerden 15–30 sn baskı videosu; TikTok/Instagram Reels/YouTube Shorts (`social`, `video` skill'leri) |
| **Dizin/liste kayıtları**            | B, C          | 3D baskı dizinleri, e-ticaret araç dizinleri, Product Hunt (`directory-submissions`, `launch`)                    |
| **PR**                               | genel         | "Türkiye'de yerel 3D baskı pazaryeri" hikâyesi; teknoloji/girişim medyası (`public-relations`)                    |
| **Ortaklıklar (co-marketing)**       | A, B          | Filament markaları, maker topluluk/fablab'ları, 3D model paylaşım siteleri; çapraz içerik (`co-marketing`)        |
| **Ücretli reklam**                   | C             | **Yalnız** organik taban ve aktivasyon düzelince (`ads`); önce yeniden hedefleme + marka araması                  |

### 4.2 Activation (aktivasyon)

Tanım: **alıcı** için "ilk fiyat teklifini gördü → siparişi verdi"; **üretici** için "aktif yazıcı + kapasite → ilk teklifi kabul etti".

| Hareket                                                                | Not                                                                                                                |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Üretici kurulum sihirbazı (yazıcı → malzeme → kapasite → test baskısı) | `tasks.md X-13`, `R3-*`; aktivasyon zamanını ölç                                                                   |
| Alıcı: yüklemeden fiyata **< 30 sn**, kayıt olmadan fiyat görme        | Bugün quote girişli; **kayıtsız hızlı teklif** (R2-T1 ile) dönüşümü artırır; kayıt fiyat sonrası istenir `[öneri]` |
| Güven işaretleri sipariş öncesi (emanet, dispute, doğrulanmış üretici) | §10                                                                                                                |
| Doğrulama ve ilk e-posta akışı                                         | `R0-T2`, `R1-T7`; karşılama serisi (`emails`, `email-sequence`, `onboarding` skill'leri)                           |
| Örnek sipariş (numune)                                                 | `R4-T8`; satıcının ilk satışa kadar riskini düşürür                                                                |

### 4.3 Retention (elde tutma)

- Yaşam döngüsü e-postaları: sipariş sonrası (takip, teslim, "nasıldı?", tekrar sipariş), terk edilmiş sipariş (draft/awaiting_payment), üretici için boş kapasite hatırlatma. (`emails`, `email-sequence`; `churn-prevention` skill'i iptal/terk akışları için)
- **Tekrar sipariş** ve favori (`R2-T5`); üretici skor kartı ve payout görünürlüğü (`R3-T5`) üreticiyi platformda tutar.
- Üretici için WhatsApp/SMS bildirimi (`X-8`) — teklif 30 dk'da sona erdiği için kabul oranını doğrudan etkiler.

### 4.4 Referral (tavsiye)

Kaynak: `referrals` skill `[doğrulandı]` — tetik anı, çift taraflı ödül, paylaşım kolaylığı; tipik bulgu: yönlendirilen müşteriler daha yüksek LTV/daha düşük churn (skill notu, rakamlar genel; kendi verimizle ölç).

| Program                                                                                     | Mekanik                                            | Dikkat                                                                   |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------ |
| **Üretici → üretici**                                                                       | Davet eden ilk 3 tamamlanan işte komisyon indirimi | Sahte hesap: doğrulanmış e-posta+IBAN/KYC şartı (`R1`)                   |
| **Satıcı → satıcı**                                                                         | İlk siparişte çift taraflı kredi                   | Ledger'da ayrı `promo_expense` hesabı (`R6-T7`); üretici payı etkilenmez |
| **Alıcı → alıcı**                                                                           | Teslim sonrası "arkadaşına X TL"                   | Tetik = _teslimden hemen sonra_ (memnuniyet anı)                         |
| **Affiliate (içerik üreticileri)**                                                          | Komisyon paylaşımı                                 | Stripe/iyzico uyumlu takip; yasal (D5) ve fatura etkisi                  |
| Tüm programlar için kural: kötüye kullanım limitleri, açık şartlar, izleme (`attribution`). |

### 4.5 Revenue (gelir)

- Önce **fiyat denetimi:** ilan edilen komisyon (config %15) ↔ gerçek uygulanan (%10) farkı (`B1`, `R0-T1` ✔). Denetim yapılmadan fiyat testi anlamsız `[doğrulandı: AARRR primer]`.
- Gelir kaldıraçları: komisyon, satıcı marjı üzerinden pay, **hızlı üretim ücreti (express)**, son işlem/boya seçenekleri (`R6-T6`), örnek paket, hızlı ödeme çekimi. Her biri `pricing` ve `offers` skill'leriyle tasarlanır (§7).

---

## 5. SEO ve içerik stratejisi

Skill'ler: yerel `seo`; harici `seo-audit`, `programmatic-seo`, `ai-seo`, `schema`, `site-architecture`, `content-strategy`, `copywriting` (§9). Yerel `seo` ilkeleri `[doğrulandı]`: teknik engelleri önce düzelt; sayfa başına tek arama niyeti; mobil-öncelikli; sayfaya özgü uygulanabilir öneriler.

### 5.1 Teknik temel (mevcut + eksik)

| Var                                                                    | Eksik / yapılacak                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/shop`, ürün sayfası, canonical, OG, JSON-LD Product, sitemap, robots | Ürün **görseli** (OG görseli anlamsız), `hreflang` (TR/EN), sayfalı liste canonical, `BreadcrumbList`, `Organization` şeması, `Review/AggregateRating` (gerçek yorum gelince), Lighthouse ölçümü, sitemap'i tür bazlı ayırma, kısa slug'lar |
| Sunucu render (SSR)                                                    | SSR doğrulama (dev'de kapalıydı; üretimde ölç), Core Web Vitals, font/görsel optimizasyonu (`web-quality-skills`)                                                                                                                           |

### 5.2 Programatik SEO (yalnız gerçek veri olduğunda)

`programmatic-seo` ilkesi `[doğrulandı]`: her sayfa benzersiz değer sunmalı; **özgün/ürün-türevi veri en güçlü**; alt klasör; ince içerik cezasından kaçın; "100 iyi sayfa > 10.000 ince sayfa". Bizim özgün verimiz: gerçek üretici kapasitesi, gerçek teslim süreleri, gerçek fiyat hesapları.

| Playbook                                                                                                        | URL kalıbı (öneri)                            | Veri kaynağı                                             | Ön koşul                                  |
| --------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------- | ----------------------------------------- |
| Konum                                                                                                           | `/3d-baski/{sehir}`                           | O şehirdeki aktif üretici sayısı, ortalama teslim süresi | Şehirde ≥ N aktif üretici (yoksa noindex) |
| Malzeme                                                                                                         | `/malzeme/pla`, `/malzeme/petg` …             | Malzeme özellikleri + örnek fiyat                        | Malzeme kataloğu (`R2-T3`)                |
| Kullanım/persona                                                                                                | `/3d-baski/etsy-satici`, `/3d-baski/prototip` | Vaka + akış                                              | İçerik                                    |
| Karşılaştırma                                                                                                   | `/karsilastir/craftcloud-alternatifi`         | Doğrulanmış rakip profili (§2.2)                         | Rakip araştırması bitmeli                 |
| Sözlük                                                                                                          | `/sozluk/stl-nedir`, `/sozluk/infill` …       | Editoryal                                                | –                                         |
| Ürün/katalog                                                                                                    | mevcut `/shop/...`                            | Katalog                                                  | Görseller                                 |
| Kural: bir şehir sayfası, o şehirde gerçek üretici yoksa **yayınlanmaz** (yanıltıcı olur, doorway sayfa riski). |

### 5.3 İçerik (content-strategy)

- **Sütunlar:** (1) "Nasıl": modelini baskıya hazırla (duvar kalınlığı, yön, destek), (2) "Hangi malzeme": PLA vs PETG vs ABS vs Reçine, (3) Satıcı rehberleri: Etsy'de özel 3D ürün satmak, marj/fiyatlama, (4) Üretici rehberleri: yazıcıdan gelir, fiyatlama, kapasite yönetimi, (5) Vaka: gerçek sipariş hikâyeleri.
- **AI arama görünürlüğü (`ai-seo`):** net tanımlar, karşılaştırma tabloları, SSS, şema; "en iyi 3D baskı hizmeti" tarzı sorularda alıntılanma için yapılandırılmış cevaplar.
- Dil: **TR birincil**, EN ikincil (`U1`/`R5-T5`). Metinler `copywriting`+`copy-editing`; ton `brand` skill'i (kısa, somut, fiil odaklı — `DESIGN.md §3`).

---

## 6. Ücretsiz araçlar (engineering-as-marketing)

Kaynak: `free-tools` skill `[doğrulandı]` — gerçek problemi çöz, çekirdek ürüne komşu, basit, değer kâr > maliyet; 25+ puanlı aday güçlü.

| Araç                                                                                                                                                                                                                                           | Ne yapar                                           | Neden bizde ucuz                                                                 | Lead yolu               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------- |
| **Anlık 3D baskı fiyat hesaplayıcı**                                                                                                                                                                                                           | STL yükle → malzeme+adet → tahmini fiyat/gram/süre | Fiyat motoru + STL analizi hazır (kayıtsız kullanım için `R2-T1` doğruluğu şart) | "Siparişe çevir"        |
| **STL baskılanabilirlik kontrolü (DFM)**                                                                                                                                                                                                       | Duvar/manifold/boyut uyarıları                     | Analizör hazır, `R2-T10` ile zenginleşir                                         | Kayıt, satıcı hesabı    |
| **Kâr/marj hesaplayıcı (satıcı)**                                                                                                                                                                                                              | Satış fiyatı ↔ marj ↔ kâr                          | Fiyat motoru + marj                                                              | Satıcı kaydı            |
| **Filament/ağırlık hesaplayıcı**                                                                                                                                                                                                               | Hacim→gram→maliyet                                 | Basit                                                                            | SEO trafiği             |
| **Yazıcı gelir hesaplayıcı (üretici)**                                                                                                                                                                                                         | Kapasite×fiyat→aylık tahmini kazanç                | Ödeme/kapasite verisi                                                            | **Üretici kaydı (arz)** |
| Öncelik: fiyat hesaplayıcı + üretici gelir hesaplayıcı (iki taraf birden). Güvenlik: yüklenen model **herkese açık paylaşılmaz**, kural 4 korunur; analiz sonrası yalnız ölçüler gösterilir; kayıtsız yüklemelerde boyut/hız limiti (`R1-T8`). |

---

## 7. Fiyatlandırma ve teklif (offers)

Skill'ler: `pricing`, `offers` (bonus, garanti, kıtlık, adlandırma).

| Seçenek                                                                                                                                                                               | Amaç                          | Risk / not                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------- |
| **Lansman komisyon indirimi (ilk N tamamlanan iş)**                                                                                                                                   | Arz kazanımı                  | Ledger'da `promo_expense`; kâr marjı sınırı; süre sınırlı        |
| **Yeniden üretim garantisi**                                                                                                                                                          | Alıcı güveni (Printify farkı) | `R3-T6` gerektirir; maliyet = üreticiden kesinti/platform kasası |
| **Örnek sipariş (maliyetine)**                                                                                                                                                        | Satıcı aktivasyonu            | `R4-T8`                                                          |
| **Express üretim**                                                                                                                                                                    | Gelir + hız                   | Kapasite/ETA (`R2-T9`)                                           |
| **Ödeme güvencesi rozeti** ("Teslime kadar emanette")                                                                                                                                 | Dönüşüm                       | Zaten ürün özelliği; görünür yap                                 |
| **Sadakat/ücretsiz kargo eşiği**                                                                                                                                                      | Sepet büyütme                 | Kargo modeli (`R2-T7`)                                           |
| Kıtlık/aciliyet yalnız **gerçek** olduğunda (gerçek kapasite; teklif geri sayımı zaten gerçek) — sahte "son 2 adet" yasak (`marketing-psychology` etik sınırı + tüketici hukuku, D5). |

---

## 8. Lansman planı (5 aşama, `launch` skill'inden uyarlandı)

Kaynak: `launch` skill `[doğrulandı]` — ORB (owned/rented/borrowed) ve 5 aşamalı yaklaşım. Owned: e-posta listesi, blog, site; Rented: sosyal medya; Borrowed: topluluk/influencer.

| Aşama                | Süre kriteri (tarih değil, çıkış ölçütü)     | Yapılacaklar                                                                   |
| -------------------- | -------------------------------------------- | ------------------------------------------------------------------------------ |
| **1. İç test**       | Arkadaş/tanıdık 5–10 kişi                    | Uçtan uca gerçek sipariş (sahte ödeme), sorun listesi                          |
| **2. Alfa (kapalı)** | 10–20 aktif üretici (tek şehir), 20–50 alıcı | Bekleme listesi landing (`/waitlist`), elle onboarding, haftalık geri bildirim |
| **3. Beta**          | Likidite ≥ %25, `unmatched` < hedef          | Sınırlı davet (%5–10 kademeli), gerçek ödeme (R1), ilk vaka çalışmaları/foto   |
| **4. Erken erişim**  | Tekrar oranı sinyali, NPS                    | Ürün Hunt/dizinler, PR, ilk içerik/araçlar yayında                             |
| **5. Genel**         | Ölçüm sağlam, destek hazır                   | Herkese açık kayıt, kampanya, ücretli test                                     |

Lansman öncesi kontrol listesi (özet): değer önerisi sayfası, e-posta yakalama, üretici + satıcı landing (`/for-makers`, `/for-sellers`), analitik, onboarding, destek/SSS (`N3`), yasal sayfalar (`R1-T6`), gerçek foto/vaka, durum sayfası. Ürün Hunt: yalnız hazırlık tamamsa (cevap verme, görsel/video, topluluk ön çalışma).

---

## 9. Skill haritası (pazarlama) — hangi iş için hangisi

Bulunan kaynaklar: yerel skill'ler + skills.sh (`npx skills find`, 2026-09-23). **2026-09-23: kullanıcı onayıyla `coreyhaines31/marketingskills` içinden 34 skill global kuruldu** (`~/.claude/skills`, `-a claude-code`): seo-audit, copywriting, copy-editing, marketing-psychology, content-strategy, programmatic-seo, ai-seo, schema, site-architecture, emails, email-sequence, launch, referrals, free-tools, lead-magnets, cro, pricing, offers, analytics, ab-testing, competitors, competitor-profiling, customer-research, product-marketing, directory-submissions, onboarding, marketing-plan, marketing-ideas, community-marketing, public-relations, social. Ayrıca `vercel-labs/agent-skills@web-design-guidelines` ve `wshobson/agents@tailwind-design-system`. Kurulmayanlar (şimdilik gerekmiyor): ads/ad-creative, cold-email, prospecting, sms, video, image, revops, sales-enablement vb.

| İş                                       | Skill                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Kaynak                                           | Durum                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | -------------------------------------------------------- |
| Teknik SEO/schema/sitemap                | `seo`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | yerel (`~/.claude/skills/seo`)                   | ✅ kurulu                                                |
| Marka sesi, mesaj                        | `brand`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | yerel                                            | ✅ kurulu                                                |
| Yayın/sürüm sürecine bağlı lansman       | `shipping-and-launch`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | yerel                                            | ✅ kurulu (teknik yayın kontrolü)                        |
| SEO denetimi                             | `seo-audit`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `coreyhaines31/marketingskills` — 212.7K kurulum | önerilen                                                 |
| Metin yazımı                             | `copywriting`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | aynı repo — 206.5K                               | önerilen                                                 |
| Pazarlama psikolojisi (etik sınırla)     | `marketing-psychology`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | aynı — 146.9K                                    | önerilen                                                 |
| İçerik stratejisi                        | `content-strategy`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | aynı — 144.3K                                    | önerilen                                                 |
| Programatik SEO                          | `programmatic-seo`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | aynı — 135.3K                                    | önerilen                                                 |
| AI arama (GEO)                           | `ai-seo`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | aynı — 129.7K                                    | önerilen                                                 |
| Soğuk e-posta (üretici outbound)         | `cold-email`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | aynı — 111.9K                                    | önerilen (KVKK/İYS dikkat)                               |
| Yaşam döngüsü e-postaları                | `emails`, `email-sequence`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | aynı — 62.6K / 55.8K                             | önerilen                                                 |
| Plan/AARRR                               | `marketing-plan`, `marketing-ideas`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | aynı repo                                        | önerilen                                                 |
| Diğer aynı repodaki skill'ler (listeden) | `launch`, `referrals`, `free-tools`, `lead-magnets`, `cro`, `onboarding`, `signup`, `pricing`, `offers`, `ab-testing`, `analytics`, `attribution`, `churn-prevention`, `competitors`, `competitor-profiling`, `customer-research`, `directory-submissions`, `community-marketing`, `co-marketing`, `influencer-marketing`, `public-relations`, `social`, `video`, `image`, `ads`, `ad-creative`, `sms`, `schema`, `site-architecture`, `popups`, `product-marketing`, `sales-enablement`, `prospecting`, `revops`, `marketing-loops` | repo dizini okundu `[doğrulandı]`                | seçici kurulum                                           |
| Kurulum sayısı düşük/tekil adaylar       | `kostja94/marketing-skills@conversion-optimization` (1.3K), `wondelai/skills@conversion-optimization` (570)                                                                                                                                                                                                                                                                                                                                                                                                                          | arama                                            | **güvenilmez kabul et** (find-skills kuralı: <1K dikkat) |

Ek skill kurulumu: `npx skills add coreyhaines31/marketingskills -g -y -a claude-code -s <skill>`.
**`.agents/product-marketing.md` v1 yazıldı** (ICP, konumlandırma, itirazlar, ton; müşteri dili/kanıt bilerek boş). Kurulu pazarlama skill'lerinin çoğu bu dosyayı ilk okur `[doğrulandı: skill metinleri]`; müşteri görüşmeleri ve rakip araştırmasıyla güncellenecek.

---

## 10. Dönüşüm (CRO) ve güven

Güven bir pazaryerinin ürünüdür. Görünür kılınacak, **zaten gerçek olan** özellikler:

| Güven öğesi                                                                                                       | Nerede gösterilir                                            | Gerçekliği                                                                      |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Emanetli ödeme ("teslime kadar korunur")                                                                          | Ürün sayfası, checkout, ana sayfa bandı                      | ✅ kodda (escrow + dispute)                                                     |
| Doğrulanmış üretici (tier/rozet)                                                                                  | Sipariş sayfası (kimlik gizli, yalnız "doğrulanmış üretici") | tier hesabı henüz yok → `R3-T4` sonrası                                         |
| Gerçek foto (QC)                                                                                                  | Ürün/sipariş teslim sayfası                                  | `R2-T11` sonrası                                                                |
| Yorum/puan                                                                                                        | Ürün sayfası, JSON-LD                                        | yorum ürün seviyesinde yok → `U5`                                               |
| 7 gün itiraz penceresi, foto ile dispute                                                                          | Ana sayfa, SSS                                               | ✅                                                                              |
| Şeffaf toplam fiyat (kargo+vergi dahil)                                                                           | Quote, checkout                                              | kargo/vergi modeli sonra (`R2-T7`, `R1-T2`); rakip zayıflığına karşı güçlü vaat |
| Yeniden üretim garantisi                                                                                          | Ürün/checkout                                                | `R3-T6` sonrası                                                                 |
| Kural: **olmayan güven işareti gösterilmez** (uydurma "10.000 müşteri", sahte yorum yok — hukuki ve marka riski). |

CRO deneyleri (`cro`, `ab-testing`): (1) kayıtsız fiyat görme, (2) fiyat sayfasında güven bandı, (3) checkout adım sayısı, (4) ürün sayfası CTA metni, (5) üretici landing başlığı. Örneklem büyüklüğü olmadan sonuç ilan edilmez.

---

## 11. Mesajlaşma testleri (A/B için hipotezler) `[öneri]`

| Hedef                                                                                         | Başlık A                              | Başlık B                                                                     |
| --------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------- |
| Alıcı                                                                                         | "Modelini gönder, basılı parçayı al." | "Yakınındaki doğrulanmış üreticiden 3D baskı — ödeme teslime kadar güvende." |
| Satıcı                                                                                        | "Stoksuz 3D ürün sat."                | "Etsy'de özel 3D ürün sat, biz üretelim ve gönderelim."                      |
| Üretici                                                                                       | "Yazıcınla ek gelir."                 | "Boş yazıcı saatlerini siparişe çevir; ödeme garantili."                     |
| Ölçüm: kayıt/talep dönüşümü, ilk fiyat teklifine geçiş. Kazananı `brand` ses kılavuzuna işle. |

---

## 12. Ölçüm ve analitik

Skill'ler: `analytics`, `attribution`, `ab-testing`.

| Katman                                                                                                                     | İçerik                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Olay kütüphanesi                                                                                                           | `signup_started/completed`, `model_uploaded`, `quote_viewed`, `order_created`, `payment_succeeded`, `offer_accepted`, `order_delivered`, `dispute_opened`, `maker_activated` (yazıcı+kapasite), `referral_sent/converted` |
| Kaynak takibi                                                                                                              | UTM + ilk temas saklama (`first_party` çerez/oturum), sipariş kaydına kaynak alanı; KVKK rıza (`R1-T5`) olmadan izleme yok                                                                                                |
| Panolar                                                                                                                    | AARRR funnel, likidite, üretici aktivasyonu, kanal başına CAC, tekrar oranı (`R3-T8`)                                                                                                                                     |
| Kalite kapıları                                                                                                            | Reklama başlamadan: aktivasyon oranı ve `unmatched` oranı kabul edilebilir                                                                                                                                                |
| Gizlilik: analitik araçlar KVKK'ya uygun seçilir (`D5`); üretici–alıcı kimliği hiçbir analitik olayına yazılmaz (kural 1). |

---

## 13. Yasal ve etik sınırlar (pazarlamada)

- **KVKK/İYS:** ticari e-posta/SMS için açık rıza ve İYS kaydı (Türkiye); soğuk e-posta üretici outbound'unda iş e-postalarına özel kurallar — **hukuk teyidi olmadan toplu gönderim yok** `[öneri, D5]`.
- **Tüketici hukuku:** sahte kıtlık, sahte yorum, yanıltıcı "en ucuz/en hızlı" iddiası yok; fiyatlar KDV/kargo dahil net gösterilir (`K-A`).
- **Platform atlatma:** pazarlama mesajı "doğrudan üreticiyle anlaş" demez; anonimlik kuralı ürün ilkesidir.
- **Telif/IP:** kullanıcı modelleri herkese açık galeriye/örnek olarak izinsiz konmaz; vaka çalışmaları yazılı izinle.
- **Rakip karşılaştırma sayfaları:** yalnız doğrulanmış, kaynak gösterilen bilgi (§2.2).

---

## 14. 90 günlük eylem planı (çıkış ölçütü esaslı, tarihsiz)

| Bölüm                           | Görevler                                                                                                                                                                                                                                 | Çıkış ölçütü                                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **0–30 gün: temel**             | R0 tamam (komisyon, e-posta doğrulama, iptal/iade, satıcı listesi); `product-marketing` bağlam dosyası; rakip araştırması (§2.2); `/for-makers` + `/for-sellers` + `/waitlist` sayfaları; analitik olayları; 300 kişilik üretici listesi | Tüm yeni sayfalar yayında + ölçülüyor; liste hazır           |
| **30–60 gün: arz**              | Concierge onboarding (ilk 20 üretici); üretici gelir hesaplayıcı; bekleme listesi ile talep kanıtı; R1 (ödeme sandbox, bildirimler)                                                                                                      | 10+ aktif yazıcı, ilk gerçek sipariş(ler)                    |
| **60–90 gün: talep başlangıcı** | Fiyat hesaplayıcı (kayıtsız); ilk 10 içerik + 5 şehir/malzeme sayfası (gerçek veriyle); time-lapse video serisi; dizin/PR; referans programı (basit)                                                                                     | Likidite ≥ %25; ilk organik kayıtlar; tekrar sipariş sinyali |

Bütçe ilkesi: ilk yıl pazarlama bütçesinin çoğu **arz edinimine ve içerik/araçlara**; ücretli reklam yalnız aktivasyon düzelince ve küçük testlerle `[doğrulandı: tomba rehberi %60–70 arz]`.

---

## 15. Ürün/teknik değişiklik talepleri (pazarlamanın ihtiyaçları)

Bunlar `docs/tasks.md` **M paketi**ne eklendi:

1. Bekleme listesi + lead yakalama, üretici/satıcı landing sayfaları.
2. Kayıtsız hızlı fiyat aracı (herkese açık, sınırlı).
3. Kaynak/UTM izleme ve sipariş-kaynak bağı; olay kütüphanesi.
4. Yorum/puan (ürün seviyesinde) ve JSON-LD `AggregateRating`; QC/teslim fotoğrafları vitrinde.
5. Blog/içerik altyapısı (Markdown/CMS), sözlük, karşılaştırma şablonu, şehir/malzeme sayfa şablonları (noindex kuralı).
6. Referans/affiliate mekaniği (ledger `promo_expense` ile).
7. Yaşam döngüsü e-postaları (R1-T7 ile birlikte).
8. OG görseli/mockup üretimi (`R4-T6`), paylaşım kartları.
9. Durum sayfası ve changelog sayfası (güven + "sürekli geliştiriliyor" sinyali; `launch` skill önerisi).

---

## 16. Açık kararlar (pazarlama)

| Kod | Karar                                                   | Öneri                                                                     |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| M-A | İlk şehir ve teknoloji                                  | İstanbul + FDM (PLA/PETG)                                                 |
| M-B | Ana segment (alıcı tarafı)                              | Etsy/Shopify özel ürün satıcıları + hobi alıcılar                         |
| M-C | Lansman komisyon indirimi var mı, ne kadar              | İlk N tamamlanan işte indirim; bütçe tavanı belirle                       |
| M-D | Marka adı/alan adı ve marka varlıkları (logo zaten var) | Mevcut "Fabrmatch" ile devam; ticari marka/alan adı kontrolü              |
| M-E | İçerik dili                                             | TR birincil                                                               |
| M-F | Ücretli kanal bütçesi ve başlangıç kriteri              | Aktivasyon+likidite kapıları geçince küçük test                           |
| M-G | Harici pazarlama skill'lerinin global kurulumu          | `seo-audit`, `copywriting`, `programmatic-seo`, `emails` ile başla (onay) |

---

## 17. Yapılmaması gerekenler

- Üretici ağı yokken trafik satın almak ("eşleşmedi" deneyimi = kayıp alıcı).
- Rakip fiyat/özellik iddialarını doğrulamadan yayınlamak.
- Şehir/malzeme sayfalarını gerçek veri olmadan toplu üretmek (ince içerik).
- Sahte metrik, sahte yorum, sahte kıtlık.
- Anonimliği zayıflatan pazarlama ("üreticiyle doğrudan konuş").
- Tüm segmentlere aynı anda yönelmek (odak kaybı; §3 dar başlangıç).

---

## 19. POD referans analizi — Printify · Printful · Gelato ana sayfaları (2026-09-24)

Kaynak: `docs/ref-images/{printify,printful,gelato}-homepage.png` (ekran görüntüleri; yalnız **görünenler** yazıldı, arkasındaki sayı/iddialar doğrulanmadı ve bizim için kopyalanmaz). Skill'ler: `cro`, `copywriting`, `marketing-psychology`, `anti-ai-slop-design`, `frontend-design` (yerel kurulu; `find-skills` taraması yeni skill gerektirmedi).

### 19.1 Üç sitede ortak olan dönüşüm iskeleti (yukarıdan aşağı)

| # | Blok | Printify | Printful | Gelato | Fabrmatch'e çeviri |
| - | ---- | -------- | -------- | ------ | ------------------ |
| 1 | **Sonuç odaklı H1 + tek birincil CTA** | "Create and sell custom products", yeşil "Get started for free" | "Less hustle. More passion." kırmızı "Get started" | "Grow your print on demand business with Gelato", koyu "Create for free" + ikincil "Shop for yourself" | Alıcıya sonuç: "Modelini yükle, basılı parçayı al". Birincil CTA **kayıt istemeyen** "Anında fiyat" (`/tools/quick-quote`); ikincil "Mağazaya göz at" |
| 2 | **CTA altında sürtünme azaltıcı satır** | "No credit card required" + 3 rozet (100% free to use · 2000+ products · global delivery) | — | "100% free · No setup fees · Pay only when you get an order" (Why choose bölümünde) | Yalnız doğru olanlar: "Hesap gerekmez", "Ödeme teslime kadar bekletilir", "Fiyatı sipariş öncesi görürsün" |
| 3 | **Anında sosyal kanıt (ilk ekranda)** | "Trusted by 10M+ sellers" + Shopify 4.8 yıldız | Marka logo şeridi (Shopify, Coca-Cola, AMC…) | Shopify 4.8/5, 963 yorum | **Şimdilik yok = gösterme.** Yerine: gerçek ürün yorumu ortalaması (`M3-T3`), doğrulanmış üretici sayısı (eşik ≥ N), "İstanbul'da başlıyoruz" (doğru ve yerel) |
| 4 | **3 adımda "nasıl işler" + "sıfır yatırım"** | "Start with $0 investment" 1-2-3 kartları | "Take the leap…" 3 adım kaydırmalı kartlar | (Why choose listesi) | Kitleye göre sekmeli 3 adım: Alıcı / Satıcı ("stoksuz, önden ödeme yok") / Üretici ("yazıcın zaten senin") |
| 5 | **Ürün keşfi karuseli / ızgarası** | "Your next bestseller awaits" kategori şeridi (T-shirts, Mugs, Hoodies…) | "Choose from 562 beautiful custom products" fotoğraflı ızgara | Renkli fotoğraf kolajı | Gerçek katalog: en çok satan/yeni mağaza ürünleri + malzeme kartları (PLA, PETG, ABS, TPU, Naylon, Reçine) |
| 6 | **Kazanç hesaplayıcı (etkileşimli)** | Koyu yeşil zemin, "See how much you can make" → **limon yeşili sonuç** ($321.16/ay) | "Your passion really can pay" → kırmızı büyük sonuç | — | Satıcı: marj hesaplayıcı (aynı fiyat motoru), Üretici: `/tools/maker-income` ana sayfaya gömülü mini sürüm. **"Söz değil, örnek" notu zorunlu** |
| 7 | **Ölçek/ağ istatistik bandı + dünya haritası** | 60M+ sipariş, 209 ülke, 141 tesis (açık mavi zemin, harita) | 562 ürün, 1.000.000 adet/ay, 22 entegrasyon (koyu deniz mavisi zemin, harita) | "%90 yerel üretim · %90'ı 5 günde · 250+ üretici 32 ülke" | Uydurma sayı **yok**. Gerçek sayaçlar (onaylı üretici, teknoloji, malzeme, tamamlanan sipariş) yalnız eşik üstünde; altında "şehir şehir açılıyoruz" hikâyesi + Türkiye haritası (İstanbul işaretli) |
| 8 | **Hikâye/tanıklık** | Video tanıklık kartı (Toronto'dan bir satıcı) | "24/7 destek" + ekip fotoğrafı | — | Gerçek tanıklık gelene dek: "Kurucu üretici/satıcı programı" (bekleme listesi + gerçek sayaç) |
| 9 | **Entegrasyon logoları** | Shopify · Etsy · Amazon · eBay · TikTok Shop | 22 entegrasyon logosu | "1-click integration" | Henüz yok (R4-T1/2 kararlı değil): "Yakında: Shopify, Etsy" **yol haritası** etiketiyle, sahte logo duvarı yok |
| 10 | **Basın/"As seen in"** | Business Insider, Daily Mail… | — | — | Yok; uydurma basın şeridi yasak. Gelirse ekle |
| 11 | **Öğrenme/topluluk kartları** | YouTube, podcast, kurs, 34K topluluk | Blog kartları (POD ipuçları, fiyatlandırma) | Araçlar/uygulamalar | Gerçek içerik hazır: `/blog`, `/glossary`, `/materials`, araçlar → 3–4 kart |
| 12 | **Kapanış CTA bandı** | Limon yeşili tam genişlik "Get started today 100% free" | Kırmızı "%20 ilk sipariş indirimi" | Koyu alt bilgi + mağaza rozetleri | İlk-sipariş kuponu (R6-T7 hazır, `flags`) varsa kullan; yoksa "Anında fiyatı gör" bandı |
| 13 | **Zengin alt bilgi (SEO ağı)** | 5 sütun, ~60 link | 6 sütun + son yazılar | 5 sütun + dil seçici | Malzemeler, araçlar, blog, sözlük, yasal, durum, dil anahtarı, sosyal |

### 19.2 Müşteri çekme taktikleri (görüntülerden okunan)

1. **Risk tersine çevirme:** "ücretsiz / kredi kartı yok / stok yok" — Printify ve Gelato ilk 3 saniyede sıfır risk vaadi verir. Bizde karşılığı: *sorusuz iade edilen değil, teslime kadar bekleyen ödeme* + kayıtsız fiyat.
2. **Kazancı somutlaştırma:** Etkileşimli hesaplayıcı + büyük renkli sonuç rakamı (Printify limon, Printful kırmızı) — ziyaretçiyi "kendi sayısını" görmeye iter (endowment/anchoring).
3. **İnsan + ürün fotoğrafı:** Üçü de gerçek insan yüzü ve elindeki ürünle çalışır; ürün tek başına değil kullanımda gösterilir. Bizde stok fotoğraf yok → **özgün vektör baskı parçaları** (katman çizgili) ve yerel gerçek üretici fotoğrafı gelince değişir.
4. **Ölçek kanıtı:** Harita + büyük sayılar. Bizim yerine **yakınlık kanıtı**: "Sana yakın üretici" (Gelato'nun %90 yerel üretim vurgusu bizim asıl farkımız — adil eşleşme + yakınlık).
5. **Çift kitle ayrımı:** Gelato satıcı ve üretici (GelatoConnect) mesajlarını ayrı bloklara böler; Printify satıcıya konuşur. Bizde üç kitle → **sekmeli kitle seçici**, alıcı varsayılan.
6. **Tek renkli, cesur CTA blokları:** Her site tek vurgu rengini bölüm bantlarında tam genişlikte kullanır (limon, kırmızı, mercan). Bizde `heat` turuncu + `fil` yeşil; **ekran başına en çok 2 turuncu** kuralı korunur, bant olarak yalnız kapanışta.
7. **Kaydırma ritmi:** Açık/koyu/renkli bant dönüşümü (krem → koyu yeşil → açık mavi → limon). Bizde `paper` ↔ `ink-900` ↔ `fil-100`/`heat-100` tint bantları.
8. **Kapanışta tekrar CTA + zengin footer:** Bir kararsız ziyaretçi sayfa sonunda yine aynı tek eylemi görür.

### 19.3 Fabrmatch'e özgü fark (kopyalamadığımız)

- Klasik POD baskılı tişört/kupa; biz **3D baskı**: hacim/malzeme/kalite fiyatı değişkendir → "anında fiyat" en güçlü kanca (kayıtsız araç zaten var).
- **Emanetli ödeme + anonim eşleşme + adil keşif kotası** rakiplerin ilk ekranda söylemediği güven mekaniği; ana sayfada görsel olarak (LayerStepper) anlatılır.
- Yerel başlangıç (İstanbul, FDM) bir zayıflık değil **hikâye**: "şehir şehir açılıyoruz, yakınındaki üretici basar".

### 19.4 Yapmayacağımız (rakip görselinde olsa da)

Sahte "10M+ satıcı", yıldız/yorum sayısı, logo duvarı, basın şeridi, dünya çapı harita noktaları, "2000+ ürün" gibi doğrulanamaz sayılar; harici stok fotoğraf (DESIGN.md §8); yapay aciliyet sayaçları.

### 19.5 Ana sayfa ölçüm hedefleri ve testler

- Birincil dönüşüm: ana sayfa → `quick-quote` yükleme (kayıtsız) ve ana sayfa → `signup`. İkincil: `for-makers`/`for-sellers` bekleme listesi.
- Hipotez H-A (M4-T1 altyapısı): "Anında fiyat" (kayıtsız) vs "Model yükle" (kayıt) birincil CTA — kayıt→ilk fiyat oranı.
- Hipotez H-B: hero'da kayıtsız fiyat kutusu (dosya bırak) vs düğme.
- Hipotez H-C: kitle sekmeleri vs tek akış.
- Yol haritası ve durum: `docs/DESIGN.md §13`.

## 18. Kaynaklar

- Marketing skill deposu (dizin ve `programmatic-seo`, `free-tools`, `referrals`, `launch`, `marketing-plan/aarrr-framework` içerikleri okundu): https://github.com/coreyhaines31/marketingskills
- skills.sh arama sonuçları (kurulum sayıları): `npx skills find marketing | seo | copywriting | conversion optimization | email marketing` (2026-09-23)
- Marketplace GTM rehberi (cold start, likidite metrikleri): https://tomba.io (Ağu 2026; blog — kesin kural değil, çerçeve)
- Craftcloud: https://craftcloud3d.com , https://all3dp.com (arama özeti)
- Xometry TR: https://xometry.com.tr (sayfa erişilemedi; yalnız arama özeti)
- Yerel skill'ler: `~/.claude/skills/seo`, `brand`, `shipping-and-launch`
