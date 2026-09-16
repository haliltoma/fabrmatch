# 04 — PRD: Güven, Adil Eşleştirme ve Dosya Koruma

> Üst dosya: [[00-MASTER-PRD]]. Teknik detay: eski
> `sistem-b-uretici-agi/07-GUVEN-SKORU-VE-DOSYA-KORUMA.md` ve
> `03-ESLESTIRME-MOTORU.md`'deki "Adil Eşleştirme" bölümü.

## Problem

İki ayrı ama ilişkili risk var: (1) salt performans skoruna dayalı eşleştirme
yeni/küçük üreticileri sonsuza dek dezavantajlı bırakır, (2) tasarımcının/satıcının
STL dosyası üreticiye verildiğinde fikri mülkiyet çalınma riski taşır.

## Hedefler

- Yeni üreticinin ilk siparişlerini alabilmesini garanti altına almak
- Tek bir üreticinin pazarı tekeline almasını önlemek
- Dosya paylaşımını, güven arttıkça esneyen bir modelle korumak

## Kapsam DAHİLİNDE

- Reputasyon skoru: teslimat uyumu, kalite tutarlılığı, iptal oranı, yanıt hızı, hacim
- Soğuk başlangıç nötr puanı (yeni üretici 0 değil, ortalama puanla başlar)
- Keşif payı (%20 ağırlıklı rastgele dağıtım — skoru düşük olana da şans)
- Maksimum pay tavanı (bir üretici bölgesel hacmin %30'undan fazlasını alamaz)
- Yeni üretici koruma dönemi (ilk 10-15 sipariş, düşük riskli işlere öncelik)
- Kademeli dosya erişimi: yeni/düşük reputasyon → sadece G-code/view-only;
  20+ sipariş → lisanslı STL + watermark + süre sınırlı erişim

## Kapsam DIŞINDA

- Ödeme/escrow mekanizmasının kendisi — bkz. [[05-PRD-ODEME-VE-KOMISYON]]

## Başarı Kriterleri

- Test verisinde yeni üretici skoru gerçek performansa göre makul sürede güncelleniyor
- Hiçbir üretici, simüle edilmiş yüksek hacimli bir dönemde tanımlı tavanı aşmıyor
- Düşük reputasyonlu bir üretici hesabından STL dosyası indirilemiyor, sadece
  görüntülenebiliyor
- Lisanslı STL dosyası süre dolduğunda otomatik erişimi kapanıyor
