/**
 * P0-6: Dosya erişim seviyesi — üretici kaç sipariş tamamladığına göre
 * tam STL dosyasına mı yoksa yalnızca G-code'a mı erişebilir.
 *
 * <20 tamamlanmış sipariş → gcode_only
 * ≥20 tamamlanmış sipariş → full_stl
 *
 * P0-5: Koruma dönemi yardımcısı — match_engine.MATCHING_RULES.protectionOrders
 * ile tutarlı kalması için eşik buradan türetilir.
 */

import { MATCHING_RULES } from '#services/matching/match_engine'

export type FileAccessLevel = 'gcode_only' | 'full_stl'

export const FILE_ACCESS_RULES = {
  /** Bu eşiğin altındaki üreticiler yalnızca G-code alır. */
  fullStlThreshold: 20,
  /** MATCHING_RULES ile tutarlı: koruma dönemi sipariş sayısı. */
  protectionPeriodOrders: MATCHING_RULES.protectionOrders,
} as const

/**
 * Üretici koruma döneminde mi?
 * (completedOrders < protectionPeriodOrders)
 */
export function isProtectedPeriod(manufacturer: { completedOrders: number }): boolean {
  return manufacturer.completedOrders < FILE_ACCESS_RULES.protectionPeriodOrders
}

/**
 * Üreticinin erişebileceği dosya seviyesini döner.
 */
export function fileAccessLevel(manufacturer: { completedOrders: number }): FileAccessLevel {
  return manufacturer.completedOrders >= FILE_ACCESS_RULES.fullStlThreshold
    ? 'full_stl'
    : 'gcode_only'
}
