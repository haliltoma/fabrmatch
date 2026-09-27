import { useT } from '~/lib/i18n'

export type Delivery = { country: string; served: boolean }

/**
 * Prices follow the visitor's likely country (P2). Orders are printed inside the delivery country
 * (cross-border is off), so where no maker works yet the price is shown but cannot be ordered.
 */
/** A country code as a name in the page language ("DE" → "Germany" / "Almanya"). */
export function countryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

export function DeliveryNotice({ delivery }: { delivery: Delivery | undefined }) {
  const { t, locale } = useT()
  if (!delivery || delivery.served) return null
  const country = countryName(delivery.country, locale)
  return (
    <p role="status" className="rounded-md bg-amber-soft p-3 text-sm text-amber-ink">
      {t(
        'Prices are shown for delivery to {country}, but no maker prints there yet, so orders to {country} cannot be placed for now.',
        { country }
      )}
    </p>
  )
}
