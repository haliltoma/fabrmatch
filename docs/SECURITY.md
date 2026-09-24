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

## Anahtar yönetimi ve rotasyon (G7)

- `APP_KEY` şifreli alanları (adres, IBAN, vergi no, 2FA sırrı, mesaj orijinalleri) ve çerezleri korur. **Değiştirirsen şifreli alanlar çözülemez.** Rotasyon = önce eski anahtarla tüm şifreli sütunları okuyup yeni anahtarla yeniden yazan bir betik (henüz yazılmadı) + oturumların düşmesi kabul edilir.
- `PAYMENT_WEBHOOK_SECRET` sağlayıcı panelinde döndürülür; çift secret geçiş penceresi desteklenmiyor (kısa kesinti planla).
- S3/R2 anahtarları: en az yetkili (yalnız bucket), üç ayda bir döndür.
- Sırlar `Env.schema.secret()`; günlüklere yazılmaz.

## Açık işler

- ZAP baseline taraması: çalışan bir staging ortamı gerekir (D4).
- `APP_KEY` yeniden şifreleme betiği.
- Gerçek antivirüs motoru (ClamAV) — bkz. `file_scanner.ts`.
- Kart parmak izi tabanlı sahtekârlık kuralları (iyzico ile).
