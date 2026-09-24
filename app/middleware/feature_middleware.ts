import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { featureEnabled, type FeatureName } from '#services/settings/feature_flags'

/** Answers 404 while the feature is off, so a hidden feature looks like it does not exist. */
export default class FeatureMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { name: FeatureName }) {
    if (!featureEnabled(options.name)) return ctx.response.notFound()
    return next()
  }
}
