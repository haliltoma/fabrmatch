import type { HttpContext } from '@adonisjs/core/http'
import Invoice from '#models/invoice'
import InvoiceService from '#services/invoicing/invoice_service'

export default class InvoiceController {
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
