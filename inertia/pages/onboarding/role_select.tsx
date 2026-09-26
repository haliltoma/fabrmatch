import { Form } from '@adonisjs/inertia/react'
import { Store, Factory, Package } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'
import { useT } from '~/lib/i18n'

type Choice = 'buyer' | 'seller' | 'manufacturer'

/** A native radio styled as a card: arrow keys, focus ring and screen readers work without extra ARIA. */
function RoleOption({
  value,
  selected,
  onSelect,
  icon,
  title,
  description,
  points,
  badge,
  wide,
}: {
  value: Choice
  selected: boolean
  onSelect: (value: Choice) => void
  icon: ReactNode
  title: string
  description: string
  points: string[]
  badge?: string
  wide?: boolean
}) {
  return (
    <label
      className={cn(
        'relative flex cursor-pointer gap-4 rounded-xl border border-line bg-paper-raised p-5 transition-colors hover:border-ink-500',
        'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-heat-500',
        selected && 'border-heat-500 ring-2 ring-heat-500',
        wide ? 'sm:col-span-2 layer-lines' : 'flex-col'
      )}
    >
      <input
        type="radio"
        name="role"
        value={value}
        checked={selected}
        onChange={() => onSelect(value)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-paper-sunken text-ink-700"
      >
        {icon}
      </span>
      <span className="block">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-display text-xl font-semibold text-ink-900">{title}</span>
          {badge && (
            <span className="rounded-full bg-fil-100 px-2 py-0.5 text-xs font-medium text-fil-700">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-1 block text-sm text-ink-700">{description}</span>
        <span className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-600">
          {points.map((p) => (
            <span key={p}>· {p}</span>
          ))}
        </span>
      </span>
    </label>
  )
}

export default function RoleSelect() {
  const { t } = useT()
  const [selected, setSelected] = useState<Choice | null>(null)

  return (
    <div className="mx-auto max-w-2xl py-12">
      <div className="mb-8 text-center">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-heat-700">
          {selected === 'buyer' ? t('One step') : t('Step 1 of 2')}
        </p>
        <h1 className="font-display text-4xl font-semibold text-ink-900">
          {t('What brings you to Fabrmatch?')}
        </h1>
        <p className="mt-2 text-ink-600">{t('You can add the other roles later.')}</p>
      </div>

      <Form route="onboarding.store_role" className="space-y-6">
        {({ processing }) => (
          <>
            <fieldset>
              <legend className="sr-only">{t('Choose your role')}</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <RoleOption
                  wide
                  value="buyer"
                  selected={selected === 'buyer'}
                  onSelect={setSelected}
                  icon={<Package className="h-6 w-6" />}
                  title={t('I just want something printed')}
                  badge={t('No setup')}
                  description={t(
                    'Upload your model, see the price in seconds and order. Payment stays protected until delivery.'
                  )}
                  points={[t('Instant price'), t('Verified makers'), t('Protected payment')]}
                />
                <RoleOption
                  value="seller"
                  selected={selected === 'seller'}
                  onSelect={setSelected}
                  icon={<Store className="h-6 w-6" />}
                  title={t('Seller')}
                  description={t(
                    'Sell 3D printed products under your own brand. We print and ship; the margin is yours.'
                  )}
                  points={[t('No stock'), t('Your margin'), t('Order a sample')]}
                />
                <RoleOption
                  value="manufacturer"
                  selected={selected === 'manufacturer'}
                  onSelect={setSelected}
                  icon={<Factory className="h-6 w-6" />}
                  title={t('Manufacturer')}
                  description={t('I have 3D printers and want to fulfill print orders.')}
                  points={[t('Receive matched orders'), t('Earn from printing')]}
                />
              </div>
            </fieldset>

            <div className="flex flex-col items-center gap-2">
              <Button
                type="submit"
                size="lg"
                disabled={!selected || processing}
                className="min-w-[200px]"
              >
                {selected === 'buyer' ? t('Upload a model') : t('Continue')}
              </Button>
              {!selected && (
                <p className="text-sm text-ink-600" aria-live="polite">
                  {t('Pick one to continue.')}
                </p>
              )}
            </div>
          </>
        )}
      </Form>
    </div>
  )
}
