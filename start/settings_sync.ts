import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import SettingsService from '#services/settings/settings_service'

const SYNC_EVERY_MS = 30_000

// Web and queue-worker processes each hold their own copy of the config; keep them aligned with the DB.
if (!app.inTest) {
  const service = new SettingsService()
  const sync = () =>
    service.syncFromDatabase().catch((error: Error) => {
      logger.warn({ msg: 'settings sync failed', error: error.message })
    })
  app.ready(async () => {
    await sync()
    setInterval(sync, SYNC_EVERY_MS).unref()
  })
}
