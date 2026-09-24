/* eslint-disable @unicorn/no-await-expression-member -- terse assertions read better inline */
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import FinishingOption from '#models/finishing_option'
import CartItem from '#models/cart_item'
import RoleService from '#services/identity/role_service'
import FinishingService from '#services/catalog/finishing_service'
import {
  createAnalyzedFile,
  createManufacturer,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

async function member() {
  const user = await createUser('member')
  await new RoleService().assignRole(user, 'seller')
  return user
}

test.group('finishing over HTTP', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('an admin adds an option in display units and changes its price; others cannot', async ({
    client,
    assert,
  }) => {
    const admin = await createUser('admin')
    await new RoleService().assignRole(admin, 'admin')
    const post = (path: string, body: object, as = admin) =>
      client.post(path).loginAs(as).withCsrfToken().headers(inertia).redirects(0).json(body)

    ;(
      await post('/admin/finishing', {
        code: 'gloss',
        name: 'Gloss coat',
        price: 42.5,
        materials: 'pla, petg',
      })
    ).assertStatus(302)
    const created = await FinishingOption.findByOrFail('code', 'GLOSS')
    assert.equal(created.priceMinor, 4250)
    assert.deepEqual(created.materials, ['PLA', 'PETG'])

    ;(await post(`/admin/finishing/${created.id}`, { price: 50 })).assertStatus(302)
    assert.equal((await FinishingOption.findOrFail(created.id)).priceMinor, 5000)
    ;(await post(`/admin/finishing/${created.id}`, { isActive: false })).assertStatus(302)
    assert.isFalse((await FinishingOption.findOrFail(created.id)).isActive)

    const page = await client.get('/admin/finishing').headers(inertia).loginAs(admin)
    page.assertStatus(200)
    assert.isAtLeast(page.body().props.options.length, 5)

    const buyer = await member()
    ;(
      await client
        .post('/admin/finishing')
        .loginAs(buyer)
        .withCsrfToken()
        .header('accept', 'application/json')
        .json({ code: 'HACK', name: 'Hack', price: 1 })
    ).assertStatus(403)
  })

  test('a maker saves which finishings they offer', async ({ client, assert }) => {
    const { user, profile } = await createManufacturer()
    await new RoleService().assignRole(user, 'manufacturer')
    const options = await new FinishingService().list({ activeOnly: true })

    const page = await client.get('/maker/finishing').headers(inertia).loginAs(user)
    page.assertStatus(200)
    assert.deepEqual(page.body().props.offered, [])

    const save = await client
      .post('/maker/finishing')
      .loginAs(user)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ optionIds: [options[0].id] })
    save.assertStatus(302)
    assert.deepEqual(await new FinishingService().offeredBy(profile.id), [options[0].id])

    const buyer = await member()
    ;(await client.get('/maker/finishing').loginAs(buyer)).assertStatus(403)
  })

  test('the quote page lists options, the price includes the chosen finishing, and a bad one is refused', async ({
    client,
    assert,
  }) => {
    const user = await member()
    const file = await createAnalyzedFile(user, 9000)
    const page = await client.get(`/files/${file.id}/quote`).headers(inertia).loginAs(user)
    assert.include(
      page.body().props.finishings.map((f: { code: string }) => f.code),
      'SAND'
    )

    const quote = (finishing?: string, material = 'PLA') =>
      client
        .post(`/files/${file.id}/quote`)
        .loginAs(user)
        .withCsrfToken()
        .header('accept', 'application/json')
        .json({ material, quantity: 2, finishing })
    const plain = await quote()
    const sanded = await quote('SAND')
    plain.assertStatus(200)
    sanded.assertStatus(200)
    const sand = await FinishingOption.findByOrFail('code', 'SAND')
    assert.equal(sanded.body().breakdown.finishingMinor, sand.priceMinor)
    assert.equal(plain.body().breakdown.finishingMinor, 0)
    assert.isAbove(sanded.body().breakdown.unitPriceMinor, plain.body().breakdown.unitPriceMinor)

    ;(await quote('NOPE')).assertStatus(422)
    ;(await quote('VAPOR', 'PLA')).assertStatus(422)
  })

  test('adding to the cart with a finishing keeps it on the line', async ({ client, assert }) => {
    const user = await member()
    const file = await createAnalyzedFile(user, 9000)
    const add = await client
      .post('/cart/items')
      .loginAs(user)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ modelFileId: file.id, material: 'PLA', quantity: 1, finishing: 'paint' })
    add.assertStatus(302)
    assert.equal((await CartItem.firstOrFail()).finishingCode, 'PAINT')

    const cart = await client.get('/cart').headers(inertia).loginAs(user)
    assert.equal(cart.body().props.lines[0].finishingName, 'Primed and painted')
  })
})
