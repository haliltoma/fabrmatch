import { Check, X } from 'lucide-react'
import { adminNav } from '~/lib/nav'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { PageHeader } from '~/components/page_header'
import { useT } from '~/lib/i18n'

type Check = {
  id: string
  group: 'company' | 'money' | 'legal' | 'security' | 'operations' | 'supply'
  label: string
  ok: boolean
  detail: string
  blocking: boolean
}

const GROUPS: Array<{ id: Check['group']; title: string }> = [
  { id: 'company', title: 'Company' },
  { id: 'money', title: 'Payments and invoices' },
  { id: 'legal', title: 'Legal texts' },
  { id: 'security', title: 'Security' },
  { id: 'operations', title: 'Operations' },
  { id: 'supply', title: 'Makers' },
]

export default function AdminLaunch({ checks, ready }: { checks: Check[]; ready: boolean }) {
  const { t } = useT()
  const open = checks.filter((c) => !c.ok && c.blocking).length

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={t('Launch readiness')}
        description={t(
          'Everything that must be true before real payments are switched on. Checked live from the configuration and the database.'
        )}
      />
      <p
        role="status"
        className={
          ready
            ? 'rounded-md border border-line bg-paper-sunken px-4 py-3 text-sm text-success'
            : 'rounded-md bg-amber-soft px-4 py-3 text-sm text-amber-ink'
        }
      >
        {ready
          ? t('All required checks pass.')
          : t('{count} required checks still open.', { count: String(open) })}
      </p>
      {GROUPS.map((group) => {
        const rows = checks.filter((c) => c.group === group.id)
        if (rows.length === 0) return null
        return (
          <Card key={group.id}>
            <CardHeader>
              <CardTitle>{t(group.title)}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-line">
                {rows.map((c) => (
                  <li key={c.id} className="flex gap-3 py-3">
                    <span
                      aria-hidden="true"
                      className={
                        c.ok
                          ? 'mt-0.5 text-success'
                          : c.blocking
                            ? 'mt-0.5 text-danger'
                            : 'mt-0.5 text-amber-ink'
                      }
                    >
                      {c.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink-900">
                        {t(c.label)}
                        <span className="sr-only">
                          {c.ok
                            ? t('passes')
                            : c.blocking
                              ? t('required, open')
                              : t('recommended, open')}
                        </span>
                        {!c.blocking && (
                          <span className="ml-2 text-xs font-normal text-ink-600">
                            {t('recommended')}
                          </span>
                        )}
                      </span>
                      <span className="block break-words font-mono text-xs text-ink-600">
                        {c.detail}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

AdminLaunch.layout = 'dashboard'
AdminLaunch.dashboardProps = { navItems: adminNav, title: 'Admin Panel' }
