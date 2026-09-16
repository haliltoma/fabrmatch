# 03 — PRD: Üretici Ağı (Sistem B — AdonisJS + Inertia + React + FastAPI)

> Üst dosya: [[00-MASTER-PRD]]. Teknik detay: eski `sistem-b-uretici-agi/`
> klasöründeki tüm dosyalar (01-09) — bu PRD onların üst özeti, birebir uygulanacak
> detaylar orada.

## Problem

Bir sipariş geldiğinde (hazır katalogdan veya özel yüklemeden), hangi üreticinin
bu işi ne fiyata, ne sürede, ne kalitede yapabileceğine otomatik karar vermek;
üretim sürecini uçtan uca takip etmek.

## Hedefler

- Herhangi bir STL dosyası için otomatik, gerçek maliyet/süre hesabı
- Üretime geçmeden önce otomatik üretilebilirlik denetimi
- Adil, yeni üreticiye de şans veren eşleştirme
- Büyük/kurumsal siparişler için ihale usulü akış

## Kapsam DAHİLİNDE

- Otomatik fiyatlandırma (slicing tabanlı, FastAPI ile)
- Üretilebilirlik kontrolü (duvar kalınlığı, overhang, vb.)
- Eşleştirme motoru (kalite/fiyat/yakınlık/müsaitlik ağırlıklı skor + adil şans
  mekanizmaları — bkz. [[04-PRD-GUVEN-VE-KALITE]])
- Manufacturer Panel (Inertia+React) — üretim detay/checklist
- İhale/RFQ sistemi, çerçeve anlaşma, talep havuzlama

## Kapsam DIŞINDA

- Ürün/sepet/checkout/ödeme — bu sistemde YOK, bkz. [[02-PRD-MARKETPLACE-CORE]]
  ve [[05-PRD-ODEME-VE-KOMISYON]]
- Bu sistem parayı hareket ettirmez, sadece tutar hesaplar

## Teknik Yaklaşım

AdonisJS v7 + Inertia.js + React (tek kod tabanı, ayrı API/SPA yok), ayrı
PostgreSQL, `@adonisjs/queue` (Redis). Geometri işleri için ayrı Python FastAPI servisi
(`services/geometry` — mesh tabanlı tahminci + Embree; PrusaSlicer/CuraEngine CLI ileride
adaptör olarak eklenebilir, bkz. [[07-KARAR-GECMISI-VE-DEGISIM-GUNLUGU]]). Sistem A ile iletişim, [[09-API-SOZLESMESI]]
sözleşmesi üzerinden.

## Başarı Kriterleri

- Herhangi bir STL dosyası 30 saniye içinde fiyat/süre tahmini alıyor
- Bilinçli bozuk bir dosya (ince duvar/aşırı overhang) doğru şekilde reddediliyor/uyarılıyor
- Yeni kayıt olan üretici ilk 15 sipariş içinde en az 1 sipariş alabiliyor

## Uygulama Durumu (2026-09-16)

Faz 3 tamamlandı: eşleştirme motoru, `/api/v1/production-requests` + `/api/v1/region-capability`,
webhook gönderici (imzalı, tekrar denemeli), üretici paneli (Inertia+React), zamanlanmış
tarama işleri (`SweepDueWebhooks`, `SweepMatching`). Bkz. [[07-KARAR-GECMISI-VE-DEGISIM-GUNLUGU]]
ve `docs/gunlukler/2026-09-16.md`.

## Notlar

- Sistem A ↔ Sistem B API sözleşmesi [[09-API-SOZLESMESI]] olarak PRD setine eklendi
  (2026-09-15).
