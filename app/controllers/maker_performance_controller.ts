import type { HttpContext } from '@adonisjs/core/http'
import MakerWorkService from '#services/manufacturing/maker_work_service'
import MakerScorecardService from '#services/manufacturing/maker_scorecard_service'
import { sendStatement, statementMonthValidator } from '#services/reports/statement_response'
import EarningsService from '#services/payments/earnings_service'

export default class MakerPerformanceController {
  async scorecard({ inertia, auth }: HttpContext) {
    const profile = await new MakerWorkService().profileFor(auth.getUserOrFail())
    return inertia.render('maker/performance', {
      alias: profile.publicAlias,
      scorecard: await new MakerScorecardService().forProfile(profile),
    })
  }

  async earnings({ inertia, auth, request }: HttpContext) {
    const profile = await new MakerWorkService().profileFor(auth.getUserOrFail())
    const earnings = new EarningsService()
    const { rows, meta } = await earnings.list('manufacturer', profile.id, {
      page: request.input('page'),
    })
    return inertia.render('maker/earnings', {
      totals: await earnings.summary('manufacturer', profile.id),
      payouts: rows,
      meta,
    })
  }

  /** The maker's own payouts for a month as CSV: order codes and amounts only. */
  async statement({ request, response, auth }: HttpContext) {
    const { month } = await request.validateUsing(statementMonthValidator)
    const profile = await new MakerWorkService().profileFor(auth.getUserOrFail())
    return sendStatement(response, month, { type: 'manufacturer', beneficiaryId: profile.id })
  }
}
