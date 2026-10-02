import { test } from '@japa/runner'
import { descriptionHtml } from '#services/integrations/stores/store_adapter'
import { createSellerProductValidator } from '#validators/seller_product'

const ID = '01a0f67a-dccf-7ac1-bc9e-e5f0df6f32d3'

test.group('text and numbers sent to shops', () => {
  test('a description is escaped HTML with its line breaks kept', ({ assert }) => {
    assert.equal(
      descriptionHtml('Big & bold\n<script>alert("x")</script>'),
      'Big &amp; bold<br>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    )
  })

  test('a margin is whole basis points and the currency one we take', async ({ assert }) => {
    await assert.rejects(() =>
      createSellerProductValidator.validate({
        catalogProductId: ID,
        title: 'Vase',
        marginBps: 1500.5,
      })
    )
    await assert.rejects(() =>
      createSellerProductValidator.validate({
        catalogProductId: ID,
        title: 'Vase',
        currency: 'XYZ',
      })
    )
    const ok = await createSellerProductValidator.validate({
      catalogProductId: ID,
      title: 'Vase',
      marginBps: 1500,
      currency: 'EUR',
    })
    assert.equal(ok.marginBps, 1500)
  })
})
