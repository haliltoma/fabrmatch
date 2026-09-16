import { intakeProductionRequest } from '#services/production_request_intake'
import { createProductionRequestValidator } from '#validators/production_request'
import type { HttpContext } from '@adonisjs/core/http'

export default class ProductionRequestsApiController {
  /** POST /api/v1/production-requests — Akış 1 (docs/09-API-SOZLESMESI.md) */
  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createProductionRequestValidator)

    if (request.header('idempotency-key') !== payload.sistem_a_line_item_ref) {
      return response.unprocessableEntity({
        errors: [{ field: 'Idempotency-Key', message: 'Idempotency-Key must equal sistem_a_line_item_ref' }],
      })
    }

    const { request: productionRequest, created } = await intakeProductionRequest(payload)
    return response.status(created ? 201 : 200).json({
      production_request_id: productionRequest.publicId,
      status: productionRequest.status,
    })
  }
}
