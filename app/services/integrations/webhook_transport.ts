import { lookup as dnsLookup } from 'node:dns'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { isIP, type LookupFunction } from 'node:net'
import { isPublicAddress } from '#services/integrations/webhook_url'

export interface WebhookRequest {
  url: string
  headers: Record<string, string>
  body: string
}

/** Sends one webhook POST. A response of any status is a result; a thrown error is a transport failure. */
export type WebhookTransport = (req: WebhookRequest) => Promise<{ status: number }>

const TIMEOUT_MS = 10_000

/**
 * Runs at connect time, so a host name that resolved to a public address when the URL was saved
 * cannot later be pointed at an internal one (DNS rebinding).
 */
const guardedLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, '', 4)
    if (addresses.length === 0 || addresses.some((a) => !isPublicAddress(a.address))) {
      return callback(new Error('Webhook target resolves to a non-public address'), '', 4)
    }
    if (options.all) return callback(null, addresses)
    return callback(null, addresses[0].address, addresses[0].family)
  })
}

/** Default transport: no redirects, short timeout, never connects to a non-public address. */
export const safeTransport: WebhookTransport = ({ url, headers, body }) =>
  new Promise((resolve, reject) => {
    const target = new URL(url)
    const host = target.hostname.replace(/^\[|\]$/g, '')
    // an IP literal skips DNS (and so the lookup guard): check it here
    if (isIP(host) !== 0 && !isPublicAddress(host)) {
      return reject(new Error('Webhook target is not a public address'))
    }
    const send = target.protocol === 'https:' ? httpsRequest : httpRequest
    const req = send(
      target,
      {
        method: 'POST',
        agent: false,
        lookup: guardedLookup,
        headers: { ...headers, 'content-length': String(Buffer.byteLength(body)) },
      },
      (res) => {
        const status = res.statusCode ?? 0
        res.destroy()
        resolve({ status })
      }
    )
    req.setTimeout(TIMEOUT_MS, () => req.destroy(new Error('Timed out')))
    req.on('error', reject)
    req.end(body)
  })
