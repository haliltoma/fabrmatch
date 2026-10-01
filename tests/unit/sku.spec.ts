import { test } from '@japa/runner'
import { fabrmatchSku, skuKey } from '#services/integrations/stores/store_adapter'

test.group('shop SKUs', () => {
  test('fit Etsy’s 32-character limit for every material, and carry the product key', ({
    assert,
  }) => {
    const id = '01a0f67a-dccf-7ac1-bc9e-e5f0df6f32d3'
    for (const material of ['PLA', 'PETG', 'ABS', 'TPU', 'NYLON', 'RESIN']) {
      const sku = fabrmatchSku(id, material)
      assert.isAtMost(sku.length, 32, sku)
      assert.match(sku, /^FM-[0-9A-F]{12}-[A-Z]+$/)
    }
    assert.equal(skuKey(id), 'E5F0DF6F32D3')
  })
})
