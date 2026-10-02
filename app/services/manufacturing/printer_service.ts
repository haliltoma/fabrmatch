import Printer from '#models/printer'
import PrinterMaterial from '#models/printer_material'
import PrinterModel from '#models/printer_model'
import DomainError from '#exceptions/domain_error'
import PrintProfileService from '#services/catalog/print_profile_service'
import ReferenceCatalogService from '#services/catalog/reference_catalog_service'
import type ManufacturerProfile from '#models/manufacturer_profile'

interface CreatePrinterData {
  name: string
  printerModelId?: string | null
  technology: 'FDM' | 'SLA' | 'SLS'
  buildVolumeXMm: number
  buildVolumeYMm: number
  buildVolumeZMm: number
}

interface CreateMaterialData {
  material: string
  colors: string[]
  /** what the maker pays for the material, per kilogram */
  materialCostPerKgMinor: number
  currency?: string
}

export default class PrinterService {
  private catalog = new ReferenceCatalogService()

  async create(profile: ManufacturerProfile, data: CreatePrinterData): Promise<Printer> {
    if (data.printerModelId) await this.assertModelExists(data.printerModelId)
    const printer = await Printer.create({
      manufacturerProfileId: profile.id,
      ...data,
    })
    await new PrintProfileService().offerAllFor(printer.id, printer.technology)
    return printer
  }

  async update(printer: Printer, data: Partial<CreatePrinterData>): Promise<Printer> {
    if (data.printerModelId) await this.assertModelExists(data.printerModelId)
    printer.merge(data)
    await printer.save()
    return printer
  }

  /** Catalogue machines for the add-printer picker, grouped client-side by brand. */
  async listModels(): Promise<PrinterModel[]> {
    return PrinterModel.query().orderBy('brand', 'asc').orderBy('model', 'asc')
  }

  private async assertModelExists(id: string): Promise<void> {
    const model = await PrinterModel.find(id)
    if (!model) throw new DomainError('Unknown printer model')
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
      .preload('printerModel')
      .orderBy('createdAt', 'desc')
  }

  async addMaterial(printer: Printer, data: CreateMaterialData): Promise<PrinterMaterial> {
    const material = await this.catalog.resolveMaterial(data.material, printer.technology)
    const colors = await this.catalog.resolveColors(data.colors)
    return PrinterMaterial.create({
      printerId: printer.id,
      material,
      colors,
      materialCostPerKgMinor: data.materialCostPerKgMinor,
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

  async findPrinterForProfile(printerId: string, profileId: string): Promise<Printer | null> {
    return Printer.query()
      .where('id', printerId)
      .where('manufacturerProfileId', profileId)
      .preload('materials')
      .first()
  }
}
