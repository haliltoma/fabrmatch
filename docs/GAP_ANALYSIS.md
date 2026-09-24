# Fabrmatch — Eksiklik ve Öneri Analizi (Printify referanslı)

> Tarih: 2026-09-23 · Kapsam: kod tabanının gerçek durumu (route, servis, migration, test) ve `docs/PROJECT_MEMORY.md` yol haritası.
> Amaç: "profesyonel, global 3D baskı print-on-demand" hedefi için nelerin eksik/hatalı olduğunu **doğrulanmış** biçimde listelemek
> ve her biri için mantıksal çözüm önermek. Doğrulanmamış varsayımlar açıkça "Varsayım" diye işaretlidir.
> Bu belge karar önerisidir; onaylananlar `PROJECT_MEMORY.md` yol haritasına taşınır.

---

## 1. Özet (5 satır)

1. **Çekirdek akış çalışıyor:** model yükle → fiyat → sipariş → ödeme (fake) → adil eşleştirme → üretim → kargo → teslim → emanet serbest bırakma / dispute. 189 test.
2. **Ürün olarak "işleyen bir iskelet"** ama Printify seviyesinden uzak: gerçek ödeme yok, gerçek kargo yok, dış mağaza entegrasyonu yok, fatura/vergi yok, bildirim sistemi neredeyse yok.
3. **Kodda doğrulanmış 7 tutarsızlık/hata** var (§3); bunların bir kısmı para hesabını doğrudan etkiliyor (komisyon ayarı kullanılmıyor, üretici fiyatı yok sayılıyor).
4. **3D baskıya özgü en büyük risk:** fiyat/süre tahmini bir _sezgisel formül_ (dilimleyici yok). Yanlış tahmin = zarar eden üretici ya da pahalı fiyat. Printify'da bu sorun yok (sabit baskı ürünleri); bizde çekirdek teknik zorluk bu.
5. **Önerilen sıra:** (P0) güvenilirlik ve para doğruluğu → (P1) gerçek ödeme + kargo + bildirim → (P2) Shopify/Etsy + marka/paketleme → (P3) global.

---

## 2. Printify ile karşılaştırma

Printify: satıcı mağazasını bağlar → katalogdan ürün seçer → tasarımını yükler → mockup üretilir → müşteri sipariş verir → sipariş otomatik bir "print provider"a gider → provider basar + kargolar → takip mağazaya geri yazılır. Satıcı stok tutmaz.

| Printify yeteneği                                     | Fabrmatch durumu                                                                                | Not                                                                |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Mağaza entegrasyonu (Shopify, Etsy, WooCommerce, API) | ❌ Yok (Faz 7 planlı, `app/services/integrations` boş)                                          | **En büyük ürün farkı.** Satıcı dış mağazasından sipariş akışı yok |
| Ürün kataloğu + varyantlar (boyut/renk/malzeme)       | ⚠️ Kısmi: `catalog_products` + izin verilen malzemeler; varyant modeli yok (renk/boyut/kaplama) |                                                                    |
| Mockup / ürün görseli üretimi                         | ❌ Yok. Vitrin kartı harf+katman deseni                                                         | 3D için: model render (turntable), gerçek foto                     |
| Print provider seçimi / karşılaştırma                 | ✅ Farklı: otomatik adil eşleştirme (Printify'dan daha "kör")                                   | Satıcı tercih/kara liste/favori üretici seçemiyor                  |
| Fiyat şeffaflığı (taban maliyet + satıcı marjı)       | ⚠️ Marj var, ama fiyat sezgisel; üretici fiyatı kullanılmıyor (§3)                              |                                                                    |
| Sipariş takibi + takip no geri yazımı                 | ⚠️ Takip no manuel, mağazaya geri yazım yok                                                     |                                                                    |
| Kargo hesabı (ülke/ağırlık)                           | ❌ Sabit 50 TL (`price_engine.ts`)                                                              |                                                                    |
| Örnek sipariş (sample order)                          | ❌                                                                                              | Satıcı ürünü basılı görmeden satamaz                               |
| Marka: özel etiket, paket içi kart, white-label       | ❌                                                                                              |                                                                    |
| Faturalama/vergi (KDV, VAT, e-fatura)                 | ❌ Hiçbir yerde vergi alanı yok                                                                 | Yasal zorunluluk riski (D5)                                        |
| Bildirim (e-posta, webhook)                           | ⚠️ Yalnız 4 e-posta: doğrulama, şifre sıfırlama, yeni teklif, eşleşmedi                         |                                                                    |
| Çoklu dil / para birimi                               | ❌ Yalnız TRY, İngilizce                                                                        | Faz 10                                                             |
| Destek / mesajlaşma / yardım merkezi                  | ❌                                                                                              |                                                                    |
| Ödeme yöntemleri (kart, PayPal, Apple Pay)            | ❌ Sahte provider                                                                               | iyzico (TR) bloke: anahtar+doküman                                 |
| Üretici (provider) skor kartı, kalite denetimi        | ⚠️ Puan var (1–5), fakat üretici panelinde/admin'de görünür skor sayfası yok                    |                                                                    |
| Toplu sipariş / API / CSV                             | ❌                                                                                              |                                                                    |

---

## 3. Kodda doğrulanmış hatalar ve tutarsızlıklar (önce bunlar)

> Durum 2026-09-23: **B1, B3, B4, B7 kapandı** (R0). B2 (üretici fiyatı), B5 (bölge), B6 (çok kalem) açık.

| #    | Bulgu                                                                                                                                                      | Kanıt                                                                  | Etki                                                                                                                            | Çözüm                                                                                                                                                                                                                           |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1 ✔ | **Komisyon ayarı kullanılmıyor.** `config/fabrmatch.ts` `pricing.commissionBps: 1500` ama motor varsayılanı 1000 kullanıyor; config hiçbir yerde okunmuyor | `grep commissionBps` → yalnız config ve `price_engine.ts` varsayılanı  | Platform geliri %15 yerine %10; ayar yanıltıcı                                                                                  | Tek kaynak: `calculatePrice` config'ten okusun (dependency-injected); F9-T5 admin ayarına bağla                                                                                                                                 |
| B2   | **Üreticinin kendi gram fiyatı hiç kullanılmıyor.** `printer_materials.price_per_gram_minor` yalnız kaydediliyor; fiyat `REFERENCE_PRICES`'tan             | `order_service.ts`, `storefront_service.ts` yalnız `referencePriceFor` | Üretici "ben 0,90 TL/g istiyorum" diyor ama sistem sabit fiyatla satıyor → üretici zarar edebilir, yeni malzeme/renk fiyatı yok | Karar gerekli: (a) platform fiyat listesi + üretici bunu kabul eder/`min` fiyat koyar, ya da (b) teklif turunda üretici fiyatıyla eşleştirme. Öneri: **(a) v1**, üretici min-fiyat altında teklif alamaz (eligibility filtresi) |
| B3 ✔ | **E-posta doğrulaması zorunlu değil.** `emailVerifiedAt` set ediliyor ama hiçbir middleware/servis kontrol etmiyor                                         | grep: yalnız `auth_security_service.ts:57`                             | Sahte e-postayla sipariş/üretici kaydı; bildirimler yanlış adrese                                                               | Sipariş vermek, üretici olmak ve payout için doğrulanmış e-posta şartı (middleware `verified`)                                                                                                                                  |
| B4 ✔ | **Ödenmiş siparişi iptal edip iade almanın yolu yok.** Durum makinesi `paid → matching` dışına çıkmıyor                                                    | `order_state_machine.ts:12`                                            | Alıcı ödeme sonrası vazgeçemez; eşleşmeyen (`unmatched`) sipariş için de otomatik iade akışı yok (yalnız e-posta)               | `paid/matching/unmatched → cancelled` geçişi + `recordRefundObligation` + `settleRefunds`; `unmatched` için N gün sonra otomatik iade                                                                                           |
| B5   | **Yalnızca aynı ülkeye üretim.** Eligibility `country == shipCountry` filtresi                                                                             | `eligibility_service.ts:70`                                            | "Global" hedefle çelişir; küçük ülkede üretici yoksa sipariş `unmatched`                                                        | Bölge tabanlı kural (Faz 10-T4): ülke → bölge → kargo süresi/fiyatı; sınır ötesi üretimde gümrük/KDV notu                                                                                                                       |
| B6   | **Tek kalemli, tek teknolojili sipariş.** `createDraft` tek `OrderItem`; teknoloji varsayılan `FDM`, UI teknoloji seçtirmiyor                              | `order_service.ts:159`                                                 | Çok parçalı sipariş (asıl kullanım) ve SLA/SLS/Resin satılamıyor; sepet yok                                                     | Çok kalemli sipariş: fiyat/pay dağıtımını kalem bazında sakla (`order_items.*_share_minor`), tek üreticiye tüm kalemler (aynı teknoloji) ya da kalem bazlı bölme                                                                |
| B7 ✔ | **Satıcı kendi siparişlerini listeleyemiyor.** Satıcı panelinde yalnız "son 5" var; `/orders` alıcı listesi                                                | `SellerDashboard`                                                      | Satıcı satışlarını takip edemez, "My orders" adı yanıltıcı                                                                      | `seller/orders` (sayfalı, filtreli): kod, durum, kazanç; **üretici bilgisi yok** (kural 1)                                                                                                                                      |

Ek küçük tutarsızlıklar:

- `catalog_products.model_file_key` (eski) ile `model_file_id` (yeni) yan yana; eskisi ölü → kaldır.
- `seller_products.retail_price_minor` alanı sipariş fiyatını etkilemiyor (satış fiyatı hesaplanıyor); formda hâlâ "Retail Price (kuruş)" soruluyor → alanı kaldır ya da "hedef fiyat" anlamı ver.
- Listelerde sayfalama yok (`/orders`, `/files`, admin listeleri) → veri büyüyünce yavaşlar.
- Dev ortamı yalnız `development`'ta sahte ödeme; üretimde `iyzico` seçilince uygulama açılışta hata veriyor (bilinçli), ama bunu deploy kontrol listesine yaz.

---

## 4. Eksikler — alan bazında, öncelikli, mantıksal çözümlerle

Öncelik: **P0** = lansmandan önce zorunlu (güvenlik/para/yasal) · **P1** = "gerçek ürün" için gerekli · **P2** = rekabet farkı · **P3** = ölçek/global.

### 4.1 Fiyat ve teknik doğruluk (3D'ye özgü çekirdek risk)

| #   | Eksik                                                                                                                     | Öncelik | Neden                                                                           | Mantıksal çözüm                                                                                                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | **Gerçek dilimleyici tahmini yok.** Gram ≈ `hacim × yoğunluk × (kabuk+dolgu)`; süre = gram/0,2 g/dk sezgisi               | **P0**  | Fiyat ve kapasite (dakika) bu sayılara bağlı; ±%40 hata olağan                  | Sunucuda başsız dilimleyici (PrusaSlicer/OrcaSlicer CLI) ile **profil bazlı** tahmin (malzeme+nozul+katman yüksekliği), sonucu `order_items`'a yaz; sezgisel formül yalnız yedek. Dilimleme kuyruğa (`AnalyzeModelFile` gibi), önbellek: `sha256+profil` |
| T2  | **DFM (üretilebilirlik) kontrolü zayıf:** yalnız manifold + bbox                                                          | P1      | Ince duvar, boşluk, destek gereksinimi, ters normal → başarısız baskı → dispute | Duvar kalınlığı/overhang/floating-part analizi; sonuç: uyarı seviyeleri (bilgi/uyarı/engel) ve satın alma öncesi net mesaj                                                                                                                               |
| T3  | **Model onarımı ve yön (orientation) yok**                                                                                | P2      | Delikli STL'ler reddediliyor                                                    | Otomatik onarım denemesi (mesh repair) + önerilen baskı yönü                                                                                                                                                                                             |
| T4  | **Format kapsamı:** yalnız STL/3MF/OBJ                                                                                    | P2      | Mühendislik müşterisi STEP/IGES ister                                           | STEP → mesh dönüştürme (OpenCascade) worker'da; ölçü birimi (mm/inch) algılama                                                                                                                                                                           |
| T5  | **Renk/çok malzeme, yüzey işlemi, dolgu, katman kalınlığı, tolerans** sipariş seçeneği değil (yalnız malzeme+renk+infill) | P1      | Printify'ın "varyant" karşılığı = 3D'de _baskı profili_                         | `print_profiles` tablosu (teknoloji, malzeme, katman, dolgu, son işlem); fiyat/kapasite profil bazlı; üretici hangi profilleri sunduğunu işaretler                                                                                                       |
| T6  | **Son işlem (zımpara, boya, buhar) ve montaj** yok                                                                        | P2      | Yüksek marjlı ek gelir                                                          | Kalem başına `post_processing` seçenekleri, üretici fiyat çarpanı                                                                                                                                                                                        |
| T7  | **Malzeme/renk kataloğu serbest metin** (üretici "PLA" yazıyor, renk virgüllü metin)                                      | P1      | Eşleştirme string eşleşmesine bağlı; yazım hatası = eşleşmeme                   | `materials` ve `colors` referans tabloları (admin yönetir), üretici seçer; renk için hex + isim                                                                                                                                                          |

### 4.2 Ödeme, para ve yasal

| #   | Eksik                                                                                                                                      | Öncelik     | Mantıksal çözüm                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | **Gerçek ödeme sağlayıcısı yok** (F5-T2 bloke: iyzico anahtar/doküman)                                                                     | **P0**      | iyzico Pazaryeri adapter'ı (alt üye işyeri, kalem onayı, iade); sandbox testleri; `PaymentProvider` arayüzü hazır. Global için Stripe Connect (D1)                    |
| P2  | **Alt üye işyeri (üretici/satıcı KYC) yok** — IBAN/vergi no toplanıyor ama doğrulanmıyor; "kayıtsız üretici eşleşmez" kuralı uygulanamıyor | **P0**      | Onboarding sonrası `sub_merchant_key` + durum (`pending/approved/rejected`); eligibility'de `approved` şartı                                                          |
| P3  | **Vergi (KDV/VAT) hiç yok**; fiyat brüt/net belirsiz                                                                                       | **P0**      | Karar D5: fiyatlar KDV dahil mi? `tax_rate`, `tax_minor` alanları; ülkeye göre oran tablosu; platform komisyonu üzerinde KDV; üretici/satıcı fatura kesme yükümlülüğü |
| P4  | **Fatura / e-arşiv** yok                                                                                                                   | **P0** (TR) | Entegratör (Paraşüt/Logo/Uyumsoft — seçim gerekir) ya da alt üye işyerlerine düşen fatura akışı + platform komisyon faturası; sipariş PDF/özet                        |
| P5  | **Kur / çoklu para birimi** yok                                                                                                            | P3          | Fiyat tablosu para birimi bazlı, kur kaynağı günlük, sipariş anında kur kilitlenir, ledger zaten currency taşıyor                                                     |
| P6  | **Chargeback / 3DS red / kısmi iade UI** yok                                                                                               | P1          | Webhook `chargeback` olayı → dispute'a bağla; admin iade formu zaten var, alıcıya durum bildirimi ekle                                                                |
| P7  | **Kupon/indirim, hediye kartı, referans** yok                                                                                              | P2          | `promotions` tablosu; indirim ledger'da ayrı hesap (`promo_expense`), üretici payı etkilenmez                                                                         |
| P8  | **Ödeme yöntemi çeşitliliği** (havale/EFT, taksit, PayPal, Apple Pay)                                                                      | P2          | iyzico taksit/BKM; global için Stripe ödeme yöntemleri                                                                                                                |
| P9  | **Üretici ödeme takvimi/bakiye ekranı** yok                                                                                                | P1          | Üretici "Earnings" sayfası: bekleyen/ödenen, payout tarihleri, dekont (`payouts` tablosu hazır)                                                                       |

### 4.3 Sipariş, kargo, lojistik

| #   | Eksik                                                                   | Öncelik | Mantıksal çözüm                                                                                                                                  |
| --- | ----------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| L1  | **Sabit kargo ücreti** (50 TL)                                          | **P0**  | Ağırlık×hacimsel ağırlık×bölge tablosu; v1: bölge/ağırlık kademeleri; v2: kargo API'den canlı fiyat (Yurtiçi/Aras/MNG; global: DHL/UPS/EasyPost) |
| L2  | **Kargo etiketi ve takip entegrasyonu yok** (takip no elle)             | P1      | Kargo API'si ile etiket üretimi, takip webhook'u → otomatik `shipped/delivered`; D3 kararı                                                       |
| L3  | **Teslim tarihi tahmini (ETA) yok**                                     | P1      | ETA = kapasite slotu + baskı süresi + SLA + kargo süresi; ürün/checkout'ta göster                                                                |
| L4  | **İade/yeniden gönderim** (kayıp, hasar) yok; dispute yalnız para       | P1      | Karar: "yeniden üretim" (Faz 5'te ertelendi): kararla aynı sipariş yeni üreticiyle eşleşir, emanet korunur, ilk üreticiye ödeme yok              |
| L5  | **Kısmi teslimat / çoklu paket** yok                                    | P3      | v1 dışı; çok kalemli siparişte tek paket varsay                                                                                                  |
| L6  | **Gümrük bilgileri** (HS kodu, değer beyanı) yok                        | P3      | Global sevkiyatta zorunlu; ürün kategorisi → HS kodu tablosu                                                                                     |
| L7  | **Kalite kontrol kanıtı:** üretici sevkiyattan önce fotoğraf yüklemiyor | P1      | "Shipped" için opsiyonel→zorunlu QC fotoğrafı; dispute'ta delil olarak otomatik kullanılır (kötüye kullanımı azaltır)                            |
| L8  | **Sipariş düzenleme/iptal ücreti politikası** yok                       | P1      | Durum bazlı iptal kuralı: `matching`'e kadar ücretsiz, `in_production` sonrası kısmi ücret; `cancellation_policy` konfigürasyonu                 |
| L9  | **Sipariş notları / üreticiye talimat** (renk tonu, yön) yok            | P2      | Kalem başına `notes` (üretici görür; kişisel veri filtresi)                                                                                      |

### 4.4 Mağaza entegrasyonu ve satıcı deneyimi (Printify'ın kalbi)

| #   | Eksik                                                                  | Öncelik | Mantıksal çözüm                                                                                                                                                                                           |
| --- | ---------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | **Shopify / Etsy / WooCommerce bağlantısı yok** (Faz 7)                | **P1**  | OAuth + HMAC webhook, SKU eşleme, fulfillment geri yazımı; D2 (taban maliyet tahsilatı) önce karara bağlanmalı: **öneri: satıcı cüzdanına ön yükleme/kayıtlı kart, sipariş anında taban maliyet çekilir** |
| S2  | **Mockup / ürün görseli yok** (vitrin ve mağaza için)                  | P1      | Otomatik render (turntable, three.js sunucu/headless veya Blender worker) → `product_images`; üretici foto yükleyebilsin (ilk gerçek baskıdan)                                                            |
| S3  | **Satıcı fiyat/marj aracı** zayıf: yalnız `margin_bps`                 | P1      | Marj yüzdesi ↔ hedef satış fiyatı hesaplayıcı, tahmini kâr; ürün başına kargo dahil/hariç                                                                                                                 |
| S4  | **Satıcı sipariş listesi ve analitik yok** (B7)                        | P1      | `seller/orders`, gelir grafiği, en çok satan ürün; (dataviz skill'i ile)                                                                                                                                  |
| S5  | **Satıcı üretici tercihi yok** (favori, kara liste, "yalnız tier ≥ N") | P2      | `required_trust_tier` alanı var; UI + satıcı bazlı tercih; kural 1 korunur (kimlik yok, alias/tier ile)                                                                                                   |
| S6  | **White-label / marka**: paket içi kart, etiket, logo                  | P2      | Sipariş başına `packaging` ayarları; üreticiye talimat + ek ücret                                                                                                                                         |
| S7  | **Örnek sipariş** (kendine numune)                                     | P1      | `channel: sample`, indirimli/maliyetine, marj yok; ürün yayınlamadan önce önerilir                                                                                                                        |
| S8  | **Toplu içe aktarma / API anahtarları / CSV**                          | P3      | Public REST API + API key, rate limit, OpenAPI                                                                                                                                                            |
| S9  | **Ürün varyantı** (boyut ölçekleme, renk seti)                         | P1      | Ürün ölçeklenebilirse: `scale` seçeneği → hacim/fiyat yeniden hesap                                                                                                                                       |
| S10 | **Katalog genişliği** (hazır ürün şablonları, kategoriler)             | P1      | Admin kategori ağacı, etiketler, öne çıkan; katalog içerik moderasyonu (Faz 9)                                                                                                                            |

### 4.5 Üretici deneyimi ve güven

| #   | Eksik                                                                                                            | Öncelik | Mantıksal çözüm                                                                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| M1  | **Üretici doğrulama (KYC) ve trust tier yükseltme mantığı yok** — `trust_tier` sabit 0, artışı hesaplayan iş yok | **P0**  | Otomatik tier hesabı (tamamlanan iş, puan, zamanında oran, dispute oranı) + admin onayı; tier → dosya erişim süreleri zaten bağlı |
| M2  | **Üretici skor kartı/performans ekranı yok**                                                                     | P1      | Zamanında oran, puan, dispute, ortalama kabul süresi; eşleştirme skoruyla aynı kaynak                                             |
| M3  | **Yazıcı bakım/durum, mevcut filament stoğu** yok                                                                | P2      | Stok bilgisi eşleştirme filtresi ("bu renkte stok yok" teklifi engelle)                                                           |
| M4  | **Üretici eğitim/onboarding rehberi, test baskısı** yok                                                          | P2      | "Kalibrasyon baskısı" onayı (foto) → aktif olma şartı                                                                             |
| M5  | **Çok yazıcılı iş dağıtımı** (çiftlik) ve otomasyon API'si (OctoPrint/Bambu Lab) yok                             | P3      | Üretici API'si/webhook: iş durumunu yazıcıdan otomatik güncelle                                                                   |
| M6  | **Kapasite:** yalnız gün bazlı dakika; tatil/bakım/acil iş yok                                                   | P2      | İstisna günleri, otomatik "yoğunluk" fiyat çarpanı (P3)                                                                           |
| M7  | **Üretici–alıcı iletişimi (anonim mesajlaşma)** yok                                                              | P1      | Platform içi mesajlaşma, kişisel veri/iletişim bilgisi filtresi, kural 1; platform atlatmayı önler (PRD §9)                       |

### 4.6 Bildirim, iletişim, destek

| #   | Eksik                                                                                                           | Öncelik | Mantıksal çözüm                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| N1  | **Bildirim sistemi:** yalnız 4 e-posta; sipariş durum değişimi, ödeme alındı, kargoda, dispute, payout için yok | **P0**  | Olay → bildirim eşlemesi (`notifications` + şablon), e-posta + uygulama içi (Transmit ile canlı) + tercih ekranı; kuyrukla, idempotent |
| N2  | **Uygulama içi bildirim merkezi** yok                                                                           | P1      | `notifications` tablosu, okunmamış sayacı, üst çubukta zil                                                                             |
| N3  | **Destek/yardım merkezi, SSS, iletişim formu** yok                                                              | P1      | Statik SSS + `support_tickets` (sipariş bağlantılı); admin kuyruğu                                                                     |
| N4  | **Webhook (satıcı için)** yok                                                                                   | P2      | Sipariş durum değişikliğinde satıcı URL'sine imzalı webhook (Printify API benzeri)                                                     |
| N5  | **E-posta şablonları tasarımsız** (`resources/views/emails`)                                                    | P1      | `brand` + `design` skill'i ile marka kimliğinde şablon seti                                                                            |

### 4.7 Güvenlik, gizlilik, uyum

| #   | Eksik                                                                                                  | Öncelik | Mantıksal çözüm                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------- |
| G1  | **2FA / güvenli oturum yönetimi** yok (özellikle admin, üretici, ödeme alanlar)                        | **P0**  | TOTP 2FA (admin zorunlu), cihaz/oturum listesi, şifre değişince oturumları düşür                                     |
| G2  | **KVKK/GDPR:** veri dışa aktarma, silme, açık rıza, saklama süresi yok                                 | **P0**  | Kullanıcı verisi export/delete akışı (ledger/audit korunur, PII anonimleştirilir), çerez/rıza, aydınlatma metni (D5) |
| G3  | **Yasal sayfalar** (mesafeli satış, iade, üyelik, gizlilik) yok                                        | **P0**  | Faz 11-T5; hukuk metni; checkout'ta onay kutusu ve sürüm kaydı                                                       |
| G4  | **Rate limit yalnız giriş/şifre akışlarında**; kayıt, dosya yükleme, sipariş, webhook uçları korumasız | P1      | Global + rota bazlı limiter, dosya yüklemede kota/boyut, bot koruması (Turnstile)                                    |
| G5  | **Sahtekârlık/istismar:** sahte sipariş, kart deneme, üretici–alıcı hesap çakışması, platform atlatma  | P1      | Basit kural motoru (yeni hesap+yüksek tutar → manuel inceleme), IP/cihaz sinyali, mesaj filtresi                     |
| G6  | **Dosya güvenliği:** tarama (zararlı dosya), telif/yasa dışı model (silah vb.) yok                     | P1      | Yüklemede virüs taraması; içerik politikası; admin "şikâyet et" akışı ve DMCA benzeri süreç                          |
| G7  | **Gizli alan yönetimi/rotasyon:** APP_KEY rotasyonu, şifreli alan anahtarı sürümlemesi yok             | P1      | Anahtar sürümü alanı, yeniden şifreleme işi                                                                          |
| G8  | **Denetim izi UI'ı yok** (audit_logs yazılıyor, görünmüyor)                                            | P1      | Admin audit log arama ekranı (F9-T1)                                                                                 |
| G9  | **Bağımlılık/OWASP taraması** yapılmadı                                                                | P1      | CI'da `npm audit`/Dependabot, ZAP baseline; Faz 11-T2                                                                |

### 4.8 Yönetim (Admin) ve operasyon

| #   | Eksik                                                                                                                                | Öncelik | Mantıksal çözüm                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ------- | ----------------------------------------------------------------------------------------- |
| A1  | **Admin yalnız dispute + katalog**: kullanıcı yönetimi, askıya alma, sipariş gözetimi, `unmatched` kuyruğu, manuel atama yok (Faz 9) | **P0**  | Kuyruk ekranları: `unmatched`, SLA aşımı, needs_review (webhook), reconcile farkları      |
| A2  | **Konfigürasyon kodda** (`config/fabrmatch.ts`): komisyon, keşif oranı, TTL değişmek için deploy ister                               | P1      | `settings` tablosu + admin ekranı, değişiklikler audit'li; B1 ile birlikte                |
| A3  | **Metrik paneli** yok (PRD §15: eşleşme süresi, kabul oranı, dispute oranı, yeni üretici payı)                                       | P1      | Materyalize görünümler + grafik; komisyon geliri, GMV                                     |
| A4  | **Moderasyon:** ürün/katalog/yorum yok                                                                                               | P1      | Onay kuyruğu                                                                              |
| A5  | **Reconcile/needs_review uyarıları yalnız log/audit**                                                                                | P0      | Admin dashboard'da kırmızı sayaç + e-posta/Slack uyarısı                                  |
| A6  | **Gözlemlenebilirlik:** `@adonisjs/otel` atlandı; metrik/iz/hata izleme yok                                                          | P1      | OpenTelemetry + Sentry benzeri hata izleme, kuyruk derinliği, webhook gecikmesi alarmları |
| A7  | **Yedek/felaket kurtarma, deploy, ortam ayrımı** yok (D4 hosting kararsız)                                                           | P0      | Faz 11: Postgres PITR, R2 sürümleme, staging, migration stratejisi, health-check, runbook |
| A8  | **CI yalnız lint/typecheck/test**; e2e/tarayıcı testi yok                                                                            | P1      | Playwright akış testleri (kayıt→sipariş→ödeme→teslim), görsel regresyon                   |

### 4.9 Ürün deneyimi (UX) ve büyüme

| #   | Eksik                                                                                             | Öncelik                | Mantıksal çözüm                                                                                        |
| --- | ------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| U1  | **Şu an yalnız İngilizce**, i18n altyapısı yok                                                    | P1 (TR pazarı için P0) | TR + EN: `@adonisjs/i18n` veya istemci tarafı sözlük; e-postalar dahil; sayfa metinleri koddan ayrılır |
| U2  | **Mobil odaklı akış:** dosya yükleme/3D görüntüleme mobilde denenmedi                             | P1                     | Gerçek cihaz testi, yüklemede ilerleme çubuğu, sürükle-bırak                                           |
| U3  | **Canlı fiyat/ETA ve 3D önizleme** yalnız kendi dosyası için                                      | P1                     | Quote sayfası iki sütun + 3D, malzeme/renk karşılaştırma, "en ucuz / en hızlı" seçeneği                |
| U4  | **Vitrin SEO tamamlanmadı** (Lighthouse ölçümü, OG görselleri, yapısal veri genişletme, hreflang) | P1                     | F6-T5; ürün görselleri (S2) olmadan OG anlamsız                                                        |
| U5  | **Yorum/puan yalnız üreticiye gider**; ürün yorumu yok                                            | P2                     | Ürün yorumu (doğrulanmış alıcı), üretici kimliği yine gizli                                            |
| U6  | **Sepet, favori, tekrar sipariş ("reorder")** yok                                                 | P1                     | Sepet (çok kalem, B6) + "aynısını tekrar sipariş et"                                                   |
| U7  | **Sipariş/model paylaşımı ve teklif isteme (RFQ) UI yok** (Faz 8)                                 | P2                     | Kurumsal ihale akışı                                                                                   |
| U8  | **Erişilebilirlik denetimi yapılmadı** (kod kuralları var, ölçüm yok)                             | P1                     | axe taraması CI'da, klavye akışı testleri                                                              |

---

## 5. 3D baskıya özgü mantıksal öneriler (Printify'dan farkımız)

1. **Kalite garantisi = ürünün kendisi.** Printify'da baskı standarttır; 3D'de aynı dosya üreticiye göre farklı çıkar. Öneri: (a) kalibrasyon baskısı zorunluluğu, (b) sevkiyat öncesi QC fotoğrafı, (c) tier'a bağlı sipariş değeri limiti (yeni üretici yüksek değerli sipariş alamaz).
2. **Fiyat şeffaflığı için "dilimleyici tabanlı fiyat"** (T1) — güvenin temeli; üretici de kendi dilimleyicisiyle doğrulayabilir ("tahmin ±%X").
3. **Kapasite dakikayla ölçülüyor — bu doğru seçim;** ama gerçek kapasite _yazıcı × gün × yatak dolulukluğu_ (parçaları tek tablaya dizme). Öneri: çok parçalı siparişlerde nesting tahmini, tablada birleşik baskı (üreticiye avantaj, alıcıya indirim).
4. **Yeniden üretim (reprint) birinci sınıf akış olmalı.** 3D'de başarısız baskı yaygın; dispute → yeniden eşleştirme, emanet korunur, ilk üreticinin puanı düşer.
5. **Teslimat süresi rekabet farkı:** Printify günler; biz "yerel üretim" ile 2–4 gün vaat edebiliriz. Bunun için bölge tabanlı eşleştirme (B5) ve ETA (L3) şart.
6. **IP koruması bir ürün özelliği:** kural 4 (imzalı, süreli indirme) doğru. Eklenmeli: filigranlı/hafif (LOD) dosya, indirme sayısı sınırı, kullanım kaydı (mevcut) ve _üreticiye dosya yerine G-code/dilimlenmiş iş gönderme_ seçeneği (ileri seviye).
7. **Sürdürülebilirlik/lokalite pazarlaması:** "en yakın üretici" filtresi (mesafe) — konum verisi (şehir yerine enlem/boylam veya posta kodu) gerekir; kimlik gizliliği korunarak yalnız "yaklaşık mesafe".

---

## 6. Önerilen yol haritası (mevcut Faz 5–11 ile birleştirilmiş)

| Sıra                  | Paket                                | İçerik                                                                                                                                      | Bağımlılık              |
| --------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| **R0** (hemen, küçük) | Doğruluk düzeltmeleri                | B1 komisyon, B3 e-posta doğrulama şartı, B4 iptal+iade, B7 satıcı sipariş listesi, sayfalama, ölü alan temizliği                            | –                       |
| **R1**                | Para & yasal temel                   | P1/P2 iyzico + alt üye işyeri, P3/P4 vergi+fatura, G1 2FA, G2/G3 KVKK+yasal, N1 bildirim sistemi                                            | D1, D5, iyzico anahtarı |
| **R2**                | Fiyat doğruluğu & kargo              | T1 dilimleyici, T5 baskı profilleri, T7 malzeme/renk kataloğu, L1/L2 kargo fiyat+etiket+takip, L3 ETA, B2 üretici min fiyat                 | D3                      |
| **R3**                | Operasyon & güven                    | A1/A2/A3/A5 admin kuyrukları+ayar+metrik, M1/M2 tier+skor kartı, L7 QC foto, L4 yeniden üretim, M7 anonim mesajlaşma, A6 gözlemlenebilirlik | R1                      |
| **R4**                | Satıcı büyümesi (Printify çekirdeği) | S1 Shopify/Etsy (Faz 7), S2 mockup, S3/S4 marj+analitik, S7 örnek sipariş, B6 sepet/çok kalem                                               | R1, R2, D2              |
| **R5**                | Lansman sağlamlaştırma               | A7 deploy/yedek, G4–G9 güvenlik, A8 e2e, U1 TR/EN, U4 SEO ölçümü                                                                            | R1–R4                   |
| **R6**                | Global & kurumsal                    | Faz 10 (Stripe, çoklu para, bölge kuralları, gümrük), Faz 8 RFQ, S8 public API, T4 STEP                                                     | D1                      |

Not: R0 bugün başlayabilir (dış bağımlılık yok). R1'in gerçek ödeme kısmı için iyzico sandbox anahtarı gerekir.

---

## 7. Açık kararlar (kullanıcıdan gerekli)

| #   | Karar                                                              | Öneri                                                              |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| K-A | Fiyatlar KDV dahil mi? Hangi ülke(ler) ilk hedef?                  | TR'de KDV dahil gösterim; ilk pazar TR, sonra AB (OSS/VAT)         |
| K-B | Üretici fiyatlaması: platform listesi mi, üretici teklifi mi? (B2) | v1: platform fiyatı + üretici min fiyat                            |
| K-C | Fatura: entegratör seçimi                                          | Yerel e-arşiv entegratörü; platform yalnız komisyon faturası keser |
| K-D | Kargo: API mi, manuel mi (D3)                                      | v1 bölge/ağırlık tablosu + manuel takip; v2 kargo API              |
| K-E | Dış mağaza taban maliyet tahsilatı (D2)                            | Satıcı cüzdanı/kayıtlı kart; sipariş anında çek                    |
| K-F | Hosting (D4)                                                       | Tek bölge + R2; staging şart                                       |
| K-G | Yeniden üretim akışı                                               | Evet, Faz 5 sonrası ilk iş (L4)                                    |
| K-H | Dilimleyici lisansı/altyapısı                                      | Açık kaynak (Prusa/Orca CLI) worker'da; maliyet: CPU               |
| K-I | Dil kapsamı                                                        | TR + EN başlangıç                                                  |

---

## 8. Doğrulama notları (bu belge nasıl üretildi)

- Kod incelemesi: route sayısı (65), modeller, servisler, işler, e-posta şablonları, `grep` ile B1–B7 kanıtları.
- Yol haritası: `docs/PROJECT_MEMORY.md` Faz 5–11.
- Printify özellikleri: genel bilinen ürün davranışı (mağaza entegrasyonu, katalog, mockup, print provider, takip geri yazımı). **Güncel Printify fiyat/özellik ayrıntıları bu belgede doğrulanmadı**; ürün kararı öncesi resmi dokümandan teyit edilmeli.
- Tahminler (ETA, sürüm, süre) yer almıyor; boyut belirtilmedi — planlama `PROJECT_MEMORY.md`'de yapılır.
