import OutboundWebhookEvent, { type DeliveryState } from '#models/outbound_webhook_event'
import PayoutInstruction from '#models/payout_instruction'
import { signedWebhookHeaders } from '#services/contract/signature'
import env from '#start/env'
import { DateTime } from 'luxon'

/** 09: başarısız gönderim 1dk, 5dk, 30dk, 2sa sonra tekrar denenir; sonra `failed`. */
export const RETRY_DELAYS_MINUTES = [1, 5, 30, 120] as const
const REQUEST_TIMEOUT_MS = 10_000

export type DeliveryOptions = {
  baseUrl?: string
  secret?: string
  fetchImpl?: typeof fetch
  now?: () => DateTime
}

type Outcome = { ok: true } | { ok: false; retryable: boolean; error: string }

async function post(event: OutboundWebhookEvent, options: DeliveryOptions): Promise<Outcome> {
  const baseUrl = options.baseUrl ?? env.get('SISTEM_A_URL')
  const secret = options.secret ?? env.get('FABRMATCH_WEBHOOK_SECRET').release()
  const body = JSON.stringify(event.payload)

  try {
    const response = await (options.fetchImpl ?? fetch)(new URL('/webhooks/production-status', baseUrl), {
      method: 'POST',
      headers: signedWebhookHeaders(secret, body),
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (response.ok) {
      return { ok: true }
    }
    const text = await response.text()
    return {
      ok: false,
      // 4xx (imza, doğrulama, bilinmeyen talep) tekrar denemekle düzelmez
      retryable: response.status >= 500 || response.status === 408 || response.status === 429,
      error: `HTTP ${response.status}: ${text.slice(0, 500)}`,
    }
  } catch (error) {
    return { ok: false, retryable: true, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Bir webhook olayını Sistem A'ya imzalı gönderir ve defteri günceller. Aynı talebin
 * daha eski bekleyen olayı varsa sırayı korumak için bu olay bekletilir.
 */
export async function deliverWebhookEvent(eventId: number, options: DeliveryOptions = {}): Promise<DeliveryState> {
  const event = await OutboundWebhookEvent.findOrFail(eventId)
  if (event.state !== 'pending') {
    return event.state
  }

  const earlierPending = await OutboundWebhookEvent.query()
    .where('production_request_id', event.productionRequestId)
    .where('state', 'pending')
    .where('id', '<', event.id)
    .first()
  if (earlierPending) {
    return 'pending'
  }

  const outcome = await post(event, options)
  const now = options.now?.() ?? DateTime.now()
  event.attempts += 1

  if (outcome.ok) {
    event.merge({ state: 'delivered', deliveredAt: now, lastError: null, nextAttemptAt: null })
    const instruction = event.payload.payout_instruction
    if (instruction) {
      await PayoutInstruction.query()
        .where('public_id', instruction.instruction_id)
        .update({ status: 'sent', sent_at: now.toSQL(), updated_at: now.toSQL() })
    }
  } else {
    const delay = RETRY_DELAYS_MINUTES[event.attempts - 1]
    const retry = outcome.retryable && delay !== undefined
    event.merge({
      state: retry ? 'pending' : 'failed',
      lastError: outcome.error,
      nextAttemptAt: retry ? now.plus({ minutes: delay }) : null,
    })
  }

  await event.save()
  return event.state
}

/** Zamanı gelmiş bekleyen olaylar (zamanlanmış tarama job'ı için) */
export async function dueWebhookEventIds(now = DateTime.now(), limit = 100): Promise<number[]> {
  const events = await OutboundWebhookEvent.query()
    .where('state', 'pending')
    .where('next_attempt_at', '<=', now.toSQL()!)
    .orderBy('id')
    .limit(limit)
    .select('id')
  return events.map((event) => event.id)
}
