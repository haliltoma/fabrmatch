import { defineConfig } from '@adonisjs/transmit'

const transmitConfig = defineConfig({
  pingInterval: '30s',
  transport: null,
})

export default transmitConfig
