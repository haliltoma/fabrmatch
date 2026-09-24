import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import Invoice from '#models/invoice'
import Order from '#models/order'
import User from '#models/user'
import FakeInvoiceProvider from '#services/invoicing/fake_provider'
import type { InvoiceProvider } from '#services/invoicing/provider'
import { splitGross } from '#services/tax/tax'

/**
 * The platform's commission invoice, issued once an order is completed (idempotent per order).
 * Who the invoice is addressed to and how VAT on the commission is treated is decision K-C/D5;
 * for now it is billed to the buyer, tax-inclusive at the order's rate.
 */
export default class InvoiceService {
  constructor(private provider: InvoiceProvider = new FakeInvoiceProvider()) {}

  async issueFor(orderId: number): Promise<Invoice | null> {
    const order = await Order.findOrFail(orderId)
    if (order.status !== 'completed' && order.status !== 'resolved') return null
    if (order.platformFeeMinor <= 0) return null
    const existing = await Invoice.query()
      .where('orderId', orderId)
      .where('kind', 'platform_fee')
      .first()
    if (existing) return existing

    const buyer = await User.findOrFail(order.buyerId)
    const split = splitGross(order.platformFeeMinor, order.taxRateBps)
    const issuedAt = DateTime.now()

    const invoice = await db.transaction(async (trx) => {
      const number = await this.nextNumber(issuedAt.year, trx)
      const row = await Invoice.create(
        {
          orderId,
          kind: 'platform_fee',
          recipientUserId: buyer.id,
          number,
          netMinor: split.netMinor,
          taxRateBps: split.rateBps,
          taxMinor: split.taxMinor,
          grossMinor: order.platformFeeMinor,
          currency: order.currency,
          status: 'issued',
          provider: this.provider.name,
          issuedAt,
        },
        { client: trx }
      )
      return row
    })

    try {
      const { providerRef } = await this.provider.issue({
        number: invoice.number,
        recipientName: buyer.fullName ?? buyer.email,
        description: `Fabrmatch service fee, order ${order.code}`,
        netMinor: invoice.netMinor,
        taxRateBps: invoice.taxRateBps,
        taxMinor: invoice.taxMinor,
        grossMinor: invoice.grossMinor,
        currency: invoice.currency,
        issuedAt: issuedAt.toISO()!,
      })
      invoice.providerRef = providerRef
      await invoice.save()
    } catch (error) {
      // the invoice exists locally; the sweep retries the hand-over (same number → same reference)
      logger.error({
        msg: 'invoice hand-over failed',
        invoiceId: invoice.id,
        error: (error as Error).message,
      })
    }
    return invoice
  }

  /** Sweep: completed orders without an invoice, and invoices the provider has not confirmed. */
  async issueDue(): Promise<{ issued: number; resent: number }> {
    const missing = await db.rawQuery(
      `select o.id from orders o
        where o.status in ('completed', 'resolved') and o.platform_fee_minor > 0
          and not exists (select 1 from invoices i where i.order_id = o.id and i.kind = 'platform_fee')
        order by o.id limit 100`
    )
    let issued = 0
    for (const { id } of missing.rows as Array<{ id: number }>) {
      try {
        if (await this.issueFor(id)) issued++
      } catch (error) {
        logger.error({ msg: 'invoice issue failed', orderId: id, error: (error as Error).message })
      }
    }

    const unsent = await Invoice.query()
      .whereNull('providerRef')
      .where('status', 'issued')
      .limit(100)
    let resent = 0
    for (const inv of unsent) {
      try {
        const order = await Order.findOrFail(inv.orderId)
        const buyer = await User.findOrFail(inv.recipientUserId)
        const { providerRef } = await this.provider.issue({
          number: inv.number,
          recipientName: buyer.fullName ?? buyer.email,
          description: `Fabrmatch service fee, order ${order.code}`,
          netMinor: inv.netMinor,
          taxRateBps: inv.taxRateBps,
          taxMinor: inv.taxMinor,
          grossMinor: inv.grossMinor,
          currency: inv.currency,
          issuedAt: inv.issuedAt.toISO()!,
        })
        inv.providerRef = providerRef
        await inv.save()
        resent++
      } catch (error) {
        logger.error({
          msg: 'invoice resend failed',
          invoiceId: inv.id,
          error: (error as Error).message,
        })
      }
    }
    return { issued, resent }
  }

  /** Gapless per-year numbering: FM-2026-000001, allocated inside the same transaction as the row. */
  private async nextNumber(year: number, trx: TransactionClientContract) {
    await trx.rawQuery(
      `insert into invoice_counters (year, last_number) values (?, 0) on conflict (year) do nothing`,
      [year]
    )
    const result = await trx.rawQuery(
      `update invoice_counters set last_number = last_number + 1 where year = ? returning last_number`,
      [year]
    )
    return `FM-${year}-${String(result.rows[0].last_number).padStart(6, '0')}`
  }

  /** Printable page for the invoice's recipient. */
  async htmlFor(invoiceId: number, userId: number): Promise<string | null> {
    const invoice = await Invoice.query()
      .where('id', invoiceId)
      .where('recipientUserId', userId)
      .first()
    if (!invoice) return null
    const order = await Order.findOrFail(invoice.orderId)
    const money = (m: number) => `${(m / 100).toFixed(2)} ${invoice.currency}`
    const esc = (t: string) => t.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Invoice ${esc(invoice.number)}</title>
<style>body{font:16px/1.5 system-ui;max-width:640px;margin:40px auto;color:#15181C}td{padding:4px 12px 4px 0}.r{text-align:right}</style>
<h1>Invoice ${esc(invoice.number)}</h1>
<p>Issued ${invoice.issuedAt.toISODate()} · Order ${esc(order.code)}</p>
<p>Fabrmatch service fee</p>
<table><tr><td>Net</td><td class="r">${money(invoice.netMinor)}</td></tr>
<tr><td>VAT ${invoice.taxRateBps / 100}%</td><td class="r">${money(invoice.taxMinor)}</td></tr>
<tr><td><strong>Total</strong></td><td class="r"><strong>${money(invoice.grossMinor)}</strong></td></tr></table>
<p style="color:#6B737C;font-size:14px">Your maker or seller invoices their own share separately.</p></html>`
  }
}
