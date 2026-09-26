# Güvenlik notları

Kısa, gerçek durum. Her madde koda/teste bağlıdır; iddia = test veya dosya yolu.

## Uygulanan kontroller (OWASP Top 10 eşlemesi)

| Risk                    | Kontrol                                                                                              | Nerede                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| A01 Erişim kontrolü     | Rol middleware'i, sahiplik sorguları (başkasının siparişi/dosyası 404), admin 2FA zorunlu            | `role_middleware`, `two_factor_middleware`, servis sorguları, `tests/functional/role_access.spec.ts` |
| A02 Kriptografi         | Adres/IBAN/vergi no AES-256-GCM; parola scrypt/argon hash; model dosyası yalnız süreli imzalı URL    | `encryption_service`, `file_access_service`                                                          |
| A03 Enjeksiyon          | Parametreli Lucid/knex; LIKE joker kaçışı; kullanıcı HTML'i yok (yasal metin renderer'ı escape eder) | `user_admin_service`, `legal_service` testleri                                                       |
| A04 Güvensiz tasarım    | Emanet + ledger çift kayıt, durum makinesi, idempotent job/webhook, mutabakat                        | `ledger_service`, `reconciliation_service`                                                           |
| A05 Yanlış yapılandırma | Üretimde fake ödeme/kargo sağlayıcısı açılışta reddedilir                                            | `start/payment_guard.ts`, `carrier_service`                                                          |
| A06 Bileşenler          | `npm audit` CI'da, Dependabot haftalık                                                               | `.github/`                                                                                           |
| A07 Kimlik doğrulama    | TOTP 2FA, giriş/2FA hız limiti, oturum iptali, parola değişince oturumlar düşer, e-posta doğrulaması | `two_factor_service`, `user_session_service`                                                         |
| A08 Bütünlük            | Webhook imzası + olay id tekilleştirme (ödeme, kargo); Idempotency-Key                               | `payment_service`, `carrier_service`, `idempotency_middleware`                                       |
| A09 Günlükleme          | audit_logs (durum geçişleri, admin eylemleri), sağlık alarmı                                         | `audit_log`, `run_health_check`                                                                      |
| A10 SSRF                | Sunucu kullanıcı verilen URL'yi çekmez; yükleme presigned PUT ile tarayıcıdan depoya                 | `model_file_controller`                                                                              |

Ek: CSRF (Shield) — yalnız imzalı webhook uçları muaf; CSP üretimde **rapor modunda** açık (bir hafta temiz çıkınca `reportOnly: false`), X-Frame/HSTS/nosniff Shield'de; hız sınırları (`throttle`), dosya imza taraması, kural 1–5 testleri.

## Model dosyası güvenliği (STL/3MF/OBJ)

Her yükleme (hesaplı yükleme işi `analyze_model_file` ve hesapsız hızlı fiyat) `scanUpload()` üzerinden geçer (`app/services/files/file_scanner.ts`, testler `tests/unit/content_safety.spec.ts`):

1. **Boyut** — boş dosya ve 200 MB üstü reddedilir.
2. **İmzalar** — EICAR test imzası dosyanın herhangi bir yerinde; Windows/Linux/macOS program ve `#!` betik başlıkları.
3. **Gizli aktif içerik** (STL/OBJ) — `<script`, `javascript:`, `<?php`, `<html`, `<iframe`, `<svg`, powershell, cmd.exe, DOS stub, gömülü PDF veya zip başlığı → polyglot dosyalar düşer.
4. **Yapı** — ikili STL tam boyut eşleşmesi, ≤10M üçgen, NaN/sonsuz koordinat yok; ASCII STL'de **her satır** STL dilbilgisine uymalı; OBJ düz metin ve yalnız bilinen satır önekleri.
5. **Arşiv** (3MF) — merkezi dizin okunur, açılmaz: ≤2000 girdi, `/`, `..`, `\` yolu yok, çalıştırılabilir/html/svg/php uzantısı yok, sıkıştırma oranı ≤200, toplam ≤1 GB (zip bombası).
6. **Antivirüs** — `CLAMAV_HOST` (+ `CLAMAV_PORT`, varsayılan 3310) ayarlıysa clamd INSTREAM; motor yanıt vermezse **kapalı başarısızlık** (dosya kabul edilmez). Yerelde `docker compose --profile av up -d clamav`.
7. **Bütünlük** — depodaki bayt, kayıttaki SHA-256 ve boyutla birebir aynı olmalı (presign sonrası dosya değiştirilemez).

Reddedilen dosya `blocked_at` ile karantinaya alınır: indirme (`file_access_service`), sipariş, RFQ ve vitrinden düşer. Presigned yükleme ve tüm indirme URL'leri `Content-Type: application/octet-stream` + `Content-Disposition: attachment` ile imzalanır; depodaki dosya tarayıcıda asla içerik olarak çalıştırılmaz. Arayüz: hızlı fiyatta "Virüs ve gizli kod taranıyor…" paneli (yalnız gerçekten geçen kontroller işaretlenir), dosyalarım listesinde tarama durumu rozeti.

## Anahtar yönetimi ve rotasyon (G7)

- `APP_KEY` şifreli alanları (adres, IBAN, vergi no, 2FA sırrı, mesaj orijinalleri) ve çerezleri korur. **Değiştirirsen şifreli alanlar çözülemez.** Rotasyon = önce eski anahtarla tüm şifreli sütunları okuyup yeni anahtarla yeniden yazan bir betik (henüz yazılmadı) + oturumların düşmesi kabul edilir.
- `PAYMENT_WEBHOOK_SECRET` sağlayıcı panelinde döndürülür; çift secret geçiş penceresi desteklenmiyor (kısa kesinti planla).
- S3/R2 anahtarları: en az yetkili (yalnız bucket), üç ayda bir döndür.
- Sırlar `Env.schema.secret()`; günlüklere yazılmaz.

## Açık işler

- ZAP baseline taraması: çalışan bir staging ortamı gerekir (D4).
- `APP_KEY` yeniden şifreleme betiği.
- Üretimde `CLAMAV_HOST` ayarlanmalı (D4 barındırma kararıyla birlikte); ayarlanmazsa yalnız statik kontroller çalışır.
- Kart parmak izi tabanlı sahtekârlık kuralları (iyzico ile).
