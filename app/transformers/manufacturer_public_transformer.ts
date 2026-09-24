import type ManufacturerProfile from '#models/manufacturer_profile'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class ManufacturerPublicTransformer extends BaseTransformer<ManufacturerProfile> {
  toObject() {
    return {
      publicAlias: this.resource.publicAlias,
      trustTier: this.resource.trustTier,
      score: this.resource.score,
    }
  }
}
