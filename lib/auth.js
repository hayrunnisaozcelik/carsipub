// Shared helpers for the admin API. Data lives in the PUB KV namespace; the password is the ADMIN_PASSWORD secret.

export const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  });

export const configured = (env) => Boolean(env.PUB && env.ADMIN_PASSWORD);

// Password comes URI-encoded in "Authorization: Bearer ..." (headers must be ASCII); compared in constant time
export function authorized(request, env) {
  const pass = env.ADMIN_PASSWORD || '';
  let got = '';
  try { got = decodeURIComponent((request.headers.get('authorization') || '').replace(/^Bearer /, '')); } catch { return false; }
  if (!pass || got.length !== pass.length) return false;
  let diff = 0;
  for (let i = 0; i < pass.length; i++) diff |= pass.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0;
}

// Error response for unconfigured or unauthorized requests, null when allowed
export function guard(request, env) {
  if (!configured(env)) return json({ error: 'Panel henüz ayarlanmadı' }, 503);
  if (!authorized(request, env)) return json({ error: 'Şifre hatalı' }, 401);
  return null;
}
