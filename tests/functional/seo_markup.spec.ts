import { test } from '@japa/runner'
import env from '#start/env'

test.group('home page markup', () => {
  test('the html lang follows the visitor language', async ({ client, assert }) => {
    const tr = await client
      .get('/')
      .header('accept-language', 'tr-TR,tr;q=0.9')
      .header('accept', 'text/html')
    tr.assertStatus(200)
    assert.include(tr.text(), '<html lang="tr"')
    const en = await client
      .get('/')
      .header('accept-language', 'en-US')
      .header('accept', 'text/html')
    assert.include(en.text(), '<html lang="en"')
  })

  test('the site URL is shared with every page (used for structured data)', async ({
    client,
    assert,
  }) => {
    const base = env.get('APP_URL').replace(/\/$/, '')
    const page = await client
      .get('/')
      .header('x-inertia', 'true')
      .header('x-inertia-version', '1')
      .header('accept', 'application/json')
    assert.equal(page.body().props.siteUrl, base)
  })
})
