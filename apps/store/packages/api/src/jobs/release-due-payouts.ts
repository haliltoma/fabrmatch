import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { errorMessage } from "../lib/error-message"
import { PRODUCTION_SYNC_MODULE } from "../modules/production-sync"
import type ProductionSyncModuleService from "../modules/production-sync/service"
import { releasePayoutWorkflow } from "../workflows/release-payout"

/**
 * 05-PRD escrow: bekleme penceresi (`release_at`, bkz. payout-provider.ts) dolan ve
 * bu arada `on_hold`a alınmamış (yani anlaşmazlığı olmayan) talimatları serbest bırakır.
 * `on_hold` talimatlar burada dokunulmaz — onlar yalnızca resolve-dispute ile çözülür.
 */
export default async function releaseDuePayoutsJob(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const service: ProductionSyncModuleService = container.resolve(PRODUCTION_SYNC_MODULE)

  const due = await service.listPayoutInstructions({
    status: "received",
    release_at: { $lte: new Date() },
  })

  for (const instruction of due) {
    try {
      const { result } = await releasePayoutWorkflow(container).run({
        input: { payoutInstructionId: instruction.id },
      })
      logger.info(
        `Released payout ${instruction.instruction_id}: ${result.paid ? "paid" : "failed"}`
      )
    } catch (error) {
      logger.error(`Failed to release payout ${instruction.instruction_id}: ${errorMessage(error)}`)
    }
  }
}

export const config = {
  name: "release-due-payouts",
  schedule: "*/15 * * * *",
}
