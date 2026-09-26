import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import CartItem from '#models/cart_item'
import ManufacturerProfile from '#models/manufacturer_profile'
import MatchOffer from '#models/match_offer'
import Order from '#models/order'
import SellerProfile from '#models/seller_profile'
import type User from '#models/user'
import RoleService from '#services/identity/role_service'

export const INTENDED_URL = 'intendedUrl'

/**
 * Where a signed-in user should land: the one page with their next useful action, never an empty
 * dead end. Work that expires (a maker's open offer) beats setup, setup beats the overview, and a
 * buyer with a full cart goes back to it (`docs/marketing.md §4.2` activation).
 */
export default class LandingService {
  async homeFor(user: User): Promise<string> {
    const roles = await new RoleService().getUserRoles(user)
    if (roles.length === 0) return '/onboarding'
    if (roles.includes('admin')) return '/admin'

    const maker = roles.includes('manufacturer')
      ? await ManufacturerProfile.findBy('userId', user.id)
      : null
    if (maker && (await this.hasOpenOffers(maker.id))) return '/maker/work'

    if (roles.includes('seller')) {
      const seller = await SellerProfile.findBy('userId', user.id)
      if (seller) return '/seller'
      if (!maker) return this.buyerHome(user)
    }

    // the maker overview holds the setup checklist until it is done, then earnings and jobs;
    // without a profile yet the profile middleware there sends them to finish it
    if (roles.includes('manufacturer')) return '/maker'
    return '/'
  }

  /** Buyer without a shop: an abandoned cart first, then their orders, else the quote flow. */
  private async buyerHome(user: User): Promise<string> {
    if (await CartItem.query().where('userId', user.id).first()) return '/cart'
    if (await Order.query().where('buyerId', user.id).first()) return '/orders'
    return '/files'
  }

  private async hasOpenOffers(manufacturerProfileId: number): Promise<boolean> {
    const offer = await MatchOffer.query()
      .where('manufacturerProfileId', manufacturerProfileId)
      .where('status', 'pending')
      .where('expiresAt', '>', DateTime.now().toSQL()!)
      .first()
    return !!offer
  }
}

/**
 * Only same-site paths are followed back after sign-in, so `?next=https://evil` or `//evil`
 * cannot turn the login page into an open redirect.
 */
export function safeIntendedUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return null
  if (value.includes('\\') || /^\/(login|signup|logout|forgot-password|reset-password)/.test(value))
    return null
  return value
}

/** After sign-in, sign-up or verification: back to the page they wanted, else their landing page. */
export async function redirectAfterSignIn(ctx: HttpContext, user: User) {
  const intended = safeIntendedUrl(ctx.session.pull(INTENDED_URL))
  return ctx.response.redirect().toPath(intended ?? (await new LandingService().homeFor(user)))
}
