import { useT } from '~/lib/i18n'
import { Input } from '~/components/ui/input'

export type CatalogueColour = { name: string; hex: string }
export type ChosenColour = { name: string; part: string }

/**
 * The buyer's filament colour(s): one, or up to `max` for a multi-colour print, each with the part
 * it is for. Native checkboxes (keyboard and screen readers work); every swatch is named in text and
 * numbered in the order picked, so the choice never rests on colour alone.
 * `lockedCount`: a revision answer may swap colours but not change how many (that changes the price).
 * There a removed colour leaves its slot (position and part name) for the next one picked.
 * An empty slot has `name: ''`.
 */
export function ColourPicker({
  id,
  colours,
  value,
  onChange,
  max,
  lockedCount,
  extraNote,
}: {
  id: string
  colours: CatalogueColour[]
  value: ChosenColour[]
  onChange: (next: ChosenColour[]) => void
  max: number
  lockedCount?: number
  /** e.g. "+≈ 0.50 USD per piece for each extra colour" */
  extraNote?: string
}) {
  const { t } = useT()
  const limit = lockedCount ?? max
  const picked = value.filter((v) => v.name !== '')
  const full = picked.length >= limit
  const hexOf = (name: string) => colours.find((c) => c.name === name)?.hex ?? '#999999'

  const toggle = (name: string) => {
    const at = value.findIndex((v) => v.name === name)
    if (at >= 0) {
      onChange(
        lockedCount === undefined
          ? value.filter((v) => v.name !== name)
          : value.map((v, i) => (i === at ? { ...v, name: '' } : v))
      )
      return
    }
    if (full) return
    const slot = value.findIndex((v) => v.name === '')
    onChange(
      slot >= 0
        ? value.map((v, i) => (i === slot ? { ...v, name } : v))
        : [...value, { name, part: '' }]
    )
  }
  const setPart = (index: number, part: string) =>
    onChange(value.map((v, i) => (i === index ? { ...v, part } : v)))

  const hint =
    lockedCount !== undefined
      ? lockedCount === 1
        ? t('Pick 1 colour. The price stays the same.')
        : t('Pick {n} colours. The price stays the same.', { n: lockedCount })
      : picked.length === 0
        ? t('Pick a colour, or up to {max} for a multi-colour print.', { max })
        : full
          ? t('That is the most colours one print can have.')
          : null

  return (
    <fieldset className="space-y-2" aria-describedby={`${id}-hint`}>
      <legend className="text-sm font-medium text-ink-900">{t('Colour')}</legend>
      <div className="flex flex-wrap gap-2">
        {colours.map((c) => {
          const index = value.findIndex((v) => v.name === c.name)
          const isPicked = index >= 0
          return (
            <label
              key={c.name}
              className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-heat-500 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 ${
                isPicked ? 'border-ink-900 ring-1 ring-ink-900' : 'border-line'
              }`}
            >
              <input
                type="checkbox"
                name={id}
                value={c.name}
                checked={isPicked}
                disabled={!isPicked && full}
                onChange={() => toggle(c.name)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className="h-4 w-4 rounded-full border border-ink-900/20"
                style={{ backgroundColor: c.hex }}
              />
              <span className="text-ink-900">{t(c.name)}</span>
              {isPicked && limit > 1 && (
                <span className="tabular rounded-sm bg-ink-900 px-1 font-mono text-[11px] leading-4 text-paper">
                  {index + 1}
                </span>
              )}
            </label>
          )
        })}
      </div>
      {(hint || extraNote) && (
        <p id={`${id}-hint`} className="text-xs text-ink-600">
          {hint}
          {hint && extraNote && ' '}
          {extraNote}
        </p>
      )}

      {value.length > 1 && (
        <div className="space-y-2 rounded-md border border-line bg-paper-sunken p-3">
          <p className="text-xs text-ink-700">
            {t('Which part gets which colour? The maker reads this.')}
          </p>
          {value.map((v, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="tabular w-4 shrink-0 font-mono text-xs text-ink-600">{i + 1}</span>
              <span
                aria-hidden="true"
                className={`h-4 w-4 shrink-0 rounded-full border ${
                  v.name ? 'border-ink-900/20' : 'border-dashed border-ink-600'
                }`}
                style={v.name ? { backgroundColor: hexOf(v.name) } : undefined}
              />
              <label htmlFor={`${id}-part-${i}`} className="w-20 shrink-0 text-sm text-ink-900">
                {v.name ? t(v.name) : t('Pick one')}
              </label>
              <Input
                id={`${id}-part-${i}`}
                value={v.part}
                maxLength={40}
                placeholder={t('e.g. head, base, text')}
                onChange={(e) => setPart(i, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}
    </fieldset>
  )
}
