import { SettingSchema } from '#database/schema'

export default class Setting extends SettingSchema {
  static selfAssignPrimaryKey = true
  declare value: unknown
}
