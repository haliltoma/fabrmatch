import { Form, Link } from '@adonisjs/inertia/react'
import { useT } from '~/lib/i18n'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'

function Login() {
  const { t } = useT()
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{t('Welcome back')}</h1>
        <p className="text-sm text-ink-600">{t('Enter your credentials to access your account')}</p>
      </div>

      <Form route="session.store" className="space-y-4">
        {({ errors }) => (
          <>
            <div className="space-y-2">
              <Label htmlFor="email">{t('Email')}</Label>
              <Input
                type="email"
                name="email"
                id="email"
                autoComplete="username"
                placeholder="you@example.com"
                data-invalid={errors.email ? 'true' : undefined}
              />
              {errors.email && <p className="text-sm font-medium text-danger">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('Password')}</Label>
              <Input
                type="password"
                name="password"
                id="password"
                autoComplete="current-password"
                data-invalid={errors.password ? 'true' : undefined}
              />
              {errors.password && (
                <p className="text-sm font-medium text-danger">{errors.password}</p>
              )}
            </div>

            <Button type="submit" className="w-full">
              {t('Log in')}
            </Button>
          </>
        )}
      </Form>

      <p className="text-center text-sm text-ink-600">
        {t("Don't have an account?")}{' '}
        <Link route="new_account.create" className="font-medium text-ink-700 hover:text-ink-900">
          {t('Sign up')}
        </Link>
      </p>
    </div>
  )
}

Login.layout = 'auth'

export default Login
