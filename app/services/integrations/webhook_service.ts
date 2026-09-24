import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import DomainError from '#exceptions/domain_error'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type Order from '#models/order'
import WebhookDelivery from '#models/webhook_delivery'
import WebhookEndpoint from '#models/webhook_endpoint'
import EncryptionService from '#services/identity/encryption_service'
import { validateWebhookUrl } from '#services/integrations/webhook_url'
import { safeTransport, type WebhookTransport } from '#services/integrations/webhook_transport'

export class WebhookError extends DomainError {}

export const MAX_ENDPOINTS = 5
export const MAX_ATTEMPTS = 8
export const DISABLE_AFTER_FAILURES = 20
const LEASE_MINUTES = 5
const RETENTION_DAYS = 30
/** Wait before attempt 2, 3, … (attempt 1 is immediate). */
const BACKOFF_MINUTES = [1, 5, 30, 120, 360, 720, 1440]

export type WebhookEventType = 'order.status_changed' | 'webhook.test'

export interface WebhookEvent {
  id: string
  type: WebhookEventType
  createdAt: string
  data: Record<string, unknown>
}

const now = () => DateTime.now()

/** `t=<unix seconds>,v1=<hex hmac-sha256 of "<t>.<body>">` — the Stripe-style scheme integrators already know. */
export function signPayload(secret: string, timestamp: number, body: string): string {
  const mac = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
  return `t=${timestamp},v1=${mac}`
}

/** Reference verifier (used in tests and copied into the docs): constant-time, rejects stale timestamps. */
export function verifySignature(
  secret: string,
  header: string,
  body: string,
  toleranceSeconds = 300,
  nowSeconds = Math.floor(Date.now() / 1000)
): boolean {
  const parts = Object.fromEntries(header.split(',').map((p) => p.trim().split('=', 2)))
  const timestamp = Number(parts.t)
  if (!Number.isInteger(timestamp) || !parts.v1) return false
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false
  const expected = Buffer.from(signPayload(secret, timestamp, body).split('v1=')[1], 'hex')
  const given = Buffer.from(parts.v1, 'hex')
  return expected.length === given.length && timingSafeEqual(expected, given)
}

export default class WebhookService {
  private encryption = new EncryptionService()

  constructor(private transport: WebhookTransport = safeTransport) {}

  async createEndpoint(
    userId: number,
    rawUrl: string
  ): Promise<{ endpoint: WebhookEndpoint; secret: string }> {
    const url = validateWebhookUrl(rawUrl, { allowHttp: !app.inProduction })
    const existing = await WebhookEndpoint.query().where('userId', userId)
    if (existing.length >= MAX_ENDPOINTS) {
      throw new WebhookError(`You can have at most ${MAX_ENDPOINTS} webhook endpoints`)
    }
    const secret = `whsec_${randomBytes(24).toString('hex')}`
    const endpoint = await WebhookEndpoint.create({
      userId,
      url,
      secretEnc: this.encryption.encrypt(secret),
      isActive: true,
      consecutiveFailures: 0,
    })
    return { endpoint, secret }
  }

  async listEndpoints(userId: number) {
    return WebhookEndpoint.query().where('userId', userId).orderBy('id', 'asc')
  }

  private async own(userId: number, id: number) {
    const endpoint = await WebhookEndpoint.query().where('id', id).where('userId', userId).first()
    if (!endpoint) throw new WebhookError('Webhook endpoint not found')
    return endpoint
  }

  async deleteEndpoint(userId: number, id: number): Promise<void> {
    const endpoint = await this.own(userId, id)
    await endpoint.delete()
  }

  /** Turning an endpoint back on clears its failure streak. */
  async setActive(userId: number, id: number, active: boolean): Promise<void> {
    const endpoint = await this.own(userId, id)
    endpoint.isActive = active
    endpoint.consecutiveFailures = 0
    endpoint.disabledReason = active ? null : 'Turned off by you'
    await endpoint.save()
  }

  async recentDeliveries(userId: number, limit = 20) {
    return WebhookDelivery.query()
      .whereIn('endpointId', WebhookEndpoint.query().select('id').where('userId', userId))
      .orderBy('id', 'desc')
      .limit(limit)
  }

  private newEvent(type: WebhookEventType, data: Record<string, unknown>): WebhookEvent {
    return {
      id: `evt_${randomBytes(12).toString('hex')}`,
      type,
      createdAt: now().toUTC().toISO()!,
      data,
    }
  }

  private async enqueue(
    endpointIds: number[],
    event: WebhookEvent,
    trx?: TransactionClientContract
  ) {
    for (const endpointId of endpointIds) {
      await WebhookDelivery.create(
        {
          endpointId,
          eventId: event.id,
          eventType: event.type,
          payload: event,
          status: 'pending',
          attempts: 0,
          nextAttemptAt: now(),
        },
        trx ? { client: trx } : undefined
      )
    }
  }

  /**
   * Called from inside the order-transition transaction: the delivery rows commit (or roll back)
   * together with the status change, so an event is never lost or sent for a change that did not
   * happen. Sending itself happens later, in the sweep.
   */
  async enqueueOrderStatusChange(
    order: Order,
    from: string,
    trx: TransactionClientContract
  ): Promise<void> {
    if (!order.sellerId) return
    const endpoints = await WebhookEndpoint.query({ client: trx })
      .where('userId', order.sellerId)
      .where('isActive', true)
    if (endpoints.length === 0) return
    const items = await trx
      .from('order_items')
      .where('order_id', order.id)
      .orderBy('id', 'asc')
      .select('material', 'color', 'quantity')
    const event = this.newEvent('order.status_changed', {
      previousStatus: from,
      order: {
        id: order.id,
        code: order.code,
        status: order.status,
        currency: order.currency,
        earnMinor: order.sellerShareMinor,
        items: items.map((i) => ({ material: i.material, color: i.color, quantity: i.quantity })),
      },
    })
    await this.enqueue(
      endpoints.map((e) => e.id),
      event,
      trx
    )
  }

  async sendTest(userId: number, id: number): Promise<void> {
    const endpoint = await this.own(userId, id)
    await this.enqueue(
      [endpoint.id],
      this.newEvent('webhook.test', { message: 'This is a test event from Fabrmatch.' })
    )
  }

  /**
   * Sends every due delivery. Rows are leased first (next attempt pushed out) so two workers never
   * send the same one; a crash mid-send simply lets the lease expire and the row is retried.
   */
  async deliverDue(limit = 50): Promise<{ delivered: number; failed: number; retried: number }> {
    const claimed = await db.transaction(async (trx) => {
      const rows = await WebhookDelivery.query({ client: trx })
        .where('status', 'pending')
        .where('nextAttemptAt', '<=', now().toSQL()!)
        .orderBy('id', 'asc')
        .limit(limit)
        .forUpdate()
        .skipLocked()
      for (const row of rows) {
        row.attempts += 1
        row.nextAttemptAt = now().plus({ minutes: LEASE_MINUTES })
        await row.useTransaction(trx).save()
      }
      return rows
    })

    const result = { delivered: 0, failed: 0, retried: 0 }
    for (const delivery of claimed) {
      const outcome = await this.attempt(delivery)
      result[outcome] += 1
    }
    await this.prune()
    return result
  }

  private async attempt(delivery: WebhookDelivery): Promise<'delivered' | 'failed' | 'retried'> {
    const endpoint = await WebhookEndpoint.find(delivery.endpointId)
    if (!endpoint || !endpoint.isActive) {
      delivery.status = 'failed'
      delivery.lastError = 'Endpoint is turned off'
      await delivery.save()
      return 'failed'
    }

    const body = JSON.stringify(delivery.payload)
    const timestamp = Math.floor(Date.now() / 1000)
    let statusCode: number | null = null
    let error: string | null = null
    try {
      const secret = this.encryption.decrypt(endpoint.secretEnc)
      const response = await this.transport({
        url: endpoint.url,
        body,
        headers: {
          'content-type': 'application/json',
          'user-agent': 'Fabrmatch-Webhooks/1',
          'fabrmatch-event-id': delivery.eventId,
          'fabrmatch-event-type': delivery.eventType,
          'fabrmatch-delivery-attempt': String(delivery.attempts),
          'fabrmatch-signature': signPayload(secret, timestamp, body),
        },
      })
      statusCode = response.status
      if (statusCode < 200 || statusCode >= 300) error = `Endpoint answered ${statusCode}`
    } catch (err) {
      error = (err as Error).message
    }
    delivery.lastStatusCode = statusCode
    delivery.lastError = error ? error.slice(0, 300) : null

    if (!error) {
      delivery.status = 'delivered'
      delivery.deliveredAt = now()
      await delivery.save()
      if (endpoint.consecutiveFailures > 0) {
        endpoint.consecutiveFailures = 0
        await endpoint.save()
      }
      return 'delivered'
    }

    endpoint.consecutiveFailures += 1
    if (endpoint.consecutiveFailures >= DISABLE_AFTER_FAILURES) {
      endpoint.isActive = false
      endpoint.disabledReason = 'Turned off after repeated failures'
      logger.warn({ msg: 'webhook endpoint disabled', endpointId: endpoint.id })
    }
    await endpoint.save()

    if (delivery.attempts >= MAX_ATTEMPTS) {
      delivery.status = 'failed'
      await delivery.save()
      return 'failed'
    }
    delivery.nextAttemptAt = now().plus({ minutes: BACKOFF_MINUTES[delivery.attempts - 1] })
    await delivery.save()
    return 'retried'
  }

  private async prune(): Promise<void> {
    await WebhookDelivery.query()
      .whereNot('status', 'pending')
      .where('createdAt', '<', now().minus({ days: RETENTION_DAYS }).toSQL()!)
      .delete()
  }
}
