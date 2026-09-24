import Printer from '#models/printer'
import PrinterMaterial from '#models/printer_material'
import PrintProfileService from '#services/catalog/print_profile_service'
import ReferenceCatalogService from '#services/catalog/reference_catalog_service'
import type ManufacturerProfile from '#models/manufacturer_profile'

interface CreatePrinterData {
  name: string
  technology: 'FDM' | 'SLA' | 'SLS'
  buildVolumeXMm: number
  buildVolumeYMm: number
  buildVolumeZMm: number
}

interface CreateMaterialData {
  material: string
  colors: string[]
  pricePerGramMinor: number
  currency?: string
}

export default class PrinterService {
  private catalog = new ReferenceCatalogService()

  async create(profile: ManufacturerProfile, data: CreatePrinterData): Promise<Printer> {
    const printer = await Printer.create({
      manufacturerProfileId: profile.id,
      ...data,
    })
    await new PrintProfileService().offerAllFor(printer.id, printer.technology)
    return printer
  }

  async update(printer: Printer, data: Partial<CreatePrinterData>): Promise<Printer> {
    printer.merge(data)
    await printer.save()
    return printer
  }

  async deactivate(printer: Printer): Promise<void> {
    printer.isActive = false
    await printer.save()
  }

  async activate(printer: Printer): Promise<void> {
    printer.isActive = true
    await printer.save()
  }

  async listForProfile(profile: ManufacturerProfile): Promise<Printer[]> {
    return Printer.query()
      .where('manufacturerProfileId', profile.id)
      .preload('materials')
      .orderBy('createdAt', 'desc')
  }

  async addMaterial(printer: Printer, data: CreateMaterialData): Promise<PrinterMaterial> {
    const material = await this.catalog.resolveMaterial(data.material, printer.technology)
    const colors = await this.catalog.resolveColors(data.colors)
    return PrinterMaterial.create({
      printerId: printer.id,
      material,
      colors,
      pricePerGramMinor: data.pricePerGramMinor,
      currency: data.currency ?? 'TRY',
    })
  }

  async updateMaterial(
    material: PrinterMaterial,
    data: Partial<CreateMaterialData>
  ): Promise<PrinterMaterial> {
    const changes = { ...data }
    if (data.material !== undefined) {
      await material.load('printer')
      changes.material = await this.catalog.resolveMaterial(
        data.material,
        material.printer.technology
      )
    }
    if (data.colors !== undefined) changes.colors = await this.catalog.resolveColors(data.colors)
    material.merge(changes)
    await material.save()
    return material
  }

  async removeMaterial(material: PrinterMaterial): Promise<void> {
    await material.delete()
  }

  async findPrinterForProfile(printerId: number, profileId: number): Promise<Printer | null> {
    return Printer.query()
      .where('id', printerId)
      .where('manufacturerProfileId', profileId)
      .preload('materials')
      .first()
  }
}
