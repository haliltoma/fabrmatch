# Fabrmatch — Fullstack Teknik PRD

> Kaynak: `Fabrmatch — Ürün Gereksinimleri Dokümanı (PRD)` (iş PRD'si).
> Bu doküman o PRD'yi **AdonisJS v7 + React/Inertia** üzerinde nasıl hayata
> geçireceğimizi tanımlar. İş kuralı değişirse önce iş PRD'si, sonra bu doküman güncellenir.
> Sürüm: 0.1 — 2026-09-22

---

## 1. Özet

Fabrmatch; üretici (manufacturer), satıcı/alıcı (seller/buyer) ve admin rollerinden oluşan,
siparişi otomatik ve adil biçimde bir 3D baskı üreticisine yönlendiren, ödemeyi teslim onayına
kadar güvence altında tutan bir pazar yeridir. Kanallar: Fabrmatch vitrini, satıcının Shopify/Etsy
mağazaları ve kurumsal ihale (RFQ).

## 2. Teknoloji Stack'i (kararlar + gerekçe)

| Katman             | Seçim                                                           | Gerekçe                                                                                      |
| ------------------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Runtime            | Node.js 24 LTS                                                  | AdonisJS v7 zorunlu kılıyor                                                                  |
| Framework          | AdonisJS v7 (React starter kit)                                 | Kullanıcı tercihi; auth/Lucid/VineJS/mail/limiter tek çatı; uçtan uca tip güvenliği          |
| Frontend           | React + Inertia (SSR açık), Tailwind                            | Vitrin SEO istiyor; 3 rol için dashboard; `inertia.render` / `<Link>` / `<Form>` tip güvenli |
| Serileştirme       | v7 Transformers (`BaseTransformer`)                             | Üretici kimliğinin gizlenmesi gibi alan bazlı kuralları tek yerde, tipli uygular             |
| ORM / DB           | Lucid v22 + PostgreSQL 16                                       | İlişkisel veri + para için ACID; migration-first schema class'ları                           |
| Validasyon         | VineJS v4                                                       | v7 varsayılanı                                                                               |
| Kuyruk             | `@adonisjs/queue` (Redis adapter) — **sürüm sabitlenecek**      | Eşleştirme, zaman aşımı, webhook, dosya analizi; paket deneysel                              |
| Cache / limiter    | Redis + `@adonisjs/cache`, `@adonisjs/limiter`                  | Oran sınırlama (`limiter.multi`), fiyat teklifi cache'i                                      |
| Yetki              | `@adonisjs/auth` (session + access token) + `@adonisjs/bouncer` | Rol ve kayıt bazlı politika; dış entegrasyonlar için token                                   |
| Dosya              | `@adonisjs/drive` + Cloudflare R2 (S3 uyumlu)                   | Büyük STL/3MF; imzalı, süreli URL                                                            |
| Gerçek zamanlı     | `@adonisjs/transmit` (SSE)                                      | Üreticiye sipariş teklifi bildirimi                                                          |
| Mail               | `@adonisjs/mail`                                                | İşlem bildirimleri                                                                           |
| Ödeme (TR)         | iyzico Pazaryeri (alt üye işyeri + onaylı ödeme)                | Emanet benzeri akışın lisanslı sağlayıcı üzerinden yasal yürütülmesi                         |
| Ödeme (global)     | Stripe Connect — **açık karar** (bkz. §13)                      | Global satıcı/alıcı; tüzel kişilik gereksinimi doğrulanmalı                                  |
| Gözlemlenebilirlik | `@adonisjs/otel`                                                | Eşleştirme/ödeme akışlarında izleme                                                          |
| Test               | Japa (unit + functional + browser)                              | v7 varsayılanı                                                                               |
| Deploy             | Docker; web + worker ayrı süreç                                 | Kuyruk worker'ı HTTP'den bağımsız ölçeklenmeli                                               |

## 3. Mimari

```
                ┌──────────── Fabrmatch Vitrin (Inertia SSR) ───────────┐
Alıcı ──────────►                                                        │
Satıcı paneli ──►  AdonisJS v7 HTTP (controllers → services → models)   │
Üretici paneli ─►        │                  │                            │
Admin paneli ───►        │ dispatch         │ Transmit (SSE)             │
                         ▼                  ▼                            │
Shopify/Etsy ──webhook─► Queue (Redis) ──► Worker süreci ────────────────┘
iyzico/Stripe ─webhook─►   ├─ AnalyzeModelFile        PostgreSQL
                           ├─ RunMatchingRound        Redis
                           ├─ ExpireOffer             R2 (dosyalar)
                           ├─ SyncExternalOrder
                           ├─ AutoConfirmDelivery
                           └─ ReleasePayout
```

### Modül (domain) sınırları

`app/` altında dosya türü klasörleri korunur (Adonis konvansiyonu), iş mantığı `app/services/<domain>/` altında toplanır:

| Domain          | Sorumluluk                                                       |
| --------------- | ---------------------------------------------------------------- |
| `identity`      | Kullanıcı, rol, profil, KYC/alt üye işyeri bilgisi               |
| `manufacturing` | Yazıcı, malzeme, kapasite, güven seviyesi, performans skoru      |
| `catalog`       | Hazır ürün şablonları, varyantlar, satıcı ürünleri               |
| `files`         | Model yükleme, analiz, erişim (IP koruması)                      |
| `pricing`       | Maliyet hesabı, satıcı marjı, komisyon                           |
| `orders`        | Sipariş, sipariş kalemi, durum makinesi, kargo                   |
| `matching`      | Uygunluk filtresi, skor, yeni üretici kotası, teklif/zaman aşımı |
| `payments`      | Provider adapter, emanet, defter (ledger), ödeme dağıtımı        |
| `disputes`      | Anlaşmazlık, kanıt, admin kararı                                 |
| `integrations`  | Shopify, Etsy                                                    |
| `rfq`           | Kurumsal talep, üretici teklifleri, kazanan seçimi               |
| `admin`         | Moderasyon, metrikler                                            |

## 4. Roller ve Yetkiler

| Yetenek                                     | Satıcı/Alıcı    | Üretici                         | Admin           |
| ------------------------------------------- | --------------- | ------------------------------- | --------------- |
| Katalogdan / özel dosyayla sipariş          | ✓               | –                               | ✓ (görüntüleme) |
| Kendi ürününü yayınlama (vitrin/dış mağaza) | ✓               | –                               | moderasyon      |
| Yazıcı/malzeme/kapasite tanımlama           | –               | ✓                               | ✓               |
| Sipariş teklifini kabul/red                 | –               | ✓                               | –               |
| Siparişi hangi üreticinin ürettiğini görme  | ✗               | kendi işleri                    | ✓               |
| Alıcının kimliği/iletişimi                  | kendi müşterisi | yalnızca kargo etiketi alanları | ✓               |
| Anlaşmazlık açma                            | ✓               | yanıt verme                     | karar           |
| RFQ açma                                    | ✓ (kurumsal)    | teklif verme                    | ✓               |

Bir kullanıcı birden fazla role sahip olabilir (ör. hem satıcı hem üretici) → `user_roles` tablosu.
**Kendi siparişini kendi üretemez** kuralı eşleştirmede uygulanır (platform atlatma önlemi).

## 5. Veri Modeli (çekirdek tablolar)

> Tüm para alanları **tamsayı, en küçük birim** (kuruş/cent) + `currency` (ISO 4217). Float yok.

| Tablo                   | Önemli alanlar                                                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`                 | id, email, password, full_name, locale, status                                                                                                |
| `user_roles`            | user_id, role (`seller`,`manufacturer`,`admin`)                                                                                               |
| `seller_profiles`       | user_id, business_name, tax_id, is_corporate, default_margin_bps                                                                              |
| `manufacturer_profiles` | user_id, public_alias (ör. `FM-3F7K`), city, country, trust_tier (0-3), score, joined_at, sub_merchant_key, status                            |
| `printers`              | manufacturer_id, technology (`FDM`,`SLA`,`SLS`), build_x/y/z_mm, active                                                                       |
| `printer_materials`     | printer_id, material (`PLA`,`PETG`,`ABS`,`RESIN`...), color, price_per_gram_minor                                                             |
| `capacity_calendar`     | manufacturer_id, date, max_print_hours, reserved_hours                                                                                        |
| `model_files`           | owner_id, storage_key, format, sha256, volume_mm3, bbox_x/y/z, triangle_count, analysis_status, is_printable                                  |
| `catalog_products`      | title, slug, model_file_id, allowed_materials, base_specs                                                                                     |
| `seller_products`       | seller_id, catalog_product_id \| model_file_id, retail_price_minor, published_on_storefront                                                   |
| `orders`                | code, channel (`storefront`,`shopify`,`etsy`,`rfq`,`direct`), buyer_id, seller_id, status, currency, totals…, shipping_address (şifreli JSON) |
| `order_items`           | order_id, model_file_id, material, color, quantity, est_grams, est_print_minutes, unit_cost_minor                                             |
| `production_jobs`       | order_id, manufacturer_id, status, accepted_at, due_at, tracking_number, carrier                                                              |
| `match_offers`          | order_id, manufacturer_id, round, score, is_exploration, status (`pending`,`accepted`,`declined`,`expired`), expires_at                       |
| `payments`              | order_id, provider (`iyzico`,`stripe`), provider_ref, status, amount_minor                                                                    |
| `ledger_entries`        | transaction_id, account (`buyer_escrow`,`platform_fee`,`manufacturer_payable`,`seller_payable`,`refund`), direction, amount_minor, currency   |
| `payouts`               | beneficiary_type, beneficiary_id, amount_minor, provider_ref, status                                                                          |
| `disputes`              | order_id, opened_by, reason, status, resolution, refund_minor                                                                                 |
| `dispute_evidence`      | dispute_id, uploader_id, storage_key, note                                                                                                    |
| `file_access_grants`    | model_file_id, manufacturer_id, production_job_id, expires_at, download_count                                                                 |
| `integrations`          | seller_id, platform, shop_domain, access_token (şifreli), status                                                                              |
| `external_orders`       | integration_id, external_id, payload, order_id, sync_status (idempotency)                                                                     |
| `rfqs` / `rfq_bids`     | kurumsal talep; bid: manufacturer_id, unit_price_minor, lead_days, status                                                                     |
| `reviews`               | production_job_id, rating, comment (üreticiye anonim yansır)                                                                                  |
| `audit_logs`            | actor_id, action, subject, meta                                                                                                               |

Hassas alanlar (adres, token, IBAN) v7 encryption modülü (`aes256gcm`) ile şifrelenir; aranması gereken
e-posta benzeri alanlar için gerekirse deterministik `aessiv` sürücüsü.

## 6. Sipariş Durum Makinesi

```
draft → awaiting_payment → paid(escrow) → matching → in_production → shipped
      → delivered → completed(payout)             ↘ disputed → resolved(refund|payout)
matching → unmatched (N tur sonra) → admin_review / refund
herhangi bir ödeme öncesi durum → cancelled
```

Kurallar:

- Geçişler yalnızca `OrderStateMachine` servisi üzerinden, DB transaction + `audit_logs` kaydıyla.
- `delivered` sonrası **X gün** (config, varsayılan 7) içinde anlaşmazlık açılmazsa `AutoConfirmDelivery` işi `completed` yapar.
- `in_production` için SLA: `due_at` aşılırsa uyarı, 2×SLA'da admin'e düşer ve yeniden eşleştirme seçeneği açılır.

## 7. Fiyatlama

```
malzeme      = est_grams × material.price_per_gram_minor
makine       = est_print_minutes × manufacturer_hourly_rate / 60
üretici_payı = (malzeme + makine) × (1 + üretici_kâr_oranı)      // referans taban, üreticilere şeffaf
platform     = üretici_payı × komisyon_bps / 10_000
taban_maliyet = üretici_payı + platform + kargo_tahmini
satış_fiyatı = taban_maliyet + satıcı_marjı                      // satıcı belirler
```

- `est_grams` = hacim × dolgu katsayısı × malzeme yoğunluğu (ilk sürüm: sezgisel; ileride slicer CLI ile).
- Katalogda gösterilen fiyat **platformun referans fiyat tablosundan** gelir; eşleşen üreticiye referans üretici payı ödenir. Bu, alıcıya şeffaf ve sabit fiyat sağlar, üreticiler arası fiyat yarışını RFQ'ya bırakır.
- Komisyon oranı ve katsayılar `config/fabrmatch.ts` ve admin panelinden yönetilir.

## 8. Eşleştirme Algoritması (adil fırsat)

**Adım 1 — Uygunluk filtresi (hard constraints):** aktif, teknoloji + malzeme + renk uyumlu, build volume ≥ bbox (döndürme toleransıyla), kapasite takviminde `est_print_minutes` kadar boşluk, trust_tier ≥ siparişin gerektirdiği seviye, satıcı/alıcı ile aynı kullanıcı değil, ülke/kargo bölgesi uyumlu.

**Adım 2 — Skor:**

```
skor = 0.35·kalite (puan, anlaşmazlık oranı) + 0.25·zamanında_teslim
     + 0.20·mesafe_skoru + 0.20·yük_dengesi (az iş alan → yüksek)
```

**Adım 3 — Yeni üretici kotası (keşif):** Son 30 gün içinde katılmış ve henüz ≥3 tamamlanmış işi olmayan üreticiler "keşif havuzu"dur. Her eşleştirme turunda `exploration_rate` (varsayılan %20) olasılıkla teklif, uygun keşif havuzundan skoru en yüksek adaya gider (`match_offers.is_exploration = true`). Keşif siparişleri düşük karmaşıklıklı (küçük hacim, standart malzeme) işlerle sınırlanabilir. Hedef metrik: yeni üreticinin ilk 30 günde ≥1 sipariş alma oranı > %80.

**Adım 4 — Teklif ve zaman aşımı:** Tek üreticiye teklif, `expires_at = now + 30 dk` (config). Red/zaman aşımı → sonraki aday. 5 turda eşleşmezse `unmatched` → admin + alıcıya bildirim.

Eşleştirme saf bir fonksiyon olarak (`rankCandidates(order, candidates, rng)`) yazılır; rastgelelik enjekte edilir → deterministik test edilebilir.

## 9. Anonimlik ve Platform Atlatmayı Önleme

- Üretici her yerde `public_alias` ile görünür; gerçek ad/iletişim yalnızca admin'de.
- Transformer katmanı: `OrderTransformer` satıcı/alıcı varyantında `manufacturer` alanı **hiç yoktur**; üretici varyantında alıcının yalnızca kargo alanları vardır (e-posta/telefon yok).
- Kargo etiketinde gönderici "Fabrmatch Fulfillment" + üretici alias'ı.
- Platform içi mesajlaşma (ileride) e-posta/telefon/URL maskeleme filtresinden geçer.

## 10. Fikri Mülkiyet (dosya erişimi) — güven seviyeleri

| Tier            | Koşul                               | Erişim                                                                                                      |
| --------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 0 — Yeni        | kayıtlı, KYC tamam                  | Dosya yalnızca kabul edilmiş iş için, 24 saat geçerli imzalı URL, max 2 indirme, dosya adı anonim, loglanır |
| 1 — Doğrulanmış | ≥5 tamamlanmış iş, anlaşmazlık < %5 | 72 saat, 5 indirme                                                                                          |
| 2 — Güvenilir   | ≥25 iş, puan ≥ 4.5                  | İş süresince erişim                                                                                         |
| 3 — Partner     | admin ataması                       | Tekrar eden siparişlerde dosya önbellekte tutulabilir                                                       |

Tier geçişleri gece çalışan bir iş ile hesaplanır, admin manuel düşürebilir. İleride: sunucu tarafında dilimleyip yalnızca G-code gönderme seçeneği (tier 0 için) — **kapsam dışı, not.**

## 11. Ödeme Akışı

`PaymentProvider` arayüzü: `createCheckout`, `handleWebhook`, `approveItem`(emaneti serbest bırak), `refund`, `registerSubMerchant`.

**TR (iyzico Pazaryeri):**

1. Üretici ve satıcı onboarding'de alt üye işyeri olarak kaydedilir (`sub_merchant_key`).
2. Checkout'ta sepet kalemleri alt üye işyerlerine paylaştırılır (üretici payı / satıcı marjı); kalan platform komisyonudur.
3. `completed` olunca her kalem için onay çağrısı → iyzico ödemeyi alt üye işyerine aktarır.
4. Anlaşmazlıkta onay verilmez; karar sonrası iade veya onay.

**Global (Stripe Connect — Faz 10):** destination charges / separate charges & transfers ile aynı arayüz. Tüzel kişilik gereksinimi doğrulanmadan kodlanmaz.

**Defter:** her para hareketi çift kayıtlı `ledger_entries` (toplam = 0). Mutabakat işi provider raporuyla günlük karşılaştırır.

## 12. Entegrasyonlar

- **Shopify:** OAuth ile uygulama kurulumu; `orders/create` webhook (HMAC doğrulama) → `external_orders` (idempotent) → Fabrmatch siparişi; satıcının kartından/bakiyesinden taban maliyet tahsilatı; `fulfillment` ile takip numarası geri yazılır.
- **Etsy (Open API v3):** OAuth2 PKCE; yeni receipt'ler için periyodik çekme (webhook sınırlı) → aynı boru hattı; takip numarası geri yazılır.
- Satıcının dış mağazasındaki ürün ↔ `seller_products` eşlemesi SKU ile.

## 13. Açık Kararlar

| #   | Karar                                               | Seçenekler                                                                           | Bloke ettiği faz |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------- |
| D1  | Stripe Connect için tüzel kişilik                   | Yurt dışı şirket (US/EU) / Merchant of Record sağlayıcı / globali ertele             | Faz 10           |
| D2  | Satıcının dış mağaza siparişleri için ödeme yöntemi | Kayıtlı kart / ön yüklemeli bakiye                                                   | Faz 7            |
| D3  | Kargo                                               | Üretici kendi anlaşması + takip no / platform anlaşmalı kargo API                    | Faz 4            |
| D4  | Hosting                                             | Railway / Fly.io / Hetzner + Coolify                                                 | Faz 0            |
| D5  | Hukuk                                               | Mesafeli satış, KVKK, pazaryeri aracı hizmet sağlayıcı yükümlülükleri — uzman görüşü | Faz 11           |

## 14. Fonksiyonel Olmayan Gereksinimler

- Güvenlik: CSRF (session), rate limit (login: IP + e-posta `limiter.multi`), webhook imza doğrulama, dosya yükleme boyut/tip sınırı (STL/3MF/OBJ, ≤ 200 MB), yükleme adı UUID (v7 varsayılanı).
- Performans: vitrin sayfaları SSR + cache; P95 API < 300 ms (dosya analizi hariç, o async).
- Güvenilirlik: tüm kuyruk işleri idempotent; webhook'lar `provider_event_id` ile tekilleştirilir.
- Gözlem: otel trace + yapısal log; ödeme ve eşleştirme olayları `audit_logs`.
- i18n: TR varsayılan, EN Faz 10'da; para birimi TRY → çoklu (TRY/USD/EUR) Faz 10.
- Yedekleme: günlük PostgreSQL yedeği, R2 versioning.

## 15. Başarı Ölçütleri → Teknik Ölçüm

| İş hedefi                                             | Nasıl ölçülür                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------- |
| 20 aktif üretici / 50 aktif satıcı (90 gün)           | Son 30 günde ≥1 işlem yapan profil sayısı (admin dashboard)         |
| 100 tamamlanmış sipariş                               | `orders.status = completed`                                         |
| Anlaşmazlık < %3                                      | disputes / completed+disputed                                       |
| Yeni üreticinin ilk 30 günde sipariş alma oranı > %80 | Kohort sorgusu: joined_at + 30g içinde ≥1 accepted `production_job` |
