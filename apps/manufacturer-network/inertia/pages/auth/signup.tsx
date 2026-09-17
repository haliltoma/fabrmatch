import { Form, Link } from '@adonisjs/inertia/react'

export default function Signup() {
  return (
    <div className="fm-auth-split">
      {/* Sol panel — B2B marka */}
      <aside className="fm-auth-brand">
        <div className="fm-auth-brand__inner">
          <div className="fm-auth-brand__logo">
            <span className="fm-auth-brand__icon">
              <i className="ti ti-briefcase" aria-hidden="true" />
            </span>
            <div>
              <div className="fm-auth-brand__name">fabrmatch</div>
              <div className="fm-auth-brand__sub">üretici ağı</div>
            </div>
          </div>

          <div className="fm-auth-brand__divider" />

          <p className="fm-auth-brand__headline">Üretime hazır mısınız?</p>

          <ul className="fm-auth-brand__features">
            <li>
              <i className="ti ti-clock" aria-hidden="true" />
              <span>Kayıt 2 dakika, profil onayı genellikle 24 saat içinde</span>
            </li>
            <li>
              <i className="ti ti-settings-2" aria-hidden="true" />
              <span>Kapasite, malzeme ve bölge tercihlerinizi kendiniz belirleyin</span>
            </li>
            <li>
              <i className="ti ti-wallet" aria-hidden="true" />
              <span>Stripe üzerinden güvenli, otomatik ödemeler</span>
            </li>
          </ul>
        </div>
      </aside>

      {/* Sağ panel — form */}
      <main className="fm-auth-form">
        <div className="fm-auth-form__inner">
          <div className="fm-auth-form__head">
            <h1>Üretici hesabı oluştur</h1>
            <p className="fm-auth-form__sub">
              Hesabınızı açtıktan sonra atölye profilinizi ve kapasitenizi tanımlayacaksınız.
            </p>
          </div>

          <Form route="new_account.store" className="fm-form fm-form--compact">
            {({ errors, processing }) => (
              <>
                <div className="fm-field">
                  <label htmlFor="fullName">Ad soyad</label>
                  <input
                    type="text"
                    name="fullName"
                    id="fullName"
                    placeholder="Ahmet Yılmaz"
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
                    placeholder="uretici@atölye.com"
                    autoComplete="email"
                    data-invalid={errors.email ? 'true' : undefined}
                  />
                  {errors.email && <p className="fm-field__error">{errors.email}</p>}
                </div>

                <div className="fm-form__grid">
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
                    {errors.passwordConfirmation && (
                      <p className="fm-field__error">{errors.passwordConfirmation}</p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="fm-button fm-button--primary fm-button--full"
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <i className="ti ti-loader-2 fm-spin" aria-hidden="true" /> oluşturuluyor…
                    </>
                  ) : (
                    <>
                      <i className="ti ti-user-plus" aria-hidden="true" /> hesabı oluştur
                    </>
                  )}
                </button>
              </>
            )}
          </Form>

          <div className="fm-auth-form__footer">
            <span>Zaten hesabınız var mı?</span>
            <Link route="session.create" className="fm-auth-form__join-link">
              <i className="ti ti-login" aria-hidden="true" /> giriş yapın
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
