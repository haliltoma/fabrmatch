import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import redis from '@adonisjs/redis/services/main'
import { DateTime } from 'luxon'
import CartItem from '#models/cart_item'
import MatchOffer from '#models/match_offer'
import User from '#models/user'
import OnboardingService from '#services/identity/onboarding_service'
import RoleService from '#services/identity/role_service'
import LandingService, { INTENDED_URL, safeIntendedUrl } from '#services/identity/landing_service'
import SellerSetupService from '#services/catalog/seller_setup_service'
import {
  createAnalyzedFile,
  createDraftOrder,
  createManufacturer,
  createPrinter,
  createUser,
} from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

async function clearLoginThrottle() {
  const stale = await redis.keys('rlflx:login:*')
  if (stale.length > 0) await redis.del(...stale)
}

async function buyer() {
  const user = await createUser('buyer')
  await new RoleService().assignRole(user, 'seller')
  return user
}

test.group('landing page after sign-in', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('each role lands on its next useful page', async ({ assert }) => {
    const landing = new LandingService()

    assert.equal(await landing.homeFor(await createUser('none')), '/onboarding')

    const admin = await createUser('admin')
    await new RoleService().assignRole(admin, 'admin')
    assert.equal(await landing.homeFor(admin), '/admin')

    const seller = await createUser('seller')
    await new OnboardingService().createSellerProfile(seller, {
      businessName: 'S',
      isCorporate: false,
    })
    assert.equal(await landing.homeFor(seller), '/seller')

    const { user: maker } = await createManufacturer()
    await new RoleService().assignRole(maker, 'manufacturer')
    assert.equal(await landing.homeFor(maker), '/maker')
  })

  test('a buyer goes to the cart, else orders, else the quote flow', async ({ assert }) => {
    const landing = new LandingService()
    const user = await buyer()
    assert.equal(await landing.homeFor(user), '/files')

    await createDraftOrder(user)
    assert.equal(await landing.homeFor(user), '/orders')

    const file = await createAnalyzedFile(user)
    await CartItem.create({ userId: user.id, modelFileId: file.id, material: 'PLA', quantity: 1 })
    assert.equal(await landing.homeFor(user), '/cart')
  })

  test('a maker with an open offer goes straight to the work queue', async ({ assert }) => {
    const { user, profile } = await createManufacturer()
    await new RoleService().assignRole(user, 'manufacturer')
    const printer = await createPrinter(profile)
    const { order } = await createDraftOrder()
    const offer = await MatchOffer.create({
      orderId: order.id,
      manufacturerProfileId: profile.id,
      printerId: printer.id,
      slotDate: DateTime.now(),
      score: 0.5,
      isExploration: false,
      round: 1,
      status: 'pending',
      expiresAt: DateTime.now().plus({ minutes: 30 }),
    })
    assert.equal(await new LandingService().homeFor(user), '/maker/work')

    offer.expiresAt = DateTime.now().minus({ minutes: 1 })
    await offer.save()
    assert.equal(await new LandingService().homeFor(user), '/maker')
  })

  test('only same-site paths are followed back', ({ assert }) => {
    assert.equal(safeIntendedUrl('/cart'), '/cart')
    assert.equal(safeIntendedUrl('/shop/3/vase?x=1'), '/shop/3/vase?x=1')
    assert.isNull(safeIntendedUrl('https://evil.test'))
    assert.isNull(safeIntendedUrl('//evil.test'))
    assert.isNull(safeIntendedUrl('/\\evil.test'))
    assert.isNull(safeIntendedUrl('/login'))
    assert.isNull(safeIntendedUrl(undefined))
  })

  test('login returns to the page the guest was sent away from', async ({ client, assert }) => {
    await clearLoginThrottle()
    const user = await buyer()

    const bounced = await client.get('/cart?step=2').redirects(0)
    assert.match(bounced.header('location') ?? '', /^\/login/)
    bounced.assertSession(INTENDED_URL, '/cart?step=2')

    const login = await client
      .post('/login')
      .withCsrfToken()
      .withSession({ [INTENDED_URL]: '/cart?step=2' })
      .headers(inertia)
      .redirects(0)
      .json({ email: user.email, password: 'password123' })
    login.assertStatus(302)
    login.assertHeader('location', '/cart?step=2')
  })

  test('login without a remembered page goes to the landing page', async ({ client }) => {
    await clearLoginThrottle()
    const user = await buyer()
    const login = await client
      .post('/login')
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ email: user.email, password: 'password123' })
    login.assertHeader('location', '/files')
  })

  test('a signed-in user opening /login is sent to their landing page', async ({ client }) => {
    const user = await buyer()
    const response = await client.get('/login').loginAs(user).redirects(0)
    response.assertHeader('location', '/files')
  })

  test('sign-up goes to role selection', async ({ client, assert }) => {
    await clearLoginThrottle()
    const email = `new-${Date.now()}@test.com`
    const response = await client
      .post('/signup')
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({
        fullName: 'New Person',
        email,
        password: 'password123',
        passwordConfirmation: 'password123',
        acceptTerms: true,
      })
    response.assertHeader('location', '/onboarding')
    assert.isNotNull(await User.findBy('email', email))
  })

  test('"just order prints" gives the buyer role and opens the quote flow', async ({
    client,
    assert,
  }) => {
    const user = await createUser('fresh')
    const response = await client
      .post('/onboarding/role')
      .withCsrfToken()
      .loginAs(user)
      .headers(inertia)
      .redirects(0)
      .json({ role: 'buyer' })
    response.assertHeader('location', '/files')
    assert.deepEqual(await new RoleService().getUserRoles(user), ['seller'])
  })
})

test.group('onboarding profile form', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('an unticked "corporate" checkbox (field absent) still completes the profile', async ({
    client,
    assert,
  }) => {
    const user = await createUser('seller')
    await new RoleService().assignRole(user, 'seller')
    const response = await client
      .post('/onboarding/profile')
      .withCsrfToken()
      .loginAs(user)
      .headers(inertia)
      .redirects(0)
      .json({ businessName: 'Solo Shop' })
    response.assertHeader('location', '/seller')
    await user.load('sellerProfile')
    assert.isFalse(user.sellerProfile.isCorporate)
  })
})

test.group('seller setup checklist', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('starts with the profile ticked and ticks steps from real data', async ({ assert }) => {
    const user = await createUser('seller')
    const profile = await new OnboardingService().createSellerProfile(user, {
      businessName: 'Shop',
      isCorporate: false,
    })

    let setup = await new SellerSetupService().forProfile(profile)
    assert.equal(setup.doneCount, 1)
    assert.isFalse(setup.complete)
    assert.equal(setup.steps.find((s) => !s.done)?.href, '/files')

    await createAnalyzedFile(user)
    setup = await new SellerSetupService().forProfile(profile)
    assert.equal(setup.doneCount, 2)
    assert.equal(setup.steps.find((s) => !s.done)?.id, 'product')
  })

  test('the seller dashboard carries the checklist', async ({ client }) => {
    const user = await createUser('seller')
    await new OnboardingService().createSellerProfile(user, {
      businessName: 'Shop',
      isCorporate: false,
    })
    const page = await client.get('/seller').loginAs(user).headers(inertia)
    page.assertStatus(200)
    page.assertBodyContains({ props: { setup: { doneCount: 1, complete: false } } })
  })
})
