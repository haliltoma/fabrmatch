import { PrinterModelSchema } from '#database/schema'
import type { PrinterTechnology } from '#models/printer'

/** A catalogue machine makers pick from when adding a printer (brand, specs, frame). */
export default class PrinterModel extends PrinterModelSchema {
  declare technology: PrinterTechnology
}
