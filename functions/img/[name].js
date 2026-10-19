// Serves uploaded posters: /img/<id>.jpg and /img/<id>-sm.jpg
export async function onRequestGet({ env, params }) {
  const m = /^([0-9a-f-]{36}(?:-sm)?)\.jpg$/.exec(params.name);
  if (!m || !env.PUB) return new Response('Not found', { status: 404 });
  const data = await env.PUB.get(`img:${m[1]}`, 'arrayBuffer');
  if (!data) return new Response('Not found', { status: 404 });
  // Ids are never reused, so the bytes behind a URL never change
  return new Response(data, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable' } });
}
