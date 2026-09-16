import Medusa from '@medusajs/js-sdk';
import { PUBLIC_MEDUSA_BACKEND_URL, PUBLIC_MEDUSA_PUBLISHABLE_KEY } from 'astro:env/client';

/**
 * Tek SDK örneği — hem build-time (.astro frontmatter, getStaticPaths) hem tarayıcıda
 * (React island'lar) kullanılır. Mercur'un Store API'si genel Medusa Store API'sinin
 * üstüne kurulu; sdk.store.* metotları çoğu uç için çalışır. Mercur'a özgü uçlar
 * (offers, sellers, order-groups) ve Mercur'un satır kalemi ekleme davranışını
 * değiştirdiği yerler (bkz. lib/mercur-custom.ts) `sdk.client.fetch()` ile çağrılır.
 */
export const sdk = new Medusa({
  baseUrl: PUBLIC_MEDUSA_BACKEND_URL,
  publishableKey: PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  debug: import.meta.env.DEV,
});
