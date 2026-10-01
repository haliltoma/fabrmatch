import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import drive from '@adonisjs/drive/services/main'
import logger from '@adonisjs/core/services/logger'
import ModelFile from '#models/model_file'
import type { ModelFileFormat } from '#models/model_file'
import type User from '#models/user'
import { pageMeta, pageParams } from '#services/pagination'
import UploadTicketService from '#services/files/upload_ticket_service'

const MAX_SIZE_BYTES = 200 * 1024 * 1024 // 200 MB
const ALLOWED_FORMATS: Record<string, ModelFileFormat> = {
  '.stl': 'STL',
  '.3mf': '3MF',
  '.obj': 'OBJ',
}

interface RegisterFileData {
  originalName: string
  sizeBytes: number
  sha256: string
  storageKey: string
  format: ModelFileFormat
}

/** A scan that has not moved for this long is handed to the queue again. */
const STALLED_AFTER_MINUTES = 15
/** A scan still unfinished this long after upload is marked failed. */
const GIVE_UP_AFTER_HOURS = 2

export default class ModelFileService {
  /**
   * Generate a presigned upload URL for direct browser-to-R2 upload.
   * Returns the storage key and signed URL.
   */
  async getUploadUrl(
    originalName: string,
    upload?: { userId: string; sizeBytes: number }
  ): Promise<{ storageKey: string; signedUrl: string }> {
    const ext = this.extractExtension(originalName)
    const format = ALLOWED_FORMATS[ext]
    if (!format) {
      throw new Error(`Unsupported file format: ${ext}. Allowed: STL, 3MF, OBJ`)
    }

    if (upload && (upload.sizeBytes < 1 || upload.sizeBytes > MAX_SIZE_BYTES)) {
      throw new Error(`File too large: ${upload.sizeBytes} bytes (max ${MAX_SIZE_BYTES})`)
    }

    const storageKey = `models/${randomUUID()}${ext}`
    const disk = drive.use('s3')
    // an upload (PUT) URL: the size is part of the signature, so a different body is refused
    const signedUrl = await disk.getSignedUploadUrl(storageKey, {
      expiresIn: '15m',
      // never the browser's guess: a stored model is inert bytes, whatever it claims to be
      contentType: 'application/octet-stream',
      ...(upload ? { ContentLength: upload.sizeBytes } : {}),
    })
    if (upload) await new UploadTicketService().issue(storageKey, upload)

    return { storageKey, signedUrl }
  }

  /**
   * Registers a browser upload: only a storage key this server presigned for this user, at the
   * same size, and only once (review fix: arbitrary keys could expose other stored objects).
   */
  async registerUpload(user: User, data: RegisterFileData, replacesFileId?: string | null) {
    const ok = await new UploadTicketService().consume(data.storageKey, user.id, data.sizeBytes)
    if (!ok) throw new Error('Upload not found or expired. Please upload the file again.')
    return this.register(user, data, replacesFileId)
  }

  /**
   * Register a file after upload completes.
   * Checks sha256 dedup — if same hash exists, returns existing record.
   */
  async register(
    user: User,
    data: RegisterFileData,
    replacesFileId?: string | null
  ): Promise<{ file: ModelFile; isDuplicate: boolean }> {
    if (data.sizeBytes > MAX_SIZE_BYTES) {
      throw new Error(`File too large: ${data.sizeBytes} bytes (max ${MAX_SIZE_BYTES})`)
    }

    // A new version of a model: it must replace one of the owner's own files that has no newer version yet.
    let replaced: ModelFile | null = null
    if (replacesFileId) {
      replaced = await ModelFile.query()
        .where('id', replacesFileId)
        .where('ownerId', user.id)
        .first()
      if (!replaced) throw new Error('The model you want to replace was not found')
      const newer = await ModelFile.query().where('previousFileId', replaced.id).first()
      if (newer) throw new Error('That model already has a newer version — replace the newest one')
      if (replaced.sha256 === data.sha256) {
        throw new Error('This is the same file as the version you are replacing')
      }
    }

    const existing = await ModelFile.query()
      .where('sha256', data.sha256)
      .where('ownerId', user.id)
      .first()

    if (existing) {
      return { file: existing, isDuplicate: true }
    }

    const file = await ModelFile.create({
      ownerId: user.id,
      storageKey: data.storageKey,
      originalName: data.originalName,
      format: data.format,
      sizeBytes: data.sizeBytes,
      sha256: data.sha256,
      analysisStatus: 'pending',
      previousFileId: replaced?.id ?? null,
      revision: replaced ? replaced.revision + 1 : 1,
    })

    // Dispatch analysis job (fire-and-forget, don't block registration)
    this.dispatchAnalysis(file.id).catch((err) => {
      logger.warn({ msg: 'Failed to dispatch analysis job', modelFileId: file.id, error: err })
    })

    return { file, isDuplicate: false }
  }

  async findById(id: string): Promise<ModelFile | null> {
    return ModelFile.find(id)
  }

  async findByIdForOwner(id: string, ownerId: string): Promise<ModelFile | null> {
    return ModelFile.query().where('id', id).where('ownerId', ownerId).first()
  }

  /** The owner's models, newest first — only the latest revision of each; older ones come with it as history. */
  async listForOwner(ownerId: string, params: { page?: number; perPage?: number } = {}) {
    const { page, perPage } = pageParams(params)
    const paginator = await ModelFile.query()
      .where('ownerId', ownerId)
      .whereNotExists((q) => {
        q.from('model_files as newer').whereRaw('newer.previous_file_id = model_files.id')
      })
      .orderBy('id', 'desc')
      .paginate(page, perPage)
    const rows = paginator.all()
    const history = new Map<string, Array<{ id: string; revision: number; createdAt: string }>>()
    for (const file of rows) history.set(file.id, await this.olderVersions(file))
    return { rows, history, meta: pageMeta(paginator.total, page, perPage) }
  }

  /** Earlier revisions of a model, newest first. */
  async olderVersions(file: ModelFile) {
    const older: Array<{ id: string; revision: number; createdAt: string }> = []
    let cursor = file.previousFileId
    const seen = new Set<string>([file.id])
    while (cursor && !seen.has(cursor) && older.length < 50) {
      seen.add(cursor)
      const prev = await ModelFile.find(cursor)
      if (!prev) break
      older.push({ id: prev.id, revision: prev.revision, createdAt: prev.createdAt.toISO()! })
      cursor = prev.previousFileId
    }
    return older
  }

  /** The newest revision that replaced this file, or null when it is the latest. */
  async newerVersionOf(file: ModelFile): Promise<ModelFile | null> {
    let current = file
    for (let hops = 0; hops < 50; hops++) {
      const next = await ModelFile.query().where('previousFileId', current.id).first()
      if (!next) return current.id === file.id ? null : current
      current = next
    }
    return current
  }

  /**
   * Files whose scan never finished (worker down, job lost): hand them to the queue again once they
   * have waited 15 minutes (the job is idempotent), and after 2 hours give up with a clear message
   * so the owner is not left on "scanning" forever. Run by the scheduler (RecoverStalledAnalyses).
   */
  async recoverStalled(
    options: { now?: DateTime; dispatch?: (id: string) => Promise<void> } = {}
  ): Promise<{ requeued: number; failed: number }> {
    const now = options.now ?? DateTime.now()
    const dispatch = options.dispatch ?? ((id: string) => this.dispatchAnalysis(id))
    const stale = await ModelFile.query()
      .whereIn('analysisStatus', ['pending', 'processing'])
      .where('updatedAt', '<', now.minus({ minutes: STALLED_AFTER_MINUTES }).toJSDate())
      .orderBy('id', 'asc')
      .limit(200)
    let requeued = 0
    let failed = 0
    for (const file of stale) {
      if (file.createdAt < now.minus({ hours: GIVE_UP_AFTER_HOURS })) {
        file.analysisStatus = 'failed'
        file.isPrintable = false
        file.analysisError = 'The check did not finish in time. Please upload the file again.'
        await file.save()
        failed += 1
        continue
      }
      file.analysisStatus = 'pending'
      file.updatedAt = now
      await file.save()
      await dispatch(file.id).catch((error) =>
        logger.warn({ msg: 'Failed to re-dispatch analysis job', modelFileId: file.id, error })
      )
      requeued += 1
    }
    return { requeued, failed }
  }

  private async dispatchAnalysis(modelFileId: string): Promise<void> {
    const { default: AnalyzeModelFile } = await import('#jobs/analyze_model_file')
    await AnalyzeModelFile.dispatch({ modelFileId })
  }

  private extractExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.')
    if (lastDot === -1) return ''
    return filename.slice(lastDot).toLowerCase()
  }
}
