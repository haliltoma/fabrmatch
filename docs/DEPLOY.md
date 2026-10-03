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

## Erişim (şu anki kurulum)

**Genel:** ayrı Cloudflare tüneli `fabrmatch` (ID `5b298e3e-…`, sistem servisi `cloudflared`), public hostname'ler:

- `https://fabrmatch.bestytrends.com` → `localhost:3333` (= `APP_URL`)
- `https://fabrmatch-files.bestytrends.com` → `localhost:9002` (= `S3_ENDPOINT`; buna Cloudflare Access koyma,
  imzalı linkleri bozar)

Ana site (`bestytrends.com`, `www`) başka bir tünelde; bu sunucuya ekleme.

**Yedek (yalnız tailnet):** `tailscale serve` → `https://laserkopf-server-1.taila4687d.ts.net` (3333) ve
`:8443` (9002). Bucket CORS iki origin'e de izin verir. Durum: `tailscale serve status`.

## STAGING bayrağı

`app.env`'de `STAGING=true`: üretim sertleştirmesi (secure cookie, CSRF, hata sayfaları) açık kalır ama
sahte ödeme/kargo ve iyzico sandbox'a izin verilir, `EMAIL_VERIFICATION_REQUIRED=false` kullanılabilir.
`deploy.sh` bu bayrakla `--profile staging` servislerini de açar:

- **S3:** RustFS `127.0.0.1:9002` (konsol 9003; MinIO artık imaj yayınlamıyor). Bucket CORS'u
  `APP_URL`'e izin verir (tarayıcıdan imzalı PUT).
- **Mail:** Mailpit SMTP `127.0.0.1:1026`, gelen kutusu `ssh -L 8026:127.0.0.1:8026 sunucu` → http://localhost:8026
- İlk admin bilgisi: `~/.config/fabrmatch/admin-credentials.txt`

Canlıya geçerken: `STAGING`, `EMAIL_VERIFICATION_REQUIRED` ve `ADMIN_2FA_REQUIRED=false` satırlarını sil, demo hesapları (`*@demo.test`, `admin@fabrmatch.com`) kaldır, R2/iyzico/SMTP'yi gir.

## Yeni sürüm

```bash
bash deploy/deploy.sh            # git pull + tam kurulum
bash deploy/deploy.sh --skip-pull  # yerel kodla (commit edilmemiş değişiklik varken)
bash deploy/deploy.sh --no-backup  # pg_dump yedeğini atla (önerilmez)
```

11 aşama, her biri ilerleme çubuğu + kalan süre tahminiyle (süreler önceki çalışmalardan öğrenilir):
ön kontroller → git pull (`--ff-only`, kirli ağaçta durur) → Docker servisleri → `npm ci` → build →
üretim bağımlılıkları → **pg_dump yedeği** (`~/backups/fabrmatch`, son 10) → migration → bucket/CORS
(STAGING) → systemd unit'leri (şablondan, node yolu otomatik) → sağlık kontrolü (yerel 200, servisler, dış adres).

Hata olursa: aşama, komut, çıkış kodu, ayıklanmış hata satırları, son çıktı ve o aşamaya özel çözüm
önerisi gösterilir. Tam log: `~/.local/state/fabrmatch/logs/` (son 20).

Güvenlik ağı:

- Build/bağımlılık hatası → önceki `build/` geri yüklenir, çalışan site etkilenmez.
- Yeni sürüm sağlık kontrolünden geçemezse → önceki build'e dönülür ve servisler yeniden başlar
  (hatalı build `build.failed/`). Migration'lar geri alınmaz; gerekirse:
  `docker exec -i fabrmatch-prod-postgres-1 pg_restore -U fabrmatch -d fabrmatch --clean < ~/backups/fabrmatch/<dosya>.dump`
- Aynı anda iki deploy çalışamaz (kilit dosyası).

## Notlar

- SMTP boşken kayıt doğrulama e-postası gitmez → yeni kullanıcılar hesabını doğrulayamaz.
- Kargo entegrasyonu (D3) yokken üretimde etiket oluşturma hata verir (`carrier_service.ts`).
- Yedek: `docs/RUNBOOK_BACKUP.md`; Postgres volume'u `fabrmatch-prod_pgdata`.
- IP: cloudflared `X-Forwarded-For` ekler, Adonis loopback proxy'ye güvenir → rate limit gerçek istemci IP'siyle çalışır.
