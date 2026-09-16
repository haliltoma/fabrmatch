# 07 — Karar Geçmişi ve Değişim Günlüğü

> Bu dosya, projenin **kronolojik hafızasıdır**. Her yeni oturumda (Claude Code,
> Claude sohbeti, veya sen manuel) alınan her önemli karar buraya, tarih sırasıyla,
> EN ÜSTE eklenir (en yeni en üstte). Eski girdiler ASLA silinmez veya
> düzenlenmez — sadece yenisi eklenir. Bir kararın değiştiği durumda, eski girdi
> "İPTAL EDİLDİ, bkz. [yeni tarih]" notuyla işaretlenir ama silinmez.
>
> Amaç: "neden böyle karar verdik" sorusunun cevabını 3 ay sonra bile bulabilmek.

## Şablon (yeni girdi eklerken kopyala)

```markdown
## [YYYY-AA-GG] Kısa Başlık

**Karar:** Ne karar verildi (tek cümle)
**Gerekçe:** Neden bu karar verildi
**Etkilenen dosyalar:** Hangi PRD/teknik dosyalar güncellendi
**Önceki karar (varsa):** Bundan önce ne vardı, neden değişti
```

---

## [2026-09-16] Özel tasarımdan sepete ekleme: tek seferlik ürün/teklif, STL saklanmaz, satır adedi 1

**Karar:** `/ozel-tasarim` analiz sonucu artık sepete eklenebilir. Analiz onaylandığında
Sistem A'da `create-custom-design-listing` iş akışı tek seferlik bir ürün + TRY teklif
oluşturur (`POST /store/custom-designs`, vitrin proxy'si `/api/custom-design` üzerinden);
tarayıcı `offer_id` ile satır kalemini katalog ürünleriyle AYNI sepete ekler.
Başlıca kararlar:
- **STL saklanmaz:** `design_reference = "sha256:" + design_hash` (opak string). Dosya
  saklama/presigned URL ayrı bir iş olarak ertelendi.
- **Satıcı:** `PLATFORM_SELLER_EMAIL` env'i ile çözülen onaylı platform satıcısı
  (dev: seed'in `seller@fabrmatch.dev`). Onaylı = Mercur `SellerStatus.OPEN` ("open") —
  "approved" diye bir status DEĞERİ yok.
- **Fiyat:** `cost.total_cost × CUSTOM_DESIGN_MARKUP` (env, varsayılan 1.0, 2 ondalık TRY).
  Yalnızca TRY fiyatlanır; EUR/USD teklif fiyatı yazılmaz.
- **Sepet satırı quantity=1:** gerçek adet varyant başlığında ("PLA · 2 adet") ve
  `product.metadata.print_params.quantity`'de taşınır. Sistem B siparişte quantity=1 görür
  (bilinçli sınırlama — satır bazlı miktar düzeltmesi ayrı iş).
- **Katalog gizliliği PLAN SAPMASIYLA DÜZELTİLDİ:** plan, Mercur sepet satırı ucunun ürün
  statusunu sorgulamadığını varsayıyordu; gerçekte Medusa `addToCartWorkflow` varyantın
  ürününü **PUBLISHED zorluyor** (`get-variants-and-items-with-prices`). Bu yüzden ürün
  PROPOSED değil **PUBLISHED** açılıyor ama vitrin kataloğu
  `metadata.custom_design=true` olanları listelemez (`listAllProducts` filtresi) ve
  `getProductByHandle` direkt URL erişimini 404'ler. Backend `/store/products` listesinde
  özel tasarım ürünleri GÖRÜNÜR (bu, yalnızca yayımlanmış ürünleri okuyabilen üçüncü
  taraflar için kabul edildi).
- **Handle benzersizliği:** Medusa handle'ı title'dan ürettiği için aynı isimli ikinci
  özel tasarım "already exists" alırdı; handle `custom-<hash12>-<rand8>` olarak açıkça
  verilir (SKU ile aynı random suffix).
- **Varyant ekseni:** Mercur ürün eksenini `attributes` (Mercur product attribute id +
  value_ids) üzerinden bağlar; verilmezse ürün axis'siz doğup varyant seçenek uyuşmazlığı
  verir. Adım, seed'deki "Malzeme" attribute'unu sorgulayıp bağlar; Renk verilmez
  (production_request.color=null).
- **Para birimi biçimi:** services/geometry `cost.currency`'yi Intl-uyumlu "TRY" döndürür;
  Sistem A zod şeması lower-case edip `z.literal("try")` ile doğrular.
- **Env yüklenmesi tuzuğu:** `medusa develop` src'yi hot-reload eder ama `.env`'i yeniden
  okumaz — env değişikliğinde sunucu restart edilmeli.

**Gerekçe:** 01-PRD başarı kriteri — katalog + özel tasarım aynı sepette. [[09-API-SOZLESMESI]]
DOKUNULMADI (`design_reference` zaten opak string, `print_estimate` şemada mevcuttu).
**Etkilenen dosyalar:** `apps/store/packages/api/src/lib/custom-design-listing.ts` (+unit test),
`src/workflows/steps/{resolve-platform-seller,create-custom-design-listing}.ts`,
`src/workflows/create-custom-design-listing.ts`, `src/api/store/custom-designs/{middlewares,route}.ts`,
`src/api/middlewares.ts`, `.env.template`/`.env`; `apps/storefront/src/lib/{analysis-types,mercur-types,store-data,cart-helpers}.ts`,
`src/pages/api/custom-design.ts`, `src/components/{CustomDesignForm,VariantOfferPicker}.tsx`.
**ADR etkisi:** Yok (00-PRD §3 değişmedi; §4.1 ertelenen listesinden çıkarıldı).

## [2026-09-16] Storefront müşteri oturumu: JWT (SDK localStorage varsayılanı), oturum çerezi tercih edilmedi

**Karar:** Storefront'a hesap girişi + sipariş geçmişi/takibi eklendi (`/giris`,
`/hesap`, `/hesap/siparis/[id]`). Oturum, Medusa JS SDK 2.x'in varsayılan davranışı
olan JWT + localStorage (`medusa_auth_token`) ile kurulur — ayrı bir auth-storage
modülü veya httpOnly oturum çerezi yazılmadı. Kayıt iki adımdır
(`auth/register` aktörsüz token → `store/customer` oluştur → gerçek token için
`auth/login`). Misafir sepeti giriş sonrası bağlamak için
`POST /store/carts/:id/customer` (`transferCart`) kullanılır — `sdk.store.cart.update`
şeması `customer_id` kabul etmediği için bu yol kapalıdır.
**Gerekçe:** SDK varsayılanı sıfır ek altyapıyla CORS uyumlu çalışır (Astro statik
+ node adaptöründe SSR çerezi ek mekanizma isterdi); store JWT'si uzun ömürlü
olduğundan refresh kapsam dışı bırakıldı (süre dolunca sessiz 401 → çıkış).
JWT'nin localStorage'da durmasının XSS riski MVP için bilinçli kabul edilmiştir.
**Etkilenen dosyalar:** `apps/storefront/src/lib/auth.ts`, `lib/mercur-custom.ts`,
`lib/order-status.ts`, `components/{AuthPage,AccountPage,OrderGroupDetail,AccountLink,CartPage}.tsx`,
`pages/giris.astro`, `pages/hesap.astro`, `pages/hesap/siparis/[id].astro`,
`components/Header.astro`, `styles/tokens.css`, `docs/06-PRD-TASARIM-SISTEMI.md`
(fm-badge kalıbı), `docs/01-PRD-STOREFRONT-ASTRO.md`. Sistem A backend'ine ve
[[09-API-SOZLESMESI]]'ye dokunulmadı (stock Medusa auth + Mercur'un mevcut
order-group uçları).
**ADR etkisi:** Yok.

## [2026-09-16] Anlaşmazlık çözüm süreci: escrow'a gerçek bir bekleme penceresi eklendi

**Karar:** Faz 5'te üretici ödemesi Sistem B'nin `delivered` webhook'u gelir gelmez
HEMEN deneniyordu — bu, 05-PRD'nin "ödeme, teslimat onaylanana kadar tutulsun"
hedefiyle çelişiyordu (anlaşmazlık açmak için gerçek bir pencere yoktu). Bu değişti:
(1) `payout_instruction` artık kayıt anında `received` + `release_at` (varsayılan
`now + 48 saat`, `PAYOUT_RELEASE_WINDOW_HOURS` ile ayarlanabilir) ile oluşturuluyor,
HEMEN ödenmiyor. (2) Yeni `release-due-payouts` zamanlanmış işi (15 dk) penceresi
dolan ve anlaşmazlığı olmayan talimatları otomatik serbest bırakıyor — alıcı hesabı
henüz yoktur (Faz 4'te ertelendi), bu yüzden "onay" örtük: pencere boyunca itiraz
gelmezse kabul sayılır. (3) Yeni `dispute` modeli + `open-dispute`/`resolve-dispute`
iş akışları: `POST /admin/disputes` (şimdilik admin, destek talebiyle alıcı adına)
bir anlaşmazlık açar ve varsa `received` talimatı `on_hold`a alır; `GET
/admin/disputes/:id` kanıtı AYRICA saklamadan zaten var olan
`production_request.tracking_number`/`production_photos` ve
`inbound_webhook_event` olay geçmişinden okuyup gösterir; `POST
/admin/disputes/:id/resolve` (`manufacturer`|`buyer`|`dismiss`) `on_hold` talimatı
sırasıyla serbest bırakır veya `cancelled` yapar — dispute yalnızca `open` iken
çözülebilir (idempotency korunuyor).
**Gerekçe:** Anlaşmazlık çözümünün anlamlı olması için ödemenin HENÜZ gitmemiş
olması gerekiyor — aksi halde "anlaşmazlık" sadece kayıt tutmaktan ibaret kalırdı.
Kanıtı ayrı bir tabloda TEKRAR saklamak yerine mevcut `production_request` ve
`inbound_webhook_event` kayıtlarına referans vermek, [[project-fabrmatch]] genelinde
izlenen "tek doğruluk kaynağı" ilkesiyle tutarlı (reconciliation'ın kendi defterini
ikinci kez icat etmemesiyle aynı mantık). Bekleme penceresi + otomatik serbest
bırakma, gerçek bir alıcı onay ekranı olmadan (henüz hesap sistemi yok) makul bir
ara çözüm — çoğu pazaryerinin "N gün içinde itiraz yoksa otomatik onaylanır"
davranışına denk düşüyor.
**Uçtan uca doğrulama (canlı, gerçek dev DB'ye karşı, `medusa exec` ile):**
webhook → talimat `received` + doğru `release_at` ile kaydedildi; anlaşmazlık açma
→ talimat `on_hold`; üretici lehine çözüm → `paid`; alıcı lehine çözüm → `cancelled`;
pencere geçmişe çekilip anlaşmazlıksız bırakılan bir talimat, `release-due-payouts`
job'ı ile doğru şekilde `paid` oldu; çözülmüş bir anlaşmazlığın tekrar çözülmeye
çalışılması ve bilinmeyen bir `production_request_id` için anlaşmazlık açılması
doğru şekilde reddedildi. Admin HTTP uçları (`GET/POST /admin/disputes`, `GET
/admin/disputes/:id`) gerçek admin oturumuyla `curl` üzerinden ayrıca doğrulandı.
`npx tsc --noEmit` temiz, birim testleri 19/19 (yeni: `computeReleaseAt`).
**Kapsam dışı bırakılan (bilinçli):** Alıcı hesabı/girişi olmadığı için anlaşmazlık
açma şimdilik yalnızca admin üzerinden — `POST /store/disputes` (gerçek alıcı
kimliğiyle) hesap sistemi eklenince doğal bir sonraki adım. Zaten `paid` olmuş bir
talimatın SONRADAN açılan bir anlaşmazlıkla gerçek parasal geri alınması
(Stripe transfer reversal) uygulanmadı — `settle-dispute-payout` bu durumda
(`on_hold` talimat bulunamazsa) sessizce hiçbir şey yapmıyor, manuel müdahale
admin panelinde kayıt üzerinden takip edilmeli.
**Etkilenen dosyalar:** 05-PRD-ODEME-VE-KOMISYON.md, 00-MASTER-PRD.md,
apps/store/packages/api (production-sync modülü: yeni `dispute` modeli, migrasyon;
`payout_instruction`e `release_at` + genişletilmiş `status` enum'u; payout-provider.ts
[`computeReleaseAt`]; execute-payout.ts [`attemptPayout` paylaşıldı]; yeni
open-dispute.ts/resolve-dispute.ts/release-payout.ts iş akışları ve adımları; yeni
release-due-payouts.ts job'ı; yeni admin/disputes API uçları).

## [2026-09-16] Faz 5: üretici ödemesi soyutlanmış sağlayıcı ile, uzlaştırma çift deftere dayalı

**Karar:** (1) Platform komisyonu Mercur'un global oranı üzerinden **%30** olarak
ayarlandı (satıcı %70'ini kendi marjı olarak alır; platformda kalan pay üretici
ödemesini ve platform payını karşılar). (2) Üretici ödemesi bir `PayoutProvider`
soyutlaması arkasında: `STRIPE_SECRET_KEY` tanımlı değilse (bu ortamda öyle) `manual`
sağlayıcı anında başarı simüle eder — checkout'ta `pp_system_default`'ın rolüyle
birebir aynı mantık; gerçek anahtar tanımlandığında `stripe-connect` gerçek transfer
yapar (`stripe.transfers.create`, `transfer_group` = sipariş ID, `idempotencyKey` =
talimat ID). Üreticinin Stripe hesap kimliği artık 09 sözleşmesinde
`payout_instruction.manufacturer_account` alanıyla taşınıyor — sadece bir KİMLİK,
Sistem B'de para hareketi yok. (3) Günlük uzlaştırma, Sistem A'nın yeni
`inbound_webhook_event` (gelen-kutusu) defteriyle Sistem B'nin yeni
`GET /api/v1/webhook-events` ucundan çektiği "sent" listesini `event_id` bazında
karşılaştırır; sonuç `reconciliation_report` tablosuna yazılır ve
`GET /admin/reconciliation-reports` ile görünür.
**Gerekçe:** Üretici bir Mercur satıcısı değil — Mercur'un yerleşik satıcı payout'u
üreticiye ödeme yapamaz, bu yüzden Sistem A'nın KENDİSİNİN ayrı bir transfer
tetiklemesi gerekiyordu (09'un zaten öngördüğü, sadece Faz 1'de uygulanmamış kısım).
Sağlayıcıyı soyutlamak, gerçek bir Stripe hesabı olmadan (bu oturumda yok) sistemin
uçtan uca çalışır ve test edilebilir kalmasını sağlıyor — checkout'un ödeme sağlayıcı
soyutlamasıyla aynı ilke. Uzlaştırmayı "Sistem B `delivered` diyor ama Sistem A'da
kaydı yok" olarak tanımlamak (Sistem B'nin de pes ettiği `failed` olayları hariç
tutarak) yanlış pozitif üretmiyor.
**Uçtan uca doğrulama (canlı, üç gerçek servis üzerinden, iki paralel sipariş):**
gerçek mağaza siparişi → Sistem A→B dispatch → eşleştirme (kuyruk işçisiyle) →
üretici panelinden gerçek kabul/üret/kalite-kontrol/kargo/teslim tıklamaları →
imzalı webhook → `payout_instruction` `paid` (sağlayıcı `manual`, gerçek referans) →
uzlaştırma "10/10 eşleşti" → bir olay kasıtlı silinip yeniden çalıştırılınca
"1 event(s) ... never received" doğru tespit edildi → rapor admin API'sinde görünür.
Ayrıca kalite-kontrol adımında fotoğraf boş/geçersizken sunucu hatası (500) yerine
dostça hata mesajı döndürecek şekilde küçük bir hata düzeltildi.
**Kapsam dışı bırakılan (bilinçli):** Üretici Stripe Connect onboarding akışı (Express
hesabı oluşturma/bağlama UI'ı) — şu an `stripe_account_id` sadece veritabanı sütunu,
gerçek onboarding Faz 6+ işi. Anlaşmazlık çözüm süreci (05-PRD'nin "kanıta dayalı"
anlaşmazlık akışı) bu fazda ele alınmadı.
**Etkilenen dosyalar:** 09-API-SOZLESMESI.md, apps/manufacturer-network (manufacturers
tablosu, contract/types.ts, production_lifecycle.ts, webhook_events_api_controller.ts),
apps/store/packages/api (production-sync modülü, payout-provider.ts, reconciliation.ts,
execute-payout.ts, record-inbound-webhook-event.ts, daily-reconciliation.ts,
admin/reconciliation-reports)

## [2026-09-16] Faz 4: Astro storefront — Node adaptörü, tek bölge (TRY), geometri servisi TRY'ye çevrildi

**Karar:** (1) `apps/storefront` Astro + React ile kuruldu; dağıtım hedefi 01 PRD'de
Cloudflare Workers olsa da yerel geliştirme/derleme için `@astrojs/node` adaptörü
kullanılıyor — adaptör değişimi sadece `astro.config.mjs`'te tek satır, iş mantığı
etkilenmiyor. (2) MVP: tek bölge (TR/TRY), bölge seçici yok; kategori/ürün sayfaları
build-time statik, sepet/checkout tamamen istemci tarafında Mercur Store API'sine
doğrudan (SDK ile) konuşuyor — sunucu tarafı render gerekmiyor. (3) Özel tasarım
sayfası, geometri servisine (`services/geometry`) sadece sunucu tarafında (Astro API
route, `prerender=false`) erişiyor — servis anahtarı tarayıcıya hiç gitmiyor. (4)
Geometri servisinin varsayılan para birimi USD'den TRY'ye, malzeme kg fiyatları ve
saatlik makine ücreti gerçekçi TRY değerlerine çevrildi (Fabrmatch'in geri kalanı TRY).
**Gerekçe:** Cloudflare adaptörünün Workers çalışma zamanı emülasyonu yerel test
akışına gereksiz risk/karmaşıklık katıyordu; Node adaptörü aynı statik+sınırlı-sunucu
mimariyi (output:'static' + `prerender=false`) destekliyor. Mercur'un Store API'si
zaten tarayıcıdan doğrudan çağrılmak üzere tasarlanmış (publishable key bunun için
var) — sepet/checkout'u sunucusuz tutmak PRD'nin statik/edge hedefiyle daha uyumlu.
Geometri servisinin USD göstermesi, TRY üzerinde çalışan platformun geri kalanıyla
tutarsızdı; müşteri karışıklığı yaratırdı.
**Kapsam dışı bırakılan (bilinçli):** Özel tasarım sayfası anlık fiyat tahmini
veriyor ama "sepete ekle" bağlı değil — bunun için Sistem A'da bir seferlik ürün/teklif
sağlama iş akışı (workflow) gerekiyor, ayrı bir iş kalemi olarak bırakıldı. Sipariş
takibi hesap girişi olmadan sadece checkout sonrası onay sayfasıyla sınırlı (Mercur'un
`/store/order-groups` ucu müşteri girişi zorunlu kılıyor).
**Etkilenen dosyalar:** apps/storefront (yeni), services/geometry/src/fabrmatch_geometry/{config,materials}.py

## [2026-09-16] Sistem B zamanlaması: `@boringnode/queue` cron desteği

**Karar:** Vadesi gelen webhook tekrarları ve eşleşmemiş talep taramaları, ayrı bir cron
paketi yerine `@adonisjs/queue`'nun temelindeki `@boringnode/queue`'nun `Job.schedule({})
.id(...).cron(...).timezone('UTC').run()` API'siyle zamanlandı (`start/scheduler.ts`,
sadece `node ace serve` altında yüklenir). Kararlı `.id()` sayesinde yeniden başlatmalar
kayıt çoğaltmıyor; kuyruk sürücüsü zaten Redis olduğu için ek bağımlılık gerekmedi.
**Gerekçe:** `node-cron` gibi ayrı bir paket, kuyruğun kendi zamanlayıcısıyla aynı işi
tekrar eder ve iki ayrı "şimdi ne zaman" kaynağı yaratır. Faz 3'ü kapatan bu iki iş:
`SweepDueWebhooks` (her dk, 09'daki 1/5/30/120 dk tekrar denemesini tetikler) ve
`SweepMatching` (her 2 dk — yanıtsız teklifi süresi dolmuş sayıp rakibini bir sonraki
denemede hariç tutarak yeniden eşleştirir, önceden uygun üretici bulunamayan talepleri
tekrar dener).
**Etkilenen dosyalar:** apps/manufacturer-network (sweep.ts, sweep_due_webhooks.ts,
sweep_matching.ts, scheduler.ts), 03-PRD-URETICI-AGI.md

## [2026-09-16] Sistem B: webhook tekrarları defterde, üretici onayı komutla

**Karar:** (1) Sistem A'ya giden webhook'ların 1dk/5dk/30dk/2sa tekrar denemeleri kuyruk
backoff'uyla değil, `outbound_webhook_events.next_attempt_at` ile yönetilir; 4xx yanıtlar
(408/429 hariç) tekrar denenmeden `failed` olur; aynı talebin olayları sırayla teslim edilir.
(2) Admin arayüzü gelene kadar üretici başvuruları `node ace manufacturer:activate <email>`
ile onaylanır; yeni üretici `pending` başlar ve eşleştirmeye katılmaz.
**Gerekçe:** (1) Defter zaten 09'daki çift kayıt ve günlük uzlaştırma için tutuluyor; tekrar
bilgisini de orada tutmak "gönderildi ama alınmadı" durumunu sorgulanabilir kılıyor, sync
test adaptörü de backoff süresince uyumuyor. Sıralı teslim, Sistem A'nın "durum sadece ileri
gider" kuralıyla birleşince geç gelen fotoğraf/takip bilgisinin kaybolmasını önlüyor.
(2) Onaysız üreticiye iş gitmesi kalite riskine yol açar (04); admin paneli Faz 5 sonrası.
**Etkilenen dosyalar:** apps/manufacturer-network (webhook_delivery.ts, commands/manufacturer_activate.ts)

## [2026-09-15] Tasarım sistemine `danger` renk grubu eklendi

**Karar:** 06'ya yalnızca form doğrulama hatası ve geri alınamaz işlem uyarısı metni için
`--fm-danger-bg: #FCEBEB` / `--fm-danger-text: #A32D2D` eklendi.
**Gerekçe:** Üretici paneli formlarında hatalı alanı göstermek zorunlu; 06'daki dört grup
bunu karşılamıyordu (honey = B2B anlamı taşır, hata için kullanılırsa renk-anlam
eşleşmesi bozulur). Starter kit'in parlak kırmızısı (#fb2c36) "neon/glow yok" kuralına
aykırıydı; seçilen tonlar mat ve sage/honey ile aynı açıklık seviyesinde. 06'nın "önce
bu dosyaya ekle, sonra kullan" kuralına uygun olarak kullanılmadan önce eklendi.
**Etkilenen dosyalar:** 06-PRD-TASARIM-SISTEMI.md, apps/manufacturer-network/inertia/css/app.css

## [2026-09-15] Akış 1'e opsiyonel `print_estimate` eklendi

**Karar:** Sistem A, üretim talebinde ürünün birim başına baskı metriklerini
(`slicer`, `part_weight_g`, `support_weight_g`, `print_time_minutes`) gönderir; alan null olabilir.
**Gerekçe:** Sistem B üretici ödemesini (gram × gram fiyatı + süre × saatlik ücret) ve
kapasite yükünü bu metriklerle hesaplıyor. Katalog ürünlerinde metrik Sistem A'da zaten
var (`product.metadata.print_profile`); ham STL değil, sadece sayılar olduğu için 09'un
"ham dosya paylaşılmaz" kuralı korunuyor. Özel yüklemelerde (Faz 4) alan null gelir ve
Sistem B geometri servisinden kendisi hesaplar.
**Etkilenen dosyalar:** 09-API-SOZLESMESI.md, apps/store (fabrmatch-contract.ts,
production_request.print_estimate), apps/manufacturer-network

## [2026-09-15] API sözleşmesi v1 netleştirildi (09)

**Karar:** Akış 1 ve Akış 2 şemaları uygulanabilir hale getirildi: talep sipariş
KALEMİ başına (`sistem_a_line_item_ref`), A→B isteklerinde `Authorization: Bearer` +
`Idempotency-Key`, webhook'ta `event_id`, `occurred_at`, zaman damgalı HMAC
(`X-Fabrmatch-Timestamp` + `v1=` imza, ±300 sn) ve düz `manufacturer_payout_amount`
yerine `payout_instruction { instruction_id, amount, currency_code }` nesnesi.
**Gerekçe:** Orijinal şemada idempotency anahtarı ve para birimi alanı yoktu (09'un kendi
"çift ödeme koruması" maddesi uygulanamıyordu); bir siparişte farklı tasarımlı birden
çok kalem olabileceği için sipariş başına tek talep yetmiyordu; imzasız zaman damgası
tekrar oynatma (replay) saldırısına açıktı. Her iki sistem de henüz yazılırken
değiştirildiği için `/v2/` gerekmedi.
**Etkilenen dosyalar:** 09-API-SOZLESMESI.md, apps/store/packages/api/src/lib/fabrmatch-contract.ts,
Sistem B (Faz 3'te aynı şemayla yazılacak)
**Önceki karar:** 09'un ilk taslağı (sipariş başına talep, `manufacturer_payout_amount`).

## [2026-09-15] Sistem B kuyruğu: @rlanz/bull-queue → @adonisjs/queue

**Karar:** Üretici ağındaki arka plan işleri (eşleştirme, webhook tekrar denemeleri,
uzlaştırma) resmi `@adonisjs/queue` paketi + Redis driver ile yapılacak.
**Gerekçe:** `@rlanz/bull-queue` 3.1.0 sadece `@adonisjs/core ^6` destekliyor ve 2024'ten
beri güncellenmedi; proje AdonisJS v7 kullanıyor. `@adonisjs/queue` v7 için resmi paket;
retry/backoff, gecikmeli dispatch (`.in('5m')`) ve cron zamanlayıcı içeriyor — 09'daki
1dk/5dk/30dk/2sa tekrar deneme ve günlük uzlaştırma buna doğrudan oturuyor.
**Etkilenen dosyalar:** 03-PRD-URETICI-AGI.md (teknik yaklaşım)
**Önceki karar:** `@rlanz/bull-queue` (03 PRD).

## [2026-09-15] Geometri servisi: mesh tabanlı tahminci + Embree

**Karar:** FastAPI servisi ilk sürümde PrusaSlicer/CuraEngine CLI yerine mesh tabanlı
tahminci (`fabrmatch-mesh-estimator/1.0`) kullanıyor; duvar kalınlığı ölçümü Embree ışın
motoru (`embreex`) ile yapılıyor.
**Gerekçe:** Yerelde slicer kurulu değil; tahminci ağırlık/destek/süre/üretilebilirlik
verisini 06'daki malzeme çubuğu için yeterli doğrulukla veriyor. Embree olmadan 327k
yüzlü model 64 sn sürüyordu (03 hedefi 30 sn); Embree ile 0,6 sn, 1,3M yüz 2,8 sn.
Gerçek slicer ileride aynı `MaterialEstimate` şemasını dolduran bir adaptör olarak
eklenebilir (`slicer` alanı hangi motorun kullanıldığını söyler).
**Etkilenen dosyalar:** services/geometry/*, 03-PRD-URETICI-AGI.md

## [2026-09-15] Mercur kurulumu: npm + legacy-peer-deps

**Karar:** `apps/store` npm ile kuruldu, `.npmrc`'de `legacy-peer-deps=true`, kök
devDependency olarak `ajv@^8` eklendi.
**Gerekçe:** Mercur şablonu bun için hazırlanmış; şablondaki `react-hook-form@7.49.1` ile
`@hookform/resolvers@5.4.0` peer çakışması npm'de kurulumu durduruyor (bun peer'ları
zorlamaz). legacy-peer-deps bun davranışını taklit ediyor ama peer olarak gelen
`ajv@8`'i atladığı için migration `ajv/dist/core` hatası verdi — açıkça eklendi.
**Etkilenen dosyalar:** apps/store/.npmrc, apps/store/package.json

## [2026-09-15] Mercur sürümü: 2.0 → 2.3.4 (aynı 2.x mimarisi)

**Karar:** Sistem A, Mercur'un güncel kararlı sürümü `@mercurjs/core` 2.3.4 ile kurulacak.
**Gerekçe:** PRD "Mercur 2.0" diyordu; npm'de güncel sürüm 2.3.4 (peer: Medusa ≥ 2.20.1,
güncel Medusa 2.21.0). 2.x aynı blok tabanlı, kod-sahipliği modelini koruyor — "Mercur
Geri Alındı" kararının özü değişmiyor, sadece yama/ara sürüm güncellemesi.
**Etkilenen dosyalar:** 00-MASTER-PRD.md (ADR tablosu), gunlukler/2026-09-15.md
**Önceki karar:** "Mercur 2.0" (sürüm numarası, karar değil).

## [2026-09-15] Depo düzeni ve hafıza altyapısı kuruldu

**Karar:** PRD seti `docs/` altına taşındı ve Obsidian vault olarak kullanılacak; kod
monorepo düzeninde: `apps/store` (Sistem A), `apps/storefront` (Astro),
`apps/manufacturer-network` (Sistem B), `services/geometry` (FastAPI). Yerel altyapı:
Postgres Homebrew servisi (`fabrmatch_store`, `fabrmatch_network`), Redis Docker'da.
**Gerekçe:** [[08-OBSIDIAN-KULLANIM-REHBERI]]'ndeki akış (docs/ + kök CLAUDE.md +
graphify). İki sistemin kod paylaşmaması [[09-API-SOZLESMESI]] gereği; ayrı klasör ve
ayrı veritabanı bu sınırı fiziksel olarak da korur.
**Etkilenen dosyalar:** CLAUDE.md (yeni), 06-PRD-TASARIM-SISTEMI.md (eski `14-FAZ14`
yolu düzeltildi), 03-PRD-URETICI-AGI.md (sözleşme referansı 09'a çevrildi),
gunlukler/2026-09-15.md (yeni)

## [2026-09-15] Mercur Geri Alındı (2.0 sürümüyle)

**Karar:** Mercur, Medusa.js v2 üzerinde çok satıcılı ticaret çekirdeği olarak
kullanılacak (bir önceki kararda "bırakalım" denmişti, bu iptal edildi).
**Gerekçe:** Kullanıcı "çok sayıda bağımsız satıcı, sıkı izolasyon şart" dedi.
Araştırma gösterdi ki Medusa çekirdeğinde satıcı/komisyon/payout YOK, Mercur bunu
çözüyor. Mercur 2.0 (Mayıs 2026) kodu doğrudan projeye kopyalıyor, kara kutu değil.
**Etkilenen dosyalar:** 00-MASTER-PRD.md (ADR tablosu), 02-PRD-MARKETPLACE-CORE.md
**Önceki karar:** Aynı gün içinde daha önce "Mercur'u bırakalım, çıplak Medusa
kullanalım" denmişti — bu karar birkaç saat içinde tersine çevrildi.

## [2026-09-15] Storefront Framework: Next.js → Astro.js

**Karar:** Sistem A'nın (Store) müşteri tarafı storefront'u Astro.js ile yazılacak.
**Gerekçe:** Hız ve SEO önceliği; Astro'nun islands architecture'ı statik ürün
sayfaları + hafif interaktif sepet/checkout kombinasyonunu Next.js'ten daha
performanslı sağlıyor. Aktif, olgun açık kaynak starter'ları mevcut
(`astro-medusa-starter`).
**Etkilenen dosyalar:** sistem-a-magaza/06-TEKNOLOJI-STACK.md

## [2026-09-15] Tek Sistem Denemesi İptal Edildi

**Karar:** Kısa süreliğine denenen "tek sistem, sadece B2B toptancı, Designer/
multi-store yok" konsolidasyonu terk edildi, iki sistemli yapıya geri dönüldü.
**Gerekçe:** Kullanıcı "Printify gibi esnek yapı" istediğini netleştirdi — bu,
Designer+Seller+Manufacturer zincirini ve B2C vitrinini gerektiriyor, dar B2B
modeli bu ihtiyacı karşılamıyordu.

## [2026-09-15] İki Sistem Mimarisine Geçiş

**Karar:** Proje, Manufacturer'ı Medusa'nın "Stock Location"ına zorla bağlamak
yerine, tamamen ayrı iki sisteme (Sistem A: Store/Medusa, Sistem B: Üretici Ağı/
AdonisJS) bölündü.
**Gerekçe:** Üretici ağı/eşleştirme/ihale bir ticaret problemi değil, operasyon/
eşleştirme problemi — Medusa'nın ürün/sepet varsayımlarına uymuyor.

## [2026-09-15] Marka Adı: Printloop → Fabrmatch

**Karar:** Marka adı Fabrmatch olarak değiştirildi.
**Gerekçe:** "Printloop" araştırmasında printloop.io (kavramsal olarak çok yakın,
aktif bir platform) ve tescilli "PrintLoop Technologies LLC" bulundu — çakışma riski.
**Not:** Fabrmatch için de nihai tescilden önce resmi tarama (WHOIS+TÜRKPATENT/
USPTO/EUIPO) hâlâ yapılmalı, sadece ön elemeden geçti.

---

> **Yeni girdi ekleme talimatı:** AI kodlama asistanına her önemli mimari/ürün
> kararı verdirdiğinde, ona bu dosyayı yukarıdaki şablonla güncellemesini de
> söyle — bu otomatik olmaz, açıkça istenmesi gerekir.
