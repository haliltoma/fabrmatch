import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import InvoiceService from '#services/invoicing/invoice_service'

export default class IssueInvoices extends Job<Record<string, never>> {
  static options: JobOptions = { queue: 'default', maxRetries: 1 }

  async execute() {
    await new InvoiceService().issueDue()
  }
}
