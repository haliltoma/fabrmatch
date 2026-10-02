import { test } from '@japa/runner'
import { descriptionHtml } from '#services/integrations/stores/store_adapter'
import { createSellerProductValidator } from '#validators/seller_product'

test.group('text and numbers sent to shops', () => {
  test('a description is escaped HTML with its line breaks kept', ({ assert }) => {
    assert.equal(
      descriptionHtml('Big & bold\n<script>alert("x")</script>'),
      'Big &amp; bold<br>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    )
  })

  test('a margin is whole basis points and the currency one we take', async ({ assert }) => {
    await assert.rejects(() =>
      createSellerProductValidator.validate({ title: 'Vase', marginBps: 1500.5 })
    )
    await assert.rejects(() =>
      createSellerProductValidator.validate({ title: 'Vase', currency: 'XYZ' })
    )
    const ok = await createSellerProductValidator.validate({
      title: 'Vase',
      marginBps: 1500,
      currency: 'EUR',
    })
    assert.equal(ok.marginBps, 1500)
  })
})
