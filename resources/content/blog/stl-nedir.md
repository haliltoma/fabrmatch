---
title: STL dosyası nedir? Baskıya hazır model kontrol listesi
description: STL biçiminin ne olduğunu, baskıdan önce modelinizde nelerin kontrol edilmesi gerektiğini ve sık görülen hataları anlatır.
date: 2026-09-24
---
# STL dosyası nedir? Baskıya hazır model kontrol listesi

STL, bir 3B modelin yüzeyini küçük üçgenlerle tarif eden dosya biçimidir. Renk, doku ya da malzeme bilgisi taşımaz; yalnızca şekli taşır. Bu yüzden hemen her 3B baskı hizmeti STL kabul eder.

## Baskıdan önce kontrol listesi

- **Kapalı yüzey:** Model "su geçirmez" olmalı. Delik ya da açık kenar varsa dilimleyici içini ve dışını ayırt edemez.
- **Doğru ölçü:** STL birim taşımaz. Milimetre bekleyen bir yerde metre ile hazırlanmış bir dosya çok küçük çıkar. Yüklemeden önce boyutları kontrol edin.
- **Duvar kalınlığı:** Çok ince duvarlar basılmayabilir. FDM için genellikle en az birkaç nozul genişliği gerekir; kesin değer teknolojiye ve malzemeye göre değişir.
- **Ters yüzler:** Normali ters dönmüş üçgenler baskıda eksik ya da bozuk bölgeler yaratır.
- **Gereksiz parçalar:** Modelin içinde kalmış, birbirine değen ya da havada duran ayrı parçalar temizlenmeli.
- **Yön ve destek:** Çıkıntılar destek gerektirir. Destek hem maliyeti hem yüzey kalitesini etkiler.

## Fabrmatch'te ne olur?

Yüklediğiniz dosya otomatik olarak analiz edilir: boyutlar, hacim ve baskıya engel olabilecek sorunlar raporlanır. Bu bir tasarım denetimidir; nihai baskı garantisi değildir. Gerçek fiyat için [fiyat aracını](/tools/quick-quote) kullanabilirsiniz.

Terimlerin kısa açıklamaları için [sözlüğe](/glossary) bakın.
