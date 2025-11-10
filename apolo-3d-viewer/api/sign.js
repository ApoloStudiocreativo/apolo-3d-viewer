// /api/sign.js
export const config = { runtime: 'edge' };

const MAX_AGE = 60; // segundos de validez

// base64url helper
const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

async function hmacSHA256(keyRaw, data) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(keyRaw), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return b64url(sig);
}

export default async function handler(req) {
  const url = new URL(req.url);
  const f = url.searchParams.get('f') || '';

  // Validaciones
  if (!f.startsWith('/models/') && !f.startsWith('/assets/audio/')) {
    return new Response('Bad Request', { status: 400 });
  }

  // Evita firmar para terceros
  const referer = req.headers.get('referer') || '';
  const sameOrigin = referer.startsWith(url.origin);
  if (!sameOrigin) {
    return new Response('Forbidden', { status: 403 });
  }

  const secret = process.env.SIGNING_SECRET || '';
  if (!secret) return new Response('Server Misconfig', { status: 500 });

  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `${f}|${exp}`;
  const sig = await hmacSHA256(secret, payload);

  const target = new URL(f, url.origin);
  target.searchParams.set('exp', String(exp));
  target.searchParams.set('sig', sig);
  target.searchParams.set('ok', '1'); // evita el rewrite protector en la 2ª petición

  return new Response(JSON.stringify({ url: target.toString(), exp }), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}
