import { model } from "@medusajs/framework/utils"

/**
 * Sistem B'ye gönderilen üretim talebinin Sistem A'daki izi. Her sipariş kalemi
 * (line item) için bir kayıt; `external_id` Sistem B'nin production_request_id'si.
 */
const ProductionRequest = model
  .define("production_request", {
    id: model.id({ prefix: "fmpr" }).primaryKey(),
    order_id: model.text(),
    line_item_id: model.text().unique(),
    design_reference: model.text(),
    material: model.text(),
    color: model.text().nullable(),
    quantity: model.number(),
    buyer_country: model.text(),
    buyer_city: model.text().nullable(),
    requested_delivery_by: model.dateTime(),
    // Ürün metadata.print_profile'dan birim başına baskı metrikleri (09: print_estimate)
    print_estimate: model.json().nullable(),
    external_id: model.text().unique().nullable(),
    status: model
      .enum([
        "pending_dispatch",
        "dispatch_failed",
        "matching_in_progress",
        "accepted",
        "in_production",
        "quality_check",
        "shipped",
        "delivered",
      ])
      .default("pending_dispatch"),
    tracking_number: model.text().nullable(),
    production_photos: model.array().nullable(),
    dispatch_attempts: model.number().default(0),
    last_error: model.text().nullable(),
    last_event_at: model.dateTime().nullable(),
  })
  .indexes([{ on: ["order_id"] }, { on: ["status"] }])

export default ProductionRequest
