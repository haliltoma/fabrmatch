import { Link } from '@adonisjs/inertia/react'
import { FileText } from 'lucide-react'
import { formatDate } from '~/lib/format'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { EmptyState } from '~/components/empty_state'
import { Money } from '~/components/money'
import { OrderCode } from '~/components/order_code'
import { PageHeader } from '~/components/page_header'
import { Pagination, type PageMeta } from '~/components/pagination'
import { useT } from '~/lib/i18n'

type InvoiceData = {
  id: number
  number: string
  orderId: number
  orderCode: string | null
  status: 'issued' | 'voided'
  issuedAt: string | null
  netMinor: number
  taxMinor: number
  grossMinor: number
  currency: string
}

/** Every invoice addressed to the signed-in user; each opens its printable page. */
export default function InvoicesIndex({
  invoices,
  meta,
}: {
  invoices: InvoiceData[]
  meta: PageMeta
}) {
  const { t } = useT()

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        title={t('My invoices')}
        description={t(
          'Invoices issued to you once an order is completed, newest first. Open one to print or save it as PDF.'
        )}
      />

      {invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t('No invoices yet')}
          description={t(
            'An invoice is issued automatically when one of your orders is completed.'
          )}
          action={
            <Button variant="outline" asChild>
              <Link href="/orders">{t('See my orders')}</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {invoices.map((invoice) => (
            <li key={invoice.id}>
              <a
                href={`/orders/${invoice.orderId}/invoice`}
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-paper-raised px-5 py-4 transition-colors hover:border-ink-900/40"
              >
                <div className="space-y-1">
                  <p className="tabular font-mono text-sm font-medium text-ink-900">
                    {invoice.number}
                  </p>
                  <p className="flex flex-wrap items-center gap-2 text-sm text-ink-700">
                    {t('Order')}
                    {invoice.orderCode && <OrderCode code={invoice.orderCode} />}
                    <span className="text-ink-600">· {formatDate(invoice.issuedAt)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-5">
                  <div className="sm:text-right">
                    <Money
                      minor={invoice.grossMinor}
                      currency={invoice.currency}
                      className="font-medium"
                    />
                    <p className="text-xs text-ink-600">
                      {t('incl. VAT')}{' '}
                      <Money minor={invoice.taxMinor} currency={invoice.currency} />
                    </p>
                  </div>
                  {invoice.status === 'voided' && <Badge variant="secondary">{t('Voided')}</Badge>}
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}

      <Pagination meta={meta} />
    </div>
  )
}
