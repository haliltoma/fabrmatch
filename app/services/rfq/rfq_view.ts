import ManufacturerProfile from '#models/manufacturer_profile'
import type Rfq from '#models/rfq'
import RfqBid from '#models/rfq_bid'
import MakerStatsService from '#services/manufacturing/maker_stats_service'

export interface BuyerBidView {
  id: number
  /** "Offer 1", "Offer 2"… — stable within this request, never the maker's alias or name */
  label: string
  unitPriceMinor: number
  leadDays: number
  note: string | null
  status: RfqBid['status']
  trustTier: number
  avgRating: number | null
  completedJobs: number
}

/**
 * What a buyer may know about the bids on their request: price, delivery time, note and a track
 * record — nothing that identifies the maker (business rule 1).
 */
export async function bidsForBuyer(rfq: Rfq): Promise<BuyerBidView[]> {
  const bids = await RfqBid.query()
    .where('rfqId', rfq.id)
    .whereIn('status', ['active', 'won'])
    .orderBy('id', 'asc')
  if (bids.length === 0) return []
  const makerIds = bids.map((b) => b.manufacturerProfileId)
  const [stats, profiles] = await Promise.all([
    new MakerStatsService().load(makerIds),
    ManufacturerProfile.query().whereIn('id', makerIds),
  ])
  const tiers = new Map(profiles.map((p) => [p.id, p.trustTier]))
  return bids.map((b, i) => ({
    id: b.id,
    label: `Offer ${i + 1}`,
    unitPriceMinor: b.unitPriceMinor,
    leadDays: b.leadDays,
    note: b.note,
    status: b.status,
    trustTier: tiers.get(b.manufacturerProfileId) ?? 0,
    avgRating: stats.get(b.manufacturerProfileId)?.avgRating ?? null,
    completedJobs: stats.get(b.manufacturerProfileId)?.completed ?? 0,
  }))
}
