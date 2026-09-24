import { useState } from 'react'
import { router } from '@inertiajs/react'
import { adminNav } from '~/lib/nav'
import { formatDateTime } from '~/lib/format'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { PageHeader } from '~/components/page_header'
import { Pagination, type PageMeta } from '~/components/pagination'
import { useT } from '~/lib/i18n'

type Row = {
  id: number
  action: string
  actorId: number | null
  subjectType: string
  subjectId: number
  meta: string
  createdAt: string | null
}
type Filters = Record<'action' | 'subjectType' | 'subjectId' | 'actorId' | 'from' | 'to', string>

const FIELDS: Array<[keyof Filters, string, string]> = [
  ['action', 'Action (e.g. order. or user.suspended)', 'w-64'],
  ['subjectType', 'Subject type', 'w-32'],
  ['subjectId', 'Subject id', 'w-24'],
  ['actorId', 'Actor id', 'w-24'],
]

export default function AdminAudit({
  rows,
  meta,
  filters,
}: {
  rows: Row[]
  meta: PageMeta
  filters: Filters
}) {
  const { t } = useT()

  const [f, setF] = useState(filters)
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Audit log')}
        description={t(
          'Every state change and admin action. End the action with a dot to match a whole family.'
        )}
      />
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          router.get(
            '/admin/audit',
            Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ''))
          )
        }}
      >
        {FIELDS.map(([key, label, width]) => (
          <Input
            key={key}
            aria-label={t(label)}
            placeholder={t(label)}
            className={width}
            value={f[key]}
            onChange={(e) => setF({ ...f, [key]: e.target.value })}
          />
        ))}
        <Input
          aria-label={t('From')}
          type="date"
          className="w-40"
          value={f.from}
          onChange={(e) => setF({ ...f, from: e.target.value })}
        />
        <Input
          aria-label={t('To')}
          type="date"
          className="w-40"
          value={f.to}
          onChange={(e) => setF({ ...f, to: e.target.value })}
        />
        <Button type="submit">{t('Search')}</Button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-line bg-paper-raised">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-ink-600">
            <tr>
              <th className="px-4 py-3 font-medium">{t('When')}</th>
              <th className="px-4 py-3 font-medium">{t('Action')}</th>
              <th className="px-4 py-3 font-medium">{t('Subject')}</th>
              <th className="px-4 py-3 font-medium">{t('Actor')}</th>
              <th className="px-4 py-3 font-medium">{t('Details')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="tabular whitespace-nowrap px-4 py-2">
                  {formatDateTime(r.createdAt)}
                </td>
                <td className="px-4 py-2 font-medium text-ink-900">{r.action}</td>
                <td className="px-4 py-2">
                  {r.subjectType} #{r.subjectId}
                </td>
                <td className="px-4 py-2">{r.actorId ? `user #${r.actorId}` : 'system'}</td>
                <td className="max-w-md px-4 py-2 font-mono text-xs text-ink-700">
                  {r.meta === '{}' ? '—' : r.meta}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-ink-600">{t('No entries match.')}</p>}
      </div>
      <Pagination meta={meta} />
    </div>
  )
}

AdminAudit.layout = 'dashboard'
AdminAudit.dashboardProps = { navItems: adminNav, title: 'Admin' }
