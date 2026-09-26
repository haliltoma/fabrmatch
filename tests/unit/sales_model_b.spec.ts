import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import drive from '@adonisjs/drive/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import Payout from '#models/payout'
import PayoutDocument from '#models/payout_document'
import PayeeTaxProfile from '#models/payee_tax_profile'
import fabrmatchConfig from '#config/fabrmatch'
import FakePaymentProvider from '#services/payments/fake_provider'
import LedgerService from '#services/payments/ledger_service'
import PayoutService, { PayoutError } from '#services/payments/payout_service'
import PayoutDocumentService from '#services/payments/payee/payout_document_service'
import PayeeProfileService, { validate } from '#services/payments/payee/payee_profile_service'
import {
  saleBreakdown,
  splitPayeeShare,
  treatmentFor,
  type PayeeTaxStatus,
} from '#services/payments/payee/tax_treatment'
import { splitGross } from '#services/tax/tax'
import { isValidTckn, isValidVkn } from '#services/identity/tax_ids'
import { approvePayee, createFundedOrder, createUser } from '#tests/helpers/order_fixtures'

const ledger = new LedgerService()
const PDF = Buffer.from('%PDF-1.4 test invoice')

/** Model B service with the fake provider (which must never be asked to move money). */
function service(provider = new FakePaymentProvider()) {
  return { provider, payouts: new PayoutService(provider, 'merchant_of_record') }
}

async function fundedWithPayees(
  makerStatus: PayeeTaxStatus = 'company',
  sellerStatus: PayeeTaxStatus | null = 'company'
) {
  const { provider, payouts } = service()
  const seller = sellerStatus ? await createUser('seller') : undefined
  const funded = await createFundedOrder(provider, { seller })
  await approvePayee('manufacturer', funded.profile.id, funded.makerUser.id, makerStatus)
  if (seller && sellerStatus) await approvePayee('seller', seller.id, seller.id, sellerStatus)
  return { ...funded, provider, payouts }
}

test.group('Model B: tax identities and treatment (pure)', () => {
  test('TCKN and VKN check digits', ({ assert }) => {
    assert.isTrue(isValidTckn('10000000146'))
    assert.isFalse(isValidTckn('10000000147'))
    assert.isTrue(isValidVkn('1234567890'))
    assert.isTrue(isValidVkn('9876543217'))
    assert.isFalse(isValidVkn('1234567891'))
    assert.isFalse(isValidVkn('123456789'))
  })

  test('a registered payee invoices its share with VAT; others get the share without it', ({
    assert,
  }) => {
    const registered = splitPayeeShare(12_000, 2000, treatmentFor('company', 200))
    assert.deepEqual(registered, {
      grossMinor: 12_000,
      vatMinor: 2000,
      withholdingMinor: 0,
      payableMinor: 12_000,
    })
    const simple = splitPayeeShare(12_000, 2000, treatmentFor('simple_method', 200))
    assert.deepEqual(simple, {
      grossMinor: 10_000,
      vatMinor: 0,
      withholdingMinor: 0,
      payableMinor: 10_000,
    })
    const home = splitPayeeShare(12_000, 2000, treatmentFor('home_exempt', 200))
    assert.deepEqual(home, {
      grossMinor: 10_000,
      vatMinor: 0,
      withholdingMinor: 200,
      payableMinor: 9800,
    })
    assert.equal(treatmentFor('home_exempt', 200).document, 'expense_voucher')
    assert.equal(treatmentFor('sole_proprietor', 200).document, 'supplier_invoice')
  })

  test('property: every sale balances and Fabrmatch keeps about its net fee', ({ assert }) => {
    const statuses: PayeeTaxStatus[] = [
      'company',
      'sole_proprietor',
      'simple_method',
      'home_exempt',
    ]
    let seed = 7
    const rnd = (n: number) => {
      seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648
      return seed % n
    }
    for (let i = 0; i < 2000; i++) {
      const rate = [0, 100, 1000, 2000][rnd(4)]
      const fee = rnd(50_000)
      const seller = rnd(3) === 0 ? 0 : rnd(40_000)
      const maker = 1 + rnd(500_000)
      const escrow = fee + seller + maker
      const splits = [
        splitPayeeShare(maker, rate, treatmentFor(statuses[rnd(4)], rnd(600))),
        ...(seller > 0
          ? [splitPayeeShare(seller, rate, treatmentFor(statuses[rnd(4)], rnd(600)))]
          : []),
      ]
      const sale = saleBreakdown(escrow, rate, splits)
      const paid = splits.reduce((s, p) => s + p.payableMinor, 0)
      assert.equal(escrow + sale.inputVat, sale.outputVat + paid + sale.withheld + sale.ours)
      // whatever the payees' tax status, our result is the fee without its VAT (± rounding)
      const netFee = fee - splitGross(fee, rate).taxMinor
      assert.isAtMost(Math.abs(sale.ours - netFee), 2, `case ${i}`)
      for (const s of splits) assert.isAtLeast(s.payableMinor, 0)
    }
  })
})

test.group('Model B: releasing a completed order', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => {
    drive.fake('s3')
    return () => drive.restore('s3')
  })

  test('VAT-registered maker and seller: sale booked, both wait for their invoice', async ({
    assert,
  }) => {
    const { order, payouts, provider } = await fundedWithPayees('company', 'company')
    const result = await payouts.release(order.id)
    assert.deepEqual(result, { allocated: true, paid: 0, pending: 2 })
    assert.lengthOf(provider.approvals, 0)

    const rows = await Payout.query().where('orderId', order.id)
    const maker = rows.find((p) => p.beneficiaryType === 'manufacturer')!
    const seller = rows.find((p) => p.beneficiaryType === 'seller')!
    const makerShare = order.totalMinor - order.platformFeeMinor - order.sellerShareMinor
    assert.equal(maker.status, 'awaiting_document')
    assert.equal(maker.amountMinor, makerShare)
    assert.equal(maker.vatMinor, splitGross(makerShare, order.taxRateBps).taxMinor)
    assert.equal(seller.amountMinor, order.sellerShareMinor)

    const where = { orderId: order.id }
    assert.equal(await ledger.balance('buyer_escrow', where), 0)
    assert.equal(
      await ledger.balance('vat_payable', where),
      splitGross(order.totalMinor, order.taxRateBps).taxMinor
    )
    assert.equal(await ledger.balance('vat_receivable', where), maker.vatMinor + seller.vatMinor)
    assert.equal(await ledger.balance('manufacturer_payable', where), makerShare)
    const fee = await ledger.balance('platform_fee', where)
    assert.closeTo(
      fee,
      order.platformFeeMinor - splitGross(order.platformFeeMinor, order.taxRateBps).taxMinor,
      2
    )
    assert.equal(await ledger.trialBalance(), 0)
  })

  test('nothing is allocated until every payee is approved; the sweep picks it up after', async ({
    assert,
  }) => {
    const { provider, payouts } = service()
    const seller = await createUser('seller')
    const { order, profile, makerUser } = await createFundedOrder(provider, { seller })
    await approvePayee('manufacturer', profile.id, makerUser.id)

    await assert.rejects(() => payouts.release(order.id), /seller's approved tax and bank/)
    assert.lengthOf(await Payout.query().where('orderId', order.id), 0)
    assert.equal(await ledger.balance('buyer_escrow', { orderId: order.id }), order.totalMinor)

    const pendingProfile = await approvePayee('seller', seller.id, seller.id)
    pendingProfile.status = 'pending_review'
    await pendingProfile.save()
    await assert.rejects(() => payouts.release(order.id), PayoutError as never)

    pendingProfile.status = 'approved'
    await pendingProfile.save()
    await payouts.releaseDue()
    assert.lengthOf(await Payout.query().where('orderId', order.id), 2)
  })

  test('home producer: expense voucher issued by us, tax withheld, payout ready at once', async ({
    assert,
  }) => {
    const { order, payouts } = await fundedWithPayees('home_exempt', null)
    await payouts.release(order.id)

    const payout = await Payout.query().where('orderId', order.id).firstOrFail()
    const share = order.totalMinor - order.platformFeeMinor
    const base = share - splitGross(share, order.taxRateBps).taxMinor
    const withheld = Math.floor(
      (base * fabrmatchConfig.payouts.homeExemptWithholdingBps + 5000) / 10_000
    )
    assert.equal(payout.status, 'pending')
    assert.equal(payout.grossMinor, base)
    assert.equal(payout.withholdingMinor, withheld)
    assert.equal(payout.amountMinor, base - withheld)
    assert.equal(payout.vatMinor, 0)

    const voucher = await PayoutDocument.findByOrFail('payoutId', payout.id)
    assert.equal(voucher.kind, 'expense_voucher')
    assert.equal(voucher.status, 'approved')
    assert.match(voucher.number, new RegExp(`^GP${DateTime.now().year}\\d{6}$`))
    assert.equal(voucher.withholdingMinor, withheld)
    assert.equal(await ledger.balance('withholding_payable', { orderId: order.id }), withheld)
    assert.equal(await ledger.balance('vat_receivable', { orderId: order.id }), 0)
    assert.equal(await ledger.trialBalance(), 0)
  })

  test('voucher numbers run without gaps', async ({ assert }) => {
    const first = await fundedWithPayees('home_exempt', null)
    const second = await fundedWithPayees('home_exempt', null)
    await first.payouts.release(first.order.id)
    await second.payouts.release(second.order.id)
    const vouchers = await PayoutDocument.query().where('kind', 'expense_voucher').orderBy('id')
    const numbers = vouchers.map((d) => Number(d.number.slice(6)))
    assert.equal(numbers[1], numbers[0] + 1)
  })

  test('home producer past the yearly exemption limit is not paid', async ({ assert }) => {
    const { order, payouts, profile } = await fundedWithPayees('home_exempt', null)
    await db.table('payouts').insert({
      order_id: order.id,
      beneficiary_type: 'manufacturer',
      beneficiary_id: profile.id,
      amount_minor: 1,
      gross_minor: fabrmatchConfig.payouts.homeExemptAnnualCapMinor,
      tax_status: 'home_exempt',
      currency: 'TRY',
      status: 'paid',
      created_at: new Date(),
      updated_at: new Date(),
    })
    // the fake row above counts as "already allocated" for this order, so use a fresh one
    const next = await createFundedOrder(new FakePaymentProvider())
    await db
      .from('production_jobs')
      .where('order_id', next.order.id)
      .update({ manufacturer_profile_id: profile.id })
    await assert.rejects(() => payouts.release(next.order.id), /yearly limit/)
  })

  test('simple-method payee invoices without VAT', async ({ assert }) => {
    const { order, payouts } = await fundedWithPayees('simple_method', null)
    await payouts.release(order.id)
    const payout = await Payout.query().where('orderId', order.id).firstOrFail()
    const share = order.totalMinor - order.platformFeeMinor
    assert.equal(payout.status, 'awaiting_document')
    assert.equal(payout.vatMinor, 0)
    assert.equal(payout.amountMinor, share - splitGross(share, order.taxRateBps).taxMinor)
  })

  test('invoice → admin approval → bank transfer marked paid', async ({ assert }) => {
    const { order, payouts, makerUser, profile } = await fundedWithPayees('company', null)
    await payouts.release(order.id)
    const payout = await Payout.query().where('orderId', order.id).firstOrFail()
    const documents = new PayoutDocumentService()
    const payee = { type: 'manufacturer' as const, id: profile.id }
    const invoice = {
      number: 'ABC2026000000123',
      issuedOn: DateTime.now(),
      grossMinor: payout.grossMinor!,
      vatMinor: payout.vatMinor,
    }

    await assert.rejects(
      () =>
        documents.submitInvoice(makerUser.id, payee, payout.id, { ...invoice, grossMinor: 1 }, PDF),
      /must be exactly/
    )
    await assert.rejects(
      () =>
        documents.submitInvoice(
          makerUser.id,
          payee,
          payout.id,
          { ...invoice, vatMinor: invoice.vatMinor + 5 },
          PDF
        ),
      /VAT on the invoice/
    )
    await assert.rejects(
      () => documents.submitInvoice(makerUser.id, payee, payout.id, invoice, Buffer.from('<svg>')),
      /PDF, PNG or JPEG/
    )
    // someone else's payout
    await assert.rejects(
      () =>
        documents.submitInvoice(
          makerUser.id,
          { ...payee, id: payee.id + 999 },
          payout.id,
          invoice,
          PDF
        ),
      /not found/
    )

    const admin = await createUser('admin')
    let doc = await documents.submitInvoice(makerUser.id, payee, payout.id, invoice, PDF)
    await assert.rejects(() => payouts.markPaid(admin.id, payout.id, 'EFT-1'), /not ready/)

    await documents.reviewInvoice(admin.id, doc.id, false, 'Wrong buyer title on the invoice')
    await payout.refresh()
    assert.equal(payout.status, 'awaiting_document')

    doc = await documents.submitInvoice(makerUser.id, payee, payout.id, invoice, PDF)
    assert.equal(doc.status, 'submitted')
    await documents.reviewInvoice(admin.id, doc.id, true)
    await payout.refresh()
    assert.equal(payout.status, 'pending')

    const cashBefore = await ledger.balance('provider_cash', { orderId: order.id })
    await payouts.markPaid(admin.id, payout.id, 'EFT-2026-0001')
    await payout.refresh()
    assert.equal(payout.status, 'paid')
    assert.equal(payout.paidReference, 'EFT-2026-0001')
    assert.equal(await ledger.balance('manufacturer_payable', { orderId: order.id }), 0)
    assert.equal(
      await ledger.balance('provider_cash', { orderId: order.id }),
      cashBefore - payout.amountMinor
    )
    await assert.rejects(() => payouts.markPaid(admin.id, payout.id, 'EFT-again'), /not ready/)
    assert.equal(await ledger.trialBalance(), 0)
  })

  test('changed bank details stop a ready payout until they are approved again', async ({
    assert,
  }) => {
    const { order, payouts } = await fundedWithPayees('home_exempt', null)
    await payouts.release(order.id)
    const payout = await Payout.query().where('orderId', order.id).firstOrFail()
    await PayeeTaxProfile.query()
      .where('beneficiaryType', 'manufacturer')
      .where('beneficiaryId', payout.beneficiaryId)
      .update({ status: 'pending_review' })
    const admin = await createUser('admin')
    await assert.rejects(() => payouts.markPaid(admin.id, payout.id, 'EFT-9'), /not approved/)
  })
})

test.group('Model B: payee details', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => {
    drive.fake('s3')
    return () => drive.restore('s3')
  })

  const input = {
    taxStatus: 'company' as const,
    legalName: 'Baskı Atölyesi Ltd. Şti.',
    taxNumber: '1234567890',
    taxOffice: 'Kadıköy',
    address: 'Moda Cd. 10, Kadıköy, İstanbul',
    iban: 'TR33 0006 1005 1978 6457 8413 26',
  }

  test('validation: the tax number must fit the status, IBAN must be Turkish', ({ assert }) => {
    assert.equal(validate(input).iban, 'TR330006100519786457841326')
    assert.throws(() => validate({ ...input, taxNumber: '10000000146' }), /VKN/)
    assert.doesNotThrow(() =>
      validate({ ...input, taxStatus: 'home_exempt', taxNumber: '10000000146' })
    )
    assert.throws(
      () => validate({ ...input, taxStatus: 'sole_proprietor', taxNumber: '1' }),
      /T.C./
    )
    assert.throws(() => validate({ ...input, iban: 'DE89370400440532013000' }), /Turkish IBAN/)
    assert.throws(() => validate({ ...input, address: 'x' }), /address/)
  })

  test('submit → pending review (document required); edits need approval again', async ({
    assert,
  }) => {
    const profiles = new PayeeProfileService()
    const { profile, makerUser } = await createFundedOrder(new FakePaymentProvider(), {
      upTo: 'paid',
    })
    const payee = { type: 'manufacturer' as const, id: profile.id }

    await assert.rejects(() => profiles.submit(makerUser, payee, input, null), /vergi levhası/)
    const saved = await profiles.submit(makerUser, payee, input, PDF)
    assert.equal(saved.status, 'pending_review')
    assert.notInclude(JSON.stringify(saved.$attributes), '1234567890')
    await profile.refresh()
    assert.isNotNull(profile.ibanEnc)

    const admin = await createUser('admin')
    await assert.rejects(() => profiles.review(makerUser.id, saved.id, true), /your own/)
    await assert.rejects(() => profiles.review(admin.id, saved.id, false, 'no'), /at least 5/)
    await profiles.review(admin.id, saved.id, true)
    assert.isNotNull(await profiles.approved(payee))

    // same status, no new document needed — but approval is lost
    await profiles.submit(makerUser, payee, { ...input, iban: 'TR330006100519786457841326' }, null)
    assert.isNull(await profiles.approved(payee))
    // a different tax status needs its own certificate
    await assert.rejects(
      () =>
        profiles.submit(
          makerUser,
          payee,
          { ...input, taxStatus: 'home_exempt', taxNumber: '10000000146' },
          null
        ),
      /muafiyet/
    )
  })
})
