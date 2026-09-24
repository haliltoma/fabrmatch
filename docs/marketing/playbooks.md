# Operasyon el kitapları: üretici edinimi, sosyal içerik, ücretli test, affiliate (M1-T3, M3-T5, M4-T2, M4-T3)

Bunlar yazılımdan çok **süreç**. Yazılım tarafı hazır olanlar belirtildi; geri kalanı insan işi. Ortak kural: rakam, müşteri sözü ve
üretici fotoğrafı **izinsiz ve uydurma kullanılmaz**; kişisel veri yalnız açık rızayla (`Lead` kaydı, D5).

## 1. Üretici edinimi: outbound listesi + concierge onboarding (M1-T3)

**Hedef:** 14 günde 300–500 adaylıktan aktif (yazıcı + malzeme + boş saat) üretici çıkarmak. **Ölçü:** admin → Growth →
"Ready for offers / within 14 days" (gerçek veriden hesaplanır; yazılımı hazır).

### 1.1 Aday listesi (300–500)

| Kaynak                                    | Nasıl bulunur                                               | Dikkat                                                       |
| ----------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| Maker/3B yazıcı topluluk grupları         | Forum/grup üyeliği, "yazıcı satılık/baskı yapılır" ilanları | Toplu mesaj yok; kurallara uy, önce katkı ver                |
| Yerel baskı hizmeti veren küçük atölyeler | Harita/ilan sitelerindeki açık iş kayıtları                 | Yalnız **herkese açık iş iletişimi**; kişisel numaraya yazma |
| Bekleme listesi (`/for-makers`)           | `Lead` kayıtları (`interest = maker`, rıza var)             | **En sıcak liste**; önce bunlar                              |
| Üniversite/lise maker kulüpleri           | Kulüp sayfaları                                             | Öğrenci yazıcısı = kapasite ama tüzel yapı sorusu (D5)       |

Liste kolonları: ad/atölye, şehir, yazıcı türü/sayısı (biliniyorsa), kaynak, **rıza durumu**, ilk temas tarihi, durum.
Rıza olmayan kişiye **bire bir, kişiye özel** ilk mesaj gidebilir (toplu değil), çıkış isteği anında işlenir.

### 1.2 Mesaj iskeleti (bire bir)

1. Kim olduğun ve neden onlara yazdığın (bir cümle, gerçek).
2. Ne sunduğun: yazıcının boş saatlerine sipariş; fiyatı **onlar** belirler; ödeme teslime kadar emanette.
3. Somut sonraki adım: 5 dakikalık kayıt + `/tools/maker-income` ile kendi rakamını görmesi (söz değil, hesap).
4. Beklentiyi doğru kur: "yeni üreticilere teklif payı ayrılır" doğru; "şu kadar kazanırsın" **denmez**.

### 1.3 Concierge onboarding (elle destek)

Kayıttan ilk teklife kadar süreyi kısaltmak için, kişi bazlı kontrol listesi (uygulama içi liste ile aynı 6 adım):

- [ ] Onay: admin `/admin/queues` → bekleyen üreticiyi incele (kimlik/vergi bilgisi, şehir) → onayla
- [ ] E-posta doğrulandı mı?
- [ ] Yazıcı eklendi mi (yapı hacmi doğru mu)? Ekran paylaşımı/telefon yerine **uygulama içi rehber** öncelikli
- [ ] Malzeme ve gram fiyatı: referans fiyatın üstündeyse "kaçan sipariş" ipucunu göster
- [ ] Boş saat: haftalık şablon kurdur
- [ ] Banka hesabı (`/maker/payout`)
- [ ] İlk teklif geldiğinde bildirim çalıştı mı? İlk işte kalite fotoğrafı ve takip numarası adımlarını anlat

**Kural:** yardım ederken kimlik/IBAN gibi verileri kişiden mesajla isteme; kendisi sayfaya girsin.
**Ölçüm haftalığı:** aday sayısı → yanıt → kayıt → onay → hazır → ilk teklif kabulü. Hangi adımda düşüş varsa orada sorun var.

## 2. Sosyal içerik hattı (M3-T5)

**Kaynak:** yalnız gerçek siparişler ve **yazılı izin** (üretici ve alıcı/satıcı ayrı ayrı). Uydurma/stok görsel yok.

| Format                       | Ham madde                             | İzin gerekir                             | Sıklık (öneri) |
| ---------------------------- | ------------------------------------- | ---------------------------------------- | -------------- |
| Üretim time-lapse (15–30 sn) | Üreticinin kendi çekimi               | Üretici (görüntüde yüz/adres/etiket yok) | Haftada 1      |
| Vaka: "modelden parçaya"     | Model + bitmiş parça fotoğrafı + süre | Üretici + sipariş sahibi                 | İki haftada 1  |
| Nasıl yapılır (DFM ipuçları) | Analizör çıktıları, `/blog` yazıları  | Gerekmez (kendi içeriğimiz)              | Haftada 1      |

Akış: iş tamamlanır → (üreticiye) "bu parçayı paylaşmak ister misin" mesajı → yazılı onay kaydı (e-posta arşivi) → kısa kurgu →
etiketle (`?utm_source=<kanal>&utm_medium=social`) → yayın → sonuç: kayıt/tıklama kaynağa göre (`/admin/growth`).
**Yasak:** üretici kimliğini alıcıya/satıcıya açan görsel (iş kuralı 1) — görüntüde üretici adı, atölye tabelası, yüz, ambalaj
etiketi ve adres bulunmaz; onaydan önce kare kare kontrol edilir.

## 3. Ücretli kanal testi, küçük (M4-T2) — ⏸ karar M-F

**Kapı (hepsi doğru olmadan harcama yok):** ödeme gerçek sağlayıcıda; aktivasyon oranı kabul edilebilir; `unmatched` oranı düşük
(alıcı çekince eşleşme bulunabiliyor); ilk 10 gerçek sipariş sorunsuz. Bütçe ve eşikler kararla (M-F) belirlenir.

- Bir kanal, bir kitle, bir vaat: küçük sabit bütçe (kararlaştırılan tavan), 14 gün.
- Başarı = **ilk sipariş başına maliyet** (kayıt başına değil); `attribution` ile kaynak → sipariş bağı zaten var.
- Durdurma kuralı önceden yazılır (ör. N günde X sipariş gelmezse dur). Sonuç `docs/PROJECT_MEMORY.md` Log'una.
- Reklam metni yalnız doğrulanabilir iddia içerir (`launch-kit.md` "söylenmeyecekler").

## 4. Affiliate / içerik üreticisi programı (M4-T3) — D5 uyumu

Yazılım temeli hazır: kupon + kişisel kupon + `referrals` (kaynak takibi `attribution`). Affiliate için **eksik olanlar karar/uzmanlık ister:**

1. **Yasal:** komisyon ödemesi, vergi durumu ve fatura (D5, K-C); "reklam olduğu belirtilmeli" kuralı (içerik üreticisi ifşası).
2. **Ödeme:** affiliate payı ledger'da ayrı hesap ister (`promo_expense` benzeri) ve ödeme sağlayıcısının alt üye işyeri kuralları.
3. **Takip:** çerez süresi, son tık/ilk tık kuralı, iade halinde komisyonun geri alınması.
4. **Kötüye kullanım:** kendi kodunu kullanma, sahte sipariş; eşik + bekleme süresi (referral'daki gibi: sipariş `completed` olunca).

Öneri: yasal görüş gelene kadar **kuponla başlayan basit ortaklık** (içerik üreticisine kişisel indirim kodu, ödeme yok, ürün/kredi
karşılığı) — mevcut kupon altyapısıyla kod yazmadan yapılabilir. Para ödemeli affiliate D5 sonrası.
