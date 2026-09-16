import MatchProductionRequest from '#jobs/match_production_request'
import ProductionRequest from '#models/production_request'
import type { PrintEstimate } from '#services/contract/types'
import type { DateTime } from 'luxon'

export type IntakePayload = {
  sistem_a_order_ref: string
  sistem_a_line_item_ref: string
  design_reference: string
  material: string
  color: string | null
  quantity: number
  buyer_region: { country: string; city: string | null }
  /** Adonis'in VineJS entegrasyonu `vine.date()` sonucunu luxon DateTime olarak verir */
  requested_delivery_by: DateTime
  print_estimate?: PrintEstimate | null
}

const findByLineItem = (lineItemRef: string) =>
  ProductionRequest.query().where('sistem_a_line_item_ref', lineItemRef).first()

/**
 * Akış 1: talebi kaydeder ve eşleştirmeyi kuyruğa atar. Aynı sipariş kalemi tekrar
 * gelirse (Sistem A yeniden denemesi) mevcut talep döner, yeni kayıt açılmaz.
 */
export async function intakeProductionRequest(payload: IntakePayload) {
  const existing = await findByLineItem(payload.sistem_a_line_item_ref)
  if (existing) {
    return { request: existing, created: false }
  }

  let request: ProductionRequest
  try {
    request = await ProductionRequest.create({
      sistemAOrderRef: payload.sistem_a_order_ref,
      sistemALineItemRef: payload.sistem_a_line_item_ref,
      designReference: payload.design_reference,
      material: payload.material,
      color: payload.color,
      quantity: payload.quantity,
      buyerCountry: payload.buyer_region.country,
      buyerCity: payload.buyer_region.city,
      requestedDeliveryBy: payload.requested_delivery_by,
      printEstimate: payload.print_estimate ?? null,
      status: 'matching_in_progress',
    })
  } catch (error) {
    // Eşzamanlı tekrar: unique(sistem_a_line_item_ref) ihlali → diğer isteğin kaydı döner
    const raced = await findByLineItem(payload.sistem_a_line_item_ref)
    if (raced) {
      return { request: raced, created: false }
    }
    throw error
  }

  await MatchProductionRequest.dispatch({ productionRequestId: request.id })
  await request.refresh()
  return { request, created: true }
}
