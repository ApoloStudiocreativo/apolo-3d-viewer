// /api/ping.js
export const config = { runtime: 'edge' };

export default function handler() {
  const has = !!process.env.SIGNING_SECRET;
  return new Response(JSON.stringify({ hasSecret: has }), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}
