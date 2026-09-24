import { Form, Link } from '@adonisjs/inertia/react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { useT } from '~/lib/i18n'

interface Props {
  token: string
}

function ResetPassword({ token }: Props) {
  const { t } = useT()

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          {t('Reset password')}
        </h1>
        <p className="text-sm text-ink-600">{t('Enter your new password below')}</p>
      </div>

      <Form route="auth_security.reset_password" className="space-y-4">
        {({ errors }) => (
          <>
            <input type="hidden" name="token" value={token} />

            <div className="space-y-2">
              <Label htmlFor="password">{t('New password')}</Label>
              <Input
                type="password"
                name="password"
                id="password"
                autoComplete="new-password"
                placeholder={t('Min. 8 characters')}
                data-invalid={errors.password ? 'true' : undefined}
              />
              {errors.password && (
                <p className="text-sm font-medium text-danger">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordConfirmation">{t('Confirm password')}</Label>
              <Input
                type="password"
                name="passwordConfirmation"
                id="passwordConfirmation"
                autoComplete="new-password"
                data-invalid={errors.passwordConfirmation ? 'true' : undefined}
              />
              {errors.passwordConfirmation && (
                <p className="text-sm font-medium text-danger">{errors.passwordConfirmation}</p>
              )}
            </div>

            <Button type="submit" className="w-full">
              {t('Reset password')}
            </Button>
          </>
        )}
      </Form>

      <p className="text-center text-sm text-ink-600">
        <Link route="session.create" className="font-medium text-ink-700 hover:text-ink-900">
          {t('Back to login')}
        </Link>
      </p>
    </div>
  )
}

ResetPassword.layout = 'auth'

export default ResetPassword
