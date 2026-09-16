import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  parsePrintEstimate,
  sendProductionRequest,
  type DispatchResult,
} from "../../lib/fabrmatch-contract"
import { PRODUCTION_SYNC_MODULE } from "../../modules/production-sync"
import type ProductionSyncModuleService from "../../modules/production-sync/service"

export type SendProductionRequestInput = { id: string }

export type SendProductionRequestOutput = {
  id: string
  skipped: boolean
  result: DispatchResult
  previous: { status: string; dispatch_attempts: number; last_error: string | null }
}

/**
 * Akış 1 çağrısı. Dış yan etki olduğu için telafi (compensation) yok; Sistem B aynı
 * `Idempotency-Key` (line item id) ile gelen tekrarları yeni talep açmadan yanıtlar.
 */
export const sendProductionRequestStep = createStep(
  "send-production-request",
  async ({ id }: SendProductionRequestInput, { container }) => {
    const service: ProductionSyncModuleService = container.resolve(PRODUCTION_SYNC_MODULE)
    const request = await service.retrieveProductionRequest(id)
    const previous = {
      status: request.status,
      dispatch_attempts: request.dispatch_attempts,
      last_error: request.last_error,
    }

    if (request.external_id) {
      const output: SendProductionRequestOutput = {
        id,
        skipped: true,
        result: { ok: true, production_request_id: request.external_id, status: request.status },
        previous,
      }
      return new StepResponse(output)
    }

    const result = await sendProductionRequest(
      {
        sistem_a_order_ref: request.order_id,
        sistem_a_line_item_ref: request.line_item_id,
        design_reference: request.design_reference,
        material: request.material,
        color: request.color,
        quantity: request.quantity,
        buyer_region: { country: request.buyer_country, city: request.buyer_city },
        requested_delivery_by: new Date(request.requested_delivery_by).toISOString().slice(0, 10),
        print_estimate: parsePrintEstimate(request.print_estimate),
      },
      request.line_item_id
    )

    const output: SendProductionRequestOutput = { id, skipped: false, result, previous }
    return new StepResponse(output)
  }
)
