import { randomUUID } from 'node:crypto'
import redis from '@adonisjs/redis/services/main'
import User from '#models/user'
import ModelFile from '#models/model_file'
import ManufacturerProfile from '#models/manufacturer_profile'
import Printer from '#models/printer'
import type { PrinterTechnology } from '#models/printer'
import PrinterMaterial from '#models/printer_material'
import CapacitySlot from '#models/capacity_slot'
import Order from '#models/order'
import MatchOffer from '#models/match_offer'
import Payment from '#models/payment'
import CatalogProduct from '#models/catalog_product'
import SellerProduct from '#models/seller_product'
import OnboardingService from '#services/identity/onboarding_service'
import Dispute from '#models/dispute'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { DEFAULT_COLORS, DEFAULT_MATERIALS } from '#services/catalog/reference_defaults'
import PrintProfileService from '#services/catalog/print_profile_service'
import { DEFAULT_FINISHINGS } from '#services/catalog/finishing_defaults'
import { DEFAULT_PRINT_PROFILES } from '#services/catalog/print_profile_defaults'
import { DEFAULT_SHIPPING_ZONES } from '#services/shipping/shipping_defaults'
import testUtils from '@adonisjs/core/services/test_utils'
import OrderService from '#services/orders/order_service'
import OrderStateMachine from '#services/orders/order_state_machine'
import PaymentService from '#services/payments/payment_service'
import type FakePaymentProvider from '#services/payments/fake_provider'
import ProductionJob from '#models/production_job'
import JobQcPhoto from '#models/job_qc_photo'
import type { CreateDraftInput } from '#services/orders/order_service'

function uid() {
  return randomUUID().slice(0, 8)
}

export async function createUser(prefix = 'user', options: { verified?: boolean } = {}) {
  return User.create({
    fullName: `${prefix} test`,
    email: `${prefix}-${uid()}@test.com`,
    password: 'password123',
    emailVerifiedAt: options.verified === false ? null : DateTime.now(),
  })
}

export async function createManufacturer(
  overrides: Partial<{ trustTier: number; country: string; city: string; status: 'active' }> = {}
) {
  const user = await createUser('maker')
  const profile = await ManufacturerProfile.create({
    userId: user.id,
    publicAlias: `FM-${uid().toUpperCase().slice(0, 8)}`,
    country: overrides.country ?? 'TR',
    city: overrides.city ?? 'Istanbul',
    isCorporate: false,
    status: overrides.status ?? 'active',
    trustTier: overrides.trustTier ?? 0,
  })
  return { user, profile }
}

export async function createPrinter(
  profile: ManufacturerProfile,
  opts: Partial<{
    technology: PrinterTechnology
    build: [number, number, number]
    material: string
    colors: string[]
    isActive: boolean
    slotMinutes: number
    slotDate: string
  }> = {}
) {
  const [x, y, z] = opts.build ?? [220, 220, 250]
  const printer = await Printer.create({
    manufacturerProfileId: profile.id,
    name: `Printer ${uid()}`,
    technology: opts.technology ?? 'FDM',
    buildVolumeXMm: x,
    buildVolumeYMm: y,
    buildVolumeZMm: z,
    isActive: opts.isActive ?? true,
  })
  await new PrintProfileService().offerAllFor(printer.id, printer.technology)
  await PrinterMaterial.create({
    printerId: printer.id,
    material: opts.material ?? 'PLA',
    colors: opts.colors ?? ['black', 'white'],
    pricePerGramMinor: 50,
    currency: 'TRY',
  })
  if (opts.slotMinutes !== 0) {
    await CapacitySlot.create({
      printerId: printer.id,
      date: opts.slotDate ?? DateTime.now().plus({ days: 1 }).toISODate()!,
      maxMinutes: opts.slotMinutes ?? 600,
      reservedMinutes: 0,
    })
  }
  return printer
}

export async function createAnalyzedFile(owner: User, volumeMm3 = 8000) {
  return ModelFile.create({
    ownerId: owner.id,
    storageKey: `models/${uid()}.stl`,
    originalName: 'cube.stl',
    format: 'STL',
    sizeBytes: 1024,
    sha256: randomUUID().replaceAll('-', '').padEnd(64, '0'),
    analysisStatus: 'done',
    volumeMm3,
    bboxXMm: 20,
    bboxYMm: 20,
    bboxZMm: 20,
    triangleCount: 12,
    isPrintable: true,
  })
}

export async function createDraftOrder(
  buyer?: User,
  overrides: Partial<Omit<CreateDraftInput, 'modelFileId'>> = {}
) {
  const owner = buyer ?? (await createUser('buyer'))
  const file = await createAnalyzedFile(owner)
  const order = await new OrderService().createDraft(owner, {
    modelFileId: file.id,
    material: 'PLA',
    quantity: 1,
    shippingAddress: {
      fullName: 'Ali Veli',
      line1: 'Test Sk. No:1',
      city: 'Istanbul',
      postalCode: '34000',
      country: 'TR',
      phone: '+905551112233',
    },
    ...overrides,
  })
  return { buyer: owner, file, order }
}

export async function orderStatus(orderId: number) {
  const order = await Order.findOrFail(orderId)
  return order.status
}

export async function offerStatus(offerId: number) {
  const offer = await MatchOffer.findOrFail(offerId)
  return offer.status
}

export function idsOf(candidates: Array<{ manufacturerProfileId: number }>) {
  return candidates.map((c) => c.manufacturerProfileId)
}

/**
 * Buyer-funded order walked through the real state machine up to `upTo`, with a production job
 * for a fresh manufacturer. Payment goes through PaymentService + the fake provider.
 */
export async function createFundedOrder(
  provider: FakePaymentProvider,
  options: {
    upTo?: 'paid' | 'in_production' | 'shipped' | 'delivered' | 'completed'
    seller?: User
    quantity?: number
    currency?: string
    couponCode?: string
  } = {}
) {
  const upTo = options.upTo ?? 'completed'
  const { order, buyer } = await createDraftOrder(undefined, {
    quantity: options.quantity ?? 2,
    sellerId: options.seller?.id,
    sellerMarginBps: options.seller ? 2000 : 0,
    currency: options.currency,
    couponCode: options.couponCode,
  })
  const service = new PaymentService(provider, async () => {})
  await service.simulateSuccess(order.id, buyer.id)

  const { user: makerUser, profile } = await createManufacturer()
  const printer = await createPrinter(profile)
  const sm = new OrderStateMachine()
  const steps = ['matching', 'in_production', 'shipped', 'delivered', 'completed'] as const
  const stopAt = upTo === 'paid' ? -1 : steps.indexOf(upTo)

  if (stopAt >= 1) {
    await ProductionJob.create({
      orderId: order.id,
      manufacturerProfileId: profile.id,
      printerId: printer.id,
      status: 'accepted',
      acceptedAt: DateTime.now(),
      dueAt: DateTime.now().plus({ days: 5 }),
    })
  }
  for (let i = 0; i <= stopAt; i++) await sm.transition(order.id, steps[i], { actorId: buyer.id })

  return {
    order: await Order.findOrFail(order.id),
    buyer,
    makerUser,
    profile,
    seller: options.seller,
  }
}

export async function paymentStatus(paymentId: number) {
  const payment = await Payment.findOrFail(paymentId)
  return payment.status
}

export async function orderPaymentStatus(orderId: number) {
  const payment = await Payment.query().where('orderId', orderId).firstOrFail()
  return payment.status
}

export async function disputeStatus(disputeId: number) {
  const dispute = await Dispute.findOrFail(disputeId)
  return dispute.status
}

export async function disputeResponse(disputeId: number) {
  const dispute = await Dispute.findOrFail(disputeId)
  return dispute.manufacturerResponse
}

/** Active storefront product: admin-owned analyzed model + catalog entry + seller listing. */
export async function createStorefrontProduct(
  options: Partial<{
    title: string
    description: string
    materials: string[]
    marginBps: number
    productStatus: 'draft' | 'active' | 'archived'
    catalogActive: boolean
    withModel: boolean
    analyzed: boolean
    volumeMm3: number
  }> = {}
) {
  const admin = await createUser('admin')
  const sellerUser = await createUser('shopseller')
  const seller = await new OnboardingService().createSellerProfile(sellerUser, {
    businessName: 'Shop Co',
    isCorporate: false,
  })

  let modelFileId: number | null = null
  if (options.withModel !== false) {
    const file = await createAnalyzedFile(admin, options.volumeMm3 ?? 8000)
    if (options.analyzed === false) {
      file.analysisStatus = 'pending'
      await file.save()
    }
    modelFileId = file.id
  }

  const catalog = await CatalogProduct.create({
    title: options.title ?? 'Desk Organizer',
    slug: `desk-organizer-${uid()}`,
    description: options.description ?? 'A neat organizer for pens and cables',
    allowedMaterials: options.materials ?? ['PLA', 'PETG'],
    isActive: options.catalogActive ?? true,
    modelFileId,
  })
  const product = await SellerProduct.create({
    sellerProfileId: seller.id,
    catalogProductId: catalog.id,
    title: options.title ?? 'Desk Organizer',
    description: options.description ?? 'A neat organizer for pens and cables',
    currency: 'TRY',
    marginBps: options.marginBps ?? 2000,
    status: options.productStatus ?? 'active',
  })
  return { product, catalog, seller, sellerUser, admin }
}

export const TR_ADDRESS = {
  fullName: 'Ali Veli',
  line1: 'Test Sk. No:1',
  city: 'Istanbul',
  postalCode: '34000',
  country: 'TR',
}

/** Seeded reference data (materials, colours, shipping rates); idempotent. */
export async function ensureReferenceCatalog() {
  for (const [code, name, technology] of DEFAULT_MATERIALS) {
    await db.rawQuery(
      `insert into materials (code, name, technology, created_at) values (?, ?, ?, now()) on conflict (code) do nothing`,
      [code, name, technology]
    )
  }
  for (const [name, hex] of DEFAULT_COLORS) {
    await db.rawQuery(
      `insert into colors (name, hex, created_at) values (?, ?, now()) on conflict do nothing`,
      [name, hex]
    )
  }
  await db.rawQuery(
    `insert into tax_rates (country, name, rate_bps, created_at) values ('TR', 'KDV', 2000, now()) on conflict (country) do nothing`
  )
  for (const p of DEFAULT_PRINT_PROFILES) {
    await db.rawQuery(
      `insert into print_profiles (code, name, technology, layer_height_micron, infill_percent, time_factor_bps, post_process, created_at)
       values (?, ?, ?, ?, ?, ?, ?, now()) on conflict (code) do nothing`,
      [
        p.code,
        p.name,
        p.technology,
        p.layerHeightMicron,
        p.infillPercent,
        p.timeFactorBps,
        p.postProcess,
      ]
    )
  }
  for (const [
    code,
    name,
    description,
    priceMinor,
    materials,
    extraDays,
    needsColour,
  ] of DEFAULT_FINISHINGS) {
    await db.rawQuery(
      `insert into finishing_options (code, name, description, price_minor, materials, extra_days, needs_colour, created_at)
       values (?, ?, ?, ?, nullif(?, '')::jsonb, ?, ?, now()) on conflict (code) do nothing`,
      [
        code,
        name,
        description,
        priceMinor,
        materials ? JSON.stringify(materials) : '',
        extraDays,
        needsColour ?? false,
      ]
    )
  }
  for (const zone of DEFAULT_SHIPPING_ZONES) {
    await db.rawQuery(
      `insert into shipping_zones (code, name, countries, is_fallback, extra_per_kg_minor, created_at)
       values (?, ?, ?::jsonb, ?, ?, now()) on conflict (code) do nothing`,
      [zone.code, zone.name, JSON.stringify(zone.countries), zone.isFallback, zone.extraPerKgMinor]
    )
    for (const [upToGrams, priceMinor] of zone.tiers) {
      await db.rawQuery(
        `insert into shipping_rates (zone_id, up_to_grams, price_minor, created_at)
         select id, ?, ?, now() from shipping_zones where code = ?
         on conflict (zone_id, up_to_grams) do nothing`,
        [upToGrams, priceMinor, zone.code]
      )
    }
  }
}

/**
 * Truncates every table (for tests on real connections) and restores the reference data. Login
 * rate-limit counters are cleared too: every browser test signs in from the same address, so
 * without this the suite trips the per-IP login limit once it has enough of them.
 */
export async function resetDatabase() {
  const cleanup = await testUtils.db().truncate()
  const throttled = await redis.keys('rlflx:login:*')
  if (throttled.length > 0) await redis.del(...throttled)
  await ensureReferenceCatalog()
  return async () => {
    await cleanup()
    await ensureReferenceCatalog()
  }
}

/** Every job needs a quality-check photo before it may ship. */
export async function addQcPhoto(jobId: number) {
  return JobQcPhoto.create({
    productionJobId: jobId,
    storageKey: `qc/${jobId}/${randomUUID()}.jpg`,
  })
}
