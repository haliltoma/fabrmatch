import { usePage } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { useT } from '~/lib/i18n'

/** Shown at checkout once legal acceptance is switched on (LEGAL_ACCEPTANCE_REQUIRED). */
export function useLegalAcceptance() {
  const { props } = usePage<{ legalAcceptanceRequired?: boolean }>()
  return props.legalAcceptanceRequired === true
}

export function TermsCheckbox({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  const { t } = useT()

  const required = useLegalAcceptance()
  if (!required) return null
  return (
    <label className="flex items-start gap-3 text-sm text-ink-700">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0 accent-heat-600"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        {t('I have read and accept the')}{' '}
        <Link href="/legal/terms" className="underline">
          {t('terms of use')}
        </Link>
        {t(', the')}{' '}
        <Link href="/legal/distance-sales" className="underline">
          {t('distance sales terms')}
        </Link>{' '}
        {t('and the')}{' '}
        <Link href="/legal/refunds" className="underline">
          {t('cancellation policy')}
        </Link>
        .
      </span>
    </label>
  )
}
