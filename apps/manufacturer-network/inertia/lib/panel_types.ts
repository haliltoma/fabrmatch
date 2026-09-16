/** Sunucu karşılığı: app/services/panel/serializers.ts — şekiller birebir aynı tutulur. */

export type ManufacturerSummary = {
  displayName: string
  publicCode: string
  status: string
  completedOrders: number
}

export type JobSummary = {
  id: number
  publicId: string
  designReference: string
  material: string
  color: string | null
  quantity: number
  status: string
  buyerCountry: string
  buyerCity: string | null
  requestedDeliveryBy: string
  payout: number | null
  currencyCode: string
}

export type OfferSummary = {
  id: number
  expiresAt: string
  quotedPayout: number | null
  job: JobSummary
}

export type PrintEstimate = {
  slicer: string
  part_weight_g: number
  support_weight_g: number
  print_time_minutes: number
}

export type JobDetail = JobSummary & {
  trackingNumber: string | null
  productionPhotos: string[]
  printEstimate: PrintEstimate | null
  acceptedAt: string | null
  shippedAt: string | null
  deliveredAt: string | null
}
