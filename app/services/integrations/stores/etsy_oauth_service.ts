import { createHash, randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import env from '#start/env'
import AuditLog from '#models/audit_log'
import StoreConnection from '#models/store_connection'
import type User from '#models/user'
import EncryptionService from '#services/identity/encryption_service'
import type EtsyAdapter from '#services/integrations/stores/etsy_adapter'
import {
  ETSY_SCOPES,
  etsyConfigured,
  exchangeToken,
} from '#services/integrations/stores/etsy_adapter'
import { StoreApiError } from '#services/integrations/stores/store_adapter'
import type { StoreHttp } from '#services/integrations/stores/store_http'
import { storeAdapter } from '#services/integrations/stores/store_registry'

export interface PkceState {
  state: string
  verifier: string
}

const base64url = (bytes: Buffer) => bytes.toString('base64url')

/**
 * "Connect with Etsy" (OAuth2 authorization code + PKCE, developers.etsy.com). The state and the
 * code verifier live in the seller's session between the redirect and the callback.
 */
export default class EtsyOAuthService {
  private encryption = new EncryptionService()

  private http: StoreHttp
  private adapter: EtsyAdapter

  /** Defaults to the registered Etsy adapter (and its transport), so tests can swap both. */
  constructor(http?: StoreHttp, adapter?: EtsyAdapter) {
    this.adapter = adapter ?? (storeAdapter('etsy') as EtsyAdapter)
    this.http = http ?? this.adapter.transport
  }

  callbackUrl() {
    return `${env.get('APP_URL').replace(/\/$/, '')}/seller/stores/etsy/callback`
  }

  /** Where to send the seller, and what to keep in their session until they come back. */
  start(): { url: string; pkce: PkceState } {
    if (!etsyConfigured()) throw new StoreApiError('Etsy is not set up on Fabrmatch yet')
    const verifier = base64url(randomBytes(48))
    const state = base64url(randomBytes(24))
    const challenge = base64url(createHash('sha256').update(verifier).digest())
    const url = new URL('https://www.etsy.com/oauth/connect')
    url.search = new URLSearchParams({
      response_type: 'code',
      redirect_uri: this.callbackUrl(),
      scope: ETSY_SCOPES.join(' '),
      client_id: env.get('ETSY_KEYSTRING')!,
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    }).toString()
    return { url: url.toString(), pkce: { state, verifier } }
  }

  /** Back from Etsy: check the state, trade the code for tokens, find the shop, store it. */
  async finish(
    seller: User,
    query: { code?: string; state?: string; error?: string },
    pkce: PkceState | null
  ) {
    if (query.error) throw new StoreApiError('Etsy access was not granted')
    if (!pkce || !query.state || query.state !== pkce.state || !query.code) {
      throw new StoreApiError('The Etsy connection expired; start again')
    }
    const tokens = await exchangeToken(this.http, {
      grant_type: 'authorization_code',
      client_id: env.get('ETSY_KEYSTRING')!,
      redirect_uri: this.callbackUrl(),
      code: query.code,
      code_verifier: pkce.verifier,
    })
    const probe = new StoreConnection().merge({
      sellerUserId: seller.id,
      provider: 'etsy',
      shopName: 'Etsy',
      externalShopId: '0',
      accessTokenEnc: this.encryption.encrypt(tokens.access_token),
      refreshTokenEnc: this.encryption.encrypt(tokens.refresh_token),
      tokenExpiresAt: DateTime.now().plus({ seconds: tokens.expires_in }),
      status: 'active',
    })
    const me = await this.adapter.me(probe)
    if (!me.shop_id) throw new StoreApiError('This Etsy account has no shop')

    const existing = await StoreConnection.query()
      .where('provider', 'etsy')
      .where('externalShopId', String(me.shop_id))
      .first()
    if (existing && existing.sellerUserId !== seller.id) {
      throw new StoreApiError('This shop is already connected to another Fabrmatch account')
    }
    const connection = existing ?? new StoreConnection()
    connection.merge({
      sellerUserId: seller.id,
      provider: 'etsy',
      externalShopId: String(me.shop_id),
      shopUrl: `https://www.etsy.com/shop/${me.shop_id}`,
      shopName: connection.shopName ?? 'Etsy shop',
      accessTokenEnc: probe.accessTokenEnc,
      refreshTokenEnc: probe.refreshTokenEnc,
      tokenExpiresAt: probe.tokenExpiresAt,
      status: 'active',
      ordersPolledAt: connection.ordersPolledAt ?? DateTime.now(),
    })
    const shop = await this.adapter.verify(connection)
    connection.shopName = shop.shopName.slice(0, 200)
    connection.currency = shop.currency?.slice(0, 3) ?? null
    await connection.save()
    await AuditLog.create({
      actorId: seller.id,
      action: 'store.connected',
      subjectType: 'store_connection',
      subjectId: connection.id,
      meta: { provider: 'etsy', shop: String(me.shop_id) },
    })
    return connection
  }
}
