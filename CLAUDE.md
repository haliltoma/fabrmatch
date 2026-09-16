# Fabrmatch — CLAUDE.md

Printify modelinde 3D baskı platformu + kendi B2C vitrini. Dokümanlar `docs/` altında
ve bu klasör aynı zamanda Obsidian vault'udur.

## Proje hafızası — ZORUNLU
- Her göreve başlamadan önce `docs/00-MASTER-PRD.md`'yi oku (şu an ne doğru).
- Önemli bir mimari/ürün kararı alındığında `docs/07-KARAR-GECMISI-VE-DEGISIM-GUNLUGU.md`
  dosyasına şablonla, EN ÜSTE, tarihli girdi ekle. Eski girdiler silinmez.
- Karar ADR'yi değiştiriyorsa `docs/00-MASTER-PRD.md` §3 tablosunu da güncelle.
- O gün yapılan somut işler `docs/gunlukler/YYYY-AA-GG.md` dosyasına yazılır.
- Notlarda birbirine `[[dosya-adı]]` wikilink'leri kullan.

## Tasarım kuralları — ZORUNLU
Herhangi bir UI değişikliği (yeni sayfa, bileşen, renk, buton, kart) yapmadan ÖNCE
`docs/06-PRD-TASARIM-SISTEMI.md` dosyasını oku ve renk/tipografi/bileşen kurallarına
birebir uy. Tanımlı olmayan bir görsel kalıp gerekiyorsa önce o dosyaya ekle, sonra kullan.
Kısaca: sadece sage/honey/material tokenları, font ağırlığı 400/500, sentence case,
Tabler outline ikonlar, emoji/gradient/gölge yok, ekranda en fazla bir solid sage buton.

## Sistemler arası sözleşme — ZORUNLU
Sistem A ↔ Sistem B sadece `docs/09-API-SOZLESMESI.md` üzerinden konuşur, kod paylaşmaz.
Sözleşmeyi değiştiren her iş, karşı sistemi de aynı değişiklikte günceller. Ham STL
dosyası API'de asla taşınmaz. Sistem B'de ödeme mantığı yazılmaz, sadece tutar bildirilir.

## Depo düzeni
| Yol | Sistem | Teknoloji |
|---|---|---|
| `apps/store/` | Sistem A — marketplace çekirdeği | Medusa v2 + Mercur 2.x |
| `apps/storefront/` | B2C vitrin | Astro + React islands |
| `apps/manufacturer-network/` | Sistem B — üretici ağı | AdonisJS v7 + Inertia + React |
| `services/geometry/` | Fiyatlandırma/üretilebilirlik | Python 3.12 FastAPI (uv) |
| `docs/` | PRD + Obsidian vault | Markdown |

## Yerel altyapı
- Postgres: Homebrew servisi (localhost:5432). DB'ler: `fabrmatch_store`, `fabrmatch_network`.
- Redis: `docker compose up -d redis` (localhost:6379).

## Kod grafiği
`graphify-out/` graphify tarafından üretilir. Kod tabanı hakkında soru varsa önce grafiğe
bak; büyük değişikliklerden sonra `graphify update .` ile grafiği güncelle.
