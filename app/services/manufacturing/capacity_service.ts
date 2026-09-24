import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import CapacitySlot from '#models/capacity_slot'
import WeeklyTemplate from '#models/weekly_template'
import type { WeeklySchedule } from '#models/weekly_template'
import type Printer from '#models/printer'

export default class CapacityService {
  async setSlot(printerId: number, date: string, maxMinutes: number): Promise<CapacitySlot> {
    return CapacitySlot.updateOrCreate({ printerId, date }, { maxMinutes, printerId, date })
  }

  async getSlots(printerId: number, from: string, to: string): Promise<CapacitySlot[]> {
    return CapacitySlot.query()
      .where('printerId', printerId)
      .where('date', '>=', from)
      .where('date', '<=', to)
      .orderBy('date', 'asc')
  }

  /**
   * Atomically reserve minutes on a slot. Uses row-level lock (FOR UPDATE)
   * to prevent double-booking under concurrent requests.
   * Returns true if reservation succeeded, false if insufficient capacity.
   */
  async reserveMinutes(printerId: number, date: string, minutes: number): Promise<boolean> {
    return db.transaction(async (trx) => {
      const slot = await CapacitySlot.query({ client: trx })
        .where('printerId', printerId)
        .where('date', date)
        .forUpdate()
        .first()

      if (!slot) return false
      if (slot.availableMinutes < minutes) return false

      slot.reservedMinutes += minutes
      slot.useTransaction(trx)
      await slot.save()
      return true
    })
  }

  /**
   * Reserve minutes on the earliest slot of a printer inside [from, to] that still has room.
   * Must run inside the caller's transaction; the chosen slot row is locked.
   */
  async reserveInWindow(
    printerId: number,
    from: string,
    to: string,
    minutes: number,
    trx: TransactionClientContract
  ): Promise<CapacitySlot | null> {
    const slot = await CapacitySlot.query({ client: trx })
      .where('printerId', printerId)
      .where('date', '>=', from)
      .where('date', '<=', to)
      .whereRaw('max_minutes - reserved_minutes >= ?', [minutes])
      .orderBy('date', 'asc')
      .forUpdate()
      .first()

    if (!slot) return null
    slot.reservedMinutes += minutes
    await slot.useTransaction(trx).save()
    return slot
  }

  /**
   * Release reserved minutes (e.g., order cancelled).
   */
  async releaseMinutes(printerId: number, date: string, minutes: number): Promise<void> {
    await db.transaction(async (trx) => {
      const slot = await CapacitySlot.query({ client: trx })
        .where('printerId', printerId)
        .where('date', date)
        .forUpdate()
        .first()

      if (!slot) return

      slot.reservedMinutes = Math.max(0, slot.reservedMinutes - minutes)
      slot.useTransaction(trx)
      await slot.save()
    })
  }

  async setWeeklyTemplate(printer: Printer, schedule: WeeklySchedule): Promise<WeeklyTemplate> {
    return WeeklyTemplate.updateOrCreate(
      { printerId: printer.id },
      { printerId: printer.id, schedule }
    )
  }

  async getWeeklyTemplate(printerId: number): Promise<WeeklyTemplate | null> {
    return WeeklyTemplate.query().where('printerId', printerId).first()
  }

  /**
   * Generate capacity slots from weekly template for a date range.
   * Does not overwrite slots that already have reservations.
   */
  async applyTemplate(printerId: number, from: string, to: string): Promise<number> {
    const template = await this.getWeeklyTemplate(printerId)
    if (!template) return 0

    let count = 0
    let current = new Date(from)
    const end = new Date(to)

    while (current <= end) {
      const dayOfWeek = current.getDay().toString()
      const maxMinutes = template.schedule[dayOfWeek]

      if (maxMinutes && maxMinutes > 0) {
        const dateStr = current.toISOString().split('T')[0]
        const existing = await CapacitySlot.query()
          .where('printerId', printerId)
          .where('date', dateStr)
          .first()

        if (!existing) {
          await CapacitySlot.create({
            printerId,
            date: dateStr,
            maxMinutes,
          })
          count++
        } else if (existing.reservedMinutes === 0) {
          existing.maxMinutes = maxMinutes
          await existing.save()
          count++
        }
      }

      current.setDate(current.getDate() + 1)
    }

    return count
  }
}
