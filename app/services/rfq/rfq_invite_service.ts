import db from '@adonisjs/lucid/services/db'
import fabrmatchConfig from '#config/fabrmatch'
import ManufacturerProfile from '#models/manufacturer_profile'
import ModelFile from '#models/model_file'
import Printer from '#models/printer'
import type Rfq from '#models/rfq'
import RfqInvite from '#models/rfq_invite'
import MakerStatsService from '#services/manufacturing/maker_stats_service'
import { fitsBuildVolume } from '#services/matching/eligibility_service'
import { bboxOf } from '#services/shipping/shipping_table'

/** Bids from more makers than this are hard to compare and dilute each maker's chance. */
export const MAX_INVITES = 10

export default class RfqInviteService {
  /**
   * Makers who could really make this job: active, approved, trusted enough, in the buyer's
   * country, not the buyer, with an active printer of the right technology that offers the material
   * (and colour) and fits the part. Price is NOT a filter — the bid is the price.
   */
  async candidates(rfq: Rfq): Promise<number[]> {
    const file = await ModelFile.findOrFail(rfq.modelFileId)
    const bbox = bboxOf(file)

    const printers = await Printer.query()
      .where('isActive', true)
      .where('technology', rfq.technology)
      .whereHas('manufacturerProfile', (q) => {
        q.where('status', 'active')
          .where('trustTier', '>=', rfq.requiredTrustTier)
          .where('country', rfq.shipCountry)
          .whereNot('userId', rfq.buyerId)
          .whereHas('user', (u) => u.whereNull('suspendedAt'))
      })
      .whereHas('materials', (m) => {
        m.whereRaw('upper(material) = ?', [rfq.material.toUpperCase()])
        if (rfq.color) m.whereRaw('colors::text ilike ?', [`%"${rfq.color.replaceAll('"', '')}"%`])
      })
      .orderBy('id', 'asc')

    const makers = new Set<number>()
    for (const printer of printers) {
      const build: [number, number, number] = [
        printer.buildVolumeXMm,
        printer.buildVolumeYMm,
        printer.buildVolumeZMm,
      ]
      if (bbox && !fitsBuildVolume(bbox, build)) continue
      makers.add(printer.manufacturerProfileId)
    }
    return [...makers]
  }

  /**
   * Invites up to MAX_INVITES makers. The discovery quota applies here too (business rule 3): when a
   * new maker qualifies, at least one is invited even if better-known makers would fill the list.
   */
  async invite(rfq: Rfq): Promise<Array<{ manufacturerProfileId: number; userId: number }>> {
    const ids = await this.candidates(rfq)
    if (ids.length === 0) return []

    const stats = await new MakerStatsService().load(ids)
    const cfg = fabrmatchConfig.matching
    const ranked = ids
      .map((id) => ({ id, s: stats.get(id) }))
      .map(({ id, s }) => ({
        id,
        completed: s?.completed ?? 0,
        rating: s?.avgRating ?? 0,
        isNew: (s?.completed ?? 0) <= cfg.explorationMaxCompletedJobs,
      }))
      .sort((a, b) => b.completed - a.completed || b.rating - a.rating || a.id - b.id)

    let chosen = ranked.slice(0, MAX_INVITES)
    const newcomers = ranked.filter((r) => r.isNew)
    if (cfg.explorationRate > 0 && newcomers.length > 0 && !chosen.some((c) => c.isNew)) {
      chosen = [...chosen.slice(0, MAX_INVITES - 1), newcomers[0]]
    }

    await db.table('rfq_invites').multiInsert(
      chosen.map((c) => ({
        rfq_id: rfq.id,
        manufacturer_profile_id: c.id,
        is_exploration: c.isNew,
        created_at: new Date(),
      }))
    )
    const profiles = await ManufacturerProfile.query().whereIn(
      'id',
      chosen.map((c) => c.id)
    )
    return profiles.map((p) => ({ manufacturerProfileId: p.id, userId: p.userId }))
  }

  async isInvited(rfqId: number, manufacturerProfileId: number): Promise<boolean> {
    const row = await RfqInvite.query()
      .where('rfqId', rfqId)
      .where('manufacturerProfileId', manufacturerProfileId)
      .first()
    return !!row
  }
}
