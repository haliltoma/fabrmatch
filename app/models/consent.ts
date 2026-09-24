import { ConsentSchema } from '#database/schema'

export default class Consent extends ConsentSchema {
  declare kind: 'terms' | 'privacy' | 'marketing_email'
}
