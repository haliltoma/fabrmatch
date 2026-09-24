import { router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { BellOff } from 'lucide-react'
import { formatDateTime } from '~/lib/format'
import { Button } from '~/components/ui/button'
import { EmptyState } from '~/components/empty_state'
import { PageHeader } from '~/components/page_header'
import { Pagination, type PageMeta } from '~/components/pagination'
import { useT } from '~/lib/i18n'

type Item = {
  id: number
  type: string
  title: string
  body: string
  link: string
  read: boolean
  createdAt: string | null
}

export default function NotificationsIndex({
  notifications,
  meta,
}: {
  notifications: Item[]
  meta: PageMeta
}) {
  const { t } = useT()

  const hasUnread = notifications.some((n) => !n.read)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={t('Notifications')}
        description={t('Updates on your orders, payments and disputes.')}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/notifications/preferences">{t('E-mail preferences')}</Link>
            </Button>
            {hasUnread && (
              <Button size="sm" onClick={() => router.post('/notifications/read-all')}>
                {t('Mark all read')}
              </Button>
            )}
          </div>
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title={t('Nothing yet')}
          description={t(
            'You will see payment, production, delivery and dispute updates here as they happen.'
          )}
        />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-paper-raised">
          {notifications.map((n) => (
            <li key={n.id}>
              <a
                href={`/notifications/${n.id}/open`}
                className="flex gap-3 px-5 py-4 transition-colors hover:bg-paper-sunken"
              >
                <span
                  aria-hidden
                  className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-heat-500'}`}
                />
                <span className="min-w-0 space-y-0.5">
                  <span
                    className={`block text-sm ${n.read ? 'text-ink-800' : 'font-semibold text-ink-900'}`}
                  >
                    {n.title}
                    {!n.read && <span className="sr-only"> {t('(unread)')}</span>}
                  </span>
                  <span className="block text-sm text-ink-700">{n.body}</span>
                  <span className="block text-xs text-ink-600">{formatDateTime(n.createdAt)}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <Pagination meta={meta} />
    </div>
  )
}
