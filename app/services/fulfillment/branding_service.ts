import { randomUUID } from 'node:crypto'
import drive from '@adonisjs/drive/services/main'
import DomainError from '#exceptions/domain_error'
import SellerProfile from '#models/seller_profile'

export class BrandingError extends DomainError {}

/** Control characters and angle brackets never belong on a printed card. */
const clean = (text: string) =>
  text
    .replaceAll(/[\p{Cc}<>]/gu, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()

const MAX_LOGO_BYTES = 256 * 1024

/** Raster images only, recognised by their first bytes; SVG can carry script, so it is refused. */
export function logoType(bytes: Buffer): { contentType: string; ext: string } | null {
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { contentType: 'image/png', ext: 'png' }
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: 'image/jpeg', ext: 'jpg' }
  }
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    return { contentType: 'image/webp', ext: 'webp' }
  }
  return null
}

export default class BrandingService {
  async get(userId: number) {
    const profile = await SellerProfile.query().where('userId', userId).firstOrFail()
    return {
      brandName: profile.brandName,
      brandMessage: profile.brandMessage,
      hasLogo: !!profile.logoKey,
    }
  }

  /** Replaces the seller's logo; the old file is removed. */
  async saveLogo(userId: number, bytes: Buffer) {
    if (bytes.length === 0) throw new BrandingError('Choose an image')
    if (bytes.length > MAX_LOGO_BYTES) throw new BrandingError('The logo can be at most 256 KB')
    const type = logoType(bytes)
    if (!type) throw new BrandingError('The logo must be a PNG, JPEG or WebP image')
    const profile = await SellerProfile.query().where('userId', userId).firstOrFail()
    const disk = drive.use('s3')
    const key = `branding/${profile.id}/${randomUUID()}.${type.ext}`
    await disk.put(key, bytes, { contentType: type.contentType })
    const old = profile.logoKey
    profile.logoKey = key
    profile.logoContentType = type.contentType
    await profile.save()
    if (old) await disk.delete(old).catch(() => {})
    return profile
  }

  async removeLogo(userId: number) {
    const profile = await SellerProfile.query().where('userId', userId).firstOrFail()
    if (!profile.logoKey) return
    await drive
      .use('s3')
      .delete(profile.logoKey)
      .catch(() => {})
    profile.logoKey = null
    profile.logoContentType = null
    await profile.save()
  }

  /** The logo as bytes, for the seller's own preview and the packing card. */
  async logo(profile: SellerProfile): Promise<{ bytes: Buffer; contentType: string } | null> {
    if (!profile.logoKey || !profile.logoContentType) return null
    const disk = drive.use('s3')
    if (!(await disk.exists(profile.logoKey))) return null
    return {
      bytes: Buffer.from(await disk.getBytes(profile.logoKey)),
      contentType: profile.logoContentType,
    }
  }

  /** The seller's own name and thank-you line for the parcel. Blank clears it (the neutral slip is used). */
  async save(userId: number, input: { brandName?: string | null; brandMessage?: string | null }) {
    const name = clean(input.brandName ?? '')
    const message = clean(input.brandMessage ?? '')
    if (name.length > 0 && name.length < 2) throw new BrandingError('The brand name is too short')
    if (name.length > 60) throw new BrandingError('The brand name can have at most 60 characters')
    if (message.length > 240) throw new BrandingError('The message can have at most 240 characters')
    if (message.length > 0 && name.length === 0) {
      throw new BrandingError('Add a brand name to go with the message')
    }
    const profile = await SellerProfile.query().where('userId', userId).firstOrFail()
    profile.brandName = name || null
    profile.brandMessage = message || null
    await profile.save()
    return profile
  }
}
