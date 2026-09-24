import { test } from '@japa/runner'
import fabrmatchConfig from '#config/fabrmatch'
import OnboardingService from '#services/identity/onboarding_service'
import RoleService from '#services/identity/role_service'
import RfqBidService from '#services/rfq/rfq_bid_service'
import RfqService from '#services/rfq/rfq_service'
import {
  createAnalyzedFile,
  createManufacturer,
  createPrinter,
  createUser,
  resetDatabase,
} from '#tests/helpers/order_fixtures'

const SHOTS = process.env.SHOTS_DIR
const flags = fabrmatchConfig.flags as Record<string, number>

type Page = {
  getByLabel(name: string): { fill(value: string): Promise<void> }
  getByRole(role: 'button', options: { name: string }): { click(): Promise<void> }
  waitForURL(predicate: (url: URL) => boolean): Promise<void>
}
async function signIn(page: Page, email: string) {
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Log in' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'))
}

test.group('quote requests (browser)', (group) => {
  group.each.setup(() => resetDatabase())
  group.each.teardown(() => {
    flags.rfq = 0
  })

  test('buyer compares two anonymous offers, then a maker bids on the invitation', async ({
    visit,
    browserContext,
    assert,
  }) => {
    flags.rfq = 1
    const buyer = await createUser('corp')
    await new OnboardingService().createSellerProfile(buyer, {
      businessName: 'Corp Ltd',
      isCorporate: true,
    })
    const makers = []
    for (let i = 0; i < 2; i++) {
      const m = await createManufacturer()
      await new RoleService().assignRole(m.user, 'manufacturer')
      await createPrinter(m.profile, { slotMinutes: 200_000 })
      makers.push(m)
    }
    const file = await createAnalyzedFile(buyer, 8000)
    const rfq = await new RfqService().create(buyer, {
      modelFileId: file.id,
      title: 'Housing batch',
      material: 'PLA',
      quantity: 120,
      shipCountry: 'TR',
      bidDays: 4,
      maxLeadDays: 12,
    })
    await new RfqBidService().submit(rfq.id, makers[0].profile.id, {
      unitPriceMinor: 1500,
      leadDays: 6,
      note: 'Two printers free',
    })

    const page = await visit('/login')
    await signIn(page, buyer.email)
    const origin = page.url().split('/').slice(0, 3).join('/')
    await page.goto(`${origin}/rfqs/${rfq.id}`)
    await page.getByRole('heading', { name: 'Housing batch' }).waitFor()
    await page.getByText('Offer 1').waitFor()
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/rfq-buyer.png`, fullPage: true })
    assert.equal(await page.getByText(makers[0].profile.publicAlias).count(), 0)

    await browserContext.clearCookies()
    await page.goto(`${origin}/login`)
    await signIn(page, makers[1].user.email)
    await page.goto(`${origin}/maker/rfqs/${rfq.id}`)
    await page.getByRole('heading', { name: 'Housing batch' }).waitFor()
    await page.getByLabel('Price per unit (TRY)').fill('13.90')
    await page.getByLabel('Days to deliver').fill('7')
    await page.getByRole('button', { name: 'Send offer' }).click()
    await page.getByText('Offer sent.').first().waitFor()
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/rfq-maker.png`, fullPage: true })
  })
})
