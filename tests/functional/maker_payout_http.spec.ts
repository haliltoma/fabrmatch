/* eslint-disable @unicorn/no-await-expression-member -- terse assertions read better inline */
import { test } from '@japa/runner'
import drive from '@adonisjs/drive/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import AuditLog from '#models/audit_log'
import ManufacturerProfile from '#models/manufacturer_profile'
import PayeeTaxProfile from '#models/payee_tax_profile'
import Payout from '#models/payout'
import PayoutDocument from '#models/payout_document'
import EncryptionService from '#services/identity/encryption_service'
import RoleService from '#services/identity/role_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import PayoutService from '#services/payments/payout_service'
import {
  approvePayee,
  createFundedOrder,
  createManufacturer,
  createUser,
} from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }
const PDF = Buffer.from('%PDF-1.4 certificate')
const details = {
  taxStatus: 'company',
  legalName: 'Baskı Atölyesi Ltd. Şti.',
  taxNumber: '1234567890',
  taxOffice: 'Kadıköy',
  address: 'Moda Cd. 10, Kadıköy, İstanbul',
  iban: 'TR33 0006 1005 1978 6457 8413 26',
}

async function maker() {
  const { user, profile } = await createManufacturer()
  await new RoleService().assignRole(user, 'manufacturer')
  return { user, profile }
}

function submit(client: any, user: any, path: string, fields: Record<string, string>, file = true) {
  let request = client.post(path).loginAs(user).withCsrfToken().headers(inertia).redirects(0)
  for (const [key, value] of Object.entries(fields)) request = request.field(key, value)
  if (file) request = request.file('document', PDF, { filename: 'levha.pdf' })
  return request
}

test.group('payout details over HTTP (maker and seller)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => {
    drive.fake('s3')
    return () => drive.restore('s3')
  })

  test('details are saved encrypted, pending review, and shown only masked', async ({
    client,
    assert,
  }) => {
    const { user, profile } = await maker()
    const empty = await client.get('/maker/payout').headers(inertia).loginAs(user)
    empty.assertBodyContains({ component: 'maker/payout', props: { profile: null } })

    const saved = await submit(client, user, '/maker/payout', {
      ...details,
      password: 'password123',
    })
    saved.assertStatus(302)

    const row = await PayeeTaxProfile.findByOrFail('beneficiaryId', profile.id)
    assert.equal(row.status, 'pending_review')
    assert.notInclude(JSON.stringify(row.$attributes), '1234567890')
    assert.equal(new EncryptionService().decrypt(row.ibanEnc), 'TR330006100519786457841326')
    // the maker setup checklist still sees an account
    assert.isNotNull((await ManufacturerProfile.findOrFail(profile.id)).ibanEnc)

    const page = await client.get('/maker/payout').headers(inertia).loginAs(user)
    const text = JSON.stringify(page.body().props)
    assert.include(text, 'TR33')
    assert.notInclude(text, '1005')
    assert.notInclude(text, '1234567890')
    assert.include(text, '7890')
    const audit = await AuditLog.query().where('action', 'payee.profile_submitted')
    assert.lengthOf(audit, 1)
    assert.notInclude(JSON.stringify(audit), '0006')
  })

  test('wrong password, missing certificate or a bad tax number change nothing', async ({
    client,
    assert,
  }) => {
    const { user } = await maker()
    ;(
      await submit(client, user, '/maker/payout', { ...details, password: 'nope-nope' })
    ).assertStatus(302)
    ;(
      await submit(client, user, '/maker/payout', { ...details, password: 'password123' }, false)
    ).assertStatus(302)
    ;(
      await submit(client, user, '/maker/payout', {
        ...details,
        taxNumber: '1234567891',
        password: 'password123',
      })
    ).assertStatus(302)
    assert.lengthOf(await PayeeTaxProfile.all(), 0)
  })

  test('sellers have the same page; only their own role reaches each door', async ({ client }) => {
    const seller = await createUser('seller')
    await new RoleService().assignRole(seller, 'seller')
    const page = await client.get('/seller/payout').headers(inertia).loginAs(seller)
    page.assertBodyContains({ component: 'seller/payout', props: { basePath: '/seller/payout' } })
    ;(await client.get('/maker/payout').loginAs(seller)).assertStatus(403)

    const { user } = await maker()
    ;(await client.get('/seller/payout').loginAs(user)).assertStatus(403)
  })

  test('invoice upload → admin approval → marked paid, all over HTTP', async ({
    client,
    assert,
  }) => {
    const provider = new FakePaymentProvider()
    const { order, makerUser, profile } = await createFundedOrder(provider)
    await new RoleService().assignRole(makerUser, 'manufacturer')
    await approvePayee('manufacturer', profile.id, makerUser.id, 'company')
    await new PayoutService(provider, 'merchant_of_record').release(order.id)
    const payout = await Payout.query().where('orderId', order.id).firstOrFail()

    const page = await client.get('/maker/payout').headers(inertia).loginAs(makerUser)
    page.assertBodyContains({
      props: { awaiting: [{ id: payout.id, orderCode: order.code, status: 'awaiting_document' }] },
    })

    const upload = await client
      .post(`/maker/payout/${payout.id}/invoice`)
      .loginAs(makerUser)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .field('number', 'FAB2026000000042')
      .field('issuedOn', new Date().toISOString().slice(0, 10))
      .field('grossMinor', String(payout.grossMinor))
      .field('vatMinor', String(payout.vatMinor))
      .file('invoice', PDF, { filename: 'fatura.pdf' })
    upload.assertStatus(302)
    const document = await PayoutDocument.findByOrFail('payoutId', payout.id)
    assert.equal(document.status, 'submitted')

    const admin = await createUser('admin')
    await new RoleService().assignRole(admin, 'admin')
    const queue = await client.get('/admin/payouts').headers(inertia).loginAs(admin)
    queue.assertBodyContains({
      component: 'admin/payouts/index',
      props: { invoices: [{ id: payout.id, document: { number: 'FAB2026000000042' } }] },
    })
    const file = await client.get(`/admin/payouts/documents/${document.id}/file`).loginAs(admin)
    file.assertStatus(200)
    assert.include(String(file.header('content-security-policy')), 'sandbox')

    await client
      .post(`/admin/payouts/documents/${document.id}`)
      .loginAs(admin)
      .withCsrfToken()
      .headers(inertia)
      .json({ decision: 'approve' })
    await payout.refresh()
    assert.equal(payout.status, 'pending')

    const csv = await client.get('/admin/payouts/ready.csv').loginAs(admin)
    assert.include(csv.text(), 'TR330006100519786457841326')
    assert.include(csv.text(), order.code)

    await client
      .post(`/admin/payouts/${payout.id}/paid`)
      .loginAs(admin)
      .withCsrfToken()
      .headers(inertia)
      .json({ reference: 'EFT-2026-77' })
    await payout.refresh()
    assert.equal(payout.status, 'paid')

    // the maker cannot reach the admin queue
    ;(await client.get('/admin/payouts').loginAs(makerUser)).assertStatus(403)
  })

  test('home producer sees and opens only their own expense voucher', async ({
    client,
    assert,
  }) => {
    const provider = new FakePaymentProvider()
    const { order, makerUser, profile } = await createFundedOrder(provider)
    await new RoleService().assignRole(makerUser, 'manufacturer')
    await approvePayee('manufacturer', profile.id, makerUser.id, 'home_exempt')
    await new PayoutService(provider, 'merchant_of_record').release(order.id)
    const payout = await Payout.query().where('orderId', order.id).firstOrFail()

    const voucher = await client.get(`/maker/payout/vouchers/${payout.id}`).loginAs(makerUser)
    voucher.assertStatus(200)
    assert.include(voucher.text(), 'GİDER PUSULASI')
    assert.include(voucher.text(), '10000000146')

    const other = await maker()
    ;(await client.get(`/maker/payout/vouchers/${payout.id}`).loginAs(other.user)).assertStatus(404)
  })
})
