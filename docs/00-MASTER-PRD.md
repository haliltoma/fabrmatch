# 00 — Fabrmatch Master PRD (Product Requirements Document)

> Bu dosya, projenin TEK doğruluk kaynağıdır. Her yeni özellik/karar önce buraya
> işlenir, sonra ilgili modül PRD'sine detaylandırılır. Obsidian'da bu dosya
> "kalıcı hafıza"nın kök notu olmalı — diğer her not buraya geri bağlanmalı.

## 1) Ürün Vizyonu

Fabrmatch, 3D baskı alanında **Printify'ın iş modelini** uygulayan bir platform:
tasarımcı/satıcı tasarımı ürüne çevirir, müşteri sipariş verir, sipariş otomatik
olarak uygun bir üreticiye yönlendirilir, üretici doğrudan müşteriye kargolar.
Printify'dan tek farkı: Fabrmatch'in **kendi B2C vitrini de var** (Printify'da bu
yok — Printify sadece backend, müşteri hep satıcının Shopify/Etsy'sinden alır).

## 2) Kullanıcı Personaları

| Persona | İhtiyacı | Bu sistemde karşılığı |
|---|---|---|
| **Seller** (satıcı) | Kolayca ürün oluşturup satmak, üretim/kargoyla uğraşmamak | Mercur Vendor Panel |
| **Manufacturer** (üretici) | Kapasitesine uygun, adil dağıtılan sipariş akışı, güvenilir ödeme | Sistem B — AdonisJS Manufacturer Panel |
| **Buyer/Customer** (alıcı) | İster satıcının mağazasından ister Fabrmatch'ten güvenle sipariş vermek | Astro storefront (her iki yol da) |
| **Admin** | Platformun sağlıklı işlemesini denetlemek | Medusa/Mercur Admin + Sistem B Admin |

> Designer rolü bu aşamada YOK — bkz. Bölüm 7 (Ertelenen Kapsam).

## 3) Mimari Karar Kaydı (ADR — Architecture Decision Record)

Bu proje boyunca birden fazla mimari karar değişti. Kafa karışıklığını önlemek
için NİHAİ kararlar burada, gerekçeleriyle, sabitlenmiştir:

| Karar | Seçim | Gerekçe |
|---|---|---|
| Marka adı | **Fabrmatch** | "Printloop" araştırmada çakışma çıkardı |
| Genel mimari | **İki sistem** (Store + Üretici Ağı) | Üretici eşleştirme/ihale, ticaret modeline (ürün/sepet) uymuyor |
| Store çekirdeği | **Medusa.js v2 + Mercur 2.x** (2.3.4; Mercur GERİ ALINDI) | Medusa çekirdeğinde satıcı/komisyon/payout YOK — Mercur bunu çözer, 2.x sürümü kodu projeye kopyalıyor (tam sahiplik) |
| Depo düzeni | **Monorepo**: `apps/store`, `apps/storefront`, `apps/manufacturer-network`, `services/geometry`, `docs/` (Obsidian vault) | İki sistemin sınırı klasör + ayrı DB ile fiziksel olarak korunur, bkz. [[09-API-SOZLESMESI]] |
| Store frontend | **Astro.js** (Next.js'ten değişti) | Islands architecture, statik SSG + SEO, Mercur'un Store API'sine bağlanıyor |
| Üretici ağı | **AdonisJS v7 + Inertia + React** | Ticaret değil, operasyon/eşleştirme problemi — hazır çözüm yok, sıfırdan en hızlı bu şekilde |
| Geometri/AI | **Python FastAPI** (ayrı servis) | Slicing/mesh kütüphaneleri Python'da, Node'da dengi yok |
| Designer rolü | **Ertelendi** | Kapsam sadeleştirmesi, bkz. Bölüm 7 |
| Müşteri erişimi | **Hibrit** — hem Fabrmatch'in kendi vitrini hem satıcının dış mağazası (Shopify/Etsy) | Kullanıcı kararı — Printify'dan bu yönde ayrışıyoruz |
| Üretici görünürlüğü | **Platform görünür, üretici kimliği gizli** | Açık ihale vitrini ile "tamamen gizli" çelişiyordu, çözüldü |

## 4) Kapsam (Scope)

### Bu sürümde VAR
- Seller: ürün oluşturma, kendi mağazası (Mercur Vendor Panel), Shopify/Etsy'e yayınlama
- Manufacturer: kayıt, kapasite tanımlama, sipariş kabul/üretim/kargo
- Buyer: Fabrmatch vitrininden veya satıcının dış mağazasından sipariş
- Otomatik fiyatlandırma (slicing tabanlı), üretilebilirlik kontrolü
- Adil eşleştirme (yeni üreticiye şans veren mekanizmalar)
- Üç/dört taraflı olmayan, İKİ taraflı komisyon (platform + üretici + satıcı marjı —
  designer olmadığı için üç değil)
- Escrow, kademeli dosya erişimi (STL lisanslama)
- İhale/toplu sipariş (kurumsal alıcılar için)

### Bu sürümde YOK (bkz. Bölüm 7)
- Designer rolü ve royalty
- Çoklu mağaza (multi-store) SaaS'ı — Seller şimdilik tek mağaza yönetir
- Bölgesel/dil kişiselleştirmesinin ileri seviye kısımları (temel IP tespiti var,
  gelişmiş öneri motoru sonraya)

## 4.1) Uygulama Durumu (2026-09-16)

Beş fazın hepsi tamamlandı: Sistem A (Mercur/Medusa) + geometri servisi + Sistem B
(üretici ağı, eşleştirme + panel) + Astro storefront + ödeme/escrow/uzlaştırma. Uçtan
uca gerçek bir sipariş, gerçek üç serviste, gerçek tarayıcı etkileşimleriyle
doğrulandı: katalogdan seç → sepet/checkout → otomatik eşleştirme → üretici paneli
(kabul/üret/kalite/kargo/teslim) → imzalı webhook → üretici ödemesi → günlük
uzlaştırma. Detaylar için her modül PRD'sinin "Uygulama Durumu" bölümüne ve
[[07-KARAR-GECMISI-VE-DEGISIM-GUNLUGU]]'ne bakın.

Ardından (2026-09-16) kanıta dayalı anlaşmazlık çözüm süreci de tamamlandı: üretici
ödemesi artık anında değil, bir bekleme penceresi (varsayılan 48 saat) sonunda
otomatik serbest bırakılıyor; bu pencerede admin (alıcı adına) anlaşmazlık açabiliyor,
bu da ödemeyi `on_hold`a alıyor — kanıt zaten var olan üretim kaydı/webhook geçmişinden
okunuyor, ayrıca saklanmıyor. Detay: [[05-PRD-ODEME-VE-KOMISYON]] ve
[[07-KARAR-GECMISI-VE-DEGISIM-GUNLUGU]].

Özel tasarımdan sepete ekleme VE hesap girişiyle sipariş takibi de 2026-09-16'da
tamamlandı (bkz. [[07-KARAR-GECMISI-VE-DEGISIM-GUNLUGU]] ilgili girdiler,
[[01-PRD-STOREFRONT-ASTRO]]) — artık gerçek bir alıcı hesabı var, bu yüzden
anlaşmazlık açmanın admin yerine doğrudan alıcıya taşınması (`POST /store/disputes`)
şimdi teknik olarak mümkün, henüz yapılmadı.

Bilinçli ertelenen (ayrı iş kalemleri, PRD kapsamı dışında değil ama bu turda
yapılmadı): üretici Stripe Connect onboarding UI'ı, çoklu bölge/dil algılama,
alıcı tarafından doğrudan anlaşmazlık açma (şimdilik admin, destek talebiyle),
özel tasarım STL dosya saklaması — bkz. Bölüm 7 ve ilgili modül PRD'leri.

## 5) Başarı Metrikleri (henüz taslak — ilk veri geldikçe netleşecek)

- İlk 90 günde en az 20 aktif üretici, 50 aktif satıcı
- Ortalama sipariş-üretim ataması < 2 dakika
- Anlaşmazlık oranı < %3
- Yeni üreticilerin ilk 30 gün içinde en az 1 sipariş alma oranı > %80

## 6) Modül PRD'leri (bu dosyanın altında detaylanır)

| # | PRD | İçerik |
|---|---|---|
| 01 | PRD-STOREFRONT-ASTRO | B2C vitrin, katalog, checkout |
| 02 | PRD-MARKETPLACE-CORE | Medusa+Mercur — satıcı, ürün, sipariş, komisyon |
| 03 | PRD-URETICI-AGI | Sistem B — eşleştirme, fiyatlandırma, üretilebilirlik |
| 04 | PRD-GUVEN-VE-KALITE | Reputasyon, adil eşleştirme, dosya lisanslama |
| 05 | PRD-ODEME-VE-KOMISYON | Escrow, payout, senkronizasyon |
| 06 | PRD-TASARIM-SISTEMI | Renk/tipografi/bileşen kuralları |

## 7) Ertelenen Kapsam (Gelecek Planlar)

- **Designer rolü + royalty** — geri eklendiğinde: `Product`'a `designer_id` link'i
  eklenir, PayoutSplit üç yerine dört tarafa çıkar (bkz. eski
  `03-KOMISYON-ESCROW-ANLASMAZLIK.md` — orijinal üç taraflı model referans alınabilir).
- **Multi-store SaaS** — Seller'ın birden fazla bağımsız mağaza yönetmesi,
  Mercur'un vendor kavramının üstüne bir "organization" katmanı eklenerek yapılır.

## 8) Obsidian Hafıza Sistemi — Nasıl Kullanılır

Bkz. `07-KARAR-GECMISI-VE-DEGISIM-GUNLUGU.md` ve `08-OBSIDIAN-KULLANIM-REHBERI.md`.
Özetle: her karar/değişiklik, bu Master PRD'nin 3. bölümüne (ADR tablosu) satır
olarak eklenir VE değişim günlüğüne tarihli bir not olarak düşülür — ikisi
birbirini tekrar etmez, ADR "şu an ne doğru" der, günlük "ne zaman, neden değişti" der.
