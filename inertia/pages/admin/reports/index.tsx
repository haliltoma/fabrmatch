import { useState } from 'react'
import { router } from '@inertiajs/react'
import { adminNav } from '~/lib/nav'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Money } from '~/components/money'
import { PageHeader } from '~/components/page_header'
import { useT } from '~/lib/i18n'

type Row = {
  currency: string
  ordersCompleted: number
  grossMinor: number
  vatMinor: number
  discountMinor: number
  platformFeeMinor: number
  refundedMinor: number
  makerPayoutsMinor: number
  sellerPayoutsMinor: number
}

export default function AdminReports({ month, rows }: { month: string; rows: Row[] }) {
  const { t } = useT()

  const [value, setValue] = useState(month)
  const download = (kind: string) => `/admin/reports/download/${kind}?month=${month}`
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={t('Financial reports')}
        description={t(
          'Per month and per currency, for accounting. Currencies are never added together.'
        )}
      />
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          router.get('/admin/reports', { month: value })
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="rep-month">{t('Month')}</Label>
          <Input
            id="rep-month"
            type="month"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline">
          {t('Show')}
        </Button>
      </form>

      {rows.length === 0 ? (
        <p className="text-ink-700">
          {t('Nothing was completed, paid out or refunded in {month}.', { month })}
        </p>
      ) : (
        rows.map((r) => (
          <Card key={r.currency}>
            <CardHeader>
              <CardTitle>
                {month} · {r.currency}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                {(
                  [
                    ['Orders completed', <span key="n">{r.ordersCompleted}</span>],
                    ['Gross total', <Money key="g" minor={r.grossMinor} currency={r.currency} />],
                    [
                      'VAT included in orders',
                      <Money key="v" minor={r.vatMinor} currency={r.currency} />,
                    ],
                    [
                      'Discounts given',
                      <Money key="d" minor={r.discountMinor} currency={r.currency} />,
                    ],
                    [
                      'Platform fee earned',
                      <Money key="f" minor={r.platformFeeMinor} currency={r.currency} />,
                    ],
                    [
                      'Refunds paid',
                      <Money key="r" minor={r.refundedMinor} currency={r.currency} />,
                    ],
                    [
                      'Paid to makers',
                      <Money key="m" minor={r.makerPayoutsMinor} currency={r.currency} />,
                    ],
                    [
                      'Paid to sellers',
                      <Money key="s" minor={r.sellerPayoutsMinor} currency={r.currency} />,
                    ],
                  ] as const
                ).map(([label, figure]) => (
                  <div key={label} className="flex justify-between gap-4 border-b border-line py-1">
                    <dt className="text-ink-600">{t(label)}</dt>
                    <dd className="tabular text-ink-900">{figure}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ))
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('Downloads (CSV)')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a href={download('summary')}>{t('Monthly summary')}</a>
          </Button>
          <Button asChild variant="outline">
            <a href={download('orders')}>{t('Completed orders')}</a>
          </Button>
          <Button asChild variant="outline">
            <a href={download('payouts')}>{t('Payouts paid')}</a>
          </Button>
          <Button asChild variant="outline">
            <a href={download('coupons')}>{t('Coupon cost')}</a>
          </Button>
        </CardContent>
      </Card>
      <p className="text-xs text-ink-600">
        {t(
          'Platform fee is counted when the money is released to makers and sellers. VAT is the amount already inside each order total. Which invoices the platform issues (fee only or the full sale) is still open (K-C).'
        )}
      </p>
    </div>
  )
}

AdminReports.layout = 'dashboard'
AdminReports.dashboardProps = { navItems: adminNav, title: 'Admin Panel' }
