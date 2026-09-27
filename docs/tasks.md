# Fabrmatch — Görev Listesi (çalışma defteri)

> Bu dosya **aktif iş listesidir**: sırayla ilerlenir, biten görev işaretlenir. Gerekçeler: `docs/GAP_ANALYSIS.md`.
> Faz kayıtları/log: `docs/PROJECT_MEMORY.md` · Tasarım: `docs/DESIGN.md` · Skill rehberi: `docs/DESIGN_SKILLS.md`.
> Son güncelleme: 2026-09-26

## Nasıl çalışılır (kural)

1. Sıradaki görev = en üstteki **işaretsiz** `[ ]` görev (paket sırası: R0 → R1 → …). Atlama gerekiyorsa nedenini görevin altına yaz.
2. Her görev: kısa plan → migration/model → servis + unit test → controller/validator/transformer → functional test → UI (`docs/DESIGN.md`).
3. Görev **bitti** sayılması için: kabul ölçütleri sağlandı + `node ace test` + `npm run typecheck` + `npm run lint` yeşil.
4. Bitince: burada `[x]` yap, tarih ve kısa not ekle (`✔ 2026-..-..`), `PROJECT_MEMORY.md` Log'a bir satır yaz.
5. İş kuralları ihlal edilmez (`CLAUDE.md`): kimlik gizliliği, kendi siparişini üretememe, keşif kotası, imzalı dosya erişimi, emanet kuralı.
6. Karar bekleyen görev `⏸ karar` ile işaretlidir; karar gelmeden başlanmaz (varsayılan öneri yanında yazılı).
7. Dış bağımlılık gerektirenler `🔒` ile işaretlidir (anahtar/hesap/doküman); o görevde mock/fake ile ilerlenir, gerçek entegrasyon ayrı görevdir.

Gösterim: **P0** zorunlu · **P1** gerekli · **P2** fark yaratan · **P3** ölçek/global. `Ref:` GAP_ANALYSIS kimliği.

---

## Şu anki durum (özet)

- Tamamlanan: Faz 0–4, Faz 5 (fake provider ile; **T2 iyzico bloke**), Faz 6 kısmen, tasarım yenilemesi ~%80.
- 479 test yeşil. **R0 tamam; Dalga 2'de R1-T7 tamam.** **Dalga 2 tamam.** Dalga 3 sürüyor: R2-T3 tamam; Dalga 3'te yalnız R2-T1 (K-H) ve R2-T8 (D3 🔒), **Dalga 4 tamam.** R2-T1 için K-H kararı verildi (yapılacak); sıradaki Dalga 5. Demo veri: `node ace db:seed --files database/seeders/demo_seeder.ts`.
- Bekleyen bloklar: **satış modeli K-L ⏸ + şirket kuruluşu 🔒 (R7, lansman kapısı)**, hosting kararı ⏸, fatura entegratörü K-C ⏸. iyzico ödeme+iade sandbox'ta çalışıyor (R1-T1).
- 2026-09-26 hukuki araştırma: saf pazaryeri modeli üretici anonimliğiyle çelişiyor → öneri Fabrmatch'in satıcı olması (R7).

## Yürütme planı (dalgalar) — sıralama mantığı

Sıralama kuralları: (1) para/güvenlik doğruluğu önce; (2) başka görevlerin **bağımlısı** olan altyapı önce (sayfalama, bildirim, ayar tablosu, sözleşme testleri); (3) dış bağımlılık/karar bekleyen görev **atlanır**, öneriyle ilerlenebilirse varsayılan uygulanır ve görevde notlanır; (4) DB'ye/aynı dosyalara dokunan görevler **seri** (tek koordinatör), yalnız birbirinden bağımsız dokümantasyon/araştırma görevleri **paralel Orca worker'larıyla** (`orchestration` skill; testler aynı test veritabanını paylaştığı için kod görevleri paralel çalıştırılmaz).

| Dalga      | Amaç                                     | Sıra (mantık)                                                                                                                                                                                                                                                                                                                                     | Yürütme                                                     |
| ---------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **1**      | R0 doğruluk                              | R0-T1 ✔ → **R0-T5** sayfalama (T4'ün ön koşulu) → **R0-T4** satıcı siparişleri → **R0-T2** e-posta doğrulama → **R0-T3** iptal+iade (T3b varsayılanı: `in_production` sonrası iptal yok) → **R0-T6** ölü alan → **R0-T7** MoneyInput → **R0-T8** deploy koruması                                                                                  | Seri, koordinatör                                           |
| **1p**     | Paralel araştırma (kod yok)              | **M0-T2** rakip araştırması · **M0-T3** TR anahtar kelime/talep                                                                                                                                                                                                                                                                                   | Orca worker'ları, ayrı çıktı dosyaları (`docs/marketing/…`) |
| **2**      | Platform çekirdeği (dış bağımlılık yok)  | **R1-T7** bildirim (çoğu görevin ön koşulu) → **X-1** adapter sözleşme testleri → **R1-T8** rate limit → **X-7** ledger doğrulama işi → **R3-T2** ayarlar tablosu → **R3-T1** admin kuyrukları → **R3-T4** trust tier → **R3-T5** skor kartı/kazanç → **R1-T4** 2FA                                                                               | Seri                                                        |
| **3**      | Fiyat, ürün ve kargo doğruluğu           | **R2-T3** malzeme/renk kataloğu → **R2-T2** baskı profilleri → **R2-T7** kargo tablosu → **R2-T4** üretici min fiyat (K-B öneri) → **R2-T6** teknoloji seçimi → **R2-T5** çok kalemli sipariş/sepet → **R2-T9** ETA → **R2-T10** DFM → **R2-T11** QC fotoğrafı → **R2-T1** dilimleyici (K-H; makinede OrcaSlicer var, CLI uygunluğu doğrulanacak) | Seri                                                        |
| **4**      | Güven ve operasyon                       | **R3-T3** kullanıcı yönetimi/audit → **R3-T6** yeniden üretim (K-G öneri: evet) → **R3-T7** anonim mesajlaşma → **X-9** tier↔sipariş limiti → **R3-T10** sahtekârlık → **R3-T11** dosya güvenliği → **X-2/X-3/X-4/X-5** bayraklar, idempotency, sipariş sağlık görünümü, kuyruk paneli → **R3-T8** metrik paneli → **R3-T9** gözlemlenebilirlik   | Seri                                                        |
| **5**      | Pazarlama altyapısı (ürün hazır oldukça) | M0-T4 (karar) → **M1-T1** landing/bekleme listesi → **M1-T2** UTM/olay → **M1-T4** üretici gelir hesaplayıcı → **M2-T1** kayıtsız fiyat aracı → M2-T2..T5 → M3 → M4                                                                                                                                                                               | Seri + paralel içerik                                       |
| **6**      | Satıcı büyümesi                          | R4-T6 mockup → R4-T7 → R4-T8 → R4-T9 → R4-T10 → R4-T1..T5 (Shopify/Etsy; K-E) → R4-T11..T13                                                                                                                                                                                                                                                       | Seri                                                        |
| **7**      | Lansman sağlamlaştırma                   | R5-T4 e2e → R5-T5 i18n → R5-T6 → R5-T3 → R5-T7/T8 → R5-T1/T2 (D4)                                                                                                                                                                                                                                                                                 | Seri                                                        |
| **8**      | Global/kurumsal                          | R6-*                                                                                                                                                                                                                                                                                                                                              | Seri                                                        |
| **Bloklu** | Dış bağımlılık/karar                     | **R7 hukuki/mali yapı (K-L, şirket 🔒)** · R1-T1 iyzico pazaryeri aktivasyonu (yalnız K-L=A ise) 🔒 · R1-T2 vergi (K-A) · R1-T3 fatura (K-C) 🔒 · R1-T5/T6 KVKK+yasal (D5) · R2-T8 kargo API (D3) 🔒 · R4-T1/T2 (K-E) · R5-T1/T2 (D4) · R6-T1 (D1)                                                                                                | Karar/anahtar gelene kadar bekler                           |

Bloklu görevlerin **hazırlık işleri** bloklanmaz: arayüz/adapter + Fake implementasyon, veri modeli ve testler önden yapılabilir (ör. R1-T2 vergi alanları K-A öneriyle taslak, R1-T5 export/silme servisleri metinsiz).

Durum takibi: her dalga bitince bu tablonun satırına ✔ ve tarih yazılır.

---

## R0 — Doğruluk düzeltmeleri (bağımsız, hemen başlanabilir)

Amaç: bilinen hataları kapat, para hesabını ve akışları doğru hale getir.

- [x] **R0-T1 Komisyon tek kaynaktan gelsin** · P0 · `Ref: B1` · ✔ 2026-09-23 (`price_engine` varsayılanı `config.pricing.commissionBps`; testli; 190 test)
  - `calculatePrice` komisyon oranını `config/fabrmatch.ts`'ten okusun (varsayılan parametre yerine enjekte); vitrin ve sipariş aynı değeri kullansın.
  - Kabul: config `commissionBps` değişince `unitPrice` değişir (unit test); eski testler yeni orana göre güncellenir; `platformFeeMinor` sipariş toplamıyla tutarlı (mevcut split testi yeşil).
  - Öneri: oranı hem `config` hem ileride admin `settings` (R3-T2) için tek bir `PricingConfig` servisinden ver.
- [x] **R0-T2 E-posta doğrulaması zorunlu** · P0 · `Ref: B3` · ✔ 2026-09-23 (`verified` middleware: shop/orders/pay/dispute/onboarding profile; payout doğrulanmamış lehtara pending; banner + resend; fixtures/seeder doğrulanmış; 204 test)
  - `verified` middleware: sipariş oluşturma/ödeme, üretici kaydı, dispute açma ve payout için `emailVerifiedAt` şart; gezinme serbest.
  - Doğrulanmamış kullanıcıya üst çubukta "E-postanı doğrula" bandı + yeniden gönder butonu.
  - Kabul: doğrulanmamış kullanıcı `POST /orders` → yönlendirme + mesaj (functional test); doğrulanmış geçer; demo seeder kullanıcıları doğrulanmış işaretlenir.
- [x] **R0-T3 Ödeme sonrası iptal + otomatik iade** · P0 · `Ref: B4` · ✔ 2026-09-23 (paid/matching/unmatched → cancelled; escrow→refund obligation aynı trx; bekleyen teklifler expire; `unmatched` 3 gün sonra `CancelStaleUnmatched` sweep; UI "Cancel and refund"; 8 test; T3b varsayılanı uygulandı: `in_production` sonrası iptal yok)
  - Durum makinesi: `paid`, `matching`, `unmatched` → `cancelled` (yalnız üretici atanmadan önce). Alıcı butonu: "Cancel and refund".
  - `unmatched` N gün (config, öneri 3) sonra otomatik iptal+iade; sweep job.
  - Yan etki: `recordRefundObligation` + `settleRefunds`, ledger dengeli, audit kaydı, bildirim (R1-T7 gelene kadar e-posta).
  - Kabul: iptal sonrası escrow 0, provider refund çağrısı tek sefer (idempotent), trial balance 0; `in_production` sonrası iptal reddedilir (R0-T3b kararına kadar).
- [x] **R0-T3b İptal politikası kuralları** · P1 · ✔ varsayılan uygulandı (öneri: `in_production` sonrası iptal yok → dispute yolu); ücretli iptal politikası R3-T2 ayarlarıyla ileride · `Ref: L8` · ⏸ karar (öneri: `in_production` sonrası iptal yok → dispute yolu)
- [x] **R0-T4 Satıcı sipariş listesi** · P1 · `Ref: B7` · ✔ 2026-09-23 (`/seller/orders`, `OrderTransformer.forSeller`, status filtresi, JSON tarama testi, functional test)
  - `/seller/orders` (sayfalı, durum filtresi): kod, durum, tarih, kazanç. **Üretici bilgisi yok** (kural 1); transformer testi (JSON tarama).
  - Kabul: yalnız kendi ürünlerinin siparişleri (başka satıcınınki 404); sayfa EmptyState + StatusBadge kullanır.
- [x] **R0-T5 Sayfalama altyapısı** · P1 · ✔ 2026-09-23 (`pagination.ts`, `<Pagination>`, orders/files/admin disputes; 4 test)
  - Ortak `paginate` yardımcı + `<Pagination>` bileşeni; `/orders`, `/files`, `/admin/disputes`, `/seller/orders` uygular.
  - Kabul: sayfa boyutu üst sınırlı (≤50), `page` doğrulanır; unit test.
- [x] **R0-T6 Ölü/yanıltıcı alan temizliği** · P1 · ✔ 2026-09-23 (migration: `model_file_key`, `retail_price_minor` kaldırıldı; form artık "Your margin (%)" soruyor)
  - `catalog_products.model_file_key` kaldır (migration); `seller_products.retail_price_minor` formdan ve UI'dan çıkar (fiyat hesaplanıyor) — alan DB'de kalabilir ama kullanılmaz ya da kaldırılır.
  - Kabul: ürün oluşturma formunda kuruş girişi yok; test ve seeder uyumlu.
- [x] **R0-T7 Formlar gerçek para girişi** · P1 · ✔ 2026-09-23 (`MoneyInput` + `parseMoneyToMinor` saf string aritmetiği; yazıcı malzeme fiyatı TL girişi; 3 test)
  - Elle "kuruş" girilen alanlar (`Price per gram (kuruş)`, vb.) TL girişine çevrilsin (görüntü TL, sunucu minor); tek `MoneyInput` bileşeni.
  - Kabul: kullanıcı "0,60" yazar, DB'ye 60 gider; float toplama yok (string→minor dönüşümü testli).
- [x] **R0-T8 Deploy güvenlik ön kontrolü** · P1 · ✔ 2026-09-23 (`assertPaymentConfigured` + boot preload `start/payment_guard.ts`; `docs/DEPLOY_NOTES.md`; 4 test)
  - Üretimde `PAYMENT_PROVIDER=fake` veya secret yokken açılışta net hata + `docs/` deploy notu; `.env.example` güncel; demo seeder yalnız dev (zaten).
  - Kabul: `NODE_ENV=production` + fake → uygulama başlamaz (test).

Paket çıkış ölçütü: R0 görevlerinin hepsi `[x]`, test sayısı arttı, `GAP_ANALYSIS.md` B1/B3/B4/B7 "kapandı" işaretlendi.

---

## R1 — Para, yasal ve bildirim temeli

- [x] **R1-T1 iyzico adapter + alt üye işyeri (Faz 5 T2)** · P0 · ✔ 2026-09-26 ödeme+iade canlı sandbox'ta, pazaryeri kodu bayrak arkasında `Ref: P1, P2`
  - Yapıldı: `IyzicoClient` (IYZWSv2 imza, SDK yok, alanlar docs.iyzico.com'dan), `IyzicoPaymentProvider` (Checkout Form initialize → `POST /payments/return` [CSRF'siz, oturumsuz; `StatelessReturnMiddleware` Set-Cookie'yi siler ki alıcının oturumu düşmesin] → CF retrieve ile doğrulama, webhook V3 imzası + retrieve, aynı olay kimliği ile tek uygulama), v2 iade (`payment_provider_calls` ile anahtar başına tek çağrı), `SyncPendingPayments` 5 dk'da bir sekmeyi kapatan alıcıların ödemesini çözer, `apply()` artık para birimini de doğrular (F5-T8 açık maddesi kapandı). Ödeme adımında TCKN (sağlama algoritmasıyla, saklanmaz) + adreste telefon yoksa cep telefonu; vitrin/teklif/satıcı numune formlarına telefon alanı. Registry `PAYMENT_PROVIDER=iyzico`; üretimde sandbox ve pazaryerisiz iyzico reddedilir.
  - Pazaryeri (`IYZICO_MARKETPLACE=true`, hesapta henüz kapalı — sandbox `2000`): sepet kalemleri önce `IYZICO_PLATFORM_SUBMERCHANT_KEY`'e, ödeme serbest bırakılırken `PUT /payment/item` ile üreticinin/satıcının alt üyesine ve payına taşınır, sonra `item/approve` (onaylıysa atlanır). Alt üye anahtarları `payment_sub_merchants`. Sahte HTTP taşıyıcıyla test edildi.
  - Sandbox'ta elle doğrulandı (2026-09-26): initialize, test kartıyla ödeme, callback POST (token), retrieve (tutar/para birimi), kısmi iade + tekrar denemede tek iade, reddedilen kart `FAILURE` şekli.
  - KALAN: (1) iyzico'dan pazaryeri ürününün ve webhook imzasının (X-IYZ-SIGNATURE-V3) açılması + panelde bildirim URL'si; (2) alt üye onboarding formu (IBAN/TCKN/vergi dairesi/adres — `DbSubMerchantDirectory.details` şimdilik reddeder) ve eligibility'de "alt üyesi onaylı olmayan üretici eşleşmez"; (3) iyzico mutabakat raporu (F5-T2).
- [x] **R1-T2 Vergi modeli** · P0 · ✔ 2026-09-24 kısmen (K-A önerisi: KDV dahil gösterim. `tax_rates` [TR %20], `splitGross` [yarım yukarı yuvarlama, net+vergi=brüt property testi], sipariş `tax_rate_bps/tax_minor`, sepet ve sipariş ekranında "KDV dahil" satırı. KALAN: ledger `tax_payable` hesabı ve komisyon KDV'sinin ayrımı [fatura modeli K-C/D5 ile], AB oranları) · `Ref: P3`
  - `tax_rate_bps`, `tax_minor`, `prices_include_tax`; ülke bazlı oran tablosu; ledger'da `tax_payable` hesabı; checkout'ta net/vergi/brüt dökümü.
  - Kabul: toplam = net + vergi tam tamsayı (yuvarlama kuralı belgeli); ledger dengeli; property testi.
  - Öneri: TR'de KDV dahil gösterim; komisyon üzerindeki KDV ayrı satır.
- [x] **R1-T3 Fatura/e-arşiv** · P0 (TR) · ✔ 2026-09-24 çerçeve (K-C önerisi: platform yalnız komisyon faturası. `invoices` + yıllık boşluksuz numara, `InvoiceProvider` arayüzü + Fake, tamamlanan siparişte saatlik `IssueInvoices` süpürmesi [idempotent, sağlayıcı arızasında yeniden gönderir], `/orders/:id/invoice` yazdırılabilir sayfa. KALAN: gerçek e-arşiv entegratörü 🔒, fatura muhatabı ve komisyon KDV'si D5) `Ref: P4`
  - Sipariş `completed` → fatura kaydı (`invoices`), PDF/özet indirme; entegratör adapter arayüzü (Fake ile başla).
  - Öneri: platform yalnız komisyon faturası keser; üretici/satıcı kendi faturasını keser (aracı hizmet modeli — D5 hukuki teyit).
- [x] **R1-T4 2FA (TOTP) + oturum yönetimi** · P0 · ✔ 2026-09-24 (RFC 6238 TOTP kendi kodumuz, RFC vektörleriyle test; yedek kodlar; giriş 2. adımı + 5/15dk limit; admin paneli 2FA'sız kapalı [`ADMIN_2FA_REQUIRED`, testte kapalı]; `/account/security`: şifre değiştir, oturum listesi, tek/tüm oturumu kapat; şifre sıfırlama/değiştirme oturumları düşürür. Kalan: QR görseli, e-posta ile giriş bildirimi) · `Ref: G1`
  - Admin için zorunlu, üretici/satıcı için isteğe bağlı; yedek kodlar; aktif oturum listesi + "tüm cihazlardan çık"; şifre değişince oturumlar düşer.
  - Kabul: 2FA'sız admin girişi engellenir; brute-force limiti; testler.
- [x] **R1-T5 KVKK/GDPR temeli** · P0 · ✔ 2026-09-24 mekanizma (`/account/privacy`: JSON dışa aktarım [şifreli alanlar çözülür, başkasının verisi yok — test], hesap silme [PII silinir, defter/audit/sipariş tutarları kalır, devam eden iş/payout varken reddedilir, dosyalar silinir], `consents` tablosu + sürümlü kayıt. KALAN: çerez bildirimi ve kayıt/checkout'ta rıza kutuları metinleri D5 hukuk kararıyla) · `Ref: G2`
  - Kullanıcı verisi dışa aktarma (JSON), hesap silme talebi (PII anonimleştirme; ledger/audit korunur), rıza kayıtları (`consents`), çerez bildirimi.
  - Kabul: silinen kullanıcının PII'ı yok, siparişler anonim; export dosyası şifreli alanları çözer ama başkasının verisini içermez.
- [x] **R1-T6 Yasal sayfalar ve checkout onayı** · P0 · ✔ 2026-09-24 mekanizma (`/legal/:slug` 4 belge [terms, privacy, distance-sales, refunds] TASLAK olarak işaretli ve gerçek ürün kurallarını anlatır; `LEGAL_ACCEPTANCE_REQUIRED` açılınca sepet/quote/vitrin checkout'ta sürümlü onay kutusu + `consents` kaydı. KALAN: uzman metni D5, sonra bayrak açılır) · `Ref: G3`
  - Mesafeli satış, iade/iptal, gizlilik, üyelik sözleşmesi sayfaları; checkout'ta sürümlü onay (`legal_acceptances`).
- [x] **R1-T7 Bildirim sistemi (e-posta + uygulama içi)** · P0 · `Ref: N1, N2, N5` · ✔ 2026-09-24 (`notifications` + `notification_preferences`; 13 tür, rol bazlı metin kataloğu; idempotent `notify`; `OrderNotifier` domain olaylarına bağlı (ödeme, teklif, üretimde, kargo, teslim, tamam, iptal, iade, payout, dispute ×3); `SendNotificationEmail` job + `NotificationMail`; zil + `/notifications` + tercihler; Transmit kanal yetkisi hazır, canlı push R3'te (şimdilik 60 sn yenileme); 4 e-posta şablonu marka kimliğinde; anonimlik yaşam döngüsü testi; 228 test)
  - `notifications` tablosu, olay→şablon eşlemesi: ödeme alındı, eşleşti, üretimde, kargoda (takip no), teslim, dispute açıldı/yanıtlandı/karar, payout ödendi, iptal/iade.
  - Kuyrukla gönderim (idempotent, olay id ile tekilleştir); kullanıcı tercih ekranı; üst çubukta zil + okunmamış sayacı; Transmit ile canlı.
  - E-posta şablonları marka kimliğinde (`brand` + DESIGN.md): mevcut 4 şablon da yenilenir.
  - Kabul: her durum geçişi doğru alıcıya doğru bildirimi üretir (alıcıya üretici kimliği sızmaz — JSON/HTML tarama testi).
- [x] **R1-T8 Rate limit genişletme** · P1 · ✔ 2026-09-24 (`throttle` middleware: signup, upload-url, register, quote, order, dispute, evidence, webhook; testte yalnız `test:` kovaları uygulanır; yükleme boyut/kota kontrolü ayrı) · `Ref: G4`
  - Kayıt, dosya yükleme, sipariş oluşturma, dispute/evidence ve webhook uçlarına limiter; yüklemede kullanıcı başı kota/boyut.
- [x] **R1-T9 Chargeback → dispute köprüsü** · P1 · ✔ 2026-09-24 (`chargeback.opened` webhook'u → `chargebacks`; açıkken payout bloklu [tahsis ve bekleyenler]; admin kuyruğunda "We won/lost"; kayıpta escrow nakit çıkışı olarak yazılır, ledger dengeli, mutabakat tutar) · `Ref: P6`
  - Provider chargeback/ödeme itirazı olayı admin kuyruğuna düşer ve emanet/payout'u bloklar.

Paket çıkış ölçütü: gerçek ödeme sandbox'ta uçtan uca; vergi+fatura kaydı; 2FA; bildirimler; yasal sayfalar.

---

## R2 — Fiyat doğruluğu ve kargo

- [x] **R2-T1 Dilimleyici tabanlı tahmin (worker)** · P0 · ✔ 2026-09-24 çerçeve (K-H: açık kaynak CLI. `Slicer` arayüzü + `CliSlicer` [Orca/Prusa, G-code özeti ayrıştırma] + sahte dilimleyici; `slice_estimates` (bayt hash + profil) önbelleği; `SliceModelFile` job'u analiz sonrası; fiyat/kapasite/kargo/ETA slicer sonucunu kullanır, hata/yoksa sezgisel yedek. `SLICER_DRIVER=orca` + `SLICER_BIN` + `SLICER_PROFILES_DIR`. KALAN: hedef makinede profil seti kurulumu [Orca CLI'ı kendi profil JSON'larımızla `run found error` veriyor; GUI'den dışa aktarılan tam profillerle denenecek], destek malzemesi ayrımı, sapma metriği [üretici gerçek süre girişi]) · `Ref: T1`
  - Başsız dilimleyici (PrusaSlicer/OrcaSlicer CLI) profil bazlı: gram, süre, destek; sonuç `slice_estimates` (sha256+profil ile önbellek); job kuyruğu.
  - Sezgisel formül yalnız yedek; fiyat/kapasite dilimleyici sonucunu kullanır. Tahmin sapması metriği (üretici gerçek süre girişiyle kıyas).
  - Kabul: aynı dosya+profil önbellekten döner; dilimleme hatasında kullanıcıya net mesaj ve yedek tahmin; testler sahte dilimleyiciyle.
- [x] **R2-T2 Baskı profilleri** · P1 · ✔ 2026-09-24 (`print_profiles` + `printer_print_profiles`, `order_items.print_profile_id`; profil infill/süre çarpanı fiyatı etkiler; eşleştirme yalnız profili beyan eden yazıcılara; `/admin/profiles`, maker seçici, quote'ta kalite seçimi; profilsiz sipariş eskisi gibi) · `Ref: T5`
  - `print_profiles` (teknoloji, malzeme, katman, dolgu, son işlem); sipariş kalemi profile bağlı; üretici hangi profilleri sunduğunu işaretler; eşleştirme profil bazlı.
- [x] **R2-T3 Malzeme/renk referans kataloğu** · P1 · ✔ 2026-09-24 (`materials`/`colors` + `/admin/materials`; üretici seçimi kataloğa ve teknolojiye bağlı, kanonikleştirilir; mevcut veriler migration'da taşındı) · `Ref: T7`
  - `materials`, `colors` tabloları (admin yönetir); üretici serbest metin yerine seçim yapar; mevcut veriler migrate edilir.
- [x] **R2-T4 Üretici minimum fiyatı** · P1 · ✔ 2026-09-24 (üretici malzeme başı gram fiyatı platform referansını aşarsa eşleşmez; printers sayfasında "X sipariş kaçırdın" ipucu) · ⏸ K-B (öneri: platform fiyatı + üretici min) · `Ref: B2`
  - Üretici malzeme başına `min_price_per_gram`; platform fiyatı altındaysa eligibility'den elenir; üretici panelinde "bu fiyatla X sipariş kaçırdın" ipucu.
- [x] **R2-T5 Çok kalemli sipariş + sepet** · P1 · ✔ 2026-09-24 (`priceOrder`: tek koli kargo, ağırlığa göre kalem payı, tek teknoloji kuralı, sepet önizleme = gerçek sipariş; `cart_items` + `/cart`, quote'ta "Sepete ekle"; eşleştirme/dosya erişimi tüm kalemler için. Kalan: "tekrar sipariş", misafir sepeti [karar: yalnız üye], kalem başı vergi K-A) · `Ref: B6, U6`
  - Kalem bazlı pay/komisyon/vergi saklama; aynı teknoloji kalemleri tek üreticiye; sepet (oturum → üye), "tekrar sipariş".
  - Kabul: split toplamı tam; ledger property testi çok kalemle; eligibility toplam süre/hacimle çalışır.
- [x] **R2-T6 Teknoloji seçimi (FDM/SLA/SLS) UI + eşleştirme** · P1 · ✔ 2026-09-24 (kalite profili teknolojiyi belirler; quote'ta malzeme listesi teknolojiye göre süzülür; uyumsuz malzeme/profil siparişte reddedilir; SLA siparişi yalnız SLA yazıcıya) · `Ref: B6`
- [x] **R2-T7 Kargo fiyatı (bölge/ağırlık)** · P0 · ✔ 2026-09-24 (`shipping_zones/rates`, `ShippingTable` [ambalaj + hacimsel ağırlık, üst dilim kg başı], sipariş/vitrin/quote aynı tablo, `/admin/shipping`; fiyatlar YER TUTUCU → D3 taşıyıcı sözleşmesi) · `Ref: L1`
  - Bölge × ağırlık/hacimsel ağırlık tablosu; sabit 50 TL kalkar; sipariş/vitrin/quote aynı fonksiyonu kullanır.
- [x] **R2-T8 Kargo etiketi + takip entegrasyonu** · P1 · ✔ 2026-09-24 Fake ile (`CarrierProvider` arayüzü + `FakeCarrier`; `/webhooks/carrier` imzalı, olay id ile tekilleştirilir, `delivered` → sipariş otomatik teslim; etiket göndericisi yalnız "Fabrmatch Fulfillment / alias"; üretimde gerçek sağlayıcı yoksa açılmaz. KALAN: gerçek taşıyıcı D3 🔒, etiket için maker arayüzü · `Ref: L2`
  - Adapter arayüzü (Fake ile başla), takip webhook'u → otomatik `shipped/delivered`; gerçek taşıyıcı ayrı görev.
- [x] **R2-T9 Teslim tahmini (ETA)** · P1 · ✔ 2026-09-24 (`EtaService`: ilk uygun kapasite slotu + SLA + bölge transit günü [yer tutucu]; quote ve sepette aralık gösterilir, yer yoksa "eşleşince netleşir". Kalan: checkout/ürün sayfası, sapma uyarısı) · `Ref: L3`
  - ETA = kapasite slotu + baskı süresi + SLA + kargo süresi; ürün sayfası ve checkout'ta göster; sapmada uyarı.
- [x] **R2-T10 DFM analizi** · P1 · ✔ 2026-09-24 (`dfm_analyzer`: çok ince=engel, ince/küçük/ters normal/çıkıntı>%10/kopuk parça=uyarı, çoklu gövde=bilgi; `model_files.dfm_issues`; quote sayfasında net mesaj; duvar kalınlığı bbox yaklaşımı, gerçek ray-cast R2-T1 ile) · `Ref: T2`
  - Duvar kalınlığı, overhang, yüzen parça, ters normal; seviyeler (bilgi/uyarı/engel); quote'ta net mesaj.
- [x] **R2-T11 Kalite/güven: sevkiyat öncesi QC fotoğrafı** · P1 · ✔ 2026-09-24 (`job_qc_photos`, presigned yükleme + tür/boyut doğrulama, en az 1 foto olmadan `shipped` yok; dispute açılınca fotoğraflar otomatik delil; maker UI'da yükleme) · `Ref: L7`
  - `shipped` için en az 1 fotoğraf (presigned yükleme, boyut/tür doğrulama); dispute'ta otomatik delil.

---

## R3 — Operasyon ve güven

- [x] **R3-T1 Admin kuyrukları** · P0 · ✔ 2026-09-24 (`/admin/queues`: bekleyen üretici onayı [yoksa üretici hiç teklif alamıyordu], unmatched + admin re-match, SLA aşımı, payment review, reconcile; dashboard sayaç. Kalan: SLA-kritik işte manuel yeniden atama, elle üretici atama) · `Ref: A1, A5`
  - `unmatched`, SLA aşımı, `payment.needs_review`, reconcile farkları, bekleyen üretici onayı; dashboard'da kırmızı sayaçlar; manuel atama/yeniden eşleştirme.
- [x] **R3-T2 Ayarlar tablosu + admin ekranı** · P1 · ✔ 2026-09-24 (`settings` tablosu, `SettingsService` + 30sn sync preload, `/admin/settings`, audit'li; iptal politikası ücreti hariç) · `Ref: A2`
  - Komisyon, keşif oranı, teklif süresi, otomatik onay günü, iptal politikası; değişiklik audit'li; `config` yalnız varsayılan.
- [x] **R3-T3 Kullanıcı/üretici yönetimi + audit görünümü** · P1 · ✔ 2026-09-24 (`/admin/users` arama+rol+durum, askıya alma [giriş engeli, oturumlar düşer, üretici eşleşmez, audit'li], `/admin/audit` eylem ailesi/konu/aktör/tarih; tier işlemleri `/admin/makers`'ta) · `Ref: G8`
  - Arama, askıya alma, tier düşürme/yükseltme, audit log arama.
- [x] **R3-T4 Trust tier otomatik hesabı** · P0 · ✔ 2026-09-24 (`TrustTierService.computeTier` + gece job'ı, eşikler `settings` (grup 'trust'), admin sabitleme/kilit açma `/admin/makers`, tier 3 yalnız admin, audit + `suspicious` bayrağı; `MakerStatsService` eşleştirmeyle paylaşılır) · `Ref: M1`
  - Tamamlanan iş, puan, zamanında oran, dispute oranından tier hesabı (gece job'ı) + admin geçersiz kılma; tier → dosya erişim süreleri zaten bağlı.
  - Kabul: kurallar tabloya bağlı ve testli; ani düşüş/yükselişte audit.
- [x] **R3-T5 Üretici skor kartı + kazanç ekranı** · P1 · ✔ 2026-09-24 (`/maker/performance`: aynı istatistikler + sonraki tier gereksinimleri; `/maker/earnings`: bekleyen/ödenen/aylık + sayfalı payout listesi, alıcı bilgisi yok) · `Ref: M2, P9`
- [x] **R3-T6 Yeniden üretim (reprint) akışı** · P1 · ✔ 2026-09-24 (K-G: evet; dispute kararı `reproduce`: iş iptal [`cancel_reason`], emanet aynen, sipariş yeniden eşleştirmede, önceki üretici teklif almaz ve ödenmez, dosya erişimi biter, dispute ilk üreticinin kaydına yazılır; siparişte 1 kez) · `Ref: L4`
  - Dispute kararı `reproduce`: mevcut iş iptal, emanet korunur, aynı sipariş yeni eşleştirme (önceki üretici hariç), ilk üreticinin puanı/ödemesi kurala göre.
- [x] **R3-T7 Anonim mesajlaşma** · P1 · ✔ 2026-09-24 (`order_messages`; alıcı↔üretici yalnız "Buyer/Maker" etiketiyle; telefon/e-posta/link/IBAN/sosyal hesap maskelenir, orijinal şifreli, yalnız admin `/admin/orders/:id/messages`; üretim başlayınca açılır, bildirim, okundu, 20/10dk limit) · `Ref: M7`
  - Sipariş bazlı; iletişim/link/telefon filtresi (platform atlatmayı engeller); kural 1 korunur; admin okuyabilir.
- [x] **R3-T8 Metrik paneli** · P1 · ✔ 2026-09-24 (`/admin/metrics`: GMV, komisyon, tamamlanan, eşleşmeyen, medyan eşleşme süresi, teklif kabul, dispute oranı, yeni üretici payı, günlük GMV grafiği; 7/30/90 gün) · `Ref: A3`
  - PRD §15 ölçütleri: eşleşme süresi, kabul oranı, dispute oranı, yeni üretici payı; GMV, komisyon geliri (dataviz skill'i).
- [x] **R3-T9 Gözlemlenebilirlik** · P1 · ✔ 2026-09-24 kısmen (`/health` 200/503; alarmlar: kuyruk birikimi, başarısız job, takılı zamanlama, 10 dk'yı aşan işlenmemiş webhook; 5 dk'lık job değişimde error log + audit yazar. OpenTelemetry `@adonisjs/otel` 1.2.3 core 7 ile uyumlu doğrulandı ama kurulum + dışa aktarım adresi hosting kararı D4 ile) · `Ref: A6`
  - OpenTelemetry (uyumluluk kontrolü), hata izleme, kuyruk derinliği/webhook gecikmesi alarmı, sağlık ucu.
- [x] **R3-T10 Sahtekârlık kural motoru (basit)** · P1 · ✔ 2026-09-24 (`FraudService`: yeni hesap+yüksek tutar ve alıcı/satıcı aynı adres = HOLD [eşleşme admin kararına kadar başlamaz]; ortak adreste çok hesap, sipariş hızı = review; `fraud_flags`, admin kuyruğunda "Looks fine"/"Reject and refund"; eşikler ayarlarda. Kart parmak izi kuralı iyzico ile) · `Ref: G5`
  - Yeni hesap + yüksek tutar → manuel inceleme; aynı kart/IP çoklu hesap; admin kuyruğu.
- [x] **R3-T11 Dosya güvenliği** · P1 · ✔ 2026-09-24 (yüklemede imza taraması: çalıştırılabilir/betik/EICAR/yanlış format reddi → dosya bloke; "Report this listing" + admin kuyruğunda Block/Dismiss; bloklu model sipariş, vitrin ve indirmeden düşer. 2026-09-26: ClamAV `scanUpload()` içinde (CLAMAV_HOST, kapalı başarısızlık), katı yapı/polyglot/zip bombası kontrolleri, octet-stream+attachment imzalı URL'ler, arayüzde tarama paneli — bkz. SECURITY.md; içerik politikası sayfası metni D5 hukuk kararıyla) · `Ref: G6`
  - Yüklemede zararlı içerik taraması, içerik politikası, "şikâyet et" akışı.

---

## R4 — Satıcı büyümesi (Printify çekirdeği)

- [x] **R4-T1 Shopify entegrasyonu** · P1 · ✔ 2026-09-27 satıcının kendi uygulamasıyla (Printify modeli, kullanıcı kararı) `Ref: S1`
  - Bağlantı: mağaza adresi + Dev Dashboard uygulamasının Client ID/Secret'ı. 1.1.2026'dan beri Shopify admin'de yeni özel uygulama/token açılmıyor; 24 saatlik token client-credentials ile alınıyor ve süresi dolmadan yenileniyor. Eski admin tokenı da kabul ediliyor.
  - Bilgiler canlı çağrıyla doğrulanır, şifreli saklanır. `ORDERS_PAID` webhook'u otomatik kurulur; webhook client secret ile HMAC doğrulanır.
  - Yayınlama: `productSet` (Material seçeneği, malzeme başına varyant, fiyat, `FM-<ürün>-<malzeme>` SKU, `inventoryPolicy: CONTINUE`, görseller APP_URL https ise). Yeniden yayınlama aynı ürünü günceller.
  - Takip: `fulfillmentOrders` → `fulfillmentCreate` (trackingInfo, müşteriye bildirim).
  - Gerçek bir Shopify mağazasında henüz denenmedi (bellek içi Admin API taklidiyle test edildi).
  - OAuth uygulaması, HMAC doğrulamalı webhook (orders/create, app/uninstalled), idempotent `external_orders`.
- [x] **R4-T2 Satıcı cüzdanı / taban maliyet tahsilatı** · P1 · ✔ 2026-09-27 K-E varsayılanıyla (cüzdan; kayıtlı kart sonraya)
  - `/seller/wallet`: bakiye yükleme mevcut ödeme yolundan geçer (iyzico / yerel test kartı, aynı idempotent webhook/dönüş). 100–100.000 TRY.
  - Defterde `seller_wallet` (kullanıcı bazında `wallet_user_id`, DB kısıtı).
  - Bakiyeden ödeme: kullanıcı başına kilit, aynı para iki siparişe harcanamaz (test).
  - Mağaza siparişleri bakiye yeterse otomatik ödenir (anahtar, varsayılan açık); sipariş sayfasında "Bakiyeden öde".
  - Bakiyeden ödenen siparişin iadesi karta değil cüzdana döner.
  - Mutabakat: kullanıcı bazında negatif cüzdan kontrolü; cüzdanla ödenen siparişlerde sahte nakit alarmı yok.
  - Yalnız satış modeli B'de (pazaryerinde kapalı).
  - ⚠ D5: bakiye yalnız Fabrmatch'in kendi hizmetinde harcanan avans olarak tasarlandı (6493 kapsamı dışı kalması için para çekme / başkasına devir yok). Avukat teyidi gerekli.
  - Bakiye iadesi ✔ (satıcı self-servis): kalan bakiye geldiği kartlara en yeni yüklemeden başlayarak iade edilir. Anahtar yükleme + önceki iadeden türetildiği için yeniden deneme çift iade yapmaz. Bakiye varken hesap silinemez.
  - Mağaza ürün listesi sayfalamalı: Shopify cursor, Woo sayfa.
  - KALAN: kayıtlı kart.
- [x] **R4-T3 SKU eşleme ekranı** · P1 · ✔ 2026-09-27 çekirdek (`flags.externalStores` KAPALI)
  - `store_connections` (token/secret şifreli), `external_listings`; `/seller/stores`'ta mağazanın her varyantı kendi ürününe + malzeme/renk/boyuta bağlanır (sahiplik, izinli malzeme/ölçek kontrollü).
  - Sipariş webhook'u (`/webhooks/stores/:id/orders`, mağaza başına HMAC, CSRF'siz) dış sipariş id'si başına bir kez kaydedilir.
    - Eşleşmemiş satır varsa `needs_mapping` ile bekler; eşleme yapılınca kendiliğinden sipariş olur.
    - Oluşan sipariş: alıcı = satıcı, kanal shopify/etsy, marj 0, gönderim müşteriye.
  - Satıcı üretim maliyetini sipariş başına öder. K-E (cüzdan/kayıtlı kart) gelene kadar ara çözüm.
  - `StoreAdapter` arayüzü + `FakeStoreAdapter` (yalnız dev/test "test mağazası") + sözleşme testi. Shopify/Etsy adaptörleri R4-T1/T5'te bu sözleşmeyi geçecek.
- [x] **R4-T4 Fulfillment geri yazımı** (takip no + durum) · P1 · ✔ 2026-09-27 çekirdek
  - Üretici kargoladığında dış sipariş `pending` olur; `PushStoreFulfillments` 5 dk'da bir takip numarasını mağazaya yazar (adaptör tekrarı güvenli).
  - Hata → deneme sayısı; 10 denemede `failed`, satıcı "Tekrar dene" diyebilir.
  - KALAN: gerçek Shopify/Etsy çağrıları (R4-T1/T5 🔒).
- [x] **R4-T5 Etsy entegrasyonu** (OAuth2 PKCE + periyodik çekme) · P2 · ✔ 2026-09-27 kod hazır. 🔒 Canlı için Etsy uygulama onayı (keystring + shared secret) gerekiyor.
  - Alanlar Etsy'nin yayımladığı OpenAPI şemasından alındı.
  - Bağlantı: "Etsy ile bağlan" (OAuth2 + PKCE; state ve verifier oturumda). 1 saatlik token, 90 günlük refresh token ile yenilenir. `x-api-key: keystring:shared_secret`.
  - Yayınlama: draft listing (kategori seçimi Etsy taxonomy araması ile; mağazanın ilk kargo ve hazırlık profilleri kullanılır) → inventory (malzeme başına ürün, özel özellik 513) → görsel yükleme → active. Satıştan kaldırma: `inactive`.
  - Siparişler: webhook yok. `PollStoreOrders` 5 dk'da bir ödenmiş receipt'leri ve iptalleri çeker (örtüşme penceresi, dış id ile tekilleştirme).
  - Takip: `createReceiptShipment`.
  - Sözleşme testi webhook'suz platformları da kapsıyor; Etsy bellek içi Open API ile geçiyor.
  - Kurulum: `ETSY_KEYSTRING`, `ETSY_SHARED_SECRET`; Etsy'ye kaydedilecek callback URL: `<APP_URL>/seller/stores/etsy/callback`.

- [x] **R4-T14 WooCommerce entegrasyonu** · P1 · ✔ 2026-09-27
  - Site URL + Consumer key/secret (Okuma/Yazma); SSRF korumalı https istemci.
  - `order.created` + `order.updated` webhook'ları kendi gizli anahtarımızla kurulur. İmza base64 HMAC-SHA256; yalnız `processing`/`completed` siparişler alınır; kurulum ping'i yok sayılır.
  - Yayınlama: değişken ürün + Material özniteliği + varyasyon batch'i. Takip: müşteriye görünen sipariş notu + `completed`.
  - Kanal `woocommerce`.
  - Gerçek bir WooCommerce sitesinde henüz denenmedi.
- [x] **R4-T6 Mockup/render üretimi** · P1 · ✔ 2026-09-26 (sunucuda bağımlılıksız render: `model_renderer.ts` z-buffer, 8 açılı döner tabla, yan yüzlerde katman çizgisi, şeffaf PNG; analiz sonrası `RenderModelFile` işi + `node ace images:render` geri doldurma; `product_images` tablosu; `/images/:id` yalnız onaylıyı, önbellekli akıtır; vitrin kartı + ürün sayfasında sürükle/kaydırıcıyla döndürülen galeri; `og:image` + JSON-LD `image`. Üretici fotoğrafı: vitrin ürünü basılan işin QC fotoğrafı "Öner" → admin kuyruğunda "İncelenecek vitrin fotoğrafları" onayı (kimlik ele veren bir şey yoksa) → vitrinde renderlardan önce. Alıcının kendi modeli asla. 3MF/OBJ ✔ 2026-09-26: `mesh_parser.ts` [3MF zip+XML: birim, bileşen, dönüşüm; OBJ: çokgen, negatif indeks] → analiz, fiyat, render ve anonim hızlı fiyat artık üç biçimde. KALAN: malzeme rengine göre render, WebP) · `Ref: S2`
  - Model turntable render (worker), `product_images`, OG görseli; üretici gerçek foto yükleyebilir; vitrinde harf plakası yerine görsel.
- [x] **R4-T7 Satıcı marj aracı + analitik** · P1 · ✔ 2026-09-24 (ürün formunda canlı "bu marj = parça başı şu kadar" [fiyat motoruyla aynı], `/seller/analytics`: sipariş, kazanılan/bekleyen, en çok satanlar; görüntülenme/dönüşüm izlenmiyor) · `Ref: S3, S4`
- [x] **R4-T8 Örnek sipariş** · P1 · ✔ 2026-09-24 (`channel: sample`: satıcı kendi tasarımını maliyetine sipariş eder, marj/satıcı payı yok, ürün kartında "Order a sample"; satış analitiğine sayılmaz) · `Ref: S7`
- [x] **R4-T9 Ürün varyantı (ölçek/renk seti)** · P1 · ✔ 2026-09-24 ölçek (katalog `allowed_scales`, hacim küpü ile fiyat/gram, boyut yazıcıya sığmalı, maker teklifinde ölçekli ölçü, vitrinde boyut seçici. Renk seti zaten malzeme/renk kataloğuyla) · `Ref: S9`
- [x] **R4-T10 Katalog kategorileri/etiketleri + moderasyon** · P1 · ✔ 2026-09-24 (`categories`, katalog ürününde kategori + en fazla 8 etiket; vitrinde kategori çipleri ve `?tag=` süzgeci; admin kategori yönetimi. Moderasyon = R3-T11 şikâyet/bloklama; ön-onay akışı eklenmedi) · `Ref: S10, A4`
- [x] **R4-T11 Satıcı üretici tercihi (tier alt sınırı, kimlik yok)** · P2 · ✔ 2026-09-24 (`seller_products.min_maker_tier`, sipariş `required_trust_tier` = max(değer bazlı, tercih); ürün formunda seçici + "eşleşme uzayabilir" uyarısı; üretici kimliği yine görünmez) · `Ref: S5`
- [x] **R4-T12 Satıcı webhook'ları / public API + API anahtarı** · P2/P3 · ✔ 2026-09-24 (`/seller/developers`: hash'li API anahtarları [en çok 5, bir kez gösterilir, iptal], salt-okunur `/api/v1/{orders,orders/:id,products}` kimliksiz görünümle, dakikada 120 istek/anahtar; imzalı webhook'lar [`order.status_changed`, `webhook.test`], outbox satırı durum geçişiyle aynı transaction'da, dakikalık tarama, 8 deneme + backoff, 20 ardışık hatada otomatik kapanma; SSRF koruması: https, dahili IP/host reddi, bağlantı anında DNS kontrolü, yönlendirme yok. OpenAPI ✔ 2026-09-26 [`/api/v1/openapi.json`, OpenAPI 3.1: uçlar, hata kodları, hız sınırı, `webhooks` + imza doğrulama tarifi; geliştirici sayfasında bağlantı; test belgedeki alanları gerçek yanıt ve webhook yüküyle karşılaştırır]. KALAN: sipariş oluşturma API'si, olay tipi seçimi) · `Ref: N4, S8`
- [x] **R4-T13 White-label (paket içi kart/etiket)** · P2 · ✔ 2026-09-24 (`/seller/branding`: marka adı + teşekkür mesajı; üretici işinde `/maker/jobs/:id/packing-slip` yazdırılabilir kart: vitrin satışında satıcının markası, aksi halde nötr; fiyat, üretici takma adı, alıcı e-postası ve platform adı YOK, çıktı kaçışlı, başkasının işi 404. logo ✔ 2026-09-26 [`/seller/branding`: PNG/JPEG/WebP ≤ 256 KB, tür baytlardan (SVG reddedilir), özel depoda; paket kartına `data:` URI olarak gömülür, üreticiye dosya yolu/bağlantı gitmez; önizleme + kaldırma]. KALAN: gönderi etiketi üzerinde marka [taşıyıcı D3], tasarım şablonları) · `Ref: S6`

---

## R5 — Lansman sağlamlaştırma

- [ ] **R5-T1 Deploy + ortamlar** · P0 · ⏸ D4 · `Ref: A7` — staging + production, web + worker + migration adımı, health check, sırlar yönetimi.
- [x] **R5-T2 Yedek/geri dönüş** · P0 · ✔ 2026-09-24 kısmen (`docs/RUNBOOK_BACKUP.md`: neyin yedeği alınır [`APP_KEY` en kritik], RPO/RTO önerisi, kurulum adımları, tam çöküş ve tek tablo geri yükleme, doğrulama sorguları; `scripts/restore_drill.sh`: dök → geçici veritabanına geri yükle → tablo/migration/satır/ledger sağlaması + para birimi başına denge karşılaştırır, yerelde geçti. KALAN: gerçek PITR/WAL ve R2 sürümleme ayarı ve yedek yaşı alarmı [D4 ⏸])
- [x] **R5-T3 Güvenlik taraması** · P1 · ✔ 2026-09-24 kısmen (`npm audit` 0 açık; CI'da `npm audit --audit-level=high`; Dependabot; `docs/SECURITY.md` OWASP eşlemesi + anahtar rotasyon notu. APP_KEY rotasyonu ✔ 2026-09-26 [`APP_KEY_PREVIOUS` geri dönüşlü şifre çözme + `node ace security:rotate-key` (idempotent, `--dry-run`, okunamayanı korur ve raporlar); `ENCRYPTED_COLUMNS` listesi veritabanıyla testte eşleştirilir; prosedür SECURITY.md]. KALAN: ZAP baseline [staging gerekir]) · `Ref: G9` — npm audit/Dependabot, ZAP baseline, OWASP kontrol listesi; anahtar rotasyonu (`G7`).
- [x] **R5-T4 e2e testleri (Playwright)** · P1 · ✔ 2026-09-24 kısmen (`tests/browser/`: bekleme listesi ve alıcı yolculuğu [giriş → fiyat → sepet → checkout → sipariş]; `node ace test browser`, CI'a chromium kurulumu eklendi. ödeme→üretim→teslim ve dispute e2e ✔ 2026-09-26 [`tests/browser/order_lifecycle.spec.ts`: vitrinden sipariş → test kartıyla ödeme → otomatik eşleşme → üretici kabul/baskı/kargo → alıcı teslim onayı → tamamlandı; teslim edilen siparişe itiraz → üretici yanıtı → admin tam iade → çözüldü. QC fotoğrafı tarayıcıdan S3'e gittiği için testte kayıtla ikame]. KALAN: görsel regresyon) · `Ref: A8` — kayıt → sipariş → ödeme → üretim → teslim; dispute akışı; görsel regresyon.
- [x] **R5-T5 TR + EN i18n** · P0 (TR pazarı) · ✔ 2026-09-24 temel (K-I: TR+EN. `fm_lang` çerezi > Accept-Language > EN; `useT()` İngilizce kaynak metin → `inertia/lib/i18n/tr.ts` sözlüğü [eksikse İngilizce görünür]; dil anahtarı; `html lang`. 2026-09-24 ikinci tur: TÜM sayfalar ve paylaşılan bileşenler `t()` ile sarıldı [AST codemod + elle], sözlük ~1.300 giriş; `LanguageSwitch` artık panel [üretici/satıcı/yönetici] ve giriş/kayıt ekranlarında da var [önceden yalnız genel yerleşimdeydi]; sunucu mesajları: flash toast'ları istemcide `t()`, doğrulama hataları sunucuda `translateValidationErrors`; hukuk metinleri `resources/legal/tr/*.md` [TASLAK], değişiklik günlüğü `resources/changelog.tr.md`; tarih/para biçimi dile göre [`formatDate/formatMoney` → tr-TR]; SSS, ayar tanımları, kurulum adımları, durum etiketleri çevrildi. Denetim: `npm run i18n:check` [t() anahtarı sözlükte var mı — `tests/unit/i18n.spec.ts` bunu zorlar], `npm run i18n:rendered` [Türkçe tarayıcıda çıplak İngilizce metin tarar; oturumlu sayfalar için `LOGIN=e:p`]. ✔ 2026-09-24 üçüncü tur: bildirimler ve bildirim e-postaları TR [`users.locale` kolonu: kayıtta istek dilinden, dil anahtarında oturumluysa güncellenir; `notifications.data` artık `role`+`ctx` saklar, liste ve e-posta okuma anında `render(..., locale)` ile çevrilir, eski satırlar kaydedildiği gibi kalır; `catalog_tr.ts` aynı alıcı/olgu kurallarıyla; e-posta şablonu düğme/altbilgi TR; iki test]. ✔ 2026-09-24 dördüncü tur: doğrulama ve parola sıfırlama e-postaları TR [`user.locale`], DFM uyarıları TR [`inertia/lib/i18n/patterns.ts` desenleri, `t(issue.message)`; test analizör çıktısıyla eşleşmeyi doğrular]. ✔ 2026-09-24 beşinci tur: kullanıcıya görünen ~160 servis hata metni sözlükte, sayı içeren ~28'i `patterns.ts`'te; hata gösteren yerler [`problem`, `couponProblem`, `calcError`, iki adım, gelir hesaplayıcı] `t()` ile. KALAN: yalnızca geliştirici hataları [defter, TCMB, slicer, fake sağlayıcı] bilerek İngilizce; yeni bir DomainError mesajı eklenince sözlüğe girmeli [`problem` vb.] ve DFM uyarıları, kullanıcı verisi [ürün adı/açıklaması] çevrilmez [bilinçli], hreflang/`/tr` URL kararı [M2-T4]. kalanlar ✔ 2026-09-26 [son sarılmamış metinler: diyalog/çekmece kapat etiketi, kapasite "dk", performans "karşılandı", RFQ "Teklifin" + gün + teklif durumları; `i18n:check` yalnız bilerek çevrilmeyenleri gösteriyor (API yolları, e-posta örneği). E-posta/bildirimler kullanıcının diliyle, tarih/para `format.ts` ile yerel]) · `Ref: U1` — sözlük, e-postalar, tarih/para biçimi.
- [x] **R5-T6 Erişilebilirlik ve performans ölçümü** · P1 · ✔ 2026-09-24 kısmen (`npm run a11y`: axe WCAG 2.2 AA, 12 genel sayfa × telefon/masaüstü; bulunanlar düzeltildi [html lang, liste yapısı, LayerStepper kontrastı] → 0 ihlal. oturumlu sayfalar + OG ✔ 2026-09-26 [`npm run a11y` yeni sayfaları da tarar (kullanım sayfaları, ürün sayfası, geliştirici, üretici yüzey işlemi/ödeme, admin eşleştirme/yüzey işlemi/raporlar), 2FA'lı hesabı ihlal değil "atlandı" sayar; `tests/browser/a11y_pages.spec.ts` bu oturumun sayfalarını axe ile test paketinde tarar (admin dahil). Bulunan: geliştirici sayfası kaydırılan kod bloğu klavyeyle erişilemez, eşleştirme/rol ekranı rozet kontrastı → düzeltildi. OG görseli R4-T6 ile geldi]. KALAN: Lighthouse ≥95/CLS/LCP ölçümü, CI'a a11y adımı [çalışan sunucu gerekir]) · `Ref: U8, U4` — axe CI, Lighthouse ≥ 95, CLS/LCP; OG görselleri.
- [x] **R5-T7 Yük testi** · ✔ 2026-09-24 (`tests/unit/matching_load.spec.ts`: 150 uygun üretici sıralaması <1,5 sn ve <15 sorgu [N+1 yok]; eşzamanlılık testleri [kabul yarışı, webhook] mevcut. Gerçek HTTP yük testi hedef ortamda) — eşleştirme turu ve checkout.
- [x] **R5-T8 Destek/SSS/iletişim** · P1 · ✔ 2026-09-24 (`/help`: 7 gerçek SSS + iletişim formu [saatte 5], `support_requests`, admin kuyruğunda "Mark answered", footer/sitemap) · `Ref: N3`

---

## R6 — Global ve kurumsal

- [ ] **R6-T1 Stripe Connect provider** · P3 · ⏸ D1 🔒
- [x] **R6-T2 Çoklu para birimi + kur** · P3 · ✔ 2026-09-24 kısmen (`fx_rates` günlük TCMB kuru [`RefreshFxRates` 6 saatte bir; dev/test'te sabit], sipariş anında kur kilitlenir [`orders.fx_rate_nano` + tamponlu, `fx_rate_id`], `priceOrder` bileşenleri ayrı çevirir ve birim = pay+kargo+komisyon+marj eşitliği korunur, `base_total_minor` TRY karşılığı güven kademesi/dolandırıcılık/GMV için, USD/EUR/GBP admin bayrağıyla kapalı gelir ve ödeme sağlayıcı `supportedCurrencies` içermiyorsa reddedilir; sepette 'Pay in' seçici; ledger/ödeme/payout sipariş para biriminde test edildi. Kazanç ekranı zaten para birimi bazlıydı; satıcı analitiği ve iki panel ana sayfası da 2026-09-24'te para birimi bazlı [her para birimi ayrı satır, hiç toplanmaz]. Eski kur uyarısı da eklendi [`fx_stale` sağlık alarmı: açık para biriminin kuru yok ya da izin verilen sürenin yarısından eski]. KALAN: vitrin/doğrudan sipariş formunda seçici [sağlık alarmı], gerçek sağlayıcı [R1-T1/R6-T1] gelmeden bayrakları AÇMA) · `Ref: P5`
- [ ] **R6-T3 Bölge/ülke eşleştirme kuralları + sınır ötesi üretim** · P3 · `Ref: B5` · ⏸ K-K [sınır ötesi kargo fiyatları çıkış ülkesine göre, gümrük/HS kodu ve KDV/ithalat vergisi sorumluluğu, hangi ülkeler]. Bugün eşleştirme aynı ülke şartı arıyor, `flags.crossBorder` kapalı; kargo tablosu yalnız varış bölgesine göre → sınır ötesi fiyat yanlış çıkar, bu yüzden bilerek yapılmadı — gümrük bilgileri (`L6`).
- [x] **R6-T4 RFQ (kurumsal ihale)** · P2 (Faz 8) · ✔ 2026-09-24 kısmen (`flags.rfq` KAPALI; kurumsal satıcı `/rfqs`'te tek dosyalı talep açar; uygun üreticiler [ülke, teknoloji, malzeme/renk, yapı hacmi, kademe, alıcının kendi profili hariç] en çok 10 kişi davet edilir ve keşif kotası burada da uygulanır; üretici teklifi birim fiyat + termin + not [iletişim bilgisi maskelenir], son tarihe kadar güncellenir/geri çekilir; alıcı teklifleri 'Offer 1..n' + kademe/puan/iş sayısıyla görür, alias/kimlik yok; kazanan seçimi adresle birlikte teklif fiyatlı `rfq` siparişi yaratır [platform payı+kargo üstüne, KDV içinde], diğer teklifler kapanır; ödeme sonrası yalnız kazanana teklif gider, reddederse başkasına gitmez → unmatched; `CloseRfqs` 10 dakikada bir: süresi dolanı kapatır/teklifsizi bitirir, karar verilmeyeni 14 günde bitirir. KALAN: çok kalemli talep, teklif karşılaştırma filtreleri, kazanan için ayrı kabul adımını kaldırma, RFQ ölçümü/raporu, admin RFQ ekranı)
- [ ] **R6-T5 STEP/IGES desteği + model onarımı + yön önerisi** · P2 · `Ref: T3, T4` · yön önerisi ✔ 2026-09-24 (DFM analizörü altı yönü dener, taşma yüzdesini en az üçte bir ve 5 puan düşüren ve yüksekliği ikiye katlamayan yön varsa `better_orientation` bilgi notu ekler; yalnız yeni analizlerde). **STEP/IGES ve onarım ⏸ K-I (karar):** B-rep → ağ dönüştürmesi için OpenCascade gerekir, ortamda yok; öneri: K-H'deki slicer işçisi gibi açık kaynak CLI işçisi (FreeCAD/OCCT `--headless`, yüklenen STEP'i STL'ye çevirir, dönüşüm süresi/boyut sınırı, kural 4 gereği yalnız kendi dosyası). Onarım (delik kapatma, normal düzeltme) aynı işçiye bağlanır.
- [x] **R6-T6 Son işlem seçenekleri** (zımpara/boya) · P2 · ✔ 2026-09-24 kısmen (`finishing_options` [zımpara, astar, boya, buhar; fiyat birim başına, malzeme kısıtı], `/admin/finishing`; üretici `/maker/finishing`'te hangilerini yaptığını işaretler; fiyat üretici payına eklenir → komisyon ve satıcı marjı buna da uygulanır; kalem üzerinde ad+fiyat dondurulur; eşleştirme yalnız seçeneği sunan üreticilere gider; teklif sayfasında seçim, sepet satırı ayrı, üretici ve alıcı siparişte görür. ek süre + vitrin ✔ 2026-09-26 [`finishing_options.extra_days` (admin düzenler; varsayılan SAND 1, PRIME 2, PAINT 3, VAPOR 1); `productionDaysFor` = SLA + en uzun ek gün → eşleştirme kapasite penceresi, açıklayıcı ve işin teslim tarihi; vitrin ürün sayfasında malzemeye uygun işlemler, her varyant fiyatı gerçek motordan (komisyon/marj dahil), "+N gün" ve üretim süresi notu; vitrin siparişi `finishing` alır]. boya rengi ✔ 2026-09-26 [`finishing_options.needs_colour` (PAINT), `order_items/cart_items.finishing_colour`; renk yönetilen renk listesinden doğrulanır ve kanonik adıyla saklanır, renksiz boya sepette ve siparişte reddedilir; teklif ve ürün sayfasında erişilebilir renk seçici; renk alıcı/üretici ekranlarında, sepette, paket kartında ve admin eşleştirmede görünür]. KALAN: üretici bazlı fiyat çarpanı) · `Ref: T6`
- [x] **R6-T7 Kupon/indirim/referans** · P2 · ✔ 2026-09-24 kısmen (kupon: yüzde veya sabit TRY tutar, asgari sepet, üst sınır, toplam ve alıcı başı kullanım, ilk sipariş, bitiş tarihi; `/admin/coupons`; sepette kod alanı. İndirim platform komisyonundan karşılanır ve komisyonu aşamaz → üretici/satıcı payı, ödeme ve iade akışı değişmez; KDV ödenen tutar üzerinden; kilit + yeniden kontrol ile son hakkı iki alıcı alamaz; iptal edilen sipariş ve 24 saatten eski taslak hakkı geri verir; kod tahmini saatte 20 ıskaya sınırlı. vitrin sipariş formunda kod alanı ✔ 2026-09-26 ["Kupon kodun var mı?" açılır alanı; indirim sonraki sayfada, ödemeden önce; geçersiz kod siparişi durdurur]. kupon maliyeti raporu ✔ 2026-09-26 [`/admin/reports` → "Kupon maliyeti" CSV: dönemde tamamlanan siparişlerde kupon ve para birimi başına kullanım, indirim (platform ücretinden düşer = platform maliyeti), ciro, kalan ücret]. KALAN: hediye kartı) · `Ref: P7`
- [ ] **R6-T8 Üretici otomasyon API'si** (OctoPrint/Bambu) · P3 · `Ref: M5` · ⏸ donanım/işçi kararı [makerın yerel ağındaki yazıcıyla konuşan bir ajan gerekir; bulut tarafında yalnız iş kuyruğu ve durum geri bildirimi uçları yazılabilir. Önce üreticilerde talep doğrulanmalı]

---

## R7 — Hukuki ve mali yapı (lansman kapısı)

Gerekçe ve kaynaklar: `docs/legal/satis-ve-fatura-modeli.md`. Özet:

- Pazaryeri modelinde üretici hukuken "satıcı" olur ve kimliği alıcıya gösterilmek zorundadır (Mesafeli Sözleşmeler Yön. md. 5). Bu, iş kuralı 1 ile çelişir.
- Başkasının parasını tutup dağıtmak, lisans olmadan 6493'e göre suçtur.

Bu yüzden öneri **Model B: Fabrmatch satıcıdır** (üreticiden fason üretim alır, alıcıya kendisi satar). Aşağıdaki sıra bu öneriye göredir. K-L "pazaryeri" çıkarsa R7-T9 devreye girer; R7-T2/T4/T5 buna göre değişir.

Sıra: **R7-T0 karar → R7-T1 şirket (kullanıcı) ∥ R7-T2..T4 kod → R7-T5 fatura entegratörü → R7-T6 metinler → R7-T7 rapor → R7-T8 lansman kontrolü.**
Kod işleri (T2–T4) karar ve şirketi beklemeden önerilen modelle yapılabilir; bayrak arkasında kalır.

- [ ] **R7-T0 Karar K-L: satış modeli** · P0 · ✔ 2026-09-27 kullanıcı **B** dedi; ⏸ uzman teyidi (mali müşavir + avukat) bekleniyor
  - Seçenekler: A pazaryeri (aracı) · **B Fabrmatch satıcı (öneri)** · C (B'nin dış mağaza uzantısı).
  - Uzmana götürülecek 8 soru notun §5'inde. Özellikle: 3D yazıcıyla evde üretimin esnaf muafiyetine girip girmediği (özelge), muaf esnaftan alımda tevkifat oranı, satıcı marjının belge türü.
  - Kabul: karar defterinde K-L ✔; seçilen model `docs/legal/satis-ve-fatura-modeli.md`'ye işlendi.
- [ ] **R7-T1 Şirket ve hesaplar** · P0 · 🔒 kullanıcı işi (kod yok)
  - Ltd. Şti. kuruluşu (MERSİS, vergi levhası, KEP), şirket adına banka hesabı.
  - e-Fatura + e-Arşiv + e-Defter başvurusu (entegratör seçimi = K-C).
  - ETBİS kaydı; VERBİS gerekliliği kontrolü.
  - iyzico canlı üye işyeri başvurusu **şirket adına**; sandbox anahtarı kişisel hesapta kalır.
  - Ürün sorumluluk sigortası teklifi.
  - Kabul: canlı iyzico anahtarı + VKN + e-arşiv entegratör hesabı elde.
- [x] **R7-T2 Satış modeli ayarı + defter hesapları** · P0 · ✔ 2026-09-27
  - `SALES_MODEL` (varsayılan `merchant_of_record`; test ortamı eski paket için `marketplace`).
  - Deploy koruması: MoR'da standart iyzico üretimde kabul, `IYZICO_MARKETPLACE` MoR ile birlikte reddedilir.
  - Serbest bırakmada ledger:
    - `vat_payable` (tüm satışın KDV'si), `vat_receivable` (kayıtlı alacaklının faturasındaki KDV), `withholding_payable`.
    - Kalan `platform_fee` = net komisyon (alacaklının vergi durumundan bağımsız, ±2 kuruş — property testi).
  - Alacaklıya ödeme MoR'da sağlayıcıdan değil, banka havalesiyle: admin `/admin/payouts`'ta CSV indirir, referansla "ödendi" işaretler; ledger ancak o zaman nakde geçer.
  - Karar: KDV mükellefi olmayan alacaklıya pay KDV'siz ödenir (alıcının ödediği KDV'yi Fabrmatch devlete öder).
  - Tevkifat oranı ve evde üretim yıllık sınırı `/admin/settings` → "Payouts and tax".
  - Özgün tanım:
  - `SALES_MODEL=merchant_of_record|marketplace` (varsayılan MoR).
  - Deploy koruması:
    - MoR → standart iyzico (pazaryerisiz) üretimde kabul.
    - marketplace → `IYZICO_MARKETPLACE=true` şart. (Bugünkü koruma her durumda pazaryeri istiyor; değişecek.)
  - Ledger MoR hesapları:
    - `sales_revenue`, `vat_payable` (tam tutar KDV'si).
    - `vat_receivable`: üretici faturasındaki indirilecek KDV.
    - `maker_payable` alış borcu olarak.
    - `withholding_payable`: gider pusulası tevkifatı.
  - Komisyon artık fatura kalemi değil, satış ile alış arasındaki fark (brüt kâr).
  - Kabul: property testi — her sipariş için satış = alış + satıcı marjı + brüt kâr; trial balance 0; iki model de testli.
- [x] **R7-T3 Ödeme alan (üretici/satıcı) vergi ve ödeme bilgileri + onay** · P0 · ✔ 2026-09-27 `docs/notes.md` isteği
  - `/maker/payout` ve yeni `/seller/payout`: vergi durumu (şirket / şahıs / basit usul / esnaf muafiyeti), unvan, VKN (sağlama) veya TCKN, vergi dairesi, adres, TR IBAN, belge (PDF/PNG/JPEG, baytlardan tanınır), şifre tekrarı.
  - Her değişiklik `pending_review`'a döner. Admin `/admin/payouts`'ta belgeyi açıp onaylar veya gerekçeyle geri gönderir; kendi profilini onaylayamaz.
  - Bildirim: `payout_action`.
  - Onaysız alacaklının siparişi dağıtılmaz (süpürme onay gelince dağıtır). Onay sonrası bilgi değişirse hazır ödeme "ödendi" yapılamaz.
  - TCKN/VKN/adres/IBAN şifreli (`ENCRYPTED_COLUMNS`), sahibine maskeli gösterilir, KVKK dışa aktarımında var.
  - Özgün tanım:
  - Form `/maker/payout` ve satıcı eşleniği. Vergi durumu seçimi: Ltd/AŞ · şahıs şirketi (gerçek usul) · basit usul · esnaf muafiyeti belgeli (ev üretimi).
  - Alanlar: unvan/ad, VKN veya TCKN, vergi dairesi, adres, IBAN (hesap sahibi adı unvanla eşleşmeli).
  - Belge yükleme (vergi levhası / esnaf muafiyet belgesi / imza sirküleri) → admin onay kuyruğu (onay/ret gerekçeli, audit).
  - Hassas alanlar şifreli (`ENCRYPTED_COLUMNS`'a eklenir). Admin dışında kimse görmez.
  - Kural:
    - Onaysız ödeme alan sipariş üretebilir ama ödemesi `pending_verification`'da bekler; payout süpürmesi onay gelince çalışır.
    - (Opsiyon) eşleştirmede onaylılara öncelik.
  - Kabul: onaysız hesaba payout yok (test); ret → kullanıcıya bildirim; KVKK dışa aktarımına dahil.
- [x] **R7-T4 Alış belgesi akışı (üretici → Fabrmatch)** · P0 · ✔ 2026-09-27
  - Şirket/şahıs/basit usul: ödeme `awaiting_document` ile açılır ve alacaklıya "fatura kes" bildirimi gider.
    - Alacaklı fatura no, tarih, toplam, KDV ve dosya yükler; toplam birebir, KDV ±1 kuruş kontrol edilir.
    - Admin dosyayı açıp onaylar (→ `pending`, havaleye hazır) ya da gerekçeyle reddeder (yeniden yüklenir).
  - Esnaf muafiyeti: Fabrmatch gider pusulasını kendisi düzenler (yıl bazında boşluksuz `GP2026000001`, yazdırılabilir), %2 tevkifat (ayar), 1.900.000 TL yıllık sınır aşılırsa dağıtım durur.
  - "Bill to" alanı `COMPANY_*` env'den gelir; şirket kurulunca doldurulacak.
  - KALAN: fatura doğrulaması elle (e-fatura portal sorgusu yok); satıcı marjının belge türü R7-T0 teyidine bağlı (şimdilik fatura).
  - Özgün tanım:
  - Kayıtlı üretici (şirket / şahıs / basit usul):
    - Sipariş `completed` olunca "Fabrmatch'a fatura kes" görevi; tutar, unvan ve VKN hazır gösterilir.
    - Üretici e-fatura/e-arşiv numarası + PDF yükler; sistem tutar/VKN kontrolü yapar.
    - **Fatura onaylanmadan payout yok.**
  - Esnaf muafiyeti belgeli:
    - Fabrmatch gider pusulası düzenler, tevkifatı keser (oran R7-T0'dan), payout net tutar.
    - Belge PDF üreticiye gider.
    - Yıllık 1.900.000 TL (2026) haddine yaklaşınca uyarı; aşılınca yeni ödeme durur.
  - Satıcı marjı için aynı akış (belge türü R7-T0'dan).
  - Kabul: belgesiz/uyuşmayan tutarda payout bloklu; tevkifat ledger'da `withholding_payable`.
- [ ] **R7-T5 Alıcı faturası: gerçek e-arşiv entegratörü** · P0 · 🔒 K-C (R1-T3'ün devamı)
  - MoR: Fabrmatch alıcıya tam tutar e-arşiv keser (KDV dahil).
  - Checkout'ta "Kurumsal fatura" (unvan, VKN, vergi dairesi) → e-fatura mükellefine e-fatura.
  - İptal/iade → iade faturası / e-arşiv iptali.
  - `InvoiceProvider` gerçek adapter + sözleşme testi.
  - Mevcut "yalnız komisyon faturası" (K-C önerisi) MoR'da **alıcıya tam fatura**ya dönüşür.
  - Kabul: sandbox'ta fatura kesildi; numara sipariş sayfasında; iade akışı testli.
- [ ] **R7-T6 Tüketici metinleri ve cayma** · P0 · ⏸ D5 (avukat metni)
  - Ön bilgilendirme formu + mesafeli satış sözleşmesi, satıcı = Fabrmatch.
  - Cayma: alıcının yüklediği model (kişiye özel) → istisna; katalog/vitrin standart ürün → 14 gün cayma.
  - Checkout ürün türüne göre doğru metni gösterir ve onay sürümünü kaydeder (R1-T6 mekanizması).
  - Üretici tedarik sözleşmesi (kalite, gizlilik, geri çağırma, IP) onboarding'de onaylanır.
  - Kabul: iki sipariş türünde doğru metin + onay kaydı (test).
- [x] **R7-T7 Vergi raporları** · P1 · ✔ 2026-09-27
  - `/admin/reports` ekranında ay + para birimi bazında: satış KDV'si, alış KDV'si (kaydedilen), bu ay onaylanan faturalardaki KDV, net KDV ve kesilen gelir vergisi.
  - CSV'ler: `vat`, `purchase-invoices` (alış faturası defteri: tedarikçi, VKN, net/KDV/brüt), `withholding` (muhtasar: gider pusulası no, ad, TCKN/VKN, brüt, oran, kesinti, ödenen).
  - Test: örnek ayın rakamları ledger bakiyeleriyle birebir.
  - Özgün tanım:
  - Aylık: satış KDV'si, indirilecek KDV (üretici faturaları), tevkifat listesi (muhtasar için: ad, VKN/TCKN, brüt, oran, kesinti), gider pusulası listesi.
  - CSV'ler admin raporlarında.
  - Kabul: örnek ay için rakamlar ledger ile birebir.
- [ ] **R7-T8 Lansman kapısı kontrol listesi** · P0 · araç ✔ 2026-09-27: `/admin/launch` her şartı yapılandırma ve veritabanından anlık kontrol eder.
  - Zorunlu: satış modeli B; şirket bilgileri (geçerli VKN); canlı iyzico (sandbox değil); gerçek e-arşiv; avukat onaylı metinler + checkout onayı; https; admin 2FA; gerçek SMTP ve depolama; ödeme alabilecek ≥ 3 üretici.
  - Önerilen: virüs tarama, canlı kur, yarım anahtar değişimi yok.
  - Kapı açıldığında (tümü yeşil) bu görev işaretlenir.
  - R7-T0..T6 ✔, canlı iyzico şirket hesabıyla bir gerçek ödeme + iade.
  - Bir gerçek e-arşiv faturası; bir üretici faturası akışı uçtan uca; metinler avukat onaylı.
  - Ancak bundan sonra `PAYMENT_PROVIDER=iyzico` üretimde açılır.
- [ ] **R7-T9 (yalnız K-L = pazaryeri seçilirse)** · P0
  - iyzico pazaryeri aktivasyonu + alt üye onboarding (R7-T3 formu besler).
  - GVK 94/19 %1 tevkifatı payout'tan düşülür + muhtasar listesi.
  - Üretici/satıcı kimliği ön bilgilendirmede gösterilir → **iş kuralı 1 değişir** (CLAUDE.md güncellenir).
  - Faturayı üretici alıcıya keser; Fabrmatch yalnız komisyon faturası keser.

---

## M — Pazarlama ve büyüme (detay: `docs/marketing.md`)

Amaç: arz-öncelikli, dar başlangıçlı satış motoru. Sıra: M0 ile R0/R1 paralel yürüyebilir; M2+ ürün hazır olunca.

- [x] **M0-T1 `product-marketing` bağlam dosyası** · P1 · ✔ 2026-09-23 (`.agents/product-marketing.md` v1; müşteri dili/kanıt/rakip boşlukları M0-T2 ve müşteri görüşmesiyle doldurulacak) — `.agents/product-marketing.md`: ICP, konumlandırma, ton, rakipler, itirazlar (`marketing.md §2, §7` girdi). Pazarlama skill'lerinin ortak girdisi.
- [x] **M0-T2 Rakip araştırması (doğrulanmış)** · P1 · ✔ 2026-09-24 (`docs/marketing/competitors/`, ana sayfa düzeyi; fiyat/yorum/koşul sayfaları açık) — Craftcloud, Xometry TR, Treatstock, Shapeways, Sculpteo, TR yerel servisler; `docs/marketing/competitors/`. Doğrulanamayan iddia yazılmaz.
- [x] **M0-T3 Anahtar kelime ve talep araştırması (TR)** · P1 · ✔ 2026-09-24 (`docs/marketing/keywords-tr.md`; hacim verisi aracı yok, doğrulanmadı) — "3d baskı hizmeti" vb.; Search Console/keyword aracı; sayfa haritası.
- [x] **M0-T4 Karar: ilk şehir/teknoloji/segment (M-A, M-B)** · ✔ 2026-09-24 öneri varsayılan olarak uygulandı (İstanbul + FDM + özel ürün satıcıları; değişirse landing metni/hedef listesi güncellenir) — öneri İstanbul + FDM + özel ürün satıcıları.
- [x] **M1-T1 Bekleme listesi + lead yakalama + `/for-makers`, `/for-sellers` landing** · P1 · ✔ 2026-09-24 (`leads` + açık rıza [işaretsiz kutu, sürümlü, olmadan kayıt yok], tekilleştirme, gerçek bekleyen sayısı [0'da gizli], DESIGN.md'ye uygun sayfalar. Metin İngilizce; TR K-I ile. Hukuk metni D5) — DESIGN.md'ye uygun; e-posta rıza kaydı (R1-T5 ile); bekleyen sayısı gerçek veri.
- [x] **M1-T2 Kaynak/UTM izleme + olay kütüphanesi** · P1 · ✔ 2026-09-24 (`attribution` middleware [utm_* veya dış referrer host, oturumda], `marketing_events` [kimliksiz], kayıtta ilk temas, `order_paid` ilk temasa yazılır, `/admin/growth` huni. Çerez bildirimi/rıza R1-T5 ile gelince yeniden değerlendirilir) — kayıt/sipariş kaydında ilk temas kaynağı; KVKK rızasına bağlı; kimlik verisi olaylara yazılmaz.
- [x] **M1-T3 Üretici outbound listesi (300–500) + concierge onboarding süreci** · P1 · ✔ 2026-09-24 (aktivasyon metriği `/admin/growth`'ta gerçek veriden: onaylı üreticiden kaçı yazıcı+malzeme+boş saatle hazır, kaçı 14 günde; süreç `docs/marketing/playbooks.md §1`: aday kaynakları, rıza kuralları, mesaj iskeleti, kişi bazlı kontrol listesi. Listeyi doldurmak insan işi) — hedef: 14 günde aktif yazıcı+kapasite.
- [x] **M1-T4 Üretici gelir hesaplayıcı (herkese açık araç)** · P1 · ✔ 2026-09-24 (`/tools/maker-income`: fiyat motoruyla aynı formül, dökümü gösterir, "söz değil" notu; landing'den link, sitemap) — arz edinimi için ilk araç.
- [x] **M2-T1 Kayıtsız hızlı fiyat aracı** · P1 · ✔ 2026-09-24 (`/tools/quick-quote`: STL bellekte analiz edilir, saklanmaz [kural 4], imza taraması, saatte 6 istek, sezgisel fiyat + kargo; slicer gelince doğruluk artar) · bağımlı: R2-T1 (doğruluk) — sınırlı, model herkese açık paylaşılmaz (kural 4), rate limit.
- [x] **M2-T2 Blog/içerik altyapısı + sözlük + ilk 10 içerik** · P1 · ✔ 2026-09-24 (`/blog`, `/glossary`; 11 yazı + 14 terim TR, Article/DefinedTerm JSON-LD, sitemap; iç bağlantılar testte doğrulanır) — `content-strategy`; TR birincil.
- [x] **M2-T3 Programatik SEO şablonları (şehir/malzeme/persona)** · P1 · ✔ 2026-09-27 (`/materials`, `/materials/:slug`: canlı DB'den üretici sayısı + gram fiyat aralığı, yalnız ≥ 3 aktif üretici varsa gösterilir ve indexlenir, aksi halde `noindex, follow` + sitemap dışı; kimlik yok; editoryal metin `resources/content/materials`. kullanım sayfaları ✔ 2026-09-26 [`/use-cases`, `/use-cases/{prototype,spare-parts,small-batch}`: örnek parça için fiyat motoru + kargo tablosuyla canlı adet fiyatları, editoryal metin `resources/content/use-cases`, malzemeyi ≥ 3 aktif üretici basmıyorsa `noindex` + sitemap dışı; footer'da bağlantı. Etsy sayfası entegrasyon gelene kadar bilerek yok]. şehir sayfaları ✔ 2026-09-27 [`/cities` + `/cities/:slug`: `CityPageService` şehir başına aktif yazıcılı üretici sayar; ≥ 3 değilse şehrin sayfası hiç yok (404) ve index `noindex, follow` + sitemap dışı; TR şehir slugsuz, yabancı şehir `-ulke` ekli; malzeme aralığı yalnız ≥ 3 üretici o şehirde basıyorsa; kimlik yalnız sayı/ücret aralığı — üretici adı/alias yok (kural 1); footer'da bağlantı; demo seeder 2 Istanbul üreticisi daha ekler]. Persona sayfası bilerek yok — kitle sekmeleri ana sayfada var. Tür bazlı sitemap bilerek ertelendi — tek `sitemap.xml` 50k URL sınırının çok altında) — yalnız gerçek veri olan sayfa yayınlanır, aksi halde noindex.
- [x] **M2-T4 Yapısal veri genişletme** · P1 · ✔ 2026-09-24 kısmen (Organization + WebSite/SearchAction + canonical ana sayfada, Article/DefinedTerm + BreadcrumbList blog/sözlükte, Product + AggregateRating vitrinde; sunucu tarafı `<html lang>` artık ziyaretçi diline uyar [önceden hep `en`]. KALAN: hreflang — dil çerezle seçildiği için aynı URL'de iki dil var, geçerli hreflang için dil başına ayrı URL gerekir [karar: `/tr/...` öneki?]; Lighthouse ≥ 95 ölçümü [derlenmiş build + ölçüm aracı gerekir])
- [x] **M2-T5 Dizin/liste kayıtları + PR/lansman kiti** · P2 · ✔ 2026-09-24 hazırlık [`docs/marketing/launch-kit.md`: lansman kapısı, öncelikli dizin listesi ve kayıt koşulları [doğrulanmayanlar açıkça işaretli], TR/EN boilerplate, yalnız bugün doğru olan bilgi kartı, 'söylenmeyecekler', haber açıları, varlık listesi, takvim, ölçüm/etik]. Kayıtların kendisi ürün canlıya çıkınca [kapı: R1-T1 + D5 + gerçek arz] — `directory-submissions`, `public-relations`.
- [x] **M3-T1 Referans programı (üretici → üretici, satıcı → satıcı, alıcı)** · P2 · ✔ 2026-09-24 kısmen (tek mekanik, herkes için: `/account/referrals` davet bağlantısı `?ref=KOD`; arkadaş kayıtta kişisel ilk-sipariş kuponu alır, davet eden arkadaşın ≥ eşik tutarlı ilk siparişi `completed` olunca kupon kazanır; kişisel kupon başkasına 'geçersiz kod' görünür; kötüye kullanım: kendi kodu/askıdaki/doğrulanmamış davetçi, kişi başı ödül üst sınırı, min sipariş tutarı, sipariş tamamlanmasını asla bozmaz [savepoint], `flags.referrals` KAPALI — şartlar [D5] yayınlanmadan açma. KALAN: üretici→üretici komisyon indirimi [ilk 3 iş; KYC gerekir], davet olayı ölçümü [`referral_sent/converted`], bildirim e-postası, IP/adres benzerliği ile sahte hesap tespiti) · bağımlı: R6-T7 (ledger `promo_expense`), R1 KYC — kötüye kullanım limitleri.
- [x] **M3-T2 Yaşam döngüsü e-postaları** ✔ 2026-09-24 (karşılama, 24 sa ödenmemiş sipariş hatırlatması, teslimden 3 gün sonra yorum isteği, haftalık boş kapasite; saatlik `RunLifecycle`, anahtarlı → tekrar gönderilmez, kullanıcı tercihine saygılı. "Tekrar sipariş" hatırlatması yok) (karşılama, terk edilmiş sipariş, teslim sonrası, tekrar sipariş, üretici boş kapasite) · P1 · bağımlı: R1-T7.
- [x] **M3-T3 Ürün seviyesinde yorum/puan + teslim/QC fotoğraflarının vitrinde gösterimi** · P1 · ✔ 2026-09-24 kısmen (ilan bazında ortalama + son yorumlar, kimliksiz; yalnız tamamlanmış ve puanlı siparişler; `AggregateRating` JSON-LD yalnız gerçek puan varken. KALAN: QC fotoğraflarının vitrinde gösterimi [alıcı izni ve gizlilik kararı gerekir]) · bağımlı: R2-T11, U5.
- [x] **M3-T4 Durum sayfası + changelog sayfası** · P2 · ✔ 2026-09-24 (`/status` sağlık raporundan, yalnız insan diliyle alarm adları; `/changelog` `resources/changelog.md`'den, footer'da) — güven ve "sürekli gelişiyor" sinyali.
- [x] **M3-T5 Sosyal içerik hattı** (üretim time-lapse, vaka) · P2 · ✔ 2026-09-24 süreç [`playbooks.md §2`: format tablosu, izin akışı, kimlik gizleme kontrolü, UTM]; içerik üretimi gerçek siparişlere bağlı — gerçek siparişlerden, yazılı izinle; `social`, `video`.
- [x] **M4-T1 A/B test altyapısı + mesajlaşma deneyleri** · P2 · ✔ 2026-09-24 (`experiment_events`; oturumdan anahtarlı-özet ziyaretçi kimliği, ağırlıklı deterministik atama, bot hariç tek maruz kalma, yalnız görenin tek dönüşümü; iki-oran z-testi + ziyaretçi başına en az 200 şartı [yetmeden 'not enough data']; `/admin/experiments`; `maker_headline` ve `seller_headline` `/for-makers`, `/for-sellers`'ta canlı, dönüşüm = bekleme listesi. Varyantlar yalnız doğru iddia içerir. KALAN: alıcı ana sayfası deneyi, deney bitince kazananı koda işleme) — `marketing.md §11` hipotezleri; örneklem şartı.
- [ ] **M4-T2 Ücretli kanal testi (küçük)** · P3 · ⏸ M-F — kapı: aktivasyon ve `unmatched` oranı kabul edilebilir. Plan hazır [`playbooks.md §3`: kapı, tek kanal/vaat, başarı = ilk sipariş maliyeti, durdurma kuralı]; bütçe ve başlatma kararı M-F'de.
- [ ] **M4-T3 Affiliate/içerik üreticisi programı** · P3 · D5 uyumu. Çerçeve hazır [`playbooks.md §4`: yasal/ödeme/takip/kötüye kullanım eksikleri, yasal görüş gelene kadar kuponlu ortaklık önerisi]; paralı affiliate D5 sonrası.

Paket çıkış ölçütü (M0–M3): 10+ aktif yazıcı, likidite ≥ %25, kayıt→ilk fiyat ve fiyat→sipariş dönüşümü ölçülüyor, ilk organik kayıtlar geliyor.

---

## Benim ek önerilerim (GAP_ANALYSIS'e ek)

Bunlar analizde ayrı satır değildi; işin sağlığı için ekliyorum. Onaylanırsa ilgili pakete taşınır.

- [x] **X-1 Sözleşme (contract) testleri: `PaymentProvider` / kargo / fatura adapter'ları** · P1 · ✔ 2026-09-24 (PaymentProvider: `tests/contracts/payment_provider_contract.ts`; kargo/fatura adapter'ı yok, gelince aynı kalıp) — Fake ve gerçek adapter aynı test paketinden geçer; sağlayıcı değiştirmek güvenli olur. (R1 ile birlikte)
- [x] **X-2 Özellik bayrakları (feature flags)** · P1 · ✔ 2026-09-24 (`flags.*` ayarları, `featureEnabled()`, `feature` middleware → kapalıyken 404; dış mağaza/RFQ/sınır ötesi bayrakları hazır) — Yarım özellikler (dış mağaza, RFQ, sınır ötesi) üretimde gizli; ayar tablosuna bağlı.
- [x] **X-3 Idempotency-Key desteği (public API + checkout)** · P1 · ✔ 2026-09-24 (`idempotent` middleware, redis 24 sa, kullanıcı+rota başına; sipariş/sepet/vitrin/ödeme başlatma uçları; başarısız deneme anahtarı yakmaz; UI her gönderimde anahtar yollar) — Çift tıklama/ağ tekrarında çift sipariş yok.
- [x] **X-4 Sipariş "sağlık" görünümü: tek ekranda zaman çizelgesi + ledger + provider olayları (admin)** · P1 · ✔ 2026-09-24 (`/admin/orders`, `/admin/orders/:id`: para, üretim, ödeme+webhook+payout, risk, dispute, ledger dengesi, zaman çizelgesi) — Destek ve incelemeyi hızlandırır.
- [x] **X-5 Kuyruk paneli** (bekleyen/başarısız job, elle yeniden dene) · P1 · ✔ 2026-09-24 (`/admin/jobs`: kuyruk boyu, çalışmayan zamanlamalar, başarısız job'lar 7 gün saklanır [`defaultJobOptions.removeOnFail`], "Run again" taze kopya kuyruğa koyar; kütüphanede başarısız job listeleme API'si yok → redis indeksi okunur) — `@adonisjs/queue` deneysel; görünürlük şart.
- [ ] **X-6 Test veri fabrikaları + senaryo seeder'ları** (tam yaşam döngüsü) · P2 · büyük ölçüde karşılanıyor: `tests/helpers/order_fixtures.ts` [kullanıcı, üretici, yazıcı, dosya, sipariş, ödeme, teslim, itiraz fabrikaları] ve `database/seeders/demo_seeder.ts` [ödeme→eşleşme→üretim→teslim→ödeme serbest bırakma→itiraz akışları]. KALAN: fixture'ları `tests/` dışına ortak modüle taşıyıp seeder'ın kullanması [şimdi iki kopya]. Bilerek ertelendi 2026-09-24: ~60 test dosyasının importunu değiştirir, kazanç küçük.
- [x] **X-7 Ledger değişmezlik doğrulama işi** (günlük: her işlem dengeli, hesap bakiyeleri negatif değil) · P1 · ✔ 2026-09-24 (`ReconciliationService`: `unbalanced_transaction`, `negative_balance`; günlük job zaten planlı) — Reconcile'ı tamamlar.
- [ ] **X-8 Üretici "yeni sipariş" push/SMS/WhatsApp kanalı** · P2 · ⏸ sağlayıcı kararı [K-J: SMS/WhatsApp sağlayıcısı, gönderici adı, maliyet, telefon doğrulama ve KVKK rızası]; uygulama içi canlı bildirim [Transmit `offersChannel`] ve e-posta zaten var — Teklif 30 dk'da sona eriyor; e-posta yetmeyebilir.
- [x] **X-9 Sipariş değeri limiti ↔ trust tier** · P1 · ✔ 2026-09-24 (`requiredTierForTotal`: 1.500/6.000/25.000 TL eşikleri admin ayarlarında; sipariş `required_trust_tier` yazar, eşleştirme uygular) — Yeni üretici yüksek değerli sipariş almasın (risk azaltma).
- [x] **X-10 Model dosyası sürümleme + tekrar kullanım** · P2 · ✔ 2026-09-24 (`model_files.previous_file_id` + `revision`; dosyalar sayfasında 'New version' yüklemesi, listede yalnız en yeni sürüm + 'N earlier versions'; eski sürümün fiyat sayfasında 'newer version' uyarısı; başkasının dosyası, zaten yenisi olan sürüm ve aynı içerik reddedilir; verilmiş siparişler eski sürümü kullanmaya devam eder). **Bulunan hata düzeltildi:** dosya kayıt doğrulayıcısı `sha256`'yı `hexCode()` [renk kodu doğrulayıcısı] ile denetliyordu → gerçek 64 karakterlik özet 422 alıyordu, yani gerçek yükleme kayıtta düşüyordu; `regex(/^[0-9a-fA-F]{64}$/)` yapıldı.
- [ ] **X-11 "Yakın üretici" yaklaşık mesafe** (posta kodu/koordinat; kimlik gizli) · P2 · ⏸ veri [posta kodu/il-ilçe → koordinat tablosu için güvenilir kaynak gerekir; elle yazılmış koordinatlar hatalı mesafe üretir] — eşleştirme skorundaki `sameCity` yerine mesafe.
- [x] **X-12 Finansal raporlar** · P1 · ✔ 2026-09-24 (`/admin/reports`: ay ve para birimi bazında tamamlanan sipariş, brüt, içerdeki KDV, verilen indirim, kazanılan platform payı [ledger], ödenen iade, üretici/satıcı ödemeleri; CSV: özet, tamamlanan siparişler [kimliksiz], ödemeler; üretici `/maker/earnings/statement.csv` ve satıcı `/seller/statement.csv` yalnız kendi ödemeleri; formül enjeksiyonuna karşı hücre koruması; para birimleri toplanmaz. KALAN: fatura kesim kararına [K-C] göre KDV beyan özeti) — Muhasebe için.
- [x] **X-13 Uygulama içi rehber/boş durum içeriği** · P1 · ✔ 2026-09-24 (üretici panelinde gerçek veriden kendiliğinden işaretlenen 6 adımlı kurulum listesi: onay, e-posta, yazıcı, malzeme, boş saat, banka hesabı; sıradaki adıya bağlantı; tamamlanınca kaybolur. Eksik olan `/maker/payout` sayfası da eklendi: IBAN mod-97 doğrulaması, şifre yeniden istenir, şifreli saklanır, yalnız maskeli gösterilir, audit. KALAN: test baskısı adımı takip edilmiyor [ipucu metni])
- [x] **X-14 Yazıcı ekleme: dünya marka/model kataloğu** (`docs/notes.md` isteği) · P1 · ✔ 2026-09-27 (`printer_models` referans tablosu, migration ile 58 model / 14 marka [Bambu Lab, Prusa, Creality, UltiMaker, Anycubic, Elegoo, Formlabs, Qidi, Snapmaker, Raise3D, Voron, AnkerMake…] — teknoloji, tabla X/Y/Z, kapalı/açık kasa; `printers.printer_model_id` isteğe bağlı [SET NULL]. Yazıcı ekle diyaloğunda markaya göre gruplu seçim teknoloji + tabla boyutunu ve adı doldurur [elle yazılan ad ezilmez], altında kapalı/açık kasa notu; "Listede yok" ile elle giriş sürer; bilinmeyen model id reddedilir. Kartta model adı gösterilir. Aynı sayfadaki 375px yatay taşma da giderildi [grid öğeleri `minmax(0,1fr)`, renk etiketleri sarar]. KALAN: admin'den model ekleme/düzenleme ekranı yok — yeni makine için migration/seed; kapalı kasa bilgisi henüz eşleştirmede kullanılmıyor [ör. ABS için kapalı kasa tercihi])
- [ ] **X-15 Ana sayfa animasyonunda dile göre para birimi** (`docs/notes.md` isteği) · P2 — hero animasyonu çok dilli ama tutarlar hep `TRY` biçimleniyor; dil TR ise TRY, EN ise İngilizce biçim + karşılık para birimi (fx_rates üzerinden; kur yoksa TRY'de kal). Mikro karar: EN'de hangi para birimi (USD önerisi).
- [x] **X-16 "Faturalarım" listesi** (`docs/notes.md` isteği kalıntısı) · P2 · ✔ 2026-09-27 (`/invoices`: oturumdaki kullanıcıya kesilen tüm faturalar, en yeni önce, sayfalı; numara, sipariş kodu, tarih, brüt + KDV, iptal rozeti; satır yazdırılabilir `/orders/:id/invoice` sayfasını açar. Bağlantılar: kullanıcı menüsü, mobil menü ["Siparişlerim" de mobilde yoktu, eklendi], satıcı panel gezinmesi. Üretici/satıcının Fabrmatch'a kestiği belgeler zaten "Payouts and invoices" sayfasında. Demo seeder tamamlanmış siparişlere fatura keser. KALAN: fatura muhatabı/türü K-C/D5 kararına bağlı — model B'de alıcıya satış faturası gerçek entegratörle [R7-T5] gelecek)

---

## Karar defteri (bekleyenler)

| Kod    | Karar                                        | Öneri                                                                               | Durum                                   |
| ------ | -------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------- |
| K-A    | KDV dahil gösterim, ilk pazar                | TR KDV dahil; sonra AB                                                              | ⏸                                       |
| K-B    | Üretici fiyatı: platform listesi + min fiyat | v1 min fiyat                                                                        | ⏸                                       |
| K-C    | Fatura entegratörü                           | Yerel e-arşiv entegratörü; model B'de alıcıya tam fatura (R7-T5)                    | ⏸                                       |
| K-L    | Satış modeli (kim satıcı, kim fatura keser)  | **B: Fabrmatch satıcı**, üretici tedarikçi (`docs/legal/satis-ve-fatura-modeli.md`) | ✔ B (2026-09-27), uzman teyidi bekliyor |
| K-D/D3 | Kargo                                        | v1 tablo + manuel takip; v2 API                                                     | ⏸                                       |
| K-E/D2 | Dış mağaza tahsilatı                         | Satıcı cüzdanı/kayıtlı kart                                                         | ⏸                                       |
| K-F/D4 | Hosting                                      | Tek bölge + R2 + staging                                                            | ⏸                                       |
| K-G    | Yeniden üretim                               | Evet (R3-T6)                                                                        | ✔ evet                                  |
| K-H    | Dilimleyici                                  | Açık kaynak CLI, worker'da                                                          | ✔ karar                                 |
| K-I    | Dil                                          | TR + EN                                                                             | ⏸                                       |
| D1     | Stripe tüzel kişilik                         | –                                                                                   | ⏸ (R6)                                  |
| D5     | Hukuki görüş (KVKK, mesafeli satış)          | Uzman metni                                                                         | ⏸                                       |

---

## Tamamlananlar (arşiv)

Faz 0–6 ayrıntısı `PROJECT_MEMORY.md`. Bu dosyada tamamlanan görevler burada `[x]` olarak yukarıda kalır; paket bitince satır özeti aşağı taşınır:

_(henüz yok)_
