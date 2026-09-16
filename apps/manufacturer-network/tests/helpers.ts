import Manufacturer from '#models/manufacturer'
import User from '#models/user'
import { randomBytes } from 'node:crypto'

export const SERVICE_HEADERS = {
  authorization: 'Bearer test-inbound-key',
  accept: 'application/json',
}

export const productionRequestBody = (overrides: Record<string, unknown> = {}) => ({
  sistem_a_order_ref: 'order_01TEST',
  sistem_a_line_item_ref: 'ordli_01TEST',
  design_reference: 'design_ayarlanabilir-telefon-standi',
  material: 'PLA',
  color: 'Yeşil',
  quantity: 2,
  buyer_region: { country: 'TR', city: 'Mersin' },
  requested_delivery_by: '2099-01-01',
  print_estimate: {
    slicer: 'fabrmatch-mesh-estimator/1.0',
    part_weight_g: 48,
    support_weight_g: 4,
    print_time_minutes: 95,
  },
  ...overrides,
})

export async function createManufacturer(overrides: Partial<Manufacturer> = {}) {
  const suffix = randomBytes(4).toString('hex')
  const user = await User.create({
    email: `maker-${suffix}@fabrmatch.test`,
    password: 'test-password-1',
    fullName: 'Test Maker',
  })
  return Manufacturer.create({
    userId: user.id,
    publicCode: `FM-${suffix.toUpperCase()}`,
    displayName: 'Test Atölye',
    countryCode: 'TR',
    city: 'Mersin',
    materials: ['PLA', 'PETG'],
    maxBuildXMm: 250,
    maxBuildYMm: 210,
    maxBuildZMm: 220,
    dailyCapacityGrams: 2000,
    pricePerGram: 0.9,
    hourlyRate: 20,
    currencyCode: 'try',
    status: 'active',
    // Stripe Connect onboarding'ini tamamlamış varsayılan üretici (05-PRD)
    stripeAccountId: `acct_test_${suffix}`,
    ...overrides,
  })
}
