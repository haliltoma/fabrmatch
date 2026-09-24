import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { PageHeader } from '~/components/page_header'
import { formatDateTime } from '~/lib/format'
import { useT } from '~/lib/i18n'

type SessionRow = {
  id: string
  ipAddress: string | null
  device: string
  lastSeenAt: string | null
  current: boolean
}
type Props = {
  twoFactor: {
    enabled: boolean
    required: boolean
    backupCodesRemaining: number
    setup: { secret: string; uri: string } | null
  }
  newBackupCodes: string[] | null
  sessions: SessionRow[]
}

function Field({
  id,
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
}: {
  id: string
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function BackupCodes({ codes }: { codes: string[] }) {
  const { t } = useT()

  return (
    <div className="space-y-2 rounded-lg border border-heat-500 bg-heat-50 p-4">
      <p className="font-medium text-ink-900">{t('Save these backup codes now')}</p>
      <p className="text-sm text-ink-700">
        {t('Each works once if you lose your phone. They will not be shown again.')}
      </p>
      <ul className="tabular grid grid-cols-2 gap-1 font-mono text-sm text-ink-900">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </div>
  )
}

function TwoFactorCard({ twoFactor }: { twoFactor: Props['twoFactor'] }) {
  const { t } = useT()

  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t('Two-factor authentication')}
          <Badge variant={twoFactor.enabled ? 'success' : 'secondary'}>
            {twoFactor.enabled ? 'On' : 'Off'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!twoFactor.enabled && !twoFactor.setup && (
          <>
            <p className="text-ink-700">
              {twoFactor.required
                ? t('Admin accounts must use an authenticator app before the admin panel opens.')
                : t(
                    'Add a second step at login with an authenticator app such as 1Password, Authy or Google Authenticator.'
                  )}
            </p>
            <Button onClick={() => router.post('/account/security/two-factor/start')}>
              {t('Set up')}
            </Button>
          </>
        )}

        {!twoFactor.enabled && twoFactor.setup && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              router.post('/account/security/two-factor/enable', { code })
            }}
          >
            <p className="text-ink-700">
              {t(
                'In your authenticator app add an account by key, then enter the 6-digit code it shows.'
              )}
            </p>
            <p className="tabular break-all rounded-md bg-paper-sunken px-3 py-2 font-mono text-sm text-ink-900">
              {twoFactor.setup.secret}
            </p>
            <a className="text-sm text-heat-700 underline" href={twoFactor.setup.uri}>
              {t('Open in authenticator app')}
            </a>
            <Field
              id="setup-code"
              label={t('6-digit code')}
              value={code}
              onChange={setCode}
              autoComplete="one-time-code"
            />
            <Button type="submit" disabled={code.trim().length < 6}>
              {t('Turn on')}
            </Button>
          </form>
        )}

        {twoFactor.enabled && (
          <>
            <p className="text-ink-700">
              {twoFactor.backupCodesRemaining === 1
                ? t('{count} backup code left.', { count: twoFactor.backupCodesRemaining })
                : t('{count} backup codes left.', { count: twoFactor.backupCodesRemaining })}
            </p>
            <Field
              id="tf-code"
              label={t('Current code (to change anything here)')}
              value={code}
              onChange={setCode}
              autoComplete="one-time-code"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={code.trim().length < 6}
                onClick={() => router.post('/account/security/two-factor/backup-codes', { code })}
              >
                {t('New backup codes')}
              </Button>
            </div>
            {!twoFactor.required && (
              <div className="space-y-2 border-t border-line pt-4">
                <Field
                  id="tf-password"
                  label={t('Password (to turn off)')}
                  type="password"
                  value={password}
                  onChange={setPassword}
                  autoComplete="current-password"
                />
                <Button
                  variant="destructive"
                  disabled={code.trim().length < 6 || password === ''}
                  onClick={() =>
                    router.post('/account/security/two-factor/disable', { password, code })
                  }
                >
                  {t('Turn off')}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function PasswordCard() {
  const { t } = useT()

  const [form, setForm] = useState({ currentPassword: '', password: '', passwordConfirmation: '' })
  const set = (key: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Password')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            router.post('/account/security/password', form, {
              onSuccess: () =>
                setForm({ currentPassword: '', password: '', passwordConfirmation: '' }),
            })
          }}
        >
          <Field
            id="pw-current"
            label={t('Current password')}
            type="password"
            value={form.currentPassword}
            onChange={set('currentPassword')}
            autoComplete="current-password"
          />
          <Field
            id="pw-new"
            label={t('New password')}
            type="password"
            value={form.password}
            onChange={set('password')}
            autoComplete="new-password"
          />
          <Field
            id="pw-confirm"
            label={t('Repeat new password')}
            type="password"
            value={form.passwordConfirmation}
            onChange={set('passwordConfirmation')}
            autoComplete="new-password"
          />
          <p className="text-sm text-ink-600">{t('Changing it signs out every other device.')}</p>
          <Button type="submit">{t('Change password')}</Button>
        </form>
      </CardContent>
    </Card>
  )
}

function SessionsCard({ sessions }: { sessions: SessionRow[] }) {
  const { t } = useT()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Where you are signed in')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y divide-line">
          {sessions.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium text-ink-900">
                  {s.device} {s.current && <Badge variant="accent">{t('This device')}</Badge>}
                </p>
                <p className="text-xs text-ink-600">
                  {s.ipAddress ?? t('unknown address')} ·{' '}
                  {t('last active {when}', { when: formatDateTime(s.lastSeenAt) })}
                </p>
              </div>
              {!s.current && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.post(`/account/security/sessions/${s.id}/revoke`)}
                >
                  {t('Sign out')}
                </Button>
              )}
            </li>
          ))}
        </ul>
        {sessions.length > 1 && (
          <Button
            variant="outline"
            onClick={() => router.post('/account/security/sessions/revoke-others')}
          >
            {t('Sign out everywhere else')}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default function AccountSecurity({ twoFactor, newBackupCodes, sessions }: Props) {
  const { t } = useT()

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <PageHeader
        title={t('Account security')}
        description={t('Protect your account and see where it is in use.')}
      />
      {newBackupCodes && <BackupCodes codes={newBackupCodes} />}
      <TwoFactorCard twoFactor={twoFactor} />
      <PasswordCard />
      <SessionsCard sessions={sessions} />
      <p className="text-sm text-ink-600">
        <a href="/account/privacy" className="underline">
          {t('Download or delete your data')}
        </a>
      </p>
    </div>
  )
}
