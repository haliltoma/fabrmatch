import { useState } from 'react'
import { router } from '@inertiajs/react'
import { MailWarning } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { useT } from '~/lib/i18n'

/** Shown to signed-in users with an unverified e-mail; ordering and payouts are locked until then. */
export function VerifyEmailBanner({ user }: { user?: { emailVerified?: boolean } | null }) {
  const { t } = useT()

  const [sending, setSending] = useState(false)
  if (!user || user.emailVerified !== false) return null

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-ink/20 bg-amber-soft px-4 py-3 text-sm text-amber-ink sm:px-6"
    >
      <p className="flex items-center gap-2">
        <MailWarning className="h-4 w-4 shrink-0" aria-hidden />
        {t(
          'Verify your e-mail to order, open disputes and get paid. Check your inbox for the link.'
        )}
      </p>
      <Button
        size="sm"
        variant="outline"
        disabled={sending}
        onClick={() => {
          setSending(true)
          router.post('/resend-verification', {}, { onFinish: () => setSending(false) })
        }}
      >
        {t('Resend link')}
      </Button>
    </div>
  )
}
