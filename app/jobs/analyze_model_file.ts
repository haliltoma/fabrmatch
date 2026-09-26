import { DateTime } from 'luxon'
import { scanUpload } from '#services/files/file_scanner'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import drive from '@adonisjs/drive/services/main'
import ModelFile from '#models/model_file'
import { analyzeStl } from '#services/files/stl_analyzer'

interface AnalyzeModelFilePayload {
  modelFileId: number
}

export default class AnalyzeModelFile extends Job<AnalyzeModelFilePayload> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 2,
  }

  async execute() {
    const { modelFileId } = this.payload
    const file = await ModelFile.find(modelFileId)

    if (!file) {
      logger.warn({ msg: 'AnalyzeModelFile: file not found', modelFileId })
      return
    }

    // Idempotent: skip if already done
    if (file.analysisStatus === 'done') {
      logger.info({ msg: 'AnalyzeModelFile: already done', modelFileId })
      return
    }

    file.analysisStatus = 'processing'
    await file.save()

    try {
      const disk = drive.use('s3')
      const stream = await disk.getStream(file.storageKey)

      // Collect stream into buffer
      const chunks: Buffer[] = []
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      }
      const buffer = Buffer.concat(chunks)

      const verdict = await scanUpload(buffer, file.format, {
        sha256: file.sha256,
        sizeBytes: file.sizeBytes,
      })
      if (!verdict.ok) {
        file.analysisStatus = 'failed'
        file.isPrintable = false
        file.analysisError = verdict.reason
        file.blockedAt = DateTime.now()
        file.blockedReason = verdict.reason
        await file.save()
        logger.warn({
          msg: 'AnalyzeModelFile: rejected by scan',
          modelFileId,
          reason: verdict.reason,
        })
        return
      }

      if (file.format === 'STL') {
        const result = analyzeStl(buffer)

        file.volumeMm3 = result.volumeMm3
        file.bboxXMm = result.bboxXMm
        file.bboxYMm = result.bboxYMm
        file.bboxZMm = result.bboxZMm
        file.triangleCount = result.triangleCount
        file.isPrintable = result.isPrintable
        file.dfmIssues = result.dfmIssues
        file.analysisError = result.error
        file.analysisStatus = result.error ? 'failed' : 'done'
      } else {
        // 3MF and OBJ: mark as done with basic info, no deep analysis yet
        file.analysisStatus = 'done'
        file.isPrintable = null // Unknown without parser
        file.analysisError = null
      }

      await file.save()
      if (file.analysisStatus === 'done' && file.isPrintable && !app.inTest) {
        try {
          const { default: SliceModelFile } = await import('#jobs/slice_model_file')
          await SliceModelFile.dispatch({ modelFileId })
        } catch (error) {
          logger.warn({
            msg: 'could not queue slicing',
            modelFileId,
            error: (error as Error).message,
          })
        }
      }
      logger.info({
        msg: 'AnalyzeModelFile: complete',
        modelFileId,
        status: file.analysisStatus,
        volumeMm3: file.volumeMm3,
      })
    } catch (error) {
      file.analysisStatus = 'failed'
      file.analysisError = `Analysis failed: ${(error as Error).message}`
      await file.save()
      logger.error({
        msg: 'AnalyzeModelFile: error',
        modelFileId,
        error: (error as Error).message,
      })
      throw error // Let queue retry
    }
  }

  async failed(error: Error) {
    logger.error({
      msg: 'AnalyzeModelFile: permanently failed',
      modelFileId: this.payload.modelFileId,
      error: error.message,
    })
  }
}
