import { UserSessionSchema } from '#database/schema'

export default class UserSession extends UserSessionSchema {
  static selfAssignPrimaryKey = true
}
