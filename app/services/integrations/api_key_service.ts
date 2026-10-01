import { createHash, randomBytes } from 'node:crypto'
import DomainError from '#exceptions/domain_error'
import { DateTime } from 'luxon'
import ApiKey from '#models/api_key'
import User from '#models/user'
import RoleService from '#services/identity/role_service'

export class ApiKeyError extends DomainError {}

export const MAX_ACTIVE_KEYS = 5
const KEY_PREFIX = 'fmk_'
const TOUCH_EVERY_MS = 60_000

export const hashKey = (key: string) => createHash('sha256').update(key).digest('hex')

export default class ApiKeyService {
  /** The full key is returned once; only its hash is stored. */
  async create(userId: string, name: string): Promise<{ key: string; record: ApiKey }> {
    const active = await ApiKey.query().where('userId', userId).whereNull('revokedAt')
    if (active.length >= MAX_ACTIVE_KEYS) {
      throw new ApiKeyError(`You can have at most ${MAX_ACTIVE_KEYS} active API keys`)
    }
    const key = `${KEY_PREFIX}${randomBytes(24).toString('hex')}`
    const record = await ApiKey.create({
      userId,
      name: name.trim(),
      prefix: key.slice(0, KEY_PREFIX.length + 6),
      keyHash: hashKey(key),
    })
    return { key, record }
  }

  async list(userId: string) {
    return ApiKey.query().where('userId', userId).orderBy('id', 'desc')
  }

  async revoke(userId: string, id: string): Promise<void> {
    const key = await ApiKey.query().where('id', id).where('userId', userId).first()
    if (!key) throw new ApiKeyError('API key not found')
    if (!key.revokedAt) {
      key.revokedAt = DateTime.now()
      await key.save()
    }
  }

  /** The seller behind a presented key, or null (unknown, revoked, suspended or no longer a seller). */
  async authenticate(presented: string): Promise<{ user: User; key: ApiKey } | null> {
    if (!presented.startsWith(KEY_PREFIX) || presented.length > 100) return null
    const key = await ApiKey.query().where('keyHash', hashKey(presented)).first()
    if (!key || key.revokedAt) return null
    const user = await User.find(key.userId)
    if (!user || user.suspendedAt) return null
    if (!(await new RoleService().hasRole(user, 'seller'))) return null

    // one write a minute at most, not one per request
    if (!key.lastUsedAt || Date.now() - key.lastUsedAt.toMillis() > TOUCH_EVERY_MS) {
      key.lastUsedAt = DateTime.now()
      await key.save()
    }
    return { user, key }
  }
}
