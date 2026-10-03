import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import fabrmatchConfig from '#config/fabrmatch'
import ModerationEvent from '#models/moderation_event'
import Order from '#models/order'
import RoleService from '#services/identity/role_service'
import { orderWorkLines } from '#services/pricing/maker_market'
import {
  TR_ADDRESS,
  createManufacturer,
  createPrinter,
  createStorefrontProduct,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

async function buyer() {
  const user = await createUser('buyer')
  await new RoleService().assignRole(user, 'seller')
  return user
}

test.group('colours are the buyer’s choice (Paket Y)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('the product page offers every catalogue colour and prices extra ones', async ({
    client,
    assert,
  }) => {
    // the only maker stocks black: the page still offers every colour
    const { profile } = await createManufacturer()
    await createPrinter(profile, { material: 'PLA', colors: ['black'] })
    const shop = await createStorefrontProduct({ materials: ['PLA'] })
    const page = await client.get(`/shop/${shop.product.id}/desk-organizer`).headers(inertia)
    const { colours, maxColours, options } = page.body().props.product
    const names = colours.map((c: { name: string }) => c.name)
    assert.includeMembers(names, ['Black', 'Red', 'Blue', 'White'])
    assert.equal(maxColours, 4)

    const price = (colourCount: number) =>
      options.find(
        (o: { material: string; finishing: string | null; colourCount: number }) =>
          o.material === 'PLA' && o.finishing === null && o.colourCount === colourCount
      ).unitPriceMinor
    assert.isAbove(price(2), price(1))
    assert.isAbove(price(4), price(3))
  })

  test('an order keeps the colours and their parts; extra colours go to the maker', async ({
    client,
    assert,
  }) => {
    const shop = await createStorefrontProduct()
    const user = await buyer()
    const order = (body: Record<string, unknown>) =>
      client
        .post(`/shop/${shop.product.id}/order`)
        .loginAs(user)
        .withCsrfToken()
        .headers(inertia)
        .redirects(0)
        .json({ material: 'PLA', quantity: 2, shippingAddress: TR_ADDRESS, ...body })

    const first = await order({ colours: [{ name: 'red' }] })
    first.assertStatus(302)
    const second = await order({
      colours: [
        { name: 'Red', part: 'head' },
        { name: 'blue', part: 'body' },
      ],
      buyerNote: 'Matte finish if you can',
    })
    second.assertStatus(302)

    const [single, multi] = await Order.query()
      .where('buyerId', user.id)
      .preload('items')
      .orderBy('id', 'asc')
    assert.deepEqual(single.items[0].colours, [{ name: 'Red', part: null }])
    assert.equal(single.items[0].color, 'red', 'the first colour, as matching reads it')
    assert.equal(single.items[0].colourExtraMinor, 0)

    const item = multi.items[0]
    assert.deepEqual(item.colours, [
      { name: 'Red', part: 'head' },
      { name: 'Blue', part: 'body' },
    ])
    assert.equal(item.colourExtraMinor, fabrmatchConfig.pricing.extraColourMinor)
    assert.equal(item.buyerNote, 'Matte finish if you can')
    assert.isAbove(multi.totalMinor, single.totalMinor)
    assert.isAbove(item.manufacturerShareMinor, single.items[0].manufacturerShareMinor)
    const [line] = orderWorkLines({ items: [item] })
    assert.equal(
      line.finishingMinor,
      fabrmatchConfig.pricing.extraColourMinor * 2,
      'the maker floor counts the extra colour on every piece'
    )
  })

  test('unknown colours, too many colours and contact details in a part name are refused', async ({
    client,
    assert,
  }) => {
    const shop = await createStorefrontProduct()
    const user = await buyer()
    const order = (body: Record<string, unknown>) =>
      client
        .post(`/shop/${shop.product.id}/order`)
        .loginAs(user)
        .withCsrfToken()
        .header('accept', 'application/json')
        .json({ material: 'PLA', quantity: 1, shippingAddress: TR_ADDRESS, ...body })

    const unknown = await order({ colours: [{ name: 'Chartreuse' }] })
    unknown.assertStatus(422)
    assert.match(unknown.body().error, /not one of our colours/)
    const twice = await order({ colours: [{ name: 'Red' }, { name: 'red' }] })
    twice.assertStatus(422)
    const five = ['Red', 'Blue', 'Green', 'Black', 'White'].map((name) => ({ name }))
    const tooMany = await order({ colours: five })
    tooMany.assertStatus(422)

    const leak = await order({ colours: [{ name: 'Red', part: 'call 0532 111 22 33' }] })
    leak.assertStatus(422)
    assert.match(leak.body().error, /contact details/)
    const note = await order({ colours: [{ name: 'Red' }], buyerNote: 'mail me a@b.com' })
    note.assertStatus(422)

    assert.lengthOf(await Order.query().where('buyerId', user.id), 0)
    const attempts = await ModerationEvent.query().where('userId', user.id)
    assert.lengthOf(attempts, 2)
    assert.equal(attempts[0].context, 'buyer_note')
  })
})
