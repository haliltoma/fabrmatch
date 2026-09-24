/* eslint-disable @unicorn/no-await-expression-member -- terse assertions read better inline */
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import fabrmatchConfig from '#config/fabrmatch'
import Coupon from '#models/coupon'
import Referral from '#models/referral'
import User from '#models/user'
import ReferralService from '#services/growth/referral_service'
import { createUser } from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }
const flags = fabrmatchConfig.flags as Record<string, number>

const signup = (email: string) => ({
  fullName: 'New Friend',
  email,
  password: 'password123',
  passwordConfirmation: 'password123',
})

test.group('invite a friend over HTTP', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.teardown(() => {
    flags.referrals = 0
  })

  test('the page and the menu entry do not exist while the program is off', async ({
    client,
    assert,
  }) => {
    const user = await createUser('member')
    ;(await client.get('/account/referrals').loginAs(user)).assertStatus(404)
    const home = await client.get('/').headers(inertia).loginAs(user)
    assert.isFalse(home.body().props.referralsEnabled)
  })

  test('a member sees a stable link, counts and their coupons', async ({ client, assert }) => {
    flags.referrals = 1
    const user = await createUser('member')
    const page = await client.get('/account/referrals').headers(inertia).loginAs(user)
    page.assertStatus(200)
    const { code, link, invited, rewarded, coupons } = page.body().props
    assert.match(link, new RegExp(`/signup\\?ref=${code}$`))
    assert.deepEqual([invited, rewarded, coupons], [0, 0, []])

    const again = await client.get('/account/referrals').headers(inertia).loginAs(user)
    assert.equal(again.body().props.code, code)
  })

  test('signing up through an invite links the accounts and shows the gift code once', async ({
    client,
    assert,
  }) => {
    flags.referrals = 1
    const referrer = await createUser('referrer')
    const code = await new ReferralService().codeFor(referrer)

    const signupPage = await client.get('/signup').headers(inertia).withSession({ referral: code })
    assert.isTrue(signupPage.body().props.invited)

    const response = await client
      .post('/signup')
      .withCsrfToken()
      .headers(inertia)
      .withSession({ referral: code })
      .redirects(0)
      .json(signup('friend@example.com'))
    response.assertStatus(302)

    const friend = await User.findByOrFail('email', 'friend@example.com')
    const link = await Referral.findByOrFail('refereeId', friend.id)
    assert.equal(link.referrerId, referrer.id)
    const gift = await Coupon.findOrFail(link.refereeCouponId!)
    assert.equal(gift.userId, friend.id)
  })

  test('a broken or unknown invite never blocks signing up', async ({ client, assert }) => {
    flags.referrals = 1
    for (const [i, ref] of ['ZZZZ2222', 'garbage'].entries()) {
      const response = await client
        .post('/signup')
        .withCsrfToken()
        .headers(inertia)
        .withSession({ referral: ref })
        .redirects(0)
        .json(signup(`late${i}@example.com`))
      response.assertStatus(302)
      assert.isNotNull(await User.findBy('email', `late${i}@example.com`))
    }
    assert.lengthOf(await Referral.all(), 0)
  })

  test('with the program off an invite link changes nothing', async ({ client, assert }) => {
    const referrer = await createUser('referrer')
    const code = await new ReferralService().codeFor(referrer)
    const response = await client
      .post('/signup')
      .withCsrfToken()
      .headers(inertia)
      .withSession({ referral: code })
      .redirects(0)
      .json(signup('off@example.com'))
    response.assertStatus(302)
    assert.lengthOf(await Referral.all(), 0)
    assert.lengthOf(await Coupon.all(), 0)
  })
})
