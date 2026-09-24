import { SliceEstimateSchema } from '#database/schema'

export default class SliceEstimate extends SliceEstimateSchema {
  declare status: 'done' | 'failed'
}
