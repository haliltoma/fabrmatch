import { model } from "@medusajs/framework/utils"

/**
 * Çift kayıt defterinin Sistem A tarafı (09-API-SOZLESMESI, ödeme senkronizasyonu).
 * `instruction_id` Sistem B'nin idempotency anahtarı: aynı talimat ikinci kez gelirse
 * yeni kayıt açılmaz. Gerçek Stripe transferi Faz 5'te `paid` durumuna geçirir.
 */
const PayoutInstruction = model.define("payout_instruction", {
  id: model.id({ prefix: "fmpi" }).primaryKey(),
  instruction_id: model.text().unique(),
  production_request_external_id: model.text(),
  order_id: model.text(),
  amount: model.bigNumber(),
  currency_code: model.text(),
  // received: bekleme penceresinde · on_hold: açık anlaşmazlık var · paid/failed/cancelled: nihai
  status: model.enum(["received", "on_hold", "paid", "cancelled", "failed"]).default("received"),
  // Sistem B'nin gönderdiği kimlik — yoksa transfer denenmeden 'failed' işaretlenir
  manufacturer_account_id: model.text().nullable(),
  // Hangi sağlayıcı denendi ('manual' | 'stripe-connect') ve o sağlayıcının kendi kaydı
  provider: model.text().nullable(),
  provider_reference: model.text().nullable(),
  paid_at: model.dateTime().nullable(),
  failure_reason: model.text().nullable(),
  // Bekleme penceresi (05-PRD anlaşmazlık süresi) dolduğunda otomatik serbest bırakılacağı an
  release_at: model.dateTime().nullable(),
})

export default PayoutInstruction
