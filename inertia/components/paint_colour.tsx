import { useT } from '~/lib/i18n'

export type PaintColour = { name: string; hex: string }

/**
 * Paint colour for a finishing that needs one. Native radios (keyboard and screen readers work),
 * each swatch named in text so the choice never rests on colour alone.
 */
export function PaintColourField({
  colours,
  value,
  onChange,
  id = 'paint-colour',
}: {
  colours: PaintColour[]
  value: string
  onChange: (name: string) => void
  id?: string
}) {
  const { t } = useT()
  if (colours.length === 0) return null
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-ink-900">{t('Paint colour')}</legend>
      <div className="flex flex-wrap gap-2">
        {colours.map((c) => (
          <label
            key={c.name}
            className={`flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-heat-500 ${
              value === c.name ? 'border-ink-900 ring-1 ring-ink-900' : 'border-line'
            }`}
          >
            <input
              type="radio"
              name={id}
              value={c.name}
              checked={value === c.name}
              onChange={() => onChange(c.name)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className="h-4 w-4 rounded-full border border-ink-900/20"
              style={{ backgroundColor: c.hex }}
            />
            <span className="text-ink-900">{t(c.name)}</span>
          </label>
        ))}
      </div>
      {!value && <p className="text-xs text-ink-600">{t('Pick the colour to paint it in.')}</p>}
    </fieldset>
  )
}
