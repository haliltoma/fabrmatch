import drive from '@adonisjs/drive/services/main'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import ModelFile from '#models/model_file'
import ProductImage from '#models/product_image'
import { parseStl } from '#services/files/stl_analyzer'
import { RENDER_VERSION, renderTurntable } from '#services/files/model_renderer'

/** Largest mesh rendered in one go; bigger files keep the placeholder instead of stalling a worker. */
const MAX_TRIANGLES = 2_000_000

export interface ShopImage {
  id: number
  kind: 'render' | 'maker_photo'
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
  async renderModel(modelFileId: number): Promise<number> {
    const file = await ModelFile.find(modelFileId)
    if (!file || file.format !== 'STL' || file.blockedAt || file.analysisStatus !== 'done') return 0

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
    const frames = renderTurntable(parseStl(buffer))
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

  /** Approved pictures per model file: maker photos first (the real thing), then the turntable. */
  async forModelFiles(modelFileIds: number[]): Promise<Map<number, ShopImage[]>> {
    const map = new Map<number, ShopImage[]>()
    if (modelFileIds.length === 0) return map
    const rows = await ProductImage.query()
      .whereIn('modelFileId', [...new Set(modelFileIds)])
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

export function toShopImage(row: ProductImage): ShopImage {
  return {
    id: row.id,
    kind: row.kind,
    url: `/images/${row.id}`,
    width: row.width,
    height: row.height,
    angle: row.angle,
  }
}
