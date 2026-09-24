import DomainError from '#exceptions/domain_error'
import SellerProfile from '#models/seller_profile'

export class BrandingError extends DomainError {}

/** Control characters and angle brackets never belong on a printed card. */
const clean = (text: string) =>
  text
    .replaceAll(/[\p{Cc}<>]/gu, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()

export default class BrandingService {
  async get(userId: number) {
    const profile = await SellerProfile.query().where('userId', userId).firstOrFail()
    return { brandName: profile.brandName, brandMessage: profile.brandMessage }
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
