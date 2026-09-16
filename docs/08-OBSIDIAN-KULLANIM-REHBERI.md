# 08 — Obsidian Kullanım Rehberi (Proje Hafızası)

> Bu dosya, PRD setini Obsidian'da nasıl bir "kalıcı hafıza" sistemine
> dönüştüreceğini anlatır. Daha önce konuştuğumuz Graphify + Claude Code
> kombinasyonuyla birlikte çalışır (bkz. eski konuşma geçmişi — Graphify, kod
> tabanını otomatik olarak Obsidian vault'una çeviren bir Claude Code skill'i).

## Vault Yapısı

```
fabrmatch-vault/
  00-MASTER-PRD.md              ← Obsidian'da "ana sayfa" (Home) olarak sabitlenir
  01-PRD-STOREFRONT-ASTRO.md
  02-PRD-MARKETPLACE-CORE.md
  03-PRD-URETICI-AGI.md
  04-PRD-GUVEN-VE-KALITE.md
  05-PRD-ODEME-VE-KOMISYON.md
  06-PRD-TASARIM-SISTEMI.md
  07-KARAR-GECMISI-VE-DEGISIM-GUNLUGU.md   ← her gün büyüyen, hiç silinmeyen log
  08-OBSIDIAN-KULLANIM-REHBERI.md (bu dosya)
  /gunlukler/                    ← (opsiyonel) her çalışma günü için ayrı not
    2026-09-15.md
  /graphify-out/                 ← Graphify'ın otomatik ürettiği kod ilişki grafiği
```

## Üç Katmanlı Hafıza Modeli

1. **Master PRD (00)** — "şu an ne doğru" — her zaman GÜNCEL durumu yansıtır,
   eski kararlar burada durmaz, üzerine yazılır.
2. **Karar Günlüğü (07)** — "ne zaman, neden değişti" — kronolojik, hiç silinmez,
   sadece eklenir. Bir kararın geçmişini anlamak için buraya bakılır.
3. **Günlük notlar (opsiyonel, `/gunlukler/`)** — o gün yapılan somut işler
   (hangi dosya değişti, hangi kod yazıldı, hangi hata çözüldü) — Master PRD'den
   daha ayrıntılı, günlük çalışma kaydı.

## Obsidian'da Bağlantı (Backlink) Kullanımı

Her PRD dosyasında ilgili diğer dosyalara `[[dosya-adı]]` formatında link
verilmeli — Obsidian bunu otomatik olarak "Graph View"de görselleştirir. Örnek:

```markdown
Bu özellik [[02-PRD-MARKETPLACE-CORE]]'daki Vendor Panel ile ilişkilidir,
detaylı komisyon hesaplama için [[05-PRD-ODEME-VE-KOMISYON]]'a bak.
```

Bu sayede, Master PRD'yi merkeze koyan bir bilgi grafiği kendiliğinden oluşur —
tıpkı önceki konuşmamızdaki "sistem ağacı" diyagramının canlı, güncellenebilir hali.

## Claude Code + Graphify ile Birlikte Çalışma Akışı

1. Bu PRD klasörünü proje deposunun `docs/` altına koy, Obsidian'da vault olarak aç.
2. Kod deposunda `/setup-graphify` çalıştır — bu, kodu tarayıp `graphify-out/`
   klasörüne bir bilgi grafiği üretir, Obsidian-uyumlu formatta.
3. Kök `CLAUDE.md`'ye şunu ekle:
   ```markdown
   ## Proje Hafızası
   Her göreve başlamadan önce docs/00-MASTER-PRD.md'yi oku. Önemli bir karar
   alındığında docs/07-KARAR-GECMISI-VE-DEGISIM-GUNLUGU.md'ye yukarıdaki
   şablonla yeni bir girdi ekle. Tasarım kararları için docs/06-PRD-TASARIM-SISTEMI.md
   zorunlu referanstır.
   ```
4. Her çalışma oturumunun sonunda (veya Claude Code'a açıkça isteyerek), o
   oturumda alınan kararları Karar Günlüğü'ne işlet.

## Neden İki Ayrı Dosya (Master PRD + Günlük) ve Tek Dosya Değil

Sadece tek bir büyüyen dosya kullanırsan, "şu an sistem nasıl çalışıyor" sorusuna
cevap bulmak için yüzlerce satırlık geçmişi elemen gerekir. İkiye ayırmak,
AI asistanının her görevde SADECE güncel durumu (Master PRD, kısa) okumasını,
geçmişi sadece gerektiğinde (bir kararın "neden" olduğunu sorarken) aramasını
sağlar — bu, hem token maliyetini düşürür hem de tutarlılığı korur.
