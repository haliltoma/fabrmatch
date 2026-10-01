import { useState } from 'react'
import { router } from '@inertiajs/react'
import { adminNav } from '~/lib/nav'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { OrderCode } from '~/components/order_code'
import { PageHeader } from '~/components/page_header'
import { formatMoney } from '~/lib/format'
import { useT } from '~/lib/i18n'

type Profile = {
  id: string
  beneficiaryType: 'manufacturer' | 'seller'
  beneficiaryId: string
  taxStatus: string
  legalName: string
  taxNumber: string
  taxOffice: string
  address: string
  iban: string
  hasDocument: boolean
  submittedAt: string | null
}

type Row = {
  id: string
  orderCode: string | null
  status: string
  taxStatus: string | null
  grossMinor: number
  vatMinor: number
  withholdingMinor: number
  amountMinor: number
  currency: string
  beneficiaryType: 'manufacturer' | 'seller'
  document: {
    id: string
    kind: 'supplier_invoice' | 'expense_voucher'
    number: string
    issuedOn: string | null
    grossMinor: number
    vatMinor: number
    hasFile: boolean
  } | null
  payee: { legalName: string; iban: string; approved: boolean } | null
}

const TAX_STATUS: Record<string, string> = {
  company: 'Company',
  sole_proprietor: 'Sole proprietor',
  simple_method: 'Simple method',
  home_exempt: 'Home production exemption',
}

/** Approve, or send back with a reason the payee will read. */
function Decision({ action, label }: { action: string; label: string }) {
  const { t } = useT()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const send = (decision: 'approve' | 'reject') => {
    setBusy(true)
    router.post(action, { decision, reason }, { onFinish: () => setBusy(false) })
  }
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-56 flex-1 space-y-1">
        <Label htmlFor={`${action}-reason`}>{t('Reason if sending back')}</Label>
        <Input id={`${action}-reason`} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <Button
        disabled={busy}
        onClick={() => send('approve')}
        aria-label={`${t('Approve')} ${label}`}
      >
        {t('Approve')}
      </Button>
      <Button
        variant="outline"
        disabled={busy || reason.trim().length < 5}
        onClick={() => send('reject')}
      >
        {t('Send back')}
      </Button>
    </div>
  )
}

function MarkPaid({ id }: { id: string }) {
  const { t } = useT()
  const [reference, setReference] = useState('')
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        router.post(`/admin/payouts/${id}/paid`, { reference })
      }}
    >
      <div className="space-y-1">
        <Label htmlFor={`ref-${id}`}>{t('Bank reference')}</Label>
        <Input
          id={`ref-${id}`}
          className="w-40"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
      </div>
      <Button type="submit" size="sm" disabled={reference.trim().length < 3}>
        {t('Mark paid')}
      </Button>
    </form>
  )
}

export default function AdminPayouts({
  salesModel,
  profiles,
  invoices,
  ready,
}: {
  salesModel: 'merchant_of_record' | 'marketplace'
  profiles: Profile[]
  invoices: Row[]
  ready: Row[]
}) {
  const { t } = useT()
  const readyTotal = ready.reduce((sum, r) => sum + (r.currency === 'TRY' ? r.amountMinor : 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Payouts')}
        description={t(
          'Fabrmatch buys the work from makers and sellers. Check their tax details and invoices, then send the bank transfers.'
        )}
      />
      {salesModel === 'marketplace' && (
        <p className="rounded-md bg-amber-soft px-4 py-3 text-sm text-amber-ink">
          {t('SALES_MODEL is marketplace: payouts move through the payment provider, not here.')}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {t('Tax and bank details to check')}{' '}
            <span className="font-mono tabular text-ink-600">{profiles.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {profiles.length === 0 && (
            <p className="text-sm text-ink-600">{t('Nothing to check.')}</p>
          )}
          {profiles.map((p) => (
            <section
              key={p.id}
              className="space-y-3 border-t border-line pt-4 first:border-0 first:pt-0"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-medium text-ink-900">{p.legalName}</h3>
                <span className="text-sm text-ink-600">
                  {t(p.beneficiaryType === 'manufacturer' ? 'Maker' : 'Seller')} ·{' '}
                  {t(TAX_STATUS[p.taxStatus] ?? p.taxStatus)}
                </span>
              </div>
              <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-ink-600">{t('Tax number')}</dt>
                  <dd className="font-mono tabular">{p.taxNumber}</dd>
                </div>
                <div>
                  <dt className="text-ink-600">{t('Tax office')}</dt>
                  <dd>{p.taxOffice}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-ink-600">{t('Address')}</dt>
                  <dd>{p.address}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-ink-600">IBAN</dt>
                  <dd className="font-mono tabular">{p.iban}</dd>
                </div>
              </dl>
              {p.hasDocument && (
                <a
                  className="text-sm text-heat-700 underline"
                  href={`/admin/payouts/profiles/${p.id}/document`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('Open the certificate')}
                </a>
              )}
              <p className="text-xs text-ink-600">
                {t(
                  'Check that the IBAN holder, the name on the certificate and the tax number match.'
                )}
              </p>
              <Decision action={`/admin/payouts/profiles/${p.id}`} label={p.legalName} />
            </section>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {t('Invoices to check')}{' '}
            <span className="font-mono tabular text-ink-600">{invoices.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {invoices.length === 0 && (
            <p className="text-sm text-ink-600">{t('Nothing to check.')}</p>
          )}
          {invoices.map((r) => (
            <section
              key={r.id}
              className="space-y-3 border-t border-line pt-4 first:border-0 first:pt-0"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-medium text-ink-900">
                  {r.payee?.legalName ?? '—'} · {r.orderCode && <OrderCode code={r.orderCode} />}
                </h3>
                {r.document?.hasFile && (
                  <a
                    className="text-sm text-heat-700 underline"
                    href={`/admin/payouts/documents/${r.document.id}/file`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('Open invoice {number}', { number: r.document.number })}
                  </a>
                )}
              </div>
              <p className="text-sm text-ink-700">
                {t(
                  'Expected {total} (VAT {vat}); invoice says {invoiceTotal} (VAT {invoiceVat}), dated {date}.',
                  {
                    total: formatMoney(r.grossMinor, r.currency),
                    vat: formatMoney(r.vatMinor, r.currency),
                    invoiceTotal: formatMoney(r.document?.grossMinor ?? 0, r.currency),
                    invoiceVat: formatMoney(r.document?.vatMinor ?? 0, r.currency),
                    date: r.document?.issuedOn ?? '—',
                  }
                )}
              </p>
              <p className="text-xs text-ink-600">
                {t(
                  'Check the buyer title and tax number on the invoice are Fabrmatch’s, and the e-invoice number is real.'
                )}
              </p>
              {r.document && (
                <Decision
                  action={`/admin/payouts/documents/${r.document.id}`}
                  label={r.document.number}
                />
              )}
            </section>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>
            {t('Ready to transfer')}{' '}
            <span className="font-mono tabular text-ink-600">{ready.length}</span>
          </CardTitle>
          {ready.length > 0 && (
            <a className="text-sm text-heat-700 underline" href="/admin/payouts/ready.csv">
              {t('Download the transfer list (CSV)')}
            </a>
          )}
        </CardHeader>
        <CardContent>
          {ready.length === 0 ? (
            <p className="text-sm text-ink-600">{t('No transfers waiting.')}</p>
          ) : (
            <>
              <p className="mb-3 text-sm text-ink-700">
                {t('Total in TRY: {amount}', { amount: formatMoney(readyTotal, 'TRY') })}
              </p>
              <div
                className="overflow-x-auto"
                tabIndex={0}
                role="region"
                aria-label={t('Ready to transfer')}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink-600">
                      <th className="py-2 pr-3 font-medium">{t('Order')}</th>
                      <th className="py-2 pr-3 font-medium">{t('Payee')}</th>
                      <th className="py-2 pr-3 font-medium">IBAN</th>
                      <th className="py-2 pr-3 text-right font-medium">{t('Amount')}</th>
                      <th className="py-2 pr-3 font-medium">{t('Document')}</th>
                      <th className="py-2 font-medium">
                        <span className="sr-only">{t('Mark paid')}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ready.map((r) => (
                      <tr key={r.id} className="border-t border-line align-bottom">
                        <td className="py-2 pr-3">
                          {r.orderCode && <OrderCode code={r.orderCode} />}
                        </td>
                        <td className="py-2 pr-3">
                          {r.payee?.legalName ?? '—'}
                          {r.payee && !r.payee.approved && (
                            <span className="block text-xs text-danger">
                              {t('Details changed — approve them first')}
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3 font-mono tabular">{r.payee?.iban ?? '—'}</td>
                        <td className="py-2 pr-3 text-right tabular">
                          {formatMoney(r.amountMinor, r.currency)}
                        </td>
                        <td className="py-2 pr-3 font-mono">
                          {r.document?.kind === 'expense_voucher' ? (
                            <a
                              className="text-heat-700 underline"
                              href={`/admin/payouts/vouchers/${r.id}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {r.document.number}
                            </a>
                          ) : (
                            (r.document?.number ?? '—')
                          )}
                        </td>
                        <td className="py-2">
                          <MarkPaid id={r.id} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

AdminPayouts.layout = 'dashboard'
AdminPayouts.dashboardProps = { navItems: adminNav, title: 'Admin' }
