import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import fabrmatchConfig from '#config/fabrmatch'
import Order from '#models/order'
import Payout from '#models/payout'
import FakePaymentProvider from '#services/payments/fake_provider'
import PaymentService from '#services/payments/payment_service'
import { setPaymentProvider } from '#services/payments/provider_registry'
import PayoutService from '#services/payments/payout_service'
import ReconciliationService from '#services/payments/reconciliation_service'
import LedgerService from '#services/payments/ledger_service'
import FxService, { FxError } from '#services/pricing/fx_service'
import { StaticFxProvider } from '#services/pricing/fx_provider'
import { convertMinor, toBaseMinor } from '#services/pricing/fx'
import { priceOrder } from '#services/orders/order_pricing'
import OrderService from '#services/orders/order_service'
import {
  createAnalyzedFile,
  createDraftOrder,
  createFundedOrder,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const flags = fabrmatchConfig.flags as Record<string, number>
const fx = new FxService()

async function enable(...codes: Array<'currencyUsd' | 'currencyEur'>) {
  for (const code of codes) flags[code] = 1
  await fx.refresh(new StaticFxProvider())
}

test.group('multi-currency', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())
  group.each.teardown(() => {
    flags.currencyUsd = 0
    flags.currencyEur = 0
    fabrmatchConfig.pricing.fxMaxAgeHours = 72
    setPaymentProvider(null)
  })

  test('only TRY is on until an admin switches another currency on', async ({ assert }) => {
    assert.deepEqual(fx.enabledCurrencies(), ['TRY'])
    flags.currencyEur = 1
    assert.deepEqual(fx.enabledCurrencies(), ['TRY', 'EUR'])
    await assert.rejects(() => fx.lock('USD'), FxError)
    await assert.rejects(() => fx.lock('JPY'), FxError)
  })

  test('a rate is refused when missing or older than the allowed age', async ({ assert }) => {
    flags.currencyUsd = 1
    flags.currencyEur = 1
    await fx.refresh(new StaticFxProvider({ USD: '40' }))
    await assert.rejects(() => fx.lock('EUR'), FxError) // no rate stored for EUR

    await db
      .from('fx_rates')
      .where('currency', 'USD')
      .update({ created_at: DateTime.now().minus({ hours: 100 }).toSQL() })
    await assert.rejects(() => fx.lock('USD'), FxError)
    fabrmatchConfig.pricing.fxMaxAgeHours = 200
    await fx.lock('USD')
  })

  test('the locked rate is the mid rate with the buffer beside it; a same-day refresh overwrites', async ({
    assert,
  }) => {
    await enable('currencyUsd')
    await fx.refresh(new StaticFxProvider({ USD: '40' }))
    await fx.refresh(new StaticFxProvider({ USD: '50' }))
    const rows = await db.from('fx_rates').where('currency', 'USD')
    assert.lengthOf(rows, 1)
    assert.equal(BigInt(rows[0].rate_nano), 20_000_000n) // 1/50

    // Paket V (V4): parts convert at the mid rate; the buffer is added once, as the FX gain
    const locked = await fx.lock('USD')
    assert.equal(locked.rateE9, 20_000_000n)
    assert.equal(locked.bufferBps, 300)
    const regional = await fx.lock('USD', 500)
    assert.equal(regional.bufferBps, 500, "a region's own buffer wins")
  })

  test('a USD price keeps every invariant of a TRY price and remembers the TRY value', async ({
    assert,
  }) => {
    await enable('currencyUsd')
    const owner = await createUser('buyer')
    const file = await createAnalyzedFile(owner, 30_000)
    const input = {
      items: [{ file, material: 'PLA', quantity: 3 }],
      country: 'TR',
      hasSeller: true,
      sellerMarginBps: 2000,
    }
    const inTry = await priceOrder(input)
    const inUsd = await priceOrder({ ...input, currency: 'USD' })

    assert.equal(inTry.currency, 'TRY')
    assert.isNull(inTry.fx)
    assert.equal(inTry.baseTotalMinor, inTry.totalMinor)

    assert.equal(inUsd.currency, 'USD')
    assert.isNotNull(inUsd.fx)
    assert.equal(inUsd.baseTotalMinor, inTry.totalMinor)
    for (const item of inUsd.items) {
      const perUnitShipping = item.shippingMinor / item.quantity
      const perUnitCommission = item.platformCommissionMinor / item.quantity
      const perUnitMargin = item.sellerMarginMinor / item.quantity
      // the FX gain (buffer + round-up) sits beside the parts, not inside them
      assert.equal(
        item.unitCostMinor,
        item.manufacturerShareMinor +
          perUnitShipping +
          perUnitCommission +
          perUnitMargin +
          item.fxGainMinor / item.quantity
      )
    }
    const sum = (pick: (i: (typeof inUsd.items)[number]) => number) =>
      inUsd.items.reduce((a, i) => a + pick(i), 0)
    assert.equal(
      inUsd.totalMinor,
      sum((i) => i.unitCostMinor * i.quantity)
    )
    assert.equal(
      inUsd.shippingMinor,
      sum((i) => i.shippingMinor)
    )
    assert.equal(inUsd.subtotalMinor + inUsd.shippingMinor, inUsd.totalMinor)
    assert.equal(
      inUsd.platformFeeMinor,
      sum((i) => i.platformCommissionMinor)
    )
    assert.equal(
      inUsd.sellerShareMinor,
      sum((i) => i.sellerMarginMinor)
    )

    assert.equal(
      inUsd.fxGainMinor,
      sum((i) => i.fxGainMinor)
    )
    assert.isAbove(inUsd.fxGainMinor, 0)
    // without the gain, the buyer pays the TRY price at the mid rate (per-part rounding at most)
    const expected = convertMinor(inTry.totalMinor, inUsd.fx!.rateE9)
    assert.isAtMost(Math.abs(inUsd.totalMinor - inUsd.fxGainMinor - expected), 3 * 4 + 3)
    // the gain is about the buffer: 3 % of the order, plus the round-up
    assert.isAtLeast(inUsd.fxGainMinor, Math.floor((expected * 300) / 10_000) - 3)
    assert.isAtLeast(toBaseMinor(inUsd.totalMinor, inUsd.fx!.rateE9), inTry.totalMinor)
  })

  test('an order is created in USD with the locked rate, and limits use the TRY value', async ({
    assert,
  }) => {
    await enable('currencyUsd')
    setPaymentProvider(new FakePaymentProvider())
    const buyer = await createUser('buyer')
    const file = await createAnalyzedFile(buyer, 900_000)
    const order = await new OrderService().createDraft(buyer, {
      modelFileId: file.id,
      material: 'PLA',
      quantity: 20,
      currency: 'USD',
      shippingAddress: {
        fullName: 'Ali Veli',
        line1: 'Test Sk. No:1',
        city: 'Istanbul',
        postalCode: '34000',
        country: 'TR',
      },
    })
    assert.equal(order.currency, 'USD')
    assert.isNotNull(order.fxRateId)
    assert.isNotNull(order.fxRateNano)
    assert.isAbove(order.baseTotalMinor, order.totalMinor * 10) // 1 USD ≈ 40 TRY
    // a small USD figure, but a big TRY order: it must need a higher trust tier
    assert.isBelow(order.totalMinor, fabrmatchConfig.trust.tier0MaxOrderMinor)
    assert.isAbove(order.baseTotalMinor, fabrmatchConfig.trust.tier0MaxOrderMinor)
    assert.isAtLeast(order.requiredTrustTier, 1)
  })

  test('a currency that is off, or that the payment provider cannot settle, is refused', async ({
    assert,
  }) => {
    const buyer = await createUser('buyer')
    const file = await createAnalyzedFile(buyer)
    const address = {
      fullName: 'Ali Veli',
      line1: 'Test Sk. No:1',
      city: 'Istanbul',
      postalCode: '34000',
      country: 'TR',
    }
    const draft = (currency: string) =>
      new OrderService().createDraft(buyer, {
        modelFileId: file.id,
        material: 'PLA',
        quantity: 1,
        currency,
        shippingAddress: address,
      })

    setPaymentProvider(new FakePaymentProvider())
    await assert.rejects(() => draft('USD')) // switched off

    await enable('currencyUsd')
    const tryOnly = new FakePaymentProvider() as unknown as { supportedCurrencies?: string[] }
    tryOnly.supportedCurrencies = undefined
    setPaymentProvider(tryOnly as unknown as FakePaymentProvider)
    await assert.rejects(() => draft('USD'), /Payments in USD are not available/)

    setPaymentProvider(new FakePaymentProvider())
    const usd = await draft('USD')
    const lira = await draft('TRY')
    assert.equal(usd.currency, 'USD')
    assert.equal(lira.currency, 'TRY')
    assert.lengthOf(await Order.query().where('currency', 'TRY'), 1)
  })

  test('a USD order goes through payment, payout and the ledger without a stray unit', async ({
    assert,
  }) => {
    await enable('currencyUsd')
    const provider = new FakePaymentProvider()
    setPaymentProvider(provider)
    const seller = await createUser('seller')
    const { order } = await createFundedOrder(provider, {
      upTo: 'completed',
      seller,
      currency: 'USD',
    })
    assert.equal(order.currency, 'USD')

    const escrowBefore = await new LedgerService().balance('buyer_escrow', {
      orderId: order.id,
      currency: 'USD',
    })
    assert.equal(escrowBefore, order.totalMinor)

    await new PayoutService(provider).release(order.id)
    const payouts = await Payout.query().where('orderId', order.id)
    assert.isAbove(payouts.length, 0)
    for (const p of payouts) {
      assert.equal(p.currency, 'USD')
      assert.equal(p.status, 'paid')
    }
    // payees + platform fee + FX gain (its own ledger account) = what the buyer paid
    assert.isAbove(order.fxGainMinor, 0)
    assert.equal(
      payouts.reduce((a, p) => a + p.amountMinor, 0) + order.platformFeeMinor + order.fxGainMinor,
      order.totalMinor
    )
    assert.equal(
      await new LedgerService().balance('fx_gain', { orderId: order.id, currency: 'USD' }),
      order.fxGainMinor
    )
    assert.equal(
      await new LedgerService().balance('buyer_escrow', { orderId: order.id, currency: 'USD' }),
      0
    )
    assert.deepEqual(await new ReconciliationService().run(), [])
  })

  test('draft orders in TRY are untouched by all of this', async ({ assert }) => {
    const { order } = await createDraftOrder()
    assert.equal(order.currency, 'TRY')
    assert.isNull(order.fxRateId)
    assert.isNull(order.fxRateNano)
    assert.equal(order.baseTotalMinor, order.totalMinor)
  })

  test('a foreign-currency order priced at an old rate cannot be paid at it', async ({
    assert,
  }) => {
    await enable('currencyUsd')
    const { order, buyer } = await createDraftOrder(undefined, { currency: 'USD' })
    await db
      .from('orders')
      .where('id', order.id)
      .update({
        created_at: DateTime.now()
          .minus({ hours: fabrmatchConfig.pricing.fxMaxAgeHours + 1 })
          .toSQL(),
      })
    const payments = new PaymentService(new FakePaymentProvider(), async () => {})
    await assert.rejects(() => payments.startCheckout(order.id, buyer.id), /no longer up to date/)
  })
})
