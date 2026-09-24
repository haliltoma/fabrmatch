# Lansman kiti: dizin kayıtları + basın (M2-T5)

**Durum:** hazırlık belgesi. **Hiçbir kayıt/duyuru ürün canlıya çıkmadan yapılmaz** (aşağıdaki kapı). Bu belgedeki her iddia
üründe bugün doğrulanabilir olanla sınırlıdır; rakam, müşteri sayısı, referans ve alıntı **uydurulmaz** (`docs/marketing.md` kuralı).

## 0. Kapı: ne zaman başlanır

Kayıt/duyuru yalnız şunların hepsi doğruysa:

1. Ödeme gerçek sağlayıcıyla çalışıyor (R1-T1; şu an yalnız sahte sağlayıcı — üretimde açılmıyor).
2. Yasal metinler uzman onayından geçti, bekleme listesi dışında gerçek sipariş alınabiliyor (D5).
3. En az bir şehirde/ülkede **gerçek, onaylı üretici arzı** var (aksi halde "eşleşmedi" deneyimi ilk izlenim olur).
4. `/status` sayfası "ok"; yedek provası geçti (`docs/RUNBOOK_BACKUP.md`).
5. Aşağıdaki varlıklar (§3) hazır.

Kapı geçilmeden yapılabilecekler: bekleme listesi (`/for-makers`, `/for-sellers`), blog/sözlük, araçlar
(`/tools/quick-quote`, `/tools/maker-income`) — hepsi zaten canlıya alınabilir.

## 1. Dizin ve liste kayıtları

Sıra: önce arz (üretici) tarafını besleyen yerler, sonra alıcı/satıcı görünürlüğü. "Doğrulama" sütunu **sitenin var olduğunu**
değil, **kayıt koşullarının doğrulandığını** gösterir; gönderimden önce her sitenin güncel kurallarını kendisi okuyun.

| Öncelik | Yer                          | Neden                                               | Ne gerekir                                                | Doğrulama                      |
| ------- | ---------------------------- | --------------------------------------------------- | --------------------------------------------------------- | ------------------------------ |
| 1       | Google İşletme Profili       | Marka aramasında görünürlük                         | Doğrulanabilir adres/işletme; **posta doğrulaması**       | Koşullar kontrol edilmedi      |
| 1       | Google Search Console + Bing | Sitemap gönderimi (zaten `/sitemap.xml` var)        | Alan adı doğrulaması                                      | Standart, kontrol edilmedi     |
| 1       | LinkedIn şirket sayfası      | Basın/yatırımcı/üretici aramalarında ilk bakılan    | Logo, tek cümle, web sitesi                               | Koşullar kontrol edilmedi      |
| 2       | Startups.watch               | Türkiye girişim/etkinlik listesi (site var)         | Girişim bilgileri; kayıt biçimi bilinmiyor                | Site doğrulandı, koşul **yok** |
| 2       | Webrazzi (haber/ipucu)       | Türkiye girişim haberi; konferansı var              | Haber değeri olan somut gelişme (lansman, kilometre taşı) | Site doğrulandı, koşul **yok** |
| 2       | Product Hunt                 | Global teknoloji topluluğu; arz/talep denemesi      | Ürün canlı, ilk yorum, ekran görüntüleri, hesap           | Koşullar kontrol edilmedi      |
| 3       | BetaList                     | Erken aşama listesi (bekleme listesi aşaması)       | Açılış sayfası, kısa açıklama                             | Koşullar kontrol edilmedi      |
| 3       | AlternativeTo                | "Xometry/Craftcloud alternatifi" aramaları          | Ürün canlı; rakip profillerine bağlantı                   | Koşullar kontrol edilmedi      |
| 3       | Crunchbase                   | Şirket profili (basın/yatırımcı doğrulaması)        | Tüzel kişi bilgisi (D1/D5 sonrası)                        | Koşullar kontrol edilmedi      |
| 4       | G2 / Capterra                | Yalnız **gerçek müşteri yorumu** toplandıktan sonra | Yorumlar; kendi yazdığın yorum **yasak**                  | Şimdilik yapılmaz              |

Kurallar: her kayıtta aynı isim/açıklama/logo (NAP tutarlılığı); bağlantılar `?utm_source=<site>&utm_medium=directory&utm_campaign=launch`
ile etiketlenir (bkz. `attribution`, `/admin/growth`); satın alınmış/sahte yorum, sahte oy, kendini rakip listesine ekleme yok.

## 2. Basın kiti

### 2.1 Tek cümle ve kısa metin (TR)

- **Tek cümle:** Modelini yükle; yakınındaki doğrulanmış üretici bassın ve göndersin — ödemen teslime kadar güvende.
- **Kısa (50 kelime):** Fabrmatch, 3D baskı için bir pazaryeridir. Alıcı ya da satıcı modelini yükler, anında fiyat görür; sistem
  siparişi uygun yazıcısı olan doğrulanmış bir üreticiye adil biçimde eşleştirir. Ödeme, alıcı teslimi onaylayana ve açık bir
  itiraz kalmayana kadar emanette tutulur. Yazıcı sahipleri boş saatlerini gelire çevirir.

### 2.2 Boilerplate (EN)

> Fabrmatch is a print-on-demand marketplace for 3D printing. Upload a model, see a price at once, and a verified maker near
> you prints and ships it. Your payment is held in escrow until you confirm delivery. Printer owners turn idle hours into income.

### 2.3 Bilgi kartı (yalnız bugün doğru olanlar)

- Yüklenen model **kimliksiz** üreticiye gider; alıcı üreticiyi, üretici alıcının yalnız kargo bilgisini görür.
- Emanet + fotoğraflı itiraz akışı + kalite (QC) fotoğrafı zorunluluğu.
- Yeni üreticiler için **keşif kotası:** yeni başlayan da teklif alır.
- Fiyat tek formülle hesaplanır ve dökümü gösterilir (malzeme, makine, üretici payı, platform payı, kargo, KDV).
- Kayıtsız hızlı fiyat aracı ve üretici gelir hesaplayıcısı herkese açık.
- Model dosyası yalnız süreli imzalı bağlantıyla indirilir.

**Söylenmeyecekler (henüz doğru değil):** Shopify/Etsy entegrasyonu, "en ucuz/en hızlı" gibi üstünlük, üretici/sipariş sayısı,
teslim süresi sözü, "uluslararası" gönderim, gerçek ödeme sağlayıcı adı (D1/R1-T1 belli olana kadar).

### 2.4 Haber açıları (gerçek gelişmeye bağlı)

| Açı                            | Kime                                   | Gerekli gerçek veri                                     |
| ------------------------------ | -------------------------------------- | ------------------------------------------------------- |
| "Yazıcın boş duruyor mu?"      | Maker toplulukları, teknoloji blogları | Canlı üretici sayısı ve gerçek kazanç örneği (izinli)   |
| "Stoksuz 3D ürün satışı"       | E-ticaret/Etsy satıcı yayınları        | Çalışan vitrin + gerçek bir satıcı vakası (yazılı izin) |
| "Ödemen teslime kadar güvende" | Tüketici/teknoloji haberi              | Gerçek bir uçtan uca sipariş; itiraz akışı örneği       |

Bülten şablonu (kısa): _konu_ (tek somut gelişme) · _ilk paragraf_ (ne değişti, kimin için) · _neden şimdi_ · _kanıt_ (gerçek
sayı/örnek + izin) · _erişim_ (demo hesabı, ekran görüntüsü, iletişim). Tek kişiye özel yaz; toplu kopya yok.

## 3. Varlık kontrol listesi

- [ ] Logo (SVG + PNG, açık/koyu), site ikonu — `inertia/components/logo.tsx`'ten çıkarılabilir
- [ ] Ekran görüntüleri (1280 px): ana sayfa, fiyat teklifi, sipariş takibi, üretici paneli, itiraz — **tarayıcı testleri
      zaten üretiyor** (`SHOTS_DIR=... node ace test browser`), gerçek veriyle yeniden çek
- [ ] 30–60 sn ürün videosu (yükle → fiyat → sipariş → takip); üretim time-lapse için üreticiden **yazılı izin** (M3-T5)
- [ ] Kurucu/ekip fotoğrafı ve kısa biyografi (isteğe bağlı, kişinin onayıyla)
- [ ] OG görseli ve sayfa başlıkları (R5-T6 kalanı)
- [ ] Basın iletişim adresi (`/help` formu yeterli değil; ayrı adres)

## 4. Takvim (kapı geçildikten sonra)

1. **Gün −7:** varlıklar hazır, hesaplar açık, Google/Bing/LinkedIn kayıtları (kapı beklemez).
2. **Gün 0:** Product Hunt + Webrazzi ipucu + bekleme listesi e-postası; ekip ilk saatlerde yorumlara yanıt verir.
3. **Gün 1–7:** AlternativeTo, BetaList, Startups.watch; gerçek geri bildirimi `docs/PROJECT_MEMORY.md`'ye işle.
4. **Gün 14:** sonuç raporu: kaynak bazında kayıt/sipariş (`/admin/growth`), neyin işe yaradığı.

## 5. Ölçüm ve etik

- Başarı = kaynak bazında **kayıt → ilk teklif → ilk sipariş** (yalnız tıklama değil); `/admin/growth` bunu gösterir.
- Yorum, oy ve alıntı yalnız gerçek kişilerden ve izinle; rakipler hakkında doğrulanmamış iddia yok
  (`docs/marketing/competitors/` "iddia" ile "doğrulanmış"ı ayırır).
- Kişisel veri: bekleme listesi e-postaları yalnız açık rızayla, `Lead` kaydında; toplu e-postada çıkış bağlantısı zorunlu (D5).
