import { test } from '@japa/runner'
import { execFileSync } from 'node:child_process'
import { translateValidationMessage } from '#services/i18n/validation_messages'
import LegalService from '#services/legal/legal_service'
import { analyzeDfm } from '#services/files/dfm_analyzer'
import { NOTIFICATION_TYPES, render } from '#services/notifications/catalog'
import { uid } from '#tests/helpers/ids'

test.group('i18n', () => {
  test('every t() key used in the UI has a Turkish dictionary entry', ({ assert }) => {
    const report = execFileSync('node', ['scripts/i18n_check.mjs'], { encoding: 'utf8' })
    const missing = report.split('t() keys missing from the Turkish dictionary:')[1] ?? ''
    assert.match(missing.trim().split('\n')[0], /^0$/, missing)
  })

  test('validation messages are translated for Turkish and left alone for English', ({
    assert,
  }) => {
    assert.equal(
      translateValidationMessage('tr', 'The email field must be a valid email address'),
      'e-posta alanı geçerli bir e-posta adresi olmalıdır'
    )
    assert.equal(
      translateValidationMessage('tr', 'The password field must have at least 8 characters'),
      'parola alanı en az 8 karakter olmalıdır'
    )
    assert.equal(
      translateValidationMessage('en', 'The email field is required'),
      'The email field is required'
    )
    assert.equal(translateValidationMessage('tr', 'Something unknown'), 'Something unknown')
  })

  test('legal documents come in Turkish, and English is the fallback', async ({ assert }) => {
    const service = new LegalService()
    assert.include((await service.html('terms', 'tr')) ?? '', 'Kullanım koşulları')
    assert.include((await service.html('terms', 'en')) ?? '', 'Terms of use')
  })
})

test.group('notifications in Turkish', () => {
  test('templates render in Turkish with the same facts and no identity leak', ({ assert }) => {
    const c = { code: 'FO-1', orderId: uid(7), amountMinor: 1250, currency: 'TRY' }
    const en = render('refund_issued', 'buyer', c, 'en')!
    const tr = render('refund_issued', 'buyer', c, 'tr')!
    assert.include(en.title, '12.50 TRY')
    assert.include(tr.title, '12.50 TRY')
    assert.include(tr.body, 'FO-1')
    assert.equal(tr.link, en.link)
    assert.isNull(render('order_in_production', 'maker', c, 'tr'))
  })

  test('every type and role renders in both languages or in neither', ({ assert }) => {
    const c = {
      code: 'FO-1',
      orderId: uid(7),
      rfqCode: 'RFQ-1',
      rfqId: uid(3),
      resolution: 'full_refund',
    }
    for (const type of NOTIFICATION_TYPES) {
      for (const role of ['buyer', 'seller', 'maker', 'admin'] as const) {
        const en = render(type, role, c, 'en')
        const tr = render(type, role, c, 'tr')
        assert.equal(tr === null, en === null, `${type}/${role}`)
      }
    }
  })
})

test.group('DFM warnings in Turkish', (group) => {
  let translated: (message: string) => boolean
  group.setup(async () => {
    const url = new URL('../../inertia/lib/i18n/patterns.ts', import.meta.url).href
    const { trPatterns } = (await import(url)) as { trPatterns: Array<[RegExp, unknown]> }
    translated = (message) => trPatterns.some(([re]) => re.test(message))
  })

  test('analyzer messages that embed numbers all have a Turkish pattern', ({ assert }) => {
    const issues = [
      ...analyzeDfm([], { signedVolume: 1, bbox: [0.4, 30, 30] }),
      ...analyzeDfm([], { signedVolume: 1, bbox: [1.5, 30, 30] }),
      ...analyzeDfm([], { signedVolume: 1, bbox: [3, 4, 5] }),
    ]
    assert.isAbove(issues.length, 0)
    for (const issue of issues) assert.isTrue(translated(issue.message), issue.message)
    for (const message of [
      'Quantity must be between 1 and 1000',
      'Unsupported file format: obj2. Allowed: STL, 3MF, OBJ',
      'About 40% of the surface overhangs by more than 45°. It will need supports, which adds print time and rough surfaces.',
      'Printing it with its Y axis pointing up would cut the overhang from about 40% to 5%, so it needs fewer supports. Re-export the model in that orientation, or ask the maker to rotate it.',
      '3 tiny loose fragments not attached to the model. Remove them or they may print as debris.',
      'The file contains 2 separate parts; they print together on one plate.',
    ]) {
      assert.isTrue(translated(message), message)
    }
  })
})
