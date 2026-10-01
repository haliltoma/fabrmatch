import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { ArrowLeft } from 'lucide-react'
import { formatDateTime } from '~/lib/format'
import { Button } from '~/components/ui/button'
import { OrderCode } from '~/components/order_code'
import { useT } from '~/lib/i18n'

type Message = {
  id: string
  mine: boolean
  from: string
  body: string
  masked: boolean
  createdAt: string | null
}

function Thread({
  side,
  order,
  messages,
  backHref,
  postHref,
}: {
  side: 'buyer' | 'maker'
  order: { id: string; code: string; status: string }
  messages: Message[]
  backHref: string
  postHref: string
}) {
  const { t } = useT()

  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const other = side === 'buyer' ? 'maker' : 'buyer'

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" /> {t('Back')}
      </Link>
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">
          {t('Messages ·')} <OrderCode code={order.code} />
        </h1>
        <p className="text-sm text-ink-600">
          {t(
            'You and the {other} are anonymous to each other. Phone numbers, links, e-mail addresses and payment details are hidden automatically.',
            { other }
          )}
        </p>
      </div>

      <ul className="space-y-3" aria-live="polite">
        {messages.length === 0 && <li className="text-ink-600">{t('No messages yet.')}</li>}
        {messages.map((m) => (
          <li key={m.id} className={m.mine ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2 text-sm ${
                m.mine ? 'bg-ink-900 text-paper' : 'border border-line bg-paper-raised text-ink-900'
              }`}
            >
              <p className="whitespace-pre-wrap">{m.body}</p>
              <p className={`mt-1 text-xs ${m.mine ? 'text-paper/70' : 'text-ink-600'}`}>
                {m.mine ? 'You' : m.from} · {formatDateTime(m.createdAt)}
                {m.masked ? ' · contact details hidden' : ''}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault()
          setBusy(true)
          router.post(
            postHref,
            { body },
            {
              preserveScroll: true,
              onSuccess: () => setBody(''),
              onFinish: () => setBusy(false),
            }
          )
        }}
      >
        <label htmlFor="message" className="sr-only">
          {t('Your message')}
        </label>
        <textarea
          id="message"
          rows={3}
          maxLength={1500}
          className="w-full rounded-md border border-line bg-paper-raised p-3 text-sm"
          placeholder={t('Write to the {other}…', { other })}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Button type="submit" disabled={busy || body.trim() === ''}>
          {t('Send')}
        </Button>
      </form>
    </div>
  )
}

export default Thread
