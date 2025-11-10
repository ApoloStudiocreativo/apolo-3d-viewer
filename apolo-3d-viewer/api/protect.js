// /api/protect.js
export const config = { runtime: 'edge' };

const ALLOWED_UA = [
  /QuickLook/i,                 // iOS Quick Look
  /GoogleApp/i,                 // Google App (Scene Viewer intents)
  /SceneViewer/i,               // algunos Android reportan esto
  /Google\/(?!.*Chrome)/i       // variantes de Google App
];

export default async function handler(req) {
  const url = new URL(req.url);
  const filePath = url.searchParams.get('f'); // p.ej. /models/obra/obra.glb
  if (!filePath || !filePath.startsWith('/')) {
    return new Response('Bad Request', { status: 400 });
  }

  const referer = req.headers.get('referer') || '';
  const origin  = req.headers.get('origin')  || '';
  const ua      = req.headers.get('user-agent') || '';

  const sameOrigin = referer.startsWith(url.origin) || origin === url.origin;
  const allowedUA  = ALLOWED_UA.some(rx => rx.test(ua));

  if (!sameOrigin && !allowedUA) {
    return new Response('Forbidden', { status: 403 });
  }

  // Proxy al archivo estático interno
  const target = new URL(filePath, url.origin);
  const res = await fetch(target.toString(), {
    headers: { 'Accept': req.headers.get('accept') || '*/*' }
  });

  // Copiamos cabeceras y reforzamos
  const headers = new Headers(res.headers);
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  headers.set('X-Content-Type-Options', 'nosniff');
  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  return new Response(res.body, { status: res.status, headers });
}
