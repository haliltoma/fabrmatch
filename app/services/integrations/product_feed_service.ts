import { createHash, randomBytes } from 'node:crypto'
import DomainError from '#exceptions/domain_error'
import SellerProfile from '#models/seller_profile'
import User from '#models/user'
import EncryptionService from '#services/identity/encryption_service'
import ApiCatalogService from '#services/integrations/api_catalog_service'
import { decimalPrice, fabrmatchSku } from '#services/integrations/stores/store_adapter'
import { validateWebhookUrl } from '#services/integrations/webhook_url'
import env from '#start/env'

export class FeedError extends DomainError {}

const TOKEN_PREFIX = 'fmf_'
const hash = (token: string) => createHash('sha256').update(token).digest('hex')

export const FEED_COLUMNS = [
  'id',
  'item_group_id',
  'title',
  'description',
  'link',
  'image_link',
  'additional_image_link',
  'price',
  'availability',
  'condition',
  'material',
  'size',
  'color',
  'brand',
] as const

export type FeedRow = Record<(typeof FEED_COLUMNS)[number], string>

/**
 * W5: the seller's products as a feed any site or marketplace can import (Google Merchant
 * columns): one row per material × size, the suggested price (cost + the seller's margin), our
 * pictures and a link to the product on the seller's own site. Behind a secret, rotatable URL.
 */
export default class ProductFeedService {
  private encryption = new EncryptionService()

  /** A new secret (the old address stops working at once). */
  async rotate(profile: SellerProfile): Promise<string> {
    const token = `${TOKEN_PREFIX}${randomBytes(24).toString('hex')}`
    profile.feedTokenHash = hash(token)
    profile.feedTokenEnc = this.encryption.encrypt(token)
    await profile.save()
    return token
  }

  async turnOff(profile: SellerProfile) {
    profile.feedTokenHash = null
    profile.feedTokenEnc = null
    await profile.save()
  }

  /** The current secret, for showing the feed address in the panel. */
  token(profile: SellerProfile): string | null {
    return profile.feedTokenEnc ? this.encryption.decrypt(profile.feedTokenEnc) : null
  }

  /** `https://…/products/{id}`: checked like a webhook URL (https, public host). */
  async setLinkTemplate(profile: SellerProfile, template: string | null) {
    const value = template?.trim() || null
    if (value) {
      if (!value.includes('{id}')) throw new FeedError('Put {id} where the product id goes')
      try {
        validateWebhookUrl(value.replaceAll('{id}', 'x'), { allowHttp: false })
      } catch {
        throw new FeedError('Use a public https address')
      }
    }
    profile.feedLinkTemplate = value
    await profile.save()
  }

  /** The seller behind a feed token, or null (unknown, rotated, suspended). */
  async sellerFor(token: string): Promise<{ seller: User; profile: SellerProfile } | null> {
    if (!token.startsWith(TOKEN_PREFIX) || token.length > 100) return null
    const profile = await SellerProfile.query().where('feedTokenHash', hash(token)).first()
    if (!profile || profile.status === 'suspended') return null
    const seller = await User.find(profile.userId)
    if (!seller || seller.suspendedAt) return null
    return { seller, profile }
  }

  async rows(seller: User, profile: SellerProfile): Promise<FeedRow[]> {
    const base = env.get('APP_URL').replace(/\/$/, '')
    const views = await new ApiCatalogService().list(seller)
    const rows: FeedRow[] = []
    for (const view of views) {
      const { product } = view
      if (product.status !== 'active') continue
      const link = profile.feedLinkTemplate
        ? profile.feedLinkTemplate.replaceAll('{id}', encodeURIComponent(product.id))
        : product.shopListed
          ? `${base}/shop/${product.id}`
          : ''
      const pictures = view.images.filter((i) => i.color === null).map((i) => i.url)
      for (const variant of view.variants) {
        if (variant.suggestedPriceMinor === null) continue
        rows.push({
          id: fabrmatchSku(product.id, variant.material, null, variant.scalePercent),
          item_group_id: product.id,
          title: product.title,
          description: product.description ?? product.title,
          link,
          image_link: pictures[0] ?? '',
          additional_image_link: pictures.slice(1, 10).join(','),
          price: `${decimalPrice(variant.suggestedPriceMinor)} TRY`,
          availability: 'in_stock',
          condition: 'new',
          material: variant.material,
          size: variant.size,
          // the buyer picks the colour; Google wants the item's own colour, so none is claimed
          color: '',
          brand: profile.brandName ?? profile.businessName,
        })
      }
    }
    return rows
  }

  toCsv(rows: FeedRow[]): string {
    const cell = (value: string) => {
      // a spreadsheet must never run a cell as a formula
      const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
      return /[",\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
    }
    return [
      FEED_COLUMNS.join(','),
      ...rows.map((r) => FEED_COLUMNS.map((c) => cell(r[c])).join(',')),
    ].join('\r\n')
  }
}
