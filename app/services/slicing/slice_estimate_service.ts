import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import drive from '@adonisjs/drive/services/main'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import ModelFile from '#models/model_file'
import SliceEstimate from '#models/slice_estimate'
import CliSlicer from '#services/slicing/cli_slicer'
import type { Slicer } from '#services/slicing/slicer'

export interface SlicedNumbers {
  /** grams for the reference filament (PLA); scale by density for other materials */
  grams: number
  supportGrams: number
  printMinutes: number
}

function configuredSlicer(): Slicer | null {
  if (env.get('SLICER_DRIVER') !== 'orca') return null
  const bin = env.get('SLICER_BIN')
  const dir = env.get('SLICER_PROFILES_DIR')
  return bin && dir ? new CliSlicer(bin, dir) : null
}

/**
 * Slicer-backed estimates (R2-T1). A result is cached per (model bytes, profile). Anything that
 * goes wrong is recorded and answered with null, and pricing then uses the heuristic — a slicing
 * problem must never stop a quote or an order.
 */
export default class SliceEstimateService {
  constructor(private slicer: Slicer | null = configuredSlicer()) {}

  get enabled() {
    return this.slicer !== null
  }

  /** Cached numbers only; never runs the slicer (safe on the request path). */
  async cached(sha256: string, profileCode: string): Promise<SlicedNumbers | null> {
    const row = await SliceEstimate.query()
      .where('contentHash', sha256)
      .where('profileCode', profileCode)
      .where('status', 'done')
      .first()
    if (!row || row.gramsCenti === null || row.printMinutes === null) return null
    return {
      grams: row.gramsCenti / 100,
      supportGrams: (row.supportGramsCenti ?? 0) / 100,
      printMinutes: row.printMinutes,
    }
  }

  /** Runs the slicer unless this (file, profile) is already answered. Used by the queue job. */
  async ensure(
    modelFileId: string,
    profileCode: string
  ): Promise<'cached' | 'sliced' | 'failed' | 'disabled'> {
    if (!this.slicer) return 'disabled'
    const file = await ModelFile.findOrFail(modelFileId)
    if (
      await SliceEstimate.query()
        .where('contentHash', file.sha256)
        .where('profileCode', profileCode)
        .first()
    ) {
      return 'cached'
    }

    const dir = await mkdtemp(join(tmpdir(), 'slice-'))
    try {
      const stream = await drive.use('s3').getStream(file.storageKey)
      const chunks: Buffer[] = []
      for await (const chunk of stream)
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      const filePath = join(dir, `model.${file.format.toLowerCase()}`)
      await writeFile(filePath, Buffer.concat(chunks))
      const result = await this.slicer.slice({ filePath, profileCode, workDir: dir })
      await SliceEstimate.create({
        contentHash: file.sha256,
        profileCode,
        status: 'done',
        gramsCenti: Math.round(result.grams * 100),
        supportGramsCenti: Math.round(result.supportGrams * 100),
        printMinutes: result.printMinutes,
        slicer: result.slicer,
      })
      return 'sliced'
    } catch (error) {
      const message = (error as Error).message.slice(0, 300)
      logger.warn({
        msg: 'slicing failed, heuristic estimate stays',
        modelFileId,
        profileCode,
        error: message,
      })
      await SliceEstimate.updateOrCreate(
        { contentHash: file.sha256, profileCode },
        { status: 'failed', error: message, slicer: this.slicer.name }
      )
      return 'failed'
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  }
}
