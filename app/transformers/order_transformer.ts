import { BaseTransformer } from '@adonisjs/core/transformers'
import type Order from '#models/order'
import type ProductionJob from '#models/production_job'
import OrderService from '#services/orders/order_service'

function activeJob(order: Order): ProductionJob | null {
  const jobs = order.productionJobs ?? []
  return jobs.find((j) => j.status !== 'cancelled') ?? null
}

function sumShare(order: Order): number {
  return (order.items ?? []).reduce((sum, i) => sum + i.manufacturerShareMinor * i.quantity, 0)
}

/**
 * PRD §9 anonymity:
 * - default (buyer/seller): no manufacturer field of any kind.
 * - forOffer: spec only, nothing about the buyer before the offer is accepted.
 * - forManufacturer: buyer shipping fields only (no phone/email), no buyer-facing prices.
 * - forAdmin: full picture.
 */
export default class OrderTransformer extends BaseTransformer<Order> {
  toObject() {
    const job = activeJob(this.resource)
    return {
      id: this.resource.id,
      code: this.resource.code,
      status: this.resource.status,
      channel: this.resource.channel,
      currency: this.resource.currency,
      subtotalMinor: this.resource.subtotalMinor,
      shippingMinor: this.resource.shippingMinor,
      totalMinor: this.resource.totalMinor,
      discountMinor: this.resource.discountMinor,
      taxRateBps: this.resource.taxRateBps,
      taxMinor: this.resource.taxMinor,
      items: (this.resource.items ?? []).map((i) => ({
        id: i.id,
        fileName: i.modelFile?.originalName ?? null,
        technology: i.technology,
        material: i.material,
        color: i.color,
        finishing: i.finishingName,
        quantity: i.quantity,
        unitCostMinor: i.unitCostMinor,
      })),
      shipment: {
        carrier: job?.carrier ?? null,
        trackingNumber: job?.trackingNumber ?? null,
        shippedAt: job?.shippedAt?.toISO() ?? null,
      },
      deliveredAt: this.resource.deliveredAt?.toISO() ?? null,
      completedAt: this.resource.completedAt?.toISO() ?? null,
      createdAt: this.resource.createdAt.toISO(),
    }
  }

  /** Seller view of a sale: what it is and what the seller earns. No buyer, no manufacturer. */
  forSeller() {
    return {
      id: this.resource.id,
      code: this.resource.code,
      status: this.resource.status,
      currency: this.resource.currency,
      earnMinor: this.resource.sellerShareMinor,
      items: (this.resource.items ?? []).map((i) => ({
        material: i.material,
        color: i.color,
        quantity: i.quantity,
      })),
      createdAt: this.resource.createdAt.toISO(),
    }
  }

  forOffer() {
    return {
      code: this.resource.code,
      shipCountry: this.resource.shipCountry,
      currency: this.resource.currency,
      manufacturerShareMinor: sumShare(this.resource),
      items: (this.resource.items ?? []).map((i) => ({
        technology: i.technology,
        material: i.material,
        color: i.color,
        finishing: i.finishingName,
        quantity: i.quantity,
        scalePercent: i.scalePercent ?? 100,
        estGrams: i.estGrams,
        estPrintMinutes: i.estPrintMinutes,
        bboxMm:
          i.modelFile?.bboxXMm !== undefined &&
          i.modelFile?.bboxXMm !== null &&
          i.modelFile?.bboxYMm !== null &&
          i.modelFile?.bboxZMm !== null
            ? ([i.modelFile.bboxXMm, i.modelFile.bboxYMm, i.modelFile.bboxZMm].map(
                (d) => (d * (i.scalePercent ?? 100)) / 100
              ) as [number, number, number])
            : null,
      })),
    }
  }

  forManufacturer() {
    const address = new OrderService().decryptShippingAddress(this.resource)
    const job = activeJob(this.resource)
    return {
      ...this.forOffer(),
      id: this.resource.id,
      status: this.resource.status,
      shipTo: address
        ? {
            fullName: address.fullName,
            line1: address.line1,
            line2: address.line2 ?? null,
            district: address.district ?? null,
            city: address.city,
            postalCode: address.postalCode,
            country: address.country,
          }
        : null,
      shipment: {
        carrier: job?.carrier ?? null,
        trackingNumber: job?.trackingNumber ?? null,
      },
    }
  }

  forAdmin() {
    const job = activeJob(this.resource)
    return {
      ...this.toObject(),
      buyerId: this.resource.buyerId,
      sellerId: this.resource.sellerId,
      matchingRound: this.resource.matchingRound,
      requiredTrustTier: this.resource.requiredTrustTier,
      shippingAddress: new OrderService().decryptShippingAddress(this.resource),
      productionJob: job
        ? {
            id: job.id,
            status: job.status,
            manufacturerProfileId: job.manufacturerProfileId,
            manufacturerAlias: job.manufacturerProfile?.publicAlias ?? null,
            dueAt: job.dueAt.toISO(),
          }
        : null,
    }
  }
}
