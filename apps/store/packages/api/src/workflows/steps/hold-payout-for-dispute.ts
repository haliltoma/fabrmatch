import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCTION_SYNC_MODULE } from "../../modules/production-sync"
import type ProductionSyncModuleService from "../../modules/production-sync/service"

export type HoldPayoutForDisputeInput = { production_request_external_id: string }
export type HoldPayoutForDisputeOutput = { held_payout_instruction_id: string | null }

/**
 * Açık bir anlaşmazlık varken bekleyen (`received`) ödemeyi tutar (05-PRD escrow
 * hedefi: "ödeme, teslimat onaylanana kadar tutulsun"). Talimat zaten serbest
 * bırakılmışsa (`paid`) veya hiç yoksa hiçbir şey yapmaz — bu durum ayrıca not edilir,
 * bkz. settle-dispute-payout.
 */
export const holdPayoutForDisputeStep = createStep(
  "hold-payout-for-dispute",
  async (
    input: HoldPayoutForDisputeInput,
    { container }
  ): Promise<StepResponse<HoldPayoutForDisputeOutput, string | null>> => {
    const service: ProductionSyncModuleService = container.resolve(PRODUCTION_SYNC_MODULE)
    const [instruction] = await service.listPayoutInstructions({
      production_request_external_id: input.production_request_external_id,
      status: "received",
    })

    if (!instruction) {
      return new StepResponse({ held_payout_instruction_id: null }, null)
    }

    await service.updatePayoutInstructions({ id: instruction.id, status: "on_hold" })
    return new StepResponse({ held_payout_instruction_id: instruction.id }, instruction.id)
  },
  async (heldId, { container }) => {
    if (!heldId) {
      return
    }
    const service: ProductionSyncModuleService = container.resolve(PRODUCTION_SYNC_MODULE)
    await service.updatePayoutInstructions({ id: heldId, status: "received" })
  }
)
