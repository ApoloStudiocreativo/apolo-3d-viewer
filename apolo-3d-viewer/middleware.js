// middleware.js
import { NextResponse } from 'next/server';

const SENSITIVE = [/^\/models\/.+\.(glb|usdz)$/i, /^\/assets\/audio\/.+\.mp3$/i];

const ALLOWED_UA = [
  /QuickLook/i,                  // iOS Quick Look
  /GoogleApp/i,                  // Scene Viewer intents
  /Google\/(?!.*Chrome)/i
];

export function middleware(req) {
  const url = req.nextUrl;
  const path = url.pathname;
  const isSensitive = SENSITIVE.some(rx => rx.test(path));
  if (!isSensitive) return NextResponse.next();

  const referer = req.headers.get('referer') || '';
  const origin  = req.headers.get('origin') || '';
  const ua      = req.headers.get('user-agent') || '';

  const sameOrigin = referer.startsWith(url.origin) || origin === url.origin;
  const allowUA = ALLOWED_UA.some(rx => rx.test(ua));

  if (sameOrigin || allowUA) return NextResponse.next();

  return new NextResponse('Forbidden', { status: 403 });
}

export const config = {
  matcher: ['/models/:path*', '/assets/audio/:path*']
};
