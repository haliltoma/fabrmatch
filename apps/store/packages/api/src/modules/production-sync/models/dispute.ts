import { model } from "@medusajs/framework/utils"

/**
 * 05-PRD "kanıta dayalı anlaşmazlık çözüm süreci": kanıt burada AYRICA saklanmaz —
 * fotoğraf/kargo verisi zaten `production_request`'te, olay geçmişi
 * `inbound_webhook_event`'te duruyor; anlaşmazlık sadece bunlara referans verir.
 * Açılan bir anlaşmazlık, bekleyen (`received`) payout_instruction'ı `on_hold`a alır
 * (bkz. `open-dispute` iş akışı) — ödeme sonuçlanana kadar tutulur.
 */
const Dispute = model.define("dispute", {
  id: model.id({ prefix: "fmdp" }).primaryKey(),
  production_request_external_id: model.text(),
  order_id: model.text(),
  status: model
    .enum(["open", "resolved_manufacturer", "resolved_buyer", "dismissed"])
    .default("open"),
  reason: model.text(),
  opened_by: model.text(),
  opened_at: model.dateTime(),
  resolved_at: model.dateTime().nullable(),
  resolved_by: model.text().nullable(),
  resolution_note: model.text().nullable(),
})

export default Dispute
