import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { PRIVATE_PREFIXES } from '#services/marketing/seo_service'
import { FAQ } from '#services/support/faq'

test.group('files for crawlers', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('robots.txt allows public pages, blocks every private area and names the sitemap', async ({
    client,
    assert,
  }) => {
    const res = await client.get('/robots.txt')
    res.assertStatus(200)
    const text = res.text()
    assert.include(text, 'Allow: /\n')
    for (const prefix of PRIVATE_PREFIXES) assert.include(text, `Disallow: ${prefix}\n`)
    assert.match(text, /Sitemap: .+\/sitemap\.xml/)
    // AI crawlers are not singled out and blocked
    assert.notMatch(text, /User-agent: (GPTBot|ClaudeBot|PerplexityBot)/)
  })

  test('the sitemap lists both language versions of UI pages, one version of Turkish content', async ({
    client,
    assert,
  }) => {
    const res = await client.get('/sitemap.xml')
    res.assertStatus(200)
    const xml = res.text()
    assert.include(xml, 'xmlns:xhtml="http://www.w3.org/1999/xhtml"')
    assert.match(xml, /<loc>[^<]+\/shop<\/loc>/)
    assert.match(xml, /<loc>[^<]+\/shop\?lang=tr<\/loc>/)
    assert.include(xml, 'hreflang="x-default"')
    // blog posts are written in one language: no ?lang=tr copy
    assert.notMatch(xml, /\/blog\/[^<"]+\?lang=tr/)
    for (const prefix of PRIVATE_PREFIXES) assert.notInclude(xml, `${prefix}/`)
  })

  test('llms.txt briefs AI assistants with the real rules and every FAQ answer', async ({
    client,
    assert,
  }) => {
    const res = await client.get('/llms.txt')
    res.assertStatus(200)
    const text = res.text()
    assert.match(text, /^# Fabrmatch\n\n> /)
    assert.include(text, '/tools/quick-quote')
    for (const item of FAQ) assert.include(text, `### ${item.q}`)
    // placeholders are filled in, never left as {days}
    assert.notMatch(text, /\{\w+\}/)
  })

  test('?lang=tr serves a page in Turkish without a cookie', async ({ client, assert }) => {
    const res = await client
      .get('/help?lang=tr')
      .header('x-inertia', 'true')
      .header('x-inertia-version', '1')
    res.assertStatus(200)
    assert.equal(res.body().props.locale, 'tr')
  })
})

test.group('language switch', () => {
  test('returns to the same page without a ?lang= that would override the new choice', async ({
    client,
  }) => {
    const res = await client
      .post('/language')
      .withCsrfToken()
      .header('referer', `http://${process.env.HOST}:${process.env.PORT}/materials?lang=tr&x=1`)
      .form({ lang: 'en' })
      .redirects(0)
    res.assertStatus(302)
    res.assertHeader('location', '/materials?x=1')
  })

  test('never redirects to another site', async ({ client }) => {
    const res = await client
      .post('/language')
      .withCsrfToken()
      .header('referer', 'https://evil.example/phish')
      .form({ lang: 'tr' })
      .redirects(0)
    res.assertHeader('location', '/')
  })
})
