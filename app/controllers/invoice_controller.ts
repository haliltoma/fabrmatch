import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import Invoice from '#models/invoice'
import InvoiceTransformer from '#transformers/invoice_transformer'
import { pageQueryValidator } from '#validators/order'
import InvoiceService from '#services/invoicing/invoice_service'

export default class InvoiceController {
  /** /invoices — every invoice addressed to the signed-in user. */
  async index({ inertia, auth, request }: HttpContext) {
    const { page } = await request.validateUsing(pageQueryValidator)
    const { rows, meta } = await new InvoiceService().listForRecipient(auth.getUserOrFail().id, {
      page,
    })
    return inertia.render('invoices/index', {
      invoices: await InvoiceTransformer.transform(rows).resolve(app.container.createResolver(), 0),
      meta,
    })
  }

  async show({ params, auth, response }: HttpContext) {
    const invoice = await Invoice.query()
      .where('orderId', params.id)
      .where('recipientUserId', auth.getUserOrFail().id)
      .first()
    if (!invoice) return response.notFound()
    const html = await new InvoiceService().htmlFor(invoice.id, auth.getUserOrFail().id)
    return response.header('content-type', 'text/html; charset=utf-8').send(html)
  }
}
