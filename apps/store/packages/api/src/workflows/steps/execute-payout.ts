import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { getPayoutProvider } from "../../lib/payout-provider"
import { PRODUCTION_SYNC_MODULE } from "../../modules/production-sync"
import type ProductionSyncModuleService from "../../modules/production-sync/service"

export type PayoutInstructionLike = {
  id: string
  amount: number | string
  currency_code: string
  order_id: string
  instruction_id: string
  manufacturer_account_id: string | null
}

/**
 * `received` veya `on_hold` bir talimatı sağlayıcıya göndermeye çalışır ve sonucu yazar.
 * Hesap yoksa veya sağlayıcı hata dönerse talimat `failed` işaretlenir — asla fırlatmaz.
 * `execute-payout` adımı (otomatik serbest bırakma) ve `settle-dispute-payout` adımı
 * (anlaşmazlık çözümü) ortak kullanır.
 */
export async function attemptPayout(
  service: ProductionSyncModuleService,
  instruction: PayoutInstructionLike
): Promise<{ paid: boolean }> {
  if (!instruction.manufacturer_account_id) {
    await service.updatePayoutInstructions({
      id: instruction.id,
      status: "failed",
      failure_reason: "manufacturer has no payout account on file",
    })
    return { paid: false }
  }

  const provider = getPayoutProvider()
  const result = await provider.payout({
    amount: Number(instruction.amount),
    currencyCode: instruction.currency_code,
    accountId: instruction.manufacturer_account_id,
    transferGroup: instruction.order_id,
    idempotencyKey: instruction.instruction_id,
  })

  await service.updatePayoutInstructions(
    result.ok
      ? {
          id: instruction.id,
          status: "paid",
          provider: provider.name,
          provider_reference: result.providerReference,
          paid_at: new Date(),
        }
      : {
          id: instruction.id,
          status: "failed",
          provider: provider.name,
          failure_reason: result.error,
        }
  )

  return { paid: result.ok }
}

export type ExecutePayoutInput = { payoutInstructionId: string | null }
export type ExecutePayoutOutput = { attempted: boolean; paid: boolean }

/** Bekleme penceresi dolan bir talimatı serbest bırakır (bkz. release-due-payouts job). */
export const executePayoutStep = createStep(
  "execute-payout",
  async (input: ExecutePayoutInput, { container }): Promise<StepResponse<ExecutePayoutOutput, never>> => {
    if (!input.payoutInstructionId) {
      return new StepResponse({ attempted: false, paid: false })
    }

    const service: ProductionSyncModuleService = container.resolve(PRODUCTION_SYNC_MODULE)
    const instruction = await service.retrievePayoutInstruction(input.payoutInstructionId)
    const { paid } = await attemptPayout(service, instruction)

    return new StepResponse({ attempted: true, paid })
  }
)
