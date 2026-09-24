import { Link } from '@adonisjs/inertia/react'
import { ArrowLeft } from 'lucide-react'
import { adminNav } from '~/lib/nav'
import { formatDateTime } from '~/lib/format'
import { Badge } from '~/components/ui/badge'
import { PageHeader } from '~/components/page_header'
import { useT } from '~/lib/i18n'

type Row = {
  id: number
  from: string
  senderId: number
  shown: string
  original: string | null
  maskedCount: number
  createdAt: string | null
}

export default function AdminMessages({
  order,
  messages,
}: {
  order: { id: number; code: string; status: string }
  messages: Row[]
}) {
  const { t } = useT()

  return (
    <div className="space-y-6">
      <Link href="/admin/audit" className="inline-flex items-center gap-1 text-sm text-ink-600">
        <ArrowLeft className="h-4 w-4" /> {t('Back')}
      </Link>
      <PageHeader
        title={t('Messages on {code}', { code: order.code })}
        description={t('Admin view: what each side typed, next to what the other side saw.')}
      />
      {messages.length === 0 && <p className="text-ink-600">{t('No messages.')}</p>}
      <ul className="space-y-3">
        {messages.map((m) => (
          <li key={m.id} className="rounded-lg border border-line bg-paper-raised p-4 text-sm">
            <p className="mb-1 text-xs text-ink-600">
              {m.from} (user #{m.senderId}) · {formatDateTime(m.createdAt)}
              {m.maskedCount > 0 && (
                <Badge variant="warning" className="ml-2">
                  {t('{maskedCount} hidden', { maskedCount: m.maskedCount })}
                </Badge>
              )}
            </p>
            <p className="whitespace-pre-wrap text-ink-900">{m.original ?? m.shown}</p>
            {m.original && (
              <p className="mt-2 whitespace-pre-wrap border-t border-line pt-2 text-ink-600">
                {t('Other side saw: {shown}', { shown: m.shown })}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

AdminMessages.layout = 'dashboard'
AdminMessages.dashboardProps = { navItems: adminNav, title: 'Admin' }
