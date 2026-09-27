import drive from '@adonisjs/drive/services/main'
import { stripImageMetadata } from '#services/files/image_metadata'

const TYPES_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

/**
 * Rewrites a stored photo without its EXIF/GPS/XMP metadata (review fix 6). Photos go straight
 * from the browser to storage, so this runs when they are registered, before anyone else can see
 * them. A missing object is left for the caller's own existence check.
 */
export async function cleanStoredPhoto(storageKey: string): Promise<void> {
  const disk = drive.use('s3')
  if (!(await disk.exists(storageKey))) return
  const ext = storageKey.split('.').pop()?.toLowerCase() ?? ''
  const contentType = TYPES_BY_EXT[ext]
  if (!contentType) return
  const original = Buffer.from(await disk.getBytes(storageKey))
  const cleaned = stripImageMetadata(original, contentType)
  if (cleaned.equals(original)) return
  await disk.put(storageKey, cleaned, { contentType })
}
