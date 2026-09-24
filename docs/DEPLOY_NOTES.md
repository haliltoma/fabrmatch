# Deploy notları (R0-T8, kısa; tam runbook R5-T1/T2)

- **Ödeme sağlayıcısı:** `PAYMENT_PROVIDER=fake` yalnız `NODE_ENV=development|test` içindir. `NODE_ENV=production` iken uygulama **açılışta** (`start/payment_guard.ts`) hata verip başlamaz. Gerçek sağlayıcı (iyzico) adapter'ı R1-T1'de gelir; o zamana kadar üretimde bilerek başlatılamaz.
- **Gerekli env (fake, dev):** `PAYMENT_PROVIDER=fake`, `PAYMENT_WEBHOOK_SECRET=<rastgele>`; testte secret zorunlu değil.
- **Demo seeder:** `database/seeders/demo_seeder.ts` yalnız `development` ortamında çalışır (`static environment`) ve üretimde ayrıca ikinci kontrolle atlanır.
- **Servisler:** web + queue worker + postgres + redis + S3 uyumlu depolama; migration deploy adımında çalışır (`node ace migration:run --force`).
- **Zamanlanmış işler** (`start/scheduler.ts`, yalnız web sürecinde): otomatik onay/teslim, SLA, eski teklifler, ödeme serbest bırakma (10 dk), iade tekrarı (10 dk), mutabakat (günlük), eşleşmeyen sipariş iptali (saatlik).
- **Docker gerekli (yerel):** Docker kapalıyken testler/dev sessizce takılır; bkz. hafıza notu `docker-required-for-local-dev`.
- **Admin 2FA:** `ADMIN_2FA_REQUIRED` varsayılan `true`; admin, 2FA açmadan `/admin/*` kullanamaz (`/account/security`'e yönlenir). İlk admin: giriş yap → Account security → kur. Yalnız test ortamı `false`.
- **Ayarlar (`settings` tablosu):** admin panelinde değişen kurallar (komisyon, eşleştirme, süreler, trust eşikleri) her süreçte 30 sn içinde yayılır (`start/settings_sync.ts`); varsayılanlar `config/fabrmatch.ts`.
- **Zamanlanmış işler (ek):** trust tier gece hesabı (günlük). Reconcile artık dengesiz işlem ve negatif bakiyeyi de raporlar (admin kuyruğunda görünür).
- **Üretici onayı:** yeni üretici `pending` başlar; admin `/admin/queues`'ten onaylayana kadar teklif almaz.
- **Dilimleyici (opsiyonel):** `SLICER_DRIVER=orca`, `SLICER_BIN=/yol/OrcaSlicer`, `SLICER_PROFILES_DIR=/yol` (içinde `machine.json`, `filament.json`, `process_<PROFİL_KODU>.json`, ör. `process_FDM_STANDARD.json`; hepsi `inherits`siz tam dışa aktarım). Varsayılan `none`: sezgisel tahmin. Yerelde OrcaSlicer 2.4.2 `--info` çalışıyor; `--slice` kendi düzleştirdiğimiz profillerle henüz hata veriyor, profil seti hedef makinede hazırlanmalı. Slicer arızası siparişi/teklifi engellemez.
- **Yasal onay:** `LEGAL_ACCEPTANCE_REQUIRED=true` checkout'ta terms/mesafeli satış/iptal onayını zorunlu kılar. Yasal metinler `resources/legal/*.md` (şimdilik TASLAK bandıyla); uzman metni gelince güncelle, `version` alanını artır, sonra bayrağı aç.
