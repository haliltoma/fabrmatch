import { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { useT } from '~/lib/i18n'
import {
  FAQ_CATEGORIES,
  FaqEntry,
  faqJsonLd,
  type FaqItem,
  type FaqParams,
} from '~/components/home_faq'

function Help({
  faq,
  faqParams,
  topics,
  email: initialEmail,
}: {
  faq: FaqItem[]
  faqParams: FaqParams
  topics: string[]
  email: string
}) {
  const { t } = useT()

  const [form, setForm] = useState({
    email: initialEmail,
    topic: topics[0],
    orderCode: '',
    message: '',
  })
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <>
      <Head title={t('Help and contact — Fabrmatch')}>
        <meta
          name="description"
          content={t(
            'Answers about payments, cancellations, disputes and makers, and a way to reach the Fabrmatch team.'
          )}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqJsonLd(faq, faqParams, t)).replaceAll('<', '\\u003c'),
          }}
        />
      </Head>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-4xl font-semibold text-ink-900">
          {t('How can we help?')}
        </h1>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <section aria-labelledby="faq-h">
            <h2 id="faq-h" className="font-display text-2xl font-semibold text-ink-900">
              {t('Common questions')}
            </h2>
            <div className="mt-4 space-y-6">
              {FAQ_CATEGORIES.map((c) => {
                const items = faq.filter((f) => f.category === c.id)
                if (items.length === 0) return null
                return (
                  <div key={c.id}>
                    <h3 className="font-mono text-xs font-semibold tracking-widest text-ink-600 uppercase">
                      {t(c.label)}
                    </h3>
                    <div className="mt-2 divide-y divide-line rounded-[10px] border border-line bg-paper-raised">
                      {items.map((item) => (
                        <FaqEntry key={item.q} item={item} params={faqParams} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section aria-labelledby="contact-h">
            <h2 id="contact-h" className="font-display text-2xl font-semibold text-ink-900">
              {t('Still stuck? Write to us')}
            </h2>
            <form
              className="mt-4 space-y-4 rounded-[10px] border border-line bg-paper-raised p-5"
              onSubmit={(e) => {
                e.preventDefault()
                setBusy(true)
                router.post(
                  '/help',
                  { ...form, orderCode: form.orderCode || undefined },
                  {
                    preserveScroll: true,
                    onSuccess: () => setForm((f) => ({ ...f, message: '', orderCode: '' })),
                    onFinish: () => setBusy(false),
                  }
                )
              }}
            >
              <div className="space-y-1">
                <Label htmlFor="sp-email">{t('Your e-mail')}</Label>
                <Input
                  id="sp-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => set('email')(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sp-topic">{t('Topic')}</Label>
                <select
                  id="sp-topic"
                  className="flex h-10 w-full rounded-md border border-line bg-paper-raised px-3 text-sm"
                  value={form.topic}
                  onChange={(e) => set('topic')(e.target.value)}
                >
                  {topics.map((topic) => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="sp-order">{t('Order code (if it is about an order)')}</Label>
                <Input
                  id="sp-order"
                  placeholder={t('FO-…')}
                  value={form.orderCode}
                  onChange={(e) => set('orderCode')(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sp-msg">{t('What happened?')}</Label>
                <textarea
                  id="sp-msg"
                  required
                  rows={5}
                  maxLength={2000}
                  className="w-full rounded-md border border-line bg-paper-raised p-3 text-sm"
                  value={form.message}
                  onChange={(e) => set('message')(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {t('Send message')}
              </Button>
            </form>
          </section>
        </div>
      </div>
    </>
  )
}

export default Help
