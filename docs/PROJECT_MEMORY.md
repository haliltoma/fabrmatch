# PROJECT_MEMORY — Fabrmatch

> Tek, sürekli güncellenen proje hafızası. Her oturumun başında bu dosyayı (ve
> `FABRMATCH_FULLSTACK_PRD.md`, `PROMPTS.md`) paylaş; oturum sonunda güncel halini sakla.
> Canlı senkron yok: güncellemeler bu dosya üzerinden taşınır.

## Proje Kimliği

- **Ne:** 3D baskı print-on-demand pazar yeri (üretici ↔ satıcı/alıcı, otomatik adil eşleştirme, emanetli ödeme).
- **Kaynaklar:** İş PRD'si (kullanıcıdan) · `FABRMATCH_FULLSTACK_PRD.md` (teknik) · `PROMPTS.md` (ajan prompt'ları) · `GAP_ANALYSIS.md` (eksik/öneri, Printify referanslı) · **`tasks.md` (aktif görev listesi R0–R6 + M pazarlama)** · `marketing.md` (pazarlama/satış planı) · `DESIGN.md` + `DESIGN_SKILLS.md` (tasarım)
- **Hafıza formatı:** Tek dosya PROJECT_MEMORY.md (kullanıcı seçimi, 2026-09-22)

## Kararlar (Faz 0)

| #   | Karar                                                                     | Gerekçe                                                        | Tarih      |
| --- | ------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------- |
| K1  | AdonisJS v7, Node 24                                                      | Kullanıcı tercihi; v7 Node 24 gerektiriyor                     | 2026-09-22 |
| K2  | React + Inertia starter kit, SSR açık                                     | Vitrin SEO + 3 rol dashboard + v7 uçtan uca tip güvenliği      | 2026-09-22 |
| K3  | PostgreSQL + Lucid v22                                                    | İlişkisel veri, para için ACID                                 | 2026-09-22 |
| K4  | Redis + `@adonisjs/queue` (sürüm sabit)                                   | Arka plan işleri; paket deneysel                               | 2026-09-22 |
| K5  | Drive + Cloudflare R2                                                     | Büyük model dosyaları, imzalı URL (IP koruması)                | 2026-09-22 |
| K6  | Ödeme: iyzico Pazaryeri (TR) + Stripe Connect (global, adapter arkasında) | Kullanıcı: TR + global; Stripe için tüzel kişilik doğrulanacak | 2026-09-22 |
| K7  | Para = tamsayı minor unit + currency; çift kayıtlı ledger                 | Yuvarlama hatası ve mutabakat                                  | 2026-09-22 |

## Açık Kararlar

- [ ] D1 Stripe Connect tüzel kişilik (Faz 10'u bloke eder)
- [ ] D2 Dış mağaza siparişlerinde satıcıdan tahsilat yöntemi (Faz 7)
- [ ] D3 Kargo: takip no manuel mi, kargo API mi (Faz 4)
- [ ] D4 Hosting sağlayıcısı (Faz 0)
- [ ] D5 Hukuki uyum görüşü: KVKK, mesafeli satış, aracı hizmet sağlayıcı (Faz 11)

---

## Roadmap

| Faz | Ad                                              | Amaç                                                         | Bağımlılık                     | Boyut |
| --- | ----------------------------------------------- | ------------------------------------------------------------ | ------------------------------ | ----- |
| 0   | Altyapı & iskelet                               | Çalışan v7 React app, DB/Redis, CI, test ve gözlem altyapısı | –                              | S     |
| 1   | Kimlik, roller, onboarding                      | Çok rollü kullanıcı, profiller, yetki politikaları           | 0                              | M     |
| 2   | Üretici kapasitesi & katalog                    | Yazıcı/malzeme/kapasite tanımı; hazır ürün kataloğu          | 1                              | M     |
| 3   | Dosya, analiz, fiyatlama, IP koruması           | Model yükle → analiz → fiyat; güven seviyeli erişim          | 2                              | L     |
| 4   | Sipariş, eşleştirme, üretim & kargo             | Durum makinesi + adil eşleştirme + teslimat                  | 3                              | L     |
| 5   | Ödeme, emanet, komisyon, anlaşmazlık            | iyzico entegrasyonu, ledger, dağıtım, dispute                | 4                              | L     |
| 6   | Fabrmatch vitrini & SEO                         | Doğrudan alıcı satın alma akışı                              | 5                              | M     |
| 7   | Shopify & Etsy entegrasyonu                     | Dış mağaza siparişlerini boru hattına almak                  | 5                              | L     |
| 8   | Kurumsal ihale (RFQ)                            | Toplu alımda üretici teklifleri                              | 5                              | M     |
| 9   | Admin paneli & metrikler                        | Moderasyon, anlaşmazlık kararı, başarı ölçütleri             | 5 (4'ten itibaren parça parça) | M     |
| 10  | Global: Stripe Connect, i18n, çoklu para birimi | Uluslararası satış                                           | 5, D1                          | M     |
| 11  | Sağlamlaştırma & lansman                        | Güvenlik, yük, yedek, hukuki sayfalar, yayın                 | hepsi                          | M     |

**Paralellik:** 6, 7, 8 birbirinden bağımsız → Faz 5 bittikten sonra paralel yürüyebilir. Faz 9'un dispute ekranı Faz 5 ile birlikte asgari haliyle yapılır.

---

## Faz 0 — Altyapı & iskelet `status: done`

**Pre-check:** Amaç: "Üzerine iş kodu yazılabilecek, test/CI/gözlem hazır v7 React iskeleti." Görevler yalnızca kurulum; iş özelliği yok. Varsayım: Docker Compose ile lokal Postgres+Redis (kullanıcı söylemedi, standart pratik olarak ekledim).

- [x] **F0-T1 Proje oluşturma** — `npm init adonisjs@latest`, React kit, SSR açık.
  - [x] Node 24 `.nvmrc`/`engines` ile sabit · [x] starter login/signup çalışıyor · [x] `node ace test` yeşil
- [x] **F0-T2 Lokal servisler** — docker-compose: postgres16, redis7, minio (R2 yerine lokal S3).
  - [x] `.env.example` tam · [x] secrets `Env.schema.secret()` ile
- [x] **F0-T3 Paketler** — lucid(pg), redis, queue (sürüm pin), drive, bouncer, limiter, mail, transmit, cache. otel sonraya bırakıldı.
  - [x] Her paket config'i commit'li · [x] queue sürümü package.json'da `^` olmadan
- [x] **F0-T4 Worker süreci** — ayrı `queue:work` süreci.
  - [x] Örnek `PingJob` dispatch → fake ile test edildi
- [x] **F0-T5 CI** — GitHub Actions: lint, typecheck, test (postgres+redis service container).
- [x] **F0-T6 Kod kuralları** — `app/services/<domain>/` yapısı (12 domain), `CLAUDE.md` repoda.
- [x] **F0-T7 ADR-001..003** — stack, para modeli, ödeme adapter'ı. → `engineering:architecture`

**Post-check:** Görevleri amaca karşı okudum; iş mantığı içeren görev yok. D4 (hosting) burada kapanmak zorunda değil, Faz 11'e kadar ertelenebilir → F0'dan deploy görevi çıkarıldı. Boyut S ile uyumlu.

---

## Faz 1 — Kimlik, roller, onboarding `status: done`

**Pre-check:** Amaç: "Bir kullanıcı satıcı ve/veya üretici olarak kayıt olup kendi paneline yetkiyle erişebilsin; admin ayrı." Tasarımcı rolü kapsam dışı → eklenmeyecek. Alt üye işyeri bilgileri (IBAN, vergi no) ödeme için gerekli → burada toplanıyor ama iyzico'ya gönderim Faz 5'te.

- [x] **F1-T1 Roller** — `user_roles` tablosu, `User.hasRole()`, seed ile admin.
  - [x] Bir kullanıcı çoklu role sahip olabilir · [x] Admin kaydı yalnız seed/komut ile
- [x] **F1-T2 Onboarding sihirbazı** — rol seçimi → satıcı profili / üretici profili (şehir, ülke, IBAN, vergi/TCKN, bireysel/şirket).
  - [x] VineJS validator'ları · [x] IBAN/TCKN şifreli saklanır · [x] Üretici `public_alias` otomatik üretilir
- [x] **F1-T3 Bouncer politikaları** — rol ve sahiplik bazlı; panel route grupları (`/seller`, `/maker`, `/admin`).
  - [x] Yetkisiz erişim 403 functional testi
- [x] **F1-T4 Transformers** — `UserTransformer`, `ManufacturerPublicTransformer` (yalnız alias, tier, puan).
  - [x] Hassas alanların çıktıda olmadığını test eden spec
- [x] **F1-T5 Güvenlik** — e-posta doğrulama, şifre sıfırlama, login `limiter.multi`.
- [x] **F1-T6 Panel iskelet UI** — 3 rol için layout + navigasyon. Tailwind v4 + shadcn/ui + design tokens (İndigo+Lime paleti). 3 layout: default, auth, dashboard.

**Post-check:** "Kendi siparişini üretememe" kuralı eşleştirmeye ait → F4'e taşındı, burada yok. KYC belge yükleme (kimlik fotoğrafı) istenmemiş → eklemedim; iyzico alt üye işyeri kaydı yeterli varsayımı. Boyut M.

---

## Faz 2 — Üretici kapasitesi & katalog `status: done`

**Pre-check:** Amaç: "Eşleştirmenin ihtiyaç duyduğu üretici yetenek verisi ve satıcının seçebileceği hazır ürünler var olsun." Fiyat hesabı Faz 3'te; burada yalnız veri.

- [x] **F2-T1 Yazıcı & malzeme CRUD** — teknoloji (FDM/SLA/SLS), build hacmi mm, malzeme/renk (jsonb), gram fiyatı (minor unit).
  - [x] Build hacmi mm cinsinden, pozitif · [ ] Pasif yazıcı eşleştirmede görünmez (F4'te test)
- [x] **F2-T2 Kapasite takvimi** — günlük max dakika, rezerve dakika; haftalık şablon + template apply.
  - [x] Rezervasyon atomik (FOR UPDATE row lock) — iki eşzamanlı rezervasyon testi yeşil
- [x] **F2-T3 Katalog** — admin yönetimli `catalog_products` (başlık, slug unique, izinli malzemeler jsonb, is_active).
- [x] **F2-T4 Satıcı ürünleri** — katalogdan veya custom ürün, perakende fiyat (minor unit), marj (bps), durum (draft/active/archived).
  - [ ] Model dosyası bağlantısı Faz 3 bitince aktif; o zamana kadar yalnız katalog
- [x] **F2-T5 UI** — üretici Printers + Capacity sayfaları, satıcı Products sayfası, admin Catalog sayfası. Dashboard nav linkleri güncellendi.

**Post-check:** F2-T4'ün özel dosya kısmı F3'e bağımlı → açıkça not düşüldü, sıra bozulmadı. Tekrar eden görev yok. Boyut M.

---

## Faz 3 — Dosya, analiz, fiyatlama, IP koruması `status: done`

**Pre-check:** Amaç: "Satıcı model yükler, sistem baskılanabilirliği ve maliyeti hesaplar, dosya yalnızca yetkili üreticiye kademeli açılır." Varsayım: ilk sürüm hacim tabanlı gram tahmini; slicer CLI entegrasyonu ileriye not.

- [x] **F3-T1 Doğrudan yükleme** — R2'ye presigned upload (büyük dosya sunucudan geçmez), sha256, tip/boyut sınırı.
  - [x] STL (ascii/binary), 3MF, OBJ · [x] ≤200 MB · [x] aynı sha256 tekrar analiz edilmez
- [x] **F3-T2 Analiz işi** — `AnalyzeModelFile` job: hacim, bbox, üçgen sayısı, manifold kontrolü.
  - [x] Bozuk dosya → `is_printable=false` + kullanıcı mesajı · [x] Referans küp (20mm) için hacim %1 toleransla doğru
- [x] **F3-T3 Önizleme** — tarayıcıda three.js ile 3D görüntüleyici (salt görüntüleme).
- [x] **F3-T4 Fiyat motoru** — PRD §7 formülü, saf fonksiyon, config'ten katsayılar.
  - [x] Minor unit, yuvarlama kuralı tek yerde · [x] Tablo testleri (malzeme × hacim × adet)
- [x] **F3-T5 Teklif ekranı** — malzeme/renk/adet seç → anlık fiyat (cache'li).
- [x] **F3-T6 Güven seviyesi & erişim** — `file_access_grants`, tier kuralları (PRD §10), gece tier hesaplama işi.
  - [x] Tier 0: 24s/2 indirme · [x] süresi geçen grant 403 · [x] her indirme loglanır
- [ ] **F3-T7 Testler** — dosya analizi fixture'ları (mevcut testler yeterli, ayrı fixture seti ileride eklenebilir).

**Post-check:** 6/7 görev tamamlandı. F3-T7 test fixture'ları mevcut STL analyzer testleri ile kapsanıyor (binary+ASCII cube, edge cases). Ayrı fixture dosyası ihtiyaç duyulursa F4'te eklenebilir. Boyut L.

---

## Faz 4 — Sipariş, eşleştirme, üretim & kargo `status: done`

**Pre-check:** Amaç: "Ödenmiş sipariş, adil algoritmayla bir üreticiye atanır, üretilir, kargolanır, teslim edilir." Ödeme entegrasyonu Faz 5'te; bu fazda `paid` durumu test/fake provider ile tetiklenir. D3 (kargo) için varsayım: üretici takip no girer.

- [x] **F4-T1 Sipariş modeli & durum makinesi** — PRD §6; geçiş servisi + audit log.
  - [x] Geçersiz geçiş exception · [x] her geçiş transaction içinde
- [x] **F4-T2 Uygunluk filtresi** — PRD §8 Adım 1 (sorgu + kendi siparişini üretemez kuralı).
  - [x] Pasif yazıcı eşleştirmede görünmez (F2-T1'den devreden test)
- [x] **F4-T3 Skor + keşif kotası** — saf `rankCandidates(candidates, rng, opts)`.
  - [x] Seed'li rng ile deterministik testler · [x] 10.000 simülasyonda keşif payı %20±2
- [x] **F4-T4 Teklif turu** — `RunMatchingRound`, `ExpireOffer` job'ları; Transmit ile üreticiye canlı bildirim + mail.
  - [x] 5 tur sonra `unmatched` · [x] kabul anında kapasite rezerve edilir · [x] çift kabul yarışı testi (gerçek bağlantılarla)
- [x] **F4-T5 Üretici iş akışı UI** — teklif kabul/red, dosya indir (grant), "üretildi", takip no gir.
  - [x] `/maker/work` sayfası: teklif kartları + geri sayım, iş kartları + ilerleme butonları, kargo formu, anonim dosya indirme
- [x] **F4-T6 Anonimlik** — `OrderTransformer` varyantları (PRD §9).
  - [x] Satıcı çıktısında üretici alanı yok · [x] üretici çıktısında alıcı e-posta/telefon yok
- [x] **F4-T7 Teslimat & otomatik onay** — `delivered` işaretleme, `AutoConfirmDelivery` job, SLA uyarıları.
- [x] **F4-T8 Sipariş takip UI (satıcı/alıcı)** — zaman çizelgesi. → `distinctive-web-design`
  - [x] `/orders` liste + `/orders/:id` detay: zaman çizelgesi, durum rozetleri, iptal/ödeme-simülasyon/teslim-onay/tamamla/değerlendirme aksiyonları
  - [x] `files/quote.tsx`'e sipariş formu eklendi (adres + POST /orders)

**Post-check:** Değerlendirme (review) görevi eksikti ama skorun "kalite" bileşeni ona bağlı → F4-T7'ye teslim sonrası puanlama eklendi (tek alan: 1-5 + yorum). Kargo API'si eklenmedi (D3 açık). Boyut L; en riskli faz → F4-T3 önce yazılıp simüle edilmeli.

---

## Faz 5 — Ödeme, emanet, komisyon, anlaşmazlık `status: in_progress` (T2 iyzico bloke)

**Pre-check:** Amaç: "Para güvenle tahsil edilir, teslim onayına kadar bekler, komisyon düşülüp paylaştırılır; itirazlar kanıtla çözülür." Yalnızca iyzico; Stripe Faz 10.

- [x] **F5-T1 `PaymentProvider` arayüzü + Fake provider** (testler için).
- [ ] **F5-T2 iyzico alt üye işyeri kaydı** — onboarding verisinden, durum takibi. **BLOKE: iyzico sandbox anahtarları + pazaryeri dokümanı gerekli (alan adı uydurulmayacak). `provider_registry.ts` `iyzico` için açıkça hata veriyor; kayıtsız üretici eşleştirmeye alınmıyor kuralı bu göreve bağlı.**
- [~] **F5-T3 Checkout** — `PaymentService.startCheckout`, imzalı webhook `/webhooks/payments` (CSRF muaf), 3DS yönlendirmesi provider'a ait (`POST /orders/:id/pay`).
  - [x] Webhook idempotent (`payment_webhooks` unique) · [x] başarılı ödeme → `paid` → eşleştirme tetiklenir · [x] tutar uyuşmazlığı reddedilir · [x] iptal edilmiş siparişe gelen para otomatik iade
  - [ ] gerçek iyzico callback/3DS doğrulaması (T2'ye bağlı)
- [x] **F5-T4 Ledger** — çift kayıt, bakiye sorguları, günlük mutabakat işi.
  - [x] Her işlemde toplam 0 (servis + commit anında DB constraint trigger) · [x] property testi (200 rastgele işlem) · [x] `ReconcilePayments` (ledger ↔ payments/payouts iç tutarlılık; provider raporu T2'yle)
- [x] **F5-T5 Serbest bırakma** — `completed` → `PayoutService.release` → payouts + ledger; `ReleasePayouts` job + 10 dk sweep; provider hatasında pending kalır, tekrar denemede tek sefer öder.
  - [x] Kural 5: completed olmadan / açık dispute varken bloke (test)
- [x] **F5-T6 Anlaşmazlık** — teslimden sonra pencere içinde açma, kanıt (presigned foto), üretici yanıtı, admin kararı: tam iade / kısmi iade (üretici payından) / serbest bırak.
  - [x] Karar ledger'a yansır · [x] dispute açıkken payout bloke · [ ] **yeniden üretim kararı ertelendi** (yeni sipariş/eşleştirme akışı tasarım gerektiriyor — sorulacak)
- [x] **F5-T7 Admin dispute ekranı (asgari)** — `/admin/disputes` liste + detay + karar formu.
- [x] **F5-T8 Ödeme güvenlik incelemesi** — bağımsız inceleme: 9 bulgu. Düzeltildi: eşzamanlı iade çift kaydı (advisory lock + yükümlülük bazlı idempotency key), çift checkout'ta iadenin doğru ödemeye gitmesi, `failed` sonrası gelen `succeeded`, provider'ın lazy çözülmesi (üretimde sipariş sayfası 500 riski), fake provider'ın secret'sız/dev dışı çalışmaması, kanıt anahtarı regex + foto sınırı, dispute varlık sızıntısı sırası, mutabakatın sipariş bazında toplanması. Sonradan giderildi: tutar/bilinmeyen-ref uyuşmazlığı artık `audit_logs.payment.needs_review` + log (sonsuz retry yok), ledger append-only trigger. **Açık kalan (T2 ile):** webhook'ta para birimi doğrulaması yok, presigned PUT'ta içerik boyutu sınırı yok (kayıtta doğrulanıyor), `amount_minor` int32.

**Post-check:** Faturalama (e-fatura/e-arşiv) iş PRD'sinde yok ama Türkiye'de yasal zorunluluk olabilir → **görev eklemedim, D5'e varsayım olarak eklendi; kullanıcıya soruldu.** Boyut L.

---

## Faz 6 — Vitrin & SEO `status: in_progress`

**Pre-check:** Amaç: "Alıcı doğrudan Fabrmatch'ten ürün bulup satın alabilsin." Kararlar (kullanıcı, 2026-09-23): katalog ürününün modeli admin'in yüklediği analizli `ModelFile` (`catalog_products.model_file_id`); yalnız üyeler sipariş verebilir (misafir yok).

- [x] **F6-T1 Listeleme & arama** — `/shop`: Postgres full-text (`search_vector` generated tsvector + GIN, başlık ağırlığı A), malzeme (catalog allow-list), fiyat aralığı/sıralama (hesaplanan fiyat üzerinden, bellekte; katalog küçük varsayımı, 500 üst sınır), sayfalama.
  - Görünürlük: ürün `active` + catalog `is_active` + analizli & basılabilir model. Üretici bilgisi hiçbir yerde yok.
- [x] **F6-T2 Ürün detay** — `/shop/:id/:slug` (yanlış slug → 301), `<Head>` title/description/OG/canonical, JSON-LD `Product`+`AggregateOffer` (`</script>` kaçışı testli). **3D önizleme yapılmadı:** herkese açık önizleme model dosyasını sızdırır (kural 4: yalnız grant ile indirilir); ürün görseli/render ileride.
- [~] **F6-T3 Sepet & checkout** — "Şimdi al" (tek ürün): `POST /shop/:id/order` → `OrderService.createStorefrontDraft` (fiyat sunucuda hesaplanır, istemci fiyatı yok sayılır, satıcı = ürün sahibi, kanal `storefront`) → mevcut ödeme akışı. **Çok kalemli sepet ertelendi** (çok kalemli sipariş fiyat/paylaşım değişikliği gerektirir).
- [x] **F6-T4 Sitemap, robots, canonical** — `/sitemap.xml` (yalnız görünür ürünler), `/robots.txt` (özel alanlar Disallow), canonical.
- [~] **F6-T5 Tasarım** — "Filament" kimliği (`docs/DESIGN.md`, skill rehberi `docs/DESIGN_SKILLS.md`): ink/paper/heat tokenları, Bricolage+Instrument Sans (self-host), layer-lines dokusu, LayerStepper, ortak bileşenler (PageHeader/EmptyState/StatTile/StatusBadge/OrderCode/Money/Reveal/Logo). Yenilenen: layout'lar (default/auth/dashboard), ana sayfa, `/shop` + ürün detay, üç dashboard (gerçek veri), `orders/*`. Düzeltilen kritik hata: Inertia 3'te layout çözümü (`withLayout`) — önceden layout'suz sayfalar (ana sayfa) boş render oluyordu.
  - [x] Ardından yenilenen: `files/index`, `maker/printers|capacity|work`, `seller/products`, `admin/catalog` (PageHeader + EmptyState), hata sayfaları (404/500 artık gerçek sayfa), onboarding başlıkları. Düzeltilen hata: kapasite takviminde "Invalid Date" (pg `date` sütunu JS Date dönüyordu).
  - [ ] Kalan: `files/quote` düzeni (hesap makinesi iki sütun), `auth/signup|forgot|reset` içerik gözden geçirme, `admin/disputes` liste; Lighthouse ölçümü; OG görseli.

**Post-check:** Satıcıya özel alt mağaza sayfası "çoklu mağaza" kapsam dışına yakın → eklemedim. Boyut M.

---

## Faz 7 — Shopify & Etsy `status: todo`

**Pre-check:** Amaç: "Satıcının dış mağazasındaki satış otomatik Fabrmatch siparişine dönüşsün, takip no geri yazılsın." D2 kapanmadan F7-T4 başlamaz.

- [ ] **F7-T1 Shopify OAuth uygulaması** + HMAC doğrulamalı webhook'lar (orders/create, app/uninstalled).
- [ ] **F7-T2 Etsy OAuth2 PKCE** + periyodik receipt çekme (scheduler).
- [ ] **F7-T3 SKU eşleme ekranı** — dış ürün ↔ `seller_products`.
- [ ] **F7-T4 Satıcıdan taban maliyet tahsilatı** (D2'ye göre kayıtlı kart veya bakiye).
- [ ] **F7-T5 Fulfillment geri yazımı** — takip no + durum.
  - [ ] Aynı dış sipariş iki kez gelse tek Fabrmatch siparişi (idempotency testi)

**Post-check:** Ürünleri Fabrmatch'ten Shopify'a push etme (Printify'daki gibi) iş PRD'sinde açık değil → **varsayım olarak işaretlendi, eklenmedi.** Boyut L.

---

## Faz 8 — Kurumsal ihale (RFQ) `status: todo`

**Pre-check:** Amaç: "Büyük miktarlı siparişte birden fazla üretici teklif versin, alıcı seçsin." Üretici kimliği burada da gizli.

- [ ] **F8-T1 RFQ oluşturma** — dosya(lar), adet, malzeme, son tarih, teslim süresi.
- [ ] **F8-T2 Davet** — uygunluk filtresinden (F4-T2) geçen üreticilere; yeni üretici kotası burada da uygulanır.
- [ ] **F8-T3 Teklif verme** — birim fiyat, termin; alıcı alias ile karşılaştırır.
- [ ] **F8-T4 Kazanan seçimi → sipariş** — seçilen teklif fiyatıyla Faz 5 checkout'u; kısmi teslimat yok (v1).

**Post-check:** Tekrar eden (abonelik) kurumsal sipariş PRD'de "düzenli ticaret" olarak geçiyor ama somut akış yok → v1'e alınmadı, not düşüldü. Boyut M.

---

## Faz 9 — Admin paneli & metrikler `status: todo`

**Pre-check:** Amaç: "İç ekip anlaşmazlık, kalite ve platform sağlığını yönetebilsin; başarı ölçütleri görünür olsun."

- [ ] **F9-T1 Kullanıcı/üretici yönetimi** — askıya alma, tier düşürme, audit log görünümü.
- [ ] **F9-T2 Sipariş gözetimi** — `unmatched`, SLA aşımı kuyrukları, manuel atama.
- [ ] **F9-T3 Katalog & ürün moderasyonu.**
- [ ] **F9-T4 Metrik paneli** — PRD §15'teki 4 ölçüt + komisyon geliri.
  - [ ] Yeni üretici kohort sorgusu testli
- [ ] **F9-T5 Konfigürasyon** — komisyon, keşif oranı, teklif süresi, otomatik onay günü.

**Post-check:** Tekrar yok (dispute ekranı F5-T7'de, burada genişletilir). Boyut M.

---

## Faz 10 — Global `status: blocked (D1)`

**Pre-check:** Amaç: "Yurt dışı satıcı/alıcı ve üreticiler ödeme yapıp alabilsin." Kullanıcı seçimi. D1 kapanmadan kod yazılmaz.

- [ ] **F10-T1 Stripe Connect provider** (aynı arayüz), Express onboarding.
- [ ] **F10-T2 Çoklu para birimi** — fiyat tablosu, kur kaynağı, kalem bazlı currency.
- [ ] **F10-T3 i18n** — EN; e-postalar dahil.
- [ ] **F10-T4 Ülke/kargo bölgesi eşleştirme kuralları.**

**Post-check:** Vergi (AB KDV/OSS) konusu ciddi; D1 kararına bağlı → görev eklenmedi, D1 notuna eklendi. Boyut M.

---

## Faz 11 — Sağlamlaştırma & lansman `status: todo`

**Pre-check:** Amaç: "Güvenli, izlenen, yedekli biçimde yayına çıkmak."

- [ ] **F11-T1 Deploy** — D4'e göre; web + worker + migration adımı; health check.
- [ ] **F11-T2 Güvenlik taraması** — OWASP kontrol listesi, bağımlılık denetimi. → `engineering:code-review`
- [ ] **F11-T3 Yük testi** — eşleştirme turu ve checkout.
- [ ] **F11-T4 Yedek & geri dönüş provası.**
- [ ] **F11-T5 Yasal sayfalar** — KVKK aydınlatma, mesafeli satış, üyelik sözleşmesi (D5 uzman metni).
- [ ] **F11-T6 Deploy checklist** → `engineering:deploy-checklist`; runbook → `operations:runbook`

**Post-check:** Tüm görevler lansmana yönelik; pazarlama görevleri kapsam dışı. Boyut M.

---

## Skill Yönlendirme Özeti (Phase 3)

| İş                                               | Skill                                                |
| ------------------------------------------------ | ---------------------------------------------------- |
| Tasarım sistemi, renk/token, tutarlılık denetimi | `client-design-system-builder`                       |
| Sayfa/komponent UI                               | `distinctive-web-design` (yoksa `frontend-design`)   |
| ADR'ler                                          | `engineering:architecture`                           |
| Test stratejisi                                  | `engineering:testing-strategy`                       |
| Kod/güvenlik incelemesi                          | `engineering:code-review`                            |
| Deploy & runbook                                 | `engineering:deploy-checklist`, `operations:runbook` |
| Geri kalan                                       | Doğrudan (Claude Code + `PROMPTS.md`)                |

---

## Log

- **2026-09-27** — Mağazada satıştan kaldırma: Shopify `productUpdate` (DRAFT), Woo `status: draft`; ürün arşivlenince bağlı tüm mağazalardan otomatik kaldırılır, tekrar yayınlama aynı mağaza ürününü kullanır (SKU ile bulunur; yeni ürün açma hatası düzeltildi). Adaptör sözleşmesine eklendi. 857 test.
- **2026-09-27** — Cüzdan bakiyesinin karta iadesi (en yeni yüklemeden başlayarak, anahtar yükleme + önceki iadeden türetildiği için yeniden deneme çift iade yapmaz; bakiye varken hesap silinemez; fatura bekleyen ödeme de silme engeli). Shopify/Woo ürün listesi sayfalamalı. 856 test.
- **2026-09-27** — R4-T2 satıcı cüzdanı (K-E varsayılanı): yükleme mevcut ödeme yolundan, `seller_wallet` defter hesabı (kullanıcı bazlı), kilitli bakiyeden ödeme, mağaza siparişlerinde otomatik ödeme, iade cüzdana, mutabakat uyarlandı, yalnız model B. Yerel test ödeme sayfası yüklemeleri de destekliyor. Avans niteliği D5'te avukata sorulacak. 853 test.
- **2026-09-27** — Dış mağaza: satıcıya bildirim (sipariş ödeme bekliyor / ürün eşlemesi gerekiyor / oluşturulamadı / mağazada iptal / iptal için geç); mağaza iptali senkronu (Shopify `ORDERS_CANCELLED`, Woo `cancelled`/`refunded`): üretim başlamadıysa bizde iptal + iade, başladıysa gönderim sürer ve satıcı bilgilendirilir. Adaptör sözleşmesine iptal eklendi. 847 test.
- **2026-09-27** — Printify modeli (kullanıcı kararı): satıcı kendi Shopify (Dev Dashboard Client ID/Secret; 2026'dan beri admin'de token yok) veya WooCommerce (site URL + consumer key/secret) bilgileriyle bağlanır, ürününü Fabrmatch'ten mağazasında malzeme varyantları + fiyatla yayınlar; ödenen siparişler webhook ile gelir (SKU ile otomatik eşlenir), kargo takibi geri yazılır. Etsy OAuth gerektirdiği için bekliyor. Adaptör sözleşmesi fake/Shopify/Woo için yeşil. 840 test.
- **2026-09-27** — R4-T3/T4 çekirdeği (bayrak kapalı): mağaza bağlantısı, SKU→ürün eşleme, imzalı sipariş webhook'u (idempotent, eşleşme bekleyen sipariş eşlenince oluşur, satıcı üretim maliyetini öder), kargoda takip numarasının mağazaya geri yazımı (5 dk süpürme, 10 deneme). `StoreAdapter` + Fake + sözleşme testi; Shopify/Etsy adaptörleri anahtar bekliyor. 826 test yeşil.
- **2026-09-27** — R7-T7 vergi raporları: `TaxReportService` (satış/alış KDV'si, onaylı faturaların KDV'si, tevkifat) + 3 CSV (KDV özeti, alış faturaları, muhtasar tevkifat listesi); rakamlar ledger ile birebir (test). 818 test yeşil.
- **2026-09-27** — R7-T2/T3/T4 (Model B: Fabrmatch satıcı).
  - `SALES_MODEL` + deploy koruması.
  - Serbest bırakmada satış KDV'si / indirilecek KDV / tevkifat ledger hesapları; komisyon net kalır (property testi).
  - Üretici/satıcı vergi ve banka profili + belge + admin onayı; onaysız alacaklıya dağıtım yok.
  - Kayıtlı alacaklı Fabrmatch'e fatura yükler, admin onaylar. Esnaf muafiyetli için otomatik gider pusulası (GP yıl+sıra) + %2 tevkifat + yıllık sınır.
  - Havaleler `/admin/payouts` CSV + referansla "ödendi".
  - Dashboard ana kolonuna `min-w-0` (375 px'te geniş tablo sayfayı taşırıyordu).
  - 816 test yeşil.
- **2026-09-26** — Hukuki/mali yapı araştırması (`docs/legal/satis-ve-fatura-modeli.md`):
  - Pazaryeri modelinde üretici kimliği ön bilgilendirmede zorunlu (Mesafeli Söz. Yön. md.5) → iş kuralı 1 ile çelişiyor.
  - Başkası adına tahsilat 6493'e göre lisans gerektirir.
  - Öneri: Fabrmatch satıcı (MoR), üretici tedarikçi. Faturalar ve belgeler:
    - Alıcıya Fabrmatch tam fatura keser.
    - Kayıtlı üretici Fabrmatch'a fatura keser.
    - Muaf esnaf için Fabrmatch gider pusulası düzenler ve tevkifat keser.
  - `tasks.md`'ye R7 rotası ve K-L kararı eklendi. Uzman teyidi bekleniyor.
- **2026-09-26** — R1-T1 iyzico: IYZWSv2 imzalı istemci + `IyzicoPaymentProvider` (Checkout Form, `/payments/return` dönüşü retrieve ile doğrulanır, webhook V3 imzası, v2 iade tek çağrı garantili, bekleyen ödemeler 5 dk'da senkron). Ödeme adımında TCKN (saklanmaz) + telefon; adres formlarına telefon. Pazaryeri (alt üye, `PUT /payment/item`, approve) `IYZICO_MARKETPLACE` bayrağı arkasında — sandbox hesabında kapalı (2000). Webhook para birimi doğrulaması eklendi. Gerçek sandbox'ta ödeme + iade doğrulandı. 801 test yeşil.
- **2026-09-26** — R5-T3 APP_KEY rotasyonu: `EncryptionService` `APP_KEY_PREVIOUS` ile eski anahtara düşer (kesintisiz geçiş), `KeyRotationService` + `security:rotate-key` komutu tüm şifreli sütunları yeniden yazar; sütun listesi `information_schema` ile testte doğrulanır. Prosedür `docs/SECURITY.md`.
- **2026-09-26** — R5-T6 a11y: bu oturumun sayfaları axe taramasına eklendi (`scripts/a11y.mjs` + `tests/browser/a11y_pages.spec.ts`); 2 ihlal düzeltildi (klavyeyle kaydırılamayan `pre`, yeşil rozet kontrastı → `text-fil-700`). 771 test yeşil, yerel tarama 0 ihlal.
- **2026-09-26** — R6-T6 boya rengi: "tek renge boyanır" vaat ediliyordu ama renk seçilemiyordu. `needs_colour` bayrağı + `finishing_colour` alanları, `FinishingService.resolveColour/paintColours`, `PaintColourField` bileşeni (teklif + vitrin), renk her gösterimde. 767 test yeşil.
- **2026-09-26** — R6-T7 kupon maliyeti raporu: `FinancialReportService.couponsCsv` + admin rapor indirmesi (`coupons`).
- **2026-09-26** — R4-T13 logo: `seller_profiles.logo_key/logo_content_type`, `BrandingService.saveLogo/removeLogo/logo` (tür ilk baytlardan, SVG yok, 256 KB), paket kartında gömülü görsel. 765 test yeşil.
- **2026-09-26** — R6-T6: yüzey işlemi ek günleri (`extra_days`, admin) üretim penceresini uzatır (`app/services/orders/production_window.ts` → eşleştirme, açıklayıcı, kabulde `dueAt`); vitrin ürün sayfasında yüzey işlemi seçimi, varyant fiyatları sunucuda fiyat motoruyla (işlem ücreti üretici payına eklenir, komisyon ve marj üstüne biner — istemcide fark göstermek yanlış olurdu). JSON-LD fiyat aralığı yalnız düz seçenekler. 762 test yeşil.
- **2026-09-26** — R5-T5 i18n kapanışı: son sarılmamış görünür metinler `t()` + TR (diyalog/çekmece "Kapat" ekran okuyucu etiketi dahil); e-posta/bildirim ve tarih/para yerelleştirmesinin zaten yapıldığı doğrulandı.
- **2026-09-26** — M2-T3 kullanım sayfaları: `UseCaseService` (prototip / yedek parça / küçük seri) örnek parça fiyatlarını canlı fiyat motoru + kargo tablosuyla hesaplar; malzemeyi ≥ 3 aktif üretici basmadıkça `noindex` ve sitemap dışı (doorway yok). İçerik `resources/content/use-cases/*.md` (TR). 759 test yeşil.
- **2026-09-26** — R4-T12: `/api/v1/openapi.json` (OpenAPI 3.1, anahtarsız): orders/order/products, 401/404/429, `webhooks` (`order.status_changed`, `webhook.test`) ve `Fabrmatch-Signature` doğrulama tarifi; `app/services/integrations/openapi.ts`. `openapi_http.spec.ts` belge alanlarını gerçek API yanıtı ve webhook yüküyle karşılaştırır (sapma = kırmızı test). 757 test yeşil.
- **2026-09-26** — R6-T7: vitrin ürün sayfasındaki sipariş formuna kupon alanı (sunucu zaten `couponCode` kabul ediyordu; arayüz eksikti). Geçersiz kod siparişi 422 ile durdurur. 755 test yeşil.
- **2026-09-26** — **R5-T4 e2e tamamlandı:** `tests/browser/order_lifecycle.spec.ts` iki tam yolculuk: (1) vitrin siparişi → test kartıyla ödeme → otomatik eşleşme → üretici kabul/baskı/kargo → alıcı teslim onayı + tamamlama; (2) itiraz → üretici yanıtı → admin tam iade → `resolved`. QC fotoğrafı tarayıcıdan doğrudan S3'e gittiğinden testte `JobQcPhoto` kaydıyla ikame. 754 test yeşil.
- **2026-09-26** — **3MF/OBJ desteği:** `app/services/files/mesh_parser.ts` bağımlılıksız 3MF (zip merkezi dizin + inflateRaw, `3D/*.model` XML, `unit`, `component`, `transform`, `p:path`, boyut/üçgen sınırları) ve OBJ (çokgen fan, `v/vt/vn`, negatif indeks) okur. `stl_analyzer.analyzeTriangles` biçimden bağımsız hacim/ölçü/su geçirmezlik/DFM. **Önceden** 3MF/OBJ analiz edilmiyordu (hacim yok → fiyat alınamıyor, vitrine çıkamıyor); şimdi analiz işi, render ve oturumsuz hızlı fiyat (`/tools/quick-quote`, biçim dosya adından, içerik yine taranır) üç biçimi de destekler; tarayıcı önizlemesi yalnız STL. 752 test yeşil.
- **2026-09-26** — **R4-T6 ürün görselleri:** saf JS render motoru (`app/services/files/model_renderer.ts`: ortografik z-buffer, iki ışık, katman çizgisi, zemin gölgesi, şeffaf PNG, `RENDER_VERSION`), `product_images` (render / maker_photo, approved/pending/rejected), `RenderModelFile` işi analizden sonra, `node ace images:render` geri doldurma. `/images/:id` (onaylı, public cache) + `/admin/images/:id`. Vitrin kartı `ProductThumb`, ürün sayfası `ProductGallery` (sürükle + kaydırıcı, klavyeyle erişilebilir), `og:image`, JSON-LD image. Üretici QC fotoğrafını önerir → admin kuyruğunda onay (iş kuralı 1) → vitrinde ilk sırada; yalnız aktif katalog modelleri (alıcının modeli asla). **HATA DÜZELTİLDİ:** yerel MinIO'da `fabrmatch` bucket'ı yoktu → yerelde tüm dosya yüklemeleri başarısızdı; `docker-compose` `minio-init` servisi bucket'ı oluşturur. Demo seeder artık her demo ürüne gerçek bir mesh (`database/seeders/demo_meshes.ts`) yükleyip render alır. 745 test yeşil.
- **2026-09-26** — **Manuel eşleştirmede kurallar tavsiye:** otomatik modda kurallar zorunlu; manuel modda admin, kuralı karşılamayan bir üreticiyi de seçebilir ("Yine de eşleştir"). Onay penceresi eksik kuralları listeler; teklif `match_offers.admin_override=true` (yeni migration) ile işaretlenir, eksikler audit log'a `unmetRules` olarak yazılır, üretici boş kapasite kaydı olmadan da kabul edebilir. Esnetilemeyenler (`isHardBlocker`): alıcı/satıcının kendisi (iş kuralı 2), askıdaki hesap, hiç yazıcısı olmayan (`no_printer`; yalnız pasif yazıcı = `no_active_printer`, esnetilebilir). Manuel modda "Uygun olmayan üreticiler" bölümü açık gelir. 732 test yeşil.
- **2026-09-26** — **Eşleştirme: uygun olmayan üreticilerin gerekçeleri.** `EligibilityExplainer` her üretici profili için `findCandidates` kurallarını aynı yardımcılarla tek tek değerlendirir: üretici düzeyi (onaysız, askıda, alıcı/satıcı, seviye düşük, başka ülke, siparişi daha önce aldı, RFQ başkasına, aktif yazıcı yok, yüzey işlemi yok) ve yazıcı düzeyi (teknoloji, boş kapasite — gereken/en iyi dakika, sığmıyor — ölçüler, ölçü bilinmiyor, malzeme/renk yok, fiyat referansın üstünde, baskı profili yok). `/admin/matching/:id` altında katlanır "Uygun olmayan üreticiler" bölümü, en yakın olan önce. Tutarlılık testi: explainer'da `eligible` ⇔ `findCandidates` adayı. 728 test yeşil.
- **2026-09-26** — **Admin kontrollü eşleştirme:** `matching.autoOffer` ayarı (varsayılan `MATCHING_AUTO_OFFER=false` → manuel; `.env.test` otomatik). Manuelde ödeme sonrası sipariş `matching`'de bekler, `runRound` hiçbir şey yapmaz; red/süre dolumu da siparişi admin kuyruğuna döndürür. Yeni `/admin/matching`: kuyruk (üretici bekliyor / eşleşmedi / teklif gönderildi) + mod anahtarı (otomatiğe geçince bekleyenlere tur başlatır, `resumeWaiting`). `/admin/matching/:id`: tüm kuralları şu an geçen üreticiler puan sırasıyla, 4 parça ölçer (`ranking.scoreParts`, tek kaynak), yeni üretici rozeti, geçmiş teklifler; "Bu üreticiyle eşleştir" → onay → `MatchingService.offerTo` (uygunluğu yeniden doğrular, `unmatched`'ı yeniden açar, audit `by: admin`). Üretici yine kabul etmeli (kapasite kabulde ayrılır). Demo seeder manuel moda uyarlandı. 725 test yeşil (+ tarayıcı testi `admin_matching.spec.ts`).
- **2026-09-26** — **Yerel test ödemesi:** sahte sağlayıcının `createCheckout`'u artık `/dev/checkout/:ref` test ödeme sayfasına yönlendirir (sağlayıcının barındırılan ödeme sayfası yerine). Tek test kartı `4242 4242 4242 4242` (gelecek tarih, herhangi CVC) → `payment.succeeded`; başka numara → `payment.failed`, sipariş `awaiting_payment`'ta kalır, tekrar ödenebilir. Sonuç imzalı webhook olarak gerçek `PaymentService.handleWebhook` yolundan geçer. Sayfa yalnız sahte sağlayıcı + üretim dışı (`TestCheckoutService.enabled()`); sipariş sayfasında "Ödemeyi simüle et" yerine gerçek **Şimdi öde** düğmesi + test modu notu. Kart bilgileri `docs/login.md`. 716 test yeşil.
- **2026-09-26** — **Giriş sonrası yönlendirme (aktivasyon):** `LandingService.homeFor` — korumalı sayfadan atılan misafir girişten sonra o sayfaya döner (`intendedUrl`, yalnız site içi yol); admin→`/admin`; üretici→açık teklif varsa `/maker/work`, yoksa `/maker`; satıcı (profilli)→`/seller`; alıcı (profilsiz satıcı rolü)→sepet doluysa `/cart`, siparişi varsa `/orders`, yoksa `/files`; rolsüz→`/onboarding`. Giriş, 2FA, guest middleware ve e-posta doğrulama linki bunu kullanır; kayıt→`/onboarding`. Rol ekranı yeniden: en üstte "Sadece bir şey bastırmak istiyorum" (profil yok, doğrudan `/files`), native radio kartlar. Satıcı paneline `SetupChecklist` ("İlk satışına giden yol", profil ✓ ile 1/4 başlar: fiyat gör → ürün listele → numune). Menüde profilsiz alıcıya "Panel" linki yok. **HATA DÜZELTİLDİ:** profil formunda "Kurumsal" işaretlenmezse `isCorporate` gönderilmiyor, doğrulama sessizce düşüyordu → kurumsal olmayan kimse satıcı/üretici profilini tamamlayamıyordu. 711 test yeşil.
- **2026-09-26** — Yerelde e-posta doğrulaması kapatılabilir: `EMAIL_VERIFICATION_REQUIRED=false` (`.env`) → tüm hesaplar doğrulanmış sayılır (gate, banner, üretici kurulum adımı, referans). Üretimde env ne derse desin zorunlu (`app.inProduction ||`). `.env.test` açıkça `true`. 699 test yeşil.
- **2026-09-26** — **HATALAR DÜZELTİLDİ:** (1) `crypto.randomUUID` yalnız güvenli bağlamda (https/localhost) var → site LAN IP / `0.0.0.0` üzerinden açılınca ürün detay, sepet ve fiyat sayfaları çöküyordu; `useIdempotencyKey` artık `getRandomValues` yedeğini kullanıyor (3 tarayıcı testi de buydu). (2) Rolü seçip profil adımını bitirmeyen kullanıcıda `/seller`, `/seller/products`, `/seller/branding` ve maker paneli null profil yüzünden 500 veriyordu → yeni `profile` middleware'i `/onboarding/profile`'a yönlendiriyor; profil adımı artık eksik profili olan rolü seçiyor. (3) Yerel e-posta: `docker-compose` içine Mailpit (1025 / arayüz 8025), `config/mail.ts` auth'u yalnız kullanıcı adı varsa gönderiyor. 5 rolle tüm sayfalar tarandı, hata yok. 698 test yeşil.
- **2026-09-26** — **STL/model yükleme güvenliği:** `scanUpload()` = boyut + imzalar (EICAR, program başlıkları) + gizli aktif içerik (script/php/html/svg/komut/gömülü zip-pdf; polyglot) + katı yapı (ASCII STL her satır dilbilgisi, ikili STL NaN/üçgen sınırı, OBJ önekleri) + 3MF merkezi dizin (yol kaçışı, çalıştırılabilir, zip bombası) + ClamAV (`CLAMAV_HOST`, kapalı başarısızlık; `docker compose --profile av`) + SHA-256 bütünlük. Presign yükleme/indirme `application/octet-stream` + `attachment`. Arayüzde "virüs taranıyor" paneli (hızlı fiyat, hero, dosyalarım rozetleri + karantina notu). **HATA DÜZELTİLDİ:** bozuk STL 3D önizlemede tüm sayfayı çökertiyordu → `PreviewBoundary`. Hero küpü 4 yüz (seç → sipariş ver → bas/teslim → ödeme serbest, marj hesaba) `DESIGN.md §19`. 696 test yeşil (+1 canlı ClamAV testi, `CLAMAV_HOST` ile).
- **2026-09-26** — Ana sayfa pazarlama denetimi + hero v3: hemen fiyat alanı hero'da, sağda dönen küp (baskı→teslim, sonra satıcı yüzü: SATILDI + siparişler + gerçek fiyat motorundan %30 marj, 'örnek'), 'Önce İstanbul' şeridi yerine `WhyStrip`, `HomeFaq`, başlık 'Tasarla. Bastır. Sat.'. Denetim tablosu `marketing.md §20` (açık karar M-G: sosyal kanıt / kurucu programı). `DESIGN.md §18`.
- **2026-09-26** — Hızlı fiyat aracı yeniden tasarlandı (canlı hesap makinesi, 3D önizleme, 4 malzeme × 1/2/5/10 adet, para dağılımı, örnek vazo); `accent` düğmeler limon, kapanış bandı güneş sarısı (kırmızı yalnız yıkıcı eylemlerde). **HATA DÜZELTİLDİ:** `stl_analyzer.isManifold` kenar anahtarını `-` ile bölüyordu → negatif koordinatlı (orijine ortalanmış) her kapalı model 'su geçirmez değil' sayılıp basılamaz diye reddediliyordu; ayırıcı `|` yapıldı, regresyon testi eklendi. STL önizlemesi Z-yukarı düzeltmesi. Kurallar `DESIGN.md §17`.
- **2026-09-25** — Hero sahnesi "baskıdan kapıya": yere sabit 3 eksenli robot kol (IK ile) vazoyu basar → kartona koyar → konveyör → kurye → alıcı; `print_journey.tsx` + saf zaman çizelgesi `lib/journey.ts` + 3 test; eski 4 kutucuk ve LayerStepper hero'dan kalktı. Mobilde adım şeridi 2×2. Reduced-motion/SSR teslim karesi. axe 0, konsol hatası yok. Kurallar `DESIGN.md §16`.
- **2026-09-25** — Açık/koyu tema (kullanıcı isteği): `.dark` token seti [ink tersine, paper koyu, durum renkleri koyuya uygun], `.palette-light` ile sabit koyu/parlak yüzeyler, ilk boyamadan önce tema betiği (`inertia_layout.edge`), `useTheme` (`useSyncExternalStore`, `localStorage.fm_theme`), `ThemeSwitch` üç yerleşimde, Sonner toast teması; 10 dosyada ham Tailwind renkleri token'a çevrildi; katman çizgisi değişkene bağlandı. `Badge` `<div>`→`<span>` [p içinde div hidrasyon uyarısı]. Koyu temada 20 sayfa axe 0 ihlal. Kurallar `docs/DESIGN.md §15`.
- **2026-09-25** — Pop P-8: `scripts/a11y.mjs` oturumlu sayfaları da tarıyor (buyer/seller/maker/admin, 21 sayfa × 2 genişlik, 0 ihlal); yeni `npm run vitals` [LCP/CLS, Lighthouse bağımlılığı eklenmedi] — genel sayfalar LCP ≤ 0,5 sn, CLS ≤ 0,04. Ana sayfa yol haritası §13 ve Pop §14 tamamen bitti. Not: gerçek LCP üretim derlemesinde ve gerçek ağda ölçülmeli (D4 hosting sonrası).
- **2026-09-25** — Ana sayfa H-6b: `MarginBand` [`blush` panel; gerçek aktif katalog tasarımlarından en çok 4'ü, maliyet `MarginPreviewService` ile marj 0'da sunucuda; kaydırıcıyla marj → alıcı fiyatı ve 'sende kalan' `CountUp`]; tarayıcı ikizi `inertia/lib/margin.ts`, `tests/unit/home_margin.spec.ts` fiyat motoruyla eşitliği zorlar. Doğrulandı: 135,13 TRY maliyet, %50 → 202,70 / 67,57. Ana sayfa yol haritası §13.3 tamamlandı; kalan yalnız P-8 (oturumlu a11y betiği + Lighthouse).
- **2026-09-25** — Ana sayfa H-12 doğrulama: EN+TR × 375/768/1024/1440 tam sayfa ekran görüntüsü + axe + taşma/H1/turuncu ölçümü, hepsi temiz; eski 'Yazıcın mı var?/Tasarım mı satıyorsun?' kartları kaldırıldı (sekmelerle tekrar). Lighthouse yok → P-8. Kalan: H-6b (satıcı marj mini aracı), P-8. Yasak listesi taramasında ana sayfa dışında 3 indigo kalıntısı bulundu ve düzeltildi (STL önizleme rengi, dosya yükleme hover, fiyat toplamı metni).
- **2026-09-25** — Ana sayfa H-10 (P-1..P-4 ile kapandı) ve H-11: `home_cta` deneyi [A kayıtsız fiyat / B kayıt+yükleme, 200/sürüm eşiği], maruz kalma `HomeController`'da, dönüşüm quick-quote başarısı ve kayıt; ana sayfa artık `landing_view` kaydeder. Tarayıcıda 12 taze ziyaretçide iki sürüm eşit dağıldı; `/admin/experiments`'te görünüyor (sonuç metinleri de TR). 1 functional test eklendi.
- **2026-09-25** — Pop P-7: `EmptyState` simge kutusu pop yüz (başlıktan kararlı renk) + 2px ink + sert gölge; `StatTile` üst kenar rengi (lime/heat/danger) + sayı ise `CountUp`; tablo/form sakin kaldı. Oturumlu axe taraması (admin/satıcı/üretici × TR/EN, WCAG 2.2 AA): kenar çubuğu daralt, mobil menü ve çıkış düğmeleri adsızdı → `aria-label` eklendi, 0 ihlal. `public a11y` betiği oturumlu sayfaları kapsamıyor (P-8'e not). Ayrıca admin panelindeki 2 İngilizce sayaç metni çevrildi.
- **2026-09-25** — Pop P-6 düğme denetimi: 11 panel/form sayfası [admin audit/coupons/queues/settings, seller products/cart/orders/files, maker work/printers/capacity] Playwright ile tarandı — yatay taşma yok. `Input` h-10→h-11 (varsayılan düğmeyle eşit, dokunma hedefi 44px); `default` düğmeye görünür alt katman (`border-b-ink-500`); sm düğmenin yanındaki 3 girdi `h-9` (finishing, settings, users). Ek bulgu: maker/work'te iki bağlantı bitişik yazılıyordu → flex gap.
- **2026-09-25** — Pop P-5: bantlar §14.4 haritasına uydu — yakınlık `sky` (2px ink kenarlıklı), keşif `sun/25`, öğren kartları 2px ink + kalkış; `tide-100` token'ı ve kullanımı kaldırıldı. Kontrast için sky üstündeki metin ink-900.
- **2026-09-25** — Pop P-4: `CountUp` [görününce 0'dan sayar, değer değişince yumuşak geçer; SSR metni zaten son sayı, reduced-motion'da sayım yok] kanıt şeridi rakamlarında ve hesaplayıcı sonucunda; sonuç rengi `lime`. Tarayıcıda doğrulandı: hareketli 1→6, reduced-motion hemen 6; gelir 2 yazıcı = 9472.32 TRY (3 yazıcı 14208.48 ile tutarlı).
- **2026-09-25** — Pop P-2 + P-3: kitle sekmeleri aktif `lime` katmanlı, ürün/malzeme kartları pop yüz + 2px kenarlık + hover kalkış/eğim, `MaterialMarquee` [gerçek aktif malzemeler, CSS ticker, hover/focus'ta durur, reduced-motion'da durur, sr-only liste]. Bulgu: `home_stats_service` ve testinde eskiden kalan 4 lint hatası [await üye erişimi] düzeltildi — önceki turlarda 'lint temiz' derken bunları kaçırmıştım.
- **2026-09-25** — Kullanıcı isteği: daha canlı renk + hareketli nesneler + düğme yapısı. `docs/DESIGN.md §14 Pop revizyonu` [pop palet lime/sun/sky/blush, katmanlı düğme, basılan parça animasyonu, marquee/eğim/sayı sayma planı, P-1..P-8]. Uygulanan P-1: token'lar, `Button` katmanlı varyantlar [`lime`,`sun` eklendi; `sm`/`icon`/quiet düz], `PrintArt printing` [clipPath+motion, reduced-motion statik], hero kutucuklar. 21st.dev: search + get_inspiration + 1 get_component [Pop Button, günlük 2 haktan 1'i]; kod ham alınmadı, fikir uyarlandı.
- **2026-09-25** — Ana sayfa H-9: `ClosingBand` [sayfadaki tek tam genişlik turuncu blok, ink metin/düğme] + `layouts/default.tsx` 4 sütunlu zengin footer [Sipariş / Fabrmatch ile kazan / Öğren / Güven ve hukuk, dil anahtarı, logo]; tüm footer bağlantıları 200, `npm run a11y` ihlal yok. Sıradaki H-10 hareket.
- **2026-09-24** — Ana sayfa H-8 + H-6c: `LearnBand` [son 3 blog yazısı `lang="tr"` + sözlük/araç bağlantıları; rehberler Türkçe olduğu için "(Türkçe)" etiketi]; emanet bandındaki onay süresi artık `autoConfirmDays` ayarından. Sıradaki H-9 kapanış bandı + zengin footer.
- **2026-09-24** — Ana sayfa H-7: `NearbyBand` [`tide-100` bant, 'Sana yakın basılır', soyut diyagram — gerçek harita çizmedim çünkü kapsama iddiası doğrulanamaz; üretici sayısı yalnız ≥3 iken]. Bulgu: emanet bandındaki '7 gün' metni hâlâ sabit → H-6c. Sıradaki H-8 öğren kartları.
- **2026-09-24** — Ana sayfa H-6: `IncomeBand` [koyu bant, 4 girdi, büyük sonuç `fil-500`, 'örnek, söz değil' notu]; formül `estimateMakerIncome`'ın tarayıcı ikizi `inertia/lib/income.ts` (sabitler sunucudan), `tests/unit/home_income.spec.ts` eşitliği zorlar. Satıcı marj aracı H-6b olarak ayrıldı. TR `14.208,48 TRY` / EN `14208.48 TRY` biçimi doğrulandı. Sıradaki H-7 yakınlık bandı.
- **2026-09-24** — Ana sayfa H-5: `Discover` [mağazadan son 8 ürün kaydırmalı şerit + aktif malzeme kartları]; veri `HomeController` üzerinden `StorefrontService`/`MaterialPageService`; ürün görseli yok → harf bloğu (mağazayla aynı), malzeme kartlarında SVG parça yalnız illüstrasyon. TR/EN, 390 px taşma yok. Sıradaki H-6 hesaplayıcı bandı.
- **2026-09-24** — Ana sayfa H-4: `ProofStrip` + `HomeStatsService` (gerçek sayaçlar; üretici <3 ve puan <5 iken gösterilmez, yerine 'Önce İstanbul' hikâyesi; onay süresi `autoConfirmDays` ayarından). Ana sayfa artık `HomeController` (route adı `home` korundu). 2 test. Sıradaki H-5 keşif bölümü.
- **2026-09-24** — Ana sayfa H-3: `AudienceTabs` [Alıcı/Satıcı/Üretici, WAI-ARIA tabs, klavye]; adım metinleri yalnız doğru iddialar; TR/EN doğrulandı. Sıradaki H-4 kanıt şeridi.
- **2026-09-24** — Ana sayfa yenileme başladı: POD referans analizi `docs/marketing.md §19`, tasarım yol haritası `docs/DESIGN.md §13` (H-1..H-12). Bitenler: H-1 hero [kayıtsız fiyat birincil CTA, 3 gerçek güven rozeti, spool kolajı + LayerStepper], H-2 [spool paleti + `PrintArt` SVG]. Sıradaki H-3 kitle sekmeleri. Döngü 10 dk (iş eaebdc88).
- **2026-09-24** — R5-T5 servis hata metinleri TR: ~160 statik `DomainError` metni `tr.ts`'e, sayı içerenler `patterns.ts`'e; hata gösteren sayfalar `t()` ile. R5-T5 i18n işi bu turla tamamlandı; yalnız hreflang/`/tr` URL kararı [M2-T4] açık. 680 test, typecheck, lint yeşil.
- **2026-09-24** — R5-T5: doğrulama/parola sıfırlama e-postaları ve DFM uyarıları TR. Sayı içeren sunucu metinleri için istemci desenleri `patterns.ts` (sözlükte anahtar olamaz); yeni bir sayı içeren sunucu mesajı eklenirse buraya desen + test ekle. Kalan: DomainError/servis hata metinleri.
- **2026-09-24** — R5-T5 bildirim/e-posta TR: migration `users.locale`; `catalog_tr.ts` (21 tür × rol, kimlik gizliliği kuralları aynı); `NotificationService.localised()` liste ve e-postada okuma anında çevirir (saklanan başlık/gövde İngilizce kanonik kalır, `data.role/ctx` eklendi); `LanguageController` oturumlu kullanıcının dilini kaydeder, kayıt istek dilini yazar. 678→680 test, typecheck, lint, i18n:check yeşil. Kalan: doğrulama/parola sıfırlama e-postaları, servis hata metinleri, DFM uyarıları.
- **2026-09-24** — R5-T5 çok dilli yapı düzeltmesi. Kök nedenler: (1) dil anahtarı yalnız genel yerleşimdeydi, panel ve giriş/kayıt ekranlarında yoktu; (2) 70+ sayfa `t()` kullanmıyordu; (3) veri dizileri [POINTS, STATUS_HINTS, nav, ayar tanımları], sunucu flash/doğrulama mesajları, hukuk metinleri, SSS çevrilmiyordu; (4) tarih/para hep `en`. Çözüm: AST codemod + elle sarma, sözlük ~1.300 giriş, dil anahtarı her yerleşimde, `translateValidationErrors` [sunucu], `resources/legal/tr`, `changelog.tr.md`, `formatDate/formatMoney` locale-aware, denetim scriptleri `i18n:check` ve `i18n:rendered` + `tests/unit/i18n.spec.ts`. Yeni UI metni kuralı: `t('English')` + `tr.ts` girişi; `npm run i18n:check` sıfır eksik göstermeli. 676 test, typecheck, lint yeşil. Kalan: bildirim/e-posta metinleri TR.
- **2026-09-24** — R5-T5 i18n: `shop/show` (ilan bildirme, sipariş formu, yorumlar; tekil/çoğul yorum sayısı ayrı anahtar) çevrildi. 673 test, typecheck, lint yeşil.
- **2026-09-24** — R5-T5 i18n devam: `shop/index` ve `cart/index` `t()` ile sarıldı, TR sözlüğe ~45 giriş eklendi; sözlükte yinelenen anahtar TS hatası verir [`uniq -d` ile kontrol]. Sunucudan gelen hata metinleri [`problem`, `couponProblem`] henüz çevrilmiyor. Loop 30 dk'ya alındı (iş 3f196f17). 673 test, typecheck, lint yeşil.
- **2026-09-24** — Tarama turu 2: art arda test çalıştırmada `admin_users_audit` "suspended user cannot log in" 429 ile düştü. Sebep: giriş hız sınırı kovaları (`rlflx:login:*`, IP başına 10/15 dk) paylaşılan redis'te çalıştırmalar arası kalıyordu. `tests/bootstrap.ts` kurulumu artık yalnız bu anahtarları siler (redis'i boşaltmaz). Arka arkaya 2 tam çalıştırma 673/673 yeşil.
- **2026-09-24** — Tarama turu: `typecheck` + `lint` temiz, 673 test yeşil. Kalan işaretsiz görevlerin hepsi 🔒/⏸ (iyzico, taşıyıcı, K-E/K-F/K-I/K-K, D1/D5, veri/donanım). Tek kod görevi X-6 [fixture ortak modüle taşıma] bilerek ertelendi: ~60 test dosyasını etkiler, kazanç küçük.
- **2026-09-24** — M4-T1 A/B altyapısı (`ExperimentService`; iki canlı başlık testi), M1-T3 aktivasyon metriği (`GrowthService.makerActivation`, `/admin/growth`), M3-T5/M4-T2/M4-T3 için `docs/marketing/playbooks.md` (süreç belgeleri; M4-T2 M-F kararını, M4-T3 D5'i bekliyor).
- **2026-09-24** — X-10 model sürümleri. ÖNEMLİ HATA: `registerFileValidator.sha256` `hexCode()` kullanıyordu (VineJS'te bu bir RENK kodu doğrulayıcısıdır) → gerçek dosya yüklemesi kayıtta 422 alıyordu; testler `createAnalyzedFile` fixture'ıyla bu yolu hiç geçmiyordu. Regex ile düzeltildi; `model_versions_http.spec.ts` gerçek kayıt yolunu artık kapsıyor. Ders: kullanıcı yolundaki doğrulayıcılar için en az bir gerçek-veri testi olmalı.
- **2026-09-24** — R4-T13 white-label: `seller_profiles.brand_name/brand_message`, `BrandingService` (kontrol karakteri ve `<>` temizler), `PackingSlipService` (sunucuda kaçışlı HTML; vitrin siparişinde satıcı markası; fiyat/alias/platform adı yok). Üretici yalnız kargo alanlarını görmeye devam eder (kural 1): kartta yalnız teslim adı.
- **2026-09-24** — M2-T5 `docs/marketing/launch-kit.md` (kapı + dizin/PR planı). Dizin kayıt koşulları çoğunlukla doğrulanmadı (yalnız Startups.watch ve Webrazzi'nin varlığı arama ile görüldü) → gönderimden önce her sitenin kuralı okunacak. Rakam/alıntı/referans yok.
- **2026-09-24** — R5-T2 yedek runbook'u + `scripts/restore_drill.sh` (yerel docker'da geçti: 66 tablo, 54 migration, ledger dengeli). Karar/uyarı: `APP_KEY` veritabanı yedeğinden ayrı saklanmalı, yoksa şifreli alanlar (IBAN, adres, 2FA) geri gelmez. Gerçek PITR/R2 ayarı D4'e bağlı.
- **2026-09-24** — X-12 finansal raporlar (`FinancialReportService`, `csv.ts` formül korumalı, admin sayfası + 3 CSV, üretici/satıcı kendi ödeme dökümü) ve X-13 üretici kurulum listesi (`MakerSetupService`, `MakerSetup` bileşeni). Boşluk kapandı: makerların banka hesabı ekleyebileceği sayfa yoktu → `/maker/payout` (IBAN doğrulama, parola tekrarı, `maker.iban_changed` audit'i, ham IBAN hiçbir yerde yazılmaz).
- **2026-09-24** — Sağlık alarmı `fx_stale`: bayrağı açık yabancı para biriminin kuru yoksa veya `pricing.fxMaxAgeHours`'un yarısından eskiyse `/health` ve `/status` 'degraded' olur (sipariş reddi başlamadan önce uyarı). TRY-only kurulumda hiç tetiklenmez.
- **2026-09-24** — Para birimi tutarlılığı: `SellerAnalyticsService` (`earned`/`pending`/ürün başına `earned` artık `{currency, minor}` listesi), `DashboardService` (`earnedThisMonth` liste) ve `MoneyList` bileşeni; farklı para birimleri asla toplanmaz. Yabancı para bayrakları açılırsa bu ekranlar doğru kalır.
- **2026-09-24** — R6-T5 (yalnız yön önerisi). `betterOrientation`: +X/−X/+Y/−Y/−Z altı dönüş, mevcut `overhangShare` ile karşılaştırır; ≥ 1/3 göreli ve ≥ 5 puan azalış, yükseklik ≤ 2× ise `better_orientation` (info) DFM notu, mesajda gerçek yüzdeler. STEP/IGES + onarım: OpenCascade yok → **K-I kararı bekliyor** (öneri: K-H gibi açık kaynak CLI işçisi). Mevcut dosyalar yeniden analiz edilmedikçe ipucu almaz.
- **2026-09-24** — R6-T4 RFQ (kısmen, `flags.rfq`=0). Tablolar `rfqs`, `rfq_invites` (`is_exploration`), `rfq_bids` (unique rfq+maker). Karar: fiyat = üreticinin birim fiyatı (kendisine kalan); alıcı toplamı = fiyat + komisyon (`commissionBps`) + parsel kargosu, KDV içinde (`rfq_pricing.ts`); kazanan seçimi sıradan bir `channel='rfq'` sipariş yaratır (alıcı adresi seçimde alınır), ödeme+eşleştirme mevcut akıştan gider: `EligibilityService` RFQ siparişinde yalnız kazanan üreticiyi döndürür ve referans fiyat kontrolünü atlar; kazanan reddederse sipariş `unmatched` (3 gün sonra otomatik iptal+iade). Kimlik: üretici alias/isim/id alıcıya gitmez ('Offer n' etiketi), alıcı üreticiye görünmez, dosya yalnız boyut olarak paylaşılır (kural 4). Not alanı `maskContactDetails`'ten geçer. Kurumsal kısıt: `seller_profiles.is_corporate`. Test: hizmet + HTTP + tarayıcı (ekran görüntüsü). Not: `ace test` sözdizimi hatasında çıkmadan asılı kalıyor; takılırsa `pkill -f 'ace test'` ve log'a bak.
- **2026-09-24** — R6-T6 son işlem (kısmen). `finishing_options(code, price_minor birim başına TRY, materials jsonb|null)`, `manufacturer_finishings` (üretici yeteneği), `order_items.finishing_code/name/minor` (dondurulmuş), `cart_items.finishing_code`. Fiyat `calculatePrice`'ta üretici payına eklenir (kâr çarpanından sonra) → komisyon/marj otomatik; yabancı para çevirisi mevcut bileşen-bazlı akıştan geçer. `EligibilityService` istenen seçeneği sunmayan üreticileri eler. Materyal uyumsuzluğu (VAPOR yalnız ABS) ve pasif seçenek sipariş öncesi reddedilir. jsonb dizi kolonları modelde `prepare: JSON.stringify` ister (aksi halde pg dizi literali yazar). Açık: süre/teslim etkisi, vitrin, renk.
- **2026-09-24** — M3-T1 referans programı (kısmen). Tek mekanik kupon altyapısı üzerinde: `users.referral_code`, `coupons.user_id` (kişisel kupon), `referrals(referee_id unique, status pending/rewarded/rejected)`. Kayıtta `?ref=` oturuma yazılır (8 karakter, 0/O/1/I yok), `NewAccountController` `ReferralService.attach` çağırır: arkadaşa `INV-…` ilk-sipariş kuponu; tetik `OrderStateMachine` `completed` geçişinde `rewardSafely` (savepoint, hata tamamlanmayı bozmaz). Ödül: davet edene kupon; koşullar `referral.*` ayarları (ödül 50 TRY, min sipariş 150 TRY, kişi başı 10 ödül, kupon 90 gün) ve `flags.referrals`=0. Para hareketi yok: kupon indirimi komisyondan (R6-T7). Açık: şartlar metni [D5], üretici komisyon indirimi, ölçüm.
- **2026-09-24** — R6-T7 kupon (kısmen). Karar: indirim platform komisyonundan karşılanır (`ledger promo_expense` yerine), böylece `total = ödenen`, `platformFee = komisyon − indirim`, üretici payı (kalan) ve satıcı payı değişmez; ödeme, escrow, iade ve payout kodu dokunulmadan çalışır. `orders.discount_minor`, `coupons`, `coupon_redemptions(order_id unique)`. İndirim ≤ min(hesaplanan, üst sınır, komisyon, ürün tutarı); kargo indirime girmez. Hak sayımı: iptal edilmemiş sipariş, 24 saatten eski taslak sayılmaz; sipariş transaction'ında kupon satırı `FOR UPDATE` ile kilitlenip yeniden kontrol edilir. Yabancı para siparişte sabit tutar kilitli kurla çevrilir, asgari sepet TRY karşılığıyla. Testte: üretici ödemesi kuponlu/kuponsuz aynı, mutabakat temiz, iptalde ödenen tutar iade. Sepet UI'ında Items satırı indirimden önceki tutarı gösterir (toplam tutsun diye).
- **2026-09-24** — R6-T2 çoklu para (kısmen). Karar: dahili hesap TRY; alıcı USD/EUR/GBP (2 ondalıklı) seçebilir, fiyat TRY hesaplanıp sipariş anında çevrilir. Kur: `fx_rates(currency, rate_nano = yabancı/1 TRY ×1e9, as_of)`, TCMB `today.xml` ForexSelling, BigInt yarım-yukarı yuvarlama, float yok. Kilitli kur = ham kur + `pricing.fxMarginBps` (varsayılan %3, alıcı biraz fazla öder); `pricing.fxMaxAgeHours` (72) aşılırsa sipariş reddedilir. `priceOrder` her bileşeni ayrı çevirip birim fiyatı toplar (eşitlik bozulmaz), `orders.base_total_minor` TRY karşılığı: güven kademesi, yeni hesap limiti, GMV. Para birimleri `flags.currencyUsd/Eur/Gbp` ile KAPALI; açılsa bile sağlayıcı `supportedCurrencies` içermezse sipariş reddedilir (fake tümünü destekler). Payout/ledger sipariş para biriminde (tam akış + mutabakat testte). Dikkat: rakam içeren kolon adı Lucid'de bozuluyor (`rate_e9` → `rate_e_9`), `_nano` kullanıldı. AÇMA: gerçek sağlayıcı yok; kazanç/analitik ekranları henüz para birimi bazında değil.
- **2026-09-24** — M2-T4 (kısmen): `siteUrl` Inertia ortak prop'u; ana sayfada Organization + WebSite(SearchAction → `/shop?q=`) JSON-LD ve canonical; `inertia_layout.edge` `<html lang>` artık `page.props.locale`'den (SSR'da hep `en` idi). hreflang yapılmadı: dil çerezle seçiliyor, aynı URL iki dil → geçersiz olur; dil başına URL kararı açık. Lighthouse ölçülmedi (araç/derlenmiş build yok).
- **2026-09-24** — M2-T3 (kısmen) malzeme sayfaları: `MaterialPageService` aktif+onaylı üretici ve aktif yazıcıdan malzeme başına üretici sayısı ve min/max gram fiyatını verir; eşik `MIN_MAKERS_FOR_MATERIAL_PAGE = 3` (tek üreticinin fiyatı okunmasın, ince içerik olmasın). Eşik altında sayı yok, `noindex, follow`, sitemap dışı. Sitemap yalnız indexlenebilir malzemeleri listeler. Test: eşik, pasif üretici/yazıcı sayılmaz, kimlik sızmaz, tarayıcı ekran görüntüsü. Şehir sayfaları üretici arzı kanıtlanınca.
- **2026-09-24** — R4-T12 satıcı API + webhook: tablolar `api_keys` (sha256 hash, önek), `webhook_endpoints` (imza sırrı `EncryptionService` ile şifreli), `webhook_deliveries` (outbox, `(endpoint_id, event_id)` tekil). `OrderStateMachine.transition` teslimat satırlarını aynı transaction'da yazar (geri alınırsa olay da gitmez); `DeliverWebhooks` her dakika kiralayıp (`FOR UPDATE SKIP LOCKED`) gönderir. İmza `Fabrmatch-Signature: t=..,v1=HMAC-SHA256(t.body)`. SSRF: `webhook_url.ts` (BlockList, IPv4-mapped IPv6 dahil) + `webhook_transport.ts` bağlantı anında çözümlenen adresi doğrular, yönlendirme yok, 10 sn zaman aşımı. `/api/v1` bearer anahtar, her zaman JSON hata, askıdaki kullanıcı/satıcı olmayan anahtar 401. Olay ve API çıktısında alıcı/üretici kimliği yok (test). UI `/seller/developers` (TR çeviri, 375/1280 ekran görüntüsü kontrol edildi); mobilde taşan footer nav düzeltildi. Test: unit (url/transport/webhook) + functional + 1 browser.
- **2026-09-24** — M2-T2 blog/sözlük altyapısı: `resources/content/{blog,glossary}/*.md` (front matter + basit Markdown, yalnız site içi bağlantılar), `ContentService`, `/blog`, `/blog/:slug`, `/glossary`, `/glossary/:slug`, Article/DefinedTerm JSON-LD, canonical, sitemap + robots, footer bağlantısı. 11 yazı (keywords-tr §4 fikirleri; rakam/vaat yok, Etsy entegrasyonu yok denerek) + 14 sözlük terimi, TR. Test: iç bağlantıların hepsi çözülüyor. KALAN: blog yazılarının Search Console ile doğrulanması ve içerik takvimi.
- **2026-09-24** — M3-T3 kısmen (vitrin yorumları + AggregateRating). 479 test yeşil.
- **2026-09-24** — M3-T4 tamam (durum + changelog sayfaları). 477 test yeşil.
- **2026-09-24** — M3-T2 tamam (yaşam döngüsü bildirimleri). 476 test yeşil.
- **2026-09-24** — R5-T5 temel tamam (i18n altyapısı + kabuk/ana sayfa/giriş TR). Yeni sayfa yazarken metni `t()` ile sar ve `tr.ts`'ye ekle. 470 test yeşil.
- **2026-09-24** — R5-T4 kısmen (tarayıcı e2e: bekleme listesi + alıcı yolculuğu). Not: `getByLabel` alt dizgi eşler; `{ exact: true }` kullan. 466 test yeşil.
- **2026-09-24** — R5-T6 kısmen (axe taraması + düzeltmeler); CSP üretimde rapor modunda açıldı. Not: eski `ace serve` süreci portta kalabiliyor — `lsof -i :PORT` ile kontrol et.
- **2026-09-24** — R5-T3 kısmen tamam (audit temiz, CI adımı, Dependabot, SECURITY.md).
- **2026-09-24** — R4-T11 tamam (satıcı maker seviyesi tercihi). 463 test yeşil.
- **2026-09-24** — R4-T9 tamam (boyut varyantı). 461 test yeşil.
- **2026-09-24** — R4-T8 tamam (örnek sipariş). 456 test yeşil.
- **2026-09-24** — R4-T7 tamam (marj önizleme + satıcı analitiği). 453 test yeşil.
- **2026-09-24** — R4-T10 tamam (kategori + etiket). 449 test yeşil.
- **2026-09-24** — R5-T8 tamam (yardım + iletişim). Not: çok satırlı heredoc'ta dosya oluşturma başarısız olursa test koşusu takılabilir — önce `mkdir -p`. 445 test yeşil.
- **2026-09-24** — R2-T8 Fake ile tamam (kargo webhook + etiket servisi). 442 test yeşil.
- **2026-09-24** — R1-T6 mekanizması tamam (yasal sayfalar taslak + sürümlü checkout onayı, bayrakla). 437 test yeşil.
- **2026-09-24** — R1-T3 çerçeve tamam (komisyon faturası + Fake sağlayıcı). 433 test yeşil.
- **2026-09-24** — R1-T2 kısmen tamam (KDV dahil model, sipariş/sepet gösterimi). 428 test yeşil.
- **2026-09-24** — R1-T5 mekanizması tamam (dışa aktarım + hesap silme + consents). 423 test yeşil.
- **2026-09-24** — R1-T9 tamam (chargeback köprüsü). 417 test yeşil.
- **2026-09-24** — M2-T1 tamam (kayıtsız hızlı fiyat). Düzeltme: üretici alias'ı 4→6 hex + benzersizlik denemesi (çakışma riski). 413 test yeşil.
- **2026-09-24** — M1-T4 tamam (üretici gelir hesaplayıcı). 411 test yeşil.
- **2026-09-24** — M0-T4 (varsayılan), M1-T1 (landing + bekleme listesi), M1-T2 (kaynak izleme + huni) tamam. 407 test yeşil.
- **2026-09-24** — R2-T1 çerçeve tamam (slicer soyutlaması, önbellek, job, fiyat entegrasyonu); gerçek Orca profil bring-up açık. Not: model alan adı `sha256`/`gramsX100` gibi rakamlı isimler Lucid naming strategy'de bozuluyor (`sha_256`) → rakamsız kolon adı kullan. 397 test yeşil.
- **2026-09-24** — Kararlar: K-G evet, K-H açık kaynak CLI dilimleyici worker. R3-T6 tamam (reprint). Dalga 4 bitti. 391 test yeşil.
- **2026-09-24** — R3-T8 (metrikler) ve R3-T9 (sağlık ucu + alarm işi) tamam. `client` testleri yalnız functional suite'te çalışır (unit'te sunucu yok). 387 test yeşil.
- **2026-09-24** — X-5 tamam: arka plan iş paneli. 381 test yeşil.
- **2026-09-24** — X-2 (bayraklar), X-3 (Idempotency-Key), X-4 (sipariş sağlık görünümü) tamam. 379 test yeşil.
- **2026-09-24** — R3-T11 tamam: yükleme taraması, şikâyet akışı, model bloklama. 373 test yeşil.
- **2026-09-24** — R3-T10 tamam: sahtekârlık kuralları + admin kuyruğu; hold'lu sipariş matching başlatmaz. 368 test yeşil.
- **2026-09-24** — R3-T7 tamam: anonim mesajlaşma (maskeleme filtresi, admin görünümü). Not: aynı controller metodunu iki route'ta kullanmak isim çakışması verir; ikinci kapı için alt sınıf controller. 362 test yeşil.
- **2026-09-24** — X-9 tamam: sipariş değeri ↔ maker tier eşiği. 346 test yeşil.
- **2026-09-24** — R3-T3 tamam: kullanıcı yönetimi/askıya alma + audit arama. 344 test yeşil.
- **2026-09-24** — R2-T10 (DFM analizi) ve R2-T11 (QC fotoğrafı) tamam. Test düzeltmesi: login throttle anahtarları temizlenir. 338 test yeşil.
- **2026-09-24** — R2-T9 tamam (temel): ETA aralığı quote + sepette. 328 test yeşil.
- **2026-09-24** — R2-T5 tamam: çok kalemli sipariş (`order_pricing.ts` tek fiyat kaynağı), sepet (DB, üyelere özel), kargo tek koli. 326 test yeşil.
- **2026-09-24** — R2-T6 tamam: teknoloji seçimi profil üzerinden (UI süzme + sunucu doğrulaması + eşleştirme). 313 test yeşil.
- **2026-09-24** — R2-T4 tamam: üretici fiyatı referansı aşarsa eleme + kaçırılan sipariş ipucu. 311 test yeşil.
- **2026-09-24** — R2-T2 tamam: baskı profilleri (fiyat, süre, eşleştirme, admin/maker/buyer UI). 309 test yeşil.
- **2026-09-24** — R2-T7 tamam: bölge×ağırlık kargo tablosu (yer tutucu fiyatlar), sipariş/vitrin/quote'ta tek kaynak. Test altyapısı: `resetDatabase()` truncate sonrası referans verisini (malzeme/renk/kargo) geri yükler; `database/schema.ts` prettier/eslint dışı (üretilmiş dosya). 303 test yeşil.
- **2026-09-24** — R2-T3 tamam: `materials`/`colors` kataloğu, üretici seçimi doğrulanır. Test düzeltmeleri: `.env.test` PORT=3390 (geliştirme sunucusuyla çakışma), truncate eden spec'ler için `ensureReferenceCatalog()`. 294 test yeşil.
- **2026-09-24** — R1-T4 tamam (Dalga 2 bitti): TOTP 2FA + yedek kodlar + giriş challenge'ı, `user_sessions` (store'dan bağımsız oturum kaydı, iptal edilebilir), `/account/security`, admin paneli için zorunlu 2FA (`ADMIN_2FA_REQUIRED`). 288 test yeşil.
- **2026-09-24** — R3-T5 tamam: `MakerScorecardService`, `EarningsService`, `/maker/performance`, `/maker/earnings`. 266 test yeşil.
- **2026-09-24** — R3-T4 tamam: trust tier gece hesabı (PRD §10 kuralları, eşikler admin ayarlarında), `manufacturer_profiles.trust_tier_locked`, `/admin/makers`. 260 test yeşil.
- **2026-09-24** — R3-T1 tamam: `AdminQueueService` + `/admin/queues`. Önemli bulgu: üretici profili `pending` başlıyordu ve onaylayan yol yoktu; artık admin onaylar/reddeder. `MatchingService.restart` (unmatched → yeniden eşleştirme). 252 test yeşil.
- **2026-09-24** — X-7 (reconcile: dengesiz işlem + negatif bakiye) ve R3-T2 (ayarlar tablosu, `SettingsService` config'i yerinde günceller; 30sn sync `start/settings_sync.ts`; `/admin/settings`) tamam. 243 test yeşil.
- **2026-09-24** — X-1 (PaymentProvider sözleşme testi, `tests/contracts/`), R1-T8 (`throttle` middleware + uç noktalara bütçe), M0-T2/M0-T3 (rakip + anahtar kelime araştırması, Orca worker'ları) tamam. 236 test yeşil.
- **2026-09-23** — Faz 4 T1-T4 tamamlandı. Migration: orders, order_items, production_jobs (sipariş başına tek aktif iş, partial unique index), match_offers (printer_id + slot_date), audit_logs. Modeller üretilmiş schema class'larından türüyor. `OrderStateMachine` (FOR UPDATE + audit, dış trx desteği), `OrderService.createDraft` (fiyat motoru, adres AES-GCM şifreli, FO-XXXXXXXX kodu). `EligibilityService` (aktif yazıcı, teknoloji/malzeme/renk, döndürmeli bbox, SLA penceresinde kapasite, tier, ülke, alıcı/satıcı kendi profili hariç, önceki tur üreticileri hariç). Saf `rankCandidates` + `seededRng`; nötr öncüller (puan 3.5, zamanında %80). `MatchingService`: start/runRound (idempotent)/accept (kapasite rezervi + ProductionJob + file grant tek trx'te)/decline/expire/expireStaleOffers; yan etkiler (`ExpireOffer.dispatch().in()`, Transmit, mail) commit sonrası. v1 varsayımı: sipariş tek yazıcı + tek gün slotunda üretilir. `config/fabrmatch.ts` eklendi. Düzeltmeler: `ModelFile.volumeMm3` → `volume_mm3` kolon eşlemesi (analiz job'ı hacmi hiç kaydedemiyordu); Transmit `'*'` herkese açık yetkisi kaldırıldı, üretici kanalı yalnız sahibine; sayfa prop `interface`'leri `type`'a çevrildi → `inertia.render` tip hataları giderildi, typecheck ilk kez tamamen yeşil. 98 test yeşil, lint temiz.

- **2026-09-24** — **R1-T7 bildirim sistemi tamam** (tasks.md Dalga 2 başladı): rol bazlı şablon kataloğu (alıcı/satıcı üretici kimliği, üretici alıcı kimliği görmez; takip no yalnız alıcıya), idempotent bildirim + e-posta job'u + tercihler + zil/inbox UI, marka kimliğinde 4 e-posta şablonu. 228 test.
- **2026-09-23** — **R0 paketi (tasks.md Dalga 1) tamam:** komisyon config'ten (B1), `verified` e-posta kapısı + banner + doğrulanmamış lehtara payout bekler (B3), paid/matching/unmatched iptal+tam iade + `CancelStaleUnmatched` (B4), `/seller/orders` (B7), sayfalama altyapısı, ölü alan temizliği, `MoneyInput`, deploy koruması (`start/payment_guard.ts`, `docs/DEPLOY_NOTES.md`). Orca orchestration ile 2 paralel araştırma worker'ı (M0-T2 rakipler, M0-T3 TR anahtar kelime) docs/marketing/ altına yazdı. 219 test, typecheck, lint yeşil.
- **2026-09-23** — `docs/marketing.md` yazıldı (arz-öncelikli pazaryeri GTM, AARRR teşhisi, SEO/programatik SEO, ücretsiz araçlar, referral, lansman, skill haritası; kaynaklar doğrulama etiketli). `docs/tasks.md`'ye M paketi eklendi. R0-T1 (komisyon tek kaynak) tamamlandı, 190 test.
- **2026-09-23** — `docs/GAP_ANALYSIS.md` yazıldı: kodda doğrulanmış 7 hata (komisyon config'i kullanılmıyor, üretici gram fiyatı yok sayılıyor, e-posta doğrulaması zorunlu değil, ödeme sonrası iptal yok, yalnız aynı ülke üretimi, tek kalem/FDM, satıcı sipariş listesi yok) + alan bazlı eksikler (P0–P3) + R0–R6 yol haritası + açık kararlar. Onay bekliyor.
- **2026-09-23** — Tasarım yenilemesi (F6-T5 kısmen): kullanıcı geri bildirimi "yapay zeka görünümü + boş sayfalar". `docs/DESIGN.md` + `docs/DESIGN_SKILLS.md` yazıldı, CLAUDE.md'ye zorunlu kural eklendi, hafızaya kaydedildi. Eski indigo/Inter teması kaldırıldı. `DashboardService` ile seller/maker/admin ana sayfaları gerçek veriye bağlandı (sabit "0" yok). `database/seeders/demo_seeder.ts` (yalnız development) demo kullanıcı+ürün+sipariş üretir. Gerçek tarayıcıda (Playwright) ekran görüntüleriyle doğrulandı (1440 ve 390px).
- **2026-09-23** — Faz 6 T1,T2,T4 + T3 (tek ürün) tamamlandı. Migration: `catalog_products.model_file_id`, `seller_products.search_vector`. `StorefrontService` (liste/arama/detay/sitemap), `OrderService.createStorefrontDraft`, `StorefrontController`, sayfalar `shop/index|show`, admin katalog formuna model dosyası seçimi (yalnız adminin analizli & basılabilir dosyası). Faz 5 notu: webhook'ta uyuşmazlık artık `payment.needs_review`, ledger append-only trigger eklendi. 189 test, typecheck, lint yeşil.
- **2026-09-23** — Faz 5 T1,T3(fake),T4-T8 tamamlandı; T2 (iyzico) bloke. Migration: payments, payment_webhooks (unique event id), ledger_entries (deferred constraint trigger: işlem başına toplam 0), payouts (sipariş+lehtar unique), disputes (sipariş başına tek açık), dispute_evidence; orders'a platform_fee_minor/seller_share_minor. `PaymentProvider` arayüzü + `FakePaymentProvider` (HMAC imzalı webhook, idempotent approve/refund) + registry. `PaymentService` (checkout, imzalı/tekilleştirilmiş webhook, tutar kontrolü, iptal siparişe gelen paranın otomatik iadesi, iade yükümlülüğü + `settleRefunds`), `PayoutService` (emanet → platform payı/satıcı/üretici, kural 5), `DisputeService` (aç, kanıt, yanıt, admin kararı), `ReconciliationService`; job'lar: ReleasePayouts, SettleRefunds, ReconcilePayments (10dk/10dk/günlük). UI: `/admin/disputes`, sipariş sayfasında dispute + foto yükleme, üretici iş kartında yanıt kutusu. **Yeniden üretim kararı ertelendi.** Ortam: `.env`'e PAYMENT_PROVIDER/PAYMENT_WEBHOOK_SECRET eklendi (fake provider secret'sız çalışmaz). 164 test, typecheck, lint yeşil.
- **2026-09-23** — Faz 4 tamamlandı (T5-T8, T1-T4 önceki oturumda bitmişti). Paylaşılan nav modülü (`inertia/lib/nav.ts`): maker/seller/admin panel linkleri tek yerden, `/maker/offers` hatalı linki `/maker/work` ile düzeltildi, eksik ikon çökme riski giderildi. `/maker/work` sayfası: teklif kartları (geri sayım saati, kabul/red), iş kartları (printing/produced/ship akışı, kargo formu, anonim dosya indirme grant üzerinden). `/orders` liste + `/orders/:id` detay: durum rozetleri, zaman çizelgesi, iptal/ödeme-simülasyon(dev)/teslim-onay/tamamla/1-5 değerlendirme aksiyonları. `files/quote.tsx`'e sipariş formu eklendi (adres alanları + POST /orders → order.show). Controller'lar transformer `Item`/`Collection` sonuçlarını `.resolve(app.container.createResolver(), 0)` ile açık çözümlüyor (Inertia prop tipi eager değer istiyor). `tests/functional/role_access.spec.ts` (6 test): seller/manufacturer panel 403 çapraz erişim, seller kendi paneline 200, manufacturer `/maker/work` 200, manufacturer `/orders`'a erişebiliyor (rol kısıtı yok), rolsüz kullanıcı `/onboarding`'e yönleniyor — japa auth+session api-client plugin'leri (`authApiClient`, `sessionApiClient`) `tests/bootstrap.ts`'e eklendi (`loginAs()` için gerekliydi). Ortam notu: bu makinede redis/postgres/minio yalnız `docker compose` ile geliyor (host postgres 5432 farklı bir DB, uygulama `.env`'de 5433'ü kullanıyor) — Docker Desktop kapalıyken `node ace test` postgres/redis'e bağlanmaya çalışıp sessizce asılı kalıyor (hata basmıyor, sadece takılıyor); `open -a Docker` + `docker compose up -d` gerekiyor. 118 test yeşil, typecheck ve lint temiz.
- **2026-09-23** — Faz 3 tamamlandı (T1-T6). Model files: presigned R2 upload, sha256 dedup (columnName fix for Lucid camelCase), 200MB limit, STL/3MF/OBJ. STL analyzer: binary+ASCII parser, volume (signed tetrahedron), bbox, triangle count, manifold check, 20mm cube %1 tolerans testi. AnalyzeModelFile queue job (Job.dispatch static method). Price engine: PRD §7 formülü, estimateGrams (shell 10% + infill heuristic), all integer minor units, Math.ceil rounding. Quote page: material/qty/infill selector, live price breakdown. Three.js 3D preview: React Three Fiber + STLLoader, lazy-loaded, OrbitControls. File access grants: trust tier 0-3 (24h/2dl, 72h/5dl, 30d/999, 90d/999), atomic download count with FOR UPDATE, download audit log. 13 migration, 52 test hepsi yeşil. Lint temiz.
- **2026-09-23** — Faz 2 tamamlandı (T1-T5). Printers: migration + model (FDM/SLA/SLS, build volume mm), PrinterMaterial (jsonb colors, price_per_gram_minor), PrinterService. Capacity: capacity_slots (DB CHECK constraint reserved<=max), weekly_templates (jsonb schedule), CapacityService with FOR UPDATE row lock (concurrent reservation test green). Catalog: catalog_products (slug unique, allowed_materials jsonb), CatalogService, admin CRUD. Seller Products: seller_products (catalog_product_id nullable, retail_price_minor, margin_bps, status enum), SellerProductService (createFromCatalog/createCustom). UI: 4 yeni sayfa (maker/printers, maker/capacity, admin/catalog, seller/products). 11 migration, 24 test hepsi yeşil.
- **2026-09-23** — Faz 1 tamamlandı (T1-T6). Tasarım altyapısı: Tailwind v4 + shadcn/ui + design tokens (İndigo #312e81 + Lime #84cc16 paleti), 12 UI bileşeni, 3 layout (default/auth/dashboard). Roller: user_roles migration, RoleService, admin seed. Onboarding: seller_profiles + manufacturer_profiles migration, EncryptionService (AES-256-GCM), OnboardingService (FM-XXXX alias), multi-step wizard UI. Politikalar: Seller/Manufacturer/AdminPolicy + OnboardingMiddleware. Transformers: UserTransformer (roller dahil), ManufacturerPublicTransformer (yalnız alias/tier/skor). Güvenlik: e-posta doğrulama, şifre sıfırlama, login rate limiting. Panel UI: 3 rol dashboard iskeleti. ADR'ler (F0-T7): 001-stack, 002-money-model, 003-payment-adapter. 13 test (9 unit + 4 functional) hepsi yeşil. Typecheck + lint temiz.
- **2026-09-23** — Faz 0 tamamlandı (T1-T6). AdonisJS v7 React starter, PostgreSQL (port 5433), Redis, Minio. Paketler: lucid, redis, queue (0.6.2 pinli), drive (S3/R2), bouncer, limiter, mail, transmit, cache. PingJob + unit test. CI workflow. 12 domain klasörü. `@adonisjs/otel` sonraya bırakıldı. Lint/typecheck/test hepsi yeşil.
- **2026-09-22** — Faz 0 kararları alındı (K1–K7). Hafıza: PROJECT_MEMORY.md. Frontend: React+Inertia. Pazar: TR + global. AdonisJS v7 güncel dokümanı incelendi: Node 24 şartı, starter kit'lerde hazır auth, Transformers, Lucid schema class'ları, `@adonisjs/queue` deneysel (sürüm pin). Stripe'ın TR tüzel kişiliğe desteği belirsiz → D1 açık karar, Faz 10 bloke. Roadmap (12 faz) ve tüm fazların pre/post-check'li kırılımı yazıldı. Sıradaki: kullanıcı onayı → Faz 0 prompt'u ile başlangıç.
