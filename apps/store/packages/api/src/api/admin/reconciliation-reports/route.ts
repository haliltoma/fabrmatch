import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCTION_SYNC_MODULE } from "../../../modules/production-sync"
import type ProductionSyncModuleService from "../../../modules/production-sync/service"

/**
 * 05-PRD: günlük uzlaştırma raporlarını admin panelinden görünür kılar. `/admin/*`
 * öntanımlı olarak admin kimlik doğrulaması ister — ayrı bir middleware gerekmez.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: ProductionSyncModuleService = req.scope.resolve(PRODUCTION_SYNC_MODULE)
  const [reconciliation_reports, count] = await service.listAndCountReconciliationReports(
    {},
    { take: 20, order: { checked_at: "DESC" } }
  )
  res.json({ reconciliation_reports, count })
}
