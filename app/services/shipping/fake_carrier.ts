import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import {
  InvalidCarrierSignatureError,
  type CarrierEvent,
  type CarrierProvider,
  type CarrierStatus,
  type Label,
  type LabelRequest,
} from '#services/shipping/carrier_provider'

export const FAKE_CARRIER_SIGNATURE_HEADER = 'x-fake-carrier-signature'

export default class FakeCarrier implements CarrierProvider {
  readonly name = 'fake'
  labels: Array<LabelRequest & Label> = []

  constructor(private secret = 'fake-carrier-secret') {}

  async createLabel(request: LabelRequest): Promise<Label> {
    const label = {
      carrier: 'Fake Cargo',
      trackingNumber: `FC${randomBytes(5).toString('hex').toUpperCase()}`,
      labelUrl: `https://labels.example.test/${request.orderCode}.pdf`,
    }
    this.labels.push({ ...request, ...label })
    return label
  }

  signedEvent(input: { eventId?: string; trackingNumber: string; status: CarrierStatus }) {
    const body = JSON.stringify({
      eventId: input.eventId ?? `cev_${randomBytes(5).toString('hex')}`,
      trackingNumber: input.trackingNumber,
      status: input.status,
    })
    return { body, headers: { [FAKE_CARRIER_SIGNATURE_HEADER]: this.sign(body) } }
  }

  async handleWebhook(
    rawBody: string,
    headers: Record<string, string | undefined>
  ): Promise<CarrierEvent> {
    const given = Buffer.from(headers[FAKE_CARRIER_SIGNATURE_HEADER] ?? '')
    const expected = Buffer.from(this.sign(rawBody))
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      throw new InvalidCarrierSignatureError()
    }
    const parsed = JSON.parse(rawBody) as CarrierEvent
    return {
      eventId: String(parsed.eventId),
      trackingNumber: String(parsed.trackingNumber),
      status: parsed.status,
    }
  }

  private sign(body: string) {
    return createHmac('sha256', this.secret).update(body).digest('hex')
  }
}
