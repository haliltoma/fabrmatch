# Türkçe Anahtar Kelime ve Talep Araştırması (M0-T3)

**Tarih:** 2026-09-23 · **Kaynaklar:** `.agents/product-marketing.md`, `docs/marketing.md §5–6`, 13 web araması (WebSearch).

## 0. Yöntem ve sınırlar (önce oku)

- **Hacim: hepsi `YOK`.** Keyword aracı yok; hiçbir hacim, zorluk (KD) veya CPC uydurulmadı.
- **"Sıralama" = arama aracının döndürdüğü sonuç listesi**, gerçek Google.com.tr SERP'i değil. Arama aracı ABD çıkışlı, kişiselleştirmesiz; sıra sırasıyla listelenmiş olsa da gerçek TR SERP'ten farklı olabilir. SERP özellikleri (harita paketi, PAA, reklam, görsel) **gözlemlenemedi**. Bu bölümdeki alan adları "arama sonucunda göründü" anlamındadır; kesin sıralama iddiası değildir.
- Sonuç tipi (yerel servis / pazaryeri / blog) alan adı ve başlıktan çıkarıldı; sayfa içeriği tek tek incelenmedi (fetch yapılmadı).
- **Gerekli veri/araç (hacim ve gerçek SERP için):**
  1. **Google Keyword Planner** (Google Ads hesabı; TR/Türkçe, aralık verir) — hacim aralığı, rekabet.
  2. **Google Search Console** (yayın sonrası) — gerçek gösterim/tıklama/sorgu; asıl doğrulama kaynağı.
  3. **Google Trends (TR)** — göreli mevsimsellik/karşılaştırma (mutlak hacim vermez).
  4. Ahrefs/Semrush/Similarweb (varsa; Ahrefs MCP bağlı değil) — KD, rakip sıralama, TR SERP özellikleri.
  5. Manuel: gerçek TR IP'li tarayıcıda gizli pencerede SERP kontrolü (harita paketi, PAA, reklam).
  6. Rakip sitelerin iç arama/otomatik tamamlama önerileri (Google autosuggest, TR).

## 1. Tohum kelime listesi

Segmentler: **A = Alıcı/maker**, **S = Satıcı (Etsy/Shopify)**, **M = Üretici (yazıcı sahibi/atölye)**.
Niyet: **T** = işlemsel, **K** = ticari araştırma, **B** = bilgilendirici. Hacim: hepsi `YOK`.

### 1.1 A — Alıcı/maker

| #   | Kelime                                                  | Niyet     | Hacim |
| --- | ------------------------------------------------------- | --------- | ----- |
| A1  | 3d baskı hizmeti                                        | T         | YOK   |
| A2  | 3d baskı hizmeti istanbul / ankara / izmir              | T (yerel) | YOK   |
| A3  | stl dosyası yükle 3d baskı                              | T         | YOK   |
| A4  | online 3d baskı siparişi                                | T         | YOK   |
| A5  | 3d baskı fiyat hesaplama                                | T/K       | YOK   |
| A6  | 3d baskı fiyatları                                      | K         | YOK   |
| A7  | 3d baskı çıktı al                                       | T         | YOK   |
| A8  | prototip 3d baskı (istanbul)                            | T/K       | YOK   |
| A9  | hızlı prototipleme                                      | K         | YOK   |
| A10 | 3d baskı yedek parça üretimi                            | T/K       | YOK   |
| A11 | özel 3d baskı figür/parça                               | T         | YOK   |
| A12 | 3d baskı teklif al                                      | T         | YOK   |
| A13 | stl nedir                                               | B         | YOK   |
| A14 | pla petg abs farkı / hangisi                            | B/K       | YOK   |
| A15 | infill nedir                                            | B         | YOK   |
| A16 | 3d baskı için model hazırlama (duvar kalınlığı, destek) | B         | YOK   |

### 1.2 S — Satıcı

| #   | Kelime                                      | Niyet | Hacim |
| --- | ------------------------------------------- | ----- | ----- |
| S1  | etsy 3d baskı ürün satmak                   | B/K   | YOK   |
| S2  | 3d baskı ürün satışı nasıl yapılır          | B     | YOK   |
| S3  | şirket kurmadan 3d baskı ürün satışı        | B     | YOK   |
| S4  | stoksuz 3d baskı ürün satışı / dropshipping | B/K   | YOK   |
| S5  | 3d baskı print on demand                    | K     | YOK   |
| S6  | shopify 3d baskı işi nasıl başlatılır       | B     | YOK   |
| S7  | özel 3d ürün üretimi (toptan/adetli)        | T     | YOK   |
| S8  | 3d baskı ürün fiyatlandırma / kâr marjı     | B     | YOK   |

### 1.3 M — Üretici (yazıcı sahibi)

| #   | Kelime                                    | Niyet | Hacim |
| --- | ----------------------------------------- | ----- | ----- |
| M1  | 3d yazıcı ile para kazanmak               | B     | YOK   |
| M2  | 3d yazıcı ile ek gelir / iş fikirleri     | B     | YOK   |
| M3  | 3d yazıcı sipariş almak / üretici olmak   | K/T   | YOK   |
| M4  | 3d baskı hizmeti vermek / atölye kurmak   | B     | YOK   |
| M5  | 3d yazıcı ile nasıl para kazanılır 2026   | B     | YOK   |
| M6  | 3d baskı fiyat nasıl belirlenir (üretici) | B     | YOK   |

> Not: M grubu kelimeleri yüksek olasılıkla geniş bilgilendirici; gerçek "üretici platformu" niyeti (M3) SERP'te zayıf görünüyor, bkz. §2. Hipotez, hacimle doğrulanmalı.

## 2. Gözlenen SERP: ne sıralanıyor

Aşağıdaki alan adları arama aracında listelendi (listelenme sırasıyla). Sıra tahmini.

### 2.1 Alıcı — "3d baskı hizmeti" (A1)

- **Görülen:** armut.com (fiyat/hizmet dizini), 3dbaskihizmeti.net, yazdirgelsin.com, artiboyut.com, s43d.com, 3dhane.net, fibilo.com.
- **Tip:** ağırlıkla **yerel/online hizmet siteleri** (İstanbul ağırlıklı) + **bir hizmet pazaryeri/dizin (Armut)**. Blog baskın değil. Armut sayfası "Türkiye'de 1.001 firma" diyor (kendi iddiası, doğrulanmadı).
- **Çıkarım:** Fabrmatch bu kelimede hizmet sitelerine ve Armut'a karşı yarışır. Marka yok/otorite yokken kısa vadede zor; uzun kuyruk ve yerel/niş açılar daha gerçekçi.

### 2.2 Alıcı — STL yükle/fiyat (A3–A5)

- **Görülen:** uretimlab3d.com.tr, blog.3dbulut.com, 3dbaskitasarim.com, yazdirgelsin.com (fiyat hesapla sayfası), 3dbaski.com.tr (teklif al), s43d.com, teknoevimiz.com, 3dwecan.com (maliyet/STL analiz), teknodiot.com (filament maliyet hesaplayıcı).
- **Tip:** **Hesaplayıcı/araç sayfaları + yerel servis** karışık; birkaç blog içeriği. TR'de STL-yükle fiyat aracı zaten birçok rakipte var (UretimLab3D, 3DBulut, Yazdır Gelsin). Filament/maliyet hesaplayıcı aracı (3dwecan, teknodiot) da görünüyor → `marketing.md §6`'daki hesaplayıcı fikri rekabetsiz **değil**.
- **Çıkarım:** Fiyat hesaplayıcı tek başına fark yaratmaz; fark: emanetli ödeme, yerel üretici eşleşmesi. Hesaplayıcı yine de zorunlu (giriş bileti).

### 2.3 Alıcı — prototip + şehir (A2, A8)

- **Görülen ("prototip 3d baskı istanbul"):** armut.com/istanbul-3d-baski, istanbul3d.tr, 3dbaski.com.tr (blog tarzı şehir sayfası), 3durak.com, 3dbaskihizmetim.com, s43d.com, 3dbaskial.com, barrer3d.com.
- **Görülen ("3d baskı ankara"):** instagram (3dartolyemiz), armut.com/ankara-3d-baski + fiyat sayfası, 3dbaskial.com, cospier.com, ancreos.com, westonya.com, 3dbaskiankara.com.
- **Görülen ("3d baskı izmir hizmet"):** 3dbaski.com.tr, 3dprintim.tr, 3dbaskievi.com, 3dtasarimcim.com, 3dartarge.com, izmir3dbaski.com, tarama3d.com, tasarimdanimalata.com.
- **Tip:** **yerel atölyeler** (çoğu şehir adı alan adında/başlıkta) + **Armut şehir dizinleri** (fiyat/firma listesi) + tek bir "şehir rehberi" blog tarzı sayfa kalıbı (3dbaski.com.tr). Yani şehir sorgusu hem yerel servis hem dizin/pazaryeri.
- **Çıkarım:** Şehir sayfaları için Armut güçlü dizin rakibi; Fabrmatch yalnızca gerçek üretici verisi olan şehirde rekabet edebilir (§3).

### 2.4 Alıcı — yedek parça (A10)

- **Görülen:** fidrop.com.tr, 3dbaski.com.tr, itwise.com.tr (wiki), 3durak.com, s43d.com, ashrobotics.com, formbond.com, barrer3d.com, erlas.com.tr.
- **Tip:** **hizmet sitelerinin bilgilendirici/hizmet sayfaları** (otomotiv, eski model parça ağırlıklı). Pazaryeri yok.

### 2.5 Alıcı — bilgilendirici (A13–A15)

- **"pla petg abs farkı":** incehesap.com blog, robolinkmarket.com, 3dteknomarket.com (2 sayfa), blog.3dortgen.com, 3dprintermarketi.com, makerpazar.com (2 sayfa) → **yazıcı/filament satan e-ticaret siteleri blogları**.
- **"stl nedir":** blog.zaxe.com, bicisim.com blog, geo3dstl.com, tr.wikipedia değil (en.wikipedia STL), adobe.com/tr, eksisozluk.com, hwlibre → **donanım/servis blogları + Adobe + Wikipedia + forum-sözlük**.
- **"infill nedir 3d baskı":** incehesap.com, 3dteknomarket.com, blog.3dortgen.com, fixx3d.com (2), boyutkat.com, priyoid.com, fabri-lab.com, devreyakan.com → **yazıcı/filament satıcı blogları**.
- **Çıkarım:** Bilgilendirici sorgular **blog ağırlıklı, satıcı e-ticaret sitelerine ait**; otorite yüksek. Sözlük kelimeleri doğrudan rekabetli; alıcı niyetine (baskı hizmeti) bağlayan özgün açı gerekir.

### 2.6 Satıcı — Etsy/Shopify (S1–S6)

- **Görülen ("etsy 3d baskı ürün satmak nasıl yapılır"):** ideasoft.com.tr (Etsy dijital ürün), **shopify.com/tr/blog** (3D baskı işi nasıl başlatılır), shipentegra.com, mimi-panda.com, prinwork.com, boyutkat.com, 3dprinterdestek.com, baskiusta.com, techolay.net (forum).
- **Tip:** **blog + e-ticaret altyapı sağlayıcı blogları (Shopify, ikas/ideasoft)** + forum. Sonuçlar çoğunlukla **dijital ürün/printable** (Etsy'de dosya satışı) ile fiziksel 3D baskı ürün satışı karışık; niyet ayrışması var (sonuçlar içerik düzeyinde doğrulanmadı).
- **Görülen ("stoksuz 3d baskı ... dropshipping"):** ikas.com, ideasoft.com.tr, eticex.com, faprika.com, thatteknoloji.com, defterdar.com, r10.net (forum), yenitoptanci.com, 3dortgen shop. → **genel dropshipping blogları; 3D'ye özgü sonuç neredeyse yok** → **boşluk fırsatı hipotezi** (gerçek SERP ve hacimle doğrulanmalı). r10.net'te "stoksuz print-on-demand" (tişört) konusu var: POD kavramı TR'de tişörtle bilinir.
- **Çıkarım:** "3D için print on demand/stoksuz" açısı boş/az dolu görünüyor; blog içeriği hedefleyebilir. Shopify TR bloğu güçlü otorite rakibi.

### 2.7 Üretici — gelir (M1–M5)

- **Görülen ("3d yazıcı ile para kazanmak"):** medium.com, technopat.net (forum), 3dteknomarket.com, 3d3teknoloji.com, 3durak.com, teknoerbilisim.com, 3dedi.com, boyutkat.com, metatechtr.com. **"…2026 için 8 fikir": shopify.com/tr/blog**.
- **Tip:** **yazıcı satan mağaza blogları + forum + Medium** — niyet "yazıcı alsam kazanır mıyım" (yazıcı satın alma öncesi), yani **mevcut yazıcı sahibi değil, potansiyel alıcı** olabilir. Fabrmatch için niyet karışık.
- **Görülen ("3d yazıcı sipariş al üretici olmak platform"):** shopify.com/tr, yazdirgelsin.com, 3dbaskial.com, **3dedi.com** (modeli yükle, firmalardan teklif al), 3dcim.com, 3dortgen.com, s43d.com, 3durak.com. **3dedi.com** açıkça çok firmalı teklif platformu olarak görünüyor → **doğrudan yerel pazaryeri rakibi olabilir; M0-T2'de incelenmeli.**
- **Çıkarım:** Üretici tarafı için net "platforma katıl/sipariş al" SERP'i zayıf; üretici edinimi büyük olasılıkla arama değil topluluk/doğrudan kanal (bkz. `marketing.md §3`).

### 2.8 Özet tablo

| Grup                                     | Ağırlıklı SERP tipi                       | Not                                    |
| ---------------------------------------- | ----------------------------------------- | -------------------------------------- |
| A işlemsel (hizmet, STL, prototip)       | Yerel servis siteleri + Armut dizini      | Pazaryeri: Armut, 3dedi (çoklu teklif) |
| A şehir                                  | Yerel atölye + Armut şehir sayfaları      | Şehir başına onlarca firma             |
| A bilgilendirici (STL, PLA/PETG, infill) | Yazıcı/filament satıcı blogları           | Yüksek otorite                         |
| S Etsy/Shopify                           | Blog (Shopify TR, ideasoft, ikas) + forum | 3D-POD boşluğu olası                   |
| M gelir                                  | Yazıcı satıcı blogları + forum + Medium   | Niyet yazıcı satın alma öncesi         |

## 3. Programatik SEO aday sayfa haritası

Kaynak ilke: `programmatic-seo` — sayfa başına özgün değer; ürün-türevi veri en güçlü; ince/doorway sayfa yok. Şu an canlı üretici/veri yok → **hiçbir programatik sayfa veri olmadan yayınlanmaz.**

### 3.1 Sayfa tipleri

| Tip                                   | URL (öneri)                                                                               | Sayfa başına gereken gerçek veri                                                                                                                                                                                                  | Ek (editoryal, veri sayılmaz)             |
| ------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Şehir                                 | `/3d-baski/{sehir}`                                                                       | Şehirdeki **aktif, onaylı üretici sayısı**; şehirde desteklenen malzemeler/teknolojiler (FDM/SLA…); gerçekleşmiş siparişlerden **ortalama teslim süresi** (min. N sipariş); şehre teslim kargo süresi; örnek fiyat (gerçek hesap) | Şehre özgü SSS                            |
| Şehir × malzeme (yalnız veri yoğunsa) | `/3d-baski/{sehir}/{malzeme}`                                                             | O şehirde o malzemeyi basan üretici sayısı + örnek fiyat                                                                                                                                                                          | –                                         |
| Malzeme                               | `/malzeme/{pla,petg,abs,tpu,recine}`                                                      | Katalogdaki (`R2-T3`) malzeme özellikleri; platformdaki gerçek örnek fiyat aralığı (g başına), desteklenen üretici sayısı                                                                                                         | Kullanım ve kısıt anlatımı                |
| Kullanım/persona                      | `/3d-baski/prototip`, `/3d-baski/yedek-parca`, `/3d-baski/etsy-satici`, `/3d-baski/figur` | Gerçek vaka/sipariş (izinli), tipik malzeme, gerçek fiyat örneği, akış ekran görüntüsü                                                                                                                                            | Kullanım rehberi                          |
| Sözlük                                | `/sozluk/{stl-nedir,infill,manifold,destek-yapisi,katman-yuksekligi,fdm-vs-sla}`          | Veri gerekmez (editoryal); mümkünse platform analizör çıktısından örnek                                                                                                                                                           | Tanım + görsel + "bunu baskıya çevir" CTA |
| Karşılaştırma                         | `/karsilastir/{rakip}-alternatifi`                                                        | Doğrulanmış rakip profili (M0-T2 tamamlanmalı)                                                                                                                                                                                    | –                                         |

### 3.2 Yayın (noindex) kuralları

Şehir sayfası `index` **yalnız** şu koşulların hepsi sağlanırsa; aksi halde `noindex, follow` + sitemap dışı + iç link yok:

1. Şehirde ≥ **N aktif, onaylı üretici** (N: ürün/pazarlama kararı; taslak öneri N=3, `marketing.md`'de "≥ N" olarak açık).
2. Sayfadaki sayılar **canlı DB'den** geliyor (sabit metin değil).
3. Sayfa, aynı şablonun diğer şehirlerinden **en az bir şehre özgü gerçek veri** ile ayrışıyor (üretici sayısı, malzeme listesi, teslim süresi).
4. Teslim süresi ortalaması yalnız **≥ M tamamlanmış sipariş** varsa gösterilir; yoksa alan gizlenir (M taslak: 10, açık karar).

Malzeme/kullanım sayfaları: gerçek örnek fiyat + en az bir aktif üretici yoksa `noindex`. Sözlük sayfaları: min. özgün içerik uzunluğu + görsel varsa index. Yüklenen model içeren hiçbir sayfa (kural 4) indexlenmez. Üretici kimliği hiçbir sayfada görünmez (kural 1): yalnız **sayılar**, isim/marka yok.

### 3.3 Öncelik

1. Sözlük + malzeme (veri bağımsız, hemen başlanabilir; ama rekabetli — bkz. §2.5).
2. Kullanım sayfaları (prototip, yedek parça, Etsy satıcı) — vaka geldikçe.
3. Şehir sayfaları — **en son**, üretici arzı kanıtlanınca (İstanbul/Ankara/İzmir'de yerel rakip yoğun; Armut dizinleri güçlü).

## 4. 10 içerik fikri

Hacim tüm satırlarda `YOK`. Niyet: B bilgilendirici, K ticari araştırma, T işlemsel.

| #   | Başlık fikri                                                                                        | Hedef kelime                                         | Niyet | Segment | Not                                                                                  |
| --- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----- | ------- | ------------------------------------------------------------------------------------ |
| 1   | STL dosyası nedir? Baskıya hazır model kontrol listesi                                              | stl nedir                                            | B     | A       | Sözlük+DFM aracı CTA'sı; SERP blog ağırlıklı (§2.5)                                  |
| 2   | PLA, PETG, ABS: hangisini hangi parça için seçmeli? (gerçek fiyat örnekleriyle)                     | pla petg abs farkı                                   | B/K   | A       | Platform fiyat verisi farkı yaratır                                                  |
| 3   | 3D baskı fiyatı nasıl hesaplanır? (gram, süre, destek, kargo) + hesaplayıcı                         | 3d baskı fiyat hesaplama                             | K/T   | A       | Hesaplayıcı sayfası; rakip çok (§2.2)                                                |
| 4   | Prototip 3D baskı: adım adım, ne kadar sürer                                                        | prototip 3d baskı                                    | K     | A       | KOBİ/prototip Faz 8 sonrası; ürün hazır olunca                                       |
| 5   | Etsy'de fiziksel 3D baskı ürün satmak: stoksuz model                                                | etsy 3d baskı ürün satmak                            | B/K   | S       | Dijital ürün/printable sonuçlarından ayrış; mağaza entegrasyonu henüz yok, vaat etme |
| 6   | Stoksuz 3D ürün satışı: 3D için print on demand nedir?                                              | stoksuz 3d baskı ürün satışı                         | B/K   | S       | SERP'te 3D-özgü sonuç az görüldü (fırsat hipotezi)                                   |
| 7   | 3D baskı ürün fiyatlandırma ve kâr marjı hesabı                                                     | 3d baskı ürün fiyatlandırma                          | B     | S       | Marj hesaplayıcı (`§6`) ile bağlı                                                    |
| 8   | Yazıcınızla ek gelir: sipariş alan üretici için fiyat ve kapasite planı                             | 3d yazıcı ile para kazanmak / ek gelir               | B     | M       | Niyet karışık; gerçek üretici verisi gelince ekle; gelir rakamı uydurma              |
| 9   | Eski/üretimi biten parça için 3D baskı yedek parça: ne mümkün, sınırlar (±0,1–0,3 mm toleransı FDM) | 3d baskı yedek parça üretimi                         | B/T   | A       | Tolerans bilgisi SERP'te (itwise) geçiyor; kendi testinle doğrula                    |
| 10  | Güvenli ödemeyle 3D baskı yaptırma: emanet nasıl çalışır                                            | 3d baskı güvenli sipariş (yeni; kelime doğrulanmalı) | K     | A       | Farklılaşma (emanet+dispute) ama bu terim TR'de aranıyor mu: YOK                     |

## 5. Açık sorular ve sonraki adımlar

1. Keyword Planner ile §1 listesinin hacim aralığı; öncelik sırası hacimle netleşir.
2. TR IP'li gerçek SERP kontrolü: harita paketi/PAA/reklam; özellikle A1, A2, A8.
3. **3dedi.com, Yazdır Gelsin, UretimLab3D, 3DBulut** rakip profili M0-T2'ye (çok firmalı teklif = doğrudan pazaryeri adayı: 3dedi).
4. Karar: şehir sayfası N ve M eşikleri (§3.2).
5. Müşteri dili doğrulaması (forum: Technopat, Techolay, r10.net) — `customer-research`.
6. Search Console kurulumu lansmandan önce; bu dokümandaki "gözlenen SERP" gerçek verilerle değiştirilmeli.

## Kaynaklar (arama sorguları)

3d baskı hizmeti · stl dosyası yükle 3d baskı fiyat hesaplama · prototip 3d baskı istanbul · 3d baskı ankara · 3d baskı izmir hizmet · etsy 3d baskı ürün satmak nasıl yapılır · 3d yazıcı ile para kazanmak · 3d yazıcı sipariş al üretici olmak platform · 3d baskı yedek parça üretimi · stoksuz 3d baskı ürün satışı dropshipping · pla petg abs farkı hangisi · stl nedir · infill nedir 3d baskı. (Tarih: 2026-09-23.)
