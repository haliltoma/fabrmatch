# Paket V — Dış mağaza kataloğu, yerel fiyat ve kur, üretici maliyeti + kâr

Durum: **tartışma** (2026-10-01). Görevler `docs/tasks.md` → "Paket V". Kararlar bu dosyada tutulur; yeni karar çıktıkça "Kararlar" bölümüne tarihli eklenir.

## 1. Kullanıcının istekleri (aynen)

> - Dışarıdan gelen satıcılar için shopify, etsy, woocommerce, wix ve diğer e-ticaret platformlarına entegreli bizim sistemde satıcının oluşturduğu kataloğu dışarıya vermek ve bu sistemlerde alışverişte doğrudan sisteme gelip üreticinin onayıyla üretmesi olucak (detay kısımlarını tartışırız)
> - Fiyatlandırma kısımlarını şu şekilde düşünüyorum her ülkenin kendi yerel satıcısı olduğundan fiyatı kendi yerel para birimi ile yaptırmak veya yurtdışı satışlarında satıcı çeviri kur hesaplamalarını takılmadan fiyatı kurda üste yuvarlayıp o ara paydan kar elde edilebilir onun içinde adminde bir yer ayarlamaları yapılır.
> - Üretici yakınlık gibi parametreleri değiştirebilir ama ona göre fiyatlandırma yapılabilir.
> - Benim aklıma takılan bir nokta şu bizim stl yükle fiyatlandırma gör kısmı fiyat aralığı olması gerekiyor sebebi de şu üretici fiyatlandırmayı düşük bulabilir masraflarını karşılamayabilir onu nasıl orta yollu bir çözüm bulabiliriz bunun için bu örnekte bir sistemde nasıl yapılıyor internet araştırması yap ve optimize bir fiyatlandırma yapılacak sistem olması gerekiyor üreticinin masrafının üzerine %25-%30 kar ekleyerek kazandırmak lazım onunda bu şekilde bir kazanç elde etmesi gerekiyor onu çözmemiz lazım

## 2. Bugün sistem nasıl çalışıyor

### Dış mağazalar (R4, `flags.externalStores` kapalı)

- Shopify, WooCommerce ve Etsy adaptörleri hazır: `app/services/integrations/stores/`. Ortak sözleşme `StoreAdapter`; her adaptör `tests/contracts/store_adapter_contract.ts` testini geçer.
- Yayınlanan: ürün başına **malzeme başına bir varyant**. Fiyatı satıcı yazar ve fiyat **olduğu gibi** gider; mağazanın para birimine çevrilmez.
- Sipariş akışı: Shopify/Woo webhook'u veya Etsy'de 5 dakikalık yoklama → `external_orders` → `OrderService.createExternalDraft` (alıcı = satıcı, teslimat son müşteriye) → satıcı öder (cüzdan, yalnız TRY ve model B) → eşleştirme → **üretici teklifi kabul eder** (`MatchingService.acceptOffer`). İstenen "üretici onayı" bu adım; zaten var.
- Eksikler:
  - Wix ve diğer platformlar
  - fiyat ve stok senkronu, para birimi çevrimi
  - kısmi iade
  - Fabrmatch'ten mağazaya geri iptal/iade yazımı
  - ölçek ve renk varyantları
  - üretici gecikirse mağazaya ve satıcıya bildirim

### Fiyat motoru

- `calculatePrice` (`app/services/pricing/price_engine.ts`):
  - malzeme = gram × bölge referans gram fiyatı
  - makine = dakika × **sabit 50 TL/sa**
  - üretici payı = (malzeme + makine) × **1,15** + son işlem
  - sonra komisyon (%15) + kargo
- Hızlı fiyat (`quick_quote.ts`) **tek bir fiyat** gösterir. Slicer kullanmaz; saatte 12 g varsayar.
- Üreticinin yazdığı `pricePerGramMinor` yalnız bir **tavan**dır: bölge referansından pahalı olan üretici eşleşmez (`makerPriceFits`). Üreticinin gerçek maliyeti (filament, elektrik, amortisman, işçilik, hata) sistemde **yok**.
- Kullanıcının endişesi tam burada: formül bir üreticinin maliyetini karşılamayabilir, o da işi reddeder ya da zararına basar.

### Bölge ve kur

- `pricing_regions` (TR/EU/UK/US/ROW) şunları tutar: çarpan, malzeme gram fiyatı, komisyon, asgari tutar ve yuvarlama (`none` / `whole` / `charm99`).
- Kur: TCMB'den 6 saatte bir, `fxMarginBps` %3 tampon, en fazla 72 saat eski olabilir.
- Tampon fiyatın bileşenlerine dağılıyor; yuvarlama fazlası komisyona ekleniyor. **Kur geliri için ayrı bir defter hesabı yok**, raporlanamıyor.

### Eşleştirme

- Aynı ülke zorunlu. Mesafe yalnız "aynı şehir mi" (1 / 0,5).
- Fiyat, seçilen üreticiye veya uzaklığa **bağlı değil**.

## 3. Araştırma: başka platformlar nasıl yapıyor

| Platform                       | Fiyatı kim belirler                                                                | Üreticinin rolü                                                 | Not                                                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Xometry**                    | Platformun fiyat motoru; aynı model **üreticiye ödenecek ikinci rakamı** da üretir | İş panosunda fiyat yazılı gelir: **kabul / pas / karşı teklif** | Her kabul ve pas, motora o üreticinin kabul edeceği en düşük fiyatı öğretir; %10 hizmet bedeli |
| **Hubs (Protolabs Network)**   | Platform                                                                           | Ödenmiş siparişi **kabul, red ya da karşı teklif**              | Aracı payı fabrika fiyatının %15–35 üstü                                                       |
| **Treatstock**                 | Üretici kendi gram fiyatını ayarlar                                                | Test modelde "beklenen kazancı" görerek fiyatını oynatır        | Platform ücreti en az $2,99, en fazla %25                                                      |
| **Craftcloud**                 | Her üreticinin kendi fiyat motoru                                                  | Alıcı, teklif listesinden seçer (fiyat + süre)                  | Platform kendi payını eklemediğini söylüyor                                                    |
| **Shopify Markets / Printful** | Kur + dönüşüm tamponu + yuvarlama kuralı                                           | —                                                               | Aynı bölgede üretilen siparişte yerel fiyat sabit; kur oynaması yalnız sınır ötesinde          |

**Sektörün maliyet formülü:** taban = (malzeme × 1,10 fire + makine saati + işçilik/kurulum + son işlem) ÷ (1 − hata oranı) × (1 + kâr).

**Yurt dışı satış (cross-border-ecommerce skill'i):**

- Fiyatı her zaman yerel para biriminde göster; yabancı parada sepet terk etme %33 daha yüksek (Shopify 2025).
- Kuru ödeme anında kilitle.
- Psikolojik yuvarlamayı yerelleştir (19,99 € / $19.99).
- Sınır ötesi satışta fiyata genelde %10–20 eklenir.

Kaynaklar:

- [Xometry topluluk: iş panosu, kabul/pas/karşı teklif](https://www.xometry.com/resources/blog/5-things-you-should-know-about-the-xometry-partner-network/)
- [Xometry'nin iki rakamlı fiyat modeli](https://constiv.substack.com/p/the-part-shipped-two-weeks-ago-do)
- [Xometry Instant Quoting Engine](https://www.xometry.com/machine-learning-for-manufacturing/)
- [3D Hubs iş modeli ve ortaklık](http://hubspot.3dhubs.com/help-center/what-is-3d-hubs)
- [Hubs ve doğrudan fabrika fiyatı](https://baoshengindustry.com/resources/3d-printing/hubs-vs-direct-3d-printing-factory/)
- [Treatstock fiyat rehberi](https://3dprint.com/143332/treatstock-new-pricing-guide/)
- [Treatstock: hizmet yayınlama](https://www.treatstock.com/help/article/18-how-to-publish-your-manufacturing-services)
- [Craftcloud](https://craftcloud3d.com/en/p/3d-printing-services)
- [Craftcloud anlatımı (All3DP)](https://all3dp.com/1/craftcloud-by-all3dp-simply-explained/)
- [3D baskı maliyet formülü](https://3dprintingcostcalculator.com/news/3d-printing-cost-formula)
- [İşçiliği unutmadan fiyatlama](https://mandarin3d.com/blog/how-to-price-3d-printing-jobs)
- [3D baskı saat ücreti 2026](https://layermath.com/blog/3d-printing-hourly-rate)
- [Shopify döviz kuru ve yuvarlama](https://help.shopify.com/en/manual/international/pricing/exchange-rates)
- [Printful fiyatlama](https://help.printful.com/hc/en-us/articles/360014068839-How-does-Printful-s-product-pricing-work)
- [Printify satış para birimi](https://help.printify.com/hc/en-us/articles/4483625794577-In-which-currency-can-I-sell-my-products)
- [Wix eCommerce Orders API](https://dev.wix.com/docs/api-reference/business-solutions/e-commerce/orders/orders/introduction)
- [Wix Store API rehberi](https://api2cart.com/api-technology/wix-store-api/)

## 4. Kararlar

| #        | Karar (2026-10-01)                                                                                                                                                                                    | Gerekçe                                                                                       |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **K-V1** | **Sabit fiyat + kabul** (Xometry/Hubs). Hızlı fiyat bir **aralık** gösterir, ödemede tek fiyat sabitlenir. Teklif yalnız **tabanı bu fiyata sığan** üreticiye gider; sığmayan karşı teklif verebilir. | Alıcı tek fiyat öder, beklemez. Üretici zararına iş görmez.                                   |
| **K-V2** | **Kâr: admin asgari belirler (varsayılan %25), üretici kendi kârını %30'a kadar artırabilir.**                                                                                                        | Kullanıcının %25–30 hedefi. Yüksek kâr seçen daha az iş alır; pazar kendini dengeler.         |
| **K-V3** | **Üretici payı sabit.** Üreticiye teklifte gördüğü tutar, yani kendi tabanı, ödenir. Sabit fiyat ile taban arasındaki fark **platform geliri** olur.                                                  | Üretici ne alacağını önceden bilir. Platform, fiyat aralığının riskini taşır.                 |
| **K-V4** | **Bölge para modu, admin seçer.** (a) yerel para fiyat tablosu veya (b) TRY tabanı + kur tamponu + yukarı yuvarlama. (b)'deki fark ayrı **`fx_gain`** defter hesabına yazılır ve raporlanır.          | Yerel üretici yerel parayla maliyet yapar. Çevrimli satışta kur farkı görünür bir gelir olur. |
| **K-V5** | **Mesafeye göre ek ücret.** Üretici kendi ek ücretini girer (ör. şehir dışı +%5, ülke geneli +%10, yurt dışı +%15). Bu ücret tabanına eklenir ve alıcı fiyatına yansır.                               | "Yakınlık parametresini değiştirebilir, fiyat ona göre olur."                                 |
| **K-V6** | **Platform sırası:** Trendyol/Hepsiburada → Wix → Amazon → eBay (Shopify, Etsy, WooCommerce hazır).                                                                                                   | Önce Türkiye pazar yerleri.                                                                   |

## 5. Önerilen fiyat akışı (örnek hesap)

Model: 100 g PLA, 5 saat baskı, alıcı İstanbul'da. Bölge TR (yerel para modu), komisyon %15, kargo 50 TL.

**Üretici A'nın maliyet profili (V1):** filament 600 TL/kg, makine 15 TL/sa, kurulum 30 TL, hata %5, kâr %25, aynı şehir.

| Kalem                          | Hesap                    | TL         |
| ------------------------------ | ------------------------ | ---------- |
| Malzeme                        | 0,1 kg × 600 × 1,10 fire | 66,00      |
| Makine                         | 5 sa × 15                | 75,00      |
| Kurulum/işçilik                |                          | 30,00      |
| Ara toplam                     |                          | 171,00     |
| Hata payı                      | 171 ÷ 0,95               | 180,00     |
| **Taban (üreticiye ödenecek)** | 180 × 1,25               | **225,00** |

Uygun üreticilerin tabanları: A 225, B 205, C 240, D 260.

- **Hızlı fiyat aralığı (V2):** tabanların alt ve üst ucuna komisyon ve kargo eklenir. Taban 205 → 205 × 1,15 + 50 = 286; taban 260 → 260 × 1,15 + 50 = 349. Ekranda: **"≈ 286 – 349 TL"**.
- **Ödemede sabit fiyat:** uygun üreticilerin %75'ini karşılayan taban (burada 240) → 240 × 1,15 + 50 = 326, bölge yuvarlamasıyla **329 TL**.
- **Teklif:** yalnız tabanı ≤ 240 olan A, B, C'ye gider. D isterse karşı teklif verebilir (V3).
- **A kabul ederse:**
  - A'ya **225 TL**, teklifte gördüğü sabit tutar.
  - Platform: komisyon 36 TL (240 × %15) + fark 15 TL (240 − 225) + yuvarlama 3 TL.
  - Kargo 50 TL.
  - Toplam = 329 TL.

**Yurt dışı / çevrimli satış (K-V4 b):** aynı 329 TL'lik sipariş EUR ile ödeniyor, orta kur 1 € = 36,00 TL.

- Kur karşılığı: 329 ÷ 36,00 = 9,14 €
- %3 tampon: 9,14 × 1,03 = 9,41 €
- Yukarı yuvarlama (`,99`): **9,99 €**
- 9,99 € ile 9,14 € arasındaki fark (0,85 € ≈ 30,60 TL) üreticiye veya komisyona karışmaz; `fx_gain` hesabına yazılır ve admin raporunda görünür.

## 6. Açık sorular (birlikte karar verelim)

1. **Sabitleme noktası:** sabit fiyat uygun üreticilerin %75'ini mi karşılasın, %80'ini mi? Üretici 3'ten azsa: bölge referansı ±%15 bant mı kullanılsın?
2. **Maliyet girmeyen üretici:** bölge varsayılan maliyetiyle mi eşleşsin, yoksa profil tamamlanana kadar teklif mi almasın?
3. **Karşı teklif:** farkı kim onaylasın (alıcı mı, admin mi)? Süre sınırı ne olsun (ör. 2 saat)? Onaylanmazsa sipariş sıradaki üreticiye mi geçsin?
4. **Kur varsayılanları:** bölge başına tampon ve yuvarlama ne olsun (ör. EU %3 + ,99; US %3 + .99; UK %3 + .99)?
5. **Trendyol/Hepsiburada:** satıcı kendi API anahtarıyla mı bağlansın, yoksa entegratör kaydı mı yapılsın? (Trendyol satıcı paneli API anahtarı verir; Hepsiburada entegratör onayı ister.)
6. **Geçiş:** üretici kârını %15'ten %25'e çıkarmak bugünkü fiyatları yükseltir. Komisyon mu düşsün (%15 → %10), alıcı fiyatı mı artsın, yoksa ikisi arası mı?
7. **Dış mağaza fiyatı:** satıcının mağazadaki fiyatı sabit kalır, Fabrmatch'in üretim fiyatı ise değişebilir. Satıcı kendi kârını mı korusun (fiyat senkronu), yoksa yalnız uyarı mı alsın?
