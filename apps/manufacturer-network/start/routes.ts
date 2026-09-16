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

const ProductionRequestsApiController = () => import('#controllers/production_requests_api_controller')
const RegionCapabilityController = () => import('#controllers/region_capability_controller')
const WebhookEventsApiController = () => import('#controllers/webhook_events_api_controller')

/*
| Sistem A servis API'si (docs/09-API-SOZLESMESI.md) — Bearer anahtar, CSRF dışı
*/
router
  .group(() => {
    router.post('production-requests', [ProductionRequestsApiController, 'store'])
    router.get('region-capability', [RegionCapabilityController, 'show'])
    router.get('webhook-events', [WebhookEventsApiController, 'index'])
  })
  .prefix('/api/v1')
  .use(middleware.serviceAuth())

const PanelController = () => import('#controllers/panel_controller')
const ManufacturerOnboardingController = () => import('#controllers/manufacturer_onboarding_controller')
const OfferActionsController = () => import('#controllers/offer_actions_controller')
const ProductionStepsController = () => import('#controllers/production_steps_controller')

router
  .get('/', ({ auth, response }) => {
    return response.redirect().toRoute(auth.user ? 'panel.index' : 'session.create')
  })
  .as('home')

/*
| Üretici paneli (docs/03-PRD-URETICI-AGI.md) — oturum gerekli
*/
router
  .group(() => {
    router.get('panel', [PanelController, 'index']).as('panel.index')
    router.get('panel/onboarding', [ManufacturerOnboardingController, 'create']).as('panel.onboarding.create')
    router.post('panel/onboarding', [ManufacturerOnboardingController, 'store']).as('panel.onboarding.store')
    router.get('panel/requests/:id', [PanelController, 'show']).as('panel.requests.show')
    router.post('panel/requests/:id/steps', [ProductionStepsController, 'store']).as('panel.requests.steps.store')
    router.post('panel/offers/:id/accept', [OfferActionsController, 'accept']).as('panel.offers.accept')
    router.post('panel/offers/:id/decline', [OfferActionsController, 'decline']).as('panel.offers.decline')
  })
  .use(middleware.auth())

router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router.post('signup', [controllers.NewAccount, 'store'])

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])
  })
  .use(middleware.guest())

router
  .group(() => {
    router.post('logout', [controllers.Session, 'destroy'])
  })
  .use(middleware.auth())
