export interface Attribution {
  source: string | null
  medium: string | null
  campaign: string | null
}

const clean = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') return null
  const v = value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9._\- ]/g, '')
    .slice(0, max)
  return v === '' ? null : v
}

/**
 * First-touch source of a visit: explicit utm_* wins, otherwise an external referrer host.
 * Only campaign labels and a host name are kept — never a full URL, query string or identity.
 */
export function readAttribution(input: {
  query: Record<string, unknown>
  referrer: string | null | undefined
  ownHost: string
}): Attribution | null {
  const source = clean(input.query.utm_source, 60)
  if (source) {
    return {
      source,
      medium: clean(input.query.utm_medium, 60),
      campaign: clean(input.query.utm_campaign, 80),
    }
  }
  if (!input.referrer) return null
  try {
    const host = new URL(input.referrer).hostname.replace(/^www\./, '')
    if (host === '' || host === input.ownHost.replace(/^www\./, '')) return null
    return { source: clean(host, 60), medium: 'referral', campaign: null }
  } catch {
    return null
  }
}
