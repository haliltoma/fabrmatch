# 05 — PRD: Ödeme, Komisyon ve Escrow

> Üst dosya: [[00-MASTER-PRD]]. Teknik detay: eski
> `sistem-a-magaza/03-KOMISYON-ESCROW-ANLASMAZLIK.md` ve
> `/paylasilan/01-API-SOZLESMESI.md`'deki ödeme senkronizasyonu bölümü.

## Problem

Satıcı, üretici ve platform arasında adil, şeffaf ve güvenli bir para akışı
kurmak; müşteri onayına kadar ödemeyi güvence altında tutmak; iki farklı
sistemin (Store, Üretici Ağı) ödeme bilgisini kaybetmeden senkronize etmesini
sağlamak.

## Hedefler

- Ödeme, teslimat onaylanana kadar tutulsun (escrow)
- Komisyon otomatik ve doğru hesaplansın
- Sistem B'den gelen ödeme talimatı asla sessizce kaybolmasın

## Kapsam DAHİLİNDE

- İki taraflı komisyon modeli (Designer olmadığı için): Platform Fee + Manufacturer
  Payout + Seller Margin
- Escrow akışı: ödeme tutma → üretim tamamlanma → onay → payout serbest bırakma
- Anlaşmazlık çözüm süreci (kanıta dayalı, Sistem B'den gelen foto/veri ile)
- Ödeme senkronizasyonu: çift kayıt (double-entry) defter, idempotency key,
  günlük otomatik uzlaştırma raporu, başarısız webhook'ta otomatik tekrar deneme

## Kapsam DIŞINDA

- Sistem B'de HİÇBİR ödeme mantığı yazılmaz — sadece tutar hesaplayıp bildirir
- Designer royalty (bkz. [[00-MASTER-PRD]] Bölüm 7 — geri eklendiğinde bu PRD
  üç değil dört taraflı modele güncellenmeli)

## Uygulama Durumu (2026-09-16)

Faz 5 tamamlandı: global platform komisyonu %30, üretici ödemesi `PayoutProvider`
soyutlaması (`manual` varsayılan, `stripe-connect` gerçek Stripe anahtarıyla),
günlük uzlaştırma (`inbound_webhook_event` + Sistem B'nin `/api/v1/webhook-events`
ucu + `reconciliation_report` + `GET /admin/reconciliation-reports`). Üç gerçek
serviste, iki paralel siparişle uçtan uca doğrulandı — bkz.
[[07-KARAR-GECMISI-VE-DEGISIM-GUNLUGU]] ve `docs/gunlukler/2026-09-16.md`.

**Anlaşmazlık çözüm süreci TAMAMLANDI (2026-09-16):** Faz 5'teki "webhook `delivered`
dedi anda hemen öde" davranışı, gerçek bir escrow'a dönüştürüldü — `payout_instruction`
artık `received` olarak `release_at` (varsayılan 48 saat, `PAYOUT_RELEASE_WINDOW_HOURS`)
ile kaydedilir; `release-due-payouts` job'ı (15 dk) pencere dolunca ve anlaşmazlık
yoksa otomatik serbest bırakır. Admin, alıcı adına `POST /admin/disputes` ile
anlaşmazlık açar (alıcı hesabı henüz yok — bkz. aşağıdaki ertelenen madde); bu,
bekleyen talimatı `on_hold`a alır. Kanıt AYRICA saklanmaz — `GET
/admin/disputes/:id`, zaten var olan `production_request.tracking_number` /
`production_photos` ve `inbound_webhook_event` olay geçmişini canlı okur.
`POST /admin/disputes/:id/resolve` (`manufacturer` | `buyer` | `dismiss`) `on_hold`
talimatı sırasıyla serbest bırakır veya `cancelled` yapar; çözülmüş bir anlaşmazlık
tekrar çözülemez. Detay: [[07-KARAR-GECMISI-VE-DEGISIM-GUNLUGU]].

**Bilinçli olarak ertelenen:** üretici için gerçek Stripe Connect onboarding akışı
(şu an `stripe_account_id` sadece bir veritabanı sütunu); alıcı hesabı/girişi
olmadığı için anlaşmazlıklar şimdilik yalnızca admin tarafından (destek talebiyle)
açılabiliyor — hesap sistemi eklenince `POST /admin/disputes` deseni bir
`POST /store/disputes` ucuna taşınabilir.

## Başarı Kriterleri

- Test siparişinde ödeme doğru oranlarda otomatik dağıtılıyor
- Kasıtlı olarak başarısız kılınan bir webhook, otomatik tekrar denemeyle
  belirlenen sürede başarıyla işleniyor
- Günlük uzlaştırma raporu, kasıtlı yaratılan bir "gönderildi ama alınmadı"
  senaryosunu doğru tespit ediyor
