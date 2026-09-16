import { model } from "@medusajs/framework/utils"

/**
 * Günlük otomatik uzlaştırma sonucu (05-PRD, 09-API-SOZLESMESI Akış 3). Her çalışmada
 * bir kayıt eklenir — geçmiş, geriye dönük denetim için saklanır.
 */
const ReconciliationReport = model.define("reconciliation_report", {
  id: model.id({ prefix: "fmrr" }).primaryKey(),
  checked_at: model.dateTime(),
  window_start: model.dateTime(),
  sistem_b_event_count: model.number(),
  matched_count: model.number(),
  // Sistem B "delivered" diyor ama Sistem A'da hiç kaydı yok — "gönderildi ama alınmadı"
  missing_event_ids: model.array(),
  has_anomalies: model.boolean(),
})

export default ReconciliationReport
