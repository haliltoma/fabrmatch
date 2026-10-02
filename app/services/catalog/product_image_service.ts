import drive from '@adonisjs/drive/services/main'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import ModelFile from '#models/model_file'
import ProductImage from '#models/product_image'
import { MeshParseError, parseModel } from '#services/files/mesh_parser'
import type { ModelFormat } from '#services/files/file_scanner'
import { RENDER_VERSION, renderTurntable } from '#services/files/model_renderer'

const HEX = /^#[0-9A-F]{6}$/

/**
 * A filament colour as the renderer's base tone. Dark colours are lifted (black → dark grey) so
 * the shading still shows the form; light colours stay as they are.
 */
const rgbOf = (hex: string): [number, number, number] => {
  const lift = (c: number) => Math.round(56 + (c * 199) / 255)
  return [
    lift(Number.parseInt(hex.slice(1, 3), 16)),
    lift(Number.parseInt(hex.slice(3, 5), 16)),
    lift(Number.parseInt(hex.slice(5, 7), 16)),
  ]
}

/** Largest mesh rendered in one go; bigger files keep the placeholder instead of stalling a worker. */
const MAX_TRIANGLES = 2_000_000

export interface ShopImage {
  id: string
  kind: 'render' | 'maker_photo' | 'colour_render'
  url: string
  width: number | null
  height: number | null
  angle: number | null
}

/**
 * Pictures for the shop (R4-T6): turntable renders made from the model file, plus maker photos an
 * admin approved. Images are served through `/images/:id` so the model file itself never becomes
 * public (business rule 4).
 */
export default class ProductImageService {
  /**
   * Renders the model once per RENDER_VERSION. Idempotent: a file that already has this version's
   * renders is skipped; older-version renders are replaced.
   */
  async renderModel(modelFileId: string): Promise<number> {
    const file = await ModelFile.find(modelFileId)
    if (!file || file.blockedAt || file.analysisStatus !== 'done') return 0

    const current = await ProductImage.query()
      .where('modelFileId', file.id)
      .where('kind', 'render')
      .where('renderVersion', RENDER_VERSION)
      .count('* as n')
      .first()
    if (Number(current?.$extras.n ?? 0) > 0) return 0
    if ((file.triangleCount ?? 0) > MAX_TRIANGLES) {
      logger.warn({ msg: 'render skipped: mesh too large', modelFileId })
      return 0
    }

    const disk = drive.use('s3')
    const buffer = Buffer.from(await disk.getBytes(file.storageKey))
    let triangles
    try {
      triangles = parseModel(buffer, file.format as ModelFormat)
    } catch (error) {
      if (!(error instanceof MeshParseError)) throw error
      logger.warn({ msg: 'render skipped: unreadable model', modelFileId, error: error.message })
      return 0
    }
    const frames = renderTurntable(triangles)
    if (frames.length === 0) return 0

    const old = await ProductImage.query().where('modelFileId', file.id).where('kind', 'render')
    for (const frame of frames) {
      const storageKey = `product-images/renders/${file.id}/v${RENDER_VERSION}-${frame.angle}.png`
      await disk.put(storageKey, frame.png, { contentType: 'image/png' })
      await ProductImage.updateOrCreate(
        { storageKey },
        {
          modelFileId: file.id,
          kind: 'render',
          status: 'approved',
          contentType: 'image/png',
          width: frame.width,
          height: frame.height,
          angle: frame.angle,
          renderVersion: RENDER_VERSION,
          reviewedAt: DateTime.now(),
        }
      )
    }
    for (const stale of old.filter((o) => o.renderVersion !== RENDER_VERSION)) {
      await disk.delete(stale.storageKey).catch(() => {})
      await stale.delete()
    }
    return frames.length
  }

  /**
   * W3: one render per colour (angle 30°, the colour's hex as the filament), made once per render
   * version and reused. Returns the picture per upper-case hex; colours that could not be drawn
   * (mesh too large or unreadable) are missing from the map.
   */
  async colourRenders(modelFileId: string, hexes: string[]): Promise<Map<string, ShopImage>> {
    const wanted = [...new Set(hexes.map((h) => h.toUpperCase()).filter((h) => HEX.test(h)))]
    const result = new Map<string, ShopImage>()
    if (wanted.length === 0) return result
    const existing = await ProductImage.query()
      .where('modelFileId', modelFileId)
      .where('kind', 'colour_render')
      .where('renderVersion', RENDER_VERSION)
      .whereIn('colorHex', wanted)
    for (const row of existing) result.set(row.colorHex!, toShopImage(row))
    const missing = wanted.filter((h) => !result.has(h))
    if (missing.length === 0) return result

    const file = await ModelFile.find(modelFileId)
    if (!file || file.blockedAt || file.analysisStatus !== 'done') return result
    if ((file.triangleCount ?? 0) > MAX_TRIANGLES) return result
    const disk = drive.use('s3')
    let triangles
    try {
      triangles = parseModel(
        Buffer.from(await disk.getBytes(file.storageKey)),
        file.format as ModelFormat
      )
    } catch (error) {
      // no picture is better than no publish: the shop then shows the turntable only
      logger.warn({ msg: 'colour render skipped', modelFileId, error: (error as Error).message })
      return result
    }
    for (const hex of missing) {
      const [frame] = renderTurntable(triangles, { angles: [30], color: rgbOf(hex) })
      if (!frame) continue
      const storageKey = `product-images/renders/${file.id}/v${RENDER_VERSION}-c${hex.slice(1)}.png`
      await disk.put(storageKey, frame.png, { contentType: 'image/png' })
      const row = await ProductImage.updateOrCreate(
        { storageKey },
        {
          modelFileId: file.id,
          kind: 'colour_render',
          status: 'approved',
          contentType: 'image/png',
          width: frame.width,
          height: frame.height,
          angle: frame.angle,
          colorHex: hex,
          renderVersion: RENDER_VERSION,
          reviewedAt: DateTime.now(),
        }
      )
      result.set(hex, toShopImage(row))
    }
    return result
  }

  /** Approved pictures per model file: maker photos first (the real thing), then the turntable. */
  async forModelFiles(modelFileIds: string[]): Promise<Map<string, ShopImage[]>> {
    const map = new Map<string, ShopImage[]>()
    if (modelFileIds.length === 0) return map
    const rows = await ProductImage.query()
      .whereIn('modelFileId', [...new Set(modelFileIds)])
      .whereIn('kind', ['render', 'maker_photo'])
      .where('status', 'approved')
      .orderByRaw("case when kind = 'maker_photo' then 0 else 1 end")
      .orderBy('angle', 'asc')
      .orderBy('id', 'asc')
    for (const row of rows) {
      const list = map.get(row.modelFileId) ?? []
      list.push(toShopImage(row))
      map.set(row.modelFileId, list)
    }
    return map
  }
}

function toShopImage(row: ProductImage): ShopImage {
  return {
    id: row.id,
    kind: row.kind,
    url: `/images/${row.id}`,
    width: row.width,
    height: row.height,
    angle: row.angle,
  }
}
