export const prerender = false;

import type { APIRoute } from 'astro';
import { PUBLIC_MEDUSA_BACKEND_URL, PUBLIC_MEDUSA_PUBLISHABLE_KEY } from 'astro:env/client';

/**
 * Özel tasarımın sepete eklenebilmesi için Sistem A'da tek seferlik ürün + teklif
 * oluşturan proxy (docs/07, 2026-09-16). Tarayıcı {name, analysis} gönderir; analiz
 * zaten /api/analyze üzerinden doğrulandığı için burada yeniden doğrulanmaz — Sistem
 * A'nın zod middleware'i son savunma hattıdır.
 */
export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ message: 'invalid JSON body' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  let upstream: Response;
  try {
    upstream = await fetch(new URL('/store/custom-designs', PUBLIC_MEDUSA_BACKEND_URL), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-publishable-api-key': PUBLIC_MEDUSA_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
    });
  } catch {
    return new Response(JSON.stringify({ message: 'store service unreachable' }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }

  const text = await upstream.text();
  return new Response(text, { status: upstream.status, headers: { 'content-type': 'application/json' } });
};
