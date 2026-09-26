import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import DomainError from '#exceptions/domain_error'

/**
 * Signed HTTP client for the iyzico API, following docs.iyzico.com exactly:
 * IYZWSv2 = base64("apiKey:" + apiKey + "&randomKey:" + rnd + "&signature:" + hex(HMAC-SHA256(
 * secretKey, rnd + uriPath + body))), sent with `x-iyzi-rnd`. No SDK: the surface we use is small
 * and every field is taken from the documentation (R1-T1: nothing invented).
 */

export class IyzicoError extends DomainError {
  constructor(
    message: string,
    readonly errorCode: string | null = null
  ) {
    super(message, { status: 502 })
  }
}

export interface IyzicoCredentials {
  baseUrl: string
  apiKey: string
  secretKey: string
}

/** One HTTP exchange; tests replace it to run the adapter without the network. */
export type IyzicoTransport = (request: {
  method: 'POST' | 'PUT'
  url: string
  headers: Record<string, string>
  body: string
}) => Promise<{ status: number; body: string }>

export const fetchTransport: IyzicoTransport = async ({ method, url, headers, body }) => {
  const response = await fetch(url, {
    method,
    headers,
    body,
    signal: AbortSignal.timeout(20_000),
  })
  return { status: response.status, body: await response.text() }
}

export function authorization(
  credentials: IyzicoCredentials,
  randomKey: string,
  uriPath: string,
  body: string
) {
  const signature = createHmac('sha256', credentials.secretKey)
    .update(randomKey + uriPath + body)
    .digest('hex')
  const value = `apiKey:${credentials.apiKey}&randomKey:${randomKey}&signature:${signature}`
  return `IYZWSv2 ${Buffer.from(value, 'utf8').toString('base64')}`
}

/** iyzico prices are decimal strings; ours are integer minor units. Exact, no floats. */
export function toPrice(minor: number): string {
  if (!Number.isInteger(minor)) throw new Error(`not minor units: ${minor}`)
  const sign = minor < 0 ? '-' : ''
  const abs = Math.abs(minor)
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

export function fromPrice(value: string | number): number {
  const text = typeof value === 'number' ? value.toFixed(2) : value.trim()
  const match = /^(-?)(\d+)(?:\.(\d{1,8}))?$/.exec(text)
  if (!match) throw new Error(`not a price: ${value}`)
  const [, sign, whole, fraction = ''] = match
  const cents = Number(whole) * 100 + Number((fraction + '00').slice(0, 2))
  return sign ? -cents : cents
}

/** Constant-time compare of two hex strings (webhook signatures). */
export function sameHex(a: string, b: string): boolean {
  const x = Buffer.from(a.toLowerCase(), 'utf8')
  const y = Buffer.from(b.toLowerCase(), 'utf8')
  return x.length === y.length && timingSafeEqual(x, y)
}

export default class IyzicoClient {
  constructor(
    readonly credentials: IyzicoCredentials,
    private transport: IyzicoTransport = fetchTransport
  ) {}

  /** `allowFailure` hands back a `status: failure` answer instead of throwing (callers inspect it). */
  async post<T extends object>(
    path: string,
    payload: object,
    options: { allowFailure?: boolean } = {}
  ): Promise<T> {
    return this.send<T>('POST', path, payload, options.allowFailure)
  }

  async put<T extends object>(path: string, payload: object): Promise<T> {
    return this.send<T>('PUT', path, payload)
  }

  private async send<T extends object>(
    method: 'POST' | 'PUT',
    path: string,
    payload: object,
    allowFailure = false
  ) {
    const body = JSON.stringify(payload)
    const randomKey = `${Date.now()}${randomBytes(6).toString('hex')}`
    const response = await this.transport({
      method,
      url: this.credentials.baseUrl.replace(/\/$/, '') + path,
      headers: {
        'Authorization': authorization(this.credentials, randomKey, path, body),
        'x-iyzi-rnd': randomKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body,
    })
    let data: Record<string, unknown>
    try {
      data = JSON.parse(response.body)
    } catch {
      throw new IyzicoError(`iyzico answered HTTP ${response.status} without JSON`)
    }
    if (data.status !== 'success' && !allowFailure) {
      throw new IyzicoError(
        String(data.errorMessage ?? 'iyzico request failed'),
        data.errorCode ? String(data.errorCode) : null
      )
    }
    return data as T
  }
}
