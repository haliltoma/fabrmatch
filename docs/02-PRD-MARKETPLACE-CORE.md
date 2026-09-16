# 02 — PRD: Marketplace Çekirdeği (Medusa.js v2 + Mercur 2.0)

> Üst dosya: [[00-MASTER-PRD]]. Bkz. [[07-KARAR-GECMISI-VE-DEGISIM-GUNLUGU]]'ndeki
> "Mercur Geri Alındı" kararı — bu PRD o kararın somutlaşmış hali.

## Problem

Çok sayıda bağımsız satıcının (Seller) kendi ürünlerini yönetip satabileceği,
birbirinin verisini görmediği, komisyon/ödemenin otomatik ve doğru dağıtıldığı
bir ticaret altyapısı gerekiyor — sıfırdan yazmak yerine kanıtlanmış bir temel
üzerine kurulmalı.

## Hedefler

- Satıcı kendi hesabıyla giriş yapıp SADECE kendi ürün/siparişini görsün (sıkı izolasyon)
- Ürün oluşturma, fiyatlandırma, envanter yönetimi kolay olsun
- Komisyon otomatik hesaplanıp Stripe Connect ile satıcıya doğru tutar aktarılsın
- Admin, tüm satıcıları/ürünleri/siparişleri tek yerden denetleyebilsin

## Kapsam DAHİLİNDE

- Mercur 2.0'ın "core plugin"i: sellers, commissions, payouts, split carts, order groups
- Vendor Panel (Mercur'un hazır React arayüzü) — ürün/sipariş/kazanç yönetimi
- Admin Console — satıcı doğrulama, komisyon yönetimi, katalog kontrolü
- Medusa'nın Store API'si — Astro storefront'un tükettiği uç noktalar
- Designer, SalesChannel gibi custom modüller (Fabrmatch'e özgü genişletmeler)

## Kapsam DIŞINDA

- Designer rolü şimdilik YOK (bkz. [[00-MASTER-PRD]] Bölüm 7)
- Üretici (Manufacturer) kavramı bu sistemde YOK — bkz. [[03-PRD-URETICI-AGI]]
- Multi-store (bir satıcının birden fazla bağımsız mağazası) şimdilik YOK

## Teknik Yaklaşım

Mercur 2.0'ın "block-based" mimarisi — modül/link/workflow/API route/admin ve
vendor extension blokları doğrudan projeye kopyalanır (Mercur GitHub reposundan).
Bu, kodun tam sahipliğini sağlar, gelecekteki Fabrmatch'e özgü değişiklikler
(örn. üç değil dört taraflı komisyona geçiş, Designer eklenince) doğrudan bu
kopyalanmış kod üzerinde yapılır — dış bir pakete bağımlı kalınmaz.

## Başarı Kriterleri

- Bir satıcı, başka bir satıcının ürün/sipariş verisine hiçbir şekilde erişemiyor
  (izolasyon testi)
- Sipariş tamamlandığında komisyon otomatik hesaplanıp doğru tutar Stripe Connect
  ile satıcıya aktarılıyor
- Yeni bir satıcı, kayıt olup ilk ürününü 10 dakikadan kısa sürede oluşturabiliyor
