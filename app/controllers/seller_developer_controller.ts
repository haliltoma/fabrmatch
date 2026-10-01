import type { HttpContext } from '@adonisjs/core/http'
import ApiKeyService from '#services/integrations/api_key_service'
import WebhookService from '#services/integrations/webhook_service'
import { apiKeyValidator, webhookEndpointValidator } from '#validators/developer'

const BACK = '/seller/developers'

export default class SellerDeveloperController {
  async index({ inertia, auth, session }: HttpContext) {
    const userId = auth.getUserOrFail().id
    const webhooks = new WebhookService()
    const [keys, endpoints, deliveries] = await Promise.all([
      new ApiKeyService().list(userId),
      webhooks.listEndpoints(userId),
      webhooks.recentDeliveries(userId),
    ])
    return inertia.render('seller/developers', {
      keys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        lastUsedAt: k.lastUsedAt?.toISO() ?? null,
        revoked: !!k.revokedAt,
        createdAt: k.createdAt.toISO()!,
      })),
      endpoints: endpoints.map((e) => ({
        id: e.id,
        url: e.url,
        isActive: e.isActive,
        disabledReason: e.disabledReason,
        consecutiveFailures: e.consecutiveFailures,
      })),
      deliveries: deliveries.map((d) => ({
        id: d.id,
        endpointId: d.endpointId,
        eventType: d.eventType,
        status: d.status,
        attempts: d.attempts,
        lastStatusCode: d.lastStatusCode,
        lastError: d.lastError,
        createdAt: d.createdAt.toISO()!,
      })),
      newApiKey: (session.flashMessages.get('newApiKey') as string | undefined) ?? null,
      newWebhookSecret:
        (session.flashMessages.get('newWebhookSecret') as
          { endpointId: string; secret: string } | undefined) ?? null,
    })
  }

  async createKey({ request, auth, session, response }: HttpContext) {
    const { name } = await request.validateUsing(apiKeyValidator)
    const { key } = await new ApiKeyService().create(auth.getUserOrFail().id, name)
    session.flash('newApiKey', key)
    session.flash('success', 'API key created. Copy it now — it will not be shown again.')
    return response.redirect().toPath(BACK)
  }

  async revokeKey({ params, auth, session, response }: HttpContext) {
    await new ApiKeyService().revoke(auth.getUserOrFail().id, params.id)
    session.flash('success', 'API key revoked.')
    return response.redirect().toPath(BACK)
  }

  async createWebhook({ request, auth, session, response }: HttpContext) {
    const { url } = await request.validateUsing(webhookEndpointValidator)
    const { endpoint, secret } = await new WebhookService().createEndpoint(
      auth.getUserOrFail().id,
      url
    )
    session.flash('newWebhookSecret', { endpointId: endpoint.id, secret })
    session.flash(
      'success',
      'Webhook added. Copy the signing secret now — it will not be shown again.'
    )
    return response.redirect().toPath(BACK)
  }

  async toggleWebhook({ params, request, auth, session, response }: HttpContext) {
    const active = request.input('active') === true || request.input('active') === 'true'
    await new WebhookService().setActive(auth.getUserOrFail().id, params.id, active)
    session.flash('success', active ? 'Webhook turned on.' : 'Webhook turned off.')
    return response.redirect().toPath(BACK)
  }

  async deleteWebhook({ params, auth, session, response }: HttpContext) {
    await new WebhookService().deleteEndpoint(auth.getUserOrFail().id, params.id)
    session.flash('success', 'Webhook deleted.')
    return response.redirect().toPath(BACK)
  }

  async testWebhook({ params, auth, session, response }: HttpContext) {
    await new WebhookService().sendTest(auth.getUserOrFail().id, params.id)
    session.flash('success', 'Test event queued. It is sent within a minute.')
    return response.redirect().toPath(BACK)
  }
}
