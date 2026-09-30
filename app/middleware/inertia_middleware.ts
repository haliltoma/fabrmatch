import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import UserTransformer from '#transformers/user_transformer'
import { requestLocale } from '#services/i18n/request_locale'
import { BASE_CURRENCY } from '#services/pricing/fx'
import FxService from '#services/pricing/fx_service'
import { CURRENCY_COOKIE, pickDisplayCurrency } from '#services/pricing/display_currency'
import { translateValidationErrors } from '#services/i18n/validation_messages'
import env from '#start/env'
import { featureEnabled } from '#services/settings/feature_flags'
import CartService from '#services/orders/cart_service'
import NotificationService from '#services/notifications/notification_service'
import SellerProfile from '#models/seller_profile'
import AttentionService from '#services/admin/attention_service'
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware'

export default class InertiaMiddleware extends BaseInertiaMiddleware {
  async share(ctx: HttpContext) {
    const { auth } = ctx as Partial<HttpContext>

    let userData: ReturnType<typeof UserTransformer.transform> | undefined
    if (auth?.user) {
      await auth.user.load('roles')
      userData = UserTransformer.transform(auth.user)
    }

    const unread = auth?.user ? await new NotificationService().unreadCount(auth.user.id) : 0

    const cartCount = auth?.user ? await new CartService().count(auth.user.id) : 0

    // a buyer holds the seller role without a shop; their menu has no seller dashboard to open
    const hasShop =
      !!auth?.user &&
      auth.user.roleNames.includes('seller') &&
      !!(await SellerProfile.query().where('userId', auth.user.id).select('id').first())

    // admin menu badges and the dashboard to-do list; only admins on admin pages pay for it
    const adminAttention =
      auth?.user?.roleNames.includes('admin') && ctx.request.url().startsWith('/admin')
        ? await new AttentionService().summary()
        : null

    const locale = requestLocale(ctx)

    // browse prices are shown in the visitor's currency; charges stay in TRY (P1)
    const rates = await new FxService().displayRates()
    const display = pickDisplayCurrency({
      available: [BASE_CURRENCY, ...Object.keys(rates)],
      locale,
      cookie: ctx.request.plainCookie(CURRENCY_COOKIE),
      edgeCountry: ctx.request.header('cf-ipcountry'),
      acceptLanguage: ctx.request.header('accept-language'),
    })

    return {
      locale: ctx.inertia.always(locale),
      money: ctx.inertia.always({ display, charge: BASE_CURRENCY, rates }),
      cartCount: ctx.inertia.always(cartCount),
      rfqEnabled: featureEnabled('rfq'),
      externalStoresEnabled: featureEnabled('externalStores'),
      referralsEnabled: featureEnabled('referrals'),
      siteUrl: env.get('APP_URL').replace(/\/$/, ''),
      legalAcceptanceRequired: env.get('LEGAL_ACCEPTANCE_REQUIRED', false),
      errors: ctx.inertia.always(translateValidationErrors(locale, this.getValidationErrors(ctx))),
      user: ctx.inertia.always(userData),
      hasShop: ctx.inertia.always(hasShop),
      unreadNotifications: ctx.inertia.always(unread),
      adminAttention: ctx.inertia.always(adminAttention),
    }
  }

  flash(ctx: HttpContext) {
    const { session } = ctx as Partial<HttpContext>

    return {
      error: session?.flashMessages.get('error') as string | undefined,
      success: session?.flashMessages.get('success') as string | undefined,
    }
  }

  async handle(ctx: HttpContext, next: NextFn) {
    await this.init(ctx)

    const output = await next()
    this.dispose(ctx)

    return output
  }
}

declare module '@adonisjs/inertia/types' {
  type MiddlewareSharedProps = InferSharedProps<InertiaMiddleware>
  export interface SharedProps extends MiddlewareSharedProps {}
}
