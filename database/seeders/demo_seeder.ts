import { randomUUID } from 'node:crypto'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import User from '#models/user'
import ModelFile from '#models/model_file'
import CatalogProduct from '#models/catalog_product'
import SellerProduct from '#models/seller_product'
import CapacitySlot from '#models/capacity_slot'
import Printer from '#models/printer'
import PrinterMaterial from '#models/printer_material'
import MatchOffer from '#models/match_offer'
import RoleService from '#services/identity/role_service'
import OnboardingService from '#services/identity/onboarding_service'
import OrderService from '#services/orders/order_service'
import FulfillmentService from '#services/orders/fulfillment_service'
import MatchingService from '#services/matching/matching_service'
import PaymentService from '#services/payments/payment_service'
import PayoutService from '#services/payments/payout_service'
import DisputeService from '#services/disputes/dispute_service'
import { slugify } from '#services/storefront/storefront_service'
import drive from '@adonisjs/drive/services/main'
import ProductImageService from '#services/catalog/product_image_service'
import { analyzeStl } from '#services/files/stl_analyzer'
import { demoMeshFor } from './demo_meshes.js'

const ADDRESS = {
  fullName: 'Deniz Yılmaz',
  line1: 'Bahariye Cd. 12/4',
  district: 'Kadıköy',
  city: 'Istanbul',
  postalCode: '34710',
  country: 'TR',
}

const PRODUCTS = [
  {
    title: 'Desk Organizer',
    description: 'Modular tray for pens, cables and sticky notes.',
    volume: 42_000,
  },
  {
    title: 'Planter Pot',
    description: 'Self-watering planter with a drainage insert.',
    volume: 118_000,
  },
  {
    title: 'Headphone Stand',
    description: 'Weighted stand that keeps the cable tidy.',
    volume: 76_000,
  },
  { title: 'Cable Clip Set', description: 'Ten clips for desk edges up to 30 mm.', volume: 9_000 },
]

/** Local demo data so every panel and the shop have something real to show. Dev only. */
export default class DemoSeeder extends BaseSeeder {
  static environment = ['development']

  async run() {
    if (app.inProduction) return
    const roles = new RoleService()
    const onboarding = new OnboardingService()

    const admin = await User.firstOrCreate(
      { email: 'admin@fabrmatch.com' },
      {
        email: 'admin@fabrmatch.com',
        fullName: 'Fabrmatch Admin',
        password: 'admin12345',
        emailVerifiedAt: DateTime.now(),
      }
    )
    await roles.assignRole(admin, 'admin')

    const make = (email: string, fullName: string) =>
      User.firstOrCreate(
        { email },
        { email, fullName, password: 'password123', emailVerifiedAt: DateTime.now() }
      )

    const makerUser = await make('maker@demo.test', 'Mert Kaya')
    const sellerUser = await make('seller@demo.test', 'Selin Aydın')
    const buyerUser = await make('buyer@demo.test', 'Deniz Yılmaz')
    await roles.assignRole(buyerUser, 'seller')

    await makerUser.load('manufacturerProfile')
    const maker =
      makerUser.manufacturerProfile ??
      (await onboarding.createManufacturerProfile(makerUser, {
        city: 'Istanbul',
        country: 'TR',
        isCorporate: false,
      }))
    maker.status = 'active'
    await maker.save()

    await sellerUser.load('sellerProfile')
    const seller =
      sellerUser.sellerProfile ??
      (await onboarding.createSellerProfile(sellerUser, {
        businessName: 'Aydın Design',
        isCorporate: false,
      }))
    seller.status = 'active'
    await seller.save()

    let printer = await Printer.query().where('manufacturerProfileId', maker.id).first()
    if (!printer) {
      printer = await Printer.create({
        manufacturerProfileId: maker.id,
        name: 'Prusa MK4 #1',
        technology: 'FDM',
        buildVolumeXMm: 250,
        buildVolumeYMm: 210,
        buildVolumeZMm: 220,
        isActive: true,
      })
      for (const material of ['PLA', 'PETG']) {
        await PrinterMaterial.create({
          printerId: printer.id,
          material,
          colors: ['black', 'white', 'grey'],
          pricePerGramMinor: 60,
          currency: 'TRY',
        })
      }
    }
    for (let d = 1; d <= 21; d++) {
      const date = DateTime.now().plus({ days: d }).toISODate()!
      const exists = await CapacitySlot.query()
        .where('printerId', printer.id)
        .where('date', date)
        .first()
      if (!exists) {
        await CapacitySlot.create({
          printerId: printer.id,
          date,
          maxMinutes: 720,
          reservedMinutes: 0,
        })
      }
    }

    const products: SellerProduct[] = []
    for (const p of PRODUCTS) {
      const existing = await SellerProduct.query().where('title', p.title).first()
      if (existing) {
        // older demo data had no file behind the row: upload the mesh so it can be rendered
        await existing.load('catalogProduct', (q) => q.preload('modelFile'))
        const old = existing.catalogProduct?.modelFile
        if (old) await this.storeMesh(p.title, old.storageKey, old.id)
        products.push(existing)
        continue
      }
      const mesh = demoMeshFor(p.title)
      const analysis = mesh ? analyzeStl(mesh) : null
      const file = await ModelFile.create({
        ownerId: admin.id,
        storageKey: `models/demo-${randomUUID()}.stl`,
        originalName: `${slugify(p.title)}.stl`,
        format: 'STL',
        sizeBytes: mesh?.length ?? 250_000,
        sha256: randomUUID().replaceAll('-', '').padEnd(64, '0'),
        analysisStatus: 'done',
        volumeMm3: analysis?.volumeMm3 || p.volume,
        bboxXMm: analysis?.bboxXMm ?? 90,
        bboxYMm: analysis?.bboxYMm ?? 70,
        bboxZMm: analysis?.bboxZMm ?? 45,
        triangleCount: analysis?.triangleCount ?? 12_000,
        isPrintable: true,
      })
      await this.storeMesh(p.title, file.storageKey, file.id)
      const catalog = await CatalogProduct.create({
        title: p.title,
        slug: `${slugify(p.title)}-${Date.now()}`,
        description: p.description,
        allowedMaterials: ['PLA', 'PETG'],
        isActive: true,
        modelFileId: file.id,
      })
      products.push(
        await SellerProduct.create({
          sellerProfileId: seller.id,
          catalogProductId: catalog.id,
          title: p.title,
          description: p.description,
          currency: 'TRY',
          marginBps: 2000,
          status: 'active',
        })
      )
    }

    const offers = await MatchOffer.query().count('* as n').first()
    if (Number(offers?.$extras.n) > 0) return

    const orders = new OrderService()
    const payments = new PaymentService()
    const matching = new MatchingService()
    const fulfilment = new FulfillmentService()

    const place = async (product: SellerProduct, quantity: number) => {
      const order = await orders.createStorefrontDraft(buyerUser, product.id, {
        material: 'PLA',
        quantity,
        shippingAddress: ADDRESS,
      })
      await payments.simulateSuccess(order.id, buyerUser.id)
      // with automatic matching off the offer is the admin's pick, as on /admin/matching
      const offer =
        (await MatchOffer.query().where('orderId', order.id).where('status', 'pending').first()) ??
        (await matching.offerTo(order.id, maker.id, admin.id).catch(() => null))
      return { order, offer }
    }

    // 1. an offer the maker can still accept
    await place(products[0], 1)

    // 2. in production
    const b = await place(products[1], 2)
    if (b.offer) await matching.acceptOffer(b.offer.id, maker.id, makerUser.id)

    // 3. finished and paid out
    const c = await place(products[2], 1)
    if (c.offer) {
      const job = await matching.acceptOffer(c.offer.id, maker.id, makerUser.id)
      await fulfilment.markProduced(job.id, maker.id, makerUser.id)
      await fulfilment.markShipped(
        job.id,
        maker.id,
        { carrier: 'Yurtiçi Kargo', trackingNumber: 'YK4820193746' },
        makerUser.id
      )
      await fulfilment.markDeliveredByBuyer(c.order.id, buyerUser.id)
      await fulfilment.completeByBuyer(c.order.id, buyerUser.id)
      await new PayoutService().release(c.order.id)
    }

    // 4. delivered with an open dispute for the admin queue
    const d = await place(products[3], 3)
    if (d.offer) {
      const job = await matching.acceptOffer(d.offer.id, maker.id, makerUser.id)
      await fulfilment.markProduced(job.id, maker.id, makerUser.id)
      await fulfilment.markShipped(
        job.id,
        maker.id,
        { carrier: 'Aras Kargo', trackingNumber: 'AR7710382915' },
        makerUser.id
      )
      await fulfilment.markDeliveredByBuyer(d.order.id, buyerUser.id)
      await new DisputeService().open(
        d.order.id,
        buyerUser.id,
        'Two of the three clips arrived snapped in half.'
      )
    }
  }

  /** Puts the demo mesh behind a model file row and renders its shop images. */
  private async storeMesh(title: string, storageKey: string, modelFileId: number) {
    const mesh = demoMeshFor(title)
    if (!mesh) return
    const disk = drive.use('s3')
    if (!(await disk.exists(storageKey))) {
      await disk.put(storageKey, mesh)
      // the row may predate the mesh: size, volume and triangles come from the real file now
      const analysis = analyzeStl(mesh)
      await ModelFile.query().where('id', modelFileId).update({
        sizeBytes: mesh.length,
        volumeMm3: analysis.volumeMm3,
        bboxXMm: analysis.bboxXMm,
        bboxYMm: analysis.bboxYMm,
        bboxZMm: analysis.bboxZMm,
        triangleCount: analysis.triangleCount,
      })
    }
    await new ProductImageService().renderModel(modelFileId)
  }
}
