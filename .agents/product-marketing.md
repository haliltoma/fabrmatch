# Product Marketing Context

**Document version:** v1
**Last updated:** 2026-09-23
**Kaynak/durum:** Kod, PRD (`docs/FABRMATCH_FULLSTACK_PRD.md`), ana sayfa metni ve `docs/marketing.md`'den otomatik taslak. **Müşteri görüşmesi ve gerçek metrik henüz yok** — o alanlar "YOK / araştırılacak" diye işaretli, uydurulmadı.

## Product Overview
**One-liner:** Modelini yükle; yakınındaki doğrulanmış üretici bassın ve göndersin — ödemen teslime kadar güvende.
**What it does:** Fabrmatch, 3D baskı için bir print-on-demand pazaryeridir. Alıcı veya satıcı 3D modelini (STL/3MF/OBJ) yükler, anında fiyat görür ve sipariş verir. Sistem siparişi uygun yazıcı, malzeme ve boş kapasitesi olan bir üreticiye adil eşleştirme algoritmasıyla atar; üretici basar ve kargolar. Ödeme emanette tutulur, teslimden sonra serbest bırakılır; sorun olursa fotoğraflı itiraz (dispute) süreci vardır.
**Product category:** 3D baskı hizmeti / on-demand üretim pazaryeri; satıcı tarafında "3D ürünler için print-on-demand" (Printify'ın 3D karşılığı).
**Product type:** İki taraflı pazaryeri (alıcı/satıcı ↔ üretici) + katalog vitrini.
**Business model:** Platform komisyonu (config'te %15; sipariş üzerinden) + satıcı marjı (satıcı kazancı) + üretici payı. Fiyat: hacim/ağırlık/süre + malzeme + kargo + komisyon + satıcı marjı. Emanetli ödeme, ledger ile.

## Target Audience
**Target companies:** (B2C/küçük iş ağırlıklı, B2B değil) — bireysel maker'lar, Etsy/Shopify satıcıları, küçük markalar; arz tarafında yazıcı sahibi bireyler ve küçük atölyeler.
**Decision-makers:** Kararı kişi kendisi verir (kurumsal karar zinciri yok; KOBİ/prototip segmenti Faz 8 sonrası).
**Primary use case:** Elinde 3D model olan biri, yazıcısı olmadan/ilgilenmeden, güvenilir ve öngörülebilir fiyatla basılı parça almak; satıcı için stoksuz üretim.
**Jobs to be done:**
- "Modelimi basılı, kaliteli bir ürüne çevir ve bana gönder" (alıcı)
- "Stok tutmadan, marj ekleyerek 3D ürün sat" (satıcı)
- "Yazıcımın boş saatlerini gelire çevir, ödemem garantili olsun" (üretici)
**Use cases:**
- Özel figür/parça/yedek parça baskısı
- Etsy/Shopify'da özel 3D ürün satışı (mağaza entegrasyonu planlı, henüz yok)
- Prototip / düşük adetli üretim (kurumsal RFQ planlı)

## Personas
| Persona | Cares about | Challenge | Value we promise |
| --- | --- | --- | --- |
| Üretici (yazıcı sahibi) | Düzenli sipariş, ödemenin garantisi, adil iş dağıtımı | Müşteri bulmak, ödeme riski, yeni başlayanın görünmemesi | Kapasiteye uygun teklifler, emanetli ödeme, yeni üreticiye keşif kotası |
| Satıcı | Marj, stoksuzluk, güvenilir teslimat | Üretici bulma, kalite tutarsızlığı, operasyon yükü | Katalogdan listele, biz basıp gönderelim, marj sende |
| Alıcı / maker | Net fiyat, kalite, hız, güven | Yazıcı yok/zaman yok, fiyat belirsizliği, dolandırılma korkusu | Anlık fiyat, doğrulanmış üretici, ödeme teslime kadar korunur |

## Problems & Pain Points
**Core problem:** 3D baskı hizmeti almak/satmak parçalı ve güvensiz: fiyat belirsiz, kalite üreticiye göre değişiyor, üretici ile alıcı arasında güven ve ödeme riski var.
**Why alternatives fall short:**
- Fiyat agregatörleri (ör. Craftcloud) fiyat karşılaştırır ama nihai fiyat gümrük/kargo ile şaşırtabilir (rakip iddiası, doğrulanmadı)
- Endüstriyel platformlar (ör. Xometry) kurumsal/RFQ odaklı; küçük satıcı/hobici için ağır olabilir (doğrulanmadı — araştırılacak)
- Klasik POD (Printify/Printful) baskılı tişört/kupa içindir; 3D ürün yok
- Bireysel üreticiyle doğrudan anlaşma: ödeme ve kalite riski, iletişim yükü
**What it costs them:** Zaman, yanlış/kötü baskı riski, gecikme, iade sürtünmesi (tutar: YOK — müşteri araştırması gerekir).
**Emotional tension:** "Paramı verdim, parça gelmezse/kırık gelirse?" ve "yanlış fiyat verilirse?"

## Competitive Landscape
**Direct:** Craftcloud (All3DP) — anlık fiyat karşılaştırma, ~200 üretici (arama özeti); Xometry Türkiye — endüstriyel 3D baskı, 6 teknoloji (arama özeti). Detay ve diğerleri (Treatstock, Shapeways, Sculpteo, Hubs, TR yerel servisler): **araştırılacak** (`docs/marketing.md §2.2`, görev M0-T2).
**Secondary:** Printify/Printful/Gelato — POD (mağaza entegrasyonlu) ama 3D üretim değil.
**Indirect:** Kendi yazıcısını almak; yerel atölye/tanıdık; hobi forumlarından üretici bulmak.

## Differentiation
**Key differentiators:**
- Emanetli ödeme + teslim onayı + fotoğraflı itiraz süreci (kodda var)
- Adil eşleştirme: skor + yeni üretici keşif kotası (kodda var)
- Anonimlik: alıcı/satıcı üretici kimliğini görmez; üretici yalnız kargo bilgisini görür (platform atlatmayı önler)
- Süreli, imzalı dosya erişimi (model IP koruması)
- Kapasite temelli eşleştirme (boş kapasite + malzeme + baskı hacmi)
**How we do it differently:** Karşılaştırma değil eşleştirme; güven mekanizmaları ürünün çekirdeği.
**Why that's better:** Alıcı fiyatı/kaliteyi "kumar" gibi yaşamaz; üretici düzenli ve garantili iş alır.
**Why customers choose us:** (Hipotez — doğrulanmadı) yerel üretim, teslime kadar korunan ödeme, şeffaf süreç.

## Objections
| Objection | Response |
| --- | --- |
| "Ödeme güvende mi?" | Ödeme emanette; teslim onayı/7 gün penceresi sonrası serbest; sorunda foto ile itiraz. (gerçek özellik) |
| "Kalite garantisi var mı?" | Doğrulanmış üretici, teslim fotoğrafı (planlı `R2-T11`), yeniden üretim (planlı `R3-T6`); **şu an tam garanti verme, planlı özellikleri vaat etme** |
| "Fiyat sonradan değişir mi?" | Sipariş öncesi hesaplanan fiyat sipariş toplamıdır (kargo/vergi modeli tamamlanınca net dökümle) |
**Anti-persona:** Büyük ölçekli seri üretim/enjeksiyon kalıp ihtiyacı olanlar; endüstriyel sertifikalı (ISO/havacılık) parça arayanlar (henüz destek yok); hemen aynı gün teslim bekleyenler.

## Switching Dynamics
**Push:** Fiyat/kalite belirsizliği, gecikme, üreticiyle güvensiz doğrudan anlaşma, kendi yazıcıyı yönetme yükü.
**Pull:** Anında fiyat, güvenli ödeme, yakın üretici, stoksuz satış.
**Habit:** Tanıdık atölye/forum, bildik yabancı hizmet, kendi yazıcıyla uğraşmak.
**Anxiety:** Yeni platformun güvenilirliği, ilk siparişte sorun, yeterli üretici ağı olup olmadığı.

## Customer Language
**How they describe the problem:** **YOK — müşteri görüşmesi/yorum madenciliği gerekli** (`customer-research` skill; Reddit/forum/inceleme siteleri).
**How they describe us:** YOK (henüz kullanıcı yok).
**Words to use:** baskı, üretici, teslime kadar güvende, basılı parça, model, anlık fiyat (ana sayfa metninden; müşteri diliyle doğrulanmalı)
**Words to avoid:** "Get started", "seamless", "elevate", "unlock", uydurma rakam/metrik, "en ucuz/en hızlı" (kanıtsız)
**Glossary:**
| Term | Meaning |
| --- | --- |
| Emanet (escrow) | Ödemenin teslim onayına kadar tutulması |
| Eşleştirme | Siparişin uygun üreticiye otomatik atanması |
| Keşif kotası | Yeni üreticilere adil şans için ayrılan teklif payı |
| Dispute | Teslim sonrası fotoğraflı itiraz süreci |
| Baskı profili / DFM | Baskı ayarı / üretilebilirlik kontrolü (planlı) |

## Brand Voice
**Tone:** Kısa, somut, güven veren; teknik ama soğuk değil.
**Style:** Fiil odaklı, dolgu yok ("Upload a model", "Accept offer"); iddialar yalnız gerçek özelliklere dayanır.
**Personality:** zanaatkâr, şeffaf, güvenilir, pratik, yerel ("Filament" kimliği — `docs/DESIGN.md`).

## Proof Points
**Metrics:** YOK — gerçek metrik yok, uydurulmaz.
**Customers:** YOK (henüz canlı müşteri yok).
**Testimonials:** YOK.
**Value themes:**
| Theme | Proof |
| --- | --- |
| Ödeme güvenliği | Emanet + dispute akışı kodda ve testli (190 test) |
| Adil dağıtım | Skor + keşif kotası simülasyonu testli (10.000 turda ~%20 keşif) |
| Gizlilik | Transformer testleri: alıcı çıktısında üretici alanı yok |
| Model koruması | Süreli imzalı erişim, indirme kaydı |

## Goals
**Business goal:** Önce üretici arzını etkinleştirip likiditeyi kanıtlamak (10+ aktif yazıcı, likidite ≥ %25), sonra talebi ölçeklemek (`docs/marketing.md §3`).
**Conversion action:** Alıcı: model yükle → fiyat → sipariş. Üretici: kayıt → aktif yazıcı+kapasite → ilk teklifi kabul.
**Current metrics:** Henüz canlı yok; geliştirme ortamında demo veri.

## Changelog
*Newest first. One line per revision: what changed and why.*
- v1 (2026-09-23) — Initial context, auto-drafted from codebase/PRD/marketing.md; müşteri dili, kanıt ve rakip detayları bilerek boş bırakıldı (uydurma yok).
