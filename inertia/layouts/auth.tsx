import { type ReactElement, useEffect } from 'react'
import { type Data } from '@generated/data'
import { toast, Toaster } from 'sonner'
import { usePage } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Logo } from '~/components/logo'
import { useT } from '~/lib/i18n'
import { ThemeSwitch } from '~/components/theme_switch'
import { useTheme } from '~/lib/theme'
import { LanguageSwitch } from '~/components/language_switch'

export default function AuthLayout({ children }: { children: ReactElement<Data.SharedProps> }) {
  const { t } = useT()
  const { dark } = useTheme()

  const { url, flash } = usePage()

  useEffect(() => {
    toast.dismiss()
  }, [url])

  useEffect(() => {
    if (flash.error) toast.error(t(flash.error))
    if (flash.success) toast.success(t(flash.success))
  })

  return (
    <div className="grid min-h-screen grid-rows-1 lg:grid-cols-2">
      {/* Left: brand panel */}
      <div className="palette-light layer-lines-light hidden flex-col justify-between bg-ink-900 p-10 text-paper lg:flex">
        <Link route="home" aria-label={t('Fabrmatch home')}>
          <Logo tone="paper" />
        </Link>
        <div className="space-y-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-heat-400">
            {t('Made to order')}
          </p>
          <h2 className="font-display text-4xl font-semibold leading-tight">
            {t('Your model goes in.')}
            <br />
            {t('A finished part comes out.')}
          </h2>
          <p className="max-w-sm text-ink-300">
            {t(
              'We match every order with a verified nearby maker. Your payment stays held until the part is in your hands.'
            )}
          </p>
        </div>
        <p className="text-sm text-ink-300">
          {t('© {v2} Fabrmatch', { v2: new Date().getFullYear() })}
        </p>
      </div>

      {/* Right: form */}
      <main id="main" className="flex flex-col">
        <div className="flex items-center justify-between p-6">
          <Link route="home" aria-label={t('Fabrmatch home')} className="lg:invisible">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeSwitch />
            <LanguageSwitch />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </main>

      <Toaster position="top-center" richColors theme={dark ? 'dark' : 'light'} />
    </div>
  )
}
