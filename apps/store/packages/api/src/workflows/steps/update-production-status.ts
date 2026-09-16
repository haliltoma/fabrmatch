import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  PRODUCTION_STATUS_RANK,
  type ManufacturerAccount,
  type ProductionStatus,
  type WebhookStatus,
} from "../../lib/fabrmatch-contract"
import { PRODUCTION_SYNC_MODULE } from "../../modules/production-sync"
import type ProductionSyncModuleService from "../../modules/production-sync/service"

export type ApplyProductionStatusInput = {
  event_id: string
  sistem_a_order_ref: string
  sistem_a_line_item_ref: string
  production_request_id: string
  status: WebhookStatus
  occurred_at: string
  tracking_number?: string | null
  production_photos?: string[] | null
  payout_instruction?: {
    instruction_id: string
    amount: number
    currency_code: string
    manufacturer_account?: ManufacturerAccount | null
  } | null
}

/**
 * Durumlar yalnızca ileri gider: geç gelen eski bir webhook (ör. shipped'dan sonra
 * gelen in_production) kaydı geri almaz. Aynı durumun tekrarı idempotent'tir.
 */
export const updateProductionStatusStep = createStep(
  "update-production-status",
  async (input: ApplyProductionStatusInput, { container }) => {
    const service: ProductionSyncModuleService = container.resolve(PRODUCTION_SYNC_MODULE)
    const [request] = await service.listProductionRequests({ external_id: input.production_request_id })

    if (!request || request.line_item_id !== input.sistem_a_line_item_ref) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Production request ${input.production_request_id} is unknown`
      )
    }

    const currentRank = PRODUCTION_STATUS_RANK[request.status as ProductionStatus]
    if (PRODUCTION_STATUS_RANK[input.status] < currentRank) {
      return new StepResponse({ id: request.id, applied: false }, null)
    }

    const previous = {
      id: request.id,
      status: request.status,
      tracking_number: request.tracking_number,
      production_photos: request.production_photos,
      last_event_at: request.last_event_at,
    }

    await service.updateProductionRequests({
      id: request.id,
      status: input.status,
      tracking_number: input.tracking_number ?? request.tracking_number,
      production_photos: input.production_photos?.length
        ? input.production_photos
        : request.production_photos,
      last_event_at: new Date(input.occurred_at),
    })

    return new StepResponse({ id: request.id, applied: true }, previous)
  },
  async (previous, { container }) => {
    if (!previous) {
      return
    }
    const service: ProductionSyncModuleService = container.resolve(PRODUCTION_SYNC_MODULE)
    await service.updateProductionRequests({
      ...previous,
      status: previous.status as ProductionStatus,
    })
  }
)
