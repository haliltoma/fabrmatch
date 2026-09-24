import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { PageHeader } from '~/components/page_header'
import { formatDateTime } from '~/lib/format'
import { useT } from '~/lib/i18n'

export default function AccountPrivacy({
  blockers,
  consents,
}: {
  blockers: string[]
  consents: Array<{ kind: string; version: string; granted: boolean; at: string | null }>
}) {
  const { t } = useT()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <PageHeader
        title={t('Your data')}
        description={t('Download everything we hold about you, or delete your account.')}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('Download your data')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-ink-700">
            {t(
              'A JSON file with your account, profiles, orders you placed, messages you wrote, files and notifications. Other people’s details are not included.'
            )}
          </p>
          <Button asChild variant="outline">
            <a href="/account/privacy/export" download>
              {t('Download my data')}
            </a>
          </Button>
        </CardContent>
      </Card>

      {consents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('Consents on record')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-ink-700">
              {consents.map((c) => (
                <li key={c.kind}>
                  {t(c.kind.replace('_', ' '))} · {c.granted ? t('agreed') : t('withdrawn')} ·{' '}
                  {t('version {version}', { version: c.version })} · {formatDateTime(c.at)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('Delete my account')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-ink-700">
            {t(
              'Your name, e-mail, addresses, tax and bank details are erased and your uploaded models are deleted. Payment and order records are kept without any personal details, because the law and our accounts require it. This cannot be undone.'
            )}
          </p>
          {blockers.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-danger">
              {blockers.map((b) => (
                <li key={b}>{t(b)}</li>
              ))}
              <li className="list-none text-ink-600">{t('Come back once these are finished.')}</li>
            </ul>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                router.post('/account/privacy/delete', { password, confirm })
              }}
            >
              <div className="space-y-1">
                <Label htmlFor="del-pw">{t('Password')}</Label>
                <Input
                  id="del-pw"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="del-confirm">{t('Type DELETE to confirm')}</Label>
                <Input
                  id="del-confirm"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                variant="destructive"
                disabled={password === '' || confirm !== 'DELETE'}
              >
                {t('Delete my account')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
