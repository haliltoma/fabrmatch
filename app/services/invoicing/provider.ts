export interface InvoiceDraft {
  number: string
  recipientName: string
  description: string
  netMinor: number
  taxRateBps: number
  taxMinor: number
  grossMinor: number
  currency: string
  issuedAt: string
}

/** Application code depends on this only; a national e-invoice integrator (K-C) is one implementation. */
export interface InvoiceProvider {
  readonly name: string
  /** Idempotent per draft.number: sending the same number again returns the same reference. */
  issue(draft: InvoiceDraft): Promise<{ providerRef: string }>
}
