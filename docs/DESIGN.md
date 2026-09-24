# Fabrmatch Tasarım Kuralları ("Filament" kimliği)

> Tek doğru kaynak. Her UI işinden önce oku. Hangi skill'in nerede kullanılacağı: `docs/DESIGN_SKILLS.md`.
> Karar tarihi: 2026-09-23. Neden değişti: ilk sürüm varsayılan Tailwind indigo + Inter + "3 ikonlu kart"
> şablonuydu (yapay zeka görünümü) ve birçok sayfa boştu.

## 1. Kimlik — tek cümle

**Bir 3D yazıcının tablasından yeni çıkmış parça gibi: sıcak kâğıt zemin, mürekküb siyahı, tek bir
"ekstrüder turuncusu" ve her yerde ince katman çizgileri.** Güven veren, zanaatkâr, teknik ama soğuk değil.

İmza detaylar (bir ekran görüntüsünden Fabrmatch olduğu anlaşılmalı):

1. **Katman çizgisi dokusu** — ince yatay çizgi deseni (`.layer-lines`), hero ve boş durum zeminlerinde.
2. **Katman yığını ilerleme** (`LayerStepper`) — sipariş durumu, üst üste basılan katmanlar olarak gösterilir.
3. **Mono sipariş kodu** — `FO-8K3M…` JetBrains Mono, tabular rakam; baskı etiketi gibi.
4. **Tek turuncu vurgu** — bir ekranda en fazla 2 kez turuncu (CTA + bir durum).

## 2. Token'lar (kaynak: `inertia/css/app.css`; değer değiştirme = önce burayı güncelle)

| Rol              | Token                   | Değer                                                      | Not                                                                 |
| ---------------- | ----------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------- |
| Metin/koyu yüzey | `ink` (50…950)          | 900 `#15181C`, 800 `#23282E`, 600 `#4A525B`, 500 `#6B737C` | Saf siyah yok                                                       |
| Zemin            | `paper`                 | `#F5F2EC` (sayfa), `#FFFFFF` (kart), `#ECE7DE` (çukur)     | Sıcak, beyaz değil                                                  |
| Vurgu            | `heat`                  | 500 `#F0501E`, 600 `#D8410F`, 700 `#B83A10`                | Buton: heat-500 zemin + **ink metin** (4.5:1); metin/link: heat-700 |
| Doğrulama/başarı | `fil` (filament yeşili) | 600 `#2F7D5B`, 100 `#DCEFE5`                               | "Doğrulanmış üretici", tamamlandı                                   |
| Uyarı            | `amber`                 | `#B7791F` / `#FBEFD5`                                      | SLA, bekleyen                                                       |
| Hata             | `danger`                | `#C62828` / `#FBE3E3`                                      |                                                                     |
| Çizgi            | `line`                  | `ink-900/12%`                                              | 1px kenarlık; gölge yerine kenarlık                                 |

**Yasak:** Tailwind varsayılan indigo/violet/purple (`#6366f1 #4f46e5 #4338ca #3730a3 #8b5cf6 #7c3aed`),
iki duraklı "güven" gradyanı, `brand-*` eski ölçeği (kaldırıldı).

## 3. Tipografi (self-host, `@fontsource-variable`; Google CDN yok)

- **Display:** Bricolage Grotesque (başlıklar, sayılar; `font-display`, ağırlık 600–700, `tracking-tight`).
- **Gövde:** Instrument Sans (`font-sans`).
- **Mono:** JetBrains Mono (`font-mono`): sipariş kodu, takip no, fiyat tablosu, tabular-nums.
- Ölçek: 12 / 14 / 16 / 20 / 28 / 40 / 64. Gövde 16px (mobil formda 16 → iOS zoom yok), satır 1.6.
- H1 yalnız 1 tane; başlık sırası atlanmaz. Para: `formatMoney`, sağa hizalı, `tabular-nums`.
- Metin dili: sayfa içeriği İngilizce (mevcut), ton: kısa, somut, fiil odaklı ("Upload a model", "Accept offer");
  "Get started", "Learn more", "Unlock", "Seamless", "Elevate" yasak.

## 4. Şekil, boşluk, hareket

- Yarıçap: 6px (kontroller), 10px (kart/panel); tam yuvarlak yalnız avatar/rozet. Kart kenarlığı `line`, gölge yok
  (yükseltilmiş yüzey yalnız dialog/dropdown).
- 4px tabanlı boşluk; bölüm dikey ritmi: sıkı bölüm (py-10) / ferah bölüm (py-20) **dönüşümlü**.
- Odak halkası: 2px `heat-500` + 2px offset, hiçbir yerde kapatılmaz.
- Hareket: 150–300ms, `ease-out`; yalnız `transform/opacity`. `prefers-reduced-motion` → animasyonsuz son hâl.
  Giriş: liste/kart 40ms stagger. Ana sayfada tek "katman katman belirme" kaydırma sahnesi (skill: `gsap-framer-scroll`).
  Dashboard/formlarda süs animasyon yok.
- İkon: Lucide, `strokeWidth 1.75`, `currentColor`; **emoji ikon yok**; ikon tek başına anlam taşımaz (etiket şart).

## 5. Bileşen envanteri (paylaşılan; yeni sayfa bunları kullanır, kopyalamaz)

Mevcut `inertia/components/ui/*` (shadcn): button, card, badge, input, label, dialog, dropdown_menu, sheet, avatar, separator.
Eklenen paylaşılanlar (`inertia/components/`):

| Bileşen              | Amaç                                                                                |
| -------------------- | ----------------------------------------------------------------------------------- |
| `PageHeader`         | Başlık + açıklama + sağda aksiyon; her panel sayfasının ilk satırı                  |
| `EmptyState`         | **Boş sayfa yasak.** İkon/katman deseni + tek cümle + tek birincil aksiyon          |
| `StatTile`           | Dashboard sayısı: etiket, büyük sayı (display), bağlam satırı; sayı **gerçek veri** |
| `StatusBadge`        | Sipariş/iş/dispute durumları için tek renk-anlam eşlemesi (§7)                      |
| `LayerStepper`       | Sipariş zaman çizelgesi (imza öğe)                                                  |
| `OrderCode`          | Mono etiket + kopyala                                                               |
| `Money`              | `formatMoney` + tabular + para birimi                                               |
| `.layer-lines` (css) | Katman çizgisi arka planı                                                           |

## 6. Sayfa envanteri ve yapı (site haritası → düzen tarifi)

| Alan         | Sayfalar                                                           | Layout                              | Tarif                                                                                                              |
| ------------ | ------------------------------------------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Herkese açık | `home`, `shop/index`, `shop/show`                                  | `default`                           | Üst bar: logo · Shop · (giriş/kayıt veya kullanıcı). Ferah ritim, hero düz zemin + katman çizgisi, **gradyan yok** |
| Auth         | `auth/login·signup·forgot_password·reset_password`, `onboarding/*` | `auth`                              | Bölünmüş: sol ink panel (katman deseni + tek somut vaat), sağ form. Hata alanın yanında                            |
| Alıcı        | `orders/index·show`, `files/index·quote`                           | `default` (dashboard'a taşınabilir) | Sipariş = kart listesi + LayerStepper; quote = hesap makinesi düzeni (sol girdi, sağ canlı fiyat dökümü)           |
| Satıcı       | `seller/dashboard`, `seller/products/index`                        | `dashboard`                         | StatTile'lar gerçek veri; boşsa EmptyState "Add your first product"                                                |
| Üretici      | `maker/dashboard`, `printers`, `capacity`, `work`                  | `dashboard`                         | `work`: teklif kartları geri sayım (heat), iş kartları LayerStepper mini                                           |
| Admin        | `admin/dashboard`, `catalog`, `disputes/*`                         | `dashboard`                         | Yoğun tablo/liste (density 7), karar formu sağda sabit                                                             |
| Hata         | `errors/*`                                                         | `default`                           | İnsan dili + tek çıkış linki                                                                                       |

Dashboard layout: sol kenar çubuğu **ink-900**, etkin öğe sol 3px heat çizgisi + paper metin; üst bar paper; içerik `max-w-6xl`.
Mobil: kenar çubuğu Sheet; tablolar kartlara çöker; dokunma hedefi ≥ 44px.

## 7. Durum → görünüm (tek eşleme; her yerde `StatusBadge`)

| Anlam         | Durumlar                                          | Görünüm                        |
| ------------- | ------------------------------------------------- | ------------------------------ |
| Nötr/bekleyen | draft, awaiting_payment, paid, matching, accepted | ink-100 zemin, ink-700 metin   |
| Aktif üretim  | in_production, printing, produced, shipped        | heat-100 zemin, heat-700 metin |
| Başarılı      | delivered, completed, resolved(release), paid_out | fil-100 / fil-600              |
| Dikkat        | unmatched, overdue, responded                     | amber                          |
| Sorun         | disputed, open, failed, cancelled(iptal=nötr)     | danger-100 / danger            |

## 8. Boş durum ve gerçek veri kuralları

- Hiçbir panel sayfası "No X yet" tek satırıyla bitmez: EmptyState = ne olduğu + **bir sonraki adım butonu**.
- Dashboard sayıları sabit `0` değildir; servisten gelir. Veri yoksa "—" değil, EmptyState.
- Uydurma metrik/referans/yorum yok; olmayan şey gösterilmez (ör. sahte "10.000 üretici").
- Placeholder görsel: yerel `.layer-lines` bloğu; harici CDN (unsplash/picsum) yok.

## 9. İçerik güvenliği (tasarım da iş kuralına tabidir)

- Alıcı/satıcı arayüzünde üretici kimliği yok; üretici arayüzünde alıcı kimliği yok (yalnız kargo alanları).
- Vitrinde model önizleme yok (kural 4). Para her yerde `Money`; float hesap yok.

## 10. Erişilebilirlik (WCAG 2.2 AA — pazarlık yok)

Kontrast ≥ 4.5:1 (metin), 3:1 (büyük/UI) · klavye ile her şey · görünür odak · `label for` · hata metni alanın yanında ·
renk tek başına anlam taşımaz (rozette ikon/metin) · `alt`/`aria-label` · hedef ≥ 24px (mobil 44px) · skip-link · sıralı başlıklar.

## 11. Performans / SEO

Font: `font-display: swap`, yalnız kullanılan ağırlık/alt küme · görsellere `width/height` · rota bazlı kod bölme ·
3D (three) yalnız kullanıldığı sayfada lazy · her genel sayfada `<Head>` title/description/canonical · Lighthouse SEO ≥ 95.

## 11b. Teknik notlar (tasarım altyapısı)

- Layout seçimi: sayfa `Page.layout = 'auth' | 'dashboard'` (veya hiçbiri = default) tanımlar; `inertia/lib/layouts.tsx#withLayout`
  bunu Inertia 3'ün beklediği bileşene çevirir (`app.tsx` + `ssr.tsx`). Tam genişlik sayfa: `Page.fullBleed = true`.
- Görsel doğrulama: `node ace serve` + Playwright ile giriş yapıp ekran görüntüsü (demo veri: `node ace db:seed --files database/seeders/demo_seeder.ts`;
  kullanıcılar `admin@fabrmatch.com/admin12345`, `maker@demo.test`, `seller@demo.test`, `buyer@demo.test` / `password123`).
- Font/hareket paketleri: `@fontsource-variable/*`, `motion` (framer-motion). `Reveal` bileşeni reduced-motion'a saygılıdır.

## 12. Teslim kontrol listesi (bitmiş sayılmaz)

- [ ] Yasak listesi taraması: indigo/mor, gradyan hero, emoji ikon, "3 ikonlu kart" dizisi, uydurma metrik, lorem, Inter/system-ui başlık
- [ ] Bir ekran görüntüsünde imza öğeden en az biri görünüyor (katman çizgisi / LayerStepper / mono kod)
- [ ] Boş durum var ve aksiyon içeriyor; sayılar gerçek
- [ ] Turuncu ekran başına ≤ 2
- [ ] 375 / 768 / 1024 / 1440 px kontrol edildi (gerçek tarayıcıda ekran görüntüsü)
- [ ] Klavye + odak + kontrast; `prefers-reduced-motion`
- [ ] `npm run typecheck && npm run lint && node ace test` yeşil

## 13. Ana sayfa yeniden tasarımı — POD referansları (2026-09-24)

Girdi: `docs/ref-images/*` (Printify, Printful, Gelato) ve `docs/marketing.md §19`. Amaç: ana sayfa "az/şablon" görünmesin;
bir dönüşüm iskeleti olsun (hero → kanıt → kitle adımları → keşif → hesaplayıcı → güven → içerik → kapanış → zengin footer).

### 13.1 Referanslardan renk/tasarım dersleri (ve bizim çevirimiz)

| Referans deseni | Görülen | Biz |
| --- | --- | --- |
| Tam genişlik renk bantları | Printify limon/koyu yeşil/açık mavi, Printful koyu deniz mavisi/kırmızı, Gelato krem/mercan | `paper` (#F5F2EC) ↔ `ink-900` ↔ **tint bantları**: `fil-100`, `heat-100`, `amber-100` (yeni: `tide-100 #DCEAF0` yalnız harita/istatistik bandı) |
| Pastel blok kolajı + gerçek fotoğraf | Gelato: turuncu/pembe/mavi/sarı bloklar içinde insan+ürün | Bloklar = **filament spool paleti** (aşağıda) içinde özgün SVG baskı parçaları; fotoğraf yok (§8: harici CDN yasak) |
| Büyük sonuç rakamı | Printify limon yeşili $321.16, Printful kırmızı | Sonuç rakamı `font-display` 64px, `fil-600` (kazanç) — turuncu değil |
| Cesur, kısa, büyük harfli/serif olmayan H1 | Printify tam büyük harf | Bricolage Grotesque 600–700, `tracking-tight`; büyük harf yok (okunurluk, TR karakter) |
| Sıfır risk rozet satırı | "100% free · 2000+ products · global delivery" | 3 rozet, **yalnız doğru olanlar** (bkz. marketing §19.1-2), Lucide ikon + etiket |

**Filament spool paleti (yalnız illüstrasyon zemini; UI durum rengi DEĞİL):** `spool-orange #F0501E`, `spool-teal #2F7D8B`, `spool-mustard #D9A420`, `spool-sage #9DB8A0`, `spool-rose #E7A79A`, `spool-ink #23282E`.
Tint zeminler: her birinin %15–25 karışımı (`bg-spool-*/15`). Uygulandı: `inertia/css/app.css` (`--color-spool-*`, `--color-tide-100`), `components/print_art.tsx` (vase, planter, stand, clip; katman çizgisi maskesi). Yasak listesi geçerli (indigo/mor yok). Turuncu kuralı: **bir ekranda CTA + en çok bir illüstrasyon parçası**.

### 13.2 Bölüm sırası (hedef ana sayfa)

1. **Hero** — H1 sonuç odaklı; birincil CTA "Anında fiyat" (kayıtsız), ikincil "Mağazaya göz at"; altında 3 gerçek güven rozeti; sağda SVG baskı parçaları kolajı + LayerStepper kartı (imza öğe).
2. **Kanıt şeridi** — yalnız gerçek: ürün yorum ortalaması (varsa), doğrulanmış üretici sayısı (eşik), "İstanbul'da başlıyoruz".
3. **Kitle sekmeleri** — Alıcı · Satıcı · Üretici: her sekmede 3 adım + tek CTA.
4. **Keşif** — katalogdan gerçek ürün şeridi (kaydırmalı, `/shop`'a) + malzeme kartları (`/materials`).
5. **Hesaplayıcı bandı** (koyu `ink-900`) — satıcı marjı / üretici geliri mini araç + "örnektir, söz değil".
6. **Emanet bandı** (mevcut, LayerStepper ile birleşik).
7. **Yakınlık/ağ bandı** (`tide-100`) — Türkiye illüstrasyonu (İstanbul işaretli), gerçek sayaçlar eşik üstündeyse.
8. **Öğren** — blog/sözlük/malzeme/araç kartları (gerçek içerik).
9. **Kapanış bandı** (`heat` tam genişlik, ink metin — tek turuncu blok) + zengin footer (malzemeler, araçlar, blog, sözlük, yasal, durum, dil).

### 13.3 Yol haritası (döngü bu listeden sırayla ilerler; her madde: `[ ]`→`[x]` + tarih)

- [x] ✔ 2026-09-24 **H-1 Hero yeniden yazımı:** sonuç odaklı H1/alt metin (EN+TR), CTA hiyerarşisi (kayıtsız fiyat birincil), 3 güven rozeti, sağda spool kolajı (özgün SVG parçalar: vazo, telefon standı, kablo klipsi, saksı) + mevcut LayerStepper kartı
- [x] ✔ 2026-09-24 **H-2 Spool paleti + SVG parça kütüphanesi:** `inertia/components/print_art.tsx` (katman çizgili, `currentColor`/token), CSS değişkenleri `app.css`, DESIGN.md §2'ye token satırı
- [x] ✔ 2026-09-24 **H-3 Kitle sekmeleri (Alıcı/Satıcı/Üretici)** + kayıtsız fiyat CTA'sı; erişilebilir tabs (klavye, `aria`) — `components/audience_tabs.tsx`; her sekmede 4 adım + tek CTA, oklar/Home/End, görünür odak
- [x] ✔ 2026-09-24 **H-4 Kanıt şeridi:** sunucudan gerçek sayaçlar (`HomeStatsService`: onaylı üretici, malzeme, teknoloji, ürün yorum ortalaması) + eşik/aksi durumda dürüst metin — `HomeStatsService` [onaylı üretici ≥3, puan ≥5 eşiği; onay süresi ayardan], `components/proof_strip.tsx`, `HomeController`; eşik altında "Önce İstanbul · şehir şehir açılıyoruz"
- [x] ✔ 2026-09-24 **H-5 Keşif bölümü:** gerçek mağaza ürünleri şeridi + malzeme kartları (SVG önizleme) — `components/discover.tsx`; ürün yoksa şerit gizlenir, malzeme sayıları/fiyatları ana sayfada gösterilmez (yalnız ad + teknoloji)
- [x] ✔ 2026-09-24 (üretici geliri; satıcı marj mini aracı **H-6b** olarak açık) **H-6 Hesaplayıcı bandı:** satıcı marj mini aracı (fiyat motoru, `/tools/…` ile aynı formül) + üretici geliri bağlantısı; "söz değil" notu
- [x] ✔ 2026-09-24 (harita yerine soyut "en yakın üretici" diyagramı: kapsama iddiası yok) **H-7 Yakınlık bandı:** Türkiye SVG haritası (İstanbul), "şehir şehir" hikâyesi, eşik üstü sayaçlar
- [x] ✔ 2026-09-24 **H-8 Öğren kartları:** blog/sözlük/malzeme/araç (gerçek içerikten)
- [ ] **H-9 Kapanış bandı + zengin footer** (`layouts/default.tsx`): SEO bağlantı ağı, dil anahtarı
- [ ] **H-10 Hareket:** tek "katman katman belirme" sahnesi (`Reveal`/GSAP), reduced-motion
- [ ] **H-11 Ölçüm/deney:** `home_cta` deneyi (H-A), olaylar (`marketing_events`), `/admin/growth` huni
- [ ] **H-12 Doğrulama turu:** 375/768/1024/1440 ekran görüntüleri EN+TR, a11y (`npm run a11y`), Lighthouse, §12 listesi
- [ ] **H-6b Satıcı marj mini aracı** (ana sayfada): gerçek bir mağaza ürününün fiyat motoru dökümüyle "marjın = parça başı şu kadar"; `inertia/lib/income.ts` gibi sunucu formülüyle eşlenmiş test şart
- [x] ✔ 2026-09-24 **H-6c Emanet bandındaki sabit "7 gün"** metnini `autoConfirmDays` ayarına bağla (ProofStrip gibi)
