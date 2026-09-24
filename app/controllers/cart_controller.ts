import type { HttpContext } from '@adonisjs/core/http'
import LegalService from '#services/legal/legal_service'
import PrintProfileService from '#services/catalog/print_profile_service'
import FinishingService from '#services/catalog/finishing_service'
import FxService from '#services/pricing/fx_service'
import CartService from '#services/orders/cart_service'
import { cartAddValidator, cartCheckoutValidator, cartQuantityValidator } from '#validators/order'

export default class CartController {
  async show({ inertia, auth, request }: HttpContext) {
    const country = String(request.input('country', 'TR')).toUpperCase().slice(0, 2)
    const currency = String(request.input('currency', 'TRY')).toUpperCase().slice(0, 3)
    const couponCode = String(request.input('coupon', '')).trim().slice(0, 40)
    const fx = new FxService()
    const [preview, profiles] = await Promise.all([
      new CartService().preview(auth.getUserOrFail(), country, currency, couponCode || undefined),
      new PrintProfileService().list(),
    ])
    const names = new Map(profiles.map((p) => [p.id, p.name]))
    const allFinishings = await new FinishingService().list()
    const finishingNames = new Map(allFinishings.map((f) => [f.code, f.name]))
    return inertia.render('cart/index', {
      country,
      currency,
      currencies: fx.enabledCurrencies(),
      couponCode,
      couponProblem: preview.couponProblem,
      problem: preview.problem,
      eta: preview.eta,
      totals: preview.totals,
      lines: preview.lines.map((l) => ({
        ...l,
        profileName: l.printProfileId ? (names.get(l.printProfileId) ?? null) : null,
        finishingName: l.finishing ? (finishingNames.get(l.finishing) ?? l.finishing) : null,
      })),
    })
  }

  async add({ request, response, auth, session }: HttpContext) {
    const data = await request.validateUsing(cartAddValidator)
    await new CartService().add(auth.getUserOrFail(), data)
    session.flash('success', 'Added to your cart.')
    return response.redirect().toPath('/cart')
  }

  async update({ request, response, auth, params }: HttpContext) {
    const { quantity } = await request.validateUsing(cartQuantityValidator)
    await new CartService().setQuantity(auth.getUserOrFail(), Number(params.id), quantity)
    return response.redirect().toPath('/cart')
  }

  async remove({ response, auth, params }: HttpContext) {
    await new CartService().remove(auth.getUserOrFail(), Number(params.id))
    return response.redirect().toPath('/cart')
  }

  async checkout({ request, response, auth }: HttpContext) {
    const { shippingAddress, acceptTerms, currency, couponCode } =
      await request.validateUsing(cartCheckoutValidator)
    await new LegalService().requireAcceptance(auth.getUserOrFail().id, acceptTerms)
    const order = await new CartService().checkout(
      auth.getUserOrFail(),
      shippingAddress,
      currency,
      couponCode
    )
    return response.redirect().toRoute('order.show', { id: order.id })
  }
}
