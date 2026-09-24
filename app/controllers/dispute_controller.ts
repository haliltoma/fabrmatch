import type { HttpContext } from '@adonisjs/core/http'
import DisputeService from '#services/disputes/dispute_service'
import MakerWorkService from '#services/manufacturing/maker_work_service'
import {
  evidenceUploadValidator,
  openDisputeValidator,
  registerEvidenceValidator,
  respondDisputeValidator,
} from '#validators/order'

/** Buyer- and manufacturer-side dispute actions (admin decisions live in AdminDispute). */
export default class DisputeController {
  async open({ request, auth, params, response, session }: HttpContext) {
    const { reason } = await request.validateUsing(openDisputeValidator)
    await new DisputeService().open(params.id, auth.getUserOrFail().id, reason)
    session.flash('success', 'Dispute opened. Payment is on hold until it is resolved.')
    return response.redirect().back()
  }

  async uploadUrl({ request, auth, params, response }: HttpContext) {
    const { contentType } = await request.validateUsing(evidenceUploadValidator)
    const result = await new DisputeService().presignEvidenceUpload(
      params.id,
      auth.getUserOrFail().id,
      contentType
    )
    return response.json(result)
  }

  async addEvidence({ request, auth, params, response, session }: HttpContext) {
    const data = await request.validateUsing(registerEvidenceValidator)
    await new DisputeService().addEvidence(params.id, auth.getUserOrFail().id, data)
    if (request.accepts(['html', 'json']) === 'json') return response.json({ ok: true })
    session.flash('success', 'Photo added.')
    return response.redirect().back()
  }

  /** Manufacturer's written answer (manufacturer role only, see routes). */
  async respond({ request, auth, params, response, session }: HttpContext) {
    const { response: text } = await request.validateUsing(respondDisputeValidator)
    const profile = await new MakerWorkService().profileFor(auth.getUserOrFail())
    await new DisputeService().respond(params.id, profile.id, text)
    session.flash('success', 'Response sent.')
    return response.redirect().back()
  }
}
