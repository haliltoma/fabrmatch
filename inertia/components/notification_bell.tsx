import { useEffect } from 'react'
import { router, usePage } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Bell } from 'lucide-react'
import { useT } from '~/lib/i18n'

/** Bell with unread count. Refreshes the count every minute while the tab is visible. */
export function NotificationBell({ tone = 'ink' }: { tone?: 'ink' | 'paper' }) {
  const { t } = useT()

  const { props } = usePage<{ unreadNotifications?: number }>()
  const unread = props.unreadNotifications ?? 0

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        router.reload({ only: ['unreadNotifications'] })
      }
    }, 60_000)
    return () => clearInterval(timer)
  }, [])

  return (
    <Link
      href="/notifications"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : t('Notifications')}
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
        tone === 'paper'
          ? 'text-sidebar-muted hover:bg-white/10 hover:text-sidebar-fg'
          : 'text-ink-700 hover:bg-ink-900/5'
      }`}
    >
      <Bell className="h-5 w-5" aria-hidden />
      {unread > 0 && (
        <span className="tabular absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-heat-500 px-1 text-[10px] font-semibold text-ink-900">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  )
}
