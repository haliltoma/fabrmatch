# ADR-003: Odeme Adapter Pattern — iyzico / Stripe Connect

## Durum

Kabul edildi — 2026-09-01 (D1: Stripe Connect legal entity hala acik)

## Baglam

Fabrmatch Turkiye'de iyzico, kuresel pazarda Stripe Connect kullanacak. Odeme mantigi tek bir arayuz uzerinden soyutlanmali ki is mantigi odeme saglayicisina bagimli olmasin.

## Karar

### Adapter Pattern

```
PaymentPort (interface)
  ├── IyzicoAdapter (TR)
  └── StripeAdapter (global)
```

### PaymentPort Arayuzu

```typescript
interface PaymentPort {
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>
  capturePayment(paymentId: string): Promise<CaptureResult>
  refund(paymentId: string, amount_minor: number): Promise<RefundResult>
  createSubMerchant(params: SubMerchantParams): Promise<SubMerchantResult>
  payoutToSubMerchant(params: PayoutParams): Promise<PayoutResult>
  verifyWebhook(payload: string, signature: string): Promise<WebhookEvent>
}
```

### Adapter Secimi

`config/payment.ts` icinde `PAYMENT_PROVIDER` env degiskenine gore:

```typescript
provider: Env.get('PAYMENT_PROVIDER', 'iyzico') // 'iyzico' | 'stripe'
```

IoC container'a bind edilir, servisler `PaymentPort` tipini enjekte eder.

### Webhook Idempotency

- Her webhook event'inde provider'in `event_id`'si `payment_webhooks` tablosunda unique kayit
- Ayni event_id tekrar gelirse islem yapilmaz (at-least-once delivery korunmasi)
- Webhook isleme kuyruk job'u ile asenkron

### Escrow Akisi

```
1. Alici odeme yapar → createCheckout()
2. Odeme onaylanir → webhook → capturePayment()
3. Ledger: buyer_escrow DEBIT, platform_holding CREDIT
4. Siparis tamamlanir → payoutToSubMerchant()
5. Ledger: platform_holding DEBIT (komisyon haric), manufacturer_receivable CREDIT
```

## Alternatifler

- **Sadece iyzico**: Kuresel olceklendirmeyi engeller
- **Sadece Stripe**: Turkiye'de sub-merchant onboarding karmasik (D1 acik)
- **Odeme gateway soyutlama kutuphanesi**: Mevcut Node.js kutuphaneleri yeterince olgun degil

## Acik Noktalar

- **D1**: Stripe Connect legal entity yapisi — Turkiye'de hangi Connect tipi (Standard, Express, Custom)?
- Alt uretici (sub-merchant) onboarding akisi provider'a gore farklilik gosterecek

## Sonuclar

- Is mantigi `PaymentPort` ile calisir, adapter detaylarini bilmez
- Yeni provider eklemek = yeni adapter yazmak (port degismez)
- Webhook handler'lar provider-specific ama idempotency katmani ortaktir
- Test'lerde `FakePaymentAdapter` kullanilir
