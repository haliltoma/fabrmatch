# 09 — API Sözleşmesi: Store ↔ Üretici Ağı

> Bu dosya, iki tamamen ayrı sistemin (Sistem A — Mercur/Store, Sistem B —
> Fabrmatch Üretici Ağı/AdonisJS) birbirine nasıl bağlandığını tanımlar. Her iki
> sistemin geliştirme ekibi/AI görevi de bu dosyayı bilmeli — sözleşmeyi tek
> taraflı değiştirmek diğer sistemi bozar.

## Temel Prensip

İki sistem **kod paylaşmaz**, sadece tanımlı HTTP endpoint'leri ve webhook'lar
üzerinden konuşur. Biri değiştiğinde diğeri bozulmamalı — sözleşme (bu dosyadaki
şemalar) sabit kalmalı, değişiklik gerekiyorsa versiyonlanmalı (`/v1/`, `/v2/`).

## Akış 1 — Sipariş Oluştuğunda (Sistem A → Sistem B)

```
POST {SISTEM_B_URL}/api/v1/production-requests
Header: Authorization: Bearer {SISTEM_B_API_KEY}
Header: Idempotency-Key: {sistem_a_line_item_ref}   // gövdedeki ref'e eşit olmalı, aksi halde 422
Header: Accept: application/json                    // doğrulama hataları 422 JSON döner

Payload:
{
  "sistem_a_order_ref": "order_01H...",      // Mercur'un (satıcı) sipariş ID'si
  "sistem_a_line_item_ref": "ordli_01H...",  // sipariş kalemi — talep kalem başına açılır
  "design_reference": "design_xyz",          // ham STL DEĞİL, işlenmiş referans
  "material": "PLA",
  "color": "Siyah",                          // null olabilir
  "quantity": 1,
  "buyer_region": { "country": "TR", "city": "Mersin" },   // city null olabilir
  "requested_delivery_by": "2026-09-20",
  "print_estimate": {                        // BİRİM başına metrikler, null olabilir — ham dosya DEĞİL
    "slicer": "fabrmatch-mesh-estimator/1.0",
    "part_weight_g": 48,
    "support_weight_g": 4,
    "print_time_minutes": 95
  }
}

Yanıt 201 (yeni) / 200 (aynı Idempotency-Key tekrar geldi — yeni talep açılmaz):
{
  "production_request_id": "pr_abc123",
  "status": "matching_in_progress"   // talebin o anki durumu; eşleştirme hızlı biterse "awaiting_acceptance"
}
Yanıt 401: servis anahtarı geçersiz · 422: gövde/Idempotency-Key geçersiz
```

Sistem B bu isteği aldıktan sonra kendi fiyatlandırma (01) + eşleştirme motorunu
(03) arka planda çalıştırır — bu senkron yanıtta beklenmez.

Sistem A tarafı: `order.placed` → her siparişe-göre-üretilen kalem için
`production_request` kaydı (`pending_dispatch`) → gönderim. Başarısız gönderim
`dispatch_failed` olarak kalır ve 5 dakikada bir (en fazla 10 deneme) tekrar gönderilir.

## Akış 2 — Üretim Durumu Değiştiğinde (Sistem B → Sistem A, webhook)

```
POST {SISTEM_A_URL}/webhooks/production-status
Header: X-Fabrmatch-Timestamp: {unix saniye}
Header: X-Fabrmatch-Signature: v1={hex(HMAC-SHA256(FABRMATCH_WEBHOOK_SECRET, "{timestamp}.{ham gövde}"))}

Payload:
{
  "event_id": "evt_...",                     // Sistem B'de benzersiz
  "sistem_a_order_ref": "order_01H...",
  "sistem_a_line_item_ref": "ordli_01H...",
  "production_request_id": "pr_abc123",
  "status": "accepted" | "in_production" | "quality_check" | "shipped" | "delivered",
  "occurred_at": "2026-09-16T10:00:00Z",
  "tracking_number": "...",                  // shipped durumunda dolu, aksi halde null
  "production_photos": ["https://..."],      // quality_check durumunda dolu, aksi halde null
  "payout_instruction": {                    // yoksa null — TUTAR bilgisi, ödeme Sistem B'de YAPILMAZ
    "instruction_id": "pi_...",              // idempotency anahtarı
    "amount": 145.50,
    "currency_code": "try",
    "manufacturer_account": {                // üreticinin transfer hesabı — null ise Sistem A ödemeyi
      "provider": "stripe",                  // yapamaz, `payout_instruction` `failed` olarak kaydedilir
      "account_id": "acct_..."               // sadece bir KİMLİK; para hareketi/hesap yönetimi Sistem B'de değil
    }
  }
}

Yanıt 200: { "received": true, "status_applied": true, "payout_recorded": true, "payout_duplicate": false }
Yanıt 401: imza/zaman damgası geçersiz (±300 sn tolerans) · 404: production_request_id bilinmiyor
```

Sistem A bu webhook'u aldığında: (1) üretim talebinin durumunu günceller — durumlar
yalnızca ileri gider, geç gelen eski bir durum kaydı geri almaz, (2) olayı `event_id`
ile kendi gelen-kutusu defterine yazar (uzlaştırma için, bkz. aşağı), (3) `payout_instruction`
doluysa defterine `received` + bir bekleme penceresiyle (`release_at`, varsayılan 48 saat)
yazar (aynı `instruction_id` ikinci kez gelirse atlar) — transfer HEMEN tetiklenmez:
pencere dolup bu arada bir anlaşmazlık açılmazsa otomatik serbest bırakılır, `manufacturer_account`'a
Stripe Connect transferini KENDİSİ tetikler ve sonucuna göre `paid` ya da `failed` olur (bkz.
[[05-PRD-ODEME-VE-KOMISYON]] "Anlaşmazlık çözüm süreci"), (4) müşteriye/satıcıya durumu yansıtır.

### Ödeme Senkronizasyonu Güvenliği (çift kayıt / double-entry mantığı)

Webhook'un kaybolması ("Sistem B gönderdi ama Sistem A hiç almadı") sessizce bir
ödemenin yapılmamasına yol açabilir. Bunu önlemek için:

1. **İki taraf da kendi "defterini" tutar** — Sistem B her webhook denemesini
   `outbound_webhook_events` tablosunda (`pending` → `delivered`/`failed`) tutar; Sistem A
   her başarıyla doğrulanmış olayı `inbound_webhook_event` tablosuna `event_id` ile yazar
   ve varsa ödeme talimatını `received` → `paid`/`failed` olarak günceller.
2. **Başarısız gönderimde otomatik tekrar deneme** — artan aralıklarla (1dk, 5dk,
   30dk, 2sa) webhook tekrar denenir.
3. **Günlük otomatik uzlaştırma raporu** — Sistem A, Akış 3 üzerinden Sistem B'nin
   son ~26 saatteki `delivered`/`failed` olaylarını çeker ve kendi `inbound_webhook_event`
   tablosuyla `event_id` bazında karşılaştırır; Sistem B'de `delivered` görünüp Sistem
   A'da hiç kaydı olmayan olaylar ("gönderildi ama alınmadı") bir `reconciliation_report`
   kaydına yazılır ve `GET /admin/reconciliation-reports` ile görünür olur.
4. **Idempotency key ile çift ödeme koruması** — her ödeme talimatının benzersiz
   bir kimliği vardır; Sistem A aynı kimliği ikinci kez görürse işlemi atlar.

## Akış 3 — Günlük Uzlaştırma (Sistem A → Sistem B)

```
GET {SISTEM_B_URL}/api/v1/webhook-events?since=2026-09-15T00:00:00Z
Header: Authorization: Bearer {SISTEM_B_API_KEY}

Yanıt:
{
  "events": [
    {
      "event_id": "evt_...",
      "production_request_id": "pr_abc123",
      "status": "delivered",             // webhook payload'ındaki durum adı
      "state": "delivered",              // outbound_webhook_events.state: delivered | failed
      "delivered_at": "2026-09-16T09:00:00Z"
    }
  ]
}
```

Sadece sonuçlanmış olaylar döner (`state IN (delivered, failed)`) — hâlâ `pending`
(tekrar deneme sırası bekleyen) olaylar bu listede yer almaz, henüz "kaybolmuş"
sayılmazlar.

## Akış 4 — Bölgesel Üretici Verisi (Sistem B → Sistem A, periyodik)

```
GET {SISTEM_B_URL}/api/v1/region-capability?region=TR-Mersin

Yanıt:
{
  "region": "TR-Mersin",
  "supported_materials": ["PLA", "PETG"],
  "avg_turnaround_days": 3,
  "manufacturer_count": 4
}
```

Sistem A, storefront'taki bölgesel kişiselleştirme (RegionProfile) için bu veriyi
günlük/saatlik bir cron job ile çeker ve kendi veritabanına önbelleğe alır —
her sayfa yüklemesinde Sistem B'ye canlı istek ATILMAZ, bu performansı düşürür.

## Güvenlik Kuralları

- Her istek karşılıklı API anahtarı veya mTLS ile doğrulanmalı — iki sistem de
  birbirine internetten açık, yetkisiz erişime kapalı olmalı.
- Webhook'lar HMAC imzası ile doğrulanmalı (bkz. Sistem A'daki e-ticaret webhook
  güvenilirliği prensipleriyle aynı mantık).
- **Ham STL dosyası bu API sözleşmesinin hiçbir noktasında paylaşılmaz** — sadece
  `design_reference` gibi işlenmiş/opak referanslar geçer. Sistem B, dosyanın
  kendisine değil, Sistem A'nın sağladığı bir presigned-URL'e (kısa ömürlü, tek
  kullanımlık) erişerek gerekirse FastAPI'ye iletir.

## AI Kodlama Asistanına Talimat

Her iki sistemde de bu sözleşmeyi değiştiren bir görev verirsen, karşı sistemin
de güncellenmesi gerektiğini AI asistanına açıkça belirt — tek taraflı değişiklik
diğer sistemi sessizce bozar.
