/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router.get('/', [controllers.Home, 'show']).as('home')
router.post('/language', [controllers.Language, 'update'])
router.get('/status', [controllers.Status, 'status'])
router.get('/changelog', [controllers.Status, 'changelog'])
router.get('/help', [controllers.Support, 'help'])
router
  .post('/help', [controllers.Support, 'submit'])
  .use(middleware.throttle({ name: 'support', requests: 5, duration: '1 hour' }))
router.get('/legal/:slug', [controllers.Legal, 'show'])
router.get('/blog', [controllers.Content, 'blogIndex'])
router.get('/blog/:slug', [controllers.Content, 'blogShow'])
router.get('/glossary', [controllers.Content, 'glossaryIndex'])
router.get('/glossary/:slug', [controllers.Content, 'glossaryShow'])
router.get('/materials', [controllers.MaterialPage, 'index'])
router.get('/materials/:slug', [controllers.MaterialPage, 'show'])
router.get('/use-cases', [controllers.UseCasePage, 'index'])
router.get('/use-cases/:slug', [controllers.UseCasePage, 'show'])
router.get('/for-makers', [controllers.Marketing, 'forMakers'])
router.get('/for-sellers', [controllers.Marketing, 'forSellers'])
router.get('/tools/maker-income', [controllers.Tool, 'makerIncome'])
router.get('/tools/quick-quote', [controllers.Tool, 'quickQuotePage'])
router
  .post('/tools/quick-quote', [controllers.Tool, 'quickQuote'])
  .use(middleware.throttle({ name: 'quick-quote', requests: 6, duration: '1 hour' }))
router
  .post('/waitlist', [controllers.Marketing, 'join'])
  .use(middleware.throttle({ name: 'waitlist', requests: 10, duration: '1 hour' }))

router
  .group(() => {
    router.get('login/two-factor', [controllers.TwoFactorChallenge, 'create'])
    router.post('login/two-factor', [controllers.TwoFactorChallenge, 'store'])
  })
  .use(middleware.guest())

// Account security: two-factor, password, active sessions
router
  .group(() => {
    router.get('/privacy', [controllers.AccountPrivacy, 'show'])
    router.get('/privacy/export', [controllers.AccountPrivacy, 'export'])
    router
      .post('/privacy/delete', [controllers.AccountPrivacy, 'destroy'])
      .use(middleware.throttle({ name: 'account-delete', requests: 5, duration: '1 hour' }))
    router
      .get('/referrals', [controllers.AccountReferral, 'show'])
      .use(middleware.feature({ name: 'referrals' }))
    router.get('/security', [controllers.AccountSecurity, 'show'])
    router.post('/security/two-factor/start', [controllers.AccountSecurity, 'startTwoFactor'])
    router.post('/security/two-factor/enable', [controllers.AccountSecurity, 'enableTwoFactor'])
    router.post('/security/two-factor/disable', [controllers.AccountSecurity, 'disableTwoFactor'])
    router.post('/security/two-factor/backup-codes', [
      controllers.AccountSecurity,
      'regenerateBackupCodes',
    ])
    router.post('/security/password', [controllers.AccountSecurity, 'changePassword'])
    router.post('/security/sessions/revoke-others', [controllers.AccountSecurity, 'revokeOthers'])
    router.post('/security/sessions/:id/revoke', [controllers.AccountSecurity, 'revokeSession'])
  })
  .prefix('/account')
  .use(middleware.auth())

router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router
      .post('signup', [controllers.NewAccount, 'store'])
      .use(middleware.throttle({ name: 'signup', requests: 10, duration: '1 hour' }))

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])
  })
  .use(middleware.guest())

router
  .group(() => {
    router.post('logout', [controllers.Session, 'destroy'])
  })
  .use(middleware.auth())

// Password reset (guest)
router
  .group(() => {
    router.get('forgot-password', [controllers.AuthSecurity, 'showForgotPassword'])
    router
      .post('forgot-password', [controllers.AuthSecurity, 'sendResetLink'])
      .as('auth_security.send_reset')
    router.get('reset-password', [controllers.AuthSecurity, 'showResetPassword'])
    router
      .post('reset-password', [controllers.AuthSecurity, 'resetPassword'])
      .as('auth_security.reset_password')
  })
  .use(middleware.guest())

// Email verification
router.get('verify-email', [controllers.AuthSecurity, 'verifyEmail'])
router
  .post('resend-verification', [controllers.AuthSecurity, 'resendVerification'])
  .use(middleware.auth())

// Onboarding
router
  .group(() => {
    router.get('/onboarding', [controllers.Onboarding, 'show'])
    router
      .post('/onboarding/role', [controllers.Onboarding, 'storeRole'])
      .as('onboarding.store_role')
    router.get('/onboarding/profile', [controllers.Onboarding, 'showProfile'])
    router
      .post('/onboarding/profile', [controllers.Onboarding, 'storeProfile'])
      .as('onboarding.store_profile')
      .use(middleware.verified())
  })
  .use(middleware.auth())

// Model files (authenticated, any role)
router
  .group(() => {
    router.get('/', [controllers.ModelFile, 'index'])
    router
      .post('/upload-url', [controllers.ModelFile, 'getUploadUrl'])
      .use(middleware.throttle({ name: 'upload-url', requests: 30, duration: '10 minutes' }))
    router
      .post('/register', [controllers.ModelFile, 'register'])
      .use(middleware.throttle({ name: 'file-register', requests: 30, duration: '10 minutes' }))
    router.get('/:id/preview-url', [controllers.ModelFile, 'previewUrl'])
    router.get('/:id/quote', [controllers.Quote, 'show'])
    router
      .post('/:id/quote', [controllers.Quote, 'calculate'])
      .use(middleware.throttle({ name: 'quote', requests: 30, duration: '1 minute' }))
  })
  .prefix('/files')
  .use([middleware.auth()])

// Public storefront + crawler files
router.get('/shop', [controllers.Storefront, 'index'])
router
  .get('/shop/:id/:slug?', [controllers.Storefront, 'show'])
  .where('id', router.matchers.number())
router
  .post('/shop/:id/order', [controllers.Storefront, 'order'])
  .where('id', router.matchers.number())
  .use([
    middleware.auth(),
    middleware.onboarding(),
    middleware.verified(),
    middleware.throttle({ name: 'order-create', requests: 10, duration: '10 minutes' }),
    middleware.idempotent(),
  ])
// Shop pictures (renders, approved maker photos), streamed from private storage
router.get('/images/:id', [controllers.ProductImage, 'show']).where('id', router.matchers.number())
router.get('/sitemap.xml', [controllers.Storefront, 'sitemap'])
router.get('/robots.txt', [controllers.Storefront, 'robots'])

// Notifications (any signed-in user)
router
  .group(() => {
    router.get('/', [controllers.Notification, 'index'])
    router.get('/preferences', [controllers.Notification, 'preferences'])
    router.post('/preferences', [controllers.Notification, 'updatePreference'])
    router.post('/read-all', [controllers.Notification, 'readAll'])
    router
      .get('/:id/open', [controllers.Notification, 'open'])
      .where('id', router.matchers.number())
  })
  .prefix('/notifications')
  .use([middleware.auth()])

router.get('/health', [controllers.Health, 'show'])

router
  .post('/webhooks/carrier', [controllers.CarrierWebhook, 'handle'])
  .use(middleware.throttle({ name: 'carrier-webhook', requests: 300, duration: '1 minute' }))

// Payment provider webhooks (signature-verified, no session)
router
  .post('/webhooks/payments', [controllers.PaymentWebhook, 'handle'])
  .use(middleware.throttle({ name: 'webhook', requests: 300, duration: '1 minute' }))

// Orders from sellers' own shops (signature-verified per shop, R4)
router
  .post('/webhooks/stores/:id/orders', [controllers.StoreWebhook, 'order'])
  .where('id', router.matchers.number())
  .use(middleware.throttle({ name: 'store-webhook', requests: 300, duration: '1 minute' }))

// Hosted payment page return (iyzico POSTs the token; outcome is read back from the provider)
router
  .post('/payments/return', [controllers.PaymentReturn, 'handle'])
  .use(middleware.throttle({ name: 'payment-return', requests: 60, duration: '1 minute' }))

// Report a listing (members only)
router
  .post('/shop/:id/report', [controllers.ContentReport, 'store'])
  .where('id', router.matchers.number())
  .use([
    middleware.auth(),
    middleware.throttle({ name: 'report', requests: 10, duration: '1 hour' }),
  ])

// Cart (members only; checkout needs a verified e-mail like any order)
router
  .group(() => {
    router.get('/', [controllers.Cart, 'show'])
    router.post('/items', [controllers.Cart, 'add'])
    router.post('/items/:id', [controllers.Cart, 'update'])
    router.post('/items/:id/remove', [controllers.Cart, 'remove'])
    router
      .post('/checkout', [controllers.Cart, 'checkout'])
      .use([
        middleware.verified(),
        middleware.throttle({ name: 'order-create', requests: 10, duration: '10 minutes' }),
        middleware.idempotent(),
      ])
  })
  .prefix('/cart')
  .where('id', router.matchers.number())
  .use([middleware.auth(), middleware.onboarding()])

// Orders (buyer side, any onboarded user)
router
  .group(() => {
    router.get('/', [controllers.Order, 'index'])
    router
      .post('/', [controllers.Order, 'store'])
      .use([
        middleware.verified(),
        middleware.throttle({ name: 'order-create', requests: 10, duration: '10 minutes' }),
        middleware.idempotent(),
      ])
    router.get('/:id', [controllers.Order, 'show'])
    router.post('/:id/cancel', [controllers.Order, 'cancel'])
    router
      .post('/:id/pay', [controllers.Order, 'pay'])
      .use([middleware.verified(), middleware.idempotent()])
    router
      .post('/:id/pay-from-wallet', [controllers.Order, 'payFromWallet'])
      .use([middleware.verified(), middleware.idempotent()])
    router
      .post('/:id/simulate-payment', [controllers.Order, 'simulatePayment'])
      .use(middleware.verified())
    router.post('/:id/delivered', [controllers.Order, 'delivered'])
    router.post('/:id/complete', [controllers.Order, 'complete'])
    router.post('/:id/review', [controllers.Order, 'review'])
    router.get('/:id/invoice', [controllers.Invoice, 'show'])
    router.get('/:id/messages', [controllers.OrderMessage, 'show'])
    router
      .post('/:id/messages', [controllers.OrderMessage, 'store'])
      .use(middleware.throttle({ name: 'message', requests: 20, duration: '10 minutes' }))
    router
      .post('/:id/dispute', [controllers.Dispute, 'open'])
      .use([
        middleware.verified(),
        middleware.throttle({ name: 'dispute-open', requests: 5, duration: '1 hour' }),
      ])
  })
  .prefix('/orders')
  .where('id', router.matchers.number())
  .use([middleware.auth(), middleware.onboarding()])

// Dispute evidence (buyer or the producing manufacturer; checked in the service)
router
  .group(() => {
    router
      .post('/:id/evidence/upload-url', [controllers.Dispute, 'uploadUrl'])
      .use(middleware.throttle({ name: 'evidence-url', requests: 20, duration: '1 hour' }))
    router
      .post('/:id/evidence', [controllers.Dispute, 'addEvidence'])
      .use(middleware.throttle({ name: 'evidence-add', requests: 20, duration: '1 hour' }))
  })
  .prefix('/disputes')
  .where('id', router.matchers.number())
  .use([middleware.auth(), middleware.onboarding()])

// Test payment page: the fake provider's stand-in for a hosted checkout (never in production)
router
  .group(() => {
    router.get('/:ref', [controllers.TestCheckout, 'show'])
    router.post('/:ref', [controllers.TestCheckout, 'pay'])
  })
  .prefix('/dev/checkout')
  .use([middleware.auth(), middleware.onboarding()])

// Seller panel
router
  .group(() => {
    router
      .get('/', [controllers.SellerDashboard, 'index'])
      .use(middleware.profile({ role: 'seller' }))
    router.get('/orders', [controllers.SellerOrder, 'index'])

    // Products
    router
      .get('/products', [controllers.SellerProduct, 'index'])
      .use(middleware.profile({ role: 'seller' }))
    router.get('/margin-preview', [controllers.SellerInsight, 'marginPreview'])
    router.get('/analytics', [controllers.SellerInsight, 'analytics'])
    router.get('/statement.csv', [controllers.SellerInsight, 'statement'])
    router
      .get('/branding', [controllers.SellerBranding, 'show'])
      .use(middleware.profile({ role: 'seller' }))
    router
      .post('/branding', [controllers.SellerBranding, 'save'])
      .use(middleware.profile({ role: 'seller' }))
    router
      .get('/branding/logo', [controllers.SellerBranding, 'logo'])
      .use(middleware.profile({ role: 'seller' }))
    router
      .post('/branding/logo', [controllers.SellerBranding, 'uploadLogo'])
      .use(middleware.profile({ role: 'seller' }))
    router
      .post('/branding/logo/remove', [controllers.SellerBranding, 'removeLogo'])
      .use(middleware.profile({ role: 'seller' }))

    // External shops: SKU mapping, imported orders, tracking write-back (R4)
    router
      .group(() => {
        router.get('/', [controllers.SellerStore, 'index'])
        router
          .post('/connect', [controllers.SellerStore, 'connect'])
          .use(middleware.throttle({ name: 'store-connect', requests: 10, duration: '1 hour' }))
        router.get('/etsy/start', [controllers.SellerStore, 'etsyStart'])
        router.get('/etsy/callback', [controllers.SellerStore, 'etsyCallback'])
        router.get('/etsy/categories', [controllers.SellerStore, 'etsyCategories'])
        router.post('/:id/publish', [controllers.SellerStore, 'publish'])
        router.post('/:id/unpublish', [controllers.SellerStore, 'unpublish'])
        router.post('/test', [controllers.SellerStore, 'connectTest'])
        router.post('/:id/sync', [controllers.SellerStore, 'sync'])
        router.post('/:id/disconnect', [controllers.SellerStore, 'disconnect'])
        router.post('/listings/:id', [controllers.SellerStore, 'map'])
        router.post('/orders/:id/retry', [controllers.SellerStore, 'retry'])
      })
      .prefix('/stores')
      .where('id', router.matchers.number())
      .use([middleware.feature({ name: 'externalStores' }), middleware.profile({ role: 'seller' })])

    // Prepaid balance for orders from the seller's own shop (R4-T2)
    router.get('/wallet', [controllers.SellerWallet, 'show'])
    router
      .post('/wallet/top-up', [controllers.SellerWallet, 'topUp'])
      .use([
        middleware.verified(),
        middleware.idempotent(),
        middleware.throttle({ name: 'wallet-top-up', requests: 10, duration: '1 hour' }),
      ])
    router.post('/wallet/auto-pay', [controllers.SellerWallet, 'autoPay'])
    router
      .post('/wallet/refund', [controllers.SellerWallet, 'refund'])
      .use([
        middleware.verified(),
        middleware.throttle({ name: 'wallet-refund', requests: 5, duration: '1 hour' }),
      ])

    // Tax and bank details, invoices to Fabrmatch (R7)
    router.get('/payout', [controllers.SellerPayout, 'show'])
    router
      .post('/payout', [controllers.SellerPayout, 'save'])
      .use(middleware.throttle({ name: 'seller-payout', requests: 10, duration: '1 hour' }))
    router
      .post('/payout/:id/invoice', [controllers.SellerPayout, 'invoice'])
      .where('id', router.matchers.number())
      .use(middleware.throttle({ name: 'payout-invoice', requests: 30, duration: '1 hour' }))
    router
      .get('/payout/vouchers/:id', [controllers.SellerPayout, 'voucher'])
      .where('id', router.matchers.number())

    // API keys and webhooks
    router.get('/developers', [controllers.SellerDeveloper, 'index'])
    router
      .group(() => {
        router.post('/keys', [controllers.SellerDeveloper, 'createKey'])
        router.post('/keys/:id/revoke', [controllers.SellerDeveloper, 'revokeKey'])
        router.post('/webhooks', [controllers.SellerDeveloper, 'createWebhook'])
        router.post('/webhooks/:id/toggle', [controllers.SellerDeveloper, 'toggleWebhook'])
        router.delete('/webhooks/:id', [controllers.SellerDeveloper, 'deleteWebhook'])
        router
          .post('/webhooks/:id/test', [controllers.SellerDeveloper, 'testWebhook'])
          .use(middleware.throttle({ name: 'webhook-test', requests: 10, duration: '1 hour' }))
      })
      .prefix('/developers')
      .use(middleware.verified())
    router
      .post('/products', [controllers.SellerProduct, 'store'])
      .use(middleware.profile({ role: 'seller' }))
    router
      .put('/products/:id', [controllers.SellerProduct, 'update'])
      .use(middleware.profile({ role: 'seller' }))
    router
      .post('/products/:id/status', [controllers.SellerProduct, 'setStatus'])
      .use(middleware.profile({ role: 'seller' }))
    router
      .post('/products/:id/sample', [controllers.SellerProduct, 'sample'])
      .use([
        middleware.verified(),
        middleware.throttle({ name: 'order-create', requests: 10, duration: '10 minutes' }),
      ])
  })
  .prefix('/seller')
  .use([middleware.auth(), middleware.onboarding(), middleware.role({ role: 'seller' })])

// Requests for quotes (corporate buyers); hidden until an admin turns the feature on
router
  .group(() => {
    router.get('/', [controllers.Rfq, 'index'])
    router.get('/new', [controllers.Rfq, 'create'])
    router
      .post('/', [controllers.Rfq, 'store'])
      .use([
        middleware.verified(),
        middleware.throttle({ name: 'rfq-create', requests: 10, duration: '1 day' }),
      ])
    router.get('/:id', [controllers.Rfq, 'show']).where('id', router.matchers.number())
    router
      .post('/:id/award', [controllers.Rfq, 'award'])
      .where('id', router.matchers.number())
      .use(middleware.verified())
    router.post('/:id/cancel', [controllers.Rfq, 'cancel']).where('id', router.matchers.number())
  })
  .prefix('/rfqs')
  .use([
    middleware.auth(),
    middleware.onboarding(),
    middleware.role({ role: 'seller' }),
    middleware.feature({ name: 'rfq' }),
  ])

// OpenAPI document of the seller API (public, no key)
router.get('/api/v1/openapi.json', [controllers.Api, 'openapi'])

// Public seller API (bearer key, read-only)
router
  .group(() => {
    router.get('/orders', [controllers.Api, 'orders'])
    router.get('/orders/:id', [controllers.Api, 'order']).where('id', router.matchers.number())
    router.get('/products', [controllers.Api, 'products'])
  })
  .prefix('/api/v1')
  .use(middleware.apiKey())

// Manufacturer panel
router
  .group(() => {
    router.get('/', [controllers.MakerDashboard, 'index'])

    // Printers
    router.get('/printers', [controllers.Printer, 'index'])
    router.post('/printers', [controllers.Printer, 'store'])
    router.put('/printers/:id', [controllers.Printer, 'update'])
    router.post('/printers/:id/toggle', [controllers.Printer, 'toggleActive'])
    router.post('/printers/:id/profiles', [controllers.Printer, 'setProfiles'])

    // Printer materials
    router.post('/printers/:id/materials', [controllers.Printer, 'storeMaterial'])
    router.put('/printers/:printerId/materials/:id', [controllers.Printer, 'updateMaterial'])
    router.delete('/printers/:printerId/materials/:id', [controllers.Printer, 'destroyMaterial'])

    // Offers & production jobs
    router.get('/work', [controllers.MakerWork, 'index'])
    router.post('/offers/:id/accept', [controllers.MakerWork, 'accept'])
    router.post('/offers/:id/decline', [controllers.MakerWork, 'decline'])
    router.get('/jobs/:id/packing-slip', [controllers.MakerWork, 'packingSlip'])
    router.post('/jobs/:id/printing', [controllers.MakerWork, 'printing'])
    router.post('/jobs/:id/produced', [controllers.MakerWork, 'produced'])
    router.post('/jobs/:id/qc/upload-url', [controllers.MakerWork, 'qcUploadUrl'])
    router.post('/jobs/:id/qc', [controllers.MakerWork, 'qcRegister'])
    router.post('/jobs/:id/ship', [controllers.MakerWork, 'ship'])
    router
      .post('/qc-photos/:id/offer', [controllers.MakerWork, 'offerPhoto'])
      .where('id', router.matchers.number())
    router.post('/grants/:grantId/download', [controllers.MakerWork, 'download'])
    router.post('/disputes/:id/respond', [controllers.Dispute, 'respond'])

    router.get('/orders/:id/messages', [controllers.MakerOrderMessage, 'show'])
    router
      .post('/orders/:id/messages', [controllers.MakerOrderMessage, 'store'])
      .use(middleware.throttle({ name: 'message', requests: 20, duration: '10 minutes' }))

    // Requests for quotes the maker was invited to
    router
      .group(() => {
        router.get('/rfqs', [controllers.MakerRfq, 'index'])
        router.get('/rfqs/:id', [controllers.MakerRfq, 'show'])
        router.post('/rfqs/:id/bid', [controllers.MakerRfq, 'bid'])
        router.post('/rfqs/:id/withdraw', [controllers.MakerRfq, 'withdraw'])
      })
      .use(middleware.feature({ name: 'rfq' }))

    // Finishing services the maker offers (sanding, painting…)
    router.get('/finishing', [controllers.MakerFinishing, 'show'])
    router.post('/finishing', [controllers.MakerFinishing, 'save'])

    // Tax and bank details, invoices to Fabrmatch, expense vouchers (R7)
    router.get('/payout', [controllers.MakerPayout, 'show'])
    router
      .post('/payout', [controllers.MakerPayout, 'save'])
      .use(middleware.throttle({ name: 'maker-iban', requests: 10, duration: '1 hour' }))
    router
      .post('/payout/:id/invoice', [controllers.MakerPayout, 'invoice'])
      .where('id', router.matchers.number())
      .use(middleware.throttle({ name: 'payout-invoice', requests: 30, duration: '1 hour' }))
    router
      .get('/payout/vouchers/:id', [controllers.MakerPayout, 'voucher'])
      .where('id', router.matchers.number())

    // Track record and payouts
    router.get('/performance', [controllers.MakerPerformance, 'scorecard'])
    router.get('/earnings', [controllers.MakerPerformance, 'earnings'])
    router.get('/earnings/statement.csv', [controllers.MakerPerformance, 'statement'])

    // Capacity
    router.get('/capacity', [controllers.Capacity, 'index'])
    router.post('/capacity/printers/:id/slot', [controllers.Capacity, 'setSlot'])
    router.post('/capacity/printers/:id/template', [controllers.Capacity, 'saveTemplate'])
    router.post('/capacity/printers/:id/apply-template', [controllers.Capacity, 'applyTemplate'])
  })
  .prefix('/maker')
  .use([
    middleware.auth(),
    middleware.onboarding(),
    middleware.role({ role: 'manufacturer' }),
    middleware.profile({ role: 'manufacturer' }),
  ])

// Admin panel
router
  .group(() => {
    router.get('/', [controllers.AdminDashboard, 'index'])

    // Catalog
    router.get('/catalog', [controllers.AdminCatalog, 'index'])
    router.post('/catalog', [controllers.AdminCatalog, 'store'])
    router.put('/catalog/:id', [controllers.AdminCatalog, 'update'])
    router.post('/catalog/:id/toggle', [controllers.AdminCatalog, 'toggleActive'])
    router.post('/categories', [controllers.AdminCategory, 'store'])
    router.post('/categories/:id/toggle', [controllers.AdminCategory, 'toggle'])

    // Disputes
    router.get('/disputes', [controllers.AdminDispute, 'index'])
    router.get('/disputes/:id', [controllers.AdminDispute, 'show'])
    router.post('/disputes/:id/resolve', [controllers.AdminDispute, 'resolve'])

    router.get('/queues', [controllers.AdminQueue, 'index'])
    router.post('/queues/orders/:id/rematch', [controllers.AdminQueue, 'rematch'])
    router.post('/queues/acknowledge', [controllers.AdminQueue, 'acknowledge'])
    router.post('/queues/makers/:id', [controllers.AdminQueue, 'decideMaker'])
    router.post('/queues/fraud/:id', [controllers.AdminQueue, 'fraudDecision'])
    router.post('/queues/reports/:id', [controllers.AdminQueue, 'reportDecision'])
    router.post('/queues/chargebacks/:id', [controllers.AdminQueue, 'chargebackDecision'])
    router.post('/queues/support/:id', [controllers.AdminQueue, 'supportAnswered'])
    router
      .post('/queues/photos/:id', [controllers.AdminQueue, 'shopPhotoDecision'])
      .where('id', router.matchers.number())

    router.get('/materials', [controllers.AdminReferenceCatalog, 'index'])
    router.post('/materials', [controllers.AdminReferenceCatalog, 'storeMaterial'])
    router.post('/materials/:id/toggle', [controllers.AdminReferenceCatalog, 'toggleMaterial'])
    router.post('/colors', [controllers.AdminReferenceCatalog, 'storeColor'])
    router.post('/colors/:id/toggle', [controllers.AdminReferenceCatalog, 'toggleColor'])

    router.get('/metrics', [controllers.AdminMetrics, 'index'])
    router.get('/growth', [controllers.AdminGrowth, 'index'])
    router.get('/jobs', [controllers.AdminQueueMonitor, 'index'])
    router.post('/jobs/run-again', [controllers.AdminQueueMonitor, 'runAgain'])

    // Matching: an admin picks the maker while automatic matching is off
    router.get('/matching', [controllers.AdminMatching, 'index'])
    router.post('/matching/mode', [controllers.AdminMatching, 'mode'])
    router
      .get('/matching/:id', [controllers.AdminMatching, 'show'])
      .where('id', router.matchers.number())
    router
      .post('/matching/:id/offer', [controllers.AdminMatching, 'offer'])
      .where('id', router.matchers.number())

    router.get('/orders', [controllers.AdminOrder, 'index'])
    router.get('/orders/:id', [controllers.AdminOrder, 'show'])
    router.get('/orders/:id/messages', [controllers.AdminMessage, 'show'])

    router
      .get('/images/:id', [controllers.ProductImage, 'adminShow'])
      .where('id', router.matchers.number())

    router.get('/users', [controllers.AdminUser, 'index'])
    router.post('/users/:id/suspend', [controllers.AdminUser, 'suspend'])
    router.post('/users/:id/unsuspend', [controllers.AdminUser, 'unsuspend'])
    router.get('/audit', [controllers.AdminAudit, 'index'])

    router.get('/finishing', [controllers.AdminFinishing, 'index'])
    router.post('/finishing', [controllers.AdminFinishing, 'store'])
    router.post('/finishing/:id', [controllers.AdminFinishing, 'update'])

    router.get('/profiles', [controllers.AdminPrintProfile, 'index'])
    router.post('/profiles', [controllers.AdminPrintProfile, 'store'])
    router.post('/profiles/:id/toggle', [controllers.AdminPrintProfile, 'toggle'])

    router.get('/shipping', [controllers.AdminShipping, 'index'])
    router.post('/shipping/rates/:id', [controllers.AdminShipping, 'updateRate'])
    router.post('/shipping/zones/:id/extra', [controllers.AdminShipping, 'updateExtra'])

    router.get('/makers', [controllers.AdminMaker, 'index'])
    router.post('/makers/:id/tier', [controllers.AdminMaker, 'setTier'])
    router.post('/makers/:id/tier/unlock', [controllers.AdminMaker, 'unlockTier'])

    router.get('/experiments', [controllers.AdminExperiment, 'index'])
    router.get('/reports', [controllers.AdminReport, 'index'])
    router.get('/reports/download/:kind', [controllers.AdminReport, 'download'])

    router.get('/coupons', [controllers.AdminCoupon, 'index'])
    router.post('/coupons', [controllers.AdminCoupon, 'store'])
    router.post('/coupons/:id/toggle', [controllers.AdminCoupon, 'toggle'])

    // Payee details, invoices and bank transfers (R7, sales model B)
    router
      .group(() => {
        router.get('/', [controllers.AdminPayout, 'index'])
        router.get('/ready.csv', [controllers.AdminPayout, 'readyCsv'])
        router.post('/profiles/:id', [controllers.AdminPayout, 'reviewProfile'])
        router.get('/profiles/:id/document', [controllers.AdminPayout, 'profileDocument'])
        router.post('/documents/:id', [controllers.AdminPayout, 'reviewInvoice'])
        router.get('/documents/:id/file', [controllers.AdminPayout, 'invoiceFile'])
        router.get('/vouchers/:id', [controllers.AdminPayout, 'voucher'])
        router.post('/:id/paid', [controllers.AdminPayout, 'markPaid'])
      })
      .prefix('/payouts')
      .where('id', router.matchers.number())

    router.get('/settings', [controllers.AdminSettings, 'index'])
    router.post('/settings', [controllers.AdminSettings, 'update'])
    router.post('/settings/reset', [controllers.AdminSettings, 'reset'])
  })
  .prefix('/admin')
  .use([
    middleware.auth(),
    middleware.onboarding(),
    middleware.role({ role: 'admin' }),
    middleware.twoFactor(),
  ])
