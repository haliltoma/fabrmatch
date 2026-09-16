import app from '@adonisjs/core/services/app'
import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

/**
 * Sistem B kendi PostgreSQL veritabanını kullanır (fabrmatch_network); Sistem A'nın
 * veritabanına asla bağlanmaz — iletişim yalnızca docs/09-API-SOZLESMESI.md üzerinden.
 */
const dbConfig = defineConfig({
  connection: 'pg',

  connections: {
    pg: {
      client: 'pg',
      connection: {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD')?.release(),
        database: env.get('DB_DATABASE'),
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
      debug: app.inDev && env.get('LOG_LEVEL') === 'debug',
    },
  },
})

export default dbConfig
