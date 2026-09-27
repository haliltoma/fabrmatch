import type { HttpContext } from '@adonisjs/core/http'
import { countryFromAcceptLanguage } from '#services/pricing/display_currency'

/**
 * Where a visitor most likely wants delivery, for browse prices before any address is known:
 * the country the edge reports, then the browser's region, then Türkiye (the launch market).
 * Checkout always reprices for the real delivery address.
 */
export function visitorCountry(ctx: { request: Pick<HttpContext['request'], 'header'> }): string {
  const edge = (ctx.request.header('cf-ipcountry') ?? '').trim().toUpperCase()
  // Cloudflare sends XX for unknown and T1 for Tor
  if (/^[A-Z]{2}$/.test(edge) && edge !== 'XX' && edge !== 'T1') return edge
  return countryFromAcceptLanguage(ctx.request.header('accept-language')) ?? 'TR'
}
