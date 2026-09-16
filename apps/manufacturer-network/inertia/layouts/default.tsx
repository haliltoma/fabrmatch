import { type Data } from '@generated/data'
import { toast, Toaster } from 'sonner'
import { usePage } from '@inertiajs/react'
import { type ReactElement, useEffect } from 'react'
import { Form, Link } from '@adonisjs/inertia/react'

type NavItem = {
  route: string
  label: string
  icon: string
  badge?: number
}

const PRIMARY_NAV: NavItem[] = [
  { route: 'panel.index', label: 'panel', icon: 'ti-layout-dashboard' },
  { route: 'panel.orders.index', label: 'geçmiş işler', icon: 'ti-history' },
  { route: 'panel.earnings.index', label: 'kazançlar', icon: 'ti-cash' },
]

const SETTINGS_NAV: NavItem[] = [
  { route: 'panel.profile.show', label: 'profil & kapasite', icon: 'ti-settings' },
]

function SidebarLink({ item, currentUrl }: { item: NavItem; currentUrl: string }) {
  const isActive =
    (item.route === 'panel.index' && currentUrl === '/panel') ||
    currentUrl.startsWith(`/${item.route.replace('panel.', 'panel/')}`)

  return (
    <Link
      route={item.route as any}
      className={`fm-sidebar-link${isActive ? ' fm-sidebar-link--active' : ''}`}
    >
      <i className={`ti ${item.icon}`} aria-hidden="true" />
      {item.label}
      {item.badge != null && item.badge > 0 && (
        <span className="fm-badge fm-badge--honey" style={{ fontSize: 11 }}>
          {item.badge}
        </span>
      )}
    </Link>
  )
}

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
  const pendingOffers = (children.props as any).pendingOfferCount as number | undefined

  const primaryNav = PRIMARY_NAV.map((item) =>
    item.route === 'panel.index' && pendingOffers
      ? { ...item, badge: pendingOffers }
      : item
  )

  return (
    <>
      <div className="fm-shell">
        {/* ── Top bar ── */}
        <header className="fm-shell__topbar">
          <Link route="home" className="fm-brand">
            <i className="ti ti-briefcase" aria-hidden="true" /> Fabrmatch üretici ağı
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            {user && (
              <>
                <span className="fm-avatar" title={user.email}>
                  {user.initials}
                </span>
                <span className="fm-small" style={{ color: 'var(--fm-honey-text)' }}>
                  {user.email}
                </span>
                <Form route="session.destroy">
                  <button type="submit" className="fm-button fm-button--quiet" style={{ height: 32, fontSize: 13 }}>
                    <i className="ti ti-logout" aria-hidden="true" /> çıkış
                  </button>
                </Form>
              </>
            )}
            {!user && (
              <>
                <Link route="session.create" className="fm-small" style={{ color: 'var(--fm-honey-text)' }}>
                  giriş yap
                </Link>
                <Link route="new_account.create" className="fm-button" style={{ height: 32, fontSize: 13 }}>
                  üretici olarak katıl
                </Link>
              </>
            )}
          </div>
        </header>

        {/* ── Sidebar ── */}
        {user && (
          <aside className="fm-shell__sidebar">
            <div className="fm-sidebar-group">
              <p className="fm-sidebar-label">panel</p>
              {primaryNav.map((item) => (
                <SidebarLink key={item.route} item={item} currentUrl={url} />
              ))}
            </div>
            <div className="fm-sidebar-group">
              <p className="fm-sidebar-label">ayarlar</p>
              {SETTINGS_NAV.map((item) => (
                <SidebarLink key={item.route} item={item} currentUrl={url} />
              ))}
            </div>
          </aside>
        )}

        {/* ── Main content ── */}
        <main className="fm-shell__content">{children}</main>
      </div>

      {/* richColors kapalı: 06 paleti dışında renk üretir */}
      <Toaster position="top-center" />
    </>
  )
}
