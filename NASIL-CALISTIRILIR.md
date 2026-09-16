# Nasıl çalıştırılır — Fabrmatch yerel geliştirme

Tüm sistemleri ayağa kaldırma sırası, adresler ve giriş bilgileri. Mimari ve kararlar için
`CLAUDE.md` + `docs/` klasörüne bak.

## 1. Ön koşullar (ilk kurulumdan sonra bir kez)

- **Postgres** — Homebrew servisi (localhost:5432). Veritabanları: `fabrmatch_store` (Sistem A),
  `fabrmatch_network` (Sistem B). Zaten kurulu.
- **Redis** — Docker ile:
  ```bash
  docker compose up -d redis   # localhost:6379
  ```

## 2. Tek komutla çalıştırma (önerilen)

Kök dizindeki `calistir.sh` tüm servisleri arka planda başlatır/durdurur; loglar `.logs/`
altında tutulur:

```bash
./calistir.sh start        # redis + 5 servisi başlat
./calistir.sh status       # durum + sağlık kontrolü
./calistir.sh logs sistemA -f   # tek servisin logunu canlı izle
./calistir.sh restart vitrin    # tek servisi yeniden başlat
./calistir.sh stop         # app servislerini durdur (redis çalışmaya devam eder)
./calistir.sh down         # app servisleri + redis
```

Tek servis de verilebilir: `start sistemA`, `restart geometri`, `logs kuyruk` vb.
Servis adları: `redis | sistemA | sistemB | kuyruk | geometri | vitrin`.

## 2b. Manuel başlatma (alternatif)

Her biri ayrı terminal penceresinde:

```bash
# 1) Sistem A — Mercur/Medusa marketplace çekirdeği (port 9000)
cd apps/store/packages/api
npm run dev

# 2) Sistem B — AdonisJS üretici ağı (port 3333)
cd apps/manufacturer-network
node ace serve --hmr

# 3) Sistem B kuyruk işçisi — EŞLEŞTİRME ve webhook gönderimi BU OLMADAN İŞLEMEZ!
cd apps/manufacturer-network
node ace queue:work

# 4) Geometri servisi — fiyat/üretilebilirlik analizi (port 8000)
cd services/geometry
uv sync                              # ilk kez veya bağımlılık değişince
uv run fastapi dev src/fabrmatch_geometry/main.py

# 5) Vitrin — Astro storefront (port 4321)
cd apps/storefront
npm run dev
```

> **Sık yapılan hata:** 3. adımı (`node ace queue:work`) başlatmayı unutmak. Sunucu ayakta
> görünür ama siparişler üreticiye hiç düşmez (`match_attempts` boş kalır).

## 3. Adresler ve giriş bilgileri (dev)

| Sistem | Adres | Kimlik | Şifre |
|---|---|---|---|
| Sistem A admin paneli | http://localhost:9000/dashboard | `admin@fabrmatch.local` | `dev-admin-password-1` |
| Sistem A satıcı paneli | http://localhost:9000/seller | `seller@fabrmatch.dev` | `supersecret` |
| Sistem A satıcı paneli (2. satıcı) | http://localhost:9000/seller | `studio@fabrmatch.dev` | `supersecret` |
| Sistem B üretici paneli | http://localhost:3333 | `e2e-maker@fabrmatch.test` | `test-password-1` |
| Vitrin (B2C) | http://localhost:4321 | — müşteri hesabından kayıt olunabilir | |

Sağlık kontrolleri:

```bash
curl http://localhost:9000/health   # Sistem A → OK
curl http://127.0.0.1:8000/health   # geometri
curl -I http://localhost:3333/      # Sistem B → 302 (panele yönlendirir)
```

## 4. Sıfırdan veri kurulumu (temiz DB sonrası)

```bash
cd apps/store/packages/api
npx medusa db:migrate          # şemaları kur
npm run seed                   # bölge, kategori, satıcılar, 8 katalog ürünü, teklifler
cd apps/manufacturer-network && node ace migration:run
```

Vitrin backend'e **publishable API key** ile bağlanır (`apps/storefront/.env` →
`PUBLIC_MEDUSA_PUBLISHABLE_KEY`). Anahtarı DB'den al:

```bash
psql postgres://laserkopf@localhost:5432/fabrmatch_store -tc \
  "select token from api_key where title='Fabrmatch storefront';"
```

## 5. Testler

| Ne | Komut |
|---|---|
| Sistem A unit testleri | `cd apps/store/packages/api && npm run test:unit` |
| Sistem B testleri | `cd apps/manufacturer-network && node ace test` |
| Geometri testleri | `cd services/geometry && uv run pytest` |
| Sözleşme smoke testi | `node tools/store-contract-smoke.mjs` |

## 6. Uçtan uca elle deneme (happy path)

1. http://localhost:4321 aç → bir katalog ürünü seç → varyant seç → **sepete ekle**
2. `/ozel-tasarim` → STL/OBJ yükle (örn. üretilebilir bir kutu) → malzeme/adet seç →
   **fiyat tahmini al** → tasarım adı gir → **sepete ekle**
3. `/sepet` → iki satır da aynı sepette → adres/kargo/ödeme → siparişi tamamla
4. Sistem A admin → üretim talebi açıldı; Sistem B üretici panelinde
   (`e2e-maker@fabrmatch.test`) teklif düşer → kabul/üret/kargo akışını panelde gez
5. Ödeme talimatı, teslimattan 48 saat sonra (`release-due-payouts`) otomatik serbest kalır

## 7. Bilinen tuzaklar

- `medusa develop` yeni `src/` dosyalarını hot-reload eder ama **`.env`'i yeniden okumaz** —
  env değişikliğinde sunucuyu restart et.
- Sistem B webhook'larının Sistem A'ya ulaşması için `FABRMATCH_WEBHOOK_SECRET` iki tarafta
  aynı olmalı (`apps/store/packages/api/.env` ↔ `apps/manufacturer-network/.env`).
- Geometri servisi büyük meshlerde Embree ister; `uv sync` embreex'i kurar.
- Kod tabanı sorularında önce `graphify-out/` grafiğine bak; büyük değişiklik sonrası
  `graphify update .` çalıştır.
