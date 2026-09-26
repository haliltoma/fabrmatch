# Giriş bilgileri — demo hesaplar

> **Yalnız yerel geliştirme içindir.** Bu hesaplar `database/seeders/demo_seeder.ts` ile oluşturulur;
> seeder yalnız `development` ortamında çalışır, üretimde atlanır. Bu şifreleri gerçek bir ortamda kullanma.

## Hesaplar

| Rol                 | E-posta               | Şifre         | Ad              | Ne görürsün                                                           |
| ------------------- | --------------------- | ------------- | --------------- | --------------------------------------------------------------------- |
| Admin               | `admin@fabrmatch.com` | `admin12345`  | Fabrmatch Admin | Admin paneli: kullanıcılar, siparişler, ayarlar, deneyler, moderasyon |
| Üretici (maker)     | `maker@demo.test`     | `password123` | Mert Kaya       | Üretici paneli: yazıcı (Prusa MK4, PLA/PETG), kapasite, işler         |
| Satıcı              | `seller@demo.test`    | `password123` | Selin Aydın     | Satıcı paneli: mağaza "Aydın Design", ürünler, siparişler             |
| Alıcı (seller rolü) | `buyer@demo.test`     | `password123` | Deniz Yılmaz    | Sipariş verme, sepet, dosyalarım (alıcılar da seller rolündedir)      |

Giriş adresi: `http://localhost:3333/login` (dev sunucusu `.env` içindeki `PORT` ile açılır).

## Hesapları oluşturma / sıfırlama

```bash
# Docker konteynerleri açık olmalı (postgres, redis, minio)
docker compose up -d
node ace migration:run
node ace db:seed --files database/seeders/demo_seeder.ts
```

Seeder `firstOrCreate` kullanır: tekrar çalıştırmak mevcut hesapları bozmaz, şifresini değiştirdiğin bir hesabın şifresini de geri almaz. Temiz başlangıç için `node ace migration:fresh --seed`.

## Admin girişi ve 2FA

Admin için iki adımlı doğrulama varsayılan olarak **zorunludur** (`ADMIN_2FA_REQUIRED`, varsayılan `true`). İlk girişte TOTP kurulumu istenir (Google Authenticator vb.). Yerelde 2FA'sız denemek için `.env` içine:

```env
ADMIN_2FA_REQUIRED=false
```

## Sık sorunlar

- **Giriş "çok fazla deneme" (429) diyor:** giriş hız sınırı Redis'te tutulur. `redis-cli --scan --pattern 'rlflx:login:*' | xargs redis-cli del` ile temizle.
- **Sayfa/test donuyor:** Docker Desktop kapalıdır ya da konteynerler kalkmamıştır (`docker compose ps`).
- **Hesap yok diyor:** seeder çalıştırılmamıştır (yukarıdaki komut).
