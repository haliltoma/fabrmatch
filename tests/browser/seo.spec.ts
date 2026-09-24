import { test } from '@japa/runner'
import env from '#start/env'

test.group('structured data (browser)', () => {
  test('the home page describes the organisation and the site search on our own URL', async ({
    visit,
    assert,
  }) => {
    const base = env.get('APP_URL').replace(/\/$/, '')
    const page = await visit('/')
    await page.getByRole('heading', { level: 1 }).first().waitFor()
    const blocks = await page.locator('script[type="application/ld+json"]').allInnerTexts()
    const data = blocks.flatMap((b) => JSON.parse(b))
    const types = data.map((d: { '@type': string }) => d['@type'])
    assert.includeMembers(types, ['Organization', 'WebSite'])
    const site = data.find((d: { '@type': string }) => d['@type'] === 'WebSite')
    assert.equal(site.potentialAction.target, `${base}/shop?q={search_term_string}`)
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), `${base}/`)
  })
})
