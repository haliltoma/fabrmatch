import Dispute from '#models/dispute'
import Payout from '#models/payout'
import MatchOffer from '#models/match_offer'
import AdminQueueService from '#services/admin/queue_service'

export type AttentionItem = {
  key: string
  count: number
  /** English source text; the page translates it. */
  label: string
  href: string
}

export type AdminAttention = {
  /** Menu badges: how many things wait behind each link. */
  badges: { queues: number; matching: number; disputes: number; payouts: number }
  /** "Needs you now": every non-empty queue, most urgent kind first. */
  items: AttentionItem[]
}

/**
 * What is waiting for a person across the admin panel, in one read: the work-queue counts, open
 * disputes and payouts waiting for approval. The order of `items` is the triage order (money and
 * trust problems before housekeeping), so the dashboard can show it as a to-do list.
 */
export default class AttentionService {
  async summary(): Promise<AdminAttention> {
    const [queues, disputes, payouts, counters] = await Promise.all([
      new AdminQueueService().counts(),
      Dispute.query().whereNot('status', 'resolved').count('* as n').first(),
      Payout.query().where('status', 'pending').count('* as n').first(),
      MatchOffer.query().where('status', 'countered').count('* as n').first(),
    ])
    const counterOffers = Number(counters?.$extras.n ?? 0)
    const openDisputes = Number(disputes?.$extras.n ?? 0)
    const pendingPayouts = Number(payouts?.$extras.n ?? 0)

    const all: AttentionItem[] = [
      { key: 'disputes', count: openDisputes, label: 'Open disputes', href: '/admin/disputes' },
      {
        key: 'fraud',
        count: queues.fraud,
        label: 'Orders flagged for fraud review',
        href: '/admin/queues#fraud',
      },
      {
        key: 'chargebacks',
        count: queues.chargebacks,
        label: 'Card chargebacks',
        href: '/admin/queues#chargebacks',
      },
      {
        key: 'paymentReviews',
        count: queues.paymentReviews,
        label: 'Payments needing review',
        href: '/admin/queues#payment-reviews',
      },
      {
        key: 'counterOffers',
        count: counterOffers,
        label: 'Counter-offers from makers',
        href: '/admin/matching',
      },
      {
        key: 'unmatched',
        count: queues.unmatched,
        label: 'Orders without a maker',
        href: '/admin/matching',
      },
      {
        key: 'overdue',
        count: queues.overdue,
        label: 'Production past deadline',
        href: '/admin/queues#overdue',
      },
      {
        key: 'payouts',
        count: pendingPayouts,
        label: 'Payouts waiting for approval',
        href: '/admin/payouts',
      },
      {
        key: 'pendingMakers',
        count: queues.pendingMakers,
        label: 'Makers waiting for approval',
        href: '/admin/queues#makers',
      },
      {
        key: 'support',
        count: queues.support,
        label: 'Support requests',
        href: '/admin/queues#support',
      },
      {
        key: 'reports',
        count: queues.reports,
        label: 'Reported listings',
        href: '/admin/queues#reports',
      },
      {
        key: 'shopPhotos',
        count: queues.shopPhotos,
        label: 'Shop photos to review',
        href: '/admin/queues#shop-photos',
      },
      {
        key: 'reconcile',
        count: queues.reconcile,
        label: 'Ledger reconciliation',
        href: '/admin/queues#reconcile',
      },
    ]
    const queueTotal = Object.values(queues).reduce((sum, n) => sum + n, 0)
    return {
      badges: {
        queues: queueTotal,
        matching: queues.unmatched + counterOffers,
        disputes: openDisputes,
        payouts: pendingPayouts,
      },
      items: all.filter((i) => i.count > 0),
    }
  }
}
