# 10 — Tasarım Aksiyon Planı (Anti-AI-Slop)

> Bu dosya [[06-PRD-TASARIM-SISTEMI]] ile birlikte okunur.
> Mevcut UI'daki sorunları tespit eder ve nasıl düzeltileceğini adım adım belirtir.
> Her düzeltme tamamlandığında ilgili satır işaretlenir.

## Neden Bu Dosya Var

AI üretimli kodun en yaygın tasarım sorunları:

1. **Generic görünüm** — `system-ui` font, düz beyaz/gri kartlar, ayırt edici karakter yok
2. **Kural ihlalleri** — Farkında olmadan token dışı renk, font agırlığı veya birden fazla solid buton
3. **Tutarsızlık** — Her ekran biraz farklı bir düzen, farklı boşluklar
4. **Boş durum körlüğü** — Loading/empty/error state'ler ya yok ya da style-sız düz metin
5. **Sahte "işlevsel" bileşenler** — 3D badge her ürünün üzerinde ama ürün 3D olmayabilir

---

## Tespit Edilen Sorunlar (öncelik sırasıyla)

### Kural Ihlalleri (en acil)

| # | Dosya | Sorun | Kural |
|---|-------|-------|-------|
| 1 | `CartPage.tsx:229–238` | Confirmation state'inde iki `fm-button--primary` aynı anda | 06 §5: ekranda max 1 solid sage buton |
| 2 | `tokens.css:.fm-hero h1` | `font-size: 28px` — 06'da tanımlanmamış boyut | 06 §2: h1=22px |

### AI Görünümü / Kimlik Sorunları

| # | Dosya | Sorun | Çözüm |
|---|-------|-------|-------|
| 3 | `BaseLayout.astro` | `system-ui, sans-serif` — generic AI font | Inter ekle (Google Fonts self-host) |
| 4 | `ProductCard.astro` | 3D badge her ürünün üzerinde — unconditional | `product.metadata?.print_profile` kontrolü ekle |
| 5 | `Header.astro` | Nav'da "ürünler" linki yok | `<a href="/urunler">ürünler</a>` ekle |
| 6 | `AuthPage.tsx` | Sayfa çerçevesi yok, form doğrudan ekranda | `fm-page` container ve başlık bölümü ekle |
| 7 | `CartPage.tsx` | Kargo seçenekleri yüklenirken loading state yok | Spinner satırı ekle |
| 8 | `ProductCard.astro` | Resim yokken görsel placeholder ikon yok | `ti-cube` ikonu göster |

### Ince Dokunuşlar (kalite)

| # | Dosya | Sorun | Çözüm |
|---|-------|-------|-------|
| 9 | `Footer.astro` | Çok minimal, B2B bağlantısı gömülü | Sayfa linkleri + B2B linki honey rengiyle |
| 10 | `tokens.css` | `fm-hero h1` 28px — 06'da belgelenmemiş | 06'ya "hero başlığı istisnası" olarak ekle |

---

## Uygulama Sırası

Bu sıra kasıtlıdır: kural ihlalleri önce, ince dokunuşlar sona.

- [x] **Adım 1:** Bu dokümanı yaz
- [x] **Adım 2:** `CartPage.tsx` — confirmation'daki çift primary butonu düzelt
- [x] **Adım 3:** `tokens.css` + `06-PRD-TASARIM-SISTEMI.md` — hero h1 28px belgelensin
- [x] **Adım 4:** `ProductCard.astro` — 3D badge conditional + resim placeholder
- [x] **Adım 5:** `Header.astro` — ürünler linkini ekle
- [x] **Adım 6:** `BaseLayout.astro` — Inter font ekle
- [x] **Adım 7:** `AuthPage.tsx` — sayfa çerçevesi ekle
- [x] **Adım 8:** `CartPage.tsx` — kargo yükleniyor state
- [x] **Adım 9:** `Footer.astro` — içerik zenginleştir

---

## Anti-AI-Slop Kontrol Listesi (her bileşen için)

- [ ] Gradient, shadow, blur, glow YOK
- [ ] Renk sadece 06'daki tokenlar
- [ ] Font weight 400 veya 500
- [ ] Sentence case (buton, etiket, başlık)
- [ ] Ikon Tabler outline
- [ ] Ekranda max 1 solid sage buton
- [ ] Loading / empty / error durumu var
- [ ] Conditional mantık doğru (badge vb.)

---

## Referans Linkler

- [[06-PRD-TASARIM-SISTEMI]] — tek doğruluk kaynağı
- [[07-KARAR-GECMISI-VE-DEGISIM-GUNLUGU]] — alınan kararlar
- [[09-API-SOZLESMESI]] — sistem sınırları
