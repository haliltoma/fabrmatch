import { test } from '@japa/runner'
import ContentService, { parseFrontMatter } from '#services/content/content_service'
import { renderLegalMarkdown } from '#services/legal/legal_service'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

test.group('blog and glossary', () => {
  test('front matter is parsed and the body is separated', ({ assert }) => {
    const { meta, body } = parseFrontMatter('---\ntitle: A: b\ndate: 2026-01-01\n---\n# Hi\n')
    assert.equal(meta.title, 'A: b')
    assert.equal(meta.date, '2026-01-01')
    assert.equal(body, '# Hi\n')
  })

  test('markdown links stay on the site and raw html is escaped', ({ assert }) => {
    const html = renderLegalMarkdown(
      'See [guide](/blog/x) and [bad](javascript:alert(1)) and [ext](https://evil.test) <b>x</b>'
    )
    assert.include(html, '<a href="/blog/x">guide</a>')
    assert.notInclude(html, 'href="javascript')
    assert.notInclude(html, 'href="https://evil.test"')
    assert.notInclude(html, '<b>')
  })

  test('every article has the required header and every internal link resolves', async ({
    assert,
  }) => {
    const service = new ContentService()
    const posts = await service.list('blog')
    const terms = await service.list('glossary')
    assert.isAtLeast(posts.length, 10)
    assert.isAtLeast(terms.length, 10)
    const known = new Set([
      ...posts.map((p) => `/blog/${p.slug}`),
      ...terms.map((t) => `/glossary/${t.slug}`),
      '/tools/quick-quote',
      '/tools/maker-income',
      '/for-makers',
      '/for-sellers',
      '/glossary',
      '/blog',
      '/legal/refunds',
    ])
    for (const entry of [...posts, ...terms]) {
      const full = await service.find(entry.kind, entry.slug)
      assert.isNotNull(full)
      for (const [, href] of full!.html.matchAll(/href="([^"]+)"/g)) {
        assert.isTrue(known.has(href), `${entry.slug} links to unknown ${href}`)
      }
    }
  })

  test('pages are public, 404 on unknown or unsafe slugs, and the sitemap lists them', async ({
    client,
    assert,
  }) => {
    const index = await client.get('/blog').headers(inertia)
    index.assertStatus(200)
    const { entries } = index.body().props
    assert.isAtLeast(entries.length, 10)

    const post = await client.get('/blog/stl-nedir').headers(inertia)
    post.assertStatus(200)
    assert.include(post.body().props.jsonLd, '"@type":"Article"')
    assert.include(post.body().props.jsonLd, '"@type":"BreadcrumbList"')

    const term = await client.get('/glossary/fdm').headers(inertia)
    term.assertStatus(200)
    assert.include(term.body().props.jsonLd, 'DefinedTerm')

    const missing = await client.get('/blog/nope').headers(inertia)
    missing.assertStatus(404)
    const traversal = await client.get('/blog/..%2f..%2fpackage').headers(inertia)
    traversal.assertStatus(404)

    const sitemap = await client.get('/sitemap.xml')
    assert.include(sitemap.text(), '/blog/stl-nedir')
    assert.include(sitemap.text(), '/glossary/fdm')
  })
})
