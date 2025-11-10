// /api/protect.js
export const config = { runtime: 'edge' };

const ALLOWED_UA = [
  /QuickLook/i,
  /GoogleApp|GSA/i,
  /SceneViewer|ARCore|com\.google/i,
  /Android .* Google/i
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

  // ✅ Redirige al asset real con un flag que evita volver a caer aquí
  const target = new URL(filePath, url.origin);
  // conserva query existente y añade ok=1
  if (target.search) target.search += '&ok=1';
  else target.search = '?ok=1';

  return Response.redirect(target.toString(), 307);
}
