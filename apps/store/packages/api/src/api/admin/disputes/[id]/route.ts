import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PRODUCTION_SYNC_MODULE } from "../../../../modules/production-sync"
import type ProductionSyncModuleService from "../../../../modules/production-sync/service"

/** Anlaşmazlık detayı + kanıt: production_request'in fotoğraf/kargo bilgisi ve olay geçmişi. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: ProductionSyncModuleService = req.scope.resolve(PRODUCTION_SYNC_MODULE)
  const dispute = await service.retrieveDispute(req.params.id).catch(() => null)
  if (!dispute) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Dispute ${req.params.id} is unknown`)
  }

  const [productionRequest] = await service.listProductionRequests({
    external_id: dispute.production_request_external_id,
  })
  const [payoutInstruction] = await service.listPayoutInstructions(
    { production_request_external_id: dispute.production_request_external_id },
    { order: { created_at: "DESC" }, take: 1 }
  )
  const timeline = await service.listInboundWebhookEvents(
    { production_request_external_id: dispute.production_request_external_id },
    { order: { received_at: "ASC" } }
  )

  res.json({
    dispute,
    evidence: {
      production_request_status: productionRequest?.status ?? null,
      tracking_number: productionRequest?.tracking_number ?? null,
      production_photos: productionRequest?.production_photos ?? [],
      timeline,
    },
    payout_instruction: payoutInstruction ?? null,
  })
}
