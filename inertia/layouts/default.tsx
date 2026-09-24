import { type Data } from '@generated/data'
import { toast, Toaster } from 'sonner'
import { usePage } from '@inertiajs/react'
import { type ReactElement, useEffect } from 'react'
import { Form, Link } from '@adonisjs/inertia/react'
import { Menu } from 'lucide-react'
import { Logo } from '~/components/logo'
import { LanguageSwitch } from '~/components/language_switch'
import { useT } from '~/lib/i18n'
import { CartLink } from '~/components/cart_link'
import { NotificationBell } from '~/components/notification_bell'
import { VerifyEmailBanner } from '~/components/verify_email_banner'
import { Button } from '~/components/ui/button'
import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown_menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '~/components/ui/sheet'

function panelHref(roles: string[] | undefined) {
  if (roles?.includes('admin')) return '/admin'
  if (roles?.includes('manufacturer')) return '/maker'
  return '/seller'
}

export default function Layout({ children }: { children: ReactElement<Data.SharedProps> }) {
  const { t, locale } = useT()
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])
  const { url, flash } = usePage()
  const user = children.props.user
  const fullBleed = Boolean((children.type as { fullBleed?: boolean }).fullBleed)
  useEffect(() => {
    toast.dismiss()
  }, [url])

  useEffect(() => {
    if (flash.error) toast.error(t(flash.error))
    if (flash.success) toast.success(t(flash.success))
  })

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-paper"
      >
        {t('Skip to content')}
      </a>
      <header className="sticky top-0 z-40 w-full border-b border-line bg-paper-raised/95 backdrop-blur supports-[backdrop-filter]:bg-paper-raised/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link route="home" aria-label={t('Fabrmatch home')}>
            <Logo />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/shop"
              className="px-3 py-2 text-sm font-medium text-ink-700 hover:text-ink-900"
            >
              {t('Shop')}
            </Link>
            {user && (
              <>
                <CartLink />
                <NotificationBell />
                <Link
                  href="/orders"
                  className="px-3 py-2 text-sm font-medium text-ink-700 hover:text-ink-900"
                >
                  {t('My orders')}
                </Link>
                <Link
                  href={panelHref(user.roles)}
                  className="px-3 py-2 text-sm font-medium text-ink-700 hover:text-ink-900"
                >
                  {t('Dashboard')}
                </Link>
              </>
            )}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{user.initials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.fullName || 'User'}</p>
                      <p className="text-xs text-ink-600">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/account/security" className="w-full cursor-pointer text-sm">
                      {t('Account security')}
                    </Link>
                  </DropdownMenuItem>
                  {children.props.referralsEnabled && (
                    <DropdownMenuItem asChild>
                      <Link href="/account/referrals" className="w-full cursor-pointer text-sm">
                        {t('Invite a friend')}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Form route="session.destroy" className="w-full">
                      <button type="submit" className="w-full cursor-pointer text-left text-sm">
                        {t('Log out')}
                      </button>
                    </Form>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link route="session.create">{t('Log in')}</Link>
                </Button>
                <Button asChild>
                  <Link route="new_account.create">{t('Sign up')}</Link>
                </Button>
              </>
            )}
          </nav>

          {/* Mobile menu */}
          <div className="md:hidden">
            <Sheet key={url}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">{t('Menu')}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle>{t('Menu')}</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-2 p-6">
                  {user ? (
                    <>
                      <div className="mb-4 flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{user.initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.fullName || 'User'}</p>
                          <p className="text-xs text-ink-600">{user.email}</p>
                        </div>
                      </div>
                      <Form route="session.destroy">
                        <Button variant="outline" className="w-full" type="submit">
                          {t('Log out')}
                        </Button>
                      </Form>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" asChild className="w-full">
                        <Link route="session.create">{t('Log in')}</Link>
                      </Button>
                      <Button asChild className="w-full">
                        <Link route="new_account.create">{t('Sign up')}</Link>
                      </Button>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <VerifyEmailBanner user={user} />

      <main
        id="main"
        className={
          fullBleed ? 'flex-1' : 'mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8'
        }
      >
        {children}
      </main>

      <footer className="border-t border-line bg-paper-sunken">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-ink-700 sm:px-6 lg:px-8">
          <Logo />
          <nav aria-label={t('Footer')} className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/shop" className="hover:text-ink-900">
              {t('Shop')}
            </Link>
            <Link href="/for-makers" className="hover:text-ink-900">
              {t('For makers')}
            </Link>
            <Link href="/for-sellers" className="hover:text-ink-900">
              {t('For sellers')}
            </Link>
            <Link href="/blog" className="hover:text-ink-900">
              {t('Blog')}
            </Link>
            <Link href="/help" className="hover:text-ink-900">
              {t('Help')}
            </Link>
            <Link href="/status" className="hover:text-ink-900">
              {t('Status')}
            </Link>
            <Link href="/legal/terms" className="hover:text-ink-900">
              {t('Terms')}
            </Link>
            <Link href="/legal/privacy" className="hover:text-ink-900">
              {t('Privacy')}
            </Link>
            <Link href="/sitemap.xml" className="hover:text-ink-900">
              {t('Sitemap')}
            </Link>
          </nav>
          <LanguageSwitch />
          <p>{t('© {v2} Fabrmatch', { v2: new Date().getFullYear() })}</p>
        </div>
      </footer>

      <Toaster position="top-center" richColors />
    </div>
  )
}
