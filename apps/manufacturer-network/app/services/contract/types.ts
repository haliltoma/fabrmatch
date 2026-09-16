/**
 * Sistem A ↔ Sistem B sözleşmesi (docs/09-API-SOZLESMESI.md). Sistem A'daki karşılığı:
 * apps/store/packages/api/src/lib/fabrmatch-contract.ts — biri değişirse diğeri de değişir.
 */

export type PrintEstimate = {
  slicer: string
  part_weight_g: number
  support_weight_g: number
  print_time_minutes: number
}

export const WEBHOOK_STATUSES = ['accepted', 'in_production', 'quality_check', 'shipped', 'delivered'] as const

export type WebhookStatus = (typeof WEBHOOK_STATUSES)[number]

export type ManufacturerAccount = {
  provider: 'stripe'
  account_id: string
}

export type PayoutInstructionPayload = {
  instruction_id: string
  amount: number
  currency_code: string
  // null ise üretici henüz bir ödeme hesabı bağlamamış — Sistem A talimatı `failed` işaretler
  manufacturer_account: ManufacturerAccount | null
}

/** Akış 2 gövdesi: POST {SISTEM_A_URL}/webhooks/production-status */
export type ProductionStatusWebhookPayload = {
  event_id: string
  sistem_a_order_ref: string
  sistem_a_line_item_ref: string
  production_request_id: string
  status: WebhookStatus
  occurred_at: string
  tracking_number: string | null
  production_photos: string[] | null
  payout_instruction: PayoutInstructionPayload | null
}

export const SIGNATURE_HEADER = 'x-fabrmatch-signature'
export const TIMESTAMP_HEADER = 'x-fabrmatch-timestamp'
