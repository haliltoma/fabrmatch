import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import drive from '@adonisjs/drive/services/main'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DateTime } from 'luxon'
import ProductionJob from '#models/production_job'
import SellerProfile from '#models/seller_profile'
import { encodePng } from '#services/files/model_renderer'
import { logoType } from '#services/fulfillment/branding_service'
import OrderService from '#services/orders/order_service'
import OrderStateMachine from '#services/orders/order_state_machine'
import RoleService from '#services/identity/role_service'
import {
  TR_ADDRESS,
  createManufacturer,
  createPrinter,
  createStorefrontProduct,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

async function file(name: string, content: Buffer | string) {
  const dir = await mkdtemp(join(tmpdir(), 'logo-'))
  const path = join(dir, name)
  await writeFile(path, content)
  return path
}

const PNG = encodePng(new Uint8Array(4 * 4 * 4).fill(200), 4, 4)

test.group('seller logo on the packing card (R4-T13)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())
  group.each.setup(() => {
    drive.fake('s3')
    return () => drive.restore('s3')
  })

  test('the type comes from the bytes: PNG/JPEG/WebP yes, SVG and fakes no', ({ assert }) => {
    assert.equal(logoType(PNG)?.contentType, 'image/png')
    assert.equal(logoType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))?.contentType, 'image/jpeg')
    assert.isNull(logoType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')))
    assert.isNull(logoType(Buffer.from('not an image.png')))
  })

  test('a seller uploads, previews and removes a logo; bad files are refused', async ({
    client,
    assert,
  }) => {
    const shop = await createStorefrontProduct()
    const upload = (path: string) =>
      client
        .post('/seller/branding/logo')
        .loginAs(shop.sellerUser)
        .withCsrfToken()
        .headers(inertia)
        .redirects(0)
        .file('logo', path)

    const svg = await upload(await file('logo.svg', '<svg onload="alert(1)"></svg>'))
    svg.assertStatus(302)
    let profile = await SellerProfile.findByOrFail('userId', shop.sellerUser.id)
    assert.isNull(profile.logoKey)

    await upload(await file('logo.png', PNG))
    profile = await SellerProfile.findByOrFail('userId', shop.sellerUser.id)
    assert.match(profile.logoKey ?? '', /^branding\/[0-9a-f-]{36}\/.+\.png$/)

    const page = await client.get('/seller/branding').headers(inertia).loginAs(shop.sellerUser)
    assert.isTrue(page.body().props.hasLogo)
    const preview = await client.get('/seller/branding/logo').loginAs(shop.sellerUser)
    preview.assertStatus(200)
    preview.assertHeader('content-type', 'image/png')

    const oldKey = profile.logoKey!
    await client
      .post('/seller/branding/logo/remove')
      .loginAs(shop.sellerUser)
      .withCsrfToken()
      .headers(inertia)
    profile = await SellerProfile.findByOrFail('userId', shop.sellerUser.id)
    assert.isNull(profile.logoKey)
    assert.isFalse(await drive.use('s3').exists(oldKey))
  })

  test('the packing card embeds the logo for a shop order', async ({ client, assert }) => {
    const shop = await createStorefrontProduct()
    await client
      .post('/seller/branding/logo')
      .loginAs(shop.sellerUser)
      .withCsrfToken()
      .headers(inertia)
      .file('logo', await file('logo.png', PNG))

    const order = await new OrderService().createStorefrontDraft(
      await createUser('buyer'),
      shop.product.id,
      { material: 'PLA', quantity: 1, shippingAddress: TR_ADDRESS }
    )
    const sm = new OrderStateMachine()
    for (const to of ['awaiting_payment', 'paid', 'matching'] as const) {
      await sm.transition(order.id, to)
    }
    const maker = await createManufacturer()
    await new RoleService().assignRole(maker.user, 'manufacturer')
    const printer = await createPrinter(maker.profile)
    const job = await ProductionJob.create({
      orderId: order.id,
      manufacturerProfileId: maker.profile.id,
      printerId: printer.id,
      status: 'accepted',
      acceptedAt: DateTime.now(),
      dueAt: DateTime.now().plus({ days: 5 }),
    })
    await sm.transition(order.id, 'in_production')

    const slip = await client.get(`/maker/jobs/${job.id}/packing-slip`).loginAs(maker.user)
    slip.assertStatus(200)
    assert.include(slip.text(), 'src="data:image/png;base64,')
    assert.notInclude(slip.text(), 'branding/', 'no storage path reaches the maker')
  })
})
