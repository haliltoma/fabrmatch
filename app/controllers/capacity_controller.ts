import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import CapacityService from '#services/manufacturing/capacity_service'
import PrinterService from '#services/manufacturing/printer_service'
import {
  setSlotValidator,
  weeklyTemplateValidator,
  applyTemplateValidator,
} from '#validators/capacity'

/** pg returns `date` columns as JS Dates (local midnight); the UI needs a plain YYYY-MM-DD. */
function toIsoDate(value: unknown): string {
  if (value instanceof Date) return DateTime.fromJSDate(value).toISODate()!
  return String(value).slice(0, 10)
}

export default class CapacityController {
  async index({ inertia, auth, request }: HttpContext) {
    const user = auth.getUserOrFail()
    await user.load('manufacturerProfile')

    const printerService = new PrinterService()
    const printers = await printerService.listForProfile(user.manufacturerProfile)

    const printerId = String(request.input('printerId') ?? '') || printers[0]?.id
    const capacityService = new CapacityService()

    const today = new Date()
    const from = today.toISOString().split('T')[0]
    const to = new Date(today.getTime() + 28 * 86400000).toISOString().split('T')[0]

    let slots: { date: string; maxMinutes: number; reservedMinutes: number }[] = []
    let template: Record<string, number> = {}

    if (printerId) {
      const rawSlots = await capacityService.getSlots(printerId, from, to)
      slots = rawSlots.map((s) => ({
        date: toIsoDate(s.date),
        maxMinutes: s.maxMinutes,
        reservedMinutes: s.reservedMinutes,
      }))

      const tpl = await capacityService.getWeeklyTemplate(printerId)
      if (tpl) template = tpl.schedule
    }

    return inertia.render('maker/capacity/index', {
      printers: printers.map((p) => ({ id: p.id, name: p.name })),
      selectedPrinterId: printerId,
      slots,
      template,
    })
  }

  async setSlot({ request, response, auth, params, session }: HttpContext) {
    const data = await request.validateUsing(setSlotValidator)
    const user = auth.getUserOrFail()
    await user.load('manufacturerProfile')

    const printerService = new PrinterService()
    const printer = await printerService.findPrinterForProfile(
      params.id,
      user.manufacturerProfile.id
    )
    if (!printer) {
      session.flash('error', 'Printer not found.')
      return response.redirect().toPath('/maker/capacity')
    }

    const capacityService = new CapacityService()
    await capacityService.setSlot(printer.id, data.date, data.maxMinutes)

    session.flash('success', 'Slot updated.')
    return response.redirect().toPath(`/maker/capacity?printerId=${printer.id}`)
  }

  async saveTemplate({ request, response, auth, params, session }: HttpContext) {
    const data = await request.validateUsing(weeklyTemplateValidator)
    const user = auth.getUserOrFail()
    await user.load('manufacturerProfile')

    const printerService = new PrinterService()
    const printer = await printerService.findPrinterForProfile(
      params.id,
      user.manufacturerProfile.id
    )
    if (!printer) {
      session.flash('error', 'Printer not found.')
      return response.redirect().toPath('/maker/capacity')
    }

    const capacityService = new CapacityService()
    const schedule: Record<string, number> = {}
    for (const [day, minutes] of Object.entries(data.schedule)) {
      if (minutes !== undefined && minutes > 0) {
        schedule[day] = minutes
      }
    }
    await capacityService.setWeeklyTemplate(printer, schedule)

    session.flash('success', 'Weekly template saved.')
    return response.redirect().toPath(`/maker/capacity?printerId=${printer.id}`)
  }

  async applyTemplate({ request, response, auth, params, session }: HttpContext) {
    const data = await request.validateUsing(applyTemplateValidator)
    const user = auth.getUserOrFail()
    await user.load('manufacturerProfile')

    const printerService = new PrinterService()
    const printer = await printerService.findPrinterForProfile(
      params.id,
      user.manufacturerProfile.id
    )
    if (!printer) {
      session.flash('error', 'Printer not found.')
      return response.redirect().toPath('/maker/capacity')
    }

    const capacityService = new CapacityService()
    const count = await capacityService.applyTemplate(printer.id, data.from, data.to)

    session.flash('success', `Generated ${count} slots from template.`)
    return response.redirect().toPath(`/maker/capacity?printerId=${printer.id}`)
  }
}
