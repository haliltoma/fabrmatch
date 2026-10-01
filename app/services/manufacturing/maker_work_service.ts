import { DateTime } from 'luxon'
import MatchOffer from '#models/match_offer'
import ProductionJob from '#models/production_job'
import ManufacturerProfile from '#models/manufacturer_profile'
import type User from '#models/user'

export default class MakerWorkService {
  async profileFor(user: User): Promise<ManufacturerProfile> {
    return ManufacturerProfile.query().where('userId', user.id).firstOrFail()
  }

  async pendingOffers(manufacturerProfileId: string): Promise<MatchOffer[]> {
    return MatchOffer.query()
      .where('manufacturerProfileId', manufacturerProfileId)
      .where('status', 'pending')
      .where('expiresAt', '>', DateTime.now().toSQL()!)
      .preload('order', (q) => q.preload('items', (i) => i.preload('modelFile')))
      .orderBy('expiresAt', 'asc')
  }

  async jobs(manufacturerProfileId: string): Promise<ProductionJob[]> {
    return ProductionJob.query()
      .where('manufacturerProfileId', manufacturerProfileId)
      .preload('order', (q) =>
        q
          .preload('items', (i) => i.preload('modelFile'))
          .preload('productionJobs')
          .preload('disputes', (d) => d.preload('evidence'))
      )
      .preload('grants')
      .preload('qcPhotos')
      .orderByRaw(
        `case status when 'accepted' then 0 when 'printing' then 1 when 'produced' then 2 when 'shipped' then 3 else 4 end`
      )
      .orderBy('dueAt', 'asc')
  }
}
