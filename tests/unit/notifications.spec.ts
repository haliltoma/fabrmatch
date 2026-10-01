import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import mail from '@adonisjs/mail/services/main'
import Notification from '#models/notification'
import NotificationMail from '#mails/notification_mail'
import ProductionJob from '#models/production_job'
import User from '#models/user'
import RoleService from '#services/identity/role_service'
import FulfillmentService from '#services/orders/fulfillment_service'
import DisputeService from '#services/disputes/dispute_service'
import PayoutService from '#services/payments/payout_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import PaymentService from '#services/payments/payment_service'
import NotificationService from '#services/notifications/notification_service'
import OrderNotifier from '#services/notifications/order_notifier'
import { render, NOTIFICATION_TYPES } from '#services/notifications/catalog'
import { addQcPhoto, createFundedOrder, createUser } from '#tests/helpers/order_fixtures'
import { uid } from '#tests/helpers/ids'

const service = new NotificationService()

async function typesOf(userId: string) {
  const rows = await Notification.query().where('userId', userId).orderBy('id', 'asc')
  return rows.map((n) => n.type)
}

async function inbox(userId: string) {
  return Notification.query().where('userId', userId).orderBy('id', 'asc')
}

test.group('NotificationService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('notify is idempotent per user + event key', async ({ assert }) => {
    const user = await createUser('buyer')
    const input = {
      userId: user.id,
      type: 'payment_received' as const,
      role: 'buyer' as const,
      context: { code: 'FO-TEST0001', orderId: uid(1) },
      eventKey: 'payment_received:1',
    }
    assert.isNotNull(await service.notify(input))
    assert.isNull(await service.notify(input))
    assert.lengthOf(await inbox(user.id), 1)
    assert.equal(await service.unreadCount(user.id), 1)
  })

  test('templates return nothing for roles that should not be told', ({ assert }) => {
    assert.isNull(render('payment_received', 'maker', { code: 'X', orderId: uid(1) }))
    assert.isNull(render('order_shipped', 'maker', { code: 'X', orderId: uid(1) }))
    assert.isNull(render('offer_received', 'buyer', {}))
    for (const type of NOTIFICATION_TYPES) {
      const anyone = (['buyer', 'seller', 'maker', 'admin'] as const).some(
        (role) => render(type, role, { code: 'X', orderId: uid(1) }) !== null
      )
      assert.isTrue(anyone, `${type} has at least one recipient`)
    }
  })

  test('mark read is scoped to the owner; mark all read clears the badge', async ({ assert }) => {
    const a = await createUser('a')
    const b = await createUser('b')
    for (const [user, key] of [
      [a, '1'],
      [a, '2'],
      [b, '1'],
    ] as const) {
      await service.notify({
        userId: user.id,
        type: 'order_cancelled',
        role: 'buyer',
        context: { code: 'FO-X', orderId: uid(1) },
        eventKey: `k:${key}`,
      })
    }
    const [first] = await inbox(a.id)
    await service.markRead(b.id, first.id) // wrong owner → no effect
    assert.equal(await service.unreadCount(a.id), 2)
    await service.markRead(a.id, first.id)
    assert.equal(await service.unreadCount(a.id), 1)
    await service.markAllRead(a.id)
    assert.equal(await service.unreadCount(a.id), 0)
    assert.equal(await service.unreadCount(b.id), 1)
  })

  test('e-mail job respects preferences, is idempotent and marks emailed', async ({ assert }) => {
    const { mails } = mail.fake()
    try {
      const user = await createUser('buyer')
      const notification = await service.notify({
        userId: user.id,
        type: 'order_cancelled',
        role: 'buyer',
        context: { code: 'FO-MAIL0001', orderId: uid(5) },
        eventKey: 'mail:1',
      })
      const run = (id: string) => service.sendEmail(id)

      await service.setEmailPreference(user.id, 'order_cancelled', false)
      await run(notification!.id)
      mails.assertNoneSent()

      await service.setEmailPreference(user.id, 'order_cancelled', true)
      await run(notification!.id)
      await run(notification!.id)
      mails.assertSentCount(NotificationMail, 1)
      const reloaded = await Notification.findOrFail(notification!.id)
      assert.isNotNull(reloaded.emailedAt)
    } finally {
      mail.restore()
    }
  })
})

test.group('notification language', () => {
  test('list and e-mail follow the reader language; old rows stay as saved', async ({ assert }) => {
    const { mails } = mail.fake()
    try {
      const user = await createUser('buyer')
      user.locale = 'tr'
      await user.save()
      const n = await service.notify({
        userId: user.id,
        type: 'order_cancelled',
        role: 'buyer',
        context: { code: 'FO-TR000001', orderId: uid(5) },
        eventKey: 'lang:1',
      })
      const row = await Notification.findOrFail(n!.id)
      assert.equal(row.title, 'FO-TR000001 was cancelled')
      assert.equal(service.localised(row, 'tr').title, 'FO-TR000001 iptal edildi')
      assert.equal(service.localised(row, 'en').title, 'FO-TR000001 was cancelled')

      await service.sendEmail(row.id)
      mails.assertSent(NotificationMail, (m) =>
        String(m.message.toJSON().message.subject).includes('iptal edildi')
      )

      row.data = { link: '/orders/5' }
      assert.equal(service.localised(row, 'tr').title, 'FO-TR000001 was cancelled')
    } finally {
      mail.restore()
    }
  })
})

test.group('order lifecycle notifications (anonymity)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('every party is told the right things and nobody learns the other side’s identity', async ({
    assert,
  }) => {
    const provider = new FakePaymentProvider()
    const seller = await createUser('seller')
    const notifier = new OrderNotifier()
    const { order, buyer, makerUser, profile } = await createFundedOrder(provider, {
      upTo: 'in_production',
      seller,
    })
    const admin = await createUser('admin')
    await new RoleService().assignRole(admin, 'admin')

    const fulfilment = new FulfillmentService()
    await notifier.inProduction(order.id)
    const jobRow = await ProductionJob.query().where('orderId', order.id).firstOrFail()
    await fulfilment.markProduced(jobRow.id, profile.id, makerUser.id)
    await addQcPhoto(jobRow.id)
    await fulfilment.markShipped(
      jobRow.id,
      profile.id,
      { carrier: 'Yurtiçi Kargo', trackingNumber: 'YK123456' },
      makerUser.id
    )
    await fulfilment.markDeliveredByBuyer(order.id, buyer.id)
    await fulfilment.completeByBuyer(order.id, buyer.id)
    await new PayoutService(provider).release(order.id)

    const buyerTypes = await typesOf(buyer.id)
    const sellerTypes = await typesOf(seller.id)
    const makerTypes = await typesOf(makerUser.id)

    assert.includeMembers(buyerTypes, [
      'payment_received',
      'order_in_production',
      'order_shipped',
      'order_delivered',
    ])
    assert.includeMembers(sellerTypes, [
      'order_in_production',
      'order_shipped',
      'order_completed',
      'payout_paid',
    ])
    assert.includeMembers(makerTypes, ['order_delivered', 'order_completed', 'payout_paid'])

    // tracking reaches the buyer only
    const all = async (id: string) => JSON.stringify(await inbox(id))
    assert.include(await all(buyer.id), 'YK123456')
    assert.notInclude(await all(seller.id), 'YK123456')
    assert.notInclude(await all(makerUser.id), 'YK123456')

    // buyer & seller never see the maker; the maker never sees the buyer
    const makerUserRow = await User.findOrFail(makerUser.id)
    for (const forbidden of [
      profile.publicAlias,
      makerUserRow.email,
      makerUserRow.fullName ?? '@@',
    ]) {
      assert.notInclude(await all(buyer.id), forbidden)
      assert.notInclude(await all(seller.id), forbidden)
    }
    for (const forbidden of [buyer.email, buyer.fullName ?? '@@', 'Ali Veli', 'Test Sk']) {
      assert.notInclude(await all(makerUser.id), forbidden)
    }
    assert.lengthOf(await inbox(admin.id), 0)
  })

  test('dispute events reach maker, seller, admins and buyer as designed', async ({ assert }) => {
    const provider = new FakePaymentProvider()
    const seller = await createUser('seller')
    const { order, buyer, makerUser, profile } = await createFundedOrder(provider, {
      upTo: 'delivered',
      seller,
    })
    const admin = await createUser('admin')
    await new RoleService().assignRole(admin, 'admin')
    const payments = new PaymentService(provider, async () => {})
    const disputes = new DisputeService(payments, new PayoutService(provider))

    const dispute = await disputes.open(order.id, buyer.id, 'The part arrived cracked in two')
    assert.includeMembers(await typesOf(makerUser.id), ['dispute_opened'])
    assert.includeMembers(await typesOf(seller.id), ['dispute_opened'])
    assert.includeMembers(await typesOf(admin.id), ['dispute_opened'])
    assert.notInclude(await typesOf(buyer.id), 'dispute_opened')

    await disputes.respond(dispute.id, profile.id, 'It shipped intact, see photos')
    assert.includeMembers(await typesOf(buyer.id), ['dispute_responded'])
    assert.includeMembers(await typesOf(admin.id), ['dispute_responded'])

    await disputes.resolve(dispute.id, admin.id, { resolution: 'full_refund' })
    for (const id of [buyer.id, makerUser.id, seller.id]) {
      assert.includeMembers(await typesOf(id), ['dispute_resolved'])
    }
    assert.includeMembers(await typesOf(buyer.id), ['refund_issued'])
  })
})
