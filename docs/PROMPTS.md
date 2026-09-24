# Fabrmatch — Kodlama Ajanı Prompt'ları

> Claude Code / Cursor için hazır prompt'lar. Kullanım:
>
> 1. §0'ı repoda `CLAUDE.md` olarak kaydet (F0-T6).
> 2. Her oturumu §1 ile başlat, faz prompt'unu ver, §2 ile kapat.
> 3. Faz prompt'larını **sırayla** kullan; bir fazın tüm kabul kriterleri yeşil olmadan sonrakine geçme.

---

## §0 — CLAUDE.md (repo kökü, kalıcı bağlam)

```markdown
# Fabrmatch — Ajan Kuralları

## Proje

3D baskı print-on-demand pazar yeri. Roller: seller (satıcı/alıcı), manufacturer (üretici), admin.
Teknik şartname: docs/FABRMATCH_FULLSTACK_PRD.md · Plan ve durum: docs/PROJECT_MEMORY.md

## Stack (değiştirme, önce sor)

- AdonisJS **v7**, Node.js **24**, TypeScript, React + Inertia (SSR), Tailwind
- Lucid v22 + PostgreSQL, VineJS v4, Redis, @adonisjs/queue (sürümü sabit), Drive (S3/R2),
  Bouncer, Limiter, Mail, Transmit, Cache, Otel, Japa

## v7 kuralları (v6 örneklerini KULLANMA)

- Doküman kaynağı: https://docs.adonisjs.com (v7). Emin değilsen önce dokümanı kontrol et; bilmediğin API uydurma.
- Controller'ları route dosyasında üretilen barrel dosyasından içe aktar (projede üretilen import yolunu kontrol et); `.as()` yazma, route'lar otomatik `controller.method` adlanır.
- URL üretimi: `urlFor()` (backend), `<Link route>` / `<Form route>` (frontend). `router.makeUrl` kullanma.
- Yanıt verisi **her zaman Transformer** ile: `serialize({...})` veya `inertia.render(page, { x: XTransformer.transform(m) })`. Model'i doğrudan döndürme.
- Modeller `#database/schema` altındaki üretilmiş schema class'larından türer; kolonları `@column` ile tekrar tanımlama. Önce migration, sonra model.
- Inertia shared data: `inertia_middleware.ts` içindeki `share()`.
- Gizli env değerleri `Env.schema.secret()`; kullanımda `.release()`.
- Paket kurulumu: `node ace add <paket>`.

## Mimari kurallar

- İş mantığı `app/services/<domain>/` altında; controller ince (validate → service → transform).
- Domain'ler: identity, manufacturing, catalog, files, pricing, orders, matching, payments, disputes, integrations, rfq, admin.
- **Para:** tamsayı minor unit (kuruş/cent) + `currency`. Float/decimal JS hesap YOK. Tüm para hareketleri `ledger_entries` çift kayıt.
- Sipariş durumları yalnızca `OrderStateMachine` üzerinden, transaction + audit_log ile.
- Kuyruk işleri idempotent; webhook'lar provider event id ile tekilleştirilir.
- Hassas alanlar (adres, IBAN, TCKN, token) encryption servisiyle şifreli saklanır.

## İş kuralları (asla ihlal etme)

1. Satıcı/alıcıya giden hiçbir çıktıda üretici kimliği yok (yalnız admin görür). Üretici, alıcının yalnızca kargo alanlarını görür.
2. Kullanıcı kendi siparişini üretici olarak alamaz.
3. Yeni üretici keşif kotası eşleştirmede her zaman uygulanır.
4. Model dosyası yalnız `file_access_grants` üzerinden, süreli imzalı URL ile indirilir.
5. Ödeme, sipariş `completed` olmadan ve açık anlaşmazlık varken serbest bırakılmaz.

## Çalışma şekli

- Her görevde: plan (kısa) → migration/model → service + unit test → controller/validator/transformer → functional test → UI.
- `node ace test` ve `npm run typecheck` yeşil olmadan görevi bitmiş sayma.
- Kapsam dışı: Tasarımcı rolü, çoklu mağaza. Eklemek gerekirse DUR ve sor.
- Görev bitince docs/PROJECT_MEMORY.md'de ilgili checkbox'ı işaretle ve Log'a tarihli bir satır ekle.
```

---

## §1 — Oturum açılış prompt'u

```
docs/PROJECT_MEMORY.md, docs/FABRMATCH_FULLSTACK_PRD.md ve CLAUDE.md dosyalarını oku.
Sonra bana 5 satırda: hangi fazdayız, tamamlanan son görev, sıradaki görev, açık kararlardan
bu görevi etkileyen var mı. Kod yazmadan önce onayımı bekle.
```

## §2 — Oturum kapanış prompt'u

```
Bu oturumda yaptıklarını docs/PROJECT_MEMORY.md'ye işle: tamamlanan görevlerin
checkbox'larını işaretle, faz status'unu güncelle, Log'a bugünün tarihiyle ne değişti ve
neden yazdığın 2-4 satır ekle. Yeni ortaya çıkan açık karar varsa "Açık Kararlar"a ekle.
```

---

## Faz 0 — Altyapı & iskelet

```
Görev: PROJECT_MEMORY.md Faz 0 (F0-T1..T6). Önce planını göster.

1. Node 24 olduğunu doğrula. `npm init adonisjs@latest fabrmatch` ile React starter kit'i
   seç, SSR'ı etkinleştir. .nvmrc ve package.json engines ile Node 24'ü sabitle.
2. docker-compose.yml: postgres:16, redis:7, minio (lokal S3). .env.example'ı tam doldur.
   Tüm gizli değerleri Env.schema.secret() ile tanımla.
3. Lucid'i PostgreSQL'e bağla. `node ace add` ile şunları kur ve yapılandır:
   @adonisjs/redis, @adonisjs/queue (Redis adapter; package.json'da sürümü ^ olmadan sabitle —
   paket deneysel), @adonisjs/drive (s3 sürücüsü, minio/R2 uyumlu), @adonisjs/bouncer,
   @adonisjs/limiter, @adonisjs/mail, @adonisjs/transmit, @adonisjs/cache, @adonisjs/otel.
   Her birini docs.adonisjs.com'daki v7 kurulum adımıyla yap.
4. Worker'ı ayrı süreç olarak çalıştır (compose'da `worker` servisi). Örnek PingJob dispatch
   edip worker'da işlendiğini gösteren bir functional test yaz (sync/fake adapter ile).
5. app/services/ altında domain klasörlerini oluştur (boş index + README yok, sadece .gitkeep).
6. GitHub Actions: install, lint, typecheck, test (postgres+redis service container).
7. docs/ klasörüne PRD ve PROJECT_MEMORY'yi, köke CLAUDE.md'yi koy.

Kabul: starter login/signup çalışıyor, `node ace test` ve typecheck yeşil, CI yeşil,
`docker compose up` ile web+worker ayağa kalkıyor.
```

## Faz 1 — Kimlik, roller, onboarding

```
Görev: Faz 1 (F1-T1..T5). UI iskeleti (F1-T6) ayrı yapılacak, sadece çalışan sade sayfalar yap.

- Migration: user_roles, seller_profiles, manufacturer_profiles (PRD §5). Migration sonrası
  üretilen schema class'larından modelleri türet.
- User.hasRole(role); admin yalnız `node ace make:admin` komutuyla (yaz) oluşturulabilir.
- Onboarding: rol seçimi → ilgili profil formu. VineJS validator'ları (IBAN TR formatı,
  TCKN/VKN algoritma kontrolü). IBAN/TCKN encryption servisiyle şifreli kolonlarda.
- manufacturer_profiles.public_alias: `FM-` + 4 karakter, benzersiz, tahmin edilemez.
- Bouncer: rol + sahiplik politikaları. Route grupları /seller, /maker, /admin; middleware ile koru.
- Transformers: UserTransformer (kendi profili), ManufacturerPublicTransformer (alias, tier,
  puan — başka hiçbir alan yok). Bu transformer'ın hassas alan sızdırmadığını test et.
- E-posta doğrulama, şifre sıfırlama; login'e limiter.multi (IP: 10/dk; IP+email: 5/dk, 20 dk blok).

Kabul: 3 rol için yetkisiz erişim 403 testleri, onboarding functional testleri, typecheck yeşil.
```

## Faz 1-UI — Tasarım sistemi (client-design-system-builder skill'i ile)

```
Fabrmatch için tasarım sistemi kur. Marka: "fabrication + match" — güvenilir, teknik ama
sıcak; üreticiler (maker'lar) ve küçük işletmeler hedef. Generic SaaS mavisi istemiyorum.
Tailwind token'ları (renk, tipografi, spacing, radius) oluştur; 3 panel layout'u
(seller/maker/admin) + navigasyon + boş durum + form bileşenleri yap. React + Inertia,
v7 <Link route> ve <Form route> bileşenlerini kullan. Her yeni sayfada token denetimi yap.
```

## Faz 2 — Kapasite & katalog

```
Görev: Faz 2 (F2-T1..T5).
- printers, printer_materials, capacity_calendar, catalog_products, seller_products migration + modeller.
- Build hacmi mm, gram fiyatı minor unit.
- Kapasite rezervasyonu servisi: `reserve(manufacturerId, date, minutes)` SELECT ... FOR UPDATE ile
  atomik; iki eşzamanlı rezervasyonun kapasiteyi aşamadığını test et.
- Haftalık kapasite şablonundan takvim üretimi.
- Admin katalog CRUD; satıcı "Ürünlerim": katalogdan ürün oluştur, perakende fiyat gir.
  (Kendi dosyasıyla ürün Faz 3'ten sonra; alanı nullable bırak.)
- Tüm çıktılar Transformer ile. UI'da Faz 1 tasarım token'larını kullan.
Kabul: CRUD functional testleri, rezervasyon yarış testi, typecheck yeşil.
```

## Faz 3 — Dosya, analiz, fiyat, IP koruması

```
Görev: Faz 3 (F3-T1..T7). PRD §7 ve §10'a uy.

1. Presigned upload: istemci R2'ye doğrudan yükler; sunucu sadece imza verir ve tamamlanınca
   model_files kaydı + AnalyzeModelFile job dispatch eder. Tip: STL/3MF/OBJ, ≤200 MB.
   sha256 aynıysa önceki analizi yeniden kullan.
2. AnalyzeModelFile (worker): dosyayı stream ile oku; hacim (signed tetrahedron yöntemi),
   bbox, üçgen sayısı, manifold/kapalılık kontrolü. 3MF zip'ini aç. Hangi npm paketini
   kullanacağını seçmeden önce bana 2 seçenek + gerekçe sun. Fixture'lar: 20mm küp,
   bozuk STL, 3MF örneği. Küp hacmi %1 toleransla doğru olmalı.
3. PricingService.quote(fileAnalysis, material, color, qty, opts) → saf fonksiyon, tüm
   katsayılar config/fabrmatch.ts'ten. Yuvarlama tek yardımcı fonksiyonda. Tablo testleri.
4. Teklif sayfası: malzeme/renk/adet seçimi → fiyat (Redis cache, key: sha256+parametreler).
   three.js ile salt görüntüleme önizlemesi.
5. file_access_grants + FileAccessService.grant/verify; tier kuralları PRD §10.
   İndirme route'u: grant doğrula → 5 dk'lık imzalı URL'ye yönlendir → download_count++ → audit.
   Gece çalışan RecalculateTrustTiers job'ı (scheduler).
Kabul: analiz fixture testleri, fiyat tablo testleri, süresi geçmiş/limit aşmış grant 403 testi.
```

## Faz 4 — Sipariş, eşleştirme, üretim, kargo

```
Görev: Faz 4 (F4-T1..T8). PRD §6, §8, §9. En kritik faz — önce F4-T3'ü yaz ve simüle et.

1. orders, order_items, production_jobs, match_offers, reviews migration'ları.
2. OrderStateMachine: izinli geçiş tablosu, `transition(order, to, actor, meta)` —
   transaction + audit_log; geçersiz geçişte özel exception.
3. matching/eligibility.ts: PRD §8 Adım 1 filtresini tek sorguda (veya sorgu + bellek filtresi)
   uygula. Kendi siparişini üretememe kuralı dahil.
4. matching/rank.ts: `rankCandidates(order, candidates, rng)` saf fonksiyon. Skor ağırlıkları
   ve exploration_rate config'ten. Seed'li rng ile birim testleri + 10.000 turluk simülasyon
   testi (keşif payı %20±2, keşif adayı yoksa normal akış).
5. RunMatchingRound ve ExpireOffer job'ları; teklif Transmit kanalı `maker/{userId}` + mail.
   Kabul → kapasite rezervasyonu + production_job + file_access_grant (aynı transaction).
   İki üreticinin aynı anda kabul etmeye çalıştığı yarış testi. 5 turda `unmatched`.
6. OrderTransformer varyantları: forSeller (üretici alanı YOK, sadece "Fabrmatch üretiminde"),
   forManufacturer (alıcıdan yalnız kargo adı/adres), forAdmin (tam). Her varyant için
   "yasak alanlar yok" testleri.
7. Üretici UI: gelen teklif (geri sayım), kabul/red, dosya indir, "üretildi", takip no gir.
   Satıcı UI: sipariş zaman çizelgesi.
8. delivered → AutoConfirmDelivery (X gün, config) ve SLA uyarı job'ları; teslim sonrası 1-5 puan.
Ödeme henüz yok: `paid` durumunu test/fake provider'dan tetikle.
Kabul: tüm testler + uçtan uca functional test (sipariş → eşleşme → kabul → kargo → teslim → completed).
```

## Faz 5 — Ödeme, emanet, komisyon, anlaşmazlık

```
Görev: Faz 5 (F5-T1..T8). PRD §11.

1. payments/provider.ts arayüzü (createCheckout, handleWebhook, approveItem, refund,
   registerSubMerchant) + FakeProvider. Uygulama kodu yalnız arayüze bağımlı.
2. IyzicoProvider: resmi iyzico Node istemcisini ve güncel pazaryeri dokümanını kullan
   (alt üye işyeri, sepet kalemi bazlı subMerchantPrice, onaylı ödeme/approval, iade).
   Sandbox anahtarlarıyla. Dokümanda emin olmadığın alan adını uydurma — bana sor.
3. Alt üye işyeri kaydı: onboarding verisinden job ile; durum profilde görünür; kayıtsız
   üretici eşleştirmeye alınmaz.
4. Checkout → 3DS → callback/webhook: imza doğrula, provider_event_id ile idempotent,
   başarılıysa OrderStateMachine → paid → RunMatchingRound.
5. Ledger: LedgerService.post(transactionId, entries[]) — toplam 0 değilse exception;
   hesaplar: buyer_escrow, platform_fee, manufacturer_payable, seller_payable, refund.
   Günlük ReconcilePayments job'ı provider kayıtlarıyla karşılaştırıp farkı admin'e raporlar.
6. completed → ReleasePayout job: approveItem çağrıları + payouts + ledger.
7. Disputes: teslimden sonra X gün içinde açılır; kanıt (görsel) yükleme Drive'a; üretici yanıtı;
   admin kararı: tam iade / kısmi iade / yeniden üretim (yeni eşleştirme). Açık dispute
   payout'u bloke eder. Karar ledger'a yansır.
8. Admin asgari dispute ekranı.
Kabul: FakeProvider ile tüm akış testleri; ledger toplam-sıfır property testi; webhook tekrar testi.
Bitince engineering:code-review ile ödeme kodunu incelet.
```

## Faz 6 — Vitrin & SEO

```
Görev: Faz 6. Vitrin herkese açık, SSR.
- Listeleme: kategori, malzeme, fiyat filtresi; PostgreSQL full-text arama (tsvector + GIN).
- Ürün detay: SSR, <title>/meta/OG, JSON-LD Product, 3D önizleme (lazy), varyant seçimi → fiyat.
- Sepet (session) + misafir veya üye checkout → Faz 5 checkout.
- /sitemap.xml, robots.txt, canonical.
- Satıcının üretici ile ilişkisi vitrinde asla görünmez.
Tasarımı client-design-system-builder token'larıyla, distinctive-web-design ilkeleriyle yap.
Kabul: Lighthouse SEO ≥ 95, functional checkout testi.
```

## Faz 7 — Shopify & Etsy

```
Görev: Faz 7. Başlamadan önce D2 (satıcıdan tahsilat yöntemi) kararını bana sor.
- integrations, external_orders migration'ları; token'lar şifreli.
- Shopify: OAuth kurulum akışı, orders/create ve app/uninstalled webhook'ları, HMAC doğrulama,
  güncel Admin API sürümü (dokümandan kontrol et). SyncExternalOrder job'ı.
- Etsy Open API v3: OAuth2 PKCE, periyodik yeni receipt çekme (scheduler), rate limit'e saygı.
- SKU eşleme ekranı; eşlenmemiş kalem → satıcıya bildirim, sipariş beklemede.
- Tahsilat (D2) → paid → eşleştirme.
- Takip no/fulfillment'ı dış platforma geri yaz.
Kabul: aynı webhook iki kez → tek sipariş; HMAC geçersiz → 401; eşlenmemiş SKU akışı testi.
```

## Faz 8 — Kurumsal ihale (RFQ)

```
Görev: Faz 8.
- rfqs, rfq_bids migration'ları.
- Kurumsal satıcı RFQ açar (dosyalar, adet, malzeme, termin, son teklif tarihi).
- Davet: F4 uygunluk filtresi + keşif kotası (en az 1 yeni üretici davet edilir, varsa).
- Üretici teklifi: birim fiyat, termin, not. Alıcı teklifleri alias ile görür.
- Kazanan seçimi → teklif fiyatıyla sipariş → Faz 5 checkout → doğrudan o üreticiye production_job.
- Son tarih geçince CloseRfq job'ı.
Kabul: uçtan uca RFQ testi; kaybeden tekliflerin kapanması; kimlik gizliliği testi.
```

## Faz 9 — Admin & metrikler

```
Görev: Faz 9.
- Kullanıcı/üretici yönetimi: askıya al, tier düşür (sebep zorunlu, audit).
- Kuyruklar: unmatched siparişler (manuel atama), SLA aşımları, açık dispute'lar.
- Moderasyon: katalog ve vitrin ürünleri.
- Metrik paneli (PRD §15): aktif üretici/satıcı, tamamlanan sipariş, dispute oranı,
  yeni üretici 30-gün kohort oranı, komisyon geliri. Sorguları ayrı servis + testler.
- Config ekranı: komisyon, exploration_rate, teklif süresi, otomatik onay günü (DB'de, cache'li).
Kabul: kohort sorgusu fixture testi; tüm admin route'ları yalnız admin.
```

## Faz 10 — Global (D1 kapanınca)

```
Görev: Faz 10. D1 kararını (Stripe tüzel kişilik) PROJECT_MEMORY'den oku; kapanmadıysa DUR.
- StripeConnectProvider: aynı PaymentProvider arayüzü, Express hesap onboarding,
  güncel Connect dokümanına göre charge/transfer modeli (seçimini gerekçelendir).
- Kalem bazlı currency; fiyat tablosu TRY/USD/EUR; kur kaynağı servis + cache.
- i18n (TR/EN), e-posta şablonları dahil.
- Ülke/kargo bölgesi eşleştirme kuralı.
Kabul: provider'a göre yönlendirme testi; çok para birimli ledger testi.
```

## Faz 11 — Lansman

```
Görev: Faz 11. D4 (hosting) ve D5 (hukuki metinler) kararlarını oku.
- Dockerfile (multi-stage, Node 24), web + worker + release (migration) adımları, health check.
- Güvenlik gözden geçirme (engineering:code-review): auth, yetki, dosya, webhook, ödeme.
- Yük testi (k6): checkout ve eşleştirme turu.
- Yedek + geri yükleme provası; R2 versioning.
- Yasal sayfalar (metinleri ben vereceğim).
- engineering:deploy-checklist ile checklist, operations:runbook ile runbook.
Kabul: staging'de uçtan uca akış, geri yükleme provası başarılı.
```
