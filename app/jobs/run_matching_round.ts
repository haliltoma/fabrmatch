import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import Order from '#models/order'
import MatchingService from '#services/matching/matching_service'

interface RunMatchingRoundPayload {
  orderId: number
}

export default class RunMatchingRound extends Job<RunMatchingRoundPayload> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 3,
  }

  async execute() {
    const service = new MatchingService()
    const order = await Order.find(this.payload.orderId)
    if (!order) return
    if (order.status === 'paid') {
      await service.start(order.id)
    } else {
      await service.runRound(order.id)
    }
  }
}
