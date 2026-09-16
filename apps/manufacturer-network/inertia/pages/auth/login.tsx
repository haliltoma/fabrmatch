import { Form, Link } from '@adonisjs/inertia/react'

export default function Login() {
  return (
    <div className="fm-auth">
      <div>
        <h1>Giriş yap</h1>
        <p className="fm-small">Üretim paneline e-posta adresiniz ve şifrenizle girin.</p>
      </div>

      <Form route="session.store" className="fm-form">
        {({ errors, processing }) => (
          <>
            <div className="fm-field">
              <label htmlFor="email">E-posta</label>
              <input
                type="email"
                name="email"
                id="email"
                autoComplete="username"
                data-invalid={errors.email ? 'true' : undefined}
              />
              {errors.email && <p className="fm-field__error">{errors.email}</p>}
            </div>

            <div className="fm-field">
              <label htmlFor="password">Şifre</label>
              <input
                type="password"
                name="password"
                id="password"
                autoComplete="current-password"
                data-invalid={errors.password ? 'true' : undefined}
              />
              {errors.password && <p className="fm-field__error">{errors.password}</p>}
            </div>

            <button type="submit" className="fm-button fm-button--primary" disabled={processing}>
              giriş yap
            </button>
          </>
        )}
      </Form>

      <p className="fm-small">
        Hesabınız yok mu? <Link route="new_account.create">Üretici olarak katılın</Link>
      </p>
    </div>
  )
}
