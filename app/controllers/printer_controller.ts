import type { HttpContext } from '@adonisjs/core/http'
import PrintProfileService from '#services/catalog/print_profile_service'
import ReferenceCatalogService from '#services/catalog/reference_catalog_service'
import MissedOrdersService from '#services/manufacturing/missed_orders_service'
import PrinterService from '#services/manufacturing/printer_service'
import {
  createPrinterValidator,
  updatePrinterValidator,
  createMaterialValidator,
  updateMaterialValidator,
  profilesValidator,
} from '#validators/printer'

export default class PrinterController {
  async index({ inertia, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    await user.load('manufacturerProfile')
    const service = new PrinterService()
    const printers = await service.listForProfile(user.manufacturerProfile)

    const catalog = new ReferenceCatalogService()
    const [materialOptions, colorOptions] = await Promise.all([
      catalog.listMaterials({ activeOnly: true }),
      catalog.listColors({ activeOnly: true }),
    ])

    // the maker's own region sets the price they are measured against (P2)
    const missed = await new MissedOrdersService().forPrinters(
      printers,
      user.manufacturerProfile.country
    )
    const profileService = new PrintProfileService()
    const allProfiles = await profileService.list({ activeOnly: true })
    const offered = new Map<number, number[]>()
    for (const p of printers) offered.set(p.id, await profileService.offeredIds(p.id))
    const printerModels = await service.listModels()

    return inertia.render('maker/printers/index', {
      profiles: allProfiles.map((p) => ({ id: p.id, name: p.name, technology: p.technology })),
      printerModels: printerModels.map((m) => ({
        id: m.id,
        brand: m.brand,
        model: m.model,
        technology: m.technology,
        buildVolumeXMm: m.buildVolumeXMm,
        buildVolumeYMm: m.buildVolumeYMm,
        buildVolumeZMm: m.buildVolumeZMm,
        enclosed: m.enclosed,
      })),
      catalog: {
        materials: materialOptions.map((m) => ({
          code: m.code,
          name: m.name,
          technology: m.technology,
        })),
        colors: colorOptions.map((c) => ({ name: c.name, hex: c.hex })),
      },
      printers: printers.map((p) => ({
        id: p.id,
        name: p.name,
        technology: p.technology,
        buildVolumeXMm: p.buildVolumeXMm,
        buildVolumeYMm: p.buildVolumeYMm,
        buildVolumeZMm: p.buildVolumeZMm,
        isActive: p.isActive,
        offeredProfileIds: offered.get(p.id) ?? [],
        printerModel: p.printerModel ? `${p.printerModel.brand} ${p.printerModel.model}` : null,
        materials: p.materials.map((m) => ({
          id: m.id,
          material: m.material,
          colors: m.colors,
          pricePerGramMinor: m.pricePerGramMinor,
          currency: m.currency,
          aboveReference: missed.get(m.id) ?? null,
        })),
      })),
    })
  }

  async store({ request, response, auth, session }: HttpContext) {
    const data = await request.validateUsing(createPrinterValidator)
    const user = auth.getUserOrFail()
    await user.load('manufacturerProfile')

    const service = new PrinterService()
    await service.create(user.manufacturerProfile, data)

    session.flash('success', 'Printer added.')
    return response.redirect().toPath('/maker/printers')
  }

  async update({ request, response, auth, params, session }: HttpContext) {
    const data = await request.validateUsing(updatePrinterValidator)
    const user = auth.getUserOrFail()
    await user.load('manufacturerProfile')

    const service = new PrinterService()
    const printer = await service.findPrinterForProfile(params.id, user.manufacturerProfile.id)
    if (!printer) {
      session.flash('error', 'Printer not found.')
      return response.redirect().toPath('/maker/printers')
    }

    await service.update(printer, data)
    session.flash('success', 'Printer updated.')
    return response.redirect().toPath('/maker/printers')
  }

  async toggleActive({ response, auth, params, session }: HttpContext) {
    const user = auth.getUserOrFail()
    await user.load('manufacturerProfile')

    const service = new PrinterService()
    const printer = await service.findPrinterForProfile(params.id, user.manufacturerProfile.id)
    if (!printer) {
      session.flash('error', 'Printer not found.')
      return response.redirect().toPath('/maker/printers')
    }

    if (printer.isActive) {
      await service.deactivate(printer)
    } else {
      await service.activate(printer)
    }

    session.flash('success', printer.isActive ? 'Printer activated.' : 'Printer deactivated.')
    return response.redirect().toPath('/maker/printers')
  }

  async setProfiles({ request, response, auth, params, session }: HttpContext) {
    const { profileIds } = await request.validateUsing(profilesValidator)
    const user = auth.getUserOrFail()
    await user.load('manufacturerProfile')
    const printer = await new PrinterService().findPrinterForProfile(
      params.id,
      user.manufacturerProfile.id
    )
    if (!printer) {
      session.flash('error', 'Printer not found.')
      return response.redirect().toPath('/maker/printers')
    }
    await new PrintProfileService().setOffered(printer.id, printer.technology, profileIds)
    session.flash('success', 'Print profiles saved.')
    return response.redirect().toPath('/maker/printers')
  }

  async storeMaterial({ request, response, auth, params, session }: HttpContext) {
    const data = await request.validateUsing(createMaterialValidator)
    const user = auth.getUserOrFail()
    await user.load('manufacturerProfile')

    const service = new PrinterService()
    const printer = await service.findPrinterForProfile(params.id, user.manufacturerProfile.id)
    if (!printer) {
      session.flash('error', 'Printer not found.')
      return response.redirect().toPath('/maker/printers')
    }

    await service.addMaterial(printer, data)
    session.flash('success', 'Material added.')
    return response.redirect().toPath('/maker/printers')
  }

  async updateMaterial({ request, response, auth, params, session }: HttpContext) {
    const data = await request.validateUsing(updateMaterialValidator)
    const user = auth.getUserOrFail()
    await user.load('manufacturerProfile')

    const service = new PrinterService()
    const printer = await service.findPrinterForProfile(
      params.printerId,
      user.manufacturerProfile.id
    )
    if (!printer) {
      session.flash('error', 'Printer not found.')
      return response.redirect().toPath('/maker/printers')
    }

    const material = printer.materials.find((m) => m.id === Number(params.id))
    if (!material) {
      session.flash('error', 'Material not found.')
      return response.redirect().toPath('/maker/printers')
    }

    await service.updateMaterial(material, data)
    session.flash('success', 'Material updated.')
    return response.redirect().toPath('/maker/printers')
  }

  async destroyMaterial({ response, auth, params, session }: HttpContext) {
    const user = auth.getUserOrFail()
    await user.load('manufacturerProfile')

    const service = new PrinterService()
    const printer = await service.findPrinterForProfile(
      params.printerId,
      user.manufacturerProfile.id
    )
    if (!printer) {
      session.flash('error', 'Printer not found.')
      return response.redirect().toPath('/maker/printers')
    }

    const material = printer.materials.find((m) => m.id === Number(params.id))
    if (!material) {
      session.flash('error', 'Material not found.')
      return response.redirect().toPath('/maker/printers')
    }

    await service.removeMaterial(material)
    session.flash('success', 'Material removed.')
    return response.redirect().toPath('/maker/printers')
  }
}
