import { Badge } from '~/components/ui/badge'
import { useT } from '~/lib/i18n'

const LOOK: Record<
  string,
  { label: string; variant: 'success' | 'secondary' | 'warning' | 'accent' }
> = {
  open: { label: 'Open for offers', variant: 'success' },
  closed: { label: 'Waiting for a decision', variant: 'warning' },
  awarded: { label: 'Offer chosen', variant: 'accent' },
  cancelled: { label: 'Cancelled', variant: 'secondary' },
  expired: { label: 'Expired', variant: 'secondary' },
}

/** Request statuses need their own colours: the shared badge reads "open" as a dispute. */
export function RfqStatus({ status }: { status: string }) {
  const { t } = useT()
  const look = LOOK[status] ?? { label: status, variant: 'secondary' as const }
  return <Badge variant={look.variant}>{t(look.label)}</Badge>
}
