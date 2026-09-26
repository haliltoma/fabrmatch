import { Badge } from '~/components/ui/badge'
import { useT } from '~/lib/i18n'

type Variant = 'secondary' | 'accent' | 'success' | 'warning' | 'destructive'

/** Single status → meaning mapping (docs/DESIGN.md §7). */
const MAP: Record<string, Variant> = {
  draft: 'secondary',
  awaiting_payment: 'secondary',
  paid: 'secondary',
  matching: 'secondary',
  accepted: 'secondary',
  pending: 'secondary',
  cancelled: 'secondary',
  archived: 'secondary',
  inactive: 'secondary',
  in_production: 'accent',
  printing: 'accent',
  produced: 'accent',
  shipped: 'accent',
  delivered: 'success',
  completed: 'success',
  resolved: 'success',
  active: 'success',
  succeeded: 'success',
  unmatched: 'warning',
  responded: 'warning',
  overdue: 'warning',
  // payouts and payee paperwork (R7)
  awaiting_document: 'warning',
  pending_review: 'warning',
  submitted: 'secondary',
  approved: 'success',
  rejected: 'destructive',
  disputed: 'destructive',
  open: 'destructive',
  failed: 'destructive',
}

export function StatusBadge({ status }: { status: string }) {
  const { t } = useT()
  return <Badge variant={MAP[status] ?? 'secondary'}>{t(status.replaceAll('_', ' '))}</Badge>
}
