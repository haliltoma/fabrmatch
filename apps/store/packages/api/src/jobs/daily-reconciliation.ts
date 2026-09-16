import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { errorMessage } from "../lib/error-message"
import { fetchSistemBWebhookEvents } from "../lib/fabrmatch-contract"
import { buildReconciliationReport } from "../lib/reconciliation"
import { PRODUCTION_SYNC_MODULE } from "../modules/production-sync"
import type ProductionSyncModuleService from "../modules/production-sync/service"

// Sistem B'nin 1dk/5dk/30dk/2sa tekrar deneme penceresini rahatça kapsayan, örtüşmeli bir bakış açısı
const WINDOW_HOURS = 26

/** 05-PRD / 09 Akış 3: Sistem B'nin gönderdim dediği webhook'larla kendi gelen-kutumuzu karşılaştırır. */
export default async function dailyReconciliationJob(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const service: ProductionSyncModuleService = container.resolve(PRODUCTION_SYNC_MODULE)
  const windowStart = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000)

  try {
    const sistemB = await fetchSistemBWebhookEvents(windowStart.toISOString())
    if (!sistemB.ok) {
      logger.error(`Daily reconciliation could not reach Sistem B: ${sistemB.error}`)
      return
    }

    const eventIds = sistemB.events.map((event) => event.event_id)
    const received = eventIds.length ? await service.listInboundWebhookEvents({ event_id: eventIds }) : []
    const receivedIds = new Set(received.map((event) => event.event_id))

    const report = buildReconciliationReport(sistemB.events, receivedIds)
    await service.createReconciliationReports({
      checked_at: new Date(),
      window_start: windowStart,
      sistem_b_event_count: report.sistem_b_event_count,
      matched_count: report.matched_count,
      missing_event_ids: report.missing_event_ids,
      has_anomalies: report.has_anomalies,
    })

    if (report.has_anomalies) {
      logger.warn(
        `Reconciliation anomaly: Sistem B delivered ${report.missing_event_ids.length} event(s) Sistem A never received: ${report.missing_event_ids.join(", ")}`
      )
    } else {
      logger.info(`Daily reconciliation OK: ${report.matched_count}/${report.sistem_b_event_count} events matched`)
    }
  } catch (error) {
    logger.error(`Daily reconciliation job failed: ${errorMessage(error)}`)
  }
}

export const config = {
  name: "daily-reconciliation",
  schedule: "0 3 * * *",
}
