import db from '@adonisjs/lucid/services/db'
import LedgerService from '#services/payments/ledger_service'
import SellerProfile from '#models/seller_profile'

export interface WalletMovement {
  at: string
  kind: 'top_up' | 'order' | 'refund'
  amountMinor: number
  orderCode: string | null
  orderId: number | null
}

/** Read side of the seller wallet (R4-T2). Money moves only through PaymentService. */
export default class WalletService {
  private ledger = new LedgerService()

  async balance(userId: number) {
    return this.ledger.balance('seller_wallet', { walletUserId: userId, currency: 'TRY' })
  }

  /** The seller's own movements, newest first: in (top-up, refund) positive, out negative. */
  async movements(userId: number, limit = 50): Promise<WalletMovement[]> {
    const rows = await db
      .from('ledger_entries as l')
      .leftJoin('orders as o', 'o.id', 'l.order_id')
      .where('l.account', 'seller_wallet')
      .where('l.wallet_user_id', userId)
      .orderBy('l.id', 'desc')
      .limit(limit)
      .select(
        'l.created_at',
        'l.direction',
        'l.amount_minor',
        'l.memo',
        'o.code',
        'o.id as order_id'
      )
    return rows.map((r) => ({
      at: new Date(r.created_at).toISOString(),
      kind:
        r.direction === 'debit'
          ? 'order'
          : String(r.memo ?? '').startsWith('refund')
            ? 'refund'
            : 'top_up',
      amountMinor: r.direction === 'debit' ? -Number(r.amount_minor) : Number(r.amount_minor),
      orderCode: r.code ?? null,
      orderId: r.order_id ?? null,
    }))
  }

  async autoPay(userId: number) {
    const profile = await SellerProfile.query().where('userId', userId).first()
    return profile?.walletAutoPay ?? false
  }

  async setAutoPay(userId: number, on: boolean) {
    await SellerProfile.query().where('userId', userId).update({ wallet_auto_pay: on })
  }
}
