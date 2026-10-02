import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import AuditLog from '#models/audit_log'
import StoreConnection from '#models/store_connection'
import type User from '#models/user'
import {
  StoreApiError,
  StoreWebhookSignatureError,
} from '#services/integrations/stores/store_adapter'
import { storeAdapter } from '#services/integrations/stores/store_registry'
import StoreService from '#services/integrations/stores/store_service'
import {
  parseSignedInstance,
  readWixWebhook,
  wixConfigured,
  wixWebhookInstanceId,
} from '#services/integrations/stores/wix_adapter'

/** A signed instance older than this is not accepted for connecting (a copied link). */
const INSTANCE_MAX_AGE_MS = 60 * 60 * 1000

/**
 * Wix sites as seller shops (Paket V, V8). The seller adds our app to their site; opening it from
 * their Wix dashboard brings them to `/seller/stores/wix/connect?instance=…`, signed by Wix with
 * our app secret, and the site is connected to the signed-in seller. Every site's webhooks come
 * to one address and are routed by the site's app instance.
 */
export default class WixConnectService {
  private stores = new StoreService()

  async connect(seller: User, signedInstance: string | undefined) {
    if (!wixConfigured()) throw new StoreApiError('Wix is not set up on Fabrmatch yet')
    const instance = parseSignedInstance(signedInstance, env.get('WIX_APP_SECRET')!.release())
    if (!instance) {
      throw new StoreApiError('Open Fabrmatch from your Wix dashboard to connect your site')
    }
    if (instance.signedAt && Date.now() - instance.signedAt.getTime() > INSTANCE_MAX_AGE_MS) {
      throw new StoreApiError(
        'This Wix link has expired; open Fabrmatch from your Wix dashboard again'
      )
    }

    const existing = await StoreConnection.query()
      .where('provider', 'wix')
      .where('externalShopId', instance.instanceId)
      .first()
    if (existing && existing.sellerUserId !== seller.id) {
      throw new StoreApiError('This site is already connected to another Fabrmatch account')
    }
    const connection = existing ?? new StoreConnection()
    connection.merge({
      sellerUserId: seller.id,
      provider: 'wix',
      externalShopId: instance.instanceId,
      shopName: connection.shopName ?? 'Wix site',
      status: 'active',
    })
    const shop = await storeAdapter('wix').verify(connection)
    connection.shopName = shop.shopName.slice(0, 200)
    connection.currency = shop.currency?.slice(0, 3) ?? null
    await connection.save()
    await AuditLog.create({
      actorId: seller.id,
      action: 'store.connected',
      subjectType: 'store_connection',
      subjectId: connection.id,
      meta: { provider: 'wix', shop: instance.instanceId },
    })
    await this.stores.syncListings(seller, connection.id)
    return connection
  }

  /**
   * One webhook address for every site. Orders go to the site's connection (the adapter checks
   * the signature); our app removed from a site disconnects it. Unknown sites are ignored.
   */
  async receiveWebhook(rawBody: string) {
    const instanceId = wixWebhookInstanceId(rawBody)
    if (!instanceId) throw new StoreWebhookSignatureError()
    const connection = await StoreConnection.query()
      .where('provider', 'wix')
      .where('externalShopId', instanceId)
      .where('status', 'active')
      .first()
    if (!connection) return { ignored: true as const }

    const publicKey = env.get('WIX_PUBLIC_KEY')
    const webhook = publicKey ? readWixWebhook(rawBody, publicKey.replaceAll('\\n', '\n')) : null
    if (!webhook) throw new StoreWebhookSignatureError()
    if (webhook.eventType === 'AppRemoved') {
      connection.merge({ status: 'disconnected', accessTokenEnc: null })
      await connection.save()
      await AuditLog.create({
        actorId: null,
        action: 'store.disconnected',
        subjectType: 'store_connection',
        subjectId: connection.id,
        meta: { provider: 'wix', reason: 'app removed in Wix' },
      })
      logger.info({ msg: 'wix app removed', connectionId: connection.id })
      return { ignored: true as const }
    }
    return this.stores.receiveOrderWebhook(connection.id, rawBody, {})
  }
}
