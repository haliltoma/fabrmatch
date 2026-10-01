import { useState } from 'react'
import { router } from '@inertiajs/react'
import { makerNav } from '~/lib/nav'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { PageHeader } from '~/components/page_header'
import { formatMoney } from '~/lib/format'
import { useT } from '~/lib/i18n'

type Option = {
  id: number
  name: string
  description: string
  priceMinor: number
  materials: string[] | null
}

export default function MakerFinishing({
  options,
  offered,
}: {
  options: Option[]
  offered: number[]
}) {
  const { t } = useT()

  const [chosen, setChosen] = useState<Set<number>>(new Set(offered))
  const toggle = (id: number) =>
    setChosen((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={t('Finishing you offer')}
        description={t(
          'Tick only what you really do. Orders that ask for a finishing go only to makers who offer it, and you are paid the price shown for each unit.'
        )}
      />
      <Card>
        <CardHeader>
          <CardTitle>{t('Options')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {options.length === 0 ? (
            <p className="text-ink-700">{t('No finishing options are available yet.')}</p>
          ) : (
            <ul className="divide-y divide-line">
              {options.map((o) => (
                <li key={o.id} className="py-3">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={chosen.has(o.id)}
                      onChange={() => toggle(o.id)}
                    />
                    <span>
                      <span className="block font-medium text-ink-900">
                        {o.name} ·{' '}
                        {t('{amount} per unit', { amount: formatMoney(o.priceMinor, 'TRY') })}
                      </span>
                      <span className="block text-sm text-ink-700">{o.description}</span>
                      {o.materials && (
                        <span className="block text-xs text-ink-600">
                          {t('Only for {v2}', { v2: o.materials.join(', ') })}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <Button onClick={() => router.post('/maker/finishing', { optionIds: [...chosen] })}>
            {t('Save')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

MakerFinishing.layout = 'dashboard'
MakerFinishing.dashboardProps = { navItems: makerNav, title: 'Maker' }
