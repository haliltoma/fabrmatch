# Fabrmatch — Ajan Kuralları

## Proje

3D baskı print-on-demand pazar yeri. Roller: seller (satıcı/alıcı), manufacturer (üretici), admin.
Teknik şartname: docs/FABRMATCH_FULLSTACK_PRD.md · Plan ve durum: docs/PROJECT_MEMORY.md

## Stack (değiştirme, önce sor)

- AdonisJS **v7**, Node.js **24**, TypeScript, React + Inertia (SSR), Tailwind
- Lucid v22 + PostgreSQL, VineJS v4, Redis, @adonisjs/queue (sürümü sabit), Drive (S3/R2),
  Bouncer, Limiter, Mail, Transmit, Cache, Otel, Japa

## v7 kuralları (v6 örneklerini KULLANMA)

- Doküman kaynağı: https://docs.adonisjs.com (v7). Emin değilsen önce dokümanı kontrol et; bilmediğin API uydurma.
- Controller'ları route dosyasında üretilen barrel dosyasından içe aktar (projede üretilen import yolunu kontrol et); `.as()` yazma, route'lar otomatik `controller.method` adlanır.
- URL üretimi: `urlFor()` (backend), `<Link route>` / `<Form route>` (frontend). `router.makeUrl` kullanma.
- Yanıt verisi **her zaman Transformer** ile: `serialize({...})` veya `inertia.render(page, { x: XTransformer.transform(m) })`. Model'i doğrudan döndürme.
- Modeller `#database/schema` altındaki üretilmiş schema class'larından türer; kolonları `@column` ile tekrar tanımlama. Önce migration, sonra model.
- Inertia shared data: `inertia_middleware.ts` içindeki `share()`.
- Gizli env değerleri `Env.schema.secret()`; kullanımda `.release()`.
- Paket kurulumu: `node ace add <paket>`.

## Mimari kurallar

- İş mantığı `app/services/<domain>/` altında; controller ince (validate → service → transform).
- Domain'ler: identity, manufacturing, catalog, files, pricing, orders, matching, payments, disputes, integrations, rfq, admin.
- **Para:** tamsayı minor unit (kuruş/cent) + `currency`. Float/decimal JS hesap YOK. Tüm para hareketleri `ledger_entries` çift kayıt.
- Sipariş durumları yalnızca `OrderStateMachine` üzerinden, transaction + audit_log ile.
- Kuyruk işleri idempotent; webhook'lar provider event id ile tekilleştirilir.
- Hassas alanlar (adres, IBAN, TCKN, token) encryption servisiyle şifreli saklanır.

## İş kuralları (asla ihlal etme)

1. Satıcı/alıcıya giden hiçbir çıktıda üretici kimliği yok (yalnız admin görür). Üretici, alıcının yalnızca kargo alanlarını görür.
2. Kullanıcı kendi siparişini üretici olarak alamaz.
3. Yeni üretici keşif kotası eşleştirmede her zaman uygulanır.
4. Model dosyası yalnız `file_access_grants` üzerinden, süreli imzalı URL ile indirilir.
5. Ödeme, sipariş `completed` olmadan ve açık anlaşmazlık varken serbest bırakılmaz.

## Çalışma şekli

- Her görevde: plan (kısa) → migration/model → service + unit test → controller/validator/transformer → functional test → UI.
- `node ace test` ve `npm run typecheck` yeşil olmadan görevi bitmiş sayma.
- Kapsam dışı: Tasarımcı rolü, çoklu mağaza. Eklemek gerekirse DUR ve sor.
- Görev bitince docs/PROJECT_MEMORY.md'de ilgili checkbox'ı işaretle ve Log'a tarihli bir satır ekle.

## Tasarım (UI işlerinde ZORUNLU)

- Her UI/UX/sayfa/bileşen görevinde önce `docs/DESIGN.md` (kimlik + token + kurallar) ve `docs/DESIGN_SKILLS.md` (hangi skill nerede) oku.
- Skill'leri kullanıcıya sormadan, DESIGN_SKILLS.md akışına göre çağır; çıktı DESIGN.md ile çelişirse DESIGN.md kazanır.
- Bitirmeden DESIGN.md §12 kontrol listesi + gerçek tarayıcı ekran görüntüsü. Boş/şablon görünümlü sayfa teslim edilmez.

- Açık/koyu tema: yeni renk iki temada da tanımlanır, ham Tailwind rengi kullanılmaz, hep koyu/parlak yüzeye `palette-light` (bkz. `docs/DESIGN.md §15`).

## Dil (i18n)

- UI metni İngilizce yazılır ve `t('English text')` ile sarılır (`useT()` from `~/lib/i18n`); Türkçe karşılık `inertia/lib/i18n/tr.ts`'ye eklenir. Eksik çeviri İngilizce görünür, kırılmaz.
- Veri dizilerindeki (ör. `POINTS`, nav etiketleri) ve sunucudan gelen (flash, ayar etiketleri) metinler de `t(x)` ile gösterilir ve sözlüğe eklenir. Bitirmeden `npm run i18n:check` (0 eksik anahtar) ve gerekirse `npm run i18n:rendered` çalıştır.

## Görev listesi

- Aktif iş listesi `docs/tasks.md`: sıradaki işaretsiz görevden devam et, bitince `[x]` + tarih yaz. Gerekçeler `docs/GAP_ANALYSIS.md`.

