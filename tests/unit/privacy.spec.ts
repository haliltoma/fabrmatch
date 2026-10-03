import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import drive from '@adonisjs/drive/services/main'
import AuditLog from '#models/audit_log'
import ModelFile from '#models/model_file'
import Order from '#models/order'
import User from '#models/user'
import EncryptionService from '#services/identity/encryption_service'
import PrivacyService, { PrivacyError } from '#services/identity/privacy_service'
import MessageService from '#services/messaging/message_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import LedgerService from '#services/payments/ledger_service'
import PayoutService from '#services/payments/payout_service'
import {
  createFundedOrder,
  createManufacturer,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const privacy = new PrivacyService()

test.group('data export and deletion (R1-T5)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())
  group.each.setup(() => {
    drive.fake('s3')
    return () => drive.restore('s3')
  })

  test('a buyer’s export holds their own data, decrypted, and no maker identity', async ({
    assert,
  }) => {
    const provider = new FakePaymentProvider()
    const { order, buyer, profile, makerUser } = await createFundedOrder(provider, {
      upTo: 'in_production',
    })
    await new MessageService().send(order.id, buyer.id, 'Please print it in matte black')
    await privacy.recordConsent(buyer.id, 'marketing_email', 'v1', true)

    const data = await privacy.export(buyer)
    assert.equal(data.account.email, buyer.email)
    assert.equal(data.ordersPlaced[0].code, order.code)
    assert.equal(data.ordersPlaced[0].shippingAddress?.fullName, 'Ali Veli')
    assert.equal(data.messagesWritten[0].text, 'Please print it in matte black', 'own words')
    assert.equal(data.consents[0].kind, 'marketing_email')

    const json = JSON.stringify(data)
    for (const forbidden of [profile.publicAlias, makerUser.email, makerUser.fullName ?? '@@']) {
      assert.notInclude(json, forbidden)
    }
  })

  test('a maker’s export has their IBAN and jobs but never a buyer’s address', async ({
    assert,
  }) => {
    const provider = new FakePaymentProvider()
    const { makerUser, profile, buyer } = await createFundedOrder(provider, {
      upTo: 'in_production',
    })
    const iban = 'TR330006100519786457841326'
    profile.ibanEnc = new EncryptionService().encrypt(iban)
    await profile.save()

    const data = await privacy.export(makerUser)
    assert.equal(data.makerProfile?.iban, iban)
    assert.lengthOf(data.jobsProduced, 1)
    const json = JSON.stringify(data)
    assert.notInclude(json, 'Ali Veli')
    assert.notInclude(json, 'Test Sk')
    assert.notInclude(json, buyer.email)
  })

  test('deletion is refused while an order is in flight or a payout is pending, and needs the password', async ({
    assert,
  }) => {
    const provider = new FakePaymentProvider()
    const { buyer, makerUser } = await createFundedOrder(provider, { upTo: 'in_production' })
    await assert.rejects(() => privacy.deleteAccount(buyer, 'wrong'), /Password/)
    await assert.rejects(() => privacy.deleteAccount(buyer, 'password123'), /not finished/)
    await assert.rejects(() => privacy.deleteAccount(makerUser, 'password123'), PrivacyError)
    const still = await User.findOrFail(buyer.id)
    assert.equal(still.email, buyer.email)
  })

  test('after deletion no personal data is left, but the books are intact', async ({ assert }) => {
    const provider = new FakePaymentProvider()
    const seller = await createUser('seller')
    const { order, buyer, makerUser, profile } = await createFundedOrder(provider, {
      upTo: 'completed',
      seller,
    })
    await new PayoutService(provider).release(order.id)
    const buyerEmail = buyer.email
    const file = await ModelFile.query().where('ownerId', buyer.id).first()
    if (file) await drive.use('s3').put(file.storageKey, 'x')
    const escrowTrial = await new LedgerService().trialBalance({ orderId: order.id })

    await privacy.deleteAccount(buyer, 'password123')

    const gone = await User.findOrFail(buyer.id)
    assert.notInclude(gone.email, buyerEmail.split('@')[0])
    assert.match(gone.email, /@deleted\.invalid$/)
    assert.isNull(gone.fullName)
    assert.isNotNull(gone.suspendedAt)
    const kept = await Order.findOrFail(order.id)
    assert.isNull(kept.shippingAddressEnc, 'address erased')
    assert.equal(kept.totalMinor, order.totalMinor, 'amounts kept')
    assert.equal(await new LedgerService().trialBalance({ orderId: order.id }), escrowTrial)
    if (file) assert.isFalse(await drive.use('s3').exists(file.storageKey))

    const audit = await AuditLog.query().where('action', 'user.deleted').firstOrFail()
    assert.equal(audit.subjectId, buyer.id)
    assert.isDefined(makerUser)
    assert.isDefined(profile)
  })

  test('a finished maker can delete too: IBAN and tax id are wiped, the alias record stays', async ({
    assert,
  }) => {
    const { user, profile } = await createManufacturer()
    profile.ibanEnc = new EncryptionService().encrypt('TR330006100519786457841326')
    profile.taxIdEnc = new EncryptionService().encrypt('1234567890')
    await profile.save()

    await privacy.deleteAccount(user, 'password123')
    await profile.refresh()
    assert.isNull(profile.ibanEnc)
    assert.isNull(profile.taxIdEnc)
    assert.equal(profile.status, 'suspended')
  })
})
