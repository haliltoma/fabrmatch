import crypto from "crypto"
import type { SistemBWebhookEvent } from "./reconciliation"

/**
 * Sistem A ↔ Sistem B sözleşmesi (docs/09-API-SOZLESMESI.md). Bu dosyadaki şema veya
 * başlık değişikliği Sistem B'de (apps/manufacturer-network) aynı değişikliği gerektirir.
 */

export const PRODUCTION_STATUS_RANK = {
  pending_dispatch: 0,
  dispatch_failed: 0,
  matching_in_progress: 1,
  accepted: 2,
  in_production: 3,
  quality_check: 4,
  shipped: 5,
  delivered: 6,
} as const

export type ProductionStatus = keyof typeof PRODUCTION_STATUS_RANK

export const WEBHOOK_STATUSES = [
  "accepted",
  "in_production",
  "quality_check",
  "shipped",
  "delivered",
] as const

export type WebhookStatus = (typeof WEBHOOK_STATUSES)[number]

/** Üreticinin transfer hesabı — sadece bir kimlik, Sistem B'de para hareketi/mantığı yok (09, 05-PRD). */
export type ManufacturerAccount = { provider: "stripe"; account_id: string }

export const SIGNATURE_HEADER = "x-fabrmatch-signature"
export const TIMESTAMP_HEADER = "x-fabrmatch-timestamp"
export const SIGNATURE_TOLERANCE_SECONDS = 300

export function signPayload(secret: string, timestamp: string, rawBody: string | Buffer): string {
  const digest = crypto.createHmac("sha256", secret).update(`${timestamp}.`).update(rawBody).digest("hex")
  return `v1=${digest}`
}

export function verifySignature({
  secret,
  timestamp,
  signature,
  rawBody,
  now = Date.now(),
}: {
  secret?: string
  timestamp?: string
  signature?: string
  rawBody?: string | Buffer
  now?: number
}): boolean {
  if (!secret || !timestamp || !signature || rawBody === undefined) {
    return false
  }
  const seconds = Number(timestamp)
  if (!Number.isInteger(seconds) || Math.abs(now / 1000 - seconds) > SIGNATURE_TOLERANCE_SECONDS) {
    return false
  }
  const expected = Buffer.from(signPayload(secret, timestamp, rawBody))
  const received = Buffer.from(signature)
  return expected.length === received.length && crypto.timingSafeEqual(expected, received)
}

/** Birim başına baskı metrikleri — ham dosya değil (09: Akış 1 `print_estimate`). */
export type PrintEstimate = {
  slicer: string
  part_weight_g: number
  support_weight_g: number
  print_time_minutes: number
}

export type ProductionRequestPayload = {
  sistem_a_order_ref: string
  sistem_a_line_item_ref: string
  design_reference: string
  material: string
  color: string | null
  quantity: number
  buyer_region: { country: string; city: string | null }
  requested_delivery_by: string
  print_estimate: PrintEstimate | null
}

export function parsePrintEstimate(value: unknown): PrintEstimate | null {
  if (!value || typeof value !== "object") {
    return null
  }
  const candidate = value as Record<string, unknown>
  const numbers = ["part_weight_g", "support_weight_g", "print_time_minutes"] as const
  if (typeof candidate.slicer !== "string" || numbers.some((key) => typeof candidate[key] !== "number")) {
    return null
  }
  return {
    slicer: candidate.slicer,
    part_weight_g: candidate.part_weight_g as number,
    support_weight_g: candidate.support_weight_g as number,
    print_time_minutes: candidate.print_time_minutes as number,
  }
}

export type DispatchResult =
  | { ok: true; production_request_id: string; status: string }
  | { ok: false; error: string }

const DISPATCH_TIMEOUT_MS = 10_000
const WEBHOOK_EVENTS_TIMEOUT_MS = 10_000

export type SistemBWebhookEventsResult =
  | { ok: true; events: SistemBWebhookEvent[] }
  | { ok: false; error: string }

/** Akış 3: GET {SISTEM_B_URL}/api/v1/webhook-events?since=... — günlük uzlaştırma. */
export async function fetchSistemBWebhookEvents(sinceIso: string): Promise<SistemBWebhookEventsResult> {
  const baseUrl = process.env.SISTEM_B_URL
  const apiKey = process.env.SISTEM_B_API_KEY
  if (!baseUrl || !apiKey) {
    return { ok: false, error: "SISTEM_B_URL or SISTEM_B_API_KEY is not configured" }
  }

  const url = new URL("/api/v1/webhook-events", baseUrl)
  url.searchParams.set("since", sinceIso)

  try {
    const response = await fetch(url, {
      headers: { accept: "application/json", authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(WEBHOOK_EVENTS_TIMEOUT_MS),
    })
    if (!response.ok) {
      const text = await response.text()
      return { ok: false, error: `HTTP ${response.status}: ${text.slice(0, 500)}` }
    }
    const body = (await response.json()) as { events?: unknown }
    if (!Array.isArray(body.events)) {
      return { ok: false, error: "response is missing an events array" }
    }
    return { ok: true, events: body.events as SistemBWebhookEvent[] }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/** Akış 1: POST {SISTEM_B_URL}/api/v1/production-requests. Hata fırlatmaz, sonucu döner. */
export async function sendProductionRequest(
  payload: ProductionRequestPayload,
  idempotencyKey: string
): Promise<DispatchResult> {
  const baseUrl = process.env.SISTEM_B_URL
  const apiKey = process.env.SISTEM_B_API_KEY
  if (!baseUrl || !apiKey) {
    return { ok: false, error: "SISTEM_B_URL or SISTEM_B_API_KEY is not configured" }
  }

  try {
    const response = await fetch(new URL("/api/v1/production-requests", baseUrl), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // Sistem B (Adonis) doğrulama hatalarını ancak JSON kabul edilirse 422 olarak döner
        accept: "application/json",
        authorization: `Bearer ${apiKey}`,
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS),
    })
    if (!response.ok) {
      const text = await response.text()
      return { ok: false, error: `HTTP ${response.status}: ${text.slice(0, 500)}` }
    }
    const body = (await response.json()) as { production_request_id?: string; status?: string }
    if (!body.production_request_id) {
      return { ok: false, error: "response is missing production_request_id" }
    }
    return {
      ok: true,
      production_request_id: body.production_request_id,
      status: body.status ?? "matching_in_progress",
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
