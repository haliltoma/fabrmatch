import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCTION_SYNC_MODULE } from "../../modules/production-sync"
import type ProductionSyncModuleService from "../../modules/production-sync/service"
import { attemptPayout } from "./execute-payout"

export type DisputeResolution = "manufacturer" | "buyer" | "dismiss"

export type SettleDisputePayoutInput = {
  production_request_external_id: string
  resolution: DisputeResolution
}

export type SettleDisputePayoutOutput = {
  payout_instruction_id: string | null
  payout_status: "cancelled" | "paid" | "failed" | null
}

/**
 * Anlaşmazlık sonuçlanınca `on_hold` ödemeyi serbest bırakır (üretici lehine veya
 * reddedildi) ya da iptal eder (alıcı lehine). Bekleyen bir talimat yoksa (ör. dispute,
 * ödeme penceresi dolup otomatik serbest bırakıldıktan SONRA açıldıysa) hiçbir şey
 * yapmaz — bu durumda manuel iade/ters kayıt gerekebilir, kayıt admin panelinde görünür.
 */
export const settleDisputePayoutStep = createStep(
  "settle-dispute-payout",
  async (
    input: SettleDisputePayoutInput,
    { container }
  ): Promise<StepResponse<SettleDisputePayoutOutput, { id: string } | null>> => {
    const service: ProductionSyncModuleService = container.resolve(PRODUCTION_SYNC_MODULE)
    const [instruction] = await service.listPayoutInstructions({
      production_request_external_id: input.production_request_external_id,
      status: "on_hold",
    })

    if (!instruction) {
      return new StepResponse({ payout_instruction_id: null, payout_status: null }, null)
    }

    if (input.resolution === "buyer") {
      await service.updatePayoutInstructions({ id: instruction.id, status: "cancelled" })
      return new StepResponse(
        { payout_instruction_id: instruction.id, payout_status: "cancelled" },
        { id: instruction.id }
      )
    }

    const { paid } = await attemptPayout(service, instruction)
    return new StepResponse(
      { payout_instruction_id: instruction.id, payout_status: paid ? "paid" : "failed" },
      { id: instruction.id }
    )
  },
  async (previous, { container }) => {
    if (!previous) {
      return
    }
    const service: ProductionSyncModuleService = container.resolve(PRODUCTION_SYNC_MODULE)
    await service.updatePayoutInstructions({ id: previous.id, status: "on_hold" })
  }
)
