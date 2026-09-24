import { useForm } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { useT } from '~/lib/i18n'

function TwoFactor() {
  const { t } = useT()

  const form = useForm({ code: '' })
  const error = (form.errors as Record<string, string | undefined>).code

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{t('Second step')}</h1>
        <p className="text-sm text-ink-600">
          {t('Enter the 6-digit code from your authenticator app, or one of your backup codes.')}
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          form.post('/login/two-factor')
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="code">{t('Code')}</Label>
          <Input
            id="code"
            name="code"
            autoComplete="one-time-code"
            autoFocus
            value={form.data.code}
            onChange={(e) => form.setData('code', e.target.value)}
            data-invalid={error ? 'true' : undefined}
          />
          {error && <p className="text-sm font-medium text-danger">{t(error)}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={form.processing}>
          {t('Verify and sign in')}
        </Button>
      </form>

      <p className="text-center text-sm text-ink-600">
        <Link route="session.create" className="font-medium text-ink-700 hover:text-ink-900">
          {t('Start over')}
        </Link>
      </p>
    </div>
  )
}

TwoFactor.layout = 'auth'

export default TwoFactor
