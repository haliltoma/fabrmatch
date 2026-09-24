import { test } from '@japa/runner'
import { resetDatabase } from '#tests/helpers/order_fixtures'
import Lead from '#models/lead'

test.group('waitlist (browser)', (group) => {
  group.each.setup(() => resetDatabase())

  test('a maker joins the list from the landing page and sees the real count', async ({
    visit,
    assert,
  }) => {
    const page = await visit('/for-makers')
    await page.getByLabel('E-mail', { exact: true }).fill('maker.e2e@example.com')
    await page.getByLabel('City', { exact: true }).fill('Izmir')
    const submit = page.getByRole('button', { name: 'Join the maker list' })
    assert.isTrue(await submit.isDisabled(), 'the button waits for consent')
    await page.getByRole('checkbox').check()
    await submit.click()
    await page.getByText('1 maker already waiting for launch').waitFor()
    const lead = await Lead.firstOrFail()
    assert.equal(lead.email, 'maker.e2e@example.com')
    assert.equal(lead.city, 'Izmir')
  })
})

test.group('language switch (browser)', (group) => {
  group.each.setup(() => resetDatabase())

  test('switching to Turkish translates the shell and the choice sticks across pages', async ({
    visit,
    assert,
  }) => {
    const page = await visit('/')
    await page.getByRole('heading', { level: 1 }).waitFor()
    assert.include(await page.getByRole('heading', { level: 1 }).innerText(), 'Send a model')

    await page.getByRole('button', { name: 'tr', exact: true }).click()
    await page.getByText('Modeli gönder.').waitFor()
    assert.equal(await page.locator('html').getAttribute('lang'), 'tr')

    await page.goto(page.url().replace(/\/$/, '') + '/login')
    await page.getByText('Tekrar hoş geldin').waitFor()
  })
})
