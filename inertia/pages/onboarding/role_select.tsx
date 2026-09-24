import { Form } from '@adonisjs/inertia/react'
import { Store, Factory } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { useState } from 'react'
import { cn } from '~/lib/utils'
import { useT } from '~/lib/i18n'

export default function RoleSelect() {
  const { t } = useT()

  const [selected, setSelected] = useState<'seller' | 'manufacturer' | null>(null)

  return (
    <div className="mx-auto max-w-2xl py-12">
      <div className="mb-8 text-center">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-heat-700">
          {t('Step 1 of 2')}
        </p>
        <h1 className="font-display text-4xl font-semibold text-ink-900">
          {t('Choose your role')}
        </h1>
        <p className="mt-2 text-ink-600">
          {t('How will you use Fabrmatch? You can add more roles later.')}
        </p>
      </div>

      <Form route="onboarding.store_role" className="space-y-6">
        {() => (
          <>
            <input type="hidden" name="role" value={selected || ''} />
            <div className="grid gap-4 sm:grid-cols-2">
              <button type="button" onClick={() => setSelected('seller')} className="text-left">
                <Card
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md',
                    selected === 'seller' && 'ring-2 ring-heat-500 border-heat-500'
                  )}
                >
                  <CardHeader>
                    <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-ink-50 text-ink-700">
                      <Store className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">{t('Seller')}</CardTitle>
                    <CardDescription>
                      {t('I want to sell 3D printed products or order prints for my designs.')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm text-ink-700">
                      <li>{t('Upload 3D model files')}</li>
                      <li>{t('Get instant quotes')}</li>
                      <li>{t('Track orders')}</li>
                    </ul>
                  </CardContent>
                </Card>
              </button>

              <button
                type="button"
                onClick={() => setSelected('manufacturer')}
                className="text-left"
              >
                <Card
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md',
                    selected === 'manufacturer' && 'ring-2 ring-heat-500 border-heat-500'
                  )}
                >
                  <CardHeader>
                    <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-heat-50 text-heat-700">
                      <Factory className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">{t('Manufacturer')}</CardTitle>
                    <CardDescription>
                      {t('I have 3D printers and want to fulfill print orders.')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm text-ink-700">
                      <li>{t('Receive matched orders')}</li>
                      <li>{t('Set your capabilities')}</li>
                      <li>{t('Earn from printing')}</li>
                    </ul>
                  </CardContent>
                </Card>
              </button>
            </div>

            <div className="flex justify-center">
              <Button type="submit" size="lg" disabled={!selected} className="min-w-[200px]">
                {t('Continue')}
              </Button>
            </div>
          </>
        )}
      </Form>
    </div>
  )
}
