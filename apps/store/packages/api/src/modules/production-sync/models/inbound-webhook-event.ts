import { model } from "@medusajs/framework/utils"

/**
 * Çift kayıt defterinin Sistem A tarafı, gelen-kutusu yarısı (09-API-SOZLESMESI,
 * Akış 2 + günlük uzlaştırma). Sistem B'nin `event_id`'siyle birebir eşleşir; günlük
 * uzlaştırma işi Sistem B'nin "delivered" dediği olayları burada arar.
 */
const InboundWebhookEvent = model.define("inbound_webhook_event", {
  id: model.id({ prefix: "fmie" }).primaryKey(),
  event_id: model.text().unique(),
  production_request_external_id: model.text(),
  status: model.text(),
  received_at: model.dateTime(),
})

export default InboundWebhookEvent
