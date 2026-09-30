import { defineConfig } from '@adonisjs/inertia'
import env from '#start/env'

const inertiaConfig = defineConfig({
  /**
   * Server-side rendering options.
   */
  ssr: {
    /**
     * Pages are rendered on the server so search engines and AI crawlers read real HTML. The
     * browser test suite turns it off (INERTIA_SSR=false): Playwright would click server-rendered
     * buttons before React hydrates them. `npm run ssr:check` covers SSR itself.
     */
    enabled: env.get('INERTIA_SSR', true),

    /**
     * Entry file used by the SSR server build.
     */
    entrypoint: 'inertia/ssr.tsx',
  },
})

export default inertiaConfig
