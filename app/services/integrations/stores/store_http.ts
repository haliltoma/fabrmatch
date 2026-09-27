import { request as httpsRequest } from 'node:https'
import { isIP } from 'node:net'
import { guardedLookup } from '#services/integrations/webhook_transport'
import { isPublicAddress } from '#services/integrations/webhook_url'

export interface StoreHttpRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  headers: Record<string, string>
  /** a Buffer for binary uploads (Etsy listing images) */
  body?: string | Buffer
}

export interface StoreHttpResponse {
  status: number
  body: string
}

/** One HTTP exchange with a shop's API; tests replace it. */
export type StoreHttp = (request: StoreHttpRequest) => Promise<StoreHttpResponse>

const TIMEOUT_MS = 20_000
const MAX_BODY_BYTES = 4 * 1024 * 1024

/**
 * The shop URL comes from the seller, so the same guard as seller webhooks applies: https only,
 * never an internal address (checked when connecting, so DNS rebinding does not help), no
 * redirects, bounded time and size.
 */
export const safeStoreHttp: StoreHttp = ({ method, url, headers, body }) =>
  new Promise((resolve, reject) => {
    const target = new URL(url)
    if (target.protocol !== 'https:') return reject(new Error('Shop API must use https'))
    const host = target.hostname.replace(/^\[|\]$/g, '')
    if (isIP(host) !== 0 && !isPublicAddress(host)) {
      return reject(new Error('Shop address is not public'))
    }
    const req = httpsRequest(
      target,
      {
        method,
        agent: false,
        lookup: guardedLookup,
        headers: {
          ...headers,
          ...(body === undefined ? {} : { 'content-length': String(Buffer.byteLength(body)) }),
        },
      },
      (res) => {
        const chunks: Buffer[] = []
        let size = 0
        res.on('data', (chunk: Buffer) => {
          size += chunk.length
          if (size > MAX_BODY_BYTES) {
            res.destroy(new Error('Shop response too large'))
            return
          }
          chunks.push(chunk)
        })
        res.on('end', () =>
          resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') })
        )
        res.on('error', reject)
      }
    )
    req.setTimeout(TIMEOUT_MS, () => req.destroy(new Error('Shop did not answer in time')))
    req.on('error', reject)
    req.end(body)
  })
