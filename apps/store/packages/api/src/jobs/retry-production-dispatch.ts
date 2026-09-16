import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { errorMessage } from "../lib/error-message"
import { PRODUCTION_SYNC_MODULE } from "../modules/production-sync"
import type ProductionSyncModuleService from "../modules/production-sync/service"
import { dispatchProductionRequestWorkflow } from "../workflows/dispatch-production-request"

const MAX_ATTEMPTS = 10
const BATCH_SIZE = 50

export default async function retryProductionDispatchJob(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const service: ProductionSyncModuleService = container.resolve(PRODUCTION_SYNC_MODULE)

  try {
    const pending = await service.listProductionRequests(
      { status: ["pending_dispatch", "dispatch_failed"], dispatch_attempts: { $lt: MAX_ATTEMPTS } },
      { take: BATCH_SIZE, order: { created_at: "ASC" } }
    )

    let dispatched = 0
    for (const request of pending) {
      try {
        const { result } = await dispatchProductionRequestWorkflow(container).run({
          input: { id: request.id },
        })
        dispatched += result.dispatched ? 1 : 0
      } catch (error) {
        logger.error(`Retrying production request ${request.id} failed: ${errorMessage(error)}`)
      }
    }

    if (pending.length) {
      logger.info(`Production dispatch retry: ${dispatched}/${pending.length} dispatched`)
    }
  } catch (error) {
    logger.error(`Production dispatch retry job failed: ${errorMessage(error)}`)
  }
}

export const config = {
  name: "retry-production-dispatch",
  schedule: "*/5 * * * *",
}
