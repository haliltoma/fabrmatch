# Yedek ve geri dönüş runbook'u (R5-T2)

Durum: **prosedür ve prova betiği hazır; gerçek altyapı ayarı barındırma kararını (D4) bekliyor.** Bu belge hangi veri
nerede tutuluyor, neyin yedeği alınmalı, nasıl geri yüklenir ve yedeğin çalıştığı nasıl kanıtlanır sorularını yanıtlar.

## 1. Neyin yedeği alınır

| Veri                               | Nerede              | Kaybolursa                                                               | Yedek                                                     |
| ---------------------------------- | ------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------- |
| Sipariş, ödeme, ledger, kullanıcı  | PostgreSQL          | İş biter (para hareketi kanıtı gider)                                    | Sürekli WAL arşivi (PITR) + günlük tam yedek              |
| Model dosyaları, QC fotoğrafları   | S3 uyumlu depo (R2) | Üretim durur, anlaşmazlık kanıtı gider                                   | Sürüm oluşturma (versioning) + silme koruması             |
| **`APP_KEY`**                      | Sır yöneticisi      | **Şifreli alanlar (IBAN, adres, vergi no, 2FA sırrı) geri döndürülemez** | Veritabanından **ayrı** yerde, ikinci bir kopya           |
| Redis (kuyruk, önbellek, limitler) | Redis               | Bekleyen işler ve sayaçlar gider; zamanlayıcı açılışta yeniden kurulur   | AOF açık olsun; yedek şart değil (kayıp kabul edilebilir) |
| Ortam değişkenleri, `.env`         | Sır yöneticisi      | Uygulama açılmaz                                                         | Sır yöneticisinin kendi yedeği                            |

`APP_KEY` en kritik satırdır: yedekten geri yüklenen veritabanı, anahtar olmadan şifreli alanları okuyamaz. Anahtarı
asla veritabanı yedeğiyle aynı depoda saklamayın.

## 2. Hedefler (öneri; D4 sonrası kesinleşir)

- **RPO** (en çok kaybedilebilecek veri): ≤ 5 dakika — WAL arşivi ile.
- **RTO** (yeniden ayağa kalkma): ≤ 2 saat — son tam yedek + WAL'ı yeniden oynatma.
- Yedekler **farklı bölgede/sağlayıcıda** bir kopya daha tutulur; en az 30 gün saklanır.

## 3. Kurulum (barındırma seçilince)

1. **PostgreSQL:** yönetilen sunucuda "point-in-time recovery" aç (çoğu sağlayıcıda tek ayardır). Kendi sunucuda:
   `archive_mode=on`, `archive_command` ile WAL'ı uzak depoya gönder, haftalık `pg_basebackup` (ya da `pgBackRest`/`WAL-G`).
2. **Depo (R2):** bucket sürüm oluşturmayı aç, "sürümleri 30 gün sakla" yaşam döngüsü kuralı ekle. Uygulama silse bile eski
   sürüm geri alınabilir. Üretim anahtarları yazma+okuma; yedek anahtarı yalnız okuma.
3. **Sırlar:** `APP_KEY` ve sağlayıcı anahtarlarını sır yöneticisine koy; ikinci kopyayı çevrimdışı (kasada) sakla.
4. **İzleme:** yedek işinin başarısız olması alarm üretsin (sağlayıcı bildirimi ya da `/status`'a bağlanacak iş).

## 4. Geri yükleme (tam çöküş)

1. Yeni PostgreSQL örneği oluştur; sağlayıcının PITR aracıyla **istenen ana** (ör. olaydan 1 dakika önce) geri yükle.
2. Uygulamayı **kapalı** tut. `APP_KEY`'i sır yöneticisinden koy (aynı anahtar!).
3. `node ace migration:status` ile şema sürümünü kontrol et; yedekten eski bir sürüm geldiyse `node ace migration:run --force`.
4. Bu belgedeki **doğrulama sorgularını** çalıştır (bkz. §6): ledger dengeli mi, son sipariş/ödeme beklenen zamanda mı?
5. Ödeme sağlayıcısı panelinden geri yükleme ile olay arasındaki ödemeleri/iadeleri karşılaştır. Yedekte olmayan ödeme için
   webhook'u yeniden gönder (`payment_webhooks` tekilleştirir, iki kez işlenmez); yedekte olup sağlayıcıda olmayan kaydı
   admin kuyruğunda incele.
6. Redis boş başlar: uygulamayı aç, zamanlayıcı kendini kurar; `/admin/jobs`'ta işlerin aktığını doğrula.
7. `/status` "ok" olunca trafiği aç; olay notunu `docs/PROJECT_MEMORY.md` Log'una yaz.

**Tek tablo/yanlış silme:** tüm veritabanını değil, yedeği geçici bir veritabanına geri yükle, ilgili satırları `INSERT ... SELECT`
ile taşı. Ledger satırlarını **asla** elle düzeltme; hata varsa ters kayıt at (çift kayıt kuralı).

## 5. Prova: yedeğin çalıştığını kanıtla

`scripts/restore_drill.sh` bir veritabanını döker, geçici bir veritabanına geri yükler ve şunları karşılaştırır: tablo sayısı,
uygulanan migration sayısı, kritik tablolarda satır sayıları, ledger sağlaması ve **geri yüklenen ledger'ın para birimi
başına dengeli olması**. Fark varsa hata koduyla çıkar; geçici veritabanı her durumda silinir.

```bash
scripts/restore_drill.sh                                   # yerel docker compose
PG_CONTAINER= PGHOST=... PGUSER=... PGPASSWORD=... SOURCE_DB=fabrmatch scripts/restore_drill.sh   # sunucu
```

- **Sıklık:** ayda bir, ve her büyük şema değişikliğinden sonra. Sonucu (tarih, süre, geçti/kaldı) Log'a yaz.
- **Gerçek yedekle prova:** betik canlıyı dökmek yerine _yedek dosyasından_ geri yüklemeyi de denemeli; sunucuda
  `pg_restore` kaynağını yedek dosyasına çevirip aynı karşılaştırmaları çalıştır.
- Prova geçmiyorsa yedek **yok sayılır**: sebebi bulunana kadar yeni bir tam yedek al.

## 6. Geri yükleme sonrası doğrulama sorguları

```sql
-- her para biriminde borç = alacak olmalı (sonuç boş)
select currency from ledger_entries group by currency
 having sum(case when direction = 'debit' then amount_minor else -amount_minor end) <> 0;

-- son kayıtlar beklenen zamana kadar geliyor mu
select max(created_at) from orders;
select max(created_at) from ledger_entries;
select max(received_at) from payment_webhooks;

-- yarım kalan işler: ödenmiş ama eşleştirme başlamamış siparişler (admin kuyruğunda da görünür)
select id, code, status from orders where status = 'paid' and updated_at < now() - interval '15 minutes';
```

## 7. Açık noktalar

- Gerçek PITR/WAL/R2 ayarları **D4** (barındırma) kararına bağlı; yukarıdaki adımlar seçilen sağlayıcıya çevrilecek.
- Yedek başarısı için otomatik alarm (yedek yaşı > 26 saat) sağlayıcıya göre kurulacak.
- Prova betiği şu an tek makineden çalışır; sunucuda zamanlanmış iş olarak çalıştırmak D4 sonrası.
