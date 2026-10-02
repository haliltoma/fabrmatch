import { ApiKeySchema } from '#database/schema'

/** `read`: look only; `read_write`: also quote, order and cancel (W4) */
export type ApiKeyScope = 'read' | 'read_write'

export default class ApiKey extends ApiKeySchema {
  declare scope: ApiKeyScope
}
