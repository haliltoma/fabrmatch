import { type ReactElement, useEffect, useState } from 'react'
import { type Data } from '@generated/data'
import { toast } from 'sonner'
import { usePage } from '@inertiajs/react'
import { Form, Link } from '@adonisjs/inertia/react'
import { Menu, ChevronLeft, LogOut, ShieldCheck } from 'lucide-react'
import { cn } from '~/lib/utils'
import { Logo } from '~/components/logo'
import { NotificationBell } from '~/components/notification_bell'
import { VerifyEmailBanner } from '~/components/verify_email_banner'
import { Button } from '~/components/ui/button'
import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '~/components/ui/sheet'
import { useT } from '~/lib/i18n'
import { ThemeSwitch } from '~/components/theme_switch'
import { LanguageSwitch } from '~/components/language_switch'
import { AdminCommand } from '~/components/admin_command'
import { NavigationProgress } from '~/components/navigation_progress'
import { AppToaster } from '~/components/app_toaster'

export interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  active?: boolean
  /** hidden until an admin switches the feature on */
  feature?: 'rfq' | 'externalStores'
  /** heading this link sits under (admin menu); ungrouped menus stay a flat list */
  group?: string
  /** key into the shared attention badges (admin or maker): a count of what waits behind the link */
  badge?: 'queues' | 'matching' | 'disputes' | 'payouts' | 'work'
  /** one of the four links in the phone's bottom tab bar */
  mobileTab?: boolean
}

interface DashboardLayoutProps {
  children: ReactElement<Data.SharedProps>
  navItems: NavItem[]
  title: string
}

type Badges = Partial<Record<NonNullable<NavItem['badge']>, number>>

/** Groups that stay open by default; the rest open when they hold the current page. */
// short panel menus (maker, seller) stay fully open; the admin's long tail folds away
const OPEN_GROUPS = [
  'Today',
  'Marketplace',
  'Work',
  'Machines',
  'Money',
  'Sell',
  'Your shop',
  'Buying',
]

function SidebarLink({
  item,
  url,
  collapsed,
  mobile,
  badges,
}: {
  item: NavItem
  url: string
  collapsed: boolean
  mobile: boolean
  badges: Badges
}) {
  const { t } = useT()
  const path = url.split('?')[0]
  const isRoot = item.href.split('/').filter(Boolean).length === 1
  const isActive =
    item.active ?? (path === item.href || (!isRoot && path.startsWith(`${item.href}/`)))
  const count = item.badge ? (badges[item.badge] ?? 0) : 0
  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      title={collapsed && !mobile ? t(item.label) : undefined}
      className={cn(
        'relative flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        isActive
          ? 'border-l-[3px] border-sidebar-active bg-paper/10 pl-[9px] text-sidebar-fg'
          : 'border-l-[3px] border-transparent pl-[9px] text-sidebar-muted hover:bg-paper/5 hover:text-sidebar-fg',
        mobile && 'py-2 text-base'
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {(!collapsed || mobile) && <span className="flex-1">{t(item.label)}</span>}
      {count > 0 && (
        <span
          className={cn(
            'rounded-full bg-heat-500 px-1.5 font-mono text-[11px] leading-5 font-semibold text-ink-900 tabular-nums',
            collapsed && !mobile && 'absolute top-0 right-0.5 px-1 text-[10px] leading-4'
          )}
        >
          {count > 99 ? '99+' : count}
          <span className="sr-only"> {t('waiting')}</span>
        </span>
      )}
    </Link>
  )
}

function SidebarNavItems({
  items,
  url,
  collapsed,
  mobile = false,
  badges = {},
}: {
  items: NavItem[]
  url: string
  collapsed: boolean
  mobile?: boolean
  badges?: Badges
}) {
  const { t } = useT()
  const link = (item: NavItem) => (
    <SidebarLink
      key={item.href}
      item={item}
      url={url}
      collapsed={collapsed}
      mobile={mobile}
      badges={badges}
    />
  )

  // plain panels (maker, seller) keep one flat list
  if (!items.some((i) => i.group)) {
    return (
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">{items.map(link)}</nav>
    )
  }

  const path = url.split('?')[0]
  const groups = [...new Set(items.map((i) => i.group ?? ''))]
  return (
    <nav className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-4">
      {groups.map((group) => {
        const members = items.filter((i) => (i.group ?? '') === group)
        const holdsCurrent = members.some(
          (i) => path === i.href || (i.href !== '/admin' && path.startsWith(`${i.href}/`))
        )
        const waiting = members.reduce((n, i) => n + (i.badge ? (badges[i.badge] ?? 0) : 0), 0)
        if (collapsed && !mobile) {
          return (
            <div
              key={group}
              className="flex flex-col gap-1 border-t border-sidebar-border pt-3 first:border-t-0 first:pt-0"
            >
              {members.map(link)}
            </div>
          )
        }
        return (
          <details
            key={group}
            open={OPEN_GROUPS.includes(group) || holdsCurrent || waiting > 0}
            className="group/nav"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between rounded px-3 py-1 font-mono text-[11px] font-semibold tracking-[0.14em] text-sidebar-muted uppercase marker:hidden hover:text-sidebar-fg">
              {t(group)}
              <ChevronLeft
                className="h-3.5 w-3.5 -rotate-90 transition-transform group-open/nav:rotate-90"
                aria-hidden
              />
            </summary>
            <div className="mt-1 flex flex-col gap-0.5">{members.map(link)}</div>
          </details>
        )
      })}
    </nav>
  )
}

/** The full panel menu in a side sheet (phone), opened from the top bar or the tab bar's More. */
function MobileMenu({
  title,
  items,
  url,
  badges,
  trigger,
}: {
  title: string
  items: NavItem[]
  url: string
  badges: Badges
  trigger: ReactElement
}) {
  const { t } = useT()
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="left" className="palette-light w-72 bg-sidebar-bg p-0 text-sidebar-fg">
        <SheetHeader className="border-b border-sidebar-border px-4 py-4">
          <SheetTitle className="text-sidebar-fg">{t(title)}</SheetTitle>
        </SheetHeader>
        {items.some((i) => i.href.startsWith('/admin')) && (
          <div className="px-3 pt-4">
            <AdminCommand items={items} shortcut={false} />
          </div>
        )}
        <SidebarNavItems items={items} url={url} collapsed={false} mobile badges={badges} />
        <div className="border-t border-sidebar-border px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <LanguageSwitch tone="paper" />
            <ThemeSwitch tone="paper" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default function DashboardLayout({
  children,
  navItems: allItems,
  title,
}: DashboardLayoutProps) {
  const { t } = useT()

  const { url, flash } = usePage()
  const navItems = allItems.filter(
    (i) =>
      (i.feature !== 'rfq' || children.props.rfqEnabled) &&
      (i.feature !== 'externalStores' || children.props.externalStoresEnabled)
  )
  const user = children.props.user
  const isAdmin = navItems.some((i) => i.href.startsWith('/admin'))
  const path = url.split('?')[0]
  // the menu item for this page: the longest link that is this path or a parent of it
  const current = [...navItems]
    .filter((i) => path === i.href || path.startsWith(`${i.href}/`))
    .sort((x, y) => y.href.length - x.href.length)[0]
  const tabs = navItems.filter((i) => i.mobileTab).slice(0, 4)
  const shared = children.props as {
    adminAttention?: { badges: Badges } | null
    makerAttention?: { badges: Badges } | null
  }
  const badges: Badges = shared.adminAttention?.badges ?? shared.makerAttention?.badges ?? {}
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    toast.dismiss()
  }, [url])

  useEffect(() => {
    if (flash.error) toast.error(t(flash.error))
    if (flash.success) toast.success(t(flash.success))
  })

  return (
    <div className="flex min-h-screen bg-paper">
      <NavigationProgress variant={isAdmin ? 'admin' : 'site'} />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-paper"
      >
        {t('Skip to content')}
      </a>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'palette-light',
          'hidden flex-col border-r border-sidebar-border bg-sidebar-bg text-sidebar-fg transition-all duration-200 md:sticky md:top-0 md:flex md:h-screen',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          {!collapsed && (
            <Link route="home" aria-label={t('Fabrmatch home')} className="flex flex-col gap-0.5">
              <Logo tone="paper" />
              <span className="pl-[38px] font-mono text-[10px] uppercase tracking-[0.18em] text-sidebar-muted">
                {t(title)}
              </span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? t('Expand menu') : t('Collapse menu')}
            aria-expanded={!collapsed}
            className="h-8 w-8 text-sidebar-muted hover:bg-paper-raised/10 hover:text-sidebar-fg"
          >
            <ChevronLeft
              className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')}
            />
          </Button>
        </div>

        {isAdmin && (
          <div className="px-3 pt-4">
            <AdminCommand items={navItems} compact={collapsed} />
          </div>
        )}
        <SidebarNavItems items={navItems} url={url} collapsed={collapsed} badges={badges} />

        <div className="border-t border-sidebar-border p-3">
          {!collapsed && (
            <div className="mb-3 px-1">
              <div className="flex items-center justify-between gap-2">
                <LanguageSwitch tone="paper" />
                <ThemeSwitch tone="paper" />
              </div>
            </div>
          )}
          {user && (
            <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-paper-raised/10 text-xs text-sidebar-fg">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 truncate">
                  <p className="truncate text-sm font-medium">{user.fullName || 'User'}</p>
                  <p className="truncate text-xs text-sidebar-muted">{user.email}</p>
                </div>
              )}
              {!collapsed && <NotificationBell tone="paper" />}
              {!collapsed && (
                <Link
                  href="/account/security"
                  aria-label={t('Account security')}
                  className="rounded-md p-1.5 text-sidebar-muted transition-colors hover:bg-paper-raised/10 hover:text-sidebar-fg"
                >
                  <ShieldCheck className="h-4 w-4" />
                </Link>
              )}
              {!collapsed && (
                <Form route="session.destroy">
                  <button
                    type="submit"
                    aria-label={t('Log out')}
                    className="rounded-md p-1.5 text-sidebar-muted transition-colors hover:bg-paper-raised/10 hover:text-sidebar-fg"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </Form>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Phone top bar: where you are (logo + page name), the full menu and your notifications */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-paper-raised px-2 md:hidden">
          <MobileMenu
            key={url}
            title={title}
            items={navItems}
            url={url}
            badges={badges}
            trigger={
              <Button variant="ghost" size="icon" aria-label={t('Menu')}>
                <Menu className="h-5 w-5" />
              </Button>
            }
          />
          <Link route="home" aria-label={t('Fabrmatch home')} className="shrink-0">
            <span className="flex h-6 w-6 flex-col justify-center gap-[3px]" aria-hidden>
              <span className="h-[4px] w-full rounded-[1px] bg-ink-900" />
              <span className="h-[4px] w-4/5 rounded-[1px] bg-heat-500" />
              <span className="h-[4px] w-3/5 rounded-[1px] bg-ink-900" />
            </span>
          </Link>
          <p className="min-w-0 flex-1 truncate font-display text-lg font-semibold text-ink-900">
            {current ? t(current.label) : t(title)}
          </p>
          <NotificationBell />
        </header>

        {/* Page content */}
        <VerifyEmailBanner user={user} />
        <main
          id="main"
          className={cn(
            'mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8',
            tabs.length > 0 && 'pb-24 md:pb-8'
          )}
        >
          {children}
        </main>
      </div>

      {/* Phone tab bar: the four places used most, one tap away; everything else under More */}
      {tabs.length > 0 && (
        <nav
          aria-label={t('Main')}
          className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-paper-raised pb-[env(safe-area-inset-bottom)] md:hidden"
          style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}
        >
          {tabs.map((item) => {
            const active = current?.href === item.href
            const count = item.badge ? (badges[item.badge] ?? 0) : 0
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold',
                  active ? 'text-ink-900' : 'text-ink-600'
                )}
              >
                {active && (
                  <span className="absolute inset-x-5 top-0 h-[3px] rounded-b bg-heat-500" />
                )}
                <span className="relative">
                  <item.icon className="h-5 w-5" />
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 rounded-full bg-heat-500 px-1 font-mono text-[10px] leading-4 text-ink-900">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate px-1">{t(item.label)}</span>
              </Link>
            )
          })}
          <MobileMenu
            key={`more-${url}`}
            title={title}
            items={navItems}
            url={url}
            badges={badges}
            trigger={
              <button
                type="button"
                className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-ink-600"
              >
                <Menu className="h-5 w-5" />
                {t('More')}
              </button>
            }
          />
        </nav>
      )}

      <AppToaster />
    </div>
  )
}
