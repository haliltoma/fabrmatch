import type { Locale } from '#services/i18n/locale'
import { TEMPLATES_TR } from '#services/notifications/catalog_tr'
/**
 * What each notification says, per recipient role. Every template receives ONLY the facts the
 * recipient may see (PRD §9): buyers/sellers never get maker identity, makers never get buyer
 * identity, tracking goes to the buyer only.
 */
export type NotificationRole = 'buyer' | 'seller' | 'maker' | 'admin'

export const NOTIFICATION_TYPES = [
  'payment_received',
  'offer_received',
  'order_unmatched',
  'order_in_production',
  'order_shipped',
  'order_delivered',
  'order_completed',
  'order_cancelled',
  'refund_issued',
  'payout_paid',
  'payout_action',
  'store_order',
  'dispute_opened',
  'dispute_responded',
  'dispute_resolved',
  'message_received',
  'welcome',
  'payment_reminder',
  'review_request',
  'capacity_idle',
  'rfq_invited',
  'rfq_bid_received',
  'rfq_awarded',
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export interface NotificationContext {
  code?: string
  orderId?: string
  disputeId?: string
  amountMinor?: number
  currency?: string
  carrier?: string | null
  trackingNumber?: string | null
  resolution?: string | null
  /** Public alias of the maker — only ever passed to that maker's own notification. */
  alias?: string
  ttlMinutes?: number
  /** RFQ code and title; the buyer's identity never goes with them */
  rfqCode?: string
  rfqId?: string
  /** payout_action: what happened to the payee's tax details or purchase document */
  step?:
    | 'profile_approved'
    | 'profile_rejected'
    | 'invoice_needed'
    | 'invoice_rejected'
    | 'invoice_approved'
  reason?: string | null
  payoutLink?: string
  /** store_order: what happened to an order from the seller's own shop */
  storeStep?:
    | 'needs_payment'
    | 'paid_from_wallet'
    | 'needs_mapping'
    | 'failed'
    | 'cancelled'
    | 'cancel_too_late'
    // Paket V (V6): shop prices and slow makers
    | 'price_loss'
    | 'price_thin'
    | 'price_updated'
    | 'waiting_for_maker'
  shopOrder?: string | null
  /** V6: the shop product (and material) a price note is about */
  productTitle?: string | null
}

export interface Rendered {
  title: string
  body: string
  /** App-relative path; the e-mail job prefixes APP_URL. */
  link: string
}

export const money = (minor: number | undefined, currency = 'TRY') =>
  minor === undefined ? '' : `${(minor / 100).toFixed(2)} ${currency}`

export const orderLink: Record<NotificationRole, (c: NotificationContext) => string> = {
  buyer: (c) => `/orders/${c.orderId}`,
  seller: () => '/seller/orders',
  maker: () => '/maker/work',
  admin: (c) => (c.disputeId ? `/admin/disputes/${c.disputeId}` : '/admin'),
}

export type Template = (role: NotificationRole, c: NotificationContext) => Rendered | null

const TEMPLATES: Record<NotificationType, Template> = {
  welcome: (role, c) =>
    role === 'buyer' || role === 'seller'
      ? {
          title: 'Welcome to Fabrmatch',
          body: 'Verify your e-mail, then upload a model to see a price, or list a product from the catalog. Your payments are always held until delivery.',
          link: c.orderId ? `/orders/${c.orderId}` : '/files',
        }
      : null,

  payment_reminder: (role, c) =>
    role === 'buyer'
      ? {
          title: `Finish paying for ${c.code}`,
          body: 'Your order is waiting for payment. Nothing is printed until it is paid, and your money stays held until you confirm delivery.',
          link: orderLink.buyer(c),
        }
      : null,

  review_request: (role, c) =>
    role === 'buyer'
      ? {
          title: `How did ${c.code} turn out?`,
          body: 'Confirm the delivery and rate the print. It takes a minute and helps the next buyer. If something is wrong, open a dispute from the order page.',
          link: orderLink.buyer(c),
        }
      : null,

  capacity_idle: (role) =>
    role === 'maker'
      ? {
          title: 'Your printers have no free hours listed',
          body: 'Offers only reach you when a printer has free capacity in the coming week. Open your capacity calendar and add hours.',
          link: '/maker/capacity',
        }
      : null,

  rfq_invited: (role, c) =>
    role === 'maker'
      ? {
          title: 'You are invited to bid',
          body: `A buyer asks for offers on ${c.rfqCode}. Bid before the deadline to be considered.`,
          link: `/maker/rfqs/${c.rfqId}`,
        }
      : null,

  rfq_bid_received: (role, c) =>
    role === 'buyer'
      ? {
          title: `New offer on ${c.rfqCode}`,
          body: 'A maker sent an offer. Compare all offers and pick a winner when you are ready.',
          link: `/rfqs/${c.rfqId}`,
        }
      : null,

  rfq_awarded: (role, c) =>
    role === 'maker'
      ? {
          title: `Your offer on ${c.rfqCode} was chosen`,
          body: 'The buyer will pay now. After that you get the job to accept and start.',
          link: `/maker/rfqs/${c.rfqId}`,
        }
      : null,

  message_received: (role, c) =>
    role === 'buyer'
      ? {
          title: `New message about ${c.code}`,
          body: 'Your maker wrote to you about this order.',
          link: `/orders/${c.orderId}/messages`,
        }
      : role === 'maker'
        ? {
            title: `New message about ${c.code}`,
            body: 'The buyer wrote to you about this job.',
            link: `/maker/orders/${c.orderId}/messages`,
          }
        : null,

  payment_received: (role, c) =>
    role === 'buyer'
      ? {
          title: `Payment received for ${c.code}`,
          body: 'Your payment is held safely. We are now looking for the best maker for your order.',
          link: orderLink.buyer(c),
        }
      : null,

  offer_received: (role, c) =>
    role === 'maker'
      ? {
          title: 'New production offer',
          body: `A print job matching your printers and materials is waiting${
            c.alias ? `, ${c.alias}` : ''
          }. It expires in ${c.ttlMinutes ?? 30} minutes, then goes to the next maker.`,
          link: orderLink.maker(c),
        }
      : null,

  order_unmatched: (role, c) =>
    role === 'buyer'
      ? {
          title: `${c.code}: we are still looking for a maker`,
          body: 'No maker could take your order yet. Our team is looking into it. If nobody accepts, you are refunded in full automatically.',
          link: orderLink.buyer(c),
        }
      : null,

  order_in_production: (role, c) =>
    role === 'buyer' || role === 'seller'
      ? {
          title: `${c.code} is in production`,
          body: 'A verified maker accepted your order and is printing it.',
          link: orderLink[role](c),
        }
      : null,

  order_shipped: (role, c) =>
    role === 'buyer'
      ? {
          title: `${c.code} is on its way`,
          body: c.trackingNumber
            ? `Shipped with ${c.carrier ?? 'the carrier'}. Tracking number: ${c.trackingNumber}.`
            : 'Your order has been shipped.',
          link: orderLink.buyer(c),
        }
      : role === 'seller'
        ? {
            title: `${c.code} has shipped`,
            body: 'The order is on its way to the buyer.',
            link: orderLink.seller(c),
          }
        : null,

  order_delivered: (role, c) =>
    role === 'buyer'
      ? {
          title: `${c.code} was delivered`,
          body: 'Check your parts. You have 7 days to confirm or report a problem; after that payment is released.',
          link: orderLink.buyer(c),
        }
      : role === 'maker'
        ? {
            title: `${c.code} was delivered`,
            body: 'Delivery is confirmed. Your payout follows when the order is completed.',
            link: orderLink.maker(c),
          }
        : null,

  order_completed: (role, c) =>
    role === 'maker' || role === 'seller'
      ? {
          title: `${c.code} is completed`,
          body: 'The order is complete. Your payout is being released.',
          link: orderLink[role](c),
        }
      : null,

  order_cancelled: (role, c) =>
    role === 'buyer'
      ? {
          title: `${c.code} was cancelled`,
          body: 'The order was cancelled. Any payment is refunded in full.',
          link: orderLink.buyer(c),
        }
      : null,

  refund_issued: (role, c) =>
    role === 'buyer'
      ? {
          title: `Refund of ${money(c.amountMinor, c.currency)} sent`,
          body: `Refund for ${c.code} was sent to your original payment method. Your bank may take a few days to show it.`,
          link: orderLink.buyer(c),
        }
      : null,

  payout_paid: (role, c) =>
    role === 'maker' || role === 'seller'
      ? {
          title: `Payout of ${money(c.amountMinor, c.currency)} paid`,
          body: `Your payout for ${c.code} was released.`,
          link: orderLink[role](c),
        }
      : null,

  payout_action: (role, c) => {
    if (role !== 'maker' && role !== 'seller') return null
    const link = c.payoutLink ?? (role === 'maker' ? '/maker/payout' : '/seller/payout')
    switch (c.step) {
      case 'profile_approved':
        return { title: 'Payout details approved', body: 'Your payouts can now be released.', link }
      case 'profile_rejected':
        return {
          title: 'Payout details need a fix',
          body: `An admin could not approve your tax and bank details: ${c.reason ?? ''}`.trim(),
          link,
        }
      case 'invoice_needed':
        return {
          title: `Invoice Fabrmatch for ${c.code}`,
          body: `Upload your invoice of ${money(c.amountMinor, c.currency)} to get paid.`,
          link,
        }
      case 'invoice_rejected':
        return {
          title: `Invoice for ${c.code} was not accepted`,
          body: `${c.reason ?? ''} Upload a corrected invoice.`.trim(),
          link,
        }
      case 'invoice_approved':
        return {
          title: `Invoice for ${c.code} approved`,
          body: 'Your payout is queued for the next bank transfer.',
          link,
        }
      default:
        return { title: 'Payout update', body: 'Open your payouts page for the details.', link }
    }
  },

  store_order: (role, c) => {
    if (role !== 'seller') return null
    const shopOrder = c.shopOrder ?? 'An order'
    const toOrder = c.orderId ? `/orders/${c.orderId}` : '/seller/stores'
    switch (c.storeStep) {
      case 'needs_payment':
        return {
          title: `${shopOrder} from your shop is ready to pay`,
          body: `Pay ${money(c.amountMinor, c.currency)} for ${c.code} and we start printing. With enough balance in your wallet this happens by itself.`,
          link: toOrder,
        }
      case 'paid_from_wallet':
        return {
          title: `${shopOrder} from your shop is paid and on its way to a maker`,
          body: `${money(c.amountMinor, c.currency)} for ${c.code} came from your balance.`,
          link: toOrder,
        }
      case 'needs_mapping':
        return {
          title: `${shopOrder} needs a product link`,
          body: 'Link the item to one of your products and the order goes through.',
          link: '/seller/stores',
        }
      case 'failed':
        return {
          title: `${shopOrder} could not be placed`,
          body: c.reason ?? 'Open your shops page for the details.',
          link: '/seller/stores',
        }
      case 'cancelled':
        return {
          title: `${shopOrder} was cancelled in your shop`,
          body: `We cancelled ${c.code ?? 'the order'} too; anything you paid is refunded.`,
          link: toOrder,
        }
      case 'price_loss':
        return {
          title: `${c.productTitle ?? 'A product'} now sells below cost in ${shopOrder}`,
          body: `Production costs more than the shop price now. Raise it to about ${money(c.amountMinor, c.currency)}, or let us keep your prices up to date.`,
          link: '/seller/stores',
        }
      case 'price_thin':
        return {
          title: `Your margin on ${c.productTitle ?? 'a product'} got thin in ${shopOrder}`,
          body: `Production costs went up. The price for your margin is about ${money(c.amountMinor, c.currency)}.`,
          link: '/seller/stores',
        }
      case 'price_updated':
        return {
          title: `Prices updated in ${shopOrder}`,
          body: `${c.productTitle ?? 'A product'} has a new price that keeps your margin, as you asked.`,
          link: '/seller/stores',
        }
      case 'waiting_for_maker':
        return {
          title: `${c.code ?? 'An order'} from ${shopOrder} is still waiting for a maker`,
          body: 'We are finding someone to print it. Your customer may ask; you can tell them it is on the way to production.',
          link: toOrder,
        }
      case 'cancel_too_late':
        return {
          title: `${shopOrder} was cancelled, but printing has started`,
          body: `${c.code ?? 'The order'} is already in production and will still ship to your customer.`,
          link: toOrder,
        }
      default:
        return {
          title: `Update on ${shopOrder}`,
          body: 'Open your shops page for the details.',
          link: '/seller/stores',
        }
    }
  },

  dispute_opened: (role, c) =>
    role === 'maker'
      ? {
          title: `Dispute opened on ${c.code}`,
          body: 'The buyer reported a problem. Payment is on hold. Please add your response.',
          link: orderLink.maker(c),
        }
      : role === 'seller'
        ? {
            title: `Dispute opened on ${c.code}`,
            body: 'A problem was reported on this order. Payment is on hold until it is resolved.',
            link: orderLink.seller(c),
          }
        : role === 'admin'
          ? {
              title: `New dispute on ${c.code}`,
              body: 'A buyer opened a dispute. A decision is needed.',
              link: orderLink.admin(c),
            }
          : null,

  dispute_responded: (role, c) =>
    role === 'buyer'
      ? {
          title: `The maker responded on ${c.code}`,
          body: 'Open your order to read the response and add photos if needed.',
          link: orderLink.buyer(c),
        }
      : role === 'admin'
        ? {
            title: `Response received on ${c.code}`,
            body: 'The maker answered the dispute. Ready for a decision.',
            link: orderLink.admin(c),
          }
        : null,

  dispute_resolved: (role, c) => {
    const decision = (c.resolution ?? 'resolved').replaceAll('_', ' ')
    if (role === 'buyer') {
      return {
        title: `Dispute on ${c.code} resolved: ${decision}`,
        body:
          c.amountMinor && c.amountMinor > 0
            ? `${money(c.amountMinor, c.currency)} is being refunded to you.`
            : 'The decision is final for this order.',
        link: orderLink.buyer(c),
      }
    }
    if (role === 'maker' || role === 'seller') {
      return {
        title: `Dispute on ${c.code} resolved: ${decision}`,
        body: 'The dispute is closed. Payout follows the decision.',
        link: orderLink[role](c),
      }
    }
    return null
  },
}

export function render(
  type: NotificationType,
  role: NotificationRole,
  context: NotificationContext,
  locale: Locale = 'en'
): Rendered | null {
  const templates = locale === 'tr' ? TEMPLATES_TR : TEMPLATES
  return templates[type](role, context)
}
