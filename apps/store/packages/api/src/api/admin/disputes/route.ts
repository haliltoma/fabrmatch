import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCTION_SYNC_MODULE } from "../../../modules/production-sync"
import type ProductionSyncModuleService from "../../../modules/production-sync/service"
import { openDisputeWorkflow } from "../../../workflows/open-dispute"
import type { CreateDisputeSchema } from "./middlewares"

/**
 * 05-PRD "kanıta dayalı anlaşmazlık çözüm süreci". Alıcı hesabı henüz yok (Faz 4'te
 * ertelendi) — şimdilik admin, destek talebiyle ulaşan alıcı adına anlaşmazlığı açar.
 * Kanıt (fotoğraf/kargo) burada TEKRAR girilmez, GET ile production_request'ten okunur.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const service: ProductionSyncModuleService = req.scope.resolve(PRODUCTION_SYNC_MODULE)
  const [disputes, count] = await service.listAndCountDisputes({}, { take: 50, order: { opened_at: "DESC" } })

  const externalIds = disputes.map((dispute) => dispute.production_request_external_id)
  const requests = externalIds.length
    ? await service.listProductionRequests({ external_id: externalIds })
    : []
  const requestByExternalId = new Map(requests.map((request) => [request.external_id, request]))

  res.json({
    disputes: disputes.map((dispute) => ({
      ...dispute,
      production_request_status: requestByExternalId.get(dispute.production_request_external_id)?.status ?? null,
    })),
    count,
  })
}

export async function POST(req: AuthenticatedMedusaRequest<CreateDisputeSchema>, res: MedusaResponse) {
  const { result } = await openDisputeWorkflow(req.scope).run({
    input: {
      production_request_external_id: req.validatedBody.production_request_external_id,
      reason: req.validatedBody.reason,
      opened_by: req.auth_context.actor_id,
    },
  })

  res.status(201).json(result)
}
