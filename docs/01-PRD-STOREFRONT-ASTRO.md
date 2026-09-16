# 01 — PRD: Storefront (Astro.js)

> Üst dosya: [[00-MASTER-PRD]]. Teknik detay: eski `sistem-a-magaza/06-TEKNOLOJI-STACK.md`
> ve `04-B2C-SITE-AKISI.md` dosyalarına bakılabilir (referans, birebir uygulanacak).

## Problem

Müşterinin (hem Fabrmatch'in kendi vitrininden hem satıcının dış mağazasından
gelen) hızlı, SEO'lu, güvenilir hissettiren bir alışveriş deneyimi yaşaması lazım.

## Hedefler

- Ürün sayfaları Core Web Vitals'ta üst seviye performans göstersin (statik SSG)
- Google'da bulunabilir olsun (her ürün, her dil kendi URL'sinde index'lensin)
- Hem hazır katalog hem özel tasarım yükleme akışı tek bir checkout'ta birleşsin

## Kapsam DAHİLİNDE

- Anasayfa (bölge/dil algılama, iki giriş: katalog / özel tasarım)
- Kategori & filtre sayfaları (statik, build-time üretilir)
- Ürün detay sayfası (statik + React island ile varyant seçimi)
- Özel tasarım yükleme + teklif karşılaştırma (React island, Sistem B'den veri)
- Sepet & checkout (React island, Medusa/Mercur API'sine bağlı)
- Sipariş takip sayfası

## Kapsam DIŞINDA (bu PRD'de değil)

- Satıcı/üretici panelleri (bkz. [[02-PRD-MARKETPLACE-CORE]], [[03-PRD-URETICI-AGI]])
- Eşleştirme/fiyatlandırma mantığının kendisi (bkz. [[03-PRD-URETICI-AGI]]) —
  bu sayfa sadece sonucu gösterir

## Teknik Yaklaşım

Astro.js + React islands, Medusa/Mercur Store API'sine build-time (statik sayfalar)
ve runtime (sepet/checkout) istekleri. `astro-medusa-starter` açık kaynak
starter'ı temel alınabilir. Cloudflare Workers'a edge deploy.

## Uygulama Durumu (2026-09-16)

Faz 4 çekirdeği tamamlandı: anasayfa (bölge şeridi, katalog/özel tasarım girişleri,
güven şeridi), tüm ürünler + kategori sayfaları (build-time statik), ürün detayı
(varyant seçici + buy-box + malzeme verimliliği çubuğu, gerçek `print_profile`
verisiyle), sepet/checkout (adres → kargo → ödeme → sipariş tamamlama, uçtan uca
tarayıcıda doğrulandı — bkz. `docs/gunlukler/2026-09-16.md`), özel tasarım analiz
sayfası (geometri servisine sunucu tarafı vekil üzerinden bağlı). Bkz.
[[07-KARAR-GECMISI-VE-DEGISIM-GUNLUGU]] için adaptör/bölge/para birimi kararları.

Özel tasarımdan sepete ekleme 2026-09-16'da eklendi: üretilebilir analiz sonucunda
tasarım adı girilip sepete eklenir; Sistem A'da `create-custom-design-listing` iş
akışı tek seferlik ürün + TRY teklif oluşturur (`/api/custom-design` proxy'si →
`POST /store/custom-designs`), satır kalemi katalog ürünleriyle aynı sepette
birleşir. STL saklanmaz (opak `sha256:` referansı), ürün vitrin kataloğunda gizli
(`metadata.custom_design`), satır kalemi quantity=1'dir (gerçek adet varyant
başlığında) — detay ve plan sapması bkz. [[07-KARAR-GECMISI-VE-DEGISIM-GUNLUGU]].

**Bilinçli olarak ertelenen:** çoklu bölge/dil algılama (tek TR/TRY bölgesi
varsayılıyor), özel tasarım STL dosyasının saklanması/presigned URL,
alıcı tarafından anlaşmazlık açma (şimdilik admin). Hesap girişiyle sipariş
geçmişi/takibi 2026-09-16'da eklendi (`/giris`, `/hesap`, `/hesap/siparis/[id]`)
— bkz. [[07-KARAR-GECMISI-VE-DEGISIM-GUNLUGU]].

## Başarı Kriterleri

- Lighthouse performans skoru ≥ 95
- Bir ürün sayfası, Google Search Console'da 48 saat içinde index'lenebiliyor
- Hem katalog hem özel yükleme siparişi aynı sepette birleşip tek ödeme akışına giriyor
