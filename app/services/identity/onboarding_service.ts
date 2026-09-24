import { randomBytes } from 'node:crypto'
import type User from '#models/user'
import SellerProfile from '#models/seller_profile'
import ManufacturerProfile from '#models/manufacturer_profile'
import RoleService from '#services/identity/role_service'
import EncryptionService from '#services/identity/encryption_service'

interface SellerProfileData {
  businessName: string
  taxId?: string
  isCorporate: boolean
}

interface ManufacturerProfileData {
  city?: string
  country: string
  iban?: string
  taxId?: string
  isCorporate: boolean
}

export default class OnboardingService {
  private roleService = new RoleService()
  private encryption = new EncryptionService()

  async createSellerProfile(user: User, data: SellerProfileData): Promise<SellerProfile> {
    await this.roleService.assignRole(user, 'seller')

    return SellerProfile.create({
      userId: user.id,
      businessName: data.businessName,
      taxIdEnc: data.taxId ? this.encryption.encrypt(data.taxId) : null,
      isCorporate: data.isCorporate,
      status: 'pending',
    })
  }

  async createManufacturerProfile(
    user: User,
    data: ManufacturerProfileData
  ): Promise<ManufacturerProfile> {
    await this.roleService.assignRole(user, 'manufacturer')

    const alias = await this.uniqueAlias()

    return ManufacturerProfile.create({
      userId: user.id,
      publicAlias: alias,
      city: data.city || null,
      country: data.country,
      ibanEnc: data.iban ? this.encryption.encrypt(data.iban) : null,
      taxIdEnc: data.taxId ? this.encryption.encrypt(data.taxId) : null,
      isCorporate: data.isCorporate,
      status: 'pending',
    })
  }

  /** 6 hex characters (16M values) and a check, so two makers can never collide on the unique alias. */
  private async uniqueAlias(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const alias = this.generateAlias()
      if (!(await ManufacturerProfile.findBy('publicAlias', alias))) return alias
    }
    throw new Error('Could not allocate a maker alias')
  }

  private generateAlias(): string {
    const hex = randomBytes(3).toString('hex').toUpperCase()
    return `FM-${hex}`
  }

  async hasCompletedOnboarding(user: User): Promise<boolean> {
    const roles = await this.roleService.getUserRoles(user)
    if (roles.length === 0) return false

    for (const role of roles) {
      if (role === 'seller') {
        const profile = await SellerProfile.findBy('userId', user.id)
        if (!profile) return false
      }
      if (role === 'manufacturer') {
        const profile = await ManufacturerProfile.findBy('userId', user.id)
        if (!profile) return false
      }
    }
    return true
  }
}
