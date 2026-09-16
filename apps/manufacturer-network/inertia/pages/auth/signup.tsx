import { Form, Link } from '@adonisjs/inertia/react'

export default function Signup() {
  return (
    <div className="fm-auth">
      <div>
        <h1>Üretici olarak katılın</h1>
        <p className="fm-small">
          Hesabınızı oluşturduktan sonra atölye profilinizi ve kapasitenizi tanımlayacaksınız.
        </p>
      </div>

      <Form route="new_account.store" className="fm-form">
        {({ errors, processing }) => (
          <>
            <div className="fm-field">
              <label htmlFor="fullName">Ad soyad</label>
              <input
                type="text"
                name="fullName"
                id="fullName"
                autoComplete="name"
                data-invalid={errors.fullName ? 'true' : undefined}
              />
              {errors.fullName && <p className="fm-field__error">{errors.fullName}</p>}
            </div>

            <div className="fm-field">
              <label htmlFor="email">E-posta</label>
              <input
                type="email"
                name="email"
                id="email"
                autoComplete="email"
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
                autoComplete="new-password"
                data-invalid={errors.password ? 'true' : undefined}
              />
              {errors.password && <p className="fm-field__error">{errors.password}</p>}
            </div>

            <div className="fm-field">
              <label htmlFor="passwordConfirmation">Şifre tekrarı</label>
              <input
                type="password"
                name="passwordConfirmation"
                id="passwordConfirmation"
                autoComplete="new-password"
                data-invalid={errors.passwordConfirmation ? 'true' : undefined}
              />
              {errors.passwordConfirmation && <p className="fm-field__error">{errors.passwordConfirmation}</p>}
            </div>

            <button type="submit" className="fm-button fm-button--primary" disabled={processing}>
              hesap oluştur
            </button>
          </>
        )}
      </Form>

      <p className="fm-small">
        Zaten hesabınız var mı? <Link route="session.create">Giriş yapın</Link>
      </p>
    </div>
  )
}
