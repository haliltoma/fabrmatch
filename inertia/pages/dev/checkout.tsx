import { useState, type FormEvent } from 'react'
import { Head, router, usePage } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { CreditCard, FlaskConical, Lock } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Money } from '~/components/money'
import { OrderCode } from '~/components/order_code'
import { useT } from '~/lib/i18n'

type Card = { number: string; expiry: string; cvc: string; name: string }

const EMPTY: Card = { number: '', expiry: '', cvc: '', name: '' }

/** 4242424242424242 → "4242 4242 4242 4242" while typing. */
function groupDigits(value: string) {
  return value
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
}

/** "1234" → "12/34" while typing. */
function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}

/**
 * Local stand-in for the payment provider's hosted checkout (fake provider only). The real
 * provider's page replaces this one; the order flow around it stays the same.
 */
export default function TestCheckout({
  providerRef,
  orderId,
  orderCode,
  amount,
  finished,
  testCard,
}: {
  providerRef: string
  orderId: number
  orderCode: string
  amount: { minor: number; currency: string }
  finished: boolean
  testCard: Card
}) {
  const { t } = useT()
  const { errors } = usePage().props as { errors?: Record<string, string> }
  const [card, setCard] = useState<Card>(EMPTY)
  const [processing, setProcessing] = useState(false)

  const set = (field: keyof Card, value: string) => setCard((c) => ({ ...c, [field]: value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    router.post(`/dev/checkout/${providerRef}`, card, {
      onStart: () => setProcessing(true),
      onFinish: () => setProcessing(false),
    })
  }

  const field = (
    name: keyof Card,
    label: string,
    props: React.ComponentProps<typeof Input> = {}
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={`card-${name}`}>{label}</Label>
      <Input
        id={`card-${name}`}
        name={name}
        value={card[name]}
        aria-invalid={errors?.[name] ? true : undefined}
        aria-describedby={errors?.[name] ? `card-${name}-error` : undefined}
        required
        {...props}
      />
      {errors?.[name] && (
        <p id={`card-${name}-error`} className="text-sm font-medium text-danger">
          {errors[name]}
        </p>
      )}
    </div>
  )

  return (
    <div className="mx-auto max-w-md space-y-5 py-10">
      <Head title={t('Test payment')} />

      <div
        role="note"
        className="flex items-start gap-3 rounded-lg border border-line bg-amber-soft px-4 py-3 text-sm text-amber-ink"
      >
        <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          <strong>{t('Test mode')}</strong> ·{' '}
          {t(
            'This page only exists on your local machine. No real card is charged and no money moves.'
          )}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-paper-raised">
        <div className="layer-lines flex items-end justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-600">
              {t('Order')}
            </p>
            <OrderCode code={orderCode} className="text-lg font-semibold" />
          </div>
          <div className="text-right">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-600">
              {t('Total')}
            </p>
            <Money
              minor={amount.minor}
              currency={amount.currency}
              className="font-display text-2xl font-semibold text-ink-900"
            />
          </div>
        </div>

        {finished ? (
          <div className="space-y-4 px-6 py-6">
            <p className="text-ink-700">{t('This checkout is already finished.')}</p>
            <Button asChild>
              <Link href={`/orders/${orderId}`}>{t('Back to the order')}</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 px-6 py-6" noValidate>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-paper-sunken px-4 py-3">
              <div className="text-sm">
                <p className="font-medium text-ink-900">{t('Test card')}</p>
                <p className="font-mono tabular text-ink-700">
                  {groupDigits(testCard.number)} · {testCard.expiry} · {testCard.cvc}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCard({ ...testCard, number: groupDigits(testCard.number) })}
              >
                {t('Fill in')}
              </Button>
            </div>

            {field('number', t('Card number'), {
              inputMode: 'numeric',
              autoComplete: 'cc-number',
              placeholder: '4242 4242 4242 4242',
              onChange: (e) => set('number', groupDigits(e.target.value)),
            })}
            <div className="grid grid-cols-2 gap-4">
              {field('expiry', t('Expiry (MM/YY)'), {
                inputMode: 'numeric',
                autoComplete: 'cc-exp',
                placeholder: '12/34',
                onChange: (e) => set('expiry', formatExpiry(e.target.value)),
              })}
              {field('cvc', t('CVC'), {
                inputMode: 'numeric',
                autoComplete: 'cc-csc',
                placeholder: '123',
                maxLength: 4,
                onChange: (e) => set('cvc', e.target.value.replace(/\D/g, '')),
              })}
            </div>
            {field('name', t('Name on card'), {
              autoComplete: 'cc-name',
              onChange: (e) => set('name', e.target.value),
            })}

            <Button type="submit" size="lg" className="w-full" disabled={processing}>
              <Lock className="h-4 w-4" aria-hidden="true" />
              {processing ? t('Processing…') : t('Pay')}{' '}
              {!processing && <Money minor={amount.minor} currency={amount.currency} />}
            </Button>
            <p className="flex items-center gap-2 text-xs text-ink-600">
              <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
              {t('Any other card number is declined, so you can test a failed payment too.')}
            </p>
            <p className="text-center text-sm">
              <Link href={`/orders/${orderId}`} className="text-ink-700 underline">
                {t('Cancel and go back to the order')}
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
