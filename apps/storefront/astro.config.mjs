// @ts-check
import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: 'https://fabrmatch.com',
  // Varsayılan: statik (SSG). Sadece `export const prerender = false` işaretli
  // sayfalar (ör. özel tasarım analiz ucu) adaptör üzerinden anlık render edilir.
  // Üretimde 06/01 PRD'nin öngördüğü Cloudflare Workers adaptörüne geçilebilir —
  // iş mantığı değişmez, sadece `adapter` satırı değişir (bkz. docs/07 kararı).
  output: 'static',
  integrations: [react()],
  adapter: node({ mode: 'standalone' }),
  // building-storefronts skill: @medusajs/js-sdk needs to be bundled for Vite's SSR
  // (build-time frontmatter + the one server-rendered route), not left external.
  vite: { ssr: { noExternal: ['@medusajs/js-sdk'] } },
  env: {
    schema: {
      // Vitrin anahtarı — istemci tarafında da kullanılır, gizli değildir
      PUBLIC_MEDUSA_BACKEND_URL: envField.string({ context: 'client', access: 'public' }),
      PUBLIC_MEDUSA_PUBLISHABLE_KEY: envField.string({ context: 'client', access: 'public' }),
      // Sadece sunucu: geometri servisi anahtarı asla tarayıcıya gitmez
      GEOMETRY_URL: envField.string({ context: 'server', access: 'secret' }),
      GEOMETRY_SERVICE_KEY: envField.string({ context: 'server', access: 'secret' }),
    },
  },
});
