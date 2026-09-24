import { MaterialSchema } from '#database/schema'

export default class Material extends MaterialSchema {
  declare technology: 'FDM' | 'SLA' | 'SLS'
}
