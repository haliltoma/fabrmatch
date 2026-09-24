import logger from '@adonisjs/core/services/logger'
import transmit from '@adonisjs/transmit/services/main'
import fabrmatchConfig from '#config/fabrmatch'
import type MatchOffer from '#models/match_offer'
import type ProductionJob from '#models/production_job'
import OrderNotifier from '#services/notifications/order_notifier'

/** Side effects that must run after the matching transaction commits. */
export interface MatchingEffects {
  offerCreated(offer: MatchOffer): Promise<void>
  offerAccepted(job: ProductionJob): Promise<void>
  orderUnmatched(orderId: number, reason: string): Promise<void>
}

export function offersChannel(manufacturerProfileId: number) {
  return `manufacturers/${manufacturerProfileId}/offers`
}

async function safely(label: string, fn: () => Promise<unknown>) {
  try {
    await fn()
  } catch (error) {
    logger.error({ msg: `matching effect failed: ${label}`, error: (error as Error).message })
  }
}

export default class QueueMatchingEffects implements MatchingEffects {
  private notifier = new OrderNotifier()

  async offerCreated(offer: MatchOffer) {
    await safely('schedule expiry', async () => {
      const { default: ExpireOffer } = await import('#jobs/expire_offer')
      await ExpireOffer.dispatch({ offerId: offer.id }).in(
        `${fabrmatchConfig.matching.offerTtlMinutes}m`
      )
    })

    await safely('broadcast offer', async () => {
      transmit.broadcast(offersChannel(offer.manufacturerProfileId), {
        type: 'offer.created',
        offerId: offer.id,
        expiresAt: offer.expiresAt.toISO(),
      })
    })

    await safely('notify maker', () =>
      this.notifier.offerReceived(offer, fabrmatchConfig.matching.offerTtlMinutes)
    )
  }

  async offerAccepted(job: ProductionJob) {
    await safely('broadcast accepted', async () => {
      transmit.broadcast(offersChannel(job.manufacturerProfileId), {
        type: 'offer.accepted',
        productionJobId: job.id,
      })
    })
    await safely('notify order parties', () => this.notifier.inProduction(job.orderId))
  }

  async orderUnmatched(orderId: number, reason: string) {
    logger.warn({ msg: 'order unmatched — needs admin review', orderId, reason })
    await safely('notify buyer', () => this.notifier.unmatched(orderId))
  }
}
