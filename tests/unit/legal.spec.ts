import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import env from '#start/env'
import Consent from '#models/consent'
import LegalService, {
  ACCEPTANCE_VERSION,
  LEGAL_DOCS,
  renderLegalMarkdown,
} from '#services/legal/legal_service'
import { createUser } from '#tests/helpers/order_fixtures'

test.group('legal documents (R1-T6)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  const service = new LegalService()

  test('every document renders and is marked as a draft', async ({ assert }) => {
    for (const doc of LEGAL_DOCS) {
      const html = await service.html(doc.slug)
      assert.isString(html)
      assert.include(html!, '<h1>')
      assert.include(html!, 'DRAFT')
    }
    assert.isNull(await service.html('nope'))
  })

  test('the renderer escapes HTML instead of passing it through', ({ assert }) => {
    const html = renderLegalMarkdown('# Title\n\n<script>alert(1)</script> **bold**\n- one\n- two')
    assert.notInclude(html, '<script>')
    assert.include(html, '&lt;script&gt;')
    assert.include(html, '<strong>bold</strong>')
    assert.include(html, '<ul><li>one</li><li>two</li></ul>')
  })

  test('acceptance is only enforced when switched on, and then recorded with the version', async ({
    assert,
  }) => {
    const user = await createUser('buyer')
    await service.requireAcceptance(user.id, undefined) // off by default: no error, no record
    assert.lengthOf(await Consent.query().where('userId', user.id), 0)

    env.set('LEGAL_ACCEPTANCE_REQUIRED', true)
    try {
      await assert.rejects(() => service.requireAcceptance(user.id, false), /accept the terms/)
      await service.requireAcceptance(user.id, true)
      const rows = await Consent.query().where('userId', user.id)
      assert.lengthOf(rows, 1)
      assert.equal(rows[0].version, ACCEPTANCE_VERSION)
      assert.isTrue(rows[0].granted)
    } finally {
      env.set('LEGAL_ACCEPTANCE_REQUIRED', false)
    }
  })
})
