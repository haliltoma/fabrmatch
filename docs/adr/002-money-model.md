# ADR-002: Para Modeli — Integer Minor Unit + Cift Kayit Defter

## Durum

Kabul edildi — 2026-09-01

## Baglam

Fabrmatch'te para hareketleri: urun fiyatlari, komisyon, escrow, uretici odemeleri, iade. Farkli para birimleri (TRY, USD, EUR) desteklenmeli. JavaScript floating point aritmetigi (0.1 + 0.2 !== 0.3) finansal islemlerde kabul edilemez.

## Karar

### 1. Integer Minor Unit

Tum para degerleri **tamsayi olarak en kucuk birimde** saklanir:

- TRY: kurus (1 TL = 100 kurus) → `amount_minor: 1500` = 15.00 TL
- USD: cent (1 USD = 100 cent) → `amount_minor: 999` = 9.99 USD

Her para alaninin yaninda `currency` (ISO 4217, 3 harf) kolonu bulunur.

```
orders.total_minor     INTEGER NOT NULL
orders.currency        VARCHAR(3) NOT NULL DEFAULT 'TRY'
```

### 2. Cift Kayit Defter (Double-Entry Ledger)

Her para hareketi `ledger_entries` tablosunda iki kayit olusturur:

| id  | tx_ref | account          | direction | amount_minor | currency | created_at |
| --- | ------ | ---------------- | --------- | ------------ | -------- | ---------- |
| 1   | ORD-1  | buyer_escrow     | debit     | 10000        | TRY      | ...        |
| 2   | ORD-1  | platform_holding | credit    | 10000        | TRY      | ...        |

**Kurallar:**

- Her transaction'da `SUM(debit) = SUM(credit)` — dengesizlik DB constraint ile engellenir
- Silme yok, sadece ters kayit (reversal)
- Tum islemler DB transaction icinde

### 3. Hesap Turleri

- `buyer_escrow` — alici odeme yapar, para burada tutulur
- `platform_holding` — platform komisyon hesabi
- `manufacturer_receivable` — ureticiye odenecek
- `manufacturer_paid` — ureticiye odenmis
- `refund` — iade

## Alternatifler

- **Decimal/Numeric DB tipi**: DB tarafinda dogru ama JS tarafinda hala float riski. Minor unit daha guvenli.
- **Money kutuphanesi (dinero.js)**: Ek bagimlilik. Integer + basit yardimci fonksiyonlar yeterli.
- **Tek kayit (single-entry)**: Bakiye tutarsizligi tespiti zor. Cift kayit daha guvenilir.

## Sonuclar

- Frontend'de gosterim: `formatMoney(amount_minor, currency)` yardimci fonksiyonu
- API'de para alanlari: `{ amount_minor: number, currency: string }`
- Float/Decimal JS hesap **yasak** — lint kurali eklenebilir
- Defter bakiye kontrolu periyodik cron ile dogrulanir
