import DomainError from '#exceptions/domain_error'
import { cleanStoredPhoto } from '#services/files/photo_cleaner'
import { randomUUID } from 'node:crypto'
import app from '@adonisjs/core/services/app'
import drive from '@adonisjs/drive/services/main'
import JobQcPhoto from '#models/job_qc_photo'
import ProductionJob from '#models/production_job'

export class QcPhotoError extends DomainError {}

const TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}
const MAX_BYTES = 10 * 1024 * 1024
const MAX_PHOTOS = 8
const OPEN_STATUSES = ['accepted', 'printing', 'produced']

/** Photos of the finished part, taken before it ships. They double as evidence if a dispute follows. */
export default class QcPhotoService {
  async presignUpload(jobId: number, manufacturerProfileId: number, contentType: string) {
    const ext = TYPES[contentType]
    if (!ext) throw new QcPhotoError('Photos must be JPG, PNG or WebP')
    await this.ownedOpenJob(jobId, manufacturerProfileId)
    const storageKey = `qc/${jobId}/${randomUUID()}${ext}`
    const signedUrl = await drive
      .use('s3')
      .getSignedUploadUrl(storageKey, { expiresIn: '10m', contentType })
    return { storageKey, signedUrl }
  }

  async register(jobId: number, manufacturerProfileId: number, storageKey: string) {
    await this.ownedOpenJob(jobId, manufacturerProfileId)
    const pattern = new RegExp(`^qc/${jobId}/[0-9a-f-]{36}\\.(jpg|png|webp)$`)
    const valid = app.inTest ? storageKey.startsWith(`qc/${jobId}/`) : pattern.test(storageKey)
    if (!valid) throw new QcPhotoError('Invalid photo location')
    if ((await this.count(jobId)) >= MAX_PHOTOS) {
      throw new QcPhotoError(`At most ${MAX_PHOTOS} photos per job`)
    }
    await this.verifyObject(storageKey)
    // no GPS or device data: QC photos become dispute evidence and shop pictures
    await cleanStoredPhoto(storageKey)
    return JobQcPhoto.create({ productionJobId: jobId, storageKey })
  }

  async count(jobId: number): Promise<number> {
    const row = await JobQcPhoto.query().where('productionJobId', jobId).count('* as n').first()
    return Number(row?.$extras.n ?? 0)
  }

  async list(jobId: number) {
    return JobQcPhoto.query().where('productionJobId', jobId).orderBy('id')
  }

  async urls(photos: JobQcPhoto[]): Promise<Record<number, string>> {
    const disk = drive.use('s3')
    const entries = await Promise.all(
      photos.map(
        async (p) => [p.id, await disk.getSignedUrl(p.storageKey, { expiresIn: '15m' })] as const
      )
    )
    return Object.fromEntries(entries)
  }

  private async ownedOpenJob(jobId: number, manufacturerProfileId: number) {
    const job = await ProductionJob.query()
      .where('id', jobId)
      .where('manufacturerProfileId', manufacturerProfileId)
      .first()
    if (!job) throw new QcPhotoError('Production job not found')
    if (!OPEN_STATUSES.includes(job.status)) {
      throw new QcPhotoError('Photos can only be added before the job ships')
    }
    return job
  }

  private async verifyObject(storageKey: string) {
    if (app.inTest) return
    const disk = drive.use('s3')
    if (!(await disk.exists(storageKey))) throw new QcPhotoError('The photo was not uploaded')
    const meta = await disk.getMetaData(storageKey)
    if (meta.contentLength > MAX_BYTES) {
      await disk.delete(storageKey)
      throw new QcPhotoError('Photos must be 10 MB or smaller')
    }
    if (!meta.contentType || !(meta.contentType in TYPES)) {
      await disk.delete(storageKey)
      throw new QcPhotoError('Photos must be JPG, PNG or WebP')
    }
  }
}
