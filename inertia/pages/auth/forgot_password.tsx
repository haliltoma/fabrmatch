import { Form, Link } from '@adonisjs/inertia/react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { useT } from '~/lib/i18n'

function ForgotPassword() {
  const { t } = useT()

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          {t('Forgot password?')}
        </h1>
        <p className="text-sm text-ink-600">
          {t("Enter your email and we'll send you a reset link")}
        </p>
      </div>

      <Form route="auth_security.send_reset" className="space-y-4">
        {({ errors }) => (
          <>
            <div className="space-y-2">
              <Label htmlFor="email">{t('Email')}</Label>
              <Input
                type="email"
                name="email"
                id="email"
                placeholder="you@example.com"
                data-invalid={errors.email ? 'true' : undefined}
              />
              {errors.email && <p className="text-sm font-medium text-danger">{errors.email}</p>}
            </div>

            <Button type="submit" className="w-full">
              {t('Send reset link')}
            </Button>
          </>
        )}
      </Form>

      <p className="text-center text-sm text-ink-600">
        {t('Remember your password?')}{' '}
        <Link route="session.create" className="font-medium text-ink-700 hover:text-ink-900">
          {t('Log in')}
        </Link>
      </p>
    </div>
  )
}

ForgotPassword.layout = 'auth'

export default ForgotPassword
