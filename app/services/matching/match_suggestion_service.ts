import fabrmatchConfig from '#config/fabrmatch'
import ManufacturerProfile from '#models/manufacturer_profile'
import Order from '#models/order'
import Printer from '#models/printer'
import EligibilityService from '#services/matching/eligibility_service'
import EligibilityExplainer from '#services/matching/eligibility_explainer'
import { isInExplorationPool, scoreParts } from '#services/matching/ranking'
import OrderService from '#services/orders/order_service'
import { productionDaysFor } from '#services/orders/production_window'
import MatchingService from '#services/matching/matching_service'

export type QueueState = 'needs_maker' | 'offer_out' | 'unmatched'

/**
 * What the admin matching screen shows: orders waiting for a maker, and for one order the makers
 * that pass every eligibility rule right now, best first, with the parts of their score. Admin
 * only — maker names are visible here and nowhere on the buyer or seller side.
 */
export default class MatchSuggestionService {
  private eligibility = new EligibilityService()
  private orders = new OrderService()

  async queue() {
    const orders = await Order.query()
      .whereIn('status', ['matching', 'unmatched'])
      .preload('items')
      .preload('matchOffers', (q) => q.orderBy('id', 'desc'))
      .orderBy('updatedAt', 'asc')

    const pendingMakerIds = orders.flatMap((o) =>
      o.matchOffers.filter((m) => m.status === 'pending').map((m) => m.manufacturerProfileId)
    )
    const makers = await this.makersById(pendingMakerIds)

    return orders.map((order) => {
      const pending = order.matchOffers.find((m) => m.status === 'pending') ?? null
      const state: QueueState =
        order.status === 'unmatched' ? 'unmatched' : pending ? 'offer_out' : 'needs_maker'
      return {
        id: order.id,
        code: order.code,
        state,
        totalMinor: order.totalMinor,
        currency: order.currency,
        waitingSince: order.updatedAt.toISO(),
        items: order.items.map((i) => ({ material: i.material, quantity: i.quantity })),
        offersTried: order.matchOffers.length,
        pendingOffer: pending
          ? {
              maker: makers.get(pending.manufacturerProfileId)?.label ?? null,
              expiresAt: pending.expiresAt.toISO(),
            }
          : null,
      }
    })
  }

  async forOrder(orderId: number) {
    const order = await Order.query()
      .where('id', orderId)
      .preload('items', (q) => q.preload('modelFile'))
      .preload('matchOffers', (q) => q.orderBy('id', 'desc'))
      .firstOrFail()

    const city = this.orders.decryptShippingAddress(order)?.city ?? null
    const open = ['matching', 'unmatched'].includes(order.status)
    const pending = order.matchOffers.find((m) => m.status === 'pending') ?? null

    const candidates = open
      ? await this.eligibility.findCandidates(order, {
          excludeManufacturerIds: order.matchOffers.map((m) => m.manufacturerProfileId),
          buyerCity: city,
        })
      : []
    const makers = await this.makersById([
      ...candidates.map((c) => c.manufacturerProfileId),
      ...order.matchOffers.map((m) => m.manufacturerProfileId),
    ])
    const printers = await Printer.query()
      .whereIn(
        'id',
        candidates.map((c) => c.printerId)
      )
      .select('id', 'name')
    const printerName = new Map(printers.map((p) => [p.id, p.name]))

    const suggestions = candidates
      .map((c) => {
        const parts = scoreParts(c)
        return {
          manufacturerProfileId: c.manufacturerProfileId,
          maker: makers.get(c.manufacturerProfileId)!,
          printer: printerName.get(c.printerId) ?? `#${c.printerId}`,
          earliestSlot: c.slotDate,
          score: parts.total,
          parts: {
            quality: parts.quality,
            onTime: parts.onTime,
            distance: parts.distance,
            load: parts.load,
          },
          stats: {
            completedJobs: c.completedJobs,
            avgRating: c.avgRating,
            onTimeRate: c.onTimeRate,
            disputeRate: c.disputeRate,
            activeJobs: c.activeJobs,
            sameCity: c.sameCity,
          },
          isNewMaker: isInExplorationPool(c, fabrmatchConfig.matching),
        }
      })
      .sort((a, b) => b.score - a.score || a.manufacturerProfileId - b.manufacturerProfileId)

    // everyone else, with the rules they fail — closest to eligible first
    const candidateIds = new Set(candidates.map((c) => c.manufacturerProfileId))
    const offeredStatuses = new Map<number, string>()
    for (const m of [...order.matchOffers].reverse())
      offeredStatuses.set(m.manufacturerProfileId, m.status)
    const verdicts = open
      ? await new EligibilityExplainer().explain(order, { offeredStatuses })
      : []
    const blockers = (v: (typeof verdicts)[number]) =>
      v.reasons.length +
      Math.min(...v.printers.map((p) => p.reasons.length), v.printers.length ? Infinity : 0)
    const notEligible = verdicts
      .filter((v) => !candidateIds.has(v.manufacturerProfileId))
      .sort(
        (a, b) => blockers(a) - blockers(b) || a.manufacturerProfileId - b.manufacturerProfileId
      )

    return {
      order: {
        id: order.id,
        code: order.code,
        status: order.status,
        totalMinor: order.totalMinor,
        currency: order.currency,
        requiredTrustTier: order.requiredTrustTier,
        shipCity: city,
        shipCountry: order.shipCountry,
        items: order.items.map((i) => ({
          fileName: i.modelFile.originalName,
          material: i.material,
          color: i.color,
          quantity: i.quantity,
          technology: i.technology,
          estPrintMinutes: i.estPrintMinutes,
          sizeMm: [i.modelFile.bboxXMm, i.modelFile.bboxYMm, i.modelFile.bboxZMm].map((d) =>
            d === null ? null : Math.round((d * (i.scalePercent ?? 100)) / 100)
          ),
          finishing: i.finishingName,
        })),
      },
      canOffer: open && !pending,
      // manual mode lets the admin pick a maker who misses rules (never a hard blocker)
      canOverride: open && !pending && !MatchingService.autoOffer(),
      pendingOffer: pending
        ? {
            maker: makers.get(pending.manufacturerProfileId)!,
            expiresAt: pending.expiresAt.toISO(),
          }
        : null,
      suggestions,
      notEligible,
      history: order.matchOffers.map((m) => ({
        id: m.id,
        round: m.round,
        status: m.status,
        maker: makers.get(m.manufacturerProfileId)!,
        createdAt: m.createdAt.toISO(),
        respondedAt: m.respondedAt?.toISO() ?? null,
      })),
      productionSlaDays: await productionDaysFor(order.items),
      offerTtlMinutes: fabrmatchConfig.matching.offerTtlMinutes,
    }
  }

  private async makersById(ids: number[]) {
    const unique = [...new Set(ids)]
    if (unique.length === 0) return new Map<number, MakerSummary>()
    const profiles = await ManufacturerProfile.query().whereIn('id', unique).preload('user')
    return new Map(
      profiles.map((p) => [
        p.id,
        {
          id: p.id,
          alias: p.publicAlias,
          name: p.user.fullName,
          city: p.city,
          trustTier: p.trustTier,
          label: `${p.publicAlias} · ${p.user.fullName}`,
        },
      ])
    )
  }
}

interface MakerSummary {
  id: number
  alias: string
  name: string | null
  city: string | null
  trustTier: number
  label: string
}
