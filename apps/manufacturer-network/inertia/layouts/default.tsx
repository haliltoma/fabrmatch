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
    if (flash.error) {
      toast.error(flash.error)
    }
    if (flash.success) {
      toast.success(flash.success)
    }
  })

  const user = children.props.user

  return (
    <>
      <header className="fm-header">
        <div className="fm-header__inner">
          <Link route="home" className="fm-brand">
            <i className="ti ti-briefcase" aria-hidden="true" /> Fabrmatch üretici ağı
          </Link>
          <nav className="fm-nav">
            {user ? (
              <>
                <Link route="panel.index">panel</Link>
                <span className="fm-badge fm-badge--honey" title={user.email}>
                  {user.initials}
                </span>
                <Form route="session.destroy">
                  <button type="submit" className="fm-button fm-button--quiet">
                    çıkış yap
                  </button>
                </Form>
              </>
            ) : (
              <>
                <Link route="session.create">giriş yap</Link>
                <Link route="new_account.create">üretici olarak katıl</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main>{children}</main>
      {/* richColors kapalı: 06 paleti dışında renk üretir */}
      <Toaster position="top-center" />
    </>
  )
}
