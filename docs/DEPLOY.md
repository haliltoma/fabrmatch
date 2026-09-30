# Canlı kurulum — fabrmatch.bestytrends.com (tek sunucu)

Mimari: Cloudflare → **Cloudflare Tunnel** (`cloudflared`, sistem servisi) → `127.0.0.1:3333` web.
Postgres + Redis Docker'da, yalnız `127.0.0.1`. Dosyalar Cloudflare R2'de. Sunucuda açık port gerekmez.

| Parça           | Yer                                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| Gizli env       | `~/.config/fabrmatch/app.env` (chmod 600, repoda değil)                                              |
| Tunnel          | sistem servisi `cloudflared` (`sudo cloudflared service install <token>`), hostname'ler dashboard'da |
| Veri servisleri | `deploy/docker-compose.prod.yml` (Postgres 5432, Redis **6380**)                                     |
| Süreçler        | `systemctl --user` → `fabrmatch-web`, `fabrmatch-worker`                                             |
| Loglar          | `journalctl --user -u fabrmatch-web -f`                                                              |

## İlk kurulum

1. Root adımı (bir kez): `sudo bash deploy/setup-root.sh laserkopf`, sonra oturumu kapat/aç
   (docker grubu). Docker + linger (servisler oturum olmadan çalışır).
2. Cloudflare Zero Trust → Networks → Tunnels → **Create tunnel** (cloudflared) → verilen
   `sudo cloudflared service install <token>` komutunu çalıştır.
   Aynı tünelde **Public hostname**: `fabrmatch.bestytrends.com` → `HTTP` → `localhost:3333`.
3. R2: bucket `fabrmatch` oluştur → _Manage R2 API Tokens_ → Object Read & Write (yalnız bu bucket).
   Access Key / Secret / Account ID'yi `app.env`'deki `S3_*` alanlarına yaz.
   Bucket → Settings → **CORS** (tarayıcıdan imzalı yükleme için):
   ```json
   [
     {
       "AllowedOrigins": ["https://fabrmatch.bestytrends.com"],
       "AllowedMethods": ["GET", "PUT"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
4. `app.env`'de kalan `FILL_ME`'leri (iyzico canlı anahtarlar) ve SMTP'yi doldur.
5. `bash deploy/deploy.sh`
6. İlk admin (bir kez):
   `set -a; . ~/.config/fabrmatch/app.env; set +a; cd build && ADMIN_EMAIL=... ADMIN_PASSWORD='...' node ace db:seed --files database/seeders/admin_seeder.js`
   Giriş → Account security → 2FA kur (admin paneli 2FA'sız açılmaz).

## Test sunucusu (şu anki kurulum): yalnız Tailscale

Cloudflare Tunnel kapalı. Erişim yalnız tailnet'ten, `tailscale serve` ile (gerçek HTTPS; secure cookie
için şart, düz `http://IP:3333` ile giriş yapılamaz):

- `https://laserkopf-server-1.taila4687d.ts.net` → `127.0.0.1:3333` (= `APP_URL`)
- `https://laserkopf-server-1.taila4687d.ts.net:8443` → `127.0.0.1:9002` (= `S3_ENDPOINT`)

Kurulum (bir kez): admin konsolunda MagicDNS + HTTPS Certificates, `sudo tailscale set --operator=<kullanıcı>`,
sonra `tailscale serve --bg --https=443 http://127.0.0.1:3333` ve `--https=8443 http://127.0.0.1:9002`.
Durum: `tailscale serve status`. Canlıya çıkarken Fabrmatch için **ayrı** bir Cloudflare tüneli aç.

## STAGING bayrağı

`app.env`'de `STAGING=true`: üretim sertleştirmesi (secure cookie, CSRF, hata sayfaları) açık kalır ama
sahte ödeme/kargo ve iyzico sandbox'a izin verilir, `EMAIL_VERIFICATION_REQUIRED=false` kullanılabilir.
`deploy.sh` bu bayrakla `--profile staging` servislerini de açar:

- **S3:** RustFS `127.0.0.1:9002` (konsol 9003; MinIO artık imaj yayınlamıyor). Bucket CORS'u
  `APP_URL`'e izin verir (tarayıcıdan imzalı PUT).
- **Mail:** Mailpit SMTP `127.0.0.1:1026`, gelen kutusu `ssh -L 8026:127.0.0.1:8026 sunucu` → http://localhost:8026
- İlk admin bilgisi: `~/.config/fabrmatch/admin-credentials.txt`

Canlıya geçerken: `STAGING` ve `EMAIL_VERIFICATION_REQUIRED` satırlarını sil, R2/iyzico/SMTP'yi gir.

## Yeni sürüm

`git pull && bash deploy/deploy.sh` — build, migration, servis yeniden başlatma.

## Notlar

- SMTP boşken kayıt doğrulama e-postası gitmez → yeni kullanıcılar hesabını doğrulayamaz.
- Kargo entegrasyonu (D3) yokken üretimde etiket oluşturma hata verir (`carrier_service.ts`).
- Yedek: `docs/RUNBOOK_BACKUP.md`; Postgres volume'u `fabrmatch-prod_pgdata`.
- IP: cloudflared `X-Forwarded-For` ekler, Adonis loopback proxy'ye güvenir → rate limit gerçek istemci IP'siyle çalışır.
