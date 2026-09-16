/**
 * Özel tasarımdan tek seferlik ürün/teklif sağlama için saf yardımcılar.
 * STL saklanmaz — design_reference opak hash'tir (bkz. docs/07, 2026-09-16).
 * Fiyat: cost.total_cost × CUSTOM_DESIGN_MARKUP; satır kalemi her zaman quantity=1.
 */

export const DESIGN_REFERENCE_PREFIX = "sha256:"

export type CustomDesignParams = {
  material: string
  infill_percent: number
  layer_height_mm: number
  quantity: number
}

export type CustomDesignAnalysis = {
  design_hash: string
  params: CustomDesignParams
  estimate: {
    slicer: string
    part_weight_g: number
    support_weight_g: number
    print_time_minutes: number
  }
  cost: {
    total_cost: number
  }
}

/** CUSTOM_DESIGN_MARKUP env değerini güvenle sayıya çevirir; geçersizse 1.0, >100 ise 100'e sabitlenir. */
export function parseCustomDesignMarkup(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) {
    return 1
  }
  return Math.min(raw, 100)
}

/** Fiyatı 2 ondalığa yuvarlar. Medusa fiyatları ham birimde saklar (kuruş değil). */
export function computeCustomDesignPrice(totalCost: number, markup: number): number {
  return Math.round(totalCost * markup * 100) / 100
}

export function buildCustomDesignMetadata(analysis: CustomDesignAnalysis): Record<string, unknown> {
  return {
    made_to_order: true,
    custom_design: true,
    design_reference: `${DESIGN_REFERENCE_PREFIX}${analysis.design_hash}`,
    print_profile: {
      slicer: analysis.estimate.slicer,
      part_weight_g: analysis.estimate.part_weight_g,
      support_weight_g: analysis.estimate.support_weight_g,
      print_time_minutes: analysis.estimate.print_time_minutes,
    },
    print_params: {
      material: analysis.params.material,
      infill_percent: analysis.params.infill_percent,
      layer_height_mm: analysis.params.layer_height_mm,
      quantity: analysis.params.quantity,
    },
  }
}

/** Gerçek adet varyant başlığında; satır kalemi quantity=1 eklenir (bilinçli sınırlama, docs/07). */
export function buildVariantTitle(material: string, quantity: number): string {
  return `${material} · ${quantity} adet`
}

/** CUSTOM-<hash'in ilk 12 hex'i>-<MATERYAL>-<8 rastgele karakter>. */
export function buildCustomSku(designHash: string, material: string, random?: string): string {
  const hash12 = designHash.slice(0, 12).toUpperCase()
  const suffix = (
    random ??
    Math.random().toString(36).slice(2, 10).padEnd(8, "0")
  ).toUpperCase()
  return `CUSTOM-${hash12}-${material.toUpperCase()}-${suffix}`
}

/**
 * Benzersiz handle — aksi halde Medusa handle'ı title'dan üretir ve aynı isimli iki
 * özel tasarım "already exists" hatası alır. Aynı random suffix SKU ile paylaşılır.
 */
export function buildCustomHandle(designHash: string, random?: string): string {
  const suffix = (
    random ??
    Math.random().toString(36).slice(2, 10).padEnd(8, "0")
  ).toLowerCase()
  return `custom-${designHash.slice(0, 12).toLowerCase()}-${suffix}`
}
