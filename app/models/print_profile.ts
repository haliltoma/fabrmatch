import { PrintProfileSchema } from '#database/schema'

export default class PrintProfile extends PrintProfileSchema {
  declare technology: 'FDM' | 'SLA' | 'SLS'
}
