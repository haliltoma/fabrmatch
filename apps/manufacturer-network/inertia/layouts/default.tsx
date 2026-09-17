import { type Data } from '@generated/data'
import { toast, Toaster } from 'sonner'
import { usePage } from '@inertiajs/react'
import { type ReactElement, useEffect } from 'react'
import { Form, Link } from '@adonisjs/inertia/react'

export default function Layout({ children }: { children: ReactElement<Data.SharedProps> }) {
  const { url, flash } = usePage()

  useEffect(() => {
    toast.dismiss()
  }, [url])

  useEffect(() => {
    if (flash.error) toast.error(flash.error)
    if (flash.success) toast.success(flash.success)
  })

  const user = children.props.user

  // Auth sayfalarında header gösterilmez — split-screen layout kendi başlığını taşıyor
  const isAuthPage = url.startsWith('/login') || url.startsWith('/register') || url.startsWith('/signup')

  return (
    <>
      {!isAuthPage && (
        <header className="fm-header">
          <div className="fm-header__inner">
            <Link route="home" className="fm-brand">
              <span className="fm-brand__icon" aria-hidden="true">
                <i className="ti ti-briefcase" />
              </span>
              <span className="fm-brand__name">fabrmatch</span>
              <span className="fm-brand__scope">üretici ağı</span>
            </Link>

            <nav className="fm-nav" aria-label="Panel menü">
              {user ? (
                <>
                  <Link
                    route="panel.index"
                    className="fm-nav__link"
                    aria-current={url.startsWith('/panel') ? 'page' : undefined}
                  >
                    <i className="ti ti-layout-dashboard" aria-hidden="true" /> panel
                  </Link>
                  <span className="fm-nav__divider" aria-hidden="true" />
                  <span className="fm-badge fm-badge--honey fm-nav__user" title={user.email}>
                    <i className="ti ti-user" aria-hidden="true" />
                    {user.initials}
                  </span>
                  <Form route="session.destroy">
                    <button type="submit" className="fm-button fm-button--quiet fm-button--sm">
                      <i className="ti ti-logout" aria-hidden="true" /> çıkış
                    </button>
                  </Form>
                </>
              ) : (
                <>
                  <Link route="session.create" className="fm-nav__link">
                    <i className="ti ti-login" aria-hidden="true" /> giriş yap
                  </Link>
                  <Link route="new_account.create" className="fm-button fm-button--honey">
                    <i className="ti ti-user-plus" aria-hidden="true" /> üretici olarak katıl
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
      )}

      <main className={isAuthPage ? 'fm-auth-main' : undefined}>{children}</main>

      {/* richColors kapalı: 06 paleti dışında renk üretir */}
      <Toaster position="top-center" />
    </>
  )
}
