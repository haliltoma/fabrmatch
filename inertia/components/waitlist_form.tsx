import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { useT } from '~/lib/i18n'

/** E-mail capture with an explicit, unticked consent box; the server refuses a lead without it. */
export function WaitlistForm({
  interest,
  cityLabel,
  cta,
}: {
  interest: 'maker' | 'seller'
  cityLabel?: string
  cta: string
}) {
  const { t } = useT()

  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        setBusy(true)
        router.post(
          '/waitlist',
          { email, interest, city: city || undefined, consent },
          {
            preserveScroll: true,
            onSuccess: () => setEmail(''),
            onFinish: () => setBusy(false),
          }
        )
      }}
    >
      <div className="space-y-1">
        <Label htmlFor={`wl-email-${interest}`}>{t('E-mail')}</Label>
        <Input
          id={`wl-email-${interest}`}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {cityLabel && (
        <div className="space-y-1">
          <Label htmlFor={`wl-city-${interest}`}>{cityLabel}</Label>
          <Input
            id={`wl-city-${interest}`}
            autoComplete="address-level2"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
      )}
      <label className="flex items-start gap-3 text-sm text-ink-700">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0 accent-heat-600"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          {t(
            'I agree that Fabrmatch may e-mail me about launching in my area. I can unsubscribe any time.'
          )}
        </span>
      </label>
      <Button
        type="submit"
        variant="accent"
        className="w-full"
        disabled={busy || !consent || email === ''}
      >
        {cta}
      </Button>
    </form>
  )
}
