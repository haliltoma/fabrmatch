import MakerSetupService from '#services/manufacturing/maker_setup_service'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import Order from '#models/order'
import Dispute from '#models/dispute'
import User from '#models/user'
import MatchOffer from '#models/match_offer'
import ProductionJob from '#models/production_job'
import Printer from '#models/printer'
import SellerProduct from '#models/seller_product'
import type ManufacturerProfile from '#models/manufacturer_profile'
import type SellerProfile from '#models/seller_profile'
import AdminQueueService from '#services/admin/queue_service'
import LedgerService from '#services/payments/ledger_service'

const monthStart = () => DateTime.now().startOf('month').toSQL()!

/** Paid out this month, one figure per currency (currencies are never added together). */
async function paidOutThisMonth(type: 'manufacturer' | 'seller', beneficiaryId: number) {
  const rows = await db
    .from('payouts')
    .where('beneficiary_type', type)
    .where('beneficiary_id', beneficiaryId)
    .where('status', 'paid')
    .where('paid_at', '>=', monthStart())
    .groupBy('currency')
    .orderBy('currency')
    .select('currency')
    .sum('amount_minor as total')
  return rows.map((r) => ({ currency: r.currency as string, minor: Number(r.total) }))
}

/**
 * Numbers for the three panel home pages. Everything is real data and respects anonymity:
 * seller rows never carry manufacturer fields, maker rows never carry buyer fields.
 */
export default class DashboardService {
  async seller(userId: number, profile: SellerProfile) {
    const [orders, products, earned, recent] = await Promise.all([
      Order.query().where('sellerId', userId).count('* as n').first(),
      SellerProduct.query()
        .where('sellerProfileId', profile.id)
        .where('status', 'active')
        .count('* as n')
        .first(),
      paidOutThisMonth('seller', userId),
      Order.query()
        .where('sellerId', userId)
        .whereNot('status', 'draft')
        .orderBy('id', 'desc')
        .limit(5),
    ])
    return {
      ordersTotal: Number(orders?.$extras.n ?? 0),
      activeProducts: Number(products?.$extras.n ?? 0),
      earnedThisMonth: earned,
      profileStatus: profile.status,
      recentOrders: recent.map((o) => ({
        id: o.id,
        code: o.code,
        status: o.status,
        earnMinor: o.sellerShareMinor,
        currency: o.currency,
        createdAt: o.createdAt.toISO(),
      })),
    }
  }

  async maker(profile: ManufacturerProfile) {
    const [offers, machines, active, earned, recent] = await Promise.all([
      MatchOffer.query()
        .where('manufacturerProfileId', profile.id)
        .where('status', 'pending')
        .where('expiresAt', '>', DateTime.now().toSQL()!)
        .count('* as n')
        .first(),
      Printer.query()
        .where('manufacturerProfileId', profile.id)
        .where('isActive', true)
        .count('* as n')
        .first(),
      ProductionJob.query()
        .where('manufacturerProfileId', profile.id)
        .whereIn('status', ['accepted', 'printing', 'produced'])
        .count('* as n')
        .first(),
      paidOutThisMonth('manufacturer', profile.id),
      ProductionJob.query()
        .where('manufacturerProfileId', profile.id)
        .preload('order')
        .orderBy('id', 'desc')
        .limit(5),
    ])
    return {
      pendingOffers: Number(offers?.$extras.n ?? 0),
      activeMachines: Number(machines?.$extras.n ?? 0),
      activeJobs: Number(active?.$extras.n ?? 0),
      earnedThisMonth: earned,
      setup: await new MakerSetupService().forProfile(profile),
      trustTier: profile.trustTier,
      alias: profile.publicAlias,
      recentJobs: recent.map((j) => ({
        id: j.id,
        code: j.order.code,
        status: j.status,
        dueAt: j.dueAt.toISO(),
      })),
    }
  }

  async admin() {
    const [users, orders, disputes, recentOrders, recentUsers, fee, queues] = await Promise.all([
      User.query().count('* as n').first(),
      Order.query().whereNot('status', 'draft').count('* as n').first(),
      Dispute.query().whereNot('status', 'resolved').count('* as n').first(),
      Order.query().whereNot('status', 'draft').orderBy('id', 'desc').limit(6),
      User.query().orderBy('id', 'desc').limit(6),
      new LedgerService().balance('platform_fee'),
      new AdminQueueService().counts(),
    ])
    return {
      usersTotal: Number(users?.$extras.n ?? 0),
      ordersTotal: Number(orders?.$extras.n ?? 0),
      openDisputes: Number(disputes?.$extras.n ?? 0),
      platformFeeMinor: fee,
      queues,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        code: o.code,
        status: o.status,
        totalMinor: o.totalMinor,
        currency: o.currency,
        createdAt: o.createdAt.toISO(),
      })),
      recentUsers: recentUsers.map((u) => ({
        id: u.id,
        name: u.fullName,
        email: u.email,
        createdAt: u.createdAt.toISO(),
      })),
    }
  }
}
