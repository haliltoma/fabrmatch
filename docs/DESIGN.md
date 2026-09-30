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

| Referans deseni                            | Görülen                                                                                     | Biz                                                                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Tam genişlik renk bantları                 | Printify limon/koyu yeşil/açık mavi, Printful koyu deniz mavisi/kırmızı, Gelato krem/mercan | `paper` (#F5F2EC) ↔ `ink-900` ↔ **tint bantları**: `fil-100`, `heat-100`, `amber-100` (pop revizyonunda `sky`/`sun`/`lime` bantları, bkz. §14) |
| Pastel blok kolajı + gerçek fotoğraf       | Gelato: turuncu/pembe/mavi/sarı bloklar içinde insan+ürün                                   | Bloklar = **filament spool paleti** (aşağıda) içinde özgün SVG baskı parçaları; fotoğraf yok (§8: harici CDN yasak)                            |
| Büyük sonuç rakamı                         | Printify limon yeşili $321.16, Printful kırmızı                                             | Sonuç rakamı `font-display` 64px, `fil-600` (kazanç) — turuncu değil                                                                           |
| Cesur, kısa, büyük harfli/serif olmayan H1 | Printify tam büyük harf                                                                     | Bricolage Grotesque 600–700, `tracking-tight`; büyük harf yok (okunurluk, TR karakter)                                                         |
| Sıfır risk rozet satırı                    | "100% free · 2000+ products · global delivery"                                              | 3 rozet, **yalnız doğru olanlar** (bkz. marketing §19.1-2), Lucide ikon + etiket                                                               |

**Filament spool paleti (yalnız illüstrasyon zemini; UI durum rengi DEĞİL):** `spool-orange #F0501E`, `spool-teal #2F7D8B`, `spool-mustard #D9A420`, `spool-sage #9DB8A0`, `spool-rose #E7A79A`, `spool-ink #23282E`.
Tint zeminler: her birinin %15–25 karışımı (`bg-spool-*/15`). Uygulandı: `inertia/css/app.css` (`--color-spool-*`, `--color-lime/sun/sky/blush`), `components/print_art.tsx` (vase, planter, stand, clip; katman çizgisi maskesi). Yasak listesi geçerli (indigo/mor yok). Turuncu kuralı: **bir ekranda CTA + en çok bir illüstrasyon parçası**.

### 13.2 Bölüm sırası (hedef ana sayfa)

1. **Hero** — H1 sonuç odaklı; birincil CTA "Anında fiyat" (kayıtsız), ikincil "Mağazaya göz at"; altında 3 gerçek güven rozeti; sağda SVG baskı parçaları kolajı + LayerStepper kartı (imza öğe).
2. **Kanıt şeridi** — yalnız gerçek: ürün yorum ortalaması (varsa), doğrulanmış üretici sayısı (eşik), "İstanbul'da başlıyoruz".
3. **Kitle sekmeleri** — Alıcı · Satıcı · Üretici: her sekmede 3 adım + tek CTA.
4. **Keşif** — katalogdan gerçek ürün şeridi (kaydırmalı, `/shop`'a) + malzeme kartları (`/materials`).
5. **Hesaplayıcı bandı** (koyu `ink-900`) — satıcı marjı / üretici geliri mini araç + "örnektir, söz değil".
6. **Emanet bandı** (mevcut, LayerStepper ile birleşik).
7. **Yakınlık/ağ bandı** (`sky`) — Türkiye illüstrasyonu (İstanbul işaretli), gerçek sayaçlar eşik üstündeyse.
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
- [x] ✔ 2026-09-24 **H-9 Kapanış bandı + zengin footer** (`layouts/default.tsx`): SEO bağlantı ağı, dil anahtarı
- [x] ✔ 2026-09-25 **H-10 Hareket:** artık `§14` Pop revizyonuyla birleşti: P-2..P-4 (marquee, kart eğimi, sayı sayma); tek "katman katman belirme" sahnesi = hero `PrintArt printing` (yapıldı, P-1)
- [x] ✔ 2026-09-25 **H-11 Ölçüm/deney:** `home_cta` deneyi (H-A), olaylar (`marketing_events`), `/admin/growth` huni — A "Anında fiyat gör" (`/tools/quick-quote`) / B "Model yükle" (kayıt); maruz kalma ana sayfada, dönüşüm = oturumda ilk kayıtsız fiyat veya hesap açma; ana sayfa `landing_view` olayı `/admin/growth`'a düşer
- [x] ✔ 2026-09-25 **H-12 Doğrulama turu:** 375/768/1024/1440 ekran görüntüleri EN+TR, a11y (`npm run a11y`), Lighthouse, §12 listesi — 8 görünümde yatay taşma yok, tek H1, axe WCAG 2.2 AA 0 ihlal, konsol hatası yok, ilk ekranda turuncu ≤ 2, yasak listesi (indigo/mor/emoji/lorem) temiz; tekrar eden eski "iki kitle" kartları kaldırıldı (kitle sekmeleri kapsıyor). **Lighthouse ölçülmedi** (araç kurulu değil; P-8'e devredildi)
- [x] ✔ 2026-09-25 **H-6b Satıcı marj mini aracı** (ana sayfada): gerçek bir mağaza ürününün fiyat motoru dökümüyle "marjın = parça başı şu kadar"; `inertia/lib/income.ts` gibi sunucu formülüyle eşlenmiş test şart
- [x] ✔ 2026-09-24 **H-6c Emanet bandındaki sabit "7 gün"** metnini `autoConfirmDays` ayarına bağla (ProofStrip gibi)

## 14. "Pop" revizyonu — daha canlı renk, hareketli nesneler, katmanlı düğme (2026-09-25)

Karar: kullanıcı ana sayfayı ve genel görünümü daha canlı/hareketli istedi. §1–§4'teki kimlik (ink + kâğıt + katman çizgisi + Bricolage) **korunur**; bu bölüm onu **genişletir**. Çelişen yerde bu bölüm kazanır: §1 imza 4 ("ekran başına en çok 2 turuncu") ve §4 "süs animasyon yok" **yalnız pazarlama sayfalarında** gevşer; panel/dashboard sayfaları sakin kalır. Yasak listesi (indigo/mor, iki duraklı gradyan, emoji ikon, uydurma metrik) aynen geçerli.

Kaynaklar: 21st.dev MCP araması ("Pop Button" [tom_ui, itme animasyonlu 3D düğme; alt kenarlık kalınlığı + `active:scale-y` fikri uyarlandı], "Brutal Button", "Press Depth", marquee ailesi) ve skill'ler `framer-motion`, `frontend-design`, `anti-ai-slop-design`, `ui-ux-pro-max`. Kod ham alınmadı; Fabrmatch token'larına yeniden yazıldı.

### 14.1 Canlı palet (`inertia/css/app.css`, `--color-*`)

| Token                         | Değer     | Kullanım                                                                           |
| ----------------------------- | --------- | ---------------------------------------------------------------------------------- |
| `lime`                        | `#C8F53C` | Bant/kutucuk zemini, ikincil düğme yüzü, sonuç vurgusu. Metin üstünde yalnız `ink` |
| `sun`                         | `#FFC629` | Bant/kutucuk zemini, uyarı DEĞİL (uyarı `amber` kalır)                             |
| `sky`                         | `#8FD3F4` | Bant/kutucuk zemini (eski `tide-100` kaldırıldı, yerini aldı)                      |
| `blush`                       | `#FF9FB8` | Kutucuk zemini, sıcak vurgu                                                        |
| `heat`, `fil`, `ink`, `paper` | değişmedi | Birincil CTA = `heat-500` yüz + ink metin                                          |

Kurallar: (1) Pop renkleri **durum rengi değildir** (StatusBadge, hata, başarı eski token'larla). (2) Pop renk üstünde metin her zaman `ink-900` (kontrast ≥ 4.5:1 doğrulandı: ink/lime, ink/sun, ink/sky, ink/blush). (3) Bir bölüm bandı = **tek** pop renk; yan yana iki pop bant yok, aralarına `paper` gelir. (4) Renkli kutucuklar `2px ink` kenarlıklı (düğmelerle aynı dil).

### 14.2 Katmanlı düğme (`components/ui/button.tsx`)

Tüm birincil düğmeler "katmanlı": düz yüz + kalın `ink` alt kenarlık (`border-2 border-b-[5px]`), üzerine gelince 2px yukarı, basınca 3px aşağı ve alt kenarlık 2px'e iner (basılan katman hissi; 3D baskı imzasına bağlı). Varyantlar: `default` (ink), `accent` (heat), `lime`, `sun`, `outline` (kâğıt yüz). `sm`/`icon` boyutlar ve `secondary/ghost/link/destructive` **düz** kalır (yoğun panel ekranları bağırmasın). `prefers-reduced-motion`: hareket yok, yalnız renk.

### 14.3 Hareketli nesneler

- **Basılan parça** (`PrintArt printing`): parça yataktan yukarı katman katman belirir (7 sn döngü: 45% inşa, bekle, sıfırla), kutucuk başına 0,9 sn kaydırmalı. Yalnız `clipPath` içindeki `rect` animasyonu (transform), reduced-motion'da statik.
- **Kayan malzeme şeridi (marquee):** gerçek aktif malzeme adları + küçük SVG parçalar, CSS `translateX` döngüsü, üzerine gelince duraklar, reduced-motion'da durur. (H-13)
- **Kart eğimi/kalkışı:** ürün ve malzeme kartları hover'da 2px yukarı + hafif dönüş (`rotate-1`), tıklamada bastırma. (H-14)
- **Sayı sayma:** kanıt şeridi ve hesaplayıcı sonucu görünür olunca 0'dan sayar (yalnız gerçek sayılar). (H-15)
- Kural: yalnız `transform`/`opacity`; aynı anda ≤ 4 sürekli döngü; kullanıcı etkileşiminde döngü duraklar; hiçbir animasyon içerik okumayı engellemez.

### 14.4 Ana sayfa renk haritası (hedef)

Hero: `paper` zemin + katman çizgisi, sağda 4 pop kutucuk (sun/lime/sky/blush) · Kanıt şeridi: `paper-raised` · Kitle sekmeleri: `paper`, aktif sekme `lime` · Keşif (ürünler): `sun`/%20 bant · Malzeme kartları: her kart farklı pop yüz · Hesaplayıcı: `ink-900`, sonuç `lime` · Emanet: `ink-900` · Yakınlık: `sky` bant · Öğren: `paper-sunken`, kartlar pop kenarlık · Kapanış: `heat-500` · Footer: `paper-sunken`.

### 14.5 Yol haritası (Pop) — döngü bu maddelere de bakar

- [x] ✔ 2026-09-25 **P-1 Token + katmanlı düğme + basılan parça animasyonu + hero pop kutucuklar** (`app.css`, `button.tsx`, `print_art.tsx`, `home.tsx`)
- [x] ✔ 2026-09-25 **P-2 Kitle sekmeleri aktif = `lime`, ürün/malzeme kartları pop yüz + hover eğimi** (H-14)
- [x] ✔ 2026-09-25 **P-3 Kayan malzeme şeridi (marquee)** hero altına (H-13)
- [x] ✔ 2026-09-25 **P-4 Hesaplayıcı sonucu `lime`, sayı sayma** (H-15), kanıt şeridi rakamları
- [x] ✔ 2026-09-25 **P-5 Bant renklerini §14.4 haritasına uydur** (`sky`, `sun`), `tide-100` kaldır
- [x] ✔ 2026-09-25 **P-6 Düğme denetimi:** dashboard/admin/form ekranlarında `sm` ve düz varyantlar doğru mu; taşma/yükseklik kayması yok; 375–1440 ekran görüntüleri
- [x] ✔ 2026-09-25 **P-7 Panel sayfalarına sınırlı pop:** yalnız boş durum illüstrasyonları ve `StatTile` vurgusu; tablo/form sakin
- [x] ✔ 2026-09-25 **P-8 Erişilebilirlik + performans:** `npm run a11y`, reduced-motion elle test, Lighthouse, CLS — `npm run a11y` artık genel 14 sayfa + 4 demo rolle 21 oturumlu sayfa × telefon/masaüstü tarar (0 ihlal; admin için sunucu `ADMIN_2FA_REQUIRED=false`, giriş limiti 10/15 dk/IP → art arda çalıştırmada redis `rlflx:login:*` temizle). Lighthouse yerine `npm run vitals` (tarayıcı PerformanceObserver, telefon + 4× CPU yavaşlatma): 7 genel sayfada LCP 312–496 ms, CLS ≤ 0.04 (dev sunucusu). Reduced-motion H-12'de 8 görünümde doğrulandı

## 15. Açık / koyu tema (2026-09-25)

- **Seçim:** `ThemeSwitch` (Açık · Koyu · Sistem) her yerleşimde: genel üst bar + mobil menü + footer, panel kenar çubuğu, giriş/kayıt ekranı. Varsayılan **Sistem** (`prefers-color-scheme`). Seçim yalnız bu tarayıcıda, `localStorage.fm_theme`.
- **Boyamadan önce:** `resources/views/inertia_layout.edge` içindeki küçük betik `<html class="dark">`'ı ilk boyamadan önce koyar → yanıp sönme yok; SSR tema bilmez, bilmesi de gerekmez.
- **Nasıl çalışır:** Tüm renkler Tailwind v4 CSS değişkeni. `.dark` altında `ink` ölçeği ters çevrilir (ink-900 = açık metin), `paper` yüzeyleri koyulaşır, `heat/fil/amber/danger` koyu zemine uygun tonlara geçer, `line` ve katman çizgisi (`--layer-line`) açık alfa olur. Yeni renk eklersen **iki temada da** değer ver (`inertia/css/app.css`, `.dark` bloğu).
- **Tasarımı gereği sabit yüzeyler:** `.palette-light` açık paletin değerlerini geri yükler; böylece koyu bantlar koyu, parlak kutucuklar parlak kalır ve üzerlerindeki metin okunur. Otomatik: `bg-lime`, `bg-sun`, `bg-sky`, `bg-blush`, `bg-heat-500`. Elle: panel kenar çubuğu + mobil kenar çubuğu, giriş ekranının sol paneli, ana sayfa hesaplayıcı bandı. Yeni "hep koyu" ya da "hep parlak" yüzeye `palette-light` ekle.
- **Yasak:** ham Tailwind renkleri (`red-*`, `amber-*`, `emerald-*`, `blue-*`, `bg-white`) — koyu temaya uymaz; `danger`, `amber-soft/ink`, `fil`, `ink`, `paper-raised` kullan (2026-09-25'te hepsi token'a çevrildi). Sabit hex yalnız `palette-light` bir yüzeyin içindeki SVG'de.
- **Doğrulama:** koyu temada 20 sayfa (genel + 4 rol) axe WCAG 2.2 AA, kontrast dahil 0 ihlal; açık tema değişmedi (`npm run a11y` 0 ihlal). Koyu tema taraması için Playwright `colorScheme: 'dark'`.

## 16. Hero sahnesi: "Baskıdan kapıya" (2026-09-25)

- **Ne:** `inertia/components/print_journey.tsx` — yere sabit 3 eksenli endüstriyel robot kol ısıtmalı tablada vazo basar, kavrayıp kartona koyar; karton kapanır, bantlanır, konveyörde kayar, kuryeye geçer, kurye kapıda alıcıya verir, onay işareti çıkar. 14 sn döngü; alttaki adım şeridi (Basılıyor · Paketleniyor · Yolda · Teslim edildi) animasyonla ilerler ve metin karşılığıdır.
- **Zaman çizelgesi saf fonksiyon:** `inertia/lib/journey.ts` (`sceneAt(t)`, ters kinematik `solveArm`, ileri kinematik `armJoints`). Çizim yalnız bunun döndürdüğünü boyar; `tests/unit/journey.spec.ts` nozülün her 0,05 sn'de hedefe ulaştığını ve adım sırasını doğrular. Zamanlama/konum değişikliği bu dosyada yapılır.
- **Çizim dili:** 2,5px mürekkep kontur, iki ton gölge, çelik gri mafsal gövdeleri + cıvata halkası, kablo demeti, hidrolik piston, uyarı şeritli taban. Renkler site paleti; sahne `palette-light` zeminde, iki temada aynı. Gerçek kişi/marka yok.
- **Performans ve erişim:** ~30 fps, ekranda değilken ve sekme gizliyken durur; `prefers-reduced-motion` → teslim karesi durağan; SSR aynı kareyi çizer, animasyon oradan başlar (sıçrama yok). Ana sayfa LCP ~0,5 sn, CLS 0 (dev).

## 17. Düğme rengi ve hızlı fiyat aracı (2026-09-26)

- **Kırmızı-turuncu düğme yok:** `Button variant="accent"` artık `lime` yüz + ink metin (katmanlı). Kapanış bandı `sun`. Turuncu (`heat`) yalnız marka vurgusu olarak kalır: logo, sayaç rozetleri, ilerleme noktası, illüstrasyon. **Kırmızı yalnız `destructive`** (sil, reddet, askıya al) — geri alınamaz eylem uyarısı olduğu için.
- **`/tools/quick-quote`:** iki sütunlu hesap makinesi. Sol: sürükle-bırak alanı → yerel 3D önizleme (dosya tarayıcıda açılır; sunucuya yalnız fiyat isteğiyle gider, saklanmaz), açıklamalı malzeme kartları (her kartta o adet için fiyat), adet (1/2/5/10). Sağ: yapışkan sonuç paneli — büyük toplam (`CountUp`, `lime`), parça başı fiyat, toplu siparişte parça başı fark, "para nereye gidiyor" çubuğu (üretici / Fabrmatch payı / teslimat; toplamı tam tutar), boyut/hacim/ağırlık/baskı süresi, DFM uyarıları, "Sipariş için hesap oluştur" + "Başka bir dosya fiyatla".
- **Sunucu:** `quickQuoteFromFile` tek istekte 4 FDM malzemesinin tamamını ve 1/2/5/10 adet toplamlarını fiyat motoruyla döndürür (`options`); malzeme/adet değişince yeniden yükleme yok. Test: 1 adet toplam = eski başlık fiyatı.
- **Örnek dosya:** `public/samples/sample-vase.stl` (kapalı, 41×41×55 mm) — "Örnek vazomuzla dene" dosyası olmayan ziyaretçiyi fiyata götürür.
- **3D önizleme (`stl_viewer`):** STL'ler Z-yukarı çizildiği için model dik çevrilir, `Bounds` ile kadraja sığdırılır, yavaşça döner (reduced-motion'da dönmez). Dosyalar sayfasındaki önizleme de düzeldi.

## 18. Hero v3: hemen fiyat + dönen küp (2026-09-26)

- **Sol:** H1 "Tasarla. Bastır. Sat." ("Sat." altında eğik limon vurgu şeridi), alt metin, `HeroQuickStart` (satır içi STL fiyatı, örnek vazo), üç kitle bağlantısı, güven satırı.
- **Sağ `HeroCube`:** CSS 3B küp (`perspective`, `preserve-3d`, `backfaceVisibility`), 22 sn döngü: 0–13,5 baskı→kapı sahnesi; 13,5–14,4 sola dönüş; satıcı yüzü (listeleme, SATILDI, 3 sipariş, marj sayacı); 21,1–22 geri dönüş, baskı baştan. Yüz dönerken hafif kararma (`bg-black`, temadan bağımsız). Mobilde satıcı yüzü sadeleşir (liste + kazanç). Reduced-motion/SSR: teslim karesi, dönüş yok. Saat: `lib/use_loop_clock.ts` (paylaşılan), `PrintJourney time` ile dışarıdan sürülür.
- **`WhyStrip`** "Önce İstanbul" şeridinin yerine; **`HomeFaq`** kapanıştan önce.

## 19. Dört yüzlü küp + güvenlik tarama paneli (2026-09-26)

- **`HeroCube` v2 (4 yüz, sola döner):** ① _Alıcı tasarımını seçer_ — mağaza ızgarası (gerçek katalog ürünleri, fiyat = gerçek maliyet + %30), imleç kartın üstüne gider, kart kalkar, tıklanır, limon çerçeve + tik. ② _Siparişi verir_ — ürün detayı, imleç "Sipariş ver"e gider, basılır → "Sipariş verildi · FO-…" + kilit "Ödeme teslimata kadar bekletilir". ③ Baskı→kapı sahnesi (`PrintJourney time`). ④ _Teslim edildi. Kazanç senin._ — kilit açılır, fiyat çubuğu maliyet (mürekkep) / marj (limon) olarak ayrılır, ₺ jetonu düşer, "Hesabına geçen" sayacı. Sonra mağazaya dönülür (−360° = 0, kesintisiz).
- Zaman çizelgesi saf fonksiyon: `inertia/lib/cube_story.ts` (`storyAt`, `cursorAt`; 35,6 sn; her yüz ≥5 sn önde, sayfa açılınca mağaza 2 sn sakin bekler, seçimden sonra ~2 sn daha), testi `tests/unit/cube_story.spec.ts`. Seçilen ürün kupa/vazo biçimli olan (baskı sahnesi vazo basar); silüet başlıktan (`kindFor`). SSR/reduced-motion karesi ve döngü başı: mağaza, henüz seçim yok.
- Küp altında 4 adım çipi (Seç · Sipariş · Baskı · Paranı al), öndeki yüz limon. Mobilde numaralar gizli. Tüm metin `t()`; ekran okuyucuya tek cümlelik özet.
- **`ScanPanel`** (`components/scan_panel.tsx`): yükleme altında "Virüs ve gizli kod taranıyor…" (süpürme çubuğu, reduced-motion'da sabit) → "Virüs taraması temiz" (yalnız sunucunun döndürdüğü geçen kontroller tik alır; ClamAV satırı yalnız motor gerçekten çalıştıysa) → "Güvenlik taraması engelledi" + neden. Hızlı fiyat sayfası ve hero'da; dosyalarım listesinde rozet (taranıyor / temiz / engellendi) + 3 sn yenileme. Ayrıntı `SECURITY.md`.

## 20. Ürün görselleri: döner tabla render + gerçek fotoğraf (2026-09-26, R4-T6)

- **Render:** sunucuda üretilir (`model_renderer.ts`), vitrine yalnız **resim** gider, mesh asla (kural 4 — "vitrinde model önizleme yok" kuralı interaktif 3D için geçerli; statik render serbest). Gri PLA tonu (alıcının seçmediği bir rengi ima etmesin), şeffaf arka plan → açık/koyu temada aynı dosya; yan yüzlerde ince **katman çizgisi** (imza öğesi).
- **Kart (`ProductThumb`):** `.layer-lines` plaka üstünde render (`object-contain`) ya da fotoğraf (`object-cover`); ölçü çipi sağ altta. Görsel yoksa eski harf plakası.
- **Ürün sayfası (`ProductGallery`):** tek akılda kalan öğe **döner tabla** — sürükleyerek (40 px = 1 kare) ya da altındaki kaydırıcıyla (8 açı işaretli, klavye oklarıyla) çevrilir; tüm kareler önceden yüklü. "Çevirmek için sürükle" ipucu ilk dönüşte kaybolur. Onaylı gerçek fotoğraflar küçük resim olarak; dürüst altyazı: "Modelin bilgisayar render'ı… rengi seçtiğin malzemeye göre olur".
- **Üretici fotoğrafı:** yalnız admin onayından sonra, renderlardan önce gösterilir; admin kuyruğunda "üreticiyi ele veren hiçbir şey yoksa onayla" notu.

## 21. "Etrafına bak" odası + "Ödemeden sonra" zaman çizelgesi (2026-09-30)

Neden: ilk sürüm (yazıcı + adımlar + 2 CTA) hero'nun anlattığını tekrarlıyordu (hero zaten Seç→Sipariş→Bas→Kazan + yükleme). İkinci bölüm artık **süreci değil "bu benim işime yarar mı?"** sorusunu cevaplar (CRO: değer/uygunluk; JTBD + zihinde canlandırma).

- **`components/printed_around.tsx`** (`lime` bant, hero'nun hemen altı): düz SVG oda (pencere, raf, delikli pano, masa, zemin); 10 nesnenin hepsi basılabilir parça (`components/print_parts.tsx` — ortak silüetler, katman çizgisi maskesi). Görününce parçalar alttan yukarı "basılarak" belirir (kademeli), sonra yavaş tur (4 sn) — kullanıcı seçince tur durur. Seçilen nesne: **gündelik sorun → basılı çözüm** cümlesi + tek sonraki adım (use-case örnek fiyatları / hızlı fiyat / hazır tasarımlar). Adım listesi ve büyük CTA **yok** (hero'da var).
- Düzen: lg+ kart odanın boş duvarında (seçilen nesnenin karşı tarafı), altında; sm altı oda dokunmak için küçük → nesneler odanın altında çip satırı (PartIcon + ad), oda üstü düğmeler gizli. Reduced-motion: hepsi basılı, tur yok.
- **`components/after_you_pay.tsx`** (eski koyu emanet bandının yerine; iki koyu bant art arda gelmesin diye `paper`): 6 adım (Ödersin → Üretici alır → Basılır → Kargolanır → Kontrol edersin → Üretici ödenir), her adımda para durumu çipi (kilit "Para bekletiliyor" / açık kilit "Para serbest"), riskli adımların altında `amber-soft` "güvenlik ağı" kartı: boş üretici yoksa iptal + tam iade; üretici bırakırsa başka üreticiye; yanlış/kırıksa fotoğraflı itiraz → iade / kısmi iade / yeniden baskı. Hepsi `ORDER_TRANSITIONS`'ta gerçek geçişler; gün sayısı `confirmDays` ayarından. Görününce çizgi dolar, adımlar sırayla belirir (hedef-gradyanı). `/#after-you-pay` çapası; sipariş boş durumundan bağlantı var.

## 22. "Hangisisin?" yol kartları (2026-10-01)

- **`components/audience_paths.tsx`**, eski kitle sekmelerinin (`audience_tabs`, silindi) yerine. Sekmeler sipariş sürecini üçüncü kez anlatıyordu (hero + "Ödemeden sonra" zaten anlatıyor). Yeni odak: **kendini seç ve nereye gideceğini bil** — süreç değil yönlendirme.
- Yan yana 3 kart (sekme yok → hiçbir içerik gizli değil; 3 seçenek = Hick yasası). Her kart copywriting "rahatsızlık → vizyon → yol" kalıbı: tırnak içinde kısa dert, kalın "artık şunu yapabilirsin" cümlesi, **"Gerek kalmayacak"** listesi (üzeri görünür olunca çizilir; hepsi üründe gerçekten zorunlu: kayıtsız fiyat, emanet, üretici gönderir, fiyat motoru), tek buton + aynı sayfada ilgili bölüme çapa (`#after-you-pay`, `#seller-margin`, `#maker-income`, `scroll-mt-20`).
- Birincil buton yalnız alıcı kartında `accent`; diğerleri `outline` (sayfada tek birincil eylem).

## 23. Sipariş sayfası "Sırada" kartı (2026-10-01)

- **Neden:** denetimde alıcının sipariş sayfası tek satır gri durum cümlesiydi; zaman çizelgesi yalnız geçmişi gösteriyordu; tamamlanan sipariş "Teşekkürler!" diye bitiyordu (çıkmaz sokak). Satıcı/üretici panellerinde kurulum kontrol listesi zaten vardı.
- **`lib/order_next_step.ts`** (saf, `tests/unit/order_next_step.spec.ts`): her durum için aşama (Öde · Üretici · Baskı · Yolda · Kontrol · Bitti — ana sayfadaki "Ödemeden sonra" ile aynı yol), kimin sırası (sen / Fabrmatch / üretici / kargo), para durumu, başlık + açıklama, kısa satır, bitmiş siparişte öneriler. Testler `ORDER_TRANSITIONS`'a karşı: her durumun adımı var; bitmiş sipariş hep bir yere yönlendirir, canlı olan yönlendirmez; "tam iade ile iptal" yalnız durum makinesi `cancelled`'a izin verirken yazılır; para ödemeden tamamlanana kadar "bekliyor"; sıra alıcıda yalnız öderken ve kontrol ederken. Kontrol son günü = teslim + `autoConfirmDays`.
- **`components/order_next_step.tsx`:** üstte 6 parçalı ilerleme (bitti = ink, şimdi = heat, mobilde "Adım 3/6: Baskı"), "Sıra sende" (`lime`) ya da "Beklenen: …" çipi, para çipi, başlık, açıklama; sayfanın ödeme/onay/iptal düğmeleri kartın içinde (children). Bitmiş/iptal: "Sırada ne var?" → Başka bir model fiyatla · Mağazaya göz at.
- **Sipariş listesi:** her satırda kısa durum; alıcının sırasıysa `lime` rozet ("Sıra sende: öde"), gözden kaçmasın. Tamamlanmış ve yorumsuz siparişte işe yaramayan "yalnız teslimde yorum" kartı gizlendi.

## 24. Güven bandı "Modelin senin kalır" (2026-10-01)

- **`components/trust_band.tsx`**, "Ödemeden sonra"nın hemen altında (koyu `ink-900` + `palette-light`). Para orada anlatıldığı için burada yalnız geri bağlantı var; bant **dosya ve kişi** güvenliğini anlatır: 4 durak (Yüklenince taranır → Gözden uzak → Tek üretici, tek anahtar → Gönderilmeden fotoğraflanır), ekrandayken vurgu duraklar arasında gezer (2,4 sn), ilk durakta 5 kontrol sırayla işaretlenir. Altında 3 kişi gizliliği maddesi.
- Her cümle koda bağlı: `file_scanner.ts` (antivirüs **iddia edilmez**, üretimde CLAMAV açık iş), render-only vitrin (kural 4), `file_access_service` (yeni üretici 24 sa · 2 indirme), `fulfillment_service` (fotoğrafsız kargo yok), `contact_filter` (telefon/link/e-posta maskelenir), `photo_cleaner` (EXIF/GPS), üretici onayı (`maker_setup_service`), kural 1 (üretici yalnız kargo alanları).
- **`WhyStrip` kaldırıldı:** dört maddesinin her biri artık kendi bölümünde (para → Ödemeden sonra, yakınlık → Yakınlık bandı, kayıtsız fiyat → hero, anonimlik → güven bandı).

## 25. SEO altyapısı (2026-10-01)

- Her genel sayfa `<Head>` yerine **`<Seo>`** (`components/seo.tsx`) kullanır: title, description, canonical, hreflang (EN varsayılan URL, TR `?lang=tr`), OG/Twitter, paylaşım görseli (yoksa `public/og/fabrmatch-{en,tr}.png`), `breadcrumbs`, `jsonLd`. Tek dilli içerik (blog, sözlük) `bilingual={false}`. Yeni genel sayfa = `<Seo>` + sitemap'e ekle (`SeoService.sitemapUrls`).
- Sayfalar sunucuda render edilir: tarayıcıya özgü değerleri (şu an, `localStorage`, `Math.random`, yerel saat dilimi) ilk render'da kullanma; `useHydrated()` ya da `formatDate/formatDateTime/formatNumber` kullan. Kontrol: `npm run ssr:check`.

