import { useState } from 'react'
import { router } from '@inertiajs/react'
import { makerNav } from '~/lib/nav'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { PageHeader } from '~/components/page_header'
import { useT } from '~/lib/i18n'

export default function MakerPayout({ masked }: { masked: string | null }) {
  const { t } = useT()

  const [iban, setIban] = useState('')
  const [password, setPassword] = useState('')
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title={t('Payout account')}
        description={t('Your share is paid to this bank account once the buyer confirms delivery.')}
      />
      <Card>
        <CardHeader>
          <CardTitle>{masked ? t('Current account') : t('No account yet')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {masked && (
            <p
              className="tabular font-mono text-sm text-ink-900"
              aria-label={t('Saved IBAN, partly hidden')}
            >
              {masked}
            </p>
          )}
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              router.post('/maker/payout', { iban, password }, { onSuccess: () => setPassword('') })
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="iban">{masked ? t('New IBAN') : 'IBAN'}</Label>
              <Input
                id="iban"
                value={iban}
                autoComplete="off"
                placeholder={t('TR00 0000 0000 0000 0000 0000 00')}
                onChange={(e) => setIban(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="iban-password">{t('Your password')}</Label>
              <Input
                id="iban-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-ink-600">
                {t('We ask again because this decides where your money goes.')}
              </p>
            </div>
            <Button type="submit" disabled={iban.trim().length < 15 || password === ''}>
              {t('Save account')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

MakerPayout.layout = 'dashboard'
MakerPayout.dashboardProps = { navItems: makerNav, title: 'Maker Panel' }
