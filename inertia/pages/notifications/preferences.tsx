import { router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '~/components/page_header'
import { useT } from '~/lib/i18n'

type Pref = { type: string; email: boolean }

const LABELS: Record<string, string> = {
  payment_received: 'Payment received',
  offer_received: 'New production offer (makers)',
  order_unmatched: 'No maker found yet',
  order_in_production: 'Order in production',
  order_shipped: 'Order shipped',
  order_delivered: 'Order delivered',
  order_completed: 'Order completed',
  order_cancelled: 'Order cancelled',
  refund_issued: 'Refund sent',
  payout_paid: 'Payout paid',
  payout_action: 'Payout details and invoices',
  store_order: 'Orders from your own shop',
  dispute_opened: 'Dispute opened',
  dispute_responded: 'Dispute response',
  dispute_resolved: 'Dispute resolved',
  message_received: 'New message',
  welcome: 'Welcome message',
  payment_reminder: 'Payment reminder',
  review_request: 'Review request',
  capacity_idle: 'Idle capacity reminder',
}

export default function NotificationPreferences({ types }: { types: Pref[] }) {
  const { t } = useT()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/notifications"
        className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" /> {t('Notifications')}
      </Link>
      <PageHeader
        title={t('E-mail preferences')}
        description={t(
          'In-app notifications always appear. Choose which ones also reach your inbox.'
        )}
      />
      <ul className="divide-y divide-line rounded-lg border border-line bg-paper-raised">
        {types.map((p) => (
          <li key={p.type} className="flex items-center justify-between gap-4 px-5 py-3">
            <label htmlFor={`pref-${p.type}`} className="text-sm text-ink-900">
              {t(LABELS[p.type] ?? p.type)}
            </label>
            <input
              id={`pref-${p.type}`}
              type="checkbox"
              className="h-5 w-5"
              checked={p.email}
              onChange={(e) =>
                router.post(
                  '/notifications/preferences',
                  { type: p.type, email: e.target.checked },
                  { preserveScroll: true }
                )
              }
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
