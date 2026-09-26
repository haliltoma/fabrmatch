import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Users } from 'lucide-react'
import { adminNav } from '~/lib/nav'
import { formatDate } from '~/lib/format'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Input } from '~/components/ui/input'
import { EmptyState } from '~/components/empty_state'
import { PageHeader } from '~/components/page_header'
import { Pagination, type PageMeta } from '~/components/pagination'
import { useT } from '~/lib/i18n'

type Row = {
  id: number
  email: string
  fullName: string | null
  roles: string[]
  emailVerified: boolean
  twoFactor: boolean
  suspendedAt: string | null
  suspensionReason: string | null
  createdAt: string | null
}
type Filters = { q: string; role: string; suspended: string }

function UserActions({ user }: { user: Row }) {
  const { t } = useT()

  const [reason, setReason] = useState('')
  const [open, setOpen] = useState(false)

  if (user.suspendedAt) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => router.post(`/admin/users/${user.id}/unsuspend`)}
      >
        {t('Restore')}
      </Button>
    )
  }
  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        {t('Suspend…')}
      </Button>
    )
  }
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        router.post(
          `/admin/users/${user.id}/suspend`,
          { reason },
          { onSuccess: () => setOpen(false) }
        )
      }}
    >
      <Input
        aria-label={t('Reason')}
        placeholder={t('Reason (shown in audit log)')}
        className="h-9 w-56"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <Button size="sm" variant="destructive" type="submit" disabled={reason.trim().length < 5}>
        {t('Suspend')}
      </Button>
    </form>
  )
}

export default function AdminUsers({
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
  const search = (next: Filters) =>
    router.get(
      '/admin/users',
      Object.fromEntries(Object.entries(next).filter(([, v]) => v !== '')),
      {
        preserveState: true,
      }
    )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Users')}
        description={t('Search accounts, see who is verified, suspend or restore.')}
      />
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          search(f)
        }}
      >
        <Input
          aria-label={t('Search by name or e-mail')}
          placeholder={t('Name or e-mail')}
          className="w-64"
          value={f.q}
          onChange={(e) => setF({ ...f, q: e.target.value })}
        />
        <select
          aria-label={t('Role')}
          className="h-10 rounded-md border border-line bg-paper-raised px-2 text-sm"
          value={f.role}
          onChange={(e) => setF({ ...f, role: e.target.value })}
        >
          <option value="">{t('Any role')}</option>
          <option value="seller">{t('Seller')}</option>
          <option value="manufacturer">{t('Maker')}</option>
          <option value="admin">{t('Admin')}</option>
        </select>
        <select
          aria-label={t('Status')}
          className="h-10 rounded-md border border-line bg-paper-raised px-2 text-sm"
          value={f.suspended}
          onChange={(e) => setF({ ...f, suspended: e.target.value })}
        >
          <option value="">{t('Any status')}</option>
          <option value="no">{t('Active')}</option>
          <option value="yes">{t('Suspended')}</option>
        </select>
        <Button type="submit">{t('Search')}</Button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t('No users match')}
          description={t('Try a different search or clear the filters.')}
        />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-paper-raised">
          {rows.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink-900">
                  {u.fullName || u.email}{' '}
                  {u.roles.map((r) => (
                    <Badge key={r} variant="outline" className="ml-1">
                      {r}
                    </Badge>
                  ))}
                  {u.suspendedAt && (
                    <Badge variant="destructive" className="ml-1">
                      {t('suspended')}
                    </Badge>
                  )}
                </p>
                <p className="truncate text-xs text-ink-600">
                  {u.email} · joined {formatDate(u.createdAt)} ·{' '}
                  {u.emailVerified ? t('verified') : t('unverified')} ·{' '}
                  {u.twoFactor ? '2FA on' : '2FA off'}
                  {u.suspensionReason ? ` · ${u.suspensionReason}` : ''}
                </p>
              </div>
              <UserActions user={u} />
            </li>
          ))}
        </ul>
      )}
      <Pagination meta={meta} />
    </div>
  )
}

AdminUsers.layout = 'dashboard'
AdminUsers.dashboardProps = { navItems: adminNav, title: 'Admin' }
