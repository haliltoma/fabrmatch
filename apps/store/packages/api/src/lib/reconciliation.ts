/**
 * 05-PRD / 09-API-SOZLESMESI Akış 3: Sistem B'nin "gönderdim" dediği olaylarla Sistem
 * A'nın gelen-kutusu defterini karşılaştırır. Sadece Sistem B'nin `delivered` (başarıyla
 * teslim ettiğini düşündüğü) dediği olaylar aday olur — `failed` (Sistem B de pes etti)
 * bir olayın Sistem A'da olmaması beklenen bir durumdur, anomali değildir.
 */

export type SistemBWebhookEvent = {
  event_id: string
  production_request_id: string
  status: string
  state: "delivered" | "failed"
  delivered_at: string | null
}

export type ReconciliationResult = {
  sistem_b_event_count: number
  matched_count: number
  missing_event_ids: string[]
  has_anomalies: boolean
}

export function buildReconciliationReport(
  sistemBEvents: SistemBWebhookEvent[],
  receivedEventIds: ReadonlySet<string>
): ReconciliationResult {
  const delivered = sistemBEvents.filter((event) => event.state === "delivered")
  const missing = delivered.filter((event) => !receivedEventIds.has(event.event_id)).map((event) => event.event_id)

  return {
    sistem_b_event_count: sistemBEvents.length,
    matched_count: delivered.length - missing.length,
    missing_event_ids: missing,
    has_anomalies: missing.length > 0,
  }
}
