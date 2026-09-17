import { Form, Link } from '@adonisjs/inertia/react'

export default function Login() {
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

          <p className="fm-auth-brand__headline">
            Türkiye'nin 3D baskı üretici ağına hoş geldiniz
          </p>

          <ul className="fm-auth-brand__features">
            <li>
              <i className="ti ti-bolt" aria-hidden="true" />
              <span>Siparişler otomatik eşleştirilir, manuel teklif verebilirsiniz</span>
            </li>
            <li>
              <i className="ti ti-shield-lock" aria-hidden="true" />
              <span>Güvenli escrow: teslimat onaylandığında ödeme serbest bırakılır</span>
            </li>
            <li>
              <i className="ti ti-map-pin" aria-hidden="true" />
              <span>Bölgenize yakın siparişler öncelikli olarak iletilir</span>
            </li>
          </ul>
        </div>
      </aside>

      {/* Sağ panel — form */}
      <main className="fm-auth-form">
        <div className="fm-auth-form__inner">
          <div className="fm-auth-form__head">
            <h1>Giriş yap</h1>
            <p className="fm-auth-form__sub">Üretim panelinize erişmek için e-posta ve şifrenizi girin.</p>
          </div>

          <Form route="session.store" className="fm-form fm-form--compact">
            {({ errors, processing }) => (
              <>
                <div className="fm-field">
                  <label htmlFor="email">E-posta</label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    placeholder="uretici@atölye.com"
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

                <button
                  type="submit"
                  className="fm-button fm-button--primary fm-button--full"
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <i className="ti ti-loader-2 fm-spin" aria-hidden="true" /> giriş yapılıyor…
                    </>
                  ) : (
                    <>
                      <i className="ti ti-login" aria-hidden="true" /> giriş yap
                    </>
                  )}
                </button>
              </>
            )}
          </Form>

          <div className="fm-auth-form__footer">
            <span>Henüz hesabınız yok mu?</span>
            <Link route="new_account.create" className="fm-auth-form__join-link">
              <i className="ti ti-user-plus" aria-hidden="true" /> üretici olarak katılın
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
