import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import drive from '@adonisjs/drive/services/main'
import FileAccessGrant from '#models/file_access_grant'
import FileDownloadLog from '#models/file_download_log'
import type ManufacturerProfile from '#models/manufacturer_profile'
import type ModelFile from '#models/model_file'

/**
 * Trust tier rules (PRD §10):
 * Tier 0: 24h, max 2 downloads
 * Tier 1: 72h, max 5 downloads
 * Tier 2: job duration (30 days default), unlimited (999)
 * Tier 3: 90 days, unlimited (999)
 */
const TIER_RULES: Record<string, { expiryHours: number; maxDownloads: number }> = {
  0: { expiryHours: 24, maxDownloads: 2 },
  1: { expiryHours: 72, maxDownloads: 5 },
  2: { expiryHours: 30 * 24, maxDownloads: 999 },
  3: { expiryHours: 90 * 24, maxDownloads: 999 },
}

export default class FileAccessService {
  /**
   * Create a grant for a manufacturer to access a model file.
   * Grant rules depend on manufacturer's trust tier.
   */
  async createGrant(
    modelFile: ModelFile,
    manufacturerProfile: ManufacturerProfile,
    productionJobId?: string,
    trx?: TransactionClientContract
  ): Promise<FileAccessGrant> {
    const tier = manufacturerProfile.trustTier ?? 0
    const rules = TIER_RULES[tier] || TIER_RULES[0]

    return FileAccessGrant.create(
      {
        modelFileId: modelFile.id,
        manufacturerProfileId: manufacturerProfile.id,
        productionJobId: productionJobId ?? null,
        expiresAt: DateTime.now().plus({ hours: rules.expiryHours }),
        maxDownloads: rules.maxDownloads,
        downloadCount: 0,
      },
      { client: trx }
    )
  }

  /**
   * Validate a grant and return a signed download URL.
   * Atomically increments download_count. Logs access.
   */
  async download(
    grantId: string,
    manufacturerProfileId: string,
    meta: { ipAddress?: string; userAgent?: string } = {}
  ): Promise<{ url: string } | { error: string }> {
    return db.transaction(async (trx) => {
      const grant = await FileAccessGrant.query({ client: trx })
        .where('id', grantId)
        .where('manufacturerProfileId', manufacturerProfileId)
        .preload('modelFile')
        .forUpdate()
        .first()

      if (!grant) {
        return { error: 'Grant not found' }
      }

      if (grant.modelFile.blockedAt) {
        return { error: 'This model was removed by moderation' }
      }

      if (grant.isExpired) {
        return { error: 'Grant expired' }
      }

      if (!grant.hasDownloadsRemaining) {
        return { error: 'Download limit reached' }
      }

      // Increment count atomically
      grant.downloadCount += 1
      grant.useTransaction(trx)
      await grant.save()

      // Log download
      const log = new FileDownloadLog()
      log.grantId = grant.id
      log.manufacturerProfileId = manufacturerProfileId
      log.ipAddress = meta.ipAddress ?? null
      log.userAgent = meta.userAgent ?? null
      log.useTransaction(trx)
      await log.save()

      // Generate signed URL (short-lived, for immediate download)
      const disk = drive.use('s3')
      const url = await disk.getSignedUrl(grant.modelFile.storageKey, {
        expiresIn: '10m',
        // served as a download, never rendered by the browser
        contentType: 'application/octet-stream',
        contentDisposition: `attachment; filename="${grant.modelFile.storageKey.split('/').pop()}"`,
      })

      return { url }
    })
  }

  /**
   * Find active grants for a manufacturer.
   */
  async findActiveGrants(manufacturerProfileId: string): Promise<FileAccessGrant[]> {
    return FileAccessGrant.query()
      .where('manufacturerProfileId', manufacturerProfileId)
      .where('expiresAt', '>', DateTime.now().toSQL()!)
      .whereRaw('download_count < max_downloads')
      .preload('modelFile')
      .orderBy('createdAt', 'desc')
  }

  /**
   * Find a specific grant for a manufacturer.
   */
  async findGrant(grantId: string, manufacturerProfileId: string): Promise<FileAccessGrant | null> {
    return FileAccessGrant.query()
      .where('id', grantId)
      .where('manufacturerProfileId', manufacturerProfileId)
      .first()
  }

  /**
   * Get tier rules for display.
   */
  getTierRules(tier: number): { expiryHours: number; maxDownloads: number } {
    return TIER_RULES[tier] || TIER_RULES[0]
  }
}
