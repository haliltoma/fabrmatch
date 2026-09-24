import { useState } from 'react'
import { Input } from '~/components/ui/input'
import { minorToInput, parseMoneyToMinor } from '~/lib/money'
import { useT } from '~/lib/i18n'

/**
 * Amount typed in major units ("0,60"); reports integer minor units (60) or null while invalid.
 * Currency is display only — the server owns the currency.
 */
export function MoneyInput({
  id,
  valueMinor,
  onChange,
  currency = 'TRY',
  required,
}: {
  id: string
  valueMinor: number | null
  onChange: (minor: number | null) => void
  currency?: string
  required?: boolean
}) {
  const { t } = useT()

  const [text, setText] = useState(valueMinor === null ? '' : minorToInput(valueMinor))
  const invalid = text.trim() !== '' && parseMoneyToMinor(text) === null

  return (
    <div className="relative">
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        required={required}
        aria-invalid={invalid}
        data-invalid={invalid}
        className="pr-14 tabular"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          onChange(parseMoneyToMinor(e.target.value))
        }}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-ink-600">
        {currency}
      </span>
      {invalid && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {t('Enter an amount like 0,60 or 12.50')}
        </p>
      )}
    </div>
  )
}
