import { ContentReportSchema } from '#database/schema'

export default class ContentReport extends ContentReportSchema {
  declare reason: 'weapon' | 'copyright' | 'unsafe' | 'other'
  declare status: 'open' | 'actioned' | 'dismissed'
}
