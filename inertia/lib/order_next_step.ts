/**
 * "What happens next" for a buyer's order: for every status, who is acting, what they will do, where
 * the money is and whether the buyer has to do something. Used by the order page card and the order
 * list. Each sentence follows the order state machine (ORDER_TRANSITIONS) and the auto-confirm
 * window, so the page never promises a step that cannot happen. Pure, so it is unit-tested.
 */

export type OrderStage = 'pay' | 'maker' | 'print' | 'ship' | 'check' | 'done'

/** The six stages the buyer sees, the same path as the home page's "After you pay". */
export const ORDER_STAGES: Array<{ id: OrderStage; label: string }> = [
  { id: 'pay', label: 'Pay' },
  { id: 'maker', label: 'Maker' },
  { id: 'print', label: 'Printing' },
  { id: 'ship', label: 'On the way' },
  { id: 'check', label: 'Check' },
  { id: 'done', label: 'Done' },
]

export type Actor = 'you' | 'fabrmatch' | 'maker' | 'carrier'
export type MoneyState = 'not_paid' | 'held' | 'released' | 'decided' | 'none'

export interface NextStep {
  /** Where the order is on the six-stage track; null when it left the track (cancelled). */
  stage: OrderStage | null
  /** Whose move it is now; null once the order is finished. */
  actor: Actor | null
  /** True when nothing moves until the buyer acts. */
  yourTurn: boolean
  title: string
  detail: string
  /** Placeholders for `detail` (the i18n `t()` params). */
  params: Record<string, string | number>
  money: MoneyState
  /** One-line version for the order list. */
  short: string
  /** Where to go next once this order has nothing left to do. */
  suggestions: Array<{ label: string; href: string }>
}

const AFTER = [
  { label: 'Price another model', href: '/files' },
  { label: 'Browse the shop', href: '/shop' },
]

/** The last day to report a problem: delivery date + the confirm window, as yyyy-mm-dd. */
export function checkDeadline(deliveredAt: string | null, confirmDays: number): string | null {
  if (!deliveredAt) return null
  const at = new Date(deliveredAt)
  if (Number.isNaN(at.getTime())) return null
  at.setUTCDate(at.getUTCDate() + confirmDays)
  return at.toISOString().slice(0, 10)
}

export function orderNextStep(
  status: string,
  context: { confirmDays: number; deliveredAt: string | null; formatDate?: (iso: string) => string }
): NextStep {
  const days = context.confirmDays
  const deadline = checkDeadline(context.deliveredAt, days)
  const base = { params: { days } as Record<string, string | number>, suggestions: [] }
  switch (status) {
    case 'draft':
    case 'awaiting_payment':
      return {
        ...base,
        stage: 'pay',
        actor: 'you',
        yourTurn: true,
        title: 'Pay to start your order',
        detail:
          'Nothing is printed before payment. Your money is then held by Fabrmatch, not sent to the maker.',
        money: 'not_paid',
        short: 'Your turn: pay',
      }
    case 'paid':
    case 'matching':
      return {
        ...base,
        stage: 'maker',
        actor: 'fabrmatch',
        yourTurn: false,
        title: 'Finding a maker',
        detail:
          'We are offering the job to verified makers whose printer and material fit. Until one accepts, you can cancel for a full refund.',
        money: 'held',
        short: 'Finding a maker',
      }
    case 'unmatched':
      return {
        ...base,
        stage: 'maker',
        actor: 'fabrmatch',
        yourTurn: false,
        title: 'No maker has taken it yet',
        detail:
          'Our team is now looking for one by hand. If you would rather not wait, cancel for a full refund.',
        money: 'held',
        short: 'Looking for a maker by hand',
      }
    case 'in_production':
      return {
        ...base,
        stage: 'print',
        actor: 'maker',
        yourTurn: false,
        title: 'Your part is being printed',
        detail:
          'The maker prints, checks and packs it. We e-mail you with the tracking number when it ships.',
        money: 'held',
        short: 'Being printed',
      }
    case 'shipped':
      return {
        ...base,
        stage: 'ship',
        actor: 'carrier',
        yourTurn: false,
        title: 'On its way',
        detail:
          'Follow it with the tracking number below. When it arrives, press "Confirm delivery"; then you have {days} days to check it.',
        money: 'held',
        short: 'On its way',
      }
    case 'delivered':
      return {
        ...base,
        params: { days, date: deadline && context.formatDate ? context.formatDate(deadline) : '' },
        stage: 'check',
        actor: 'you',
        yourTurn: true,
        title: 'Check your part',
        detail: deadline
          ? 'All good? Complete the order. Something wrong? Open a dispute with photos by {date}. If you do nothing, the order completes then and the maker is paid.'
          : 'All good? Complete the order. Something wrong? Open a dispute with photos within {days} days. If you do nothing, the order completes then and the maker is paid.',
        money: 'held',
        short: 'Your turn: check your part',
      }
    case 'disputed':
      return {
        ...base,
        stage: 'check',
        actor: 'fabrmatch',
        yourTurn: false,
        title: 'Your dispute is being reviewed',
        detail:
          'Payment stays on hold until an admin decides: a refund, a partial refund or a reprint. You can add more photos below.',
        money: 'held',
        short: 'Dispute under review',
      }
    case 'completed':
      return {
        ...base,
        stage: 'done',
        actor: null,
        yourTurn: false,
        title: 'Done. The maker has been paid.',
        detail: 'Thank you for ordering. Got another part in mind?',
        money: 'released',
        short: 'Completed',
        suggestions: AFTER,
      }
    case 'resolved':
      return {
        ...base,
        stage: 'done',
        actor: null,
        yourTurn: false,
        title: 'The dispute is closed',
        detail: 'The decision and any refund are shown below.',
        money: 'decided',
        short: 'Dispute closed',
        suggestions: AFTER,
      }
    case 'cancelled':
    default:
      return {
        ...base,
        stage: null,
        actor: null,
        yourTurn: false,
        title: 'This order was cancelled',
        detail: 'Nothing was printed. If you had paid, the full amount was refunded.',
        money: 'none',
        short: 'Cancelled',
        suggestions: AFTER,
      }
  }
}
