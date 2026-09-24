# Tasarım Skill Rehberi — hangi iş için hangi skill (sormadan uygula)

> Ajan kuralı: UI/tasarım içeren HER görevde önce `docs/DESIGN.md`'yi oku, sonra aşağıdaki
> tablodan işe uyan skill'leri **kullanıcıya sormadan** `Skill` aracıyla çağır. Skill çıktısı
> `docs/DESIGN.md` ile çelişirse **DESIGN.md kazanır** (proje kimliği > genel öneri).
> Kaynak: `~/.claude/skills` (yerel, kurulu) + `npx skills find` (skills.sh, 2026-09-23 araması).

## 1. Akış — bir UI görevi geldiğinde

1. **Yön/kimlik gerekiyorsa** (yeni sayfa türü, yeni bölüm, "boş/basit görünüyor"): `ui-ux-pro-max` →
   `python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "<konu>" --design-system -p Fabrmatch`
   (çıktıyı **girdi** olarak kullan; renk/font önerisini körlemesine uygulama — DESIGN.md token'ları esastır).
   1b. **Bileşen/bölüm ilhamı gerekiyorsa:** 21st MCP (`search` → `get_inspiration`, bkz. §2b).
2. **Kodlamadan önce:** `frontend-design` (yön + kalite çıtası) **ve** `anti-ai-slop-design` (yasak listesi).
3. **Token/bileşen eklerken:** `design-system` (3 katmanlı token) + `ui-styling` / `shadcn-ui` (bileşen).
4. **Metin, form, boş durum, erişilebilirlik:** `ux-designer` (WCAG 2.2, microcopy).
5. **Hareket:** ihtiyaca göre `framer-motion` (bileşen/sayfa geçişi) — kaydırma odaklıysa `gsap-framer-scroll`.
6. **Bitirmeden:** `web-quality-skills` (CLS/LCP/Lighthouse) + `ux-designer` a11y kontrolü + DESIGN.md §12 checklist.
7. **Gerçek tarayıcıda doğrula:** `webapp-testing` / `browser-testing-with-devtools` (ekran görüntüsü al, bak).

## 2. Skill → nerede, ne zaman

| Skill (yerel)                                                            | Bu projede ne için                                                                                                         | Kullan                                                                            | Kullanma                                |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------- |
| `ui-ux-pro-max`                                                          | Sayfa türüne stil/pattern/UX kuralı araması; a11y+touch+layout kontrol listesi (10 öncelik grubu)                          | Yeni sayfa türü, redesign, review                                                 | Küçük metin/bug düzeltmesi              |
| `frontend-design`                                                        | Görsel yön, tipografi, düzen, "tasarlanmış" his                                                                            | Ana sayfa, `/shop`, ürün detay, auth, dashboard iskeleti                          | Salt mantık değişikliği                 |
| `anti-ai-slop-design`                                                    | Şablon/yapay zeka kokusunu engeller (indigo, gradient, emoji ikon, uydurma metrik, lorem)                                  | **Her** UI işinin sonunda tarama                                                  | –                                       |
| `design-system`                                                          | Token mimarisi (primitive→semantic→component), CSS değişkenleri                                                            | `inertia/css/app.css`, yeni token                                                 | Tek seferlik stil                       |
| `ui-styling` + `shadcn-ui`                                               | shadcn/Radix + Tailwind bileşenleri, erişilebilir primitive'ler                                                            | `inertia/components/ui/*`                                                         | Sıfırdan bileşen yazmadan önce buna bak |
| `ux-designer`                                                            | WCAG 2.2, form, boş durum, onboarding, microcopy, veri görselleştirme                                                      | Formlar, dashboard, order akışı                                                   | –                                       |
| `distinctive-web-design` (anthropic-skills)                              | Yayın/landing için özgün font+renk+animasyon kararı; **önce intake sorularını sorar → biz sormadan DESIGN.md'den cevapla** | Ana sayfa, `/shop` hero                                                           | Dashboard iç sayfaları                  |
| `client-design-system-builder` (anthropic-skills)                        | Tutarlılık denetim döngüsü: her yeni sayfa token'lara uyuyor mu                                                            | Her yeni sayfa/bileşen sonrası                                                    | –                                       |
| `brand`                                                                  | Marka sesi, mesajlaşma, microcopy tonu                                                                                     | Slogan, boş durum metni, e-posta şablonları (`resources/views/emails`)            | –                                       |
| `banner-design`                                                          | Hero/OG görseli, sosyal kart                                                                                               | OG image, ana sayfa hero görseli                                                  | –                                       |
| `framer-motion`                                                          | Liste/kart giriş, sayfa geçişi, layout animasyonu                                                                          | `motion` ile mikro etkileşim                                                      | Kaydırmaya bağlı sahne                  |
| `gsap-framer-scroll`, `gsap-animation`, `awwwards-animations`            | Kaydırma sahneleri, pin, parallax (yalnız vitrin/ana sayfa)                                                                | Ana sayfa "katman katman baskı" anlatımı                                          | Dashboard, formlar                      |
| `3d-web-experience`                                                      | Three.js/R3F sahne                                                                                                         | Yalnız **kendi** dosyasının önizlemesi (kural 4: herkese açık model önizleme YOK) | Vitrinde model göstermek                |
| `web-quality-skills`                                                     | CLS/LCP/INP, Lighthouse, görsel/font optimizasyonu                                                                         | Her sayfa teslimi, SEO ≥ 95 hedefi                                                | –                                       |
| `webapp-testing`, `browser-testing-with-devtools`                        | Gerçek tarayıcı, ekran görüntüsü, konsol hatası                                                                            | Redesign doğrulaması                                                              | –                                       |
| `web-artifacts-builder`, `slides`, `canvas-design`, `docx/pdf/pptx/xlsx` | **Bu projede kullanılmaz** (uygulama UI'ı değil)                                                                           | –                                                                                 | –                                       |

## 2b. 21st MCP (bağlı, global — `claude mcp list` → `21st`)

Kaynak: https://21st.dev/mcp.md ve llms.txt (2026-09-23). Sunucu `https://21st.dev/api/mcp`, anahtar `x-api-key` başlığında
(kullanıcı `~/.claude.json` içinde user scope'ta; **anahtar hiçbir dosyaya/dokümana yazılmaz**). Yeni oturumda araçlar
`mcp__21st__*` adıyla görünür; güncel liste sunucunun `tools/list`'inden alınır.

| Araç              | Ne için                                      | Not                                                                               |
| ----------------- | -------------------------------------------- | --------------------------------------------------------------------------------- |
| `search`          | Bileşen/tema/şablon arama                    | Ücretsiz, yalnız metadata → serbestçe kullan                                      |
| `get_inspiration` | Projenin tasarım bağlamına göre sıralı ilham | Yeni bölüm tasarlarken önce bunu dene                                             |
| `search_logo`     | Marka/UI SVG logo                            | Ücretsiz, sınırsız                                                                |
| `get_component`   | Bileşen kodunu al                            | **Ücretsiz katmanda günde toplam 2** (Web+MCP+CLI) → yalnız seçilmiş adaylar için |
| `generate`        | Prompt'tan UI üret                           | Ücretli plan/kredi; kullanıcı onayı olmadan kullanma                              |

Kural: 21st'ten gelen kod **ham kullanılmaz** — `docs/DESIGN.md` token'larına (ink/paper/heat, font, radius, yasak listesi) uyarlanır,
shadcn bileşenleriyle çakışıyorsa mevcut `components/ui/*` korunur; anti-ai-slop taraması yine zorunlu.
Akış: `search` (çok) → `get_inspiration` → en iyi 1–2 aday için `get_component` → uyarla → §12 kontrol listesi.

## 3. Harici skill'ler (skills.sh) — 2026-09-23 kullanıcı onayıyla kuruldu: `web-design-guidelines`, `tailwind-design-system`; pazarlama skill'leri için `docs/marketing.md §9`

| Skill                                                   | Kurulum                                                                                    | Not                                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `vercel-labs/agent-skills@web-design-guidelines` (660K) | `npx skills add vercel-labs/agent-skills@web-design-guidelines -g -y`                      | UI'ı yayın öncesi kılavuza karşı denetler; en yüksek güven                   |
| `wshobson/agents@tailwind-design-system` (65K)          | `npx skills add wshobson/agents@tailwind-design-system -g -y`                              | Tailwind token/varyant kalıpları (yerel `design-system` yeterliyse gerekmez) |
| `cuellarfr/design-skills@design-elevation` (231)        | –                                                                                          | Düşük kurulum sayısı; güvenilmez kabul et                                    |
| `better-auth/better-icons` (anti-ai-slop önerir)        | `npx skills add https://github.com/better-auth/better-icons --skill better-icons --global` | İkon araması; şimdilik Lucide yeterli                                        |

Yeni skill gerekirse: önce `npx skills find <konu>`, kurulum sayısı ≥1K + resmi/tanınmış kaynak şartı, sonra bu tabloya ekle.

## 4. Sayfa türü → zorunlu skill seti (kısa yol)

| Sayfa                              | Skill'ler                                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Ana sayfa `/`                      | `frontend-design` + `distinctive-web-design` + `brand` + `gsap-framer-scroll` (hafif) + `anti-ai-slop-design` + `web-quality-skills` |
| Vitrin `/shop`, ürün detay         | `frontend-design` + `ui-ux-pro-max` + `anti-ai-slop-design` + `web-quality-skills`                                                   |
| Auth / onboarding                  | `ux-designer` + `frontend-design` + `brand`                                                                                          |
| Dashboard'lar (seller/maker/admin) | `ux-designer` + `ui-ux-pro-max` (chart/data) + `design-system` + `anti-ai-slop-design`                                               |
| Sipariş/dispute/ödeme akışı        | `ux-designer` (güven, hata, boş durum) + `design-system`                                                                             |
| E-posta şablonları                 | `brand` + `ux-designer`                                                                                                              |

## 5. Pazarlama skill'leri (kurulu) — UI işiyle kesişenler

- Sayfa metni/başlık/CTA: `copywriting`, `copy-editing`; dönüşüm: `cro`, `onboarding`, `marketing-psychology`; yapısal veri: `schema`, `seo-audit`; içerik mimarisi: `site-architecture`.
- Ton için `brand` + `.agents/product-marketing.md` (Brand Voice) esas alınır; UI görsel kuralı `docs/DESIGN.md`'de kalır. Tam liste: `docs/marketing.md §9`.
