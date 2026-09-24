import { BlockList, isIP } from 'node:net'
import DomainError from '#exceptions/domain_error'

export class WebhookUrlError extends DomainError {}

const blocked = new BlockList()
for (const [net, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  blocked.addSubnet(net, prefix, 'ipv4')
}
for (const [net, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['64:ff9b::', 96],
  ['100::', 64],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8],
] as const) {
  blocked.addSubnet(net, prefix, 'ipv6')
}

const MAPPED_V4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i

/** True only for a globally routable unicast address. Everything internal, reserved or unparsable is refused. */
export function isPublicAddress(address: string): boolean {
  const family = isIP(address)
  if (family === 0) return false
  const mapped = MAPPED_V4.exec(address)
  if (mapped) return isPublicAddress(mapped[1])
  // hex form of a mapped address (::ffff:7f00:1) is never a legitimate public target
  if (family === 6 && /^::ffff:/i.test(address)) return false
  return !blocked.check(address, family === 4 ? 'ipv4' : 'ipv6')
}

const INTERNAL_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.home', '.corp']

/**
 * Validates a seller-supplied webhook URL and returns it normalised. Literal IPs must be public;
 * host names are checked again at connect time (see the transport) so DNS tricks do not help.
 */
export function validateWebhookUrl(raw: string, options: { allowHttp: boolean }): string {
  const text = raw.trim()
  if (text.length === 0 || text.length > 500) throw new WebhookUrlError('Enter a valid URL')
  let url: URL
  try {
    url = new URL(text)
  } catch {
    throw new WebhookUrlError('Enter a valid URL')
  }
  if (url.protocol !== 'https:' && !(options.allowHttp && url.protocol === 'http:')) {
    throw new WebhookUrlError('The webhook URL must use https')
  }
  if (url.username || url.password) {
    throw new WebhookUrlError('The webhook URL must not contain credentials')
  }
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (host === '' || host === 'localhost' || INTERNAL_SUFFIXES.some((s) => host.endsWith(s))) {
    throw new WebhookUrlError('The webhook URL must point to a public host')
  }
  if (isIP(host) !== 0 && !isPublicAddress(host)) {
    throw new WebhookUrlError('The webhook URL must point to a public host')
  }
  if (isIP(host) === 0 && !host.includes('.')) {
    throw new WebhookUrlError('The webhook URL must point to a public host')
  }
  url.hash = ''
  return url.toString()
}
