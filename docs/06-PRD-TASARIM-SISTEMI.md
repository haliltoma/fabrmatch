# 06 — PRD: Tasarım Sistemi ve Tema (ZORUNLU REFERANS)

> ⚠️ **KURAL: Bu dosya, herhangi bir UI bileşeni, sayfa veya stil değişikliği
> yapmadan ÖNCE her seferinde okunmalıdır.** Yeni bir buton, kart, renk, ikon
> veya sayfa eklerken bu dosyadaki tokenlar ve kalıplar dışına çıkılamaz. Burada
> tanımlanmayan yeni bir renk/bileşen kalıbı gerekiyorsa, önce bu dosyaya eklenir,
> sonra kullanılır — asla tersi değil.
>
> **Bu dosya projenin kök `CLAUDE.md` dosyasından referans veriliyor olmalı**
> (bkz. dosya sonundaki "Uygulama Talimatı" bölümü) — bu sayede AI kodlama
> aracı her oturumda bunu otomatik hatırlar, ayrıca hatırlatmaya gerek kalmaz.

## Neden Bu Dosya Var

Vibe coding'de en sık karşılaşılan sorun: her yeni ekran/bileşen isteğinde AI
biraz farklı bir yeşil tonu, farklı bir buton stili, farklı bir köşe yuvarlaklığı
üretir — sonuçta tutarsız, "yamalı" görünen bir arayüz ortaya çıkar. Bu dosya
tek bir doğruluk kaynağı (single source of truth) olarak bunu önler.

## 1) Renk Paleti (KESİN DEĞERLER — başka yeşil tonu icat edilmez)

```css
/* Marka yeşili (sage) — birincil aksiyon, B2C girişi, ikonlar */
--fm-sage-bg: #EEF2E4;      /* açık yeşil zemin (kart/bölüm arka planı) */
--fm-sage-text: #33472B;    /* açık yeşil zemin ÜZERİNDEKİ metin/ikon */
--fm-sage-muted: #4E5F45;   /* açık yeşil zemin üzerindeki ikincil metin */
--fm-sage-solid: #5B7A4F;   /* dolu buton, ikon, aktif durum rengi */
--fm-sage-on-solid: #EAF3DE; /* dolu yeşil zemin üzerindeki metin (buton yazısı) */

/* Sıcak bal/krem (honey) — B2B girişi, ikincil vurgu */
--fm-honey-bg: #F7EFDF;
--fm-honey-text: #6B4E1F;
--fm-honey-muted: #7A6640;
--fm-honey-solid: #C99A45;

/* Malzeme verimliliği çubuğu (Sistem B'nin üretim paneli ve Sistem A'nın ürün detay sayfasındaki atık gramı gösterimiyle birebir) */
--fm-material-used: #5B7A4F;   /* ürüne giden malzeme */
--fm-material-waste: #C99A45;  /* destek/atık malzeme */

/* Hata durumu — SADECE form doğrulama hatası ve geri alınamaz işlem uyarısı metni için
   (2026-09-15 eklendi, bkz. 07). Buton, rozet veya dekoratif amaçla kullanılmaz. */
--fm-danger-bg: #FCEBEB;
--fm-danger-text: #A32D2D;
```

**Kural:** Bu renk grupları (sage, honey, material-used, material-waste, danger)
DIŞINDA yeni bir renk tonu eklenmeyecek. Nötr metin/arka plan için her zaman
uygulamanın standart `var(--text-primary)`, `var(--text-secondary)`,
`var(--surface-1)`, `var(--border)` tokenları kullanılır — bunlar için özel
yeşil varyantı icat edilmez.

**Renk-anlam eşleşmesi (asla karıştırılmaz):**
- Sage yeşili = B2C tarafı, birincil aksiyon (sepete ekle, satın al, ana CTA)
- Honey/bal = B2B tarafı, satıcı/üretici/tasarımcı ile ilgili her şey
- Malzeme çubuğunda yeşil = her zaman "ürüne giden kısım", bal rengi = her zaman "atık/destek kısmı" — bu ikisi asla yer değiştirmez

## 2) Tipografi Kuralları

- **Sadece iki font ağırlığı**: 400 (normal) ve 500 (vurgulu). 600/700 asla kullanılmaz.
- **Her zaman sentence case** (İlk Harfi Büyük Yazım asla) — butonlarda, başlıklarda, etiketlerde.
- Başlık boyutları: h1=22px, h2=18px, h3=16px, gövde metni=16px (satır aralığı 1.7).
- **İstisna — hero başlığı:** Anasayfa `fm-hero h1` için 28px kullanılır. Bu tek istisnadır, başka hiçbir h1 28px alamaz.
- Küçük etiket/yardımcı metin: 11-13px arası, asla 11px'in altına inilmez.
- Emoji kullanılmaz — ikon her zaman Tabler outline set (`ti ti-*` class'ları).

## 3) Bileşen Kalıpları (bunlar dışında yeni bir kalıp icat edilmeden önce buraya eklenir)

### Birincil buton (CTA)
```html
<button style="height:38px; background:var(--fm-sage-solid); color:var(--fm-sage-on-solid);
  border:none; border-radius:var(--radius); font-size:13px; font-weight:500;">
  sepete ekle
</button>
```
Bir ekranda **en fazla bir tane** dolu (solid) sage buton olur — ikincil aksiyonlar
her zaman outline/ghost stil kullanır (uygulamanın standart buton stiliyle).

### Giriş kartı (B2C / B2B ayrımı — Sistem A anasayfa)
- B2C kartı: `background: var(--fm-sage-bg)`, ikon+başlık+açıklama `var(--fm-sage-text)`,
  ikincil metin `var(--fm-sage-muted)`
- B2B kartı: `background: var(--fm-honey-bg)`, metin `var(--fm-honey-text)` /
  `var(--fm-honey-muted)`
- İkisi HER ZAMAN eşit boyut/görsel ağırlıkta olur (grid-template-columns: 1fr 1fr),
  biri diğerinden büyük/öncelikli gösterilmez.

### 3D önizleme rozeti (ürün kartlarında)
```html
<span style="background:rgba(91,122,79,0.12); color:var(--fm-sage-text); font-size:11px;
  padding:2px 6px; border-radius:20px; display:flex; align-items:center; gap:3px;">
  <i class="ti ti-rotate-3d" style="font-size:12px;" aria-hidden="true"></i>3D
</span>
```
Her ürün kartının sağ üst köşesinde, kartın 3D önizlemesi olduğunu belirtir.
İkon her zaman `ti-rotate-3d`, konum her zaman sağ üst — tutarlılık için değiştirilmez.

### Durum rozeti (sipariş/sipariş kalemi durumu — 2026-09-16 eklendi)
```html
<span class="fm-badge fm-badge--sage">kargoya verildi</span>
```
- `fm-badge` temel kalıp: küçük (12px), padding 2px 10px, border-radius 20px, weight 500.
- `fm-badge--sage`: `background:var(--fm-sage-bg); color:var(--fm-sage-text)` —
  ilerleyen/olumlu durumlar (hazırlanıyor, kargoya verildi, teslim edildi, ödendi).
- `fm-badge--muted`: `background:var(--surface-0); color:var(--text-secondary);
  border:1px solid var(--border)` — nötr/bekleyen durumlar (bekliyor, pending).
- Dolu renk, gradient, gölge kullanılmaz; hata durumu için danger zaten mevcut ama
  sipariş durumlarında danger kullanılmaz (iptal/iade ayrı akış, kapsamı sonrasına bırakıldı).
- "Siparişlerim" listesi yeni bir kart kalıbı DEĞİL: `fm-entry-card--secondary` yeniden
  kullanılır (grid dikey liste); rozetler yukarıdaki `fm-badge` kalıbıyla gösterilir.

### Malzeme verimliliği çubuğu (ürün detay sayfası — ZORUNLU her zaman görünür)
```html
<div style="height:8px; border-radius:20px; background:#DDE6CE; overflow:hidden; display:flex;">
  <div style="width:88%; background:var(--fm-material-used);"></div>
  <div style="width:12%; background:var(--fm-material-waste);"></div>
</div>
```
Bu çubuk her ürün detay sayfasında, gizlenmeden/aç-kapa olmadan gösterilir
(kullanıcının "her zaman görünür olsun" tercihi, bkz. UI kararları geçmişi).
Yanında her zaman şu dört veri birlikte gösterilir: slicer adı, ürün ağırlığı
(gram), atık/destek ağırlığı (gram), tahmini baskı süresi.

### Güven şeridi (anasayfa, 3 sütun — her zaman dengeli, biri öne çıkmaz)
Sütun 1: canlı istatistik (tamamlanan sipariş sayısı)
Sütun 2: güvenlik/ödeme rozeti (`ti-shield-check` ikonuyla)
Sütun 3: puan/yorum özeti (`ti-star` ikonuyla, honey rengiyle — tek istisna:
yıldız ikonu her zaman `--fm-honey-solid`, sage değil, çünkü "puan/derece"
evrensel olarak sarı/altın tonuyla okunur)

## 4) İkon Kütüphanesi Kuralı

Sadece Tabler outline set (`ti ti-*`). Sık kullanılanlar bu projede:
`ti-leaf` (sürdürülebilirlik/marka), `ti-rotate-3d` (3D önizleme), `ti-shield-check`
(güven/güvenlik), `ti-search` (arama), `ti-shopping-bag` (B2C), `ti-briefcase` (B2B),
`ti-star` (puan), `ti-truck` (kargo/teslimat).

## 5) Kesinlikle YAPILMAYACAKLAR

- Gradient, drop-shadow, blur, neon/glow efekti — asla.
- Yukarıdaki dört renk grubu dışında yeni bir yeşil/renk tonu icat etmek.
- Title Case veya BÜYÜK HARF kullanmak (buton, başlık, etiket — hiçbirinde).
- 600/700 font ağırlığı kullanmak.
- Emoji kullanmak (ikon her zaman Tabler).
- Bir ekranda birden fazla dolu (solid) sage buton koymak.
- B2C ve B2B giriş kartlarını farklı boyut/öncelikte göstermek.
- Malzeme verimliliği çubuğunu gizlemek veya aç/kapa yapmak.

## 6) Yeni Bir Şey Eklerken Kontrol Listesi (her PR/değişiklik öncesi)

- [ ] Kullandığım renkler yukarıdaki listede var mı? (Yoksa: önce bu dosyaya ekle, sonra kullan)
- [ ] Font ağırlığı 400 veya 500 mü?
- [ ] Metin sentence case mi?
- [ ] İkon Tabler outline mı?
- [ ] B2C/B2B dengesi bozulmuyor mu?
- [ ] Var olan bir bileşen kalıbı (buton/kart/rozet) varken yenisini icat etmedim mi?

## Uygulama Talimatı — Claude Code'un Bunu Her Zaman Hatırlaması İçin

Bu dosyanın unutulmaması, dosyanın kendisiyle değil, projenin kök dizinindeki
`CLAUDE.md` dosyası aracılığıyla sağlanır — Claude Code her oturumda bu dosyayı
otomatik okur. Proje deposunun köküne aşağıdaki gibi bir `CLAUDE.md` (veya
mevcut olana ekleme) konulmalı:

```markdown
# CLAUDE.md (proje kökü)

## Tasarım kuralları — ZORUNLU
Herhangi bir UI değişikliği (yeni sayfa, bileşen, renk, buton, kart) yapmadan
ÖNCE mutlaka `docs/06-PRD-TASARIM-SISTEMI.md` dosyasını oku ve
oradaki renk/tipografi/bileşen kurallarına birebir uy. Bu dosyada tanımlanmayan
yeni bir görsel kalıp gerekiyorsa, önce o dosyaya ekle, sonra kullan.
```

Bu proje dosyalarını (00-14) `docs/` gibi bir klasöre koyup, yukarıdaki referansı
`CLAUDE.md`'ye eklemek, tasarımın vibe coding sürecinde dağılmasını engelleyen
tek kalıcı mekanizmadır.
