export const prerender = false;

import type { APIRoute } from 'astro';
import { GEOMETRY_SERVICE_KEY, GEOMETRY_URL } from 'astro:env/server';

/**
 * 03-PRD-URETICI-AGI: özel tasarım için anlık malzeme/fiyat tahmini. Geometri servisinin
 * anahtarı (GEOMETRY_SERVICE_KEY) sadece burada, sunucu tarafında kullanılır — tarayıcıya
 * asla gönderilmez (astro.config.mjs'te context:'server', access:'secret').
 */
export const POST: APIRoute = async ({ request }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response(JSON.stringify({ message: 'invalid form data' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  let upstream: Response;
  try {
    upstream = await fetch(new URL('/v1/analyze', GEOMETRY_URL), {
      method: 'POST',
      headers: { 'x-service-key': GEOMETRY_SERVICE_KEY },
      body: form,
    });
  } catch {
    return new Response(JSON.stringify({ message: 'geometry service unreachable' }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }

  const body = await upstream.text();
  return new Response(body, { status: upstream.status, headers: { 'content-type': 'application/json' } });
};
