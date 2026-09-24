import { Form, Link } from '@adonisjs/inertia/react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { useT } from '~/lib/i18n'

function Signup({ invited }: { invited: boolean }) {
  const { t } = useT()

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          {t('Create an account')}
        </h1>
        <p className="text-sm text-ink-600">
          {t('Enter your details to get started with Fabrmatch')}
        </p>
        {invited && (
          <p className="rounded-md bg-paper-sunken p-3 text-sm text-ink-800">
            {t('A friend invited you. Sign up and you get a coupon for your first order.')}
          </p>
        )}
      </div>

      <Form route="new_account.store" className="space-y-4">
        {({ errors }) => (
          <>
            <div className="space-y-2">
              <Label htmlFor="fullName">{t('Full name')}</Label>
              <Input
                type="text"
                name="fullName"
                id="fullName"
                placeholder={t('John Doe')}
                data-invalid={errors.fullName ? 'true' : undefined}
              />
              {errors.fullName && (
                <p className="text-sm font-medium text-danger">{errors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('Email')}</Label>
              <Input
                type="email"
                name="email"
                id="email"
                autoComplete="email"
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
              {t('Sign up')}
            </Button>
          </>
        )}
      </Form>

      <p className="text-center text-sm text-ink-600">
        {t('Already have an account?')}{' '}
        <Link route="session.create" className="font-medium text-ink-700 hover:text-ink-900">
          {t('Log in')}
        </Link>
      </p>
    </div>
  )
}

Signup.layout = 'auth'

export default Signup
