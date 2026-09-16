import DeliverWebhookEvent from '#jobs/deliver_webhook_event'
import MatchProductionRequest from '#jobs/match_production_request'
import Manufacturer from '#models/manufacturer'
import MatchOffer from '#models/match_offer'
import OutboundWebhookEvent from '#models/outbound_webhook_event'
import PayoutInstruction from '#models/payout_instruction'
import ProductionRequest, { type ProductionStatus } from '#models/production_request'
import type { WebhookStatus } from '#services/contract/types'
import { publicId } from '#services/public_id'
import { Exception } from '@adonisjs/core/exceptions'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export class InvalidTransitionException extends Exception {
  static status = 409
  static code = 'E_INVALID_PRODUCTION_TRANSITION'
}

/** Üreticinin ilerletebileceği durumlar ve hangi durumdan gelinebileceği */
const ALLOWED_FROM: Record<Exclude<WebhookStatus, 'accepted'>, ProductionStatus> = {
  in_production: 'accepted',
  quality_check: 'in_production',
  shipped: 'quality_check',
  delivered: 'shipped',
}

async function recordEvent(
  trx: TransactionClientContract,
  request: ProductionRequest,
  status: WebhookStatus,
  occurredAt: DateTime,
  payoutInstruction: PayoutInstruction | null,
  manufacturerStripeAccountId?: string | null
) {
  const eventId = publicId('evt')
  return OutboundWebhookEvent.create(
    {
      publicId: eventId,
      productionRequestId: request.id,
      status,
      state: 'pending',
      attempts: 0,
      nextAttemptAt: occurredAt,
      payload: {
        event_id: eventId,
        sistem_a_order_ref: request.sistemAOrderRef,
        sistem_a_line_item_ref: request.sistemALineItemRef,
        production_request_id: request.publicId,
        status,
        occurred_at: occurredAt.toUTC().toISO()!,
        tracking_number: request.trackingNumber,
        production_photos: request.productionPhotos,
        payout_instruction: payoutInstruction
          ? {
              instruction_id: payoutInstruction.publicId,
              amount: payoutInstruction.amount,
              currency_code: payoutInstruction.currencyCode,
              manufacturer_account: manufacturerStripeAccountId
                ? { provider: 'stripe' as const, account_id: manufacturerStripeAccountId }
                : null,
            }
          : null,
      },
    },
    { client: trx }
  )
}

async function lockOwnedRequest(trx: TransactionClientContract, manufacturerId: number, requestId: number) {
  const request = await ProductionRequest.query({ client: trx })
    .where('id', requestId)
    .where('manufacturer_id', manufacturerId)
    .forUpdate()
    .first()
  if (!request) {
    throw new InvalidTransitionException('Production request not found for this manufacturer', { status: 404 })
  }
  return request
}

async function afterCommit(event: OutboundWebhookEvent) {
  await DeliverWebhookEvent.dispatch({ eventId: event.id })
  return event
}

export async function acceptOffer(manufacturerId: number, offerId: number) {
  const event = await db.transaction(async (trx) => {
    const offer = await MatchOffer.query({ client: trx })
      .where('id', offerId)
      .where('manufacturer_id', manufacturerId)
      .forUpdate()
      .first()
    if (!offer || offer.status !== 'offered') {
      throw new InvalidTransitionException('Offer is no longer open')
    }
    if (offer.expiresAt < DateTime.now()) {
      throw new InvalidTransitionException('Offer has expired')
    }
    const request = await lockOwnedRequest(trx, manufacturerId, offer.productionRequestId)
    if (request.status !== 'awaiting_acceptance') {
      throw new InvalidTransitionException(`Cannot accept a request in status ${request.status}`)
    }

    const now = DateTime.now()
    offer.merge({ status: 'accepted', respondedAt: now })
    await offer.save()
    request.merge({ status: 'accepted', acceptedAt: now, manufacturerPayout: offer.quotedPayout })
    await request.save()
    return recordEvent(trx, request, 'accepted', now, null)
  })
  return afterCommit(event)
}

export async function declineOffer(manufacturerId: number, offerId: number) {
  const requestId = await db.transaction(async (trx) => {
    const offer = await MatchOffer.query({ client: trx })
      .where('id', offerId)
      .where('manufacturer_id', manufacturerId)
      .forUpdate()
      .first()
    if (!offer || offer.status !== 'offered') {
      throw new InvalidTransitionException('Offer is no longer open')
    }
    const request = await lockOwnedRequest(trx, manufacturerId, offer.productionRequestId)

    offer.merge({ status: 'declined', respondedAt: DateTime.now() })
    await offer.save()
    // Reddeden üretici bir sonraki eşleştirmede hariç tutulur (match_offers.status = declined)
    request.merge({ status: 'matching_in_progress', manufacturerId: null, manufacturerPayout: null })
    await request.save()
    return request.id
  })
  await MatchProductionRequest.dispatch({ productionRequestId: requestId })
}

export type AdvanceInput =
  | { status: 'in_production' }
  | { status: 'quality_check'; photos: string[] }
  | { status: 'shipped'; trackingNumber: string }
  | { status: 'delivered' }

export async function advanceProduction(manufacturerId: number, requestId: number, input: AdvanceInput) {
  const event = await db.transaction(async (trx) => {
    const request = await lockOwnedRequest(trx, manufacturerId, requestId)
    if (request.status !== ALLOWED_FROM[input.status]) {
      throw new InvalidTransitionException(`Cannot move from ${request.status} to ${input.status}`)
    }

    const now = DateTime.now()
    request.status = input.status
    let payoutInstruction: PayoutInstruction | null = null
    let manufacturerStripeAccountId: string | null = null

    if (input.status === 'quality_check') {
      request.productionPhotos = input.photos
    } else if (input.status === 'shipped') {
      request.merge({ trackingNumber: input.trackingNumber, shippedAt: now })
    } else if (input.status === 'delivered') {
      request.deliveredAt = now
      const manufacturer = await Manufacturer.query({ client: trx }).where('id', manufacturerId).forUpdate().firstOrFail()
      const onTime = now.startOf('day') <= request.requestedDeliveryBy.startOf('day') ? 1 : 0
      const previous = manufacturer.completedOrders
      manufacturer.merge({
        completedOrders: previous + 1,
        onTimeRate: ((manufacturer.onTimeRate ?? onTime) * previous + onTime) / (previous + 1),
      })
      await manufacturer.save()
      manufacturerStripeAccountId = manufacturer.stripeAccountId

      // Tutar bilgisi — ödeme Sistem A'da yapılır (05); tahmin yoksa tutar hesaplanamaz
      if (request.manufacturerPayout !== null) {
        payoutInstruction = await PayoutInstruction.create(
          {
            productionRequestId: request.id,
            manufacturerId,
            amount: request.manufacturerPayout,
            currencyCode: request.currencyCode,
            status: 'pending',
          },
          { client: trx }
        )
      }
    }

    await request.save()
    return recordEvent(trx, request, input.status, now, payoutInstruction, manufacturerStripeAccountId)
  })
  return afterCommit(event)
}
