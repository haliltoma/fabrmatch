import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import Dispute from '#models/dispute'
import DisputeEvidence from '#models/dispute_evidence'
import DisputeTransformer from '#transformers/dispute_transformer'
import { maskedText } from '#services/messaging/contact_filter'

function dispute() {
  const d = new Dispute()
  d.merge({
    id: 1,
    orderId: 2,
    openedBy: 10,
    status: 'responded',
    reason: 'Broken. Call me: 0532 123 45 67 or ali@example.com',
    manufacturerResponse: 'Sorry! WhatsApp me on +90 555 111 22 33, Atölye',
    resolution: null,
    refundMinor: 0,
    adminNote: null,
  })
  d.createdAt = DateTime.now()
  const e = new DisputeEvidence()
  e.merge({ id: 5, uploaderId: 10, note: 'see instagram @ali.workshop', storageKey: 'x' })
  e.createdAt = DateTime.now()
  d.$setRelated('evidence', [e])
  return d
}

test.group('dispute and review text is masked for the other side (review fix)', () => {
  test('buyer and maker views hide contact details; admin sees the original', async ({
    assert,
  }) => {
    const buyer = new DisputeTransformer(dispute()).toObject()
    const maker = new DisputeTransformer(dispute()).forManufacturer()
    for (const view of [buyer, maker]) {
      const text = JSON.stringify(view)
      assert.notInclude(text, '0532')
      assert.notInclude(text, 'ali@example.com')
      assert.notInclude(text, '555 111')
      assert.notInclude(text, '@ali.workshop')
      assert.include(text, '[hidden]')
    }
    assert.include(maker.reason, 'Broken')

    const admin = new DisputeTransformer(dispute()).forAdmin()
    assert.include(admin.reason, '0532', 'the admin sees what was typed')
    assert.include(admin.manufacturerResponse!, '555 111')
  })

  test('maskedText keeps null and harmless text as is', ({ assert }) => {
    assert.isNull(maskedText(null))
    assert.equal(maskedText('Great print, thanks'), 'Great print, thanks')
    assert.notInclude(maskedText('mail me at x@y.com')!, 'x@y.com')
  })
})
