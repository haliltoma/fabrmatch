import { test } from '@japa/runner'
import fabrmatchConfig from '#config/fabrmatch'
import ReferralService from '#services/growth/referral_service'
import { createUser, resetDatabase } from '#tests/helpers/order_fixtures'

const SHOTS = process.env.SHOTS_DIR
const flags = fabrmatchConfig.flags as Record<string, number>

test.group('invite a friend (browser)', (group) => {
  group.each.setup(() => resetDatabase())
  group.each.teardown(() => {
    flags.referrals = 0
  })

  test('a member finds their link and the friend’s gift after signing up through it', async ({
    visit,
    browserContext,
    assert,
  }) => {
    flags.referrals = 1
    const member = await createUser('member')
    const service = new ReferralService()
    const code = await service.codeFor(member)

    const page = await visit('/login')
    await page.getByLabel('Email').fill(member.email)
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Log in' }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'))
    const origin = page.url().split('/').slice(0, 3).join('/')
    await page.goto(`${origin}/account/referrals`)
    await page.getByRole('heading', { name: 'Invite a friend' }).waitFor()
    await page.getByText(`/signup?ref=${code}`).waitFor()
    await page.getByText('No coupons yet.').waitFor()
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/referrals.png`, fullPage: true })

    // a fresh visitor opens the invite link and signs up
    await browserContext.clearCookies()
    await page.goto(`${origin}/signup?ref=${code}`)
    await page.getByText('A friend invited you').waitFor()
    await page.getByLabel('Full name').fill('Ada Friend')
    await page.getByLabel('Email').fill('ada@example.com')
    await page.getByLabel('Password', { exact: true }).fill('password123')
    await page.getByLabel('Confirm password').fill('password123')
    await page.getByRole('button', { name: /sign up|create/i }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/signup'))
    await page.getByText(/Your invite gift code/).waitFor()
    assert.match(
      await page
        .getByText(/INV-[A-Z2-9]{8}/)
        .first()
        .innerText(),
      /INV-/
    )
  })
})
