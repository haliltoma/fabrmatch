import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { MoneyInput } from '~/components/money_input'
import { OrderCode } from '~/components/order_code'
import { PageHeader } from '~/components/page_header'
import { StatusBadge } from '~/components/status_badge'
import { formatMoney } from '~/lib/format'
import { useT } from '~/lib/i18n'

type TaxStatus = 'company' | 'sole_proprietor' | 'simple_method' | 'home_exempt'

export type PayeeProfile = {
  taxStatus: TaxStatus
  legalName: string
  taxNumberMasked: string
  taxOffice: string
  address: string
  ibanMasked: string
  hasDocument: boolean
  status: 'pending_review' | 'approved' | 'rejected'
  rejectionReason: string | null
  submittedAt: string | null
}

type PayoutDocument = {
  id: number
  kind: 'supplier_invoice' | 'expense_voucher'
  number: string
  issuedOn: string | null
  grossMinor: number
  vatMinor: number
  withholdingMinor: number
  status: 'submitted' | 'approved' | 'rejected'
  rejectionReason: string | null
  hasFile: boolean
}

export type PayoutRow = {
  id: number
  orderCode: string | null
  status: string
  taxStatus: string | null
  grossMinor: number
  vatMinor: number
  withholdingMinor: number
  amountMinor: number
  currency: string
  paidAt: string | null
  document: PayoutDocument | null
}

export type PayeePayoutProps = {
  basePath: string
  salesModel: 'merchant_of_record' | 'marketplace'
  company: {
    legalName: string | null
    taxNumber: string | null
    taxOffice: string | null
    address: string | null
  }
  homeExemptWithholdingBps: number
  profile: PayeeProfile | null
  awaiting: PayoutRow[]
  history: PayoutRow[]
}

const STATUSES: Array<{ value: TaxStatus; title: string; help: string }> = [
  {
    value: 'company',
    title: 'Limited or joint-stock company',
    help: 'You invoice Fabrmatch for your share, VAT included.',
  },
  {
    value: 'sole_proprietor',
    title: 'Sole proprietor',
    help: 'You invoice Fabrmatch for your share, VAT included.',
  },
  {
    value: 'simple_method',
    title: 'Simple method (basit usul)',
    help: 'You invoice without VAT, so you are paid your share without the VAT part.',
  },
  {
    value: 'home_exempt',
    title: 'Home production exemption (esnaf muafiyeti)',
    help: 'No invoice needed: Fabrmatch issues an expense voucher and withholds income tax.',
  },
]

function ProfileForm({
  basePath,
  profile,
  onDone,
}: {
  basePath: string
  profile: PayeeProfile | null
  onDone: () => void
}) {
  const { t } = useT()
  const [form, setForm] = useState({
    taxStatus: profile?.taxStatus ?? ('company' as TaxStatus),
    legalName: profile?.legalName ?? '',
    taxNumber: '',
    taxOffice: profile?.taxOffice ?? '',
    address: profile?.address ?? '',
    iban: '',
    password: '',
  })
  const [document, setDocument] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm({ ...form, [key]: e.target.value })
  const documentRequired = !profile?.hasDocument || profile.taxStatus !== form.taxStatus

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        setBusy(true)
        router.post(
          basePath,
          { ...form, ...(document ? { document } : {}) },
          {
            forceFormData: true,
            onSuccess: onDone,
            onFinish: () => {
              setBusy(false)
              setForm((f) => ({ ...f, password: '' }))
            },
          }
        )
      }}
    >
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium text-ink-900">
          {t('How are you registered for tax?')}
        </legend>
        {STATUSES.map((s) => (
          <label
            key={s.value}
            className="flex cursor-pointer gap-3 rounded-md border border-line bg-paper-raised p-3 has-[:checked]:border-heat-500 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-heat-500"
          >
            <input
              type="radio"
              name="taxStatus"
              value={s.value}
              checked={form.taxStatus === s.value}
              onChange={() => setForm({ ...form, taxStatus: s.value })}
              className="mt-1 accent-heat-600"
            />
            <span>
              <span className="block text-sm font-medium text-ink-900">{t(s.title)}</span>
              <span className="block text-sm text-ink-600">{t(s.help)}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="p-name">
            {form.taxStatus === 'company' ? t('Company title') : t('Full name')}
          </Label>
          <Input id="p-name" required value={form.legalName} onChange={set('legalName')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="p-tax">
            {form.taxStatus === 'company'
              ? t('Tax number (VKN)')
              : t('T.C. identity number or tax number')}
          </Label>
          <Input
            id="p-tax"
            required
            inputMode="numeric"
            autoComplete="off"
            maxLength={11}
            placeholder={profile ? profile.taxNumberMasked : undefined}
            value={form.taxNumber}
            onChange={set('taxNumber')}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="p-office">{t('Tax office')}</Label>
          <Input id="p-office" required value={form.taxOffice} onChange={set('taxOffice')} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="p-address">{t('Address on your tax registration')}</Label>
          <Input id="p-address" required value={form.address} onChange={set('address')} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="p-iban">{t('IBAN (in the same name)')}</Label>
          <Input
            id="p-iban"
            required
            autoComplete="off"
            placeholder={profile ? profile.ibanMasked : t('TR00 0000 0000 0000 0000 0000 00')}
            value={form.iban}
            onChange={set('iban')}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="p-doc">
            {form.taxStatus === 'home_exempt'
              ? t('Exemption certificate (PDF, PNG or JPEG)')
              : t('Tax certificate (vergi levhası; PDF, PNG or JPEG)')}
          </Label>
          <Input
            id="p-doc"
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            required={documentRequired}
            onChange={(e) => setDocument(e.target.files?.[0] ?? null)}
          />
          {!documentRequired && (
            <p className="text-xs text-ink-600">
              {t('Leave empty to keep the certificate you sent before.')}
            </p>
          )}
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="p-password">{t('Your password')}</Label>
          <Input
            id="p-password"
            type="password"
            required
            autoComplete="current-password"
            value={form.password}
            onChange={set('password')}
          />
          <p className="text-xs text-ink-600">
            {t('We ask again because this decides where your money goes.')}
          </p>
        </div>
      </div>
      <Button type="submit" disabled={busy}>
        {t('Send for review')}
      </Button>
    </form>
  )
}

function InvoiceForm({ basePath, payout }: { basePath: string; payout: PayoutRow }) {
  const { t } = useT()
  const [number, setNumber] = useState('')
  const [issuedOn, setIssuedOn] = useState(new Date().toISOString().slice(0, 10))
  const [grossMinor, setGross] = useState<number | null>(null)
  const [vatMinor, setVat] = useState<number | null>(payout.vatMinor === 0 ? 0 : null)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const id = (name: string) => `inv-${payout.id}-${name}`

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!file || grossMinor === null || vatMinor === null) return
        setBusy(true)
        router.post(
          `${basePath}/${payout.id}/invoice`,
          { number, issuedOn, grossMinor, vatMinor, invoice: file },
          { forceFormData: true, onFinish: () => setBusy(false) }
        )
      }}
    >
      <div className="space-y-1">
        <Label htmlFor={id('number')}>{t('Invoice number')}</Label>
        <Input
          id={id('number')}
          required
          value={number}
          onChange={(e) => setNumber(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={id('date')}>{t('Invoice date')}</Label>
        <Input
          id={id('date')}
          type="date"
          required
          value={issuedOn}
          onChange={(e) => setIssuedOn(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={id('gross')}>{t('Invoice total')}</Label>
        <MoneyInput
          id={id('gross')}
          required
          currency={payout.currency}
          valueMinor={grossMinor}
          onChange={setGross}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={id('vat')}>{t('VAT on the invoice')}</Label>
        <MoneyInput
          id={id('vat')}
          required
          currency={payout.currency}
          valueMinor={vatMinor}
          onChange={setVat}
        />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor={id('file')}>{t('Invoice file (PDF, PNG or JPEG)')}</Label>
        <Input
          id={id('file')}
          type="file"
          required
          accept="application/pdf,image/png,image/jpeg"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={busy || !file || grossMinor === null || vatMinor === null}>
          {t('Send invoice')}
        </Button>
      </div>
    </form>
  )
}

export function PayeePayout({
  basePath,
  salesModel,
  company,
  homeExemptWithholdingBps,
  profile,
  awaiting,
  history,
}: PayeePayoutProps) {
  const { t } = useT()
  const [editing, setEditing] = useState(!profile)
  const companyKnown = !!company.legalName && !!company.taxNumber

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={t('Payouts and invoices')}
        description={t(
          'Fabrmatch sells to the buyer and buys the work from you. Your share is paid by bank transfer once the order is completed and your paperwork is in order.'
        )}
      />

      {salesModel === 'marketplace' && (
        <p className="rounded-md bg-paper-sunken px-4 py-3 text-sm text-ink-700">
          {t('Payouts currently go through the payment provider; invoices are not needed here.')}
        </p>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>{t('Tax and bank details')}</CardTitle>
          {profile && <StatusBadge status={profile.status} />}
        </CardHeader>
        <CardContent className="space-y-4">
          {!profile && (
            <p className="text-sm text-ink-700">
              {t(
                'Nothing can be paid out before an admin approves these details. It usually takes one working day.'
              )}
            </p>
          )}
          {profile?.status === 'rejected' && (
            <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">
              {t('Not approved:')} {profile.rejectionReason}
            </p>
          )}
          {profile?.status === 'pending_review' && (
            <p className="rounded-md bg-amber-soft px-4 py-3 text-sm text-amber-ink">
              {t('An admin is checking your details. Payouts wait until they are approved.')}
            </p>
          )}
          {profile && !editing && (
            <>
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-ink-600">{t('Registered as')}</dt>
                  <dd className="text-ink-900">
                    {t(STATUSES.find((s) => s.value === profile.taxStatus)?.title ?? '')}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-600">{t('Name or title')}</dt>
                  <dd className="text-ink-900">{profile.legalName}</dd>
                </div>
                <div>
                  <dt className="text-ink-600">{t('Tax number')}</dt>
                  <dd className="font-mono tabular text-ink-900">{profile.taxNumberMasked}</dd>
                </div>
                <div>
                  <dt className="text-ink-600">{t('Tax office')}</dt>
                  <dd className="text-ink-900">{profile.taxOffice}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-ink-600">IBAN</dt>
                  <dd className="font-mono tabular text-ink-900">{profile.ibanMasked}</dd>
                </div>
              </dl>
              <Button variant="outline" onClick={() => setEditing(true)}>
                {t('Change details')}
              </Button>
            </>
          )}
          {editing && (
            <>
              {profile && (
                <p className="text-sm text-ink-700">
                  {t('Changes go back to an admin; payouts wait until they are approved again.')}
                </p>
              )}
              <ProfileForm basePath={basePath} profile={profile} onDone={() => setEditing(false)} />
              {profile && (
                <Button variant="ghost" onClick={() => setEditing(false)}>
                  {t('Cancel')}
                </Button>
              )}
            </>
          )}
          <p className="text-xs text-ink-600">
            {t('Home producers: {rate}% income tax is withheld on each voucher.', {
              rate: (homeExemptWithholdingBps / 100).toString(),
            })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('Invoices to send')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {awaiting.length === 0 ? (
            <p className="text-sm text-ink-600">
              {t(
                'Nothing to invoice right now. When an order of yours is completed, it shows up here with the exact amount.'
              )}
            </p>
          ) : (
            <>
              <div className="rounded-md bg-paper-sunken px-4 py-3 text-sm text-ink-700">
                <p className="font-medium text-ink-900">{t('Bill to')}</p>
                {companyKnown ? (
                  <p>
                    {company.legalName} · {t('Tax number')}{' '}
                    <span className="font-mono tabular">{company.taxNumber}</span> ·{' '}
                    {company.taxOffice}
                    <br />
                    {company.address}
                  </p>
                ) : (
                  <p>
                    {t('Fabrmatch’s company details appear here once the company is registered.')}
                  </p>
                )}
              </div>
              {awaiting.map((payout) => (
                <section
                  key={payout.id}
                  className="space-y-3 border-t border-line pt-4 first:border-0 first:pt-0"
                  aria-labelledby={`payout-${payout.id}`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 id={`payout-${payout.id}`} className="font-medium text-ink-900">
                      {payout.orderCode && <OrderCode code={payout.orderCode} />}
                    </h3>
                    <p className="text-sm text-ink-700">
                      {t('Invoice {total}, of which VAT {vat}', {
                        total: formatMoney(payout.grossMinor, payout.currency),
                        vat: formatMoney(payout.vatMinor, payout.currency),
                      })}
                    </p>
                  </div>
                  {payout.document?.status === 'submitted' ? (
                    <p className="text-sm text-ink-700">
                      {t('Invoice {number} is being checked.', { number: payout.document.number })}
                    </p>
                  ) : (
                    <>
                      {payout.document?.status === 'rejected' && (
                        <p
                          role="alert"
                          className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger"
                        >
                          {t('Invoice {number} was not accepted:', {
                            number: payout.document.number,
                          })}{' '}
                          {payout.document.rejectionReason}
                        </p>
                      )}
                      <InvoiceForm basePath={basePath} payout={payout} />
                    </>
                  )}
                </section>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('Payout history')}</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-ink-600">{t('No payouts yet.')}</p>
          ) : (
            <div
              className="overflow-x-auto"
              tabIndex={0}
              role="region"
              aria-label={t('Payout history')}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-600">
                    <th className="py-2 pr-3 font-medium">{t('Order')}</th>
                    <th className="py-2 pr-3 font-medium">{t('Status')}</th>
                    <th className="py-2 pr-3 text-right font-medium">{t('Document total')}</th>
                    <th className="py-2 pr-3 text-right font-medium">{t('Tax withheld')}</th>
                    <th className="py-2 pr-3 text-right font-medium">{t('Transferred')}</th>
                    <th className="py-2 font-medium">{t('Document')}</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((p) => (
                    <tr key={p.id} className="border-t border-line">
                      <td className="py-2 pr-3">
                        {p.orderCode && <OrderCode code={p.orderCode} />}
                      </td>
                      <td className="py-2 pr-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="py-2 pr-3 text-right tabular">
                        {formatMoney(p.grossMinor, p.currency)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular">
                        {formatMoney(p.withholdingMinor, p.currency)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular">
                        {formatMoney(p.amountMinor, p.currency)}
                      </td>
                      <td className="py-2">
                        {p.document?.kind === 'expense_voucher' ? (
                          <a
                            className="font-mono text-heat-700 underline"
                            href={`${basePath}/vouchers/${p.id}`}
                          >
                            {p.document.number}
                          </a>
                        ) : (
                          <span className="font-mono">{p.document?.number ?? '—'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
