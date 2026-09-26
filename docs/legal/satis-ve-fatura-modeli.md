# Satış, tahsilat ve fatura modeli — araştırma notu (2026-09-26)

> Durum: **karar bekliyor (K-L)**. Bu not bir mali müşavir ve bir avukatla konuşmak için hazırlandı; hukuki görüş değildir. İşaretli (⚠) maddeler mutlaka uzman teyidi ister.

## 1. Soru

Alıcı Fabrmatch üzerinden para ödüyor. Para üreticiye (ve varsa satıcıya) gidiyor, platform komisyon alıyor.

- Bu parayı kim, hangi sıfatla tahsil eder?
- Faturayı kim, kime keser?
- Şirket yapısı nasıl olmalı?

## 2. Bağlayıcı kurallar (bulgular)

| Konu                                               | Kural                                                                                                                                                                                                           | Bizim için anlamı                                                                                                                                                                                               |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ödeme hizmeti (6493 sayılı Kanun)                  | Başkası adına para toplayıp sonra dağıtmak, banka / ödeme kuruluşu / e-para kuruluşu dışındakiler için izinsiz ödeme hizmetidir. Bu bir suçtur.                                                                 | Platform, **üreticinin** parasını kendi hesabında tutup dağıtamaz. İki yol var: parayı lisanslı kuruluş tutar (iyzico pazaryeri), ya da para zaten **bizim satış gelirimizdir** (bizim satıcı olduğumuz model). |
| Ön bilgilendirme (Mesafeli Sözleşmeler Yön. md. 5) | Tüketiciye **satıcının** adı/unvanı, MERSİS veya vergi numarası, açık adresi ve telefonu gösterilmek zorundadır. Aracı hizmet sağlayıcı bundan satıcıyla **müteselsilen** sorumludur.                           | Üretici hukuken "satıcı" olursa kimliği alıcıya gösterilmek **zorunda**. Bu, iş kuralı 1 ("alıcı üreticiyi görmez") ile doğrudan çelişir.                                                                       |
| Cayma hakkı (aynı yön. md. 15)                     | Tüketicinin isteğine göre hazırlanan, kişiye özel mallarda cayma hakkı yoktur. Bu istisna dar yorumlanır: renk/boyut seçmek ürünü kişiye özel yapmaz.                                                           | Alıcının yüklediği model → cayma yok. Katalog/vitrin ürünü → **14 gün cayma** var.                                                                                                                              |
| E-ticaret (6563 sayılı Kanun, 7416 değişikliği)    | Aracı hizmet sağlayıcıların ETBİS kaydı ve bilgilendirme yükümlülükleri var. Lisans ve kademeli kurallar büyük işlem hacimli pazaryerleri için.                                                                 | Başlangıçta lisans eşiğinin çok altındayız. ETBİS kaydı her modelde gerekli.                                                                                                                                    |
| %1 e-ticaret tevkifatı (GVK 94/19)                 | 1.1.2025'ten beri aracı hizmet sağlayıcı, mükellefiyeti olmayan satıcılara, muaf esnafa, basit usul ve 20/B kapsamındakilere yaptığı ödemelerden KDV hariç tutar üzerinden %1 keser. Muhtasarda aylık bildirir. | **Yalnız pazaryeri modelinde** bizim yükümlülüğümüz.                                                                                                                                                            |
| Evden internet satışı muafiyeti (GVK 9/6)          | 2026 hasılat haddi 1.900.000 TL. Şartlar: esnaf muafiyeti belgesi, üretim yaşanan konutta, sanayi tipi / seri üretim makinesi yok, tahsilat yalnız bu iş için açılan banka hesabından.                          | Evinde yazıcısı olan küçük üreticiler bu yolla girebilir. ⚠ Masaüstü 3D yazıcının "sanayi tipi makine" sayılmayacağı özelge ile teyit edilmeli.                                                                 |
| Muaf esnaftan alım (GVK 94/13)                     | Alan taraf gider pusulası düzenler ve tevkifat yapar (literatürde %2 / %5, mal/hizmet türüne göre).                                                                                                             | Bizim satıcı olduğumuz modelde, belgeli ev üreticisine ödemede uygulanır. ⚠ Oran mali müşavirle teyit edilmeli.                                                                                                 |
| E-arşiv / e-fatura                                 | Aracı hizmet sağlayıcılar ciro şartı olmadan e-fatura kapsamında. İnternet satışlarında e-arşiv fatura zorunlu. 2027'den itibaren istisna kalmıyor.                                                             | Şirket kurulur kurulmaz e-fatura, e-arşiv ve e-defter; bir entegratör şart (K-C).                                                                                                                               |
| iyzico pazaryeri                                   | Alt üye tipleri: bireysel, şahıs şirketi, limited/anonim. Tip sonradan değiştirilemez. IBAN zorunlu.                                                                                                            | Pazaryeri modelinde her üretici/satıcı için doğru tiple kayıt gerekir (R1-T1 kodu hazır).                                                                                                                       |

## 3. Seçenekler

### A. Pazaryeri (aracı hizmet sağlayıcı) — PRD'deki ilk varsayım

- **Tahsilat:** iyzico pazaryeri. Para lisanslı kuruluşta durur, ödeme onaylanınca alt üyeye (üretici/satıcı) doğrudan geçer.
- **Faturalar:**
  - Üretici alıcıya ürün faturası keser.
  - Satıcı, marj kalemi için alıcıya ayrı fatura keser.
  - Fabrmatch üretici ve satıcıya komisyon faturası keser.
- **Bizim ek yükümlülüğümüz:** %1 tevkifat.
- **Sorunlar:**
  - **Üretici kimliği alıcıya gösterilmek zorunda** → iş kuralı 1 bozulur.
  - Alıcı tek sipariş için 2 fatura alır.
  - Her üreticinin e-arşiv kesebilmesi gerekir; hobi üreticisi giremez.
  - iyzico'nun pazaryeri ürününü açması gerekir.

### B. Fabrmatch satıcıdır (fason üretim satın alan) — **ÖNERİ**

- **Tahsilat:** Alıcı Fabrmatch'tan satın alır. Tahsil edilen para **Fabrmatch'in kendi satış gelirdir**, başkası adına tutulan para değildir. Bu yüzden 6493 sorunu yok ve standart iyzico üye işyeri yeterli: bugün sandbox'ta çalışan kod bu model için doğru.
- **Faturalar:**
  - Alıcıya tek fatura: Fabrmatch keser, tam tutar, KDV dahil. Kurumsal alıcı VKN'si ile e-fatura alır.
  - Üretici, Fabrmatch'a fason üretim/mal faturası keser (şirket, şahıs, basit usul).
  - Esnaf muafiyeti belgeli ev üreticisi için Fabrmatch gider pusulası düzenler ve tevkifat yapar.
  - Satıcı (marka), marj için Fabrmatch'a fatura keser (tasarım/lisans/satış ortaklığı).
- **İş kuralları korunur:**
  - Üretici yalnız Fabrmatch'in tedarikçisidir; alıcıya gösterilmesi gerekmez (kural 1 yasal olarak da sağlam).
  - "Emanet" hukuki bir kavram olarak değil, **ödeme politikamız** olarak kalır: üreticiye ödeme `completed` sonrası ve açık anlaşmazlık yokken yapılır (kural 5).
- **Maliyetler:**
  - KDV tam tutar üzerinden hesaplanır. Kayıtlı üreticinin faturasındaki KDV indirilir; muaf/kayıtsız üreticiden alımda indirilecek KDV yoktur, fiyatlamada hesaba katılmalı.
  - Ürün sorumluluğu (6502) satıcı olarak bizdedir. Karşılığı: üreticiyle yazılı tedarik sözleşmesi ve kalite/geri alma maddeleri.
  - Muhasebe hacmi büyük: her siparişte alış ve satış faturası.
- **Kayıtsız hobi üreticisi:** ⚠ Ne fatura ne gider pusulası yolu temiz. Öneri: ödeme alabilmek için vergi durumu belgelenmiş olmalı (şirket, şahıs ya da esnaf muafiyet belgesi). Bu, `docs/notes.md`'deki "şirket bilgileri onaylandıktan sonra ödeme bilgileri açılacak" isteğiyle aynı şey.

### C. Karma

Kendi mağazası olan satıcılar (Etsy/Shopify, R4) kendi müşterilerine zaten kendileri satar; Fabrmatch o satıcıya B2B fason üretim satar. Bu, B'nin doğal uzantısıdır ve ayrı bir karar gerektirmez.

## 4. Öneri ve gerekçe

**B modeli.** Üç nedenle:

1. Üretici anonimliği ürünün temel kuralı. A modelinde bu kural yasal olarak sürdürülemez.
2. Para akışı lisans gerektirmez ve iyzico pazaryeri onayını beklemez. Mevcut entegrasyon canlıya bu haliyle çıkabilir.
3. Alıcı için tek satıcı, tek fatura ve tek muhatap: güven ve iade süreci basit.

Bedeli: KDV/fatura yükü ve ürün sorumluluğu. Bunlar muhasebe entegrasyonu ve tedarik sözleşmesiyle yönetilir.

## 5. Uzmana sorulacaklar

1. ⚠ B modelinde "emanet" ifadesi ve üreticiye `completed` sonrası ödeme politikası, 6493 açısından sorun yaratır mı? Beklenen cevap: kendi satış gelirimiz olduğu için yaratmaz.
2. ⚠ Masaüstü 3D yazıcıyla evde üretim esnaf muafiyetine (GVK 9/6) girer mi? Özelge alınmalı mı?
3. ⚠ Muaf esnaftan alımda gider pusulası tevkifat oranı (mal mı hizmet mi: fason baskı?).
4. ⚠ Satıcının (marka) marj geliri hangi belgeyle ve hangi sıfatla ödenir: tasarım lisansı mı, satış ortaklığı komisyonu mu?
5. Kayıtsız bireylerin hiç ödeme alamaması doğru mu, yoksa yıllık düşük bir sınırla izin verilebilir mi?
6. Şirket türü: Ltd. Şti. (sermaye / sorumluluk / ileride yatırım için A.Ş. dönüşümü).
7. Ürün sorumluluğu sigortası ve üretici tedarik sözleşmesi taslağı.
8. Yurt dışı alıcılar: ihracat/KDV istisnası, mikro ihracat (ETGB) — R6 zamanı.

## Kaynaklar

- GVK 94/19 %1 tevkifat: [TÜRMOB sirküleri](https://www.turmob.org.tr/ekutuphane/Read/2db7c0aa-07af-4a65-91fe-262bf0ab5817), [Grant Thornton](https://www.grantthornton.com.tr/vergi-sirkuleri/2025-vergi-sirkuleri/elektronik-ticaret-kapsaminda-yapilan-odemelerde-tevkifat-uygulamasi/), [PwC](https://www.pwc.com.tr/tr/hizmetlerimiz/vergi/bultenler/2024/elektronik-ticarette-hizmet-saglayicilarina-yapilan-odemelerde-tevkifatla-ilgili-teblig.html)
- 6493 izinsiz ödeme hizmeti: [Craftgate](https://blog.craftgate.io/odeme-hizmeti-sunma-ve-lisans-alma-yukumlulugu), [Ersan Şen Hukuk](https://sen.av.tr/en/makale/6493-sayili-kanun-kapsaminda-izinsiz-faaliyette-bulunma-sucunda-odeme-hizmeti), [mevzuat.gov.tr 6493](https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6493&MevzuatTur=1&MevzuatTertip=5)
- Mesafeli Sözleşmeler Yönetmeliği md. 5 ve 15: [mevzuat.gov.tr](https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=20237&MevzuatTur=7&MevzuatTertip=5), [Ticaret Bakanlığı](https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/mesafeli-sozlesmeler-hakkinda-bilgilendirme), [Hukukçular Evi (md.15)](https://hukukcularevi.com/mesafeli-sozlesme-cayma-hakki-istisnalari/)
- 6563 / 7416 pazaryeri rejimi: [mevzuat.gov.tr 6563](https://www.mevzuat.gov.tr/mevzuatmetin/1.5.6563.pdf), [Rona Legal](https://www.ronalegal.com/tr/blog/eticaret-pazaryeri-esikler-lisans-6563)
- Esnaf muafiyeti (2026 haddi 1.900.000 TL): [GİB](https://www.gib.gov.tr/vergi-konulari/2_isletme_ve_girisimci/3_esnaf_muafligi/3), [Muhasebe News](https://www.muhasebenews.com/2026-internet-ve-benzeri-elektronik-ortamlar-uzerinden-satis-yapanlarin-esnaf-muafiyeti-satis-hasilati-haddi-1-900-000-tl-oldu/), [Paraşüt](https://www.parasut.com/blog/evden-e-ticaret-yapanlara-vergi-muafiyeti)
- Muaf esnaftan alımda gider pusulası/tevkifat: [GİB esnaf muaflığı](https://www.gib.gov.tr/vergi-konulari/2_isletme_ve_girisimci/3_esnaf_muafligi/3), [Alomaliye](https://www.alomaliye.com/2014/06/06/vergi-hukukunda-gider-pusulasi-duzenleme-zorunlulugu/)
- E-arşiv/e-fatura 2026: [BirFatura](https://birfatura.com/e-arsiv-fatura-zorunlulugu-olan-mukellefler/), [Paraşüt](https://www.parasut.com/blog/e-fatura-ve-e-arsiv-zorunlulugu)
- iyzico alt üye tipleri: [iyzico docs](https://docs.iyzico.com/urunler/pazaryeri/pazaryeri-entegrasyonu/alt-uye-olusturma)
