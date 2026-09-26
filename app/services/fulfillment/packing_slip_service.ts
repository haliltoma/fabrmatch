import BrandingService from '#services/fulfillment/branding_service'
import DomainError from '#exceptions/domain_error'
import OrderItem from '#models/order_item'
import ProductionJob from '#models/production_job'
import SellerProfile from '#models/seller_profile'
import Order from '#models/order'
import OrderService from '#services/orders/order_service'

export class PackingSlipError extends DomainError {}

const escapeHtml = (t: string) =>
  t
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

/**
 * The card a maker puts in the parcel. For a storefront sale it carries the seller's own brand, not
 * ours (white label). It never shows prices, the maker's alias, or anything the buyer did not already
 * give for delivery (business rule 1): only the order code, what is inside, and who it is for.
 */
export default class PackingSlipService {
  async htmlForJob(jobId: number, manufacturerProfileId: number): Promise<string> {
    const job = await ProductionJob.query()
      .where('id', jobId)
      .where('manufacturerProfileId', manufacturerProfileId)
      .whereNot('status', 'cancelled')
      .first()
    if (!job) throw new PackingSlipError('Job not found')

    const order = await Order.findOrFail(job.orderId)
    const items = await OrderItem.query().where('orderId', order.id).orderBy('id', 'asc')
    const address = new OrderService().decryptShippingAddress(order)

    let brandName: string | null = null
    let brandMessage: string | null = null
    let logo: string | null = null
    if (order.channel === 'storefront' && order.sellerId) {
      const seller = await SellerProfile.query().where('userId', order.sellerId).first()
      brandName = seller?.brandName ?? null
      brandMessage = seller?.brandMessage ?? null
      // embedded, so the card prints without the maker ever getting a link to the seller's files
      const file = seller ? await new BrandingService().logo(seller) : null
      logo = file ? `data:${file.contentType};base64,${file.bytes.toString('base64')}` : null
    }

    const rows = items
      .map(
        (i) =>
          `<tr><td>${escapeHtml(i.material)}${i.color ? ` · ${escapeHtml(i.color)}` : ''}${
            i.finishingName
              ? ` · ${escapeHtml(i.finishingName)}${
                  i.finishingColour ? ` (${escapeHtml(i.finishingColour)})` : ''
                }`
              : ''
          }</td><td class="r">× ${i.quantity}</td></tr>`
      )
      .join('')

    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex">
<title>Packing slip ${escapeHtml(order.code)}</title>
<style>
  body{font:14px/1.5 system-ui,sans-serif;color:#111;max-width:560px;margin:32px auto;padding:0 16px}
  h1{font-size:28px;margin:0 0 4px} p.msg{font-size:16px;margin:8px 0 24px}
  table{width:100%;border-collapse:collapse;margin:16px 0} td{padding:6px 0;border-bottom:1px solid #ddd} td.r{text-align:right}
  .meta{color:#555;font-size:12px} img.logo{max-height:72px;max-width:240px;display:block;margin:0 0 12px}
  @media print{body{margin:0}}
</style></head><body>
${logo ? `<img class="logo" src="${logo}" alt="${escapeHtml(brandName ?? '')}">` : ''}
${brandName ? `<h1>${escapeHtml(brandName)}</h1>` : '<h1>Thank you for your order</h1>'}
${brandMessage ? `<p class="msg">${escapeHtml(brandMessage)}</p>` : ''}
<p class="meta">Order ${escapeHtml(order.code)}${address ? ` · for ${escapeHtml(address.fullName)}` : ''}</p>
<table>${rows}</table>
</body></html>`
  }
}
