import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Lead from '#models/lead'
import MarketingEvent from '#models/marketing_event'
import { readAttribution } from '#services/growth/attribution'
import GrowthService, { CONSENT_VERSION, GrowthError } from '#services/growth/growth_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import PaymentService from '#services/payments/payment_service'
import { createDraftOrder, createUser } from '#tests/helpers/order_fixtures'

test.group('attribution', () => {
  test('utm labels win and are sanitised; nothing else is kept', ({ assert }) => {
    const a = readAttribution({
      query: {
        utm_source: 'Instagram',
        utm_medium: 'Social!',
        utm_campaign: 'launch_Q4',
        token: 'secret',
      },
      referrer: 'https://l.instagram.com/?u=https://x.test/private?id=42',
      ownHost: 'fabrmatch.com',
    })
    assert.deepEqual(a, { source: 'instagram', medium: 'social', campaign: 'launch_q4' })
  })

  test('an external referrer becomes a bare host; our own site and junk are ignored', ({
    assert,
  }) => {
    assert.deepEqual(
      readAttribution({
        query: {},
        referrer: 'https://www.google.com/search?q=3d+baski',
        ownHost: 'fabrmatch.com',
      }),
      { source: 'google.com', medium: 'referral', campaign: null }
    )
    assert.isNull(
      readAttribution({
        query: {},
        referrer: 'https://fabrmatch.com/shop',
        ownHost: 'fabrmatch.com',
      })
    )
    assert.isNull(readAttribution({ query: {}, referrer: 'not a url', ownHost: 'fabrmatch.com' }))
    assert.isNull(readAttribution({ query: {}, referrer: null, ownHost: 'fabrmatch.com' }))
  })
})

test.group('GrowthService (M1-T1, M1-T2)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  const growth = new GrowthService()

  test('a lead needs a valid e-mail and explicit consent, and is stored with the consent version', async ({
    assert,
  }) => {
    await assert.rejects(
      () => growth.joinWaitlist({ email: 'a@b.co', interest: 'maker', consent: false }),
      /tick the box/
    )
    await assert.rejects(
      () => growth.joinWaitlist({ email: 'nope', interest: 'maker', consent: true }),
      GrowthError
    )
    assert.equal(await Lead.query().then((r) => r.length), 0)

    const first = await growth.joinWaitlist({
      email: ' Ali@Example.com ',
      interest: 'maker',
      city: 'İstanbul',
      consent: true,
      attribution: { source: 'instagram', medium: 'social', campaign: 'q4' },
    })
    assert.isTrue(first.created)
    const lead = await Lead.firstOrFail()
    assert.equal(lead.email, 'ali@example.com')
    assert.equal(lead.consentVersion, CONSENT_VERSION)
    assert.equal(lead.utmSource, 'instagram')
  })

  test('joining twice keeps the first record; the same e-mail may sit on both lists', async ({
    assert,
  }) => {
    await growth.joinWaitlist({ email: 'x@y.co', interest: 'maker', consent: true })
    const again = await growth.joinWaitlist({ email: 'X@Y.co', interest: 'maker', consent: true })
    assert.isFalse(again.created)
    const other = await growth.joinWaitlist({ email: 'x@y.co', interest: 'seller', consent: true })
    assert.isTrue(other.created)
    const events = await MarketingEvent.query().where('name', 'waitlist_signup')
    assert.lengthOf(events, 2, 'the duplicate was not counted as a new sign-up')
  })

  test('the advertised waiting count is real and hidden at zero', async ({ assert }) => {
    assert.isNull(await growth.waitingCount('maker'))
    await growth.joinWaitlist({ email: 'a@b.co', interest: 'maker', consent: true })
    await growth.joinWaitlist({ email: 'c@d.co', interest: 'maker', consent: true })
    assert.equal(await growth.waitingCount('maker'), 2)
    assert.isNull(await growth.waitingCount('seller'))
  })

  test('events carry no identity and the funnel groups them by source', async ({ assert }) => {
    await growth.track(
      'landing_view',
      { source: 'instagram', medium: 'social', campaign: null },
      '/for-makers'
    )
    await growth.track('landing_view', { source: 'instagram', medium: 'social', campaign: null })
    await growth.track('landing_view', null)
    const sample = await MarketingEvent.firstOrFail()
    const columns = Object.keys(sample.$attributes)
    for (const forbidden of ['userId', 'email', 'ip', 'ipAddress'])
      assert.notInclude(columns, forbidden)

    const funnel = await growth.funnel(30)
    const instagram = funnel.find((f) => f.source === 'instagram')!
    assert.equal(instagram.counts.landing_view, 2)
    assert.equal(funnel.find((f) => f.source === '(direct)')!.counts.landing_view, 1)
  })

  test('signup stores the first touch; a paid order is credited to it', async ({ assert }) => {
    const user = await createUser('new')
    await growth.creditSignup(user, { source: 'google.com', medium: 'referral', campaign: null })
    assert.equal(user.firstTouchSource, 'google.com')
    assert.deepEqual(growth.firstTouchOf(user), {
      source: 'google.com',
      medium: 'referral',
      campaign: null,
    })

    const provider = new FakePaymentProvider('s')
    const payments = new PaymentService(provider, async () => {})
    const { order } = await createDraftOrder(user)
    await payments.startCheckout(order.id, user.id)
    const evt = provider.signedEvent({
      type: 'payment.succeeded',
      providerRef: provider.checkouts[provider.checkouts.length - 1].providerRef,
      amountMinor: order.totalMinor,
    })
    await payments.handleWebhook(evt.body, evt.headers)

    const paid = await MarketingEvent.query().where('name', 'order_paid')
    assert.lengthOf(paid, 1)
    assert.equal(paid[0].source, 'google.com')
  })
})
