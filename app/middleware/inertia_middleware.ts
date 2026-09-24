import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import UserTransformer from '#transformers/user_transformer'
import { LOCALE_COOKIE, pickLocale } from '#services/i18n/locale'
import { translateValidationErrors } from '#services/i18n/validation_messages'
import env from '#start/env'
import { featureEnabled } from '#services/settings/feature_flags'
import CartService from '#services/orders/cart_service'
import NotificationService from '#services/notifications/notification_service'
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

    const locale = pickLocale(
      ctx.request.plainCookie(LOCALE_COOKIE),
      ctx.request.header('accept-language')
    )

    return {
      locale: ctx.inertia.always(locale),
      cartCount: ctx.inertia.always(cartCount),
      rfqEnabled: featureEnabled('rfq'),
      referralsEnabled: featureEnabled('referrals'),
      siteUrl: env.get('APP_URL').replace(/\/$/, ''),
      legalAcceptanceRequired: env.get('LEGAL_ACCEPTANCE_REQUIRED', false),
      errors: ctx.inertia.always(translateValidationErrors(locale, this.getValidationErrors(ctx))),
      user: ctx.inertia.always(userData),
      unreadNotifications: ctx.inertia.always(unread),
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
