import '@adonisjs/inertia/types'

import type React from 'react'
import type { Prettify } from '@adonisjs/core/types/common'

type ExtractProps<T> =
  T extends React.FC<infer Props>
    ? Prettify<Omit<Props, 'children'>>
    : T extends React.Component<infer Props>
      ? Prettify<Omit<Props, 'children'>>
      : never

declare module '@adonisjs/inertia/types' {
  export interface InertiaPages {
    'account/privacy': ExtractProps<(typeof import('../../inertia/pages/account/privacy.tsx'))['default']>
    'account/referrals': ExtractProps<(typeof import('../../inertia/pages/account/referrals.tsx'))['default']>
    'account/security': ExtractProps<(typeof import('../../inertia/pages/account/security.tsx'))['default']>
    'admin/audit/index': ExtractProps<(typeof import('../../inertia/pages/admin/audit/index.tsx'))['default']>
    'admin/catalog/index': ExtractProps<(typeof import('../../inertia/pages/admin/catalog/index.tsx'))['default']>
    'admin/coupons/index': ExtractProps<(typeof import('../../inertia/pages/admin/coupons/index.tsx'))['default']>
    'admin/dashboard': ExtractProps<(typeof import('../../inertia/pages/admin/dashboard.tsx'))['default']>
    'admin/disputes/index': ExtractProps<(typeof import('../../inertia/pages/admin/disputes/index.tsx'))['default']>
    'admin/disputes/show': ExtractProps<(typeof import('../../inertia/pages/admin/disputes/show.tsx'))['default']>
    'admin/experiments/index': ExtractProps<(typeof import('../../inertia/pages/admin/experiments/index.tsx'))['default']>
    'admin/finishing/index': ExtractProps<(typeof import('../../inertia/pages/admin/finishing/index.tsx'))['default']>
    'admin/growth/index': ExtractProps<(typeof import('../../inertia/pages/admin/growth/index.tsx'))['default']>
    'admin/jobs/index': ExtractProps<(typeof import('../../inertia/pages/admin/jobs/index.tsx'))['default']>
    'admin/launch/index': ExtractProps<(typeof import('../../inertia/pages/admin/launch/index.tsx'))['default']>
    'admin/makers/index': ExtractProps<(typeof import('../../inertia/pages/admin/makers/index.tsx'))['default']>
    'admin/matching/index': ExtractProps<(typeof import('../../inertia/pages/admin/matching/index.tsx'))['default']>
    'admin/matching/show': ExtractProps<(typeof import('../../inertia/pages/admin/matching/show.tsx'))['default']>
    'admin/materials/index': ExtractProps<(typeof import('../../inertia/pages/admin/materials/index.tsx'))['default']>
    'admin/messages/show': ExtractProps<(typeof import('../../inertia/pages/admin/messages/show.tsx'))['default']>
    'admin/metrics/index': ExtractProps<(typeof import('../../inertia/pages/admin/metrics/index.tsx'))['default']>
    'admin/orders/index': ExtractProps<(typeof import('../../inertia/pages/admin/orders/index.tsx'))['default']>
    'admin/orders/show': ExtractProps<(typeof import('../../inertia/pages/admin/orders/show.tsx'))['default']>
    'admin/payouts/index': ExtractProps<(typeof import('../../inertia/pages/admin/payouts/index.tsx'))['default']>
    'admin/pricing_regions/index': ExtractProps<(typeof import('../../inertia/pages/admin/pricing_regions/index.tsx'))['default']>
    'admin/profiles/index': ExtractProps<(typeof import('../../inertia/pages/admin/profiles/index.tsx'))['default']>
    'admin/queues/index': ExtractProps<(typeof import('../../inertia/pages/admin/queues/index.tsx'))['default']>
    'admin/reports/index': ExtractProps<(typeof import('../../inertia/pages/admin/reports/index.tsx'))['default']>
    'admin/settings/index': ExtractProps<(typeof import('../../inertia/pages/admin/settings/index.tsx'))['default']>
    'admin/shipping/index': ExtractProps<(typeof import('../../inertia/pages/admin/shipping/index.tsx'))['default']>
    'admin/users/index': ExtractProps<(typeof import('../../inertia/pages/admin/users/index.tsx'))['default']>
    'auth/forgot_password': ExtractProps<(typeof import('../../inertia/pages/auth/forgot_password.tsx'))['default']>
    'auth/login': ExtractProps<(typeof import('../../inertia/pages/auth/login.tsx'))['default']>
    'auth/reset_password': ExtractProps<(typeof import('../../inertia/pages/auth/reset_password.tsx'))['default']>
    'auth/signup': ExtractProps<(typeof import('../../inertia/pages/auth/signup.tsx'))['default']>
    'auth/two_factor': ExtractProps<(typeof import('../../inertia/pages/auth/two_factor.tsx'))['default']>
    'cart/index': ExtractProps<(typeof import('../../inertia/pages/cart/index.tsx'))['default']>
    'cities/index': ExtractProps<(typeof import('../../inertia/pages/cities/index.tsx'))['default']>
    'cities/show': ExtractProps<(typeof import('../../inertia/pages/cities/show.tsx'))['default']>
    'content/index': ExtractProps<(typeof import('../../inertia/pages/content/index.tsx'))['default']>
    'content/show': ExtractProps<(typeof import('../../inertia/pages/content/show.tsx'))['default']>
    'dev/checkout': ExtractProps<(typeof import('../../inertia/pages/dev/checkout.tsx'))['default']>
    'errors/not_found': ExtractProps<(typeof import('../../inertia/pages/errors/not_found.tsx'))['default']>
    'errors/server_error': ExtractProps<(typeof import('../../inertia/pages/errors/server_error.tsx'))['default']>
    'files/index': ExtractProps<(typeof import('../../inertia/pages/files/index.tsx'))['default']>
    'files/quote': ExtractProps<(typeof import('../../inertia/pages/files/quote.tsx'))['default']>
    'home': ExtractProps<(typeof import('../../inertia/pages/home.tsx'))['default']>
    'invoices/index': ExtractProps<(typeof import('../../inertia/pages/invoices/index.tsx'))['default']>
    'legal/show': ExtractProps<(typeof import('../../inertia/pages/legal/show.tsx'))['default']>
    'maker/capacity/index': ExtractProps<(typeof import('../../inertia/pages/maker/capacity/index.tsx'))['default']>
    'maker/dashboard': ExtractProps<(typeof import('../../inertia/pages/maker/dashboard.tsx'))['default']>
    'maker/earnings': ExtractProps<(typeof import('../../inertia/pages/maker/earnings.tsx'))['default']>
    'maker/finishing': ExtractProps<(typeof import('../../inertia/pages/maker/finishing.tsx'))['default']>
    'maker/payout': ExtractProps<(typeof import('../../inertia/pages/maker/payout.tsx'))['default']>
    'maker/performance': ExtractProps<(typeof import('../../inertia/pages/maker/performance.tsx'))['default']>
    'maker/printers/index': ExtractProps<(typeof import('../../inertia/pages/maker/printers/index.tsx'))['default']>
    'maker/rfqs/index': ExtractProps<(typeof import('../../inertia/pages/maker/rfqs/index.tsx'))['default']>
    'maker/rfqs/show': ExtractProps<(typeof import('../../inertia/pages/maker/rfqs/show.tsx'))['default']>
    'maker/work/index': ExtractProps<(typeof import('../../inertia/pages/maker/work/index.tsx'))['default']>
    'marketing/for_makers': ExtractProps<(typeof import('../../inertia/pages/marketing/for_makers.tsx'))['default']>
    'marketing/for_sellers': ExtractProps<(typeof import('../../inertia/pages/marketing/for_sellers.tsx'))['default']>
    'materials/index': ExtractProps<(typeof import('../../inertia/pages/materials/index.tsx'))['default']>
    'materials/show': ExtractProps<(typeof import('../../inertia/pages/materials/show.tsx'))['default']>
    'messages/thread': ExtractProps<(typeof import('../../inertia/pages/messages/thread.tsx'))['default']>
    'notifications/index': ExtractProps<(typeof import('../../inertia/pages/notifications/index.tsx'))['default']>
    'notifications/preferences': ExtractProps<(typeof import('../../inertia/pages/notifications/preferences.tsx'))['default']>
    'onboarding/profile': ExtractProps<(typeof import('../../inertia/pages/onboarding/profile.tsx'))['default']>
    'onboarding/role_select': ExtractProps<(typeof import('../../inertia/pages/onboarding/role_select.tsx'))['default']>
    'orders/index': ExtractProps<(typeof import('../../inertia/pages/orders/index.tsx'))['default']>
    'orders/show': ExtractProps<(typeof import('../../inertia/pages/orders/show.tsx'))['default']>
    'rfq/create': ExtractProps<(typeof import('../../inertia/pages/rfq/create.tsx'))['default']>
    'rfq/index': ExtractProps<(typeof import('../../inertia/pages/rfq/index.tsx'))['default']>
    'rfq/show': ExtractProps<(typeof import('../../inertia/pages/rfq/show.tsx'))['default']>
    'seller/analytics': ExtractProps<(typeof import('../../inertia/pages/seller/analytics.tsx'))['default']>
    'seller/branding': ExtractProps<(typeof import('../../inertia/pages/seller/branding.tsx'))['default']>
    'seller/dashboard': ExtractProps<(typeof import('../../inertia/pages/seller/dashboard.tsx'))['default']>
    'seller/developers': ExtractProps<(typeof import('../../inertia/pages/seller/developers.tsx'))['default']>
    'seller/orders/index': ExtractProps<(typeof import('../../inertia/pages/seller/orders/index.tsx'))['default']>
    'seller/payout': ExtractProps<(typeof import('../../inertia/pages/seller/payout.tsx'))['default']>
    'seller/products/index': ExtractProps<(typeof import('../../inertia/pages/seller/products/index.tsx'))['default']>
    'seller/stores': ExtractProps<(typeof import('../../inertia/pages/seller/stores.tsx'))['default']>
    'seller/wallet': ExtractProps<(typeof import('../../inertia/pages/seller/wallet.tsx'))['default']>
    'shop/index': ExtractProps<(typeof import('../../inertia/pages/shop/index.tsx'))['default']>
    'shop/show': ExtractProps<(typeof import('../../inertia/pages/shop/show.tsx'))['default']>
    'status/changelog': ExtractProps<(typeof import('../../inertia/pages/status/changelog.tsx'))['default']>
    'status/index': ExtractProps<(typeof import('../../inertia/pages/status/index.tsx'))['default']>
    'support/help': ExtractProps<(typeof import('../../inertia/pages/support/help.tsx'))['default']>
    'tools/maker_income': ExtractProps<(typeof import('../../inertia/pages/tools/maker_income.tsx'))['default']>
    'tools/quick_quote': ExtractProps<(typeof import('../../inertia/pages/tools/quick_quote.tsx'))['default']>
    'use_cases/index': ExtractProps<(typeof import('../../inertia/pages/use_cases/index.tsx'))['default']>
    'use_cases/show': ExtractProps<(typeof import('../../inertia/pages/use_cases/show.tsx'))['default']>
  }
}
