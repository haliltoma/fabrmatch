import type { InvoiceDraft, InvoiceProvider } from '#services/invoicing/provider'

export default class FakeInvoiceProvider implements InvoiceProvider {
  readonly name = 'fake'
  issued: InvoiceDraft[] = []
  failNext = false
  private refs = new Map<string, string>()

  async issue(draft: InvoiceDraft) {
    if (this.failNext) {
      this.failNext = false
      throw new Error('fake invoice provider: unavailable')
    }
    const existing = this.refs.get(draft.number)
    if (existing) return { providerRef: existing }
    const ref = `fake_inv_${draft.number}`
    this.refs.set(draft.number, ref)
    this.issued.push(draft)
    return { providerRef: ref }
  }
}
