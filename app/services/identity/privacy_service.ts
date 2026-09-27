import DomainError from '#exceptions/domain_error'
import { randomBytes } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import hash from '@adonisjs/core/services/hash'
import drive from '@adonisjs/drive/services/main'
import PayeeTaxProfile from '#models/payee_tax_profile'
import LedgerService from '#services/payments/ledger_service'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import AuditLog from '#models/audit_log'
import Consent from '#models/consent'
import ManufacturerProfile from '#models/manufacturer_profile'
import ModelFile from '#models/model_file'
import Order from '#models/order'
import SellerProfile from '#models/seller_profile'
import type User from '#models/user'
import EncryptionService from '#services/identity/encryption_service'
import RoleService from '#services/identity/role_service'
import UserSessionService from '#services/identity/user_session_service'

export class PrivacyError extends DomainError {}

/** Order states after which nothing more can happen to the money or the goods. */
const SETTLED = ['completed', 'cancelled', 'resolved']

export type ConsentKind = 'terms' | 'privacy' | 'marketing_email'

export default class PrivacyService {
  private encryption = new EncryptionService()

  async recordConsent(userId: number, kind: ConsentKind, version: string, granted: boolean) {
    await Consent.create({ userId, kind, version, granted })
  }

  /** Latest answer per kind. */
  async currentConsents(userId: number) {
    const rows = await Consent.query().where('userId', userId).orderBy('id', 'desc')
    const latest = new Map<string, Consent>()
    for (const r of rows) if (!latest.has(r.kind)) latest.set(r.kind, r)
    return [...latest.values()].map((c) => ({
      kind: c.kind,
      version: c.version,
      granted: c.granted,
      at: c.createdAt.toISO(),
    }))
  }

  /**
   * Everything we hold about this person, in a form they can read. It deliberately leaves out other
   * people: no buyer address in a maker's export, no maker identity in a buyer's (business rule 1).
   */
  async export(user: User) {
    const roles = await new RoleService().getUserRoles(user)
    const seller = await SellerProfile.findBy('userId', user.id)
    const maker = await ManufacturerProfile.findBy('userId', user.id)

    const orders = await Order.query()
      .where('buyerId', user.id)
      .preload('items')
      .orderBy('id', 'asc')
    const jobs = maker
      ? await db
          .from('production_jobs as pj')
          .join('orders as o', 'o.id', 'pj.order_id')
          .where('pj.manufacturer_profile_id', maker.id)
          .select('o.code', 'pj.status', 'pj.accepted_at', 'pj.due_at', 'pj.shipped_at')
      : []
    const payouts = await db
      .from('payouts')
      .where((q) => {
        q.where('beneficiary_type', 'seller').where('beneficiary_id', user.id)
        if (maker)
          q.orWhere((m) =>
            m.where('beneficiary_type', 'manufacturer').where('beneficiary_id', maker.id)
          )
      })
      .select('amount_minor', 'currency', 'status', 'paid_at')
    const files = await ModelFile.query().where('ownerId', user.id)
    const notifications = await db
      .from('notifications')
      .where('user_id', user.id)
      .select('type', 'title', 'body', 'created_at', 'read_at')
    const messages = await db
      .from('order_messages')
      .where('sender_id', user.id)
      .select('order_id', 'sender_role', 'body', 'original_enc', 'created_at')
    const sessions = await new UserSessionService().list(user.id)
    const leads = await db.from('leads').whereRaw('lower(email) = ?', [user.email.toLowerCase()])

    const { default: OrderService } = await import('#services/orders/order_service')
    const orderService = new OrderService()
    const payeeProfiles = await PayeeTaxProfile.query().where('userId', user.id)
    return {
      exportedAt: DateTime.now().toISO(),
      account: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        createdAt: user.createdAt.toISO(),
        emailVerified: !!user.emailVerifiedAt,
        twoFactorEnabled: !!user.twoFactorEnabledAt,
        roles,
        firstTouch: user.firstTouchSource
          ? {
              source: user.firstTouchSource,
              medium: user.firstTouchMedium,
              campaign: user.firstTouchCampaign,
            }
          : null,
      },
      sellerProfile: seller
        ? {
            businessName: seller.businessName,
            taxId: seller.taxIdEnc ? this.encryption.decrypt(seller.taxIdEnc) : null,
            isCorporate: seller.isCorporate,
          }
        : null,
      makerProfile: maker
        ? {
            publicAlias: maker.publicAlias,
            city: maker.city,
            country: maker.country,
            iban: maker.ibanEnc ? this.encryption.decrypt(maker.ibanEnc) : null,
            taxId: maker.taxIdEnc ? this.encryption.decrypt(maker.taxIdEnc) : null,
            trustTier: maker.trustTier,
          }
        : null,
      // tax and bank details given for payouts (R7); kept after deletion for the legal retention period
      payoutDetails: payeeProfiles.map((p) => ({
        role: p.beneficiaryType,
        taxStatus: p.taxStatus,
        legalName: p.legalName,
        taxNumber: this.encryption.decrypt(p.taxNumberEnc),
        taxOffice: p.taxOffice,
        address: this.encryption.decrypt(p.addressEnc),
        iban: this.encryption.decrypt(p.ibanEnc),
        status: p.status,
        submittedAt: p.submittedAt.toISO(),
      })),
      ordersPlaced: orders.map((o) => ({
        code: o.code,
        status: o.status,
        totalMinor: o.totalMinor,
        currency: o.currency,
        createdAt: o.createdAt.toISO(),
        shippingAddress: orderService.decryptShippingAddress(o),
        items: o.items.map((i) => ({ material: i.material, quantity: i.quantity })),
      })),
      jobsProduced: jobs.map((j) => ({
        orderCode: j.code,
        status: j.status,
        acceptedAt: j.accepted_at,
        dueAt: j.due_at,
        shippedAt: j.shipped_at,
      })),
      payouts,
      uploadedFiles: files.map((f) => ({
        name: f.originalName,
        format: f.format,
        sizeBytes: f.sizeBytes,
      })),
      messagesWritten: messages.map((m) => ({
        orderId: m.order_id,
        as: m.sender_role,
        text: m.original_enc ? this.encryption.decrypt(m.original_enc) : m.body,
        at: m.created_at,
      })),
      notifications,
      consents: await this.currentConsents(user.id),
      activeSessions: sessions.map((s) => ({
        device: s.device,
        ip: s.ipAddress,
        lastSeenAt: s.lastSeenAt,
      })),
      waitlistEntries: leads.map((l) => ({
        interest: l.interest,
        city: l.city,
        consentAt: l.consent_at,
      })),
    }
  }

  /** What still ties this account to money or goods in motion. */
  async deletionBlockers(user: User): Promise<string[]> {
    const blockers: string[] = []
    const open = await Order.query()
      .where('buyerId', user.id)
      .whereNotIn('status', [...SETTLED, 'draft'])
      .count('* as n')
      .first()
    if (Number(open?.$extras.n ?? 0) > 0)
      blockers.push('You have orders that are not finished yet.')

    const maker = await ManufacturerProfile.findBy('userId', user.id)
    if (maker) {
      const jobs = await db
        .from('production_jobs')
        .where('manufacturer_profile_id', maker.id)
        .whereIn('status', ['accepted', 'printing', 'produced', 'shipped'])
        .count('* as n')
        .first()
      if (Number(jobs?.n ?? 0) > 0) blockers.push('You have print jobs in progress.')
    }
    const sellerOrders = await Order.query()
      .where('sellerId', user.id)
      .whereNotIn('status', [...SETTLED, 'draft'])
      .count('* as n')
      .first()
    if (Number(sellerOrders?.$extras.n ?? 0) > 0)
      blockers.push('Some of your shop’s orders are not finished yet.')

    const pending = await db
      .from('payouts')
      // waiting for the invoice counts too: the money is still owed (R7)
      .whereIn('status', ['pending', 'awaiting_document'])
      .where((q) => {
        q.where((s) => s.where('beneficiary_type', 'seller').where('beneficiary_id', user.id))
        if (maker)
          q.orWhere((m) =>
            m.where('beneficiary_type', 'manufacturer').where('beneficiary_id', maker.id)
          )
      })
      .count('* as n')
      .first()
    if (Number(pending?.n ?? 0) > 0)
      blockers.push('You have a payout that has not been paid out yet.')

    const wallet = await new LedgerService().balance('seller_wallet', {
      walletUserId: user.id,
      currency: 'TRY',
    })
    if (wallet > 0) blockers.push('Refund your wallet balance to your card first.')
    return blockers
  }

  /**
   * Removes the person, keeps the books. Ledger, audit trail and order records stay (money and
   * fraud history must survive) but lose every personal field. Refused while anything is in flight.
   */
  async deleteAccount(user: User, password: string) {
    if (!(await hash.verify(user.password, password)))
      throw new PrivacyError('Password is not correct')
    const blockers = await this.deletionBlockers(user)
    if (blockers.length > 0) throw new PrivacyError(blockers.join(' '))

    const files = await ModelFile.query().where('ownerId', user.id)
    const email = user.email

    await db.transaction(async (trx) => {
      const anon = `deleted-${user.id}-${randomBytes(4).toString('hex')}@deleted.invalid`
      await trx
        .from('users')
        .where('id', user.id)
        .update({
          email: anon,
          full_name: null,
          password: await hash.make(randomBytes(24).toString('hex')),
          two_factor_secret_enc: null,
          two_factor_enabled_at: null,
          two_factor_last_step: null,
          first_touch_source: null,
          first_touch_medium: null,
          first_touch_campaign: null,
          suspended_at: DateTime.now().toSQL(),
          suspension_reason: 'Account deleted by the user',
          updated_at: new Date(),
        })
      await trx.from('two_factor_backup_codes').where('user_id', user.id).delete()
      await trx.from('verification_tokens').where('user_id', user.id).delete()
      await trx.from('notifications').where('user_id', user.id).delete()
      await trx.from('notification_preferences').where('user_id', user.id).delete()
      await trx.from('cart_items').where('user_id', user.id).delete()
      await trx.from('consents').where('user_id', user.id).delete()
      await trx.from('leads').whereRaw('lower(email) = ?', [email.toLowerCase()]).delete()
      await trx
        .from('user_sessions')
        .where('user_id', user.id)
        .whereNull('revoked_at')
        .update({ revoked_at: new Date() })

      await trx
        .from('seller_profiles')
        .where('user_id', user.id)
        .update({ business_name: 'Deleted seller', tax_id_enc: null, status: 'suspended' })
      await trx
        .from('manufacturer_profiles')
        .where('user_id', user.id)
        .update({ iban_enc: null, tax_id_enc: null, city: null, status: 'suspended' })
      await trx.from('orders').where('buyer_id', user.id).update({ shipping_address_enc: null })
      await trx
        .from('order_messages')
        .where('sender_id', user.id)
        .update({ body: '[message removed]', original_enc: null })
      await trx
        .from('model_files')
        .where('owner_id', user.id)
        .update({ original_name: 'deleted-file' })

      await AuditLog.create(
        {
          actorId: user.id,
          action: 'user.deleted',
          subjectType: 'user',
          subjectId: user.id,
          meta: {},
        },
        { client: trx }
      )
    })

    // storage last: a failure here leaves orphaned objects, never a half-deleted account
    for (const f of files) {
      try {
        await drive.use('s3').delete(f.storageKey)
      } catch (error) {
        logger.warn({
          msg: 'could not delete stored file',
          fileId: f.id,
          error: (error as Error).message,
        })
      }
    }
  }
}
