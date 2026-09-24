import DomainError from '#exceptions/domain_error'

export interface LabelRequest {
  orderCode: string
  /** "Fabrmatch Fulfillment" plus the maker's public alias — never the maker's real name (PRD §9) */
  senderLabel: string
  toName: string
  toLine1: string
  toCity: string
  toPostalCode: string
  toCountry: string
  weightGrams: number
}

export interface Label {
  carrier: string
  trackingNumber: string
  labelUrl: string
}

export type CarrierStatus = 'in_transit' | 'delivered' | 'failed'

export interface CarrierEvent {
  eventId: string
  trackingNumber: string
  status: CarrierStatus
}

export class InvalidCarrierSignatureError extends DomainError {
  constructor() {
    super('Invalid carrier signature', { status: 401 })
  }
}

/** What the platform needs from a courier integration; D3 picks the real one. */
export interface CarrierProvider {
  readonly name: string
  createLabel(request: LabelRequest): Promise<Label>
  /** Verifies the signature and parses a tracking webhook. */
  handleWebhook(rawBody: string, headers: Record<string, string | undefined>): Promise<CarrierEvent>
}
