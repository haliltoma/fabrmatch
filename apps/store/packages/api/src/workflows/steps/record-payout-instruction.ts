import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { ManufacturerAccount } from "../../lib/fabrmatch-contract"
import { computeReleaseAt } from "../../lib/payout-provider"
import { PRODUCTION_SYNC_MODULE } from "../../modules/production-sync"
import type ProductionSyncModuleService from "../../modules/production-sync/service"

export type RecordPayoutInstructionInput = {
  order_id: string
  production_request_external_id: string
  instruction: {
    instruction_id: string
    amount: number
    currency_code: string
    manufacturer_account?: ManufacturerAccount | null
  } | null
}

export type RecordPayoutInstructionOutput = { recorded: boolean; duplicate: boolean; id: string | null }

/**
 * Çift kayıt defterinin alıcı tarafı. `instruction_id` daha önce görüldüyse hiçbir şey
 * yazmaz (çift ödeme koruması). Transfer burada DEĞİL, hemen de denenmez — talimat
 * `received` olarak `release_at`'e kadar bekler (05-PRD escrow penceresi, bkz.
 * release-due-payouts job ve open-dispute/resolve-dispute iş akışları).
 */
export const recordPayoutInstructionStep = createStep(
  "record-payout-instruction",
  async (
    input: RecordPayoutInstructionInput,
    { container }
  ): Promise<StepResponse<RecordPayoutInstructionOutput, string | null>> => {
    if (!input.instruction) {
      return new StepResponse({ recorded: false, duplicate: false, id: null }, null)
    }

    const service: ProductionSyncModuleService = container.resolve(PRODUCTION_SYNC_MODULE)
    const [existing] = await service.listPayoutInstructions({
      instruction_id: input.instruction.instruction_id,
    })
    if (existing) {
      // Talimat daha önce görülmüş: tekrar ödeme denenmez, mevcut sonucu değiştirmeden bırakılır
      return new StepResponse({ recorded: false, duplicate: true, id: null }, null)
    }

    const created = await service.createPayoutInstructions({
      instruction_id: input.instruction.instruction_id,
      production_request_external_id: input.production_request_external_id,
      order_id: input.order_id,
      amount: input.instruction.amount,
      currency_code: input.instruction.currency_code.toLowerCase(),
      manufacturer_account_id: input.instruction.manufacturer_account?.account_id ?? null,
      release_at: computeReleaseAt(new Date()),
    })

    return new StepResponse({ recorded: true, duplicate: false, id: created.id }, created.id)
  },
  async (createdId, { container }) => {
    if (!createdId) {
      return
    }
    const service: ProductionSyncModuleService = container.resolve(PRODUCTION_SYNC_MODULE)
    await service.deletePayoutInstructions(createdId)
  }
)
