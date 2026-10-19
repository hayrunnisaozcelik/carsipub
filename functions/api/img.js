// POST multipart {full, sm}: upload a cocktail poster resized on the phone (password required)
import { json, guard } from '../../lib/auth.js';

const isJpeg = (f, max) => f && typeof f !== 'string' && f.type === 'image/jpeg' && f.size > 0 && f.size <= max;

export async function onRequestPost({ request, env }) {
  const denied = guard(request, env);
  if (denied) return denied;
  const form = await request.formData();
  const full = form.get('full'), sm = form.get('sm');
  if (!isJpeg(full, 3 * 1024 * 1024) || !isJpeg(sm, 800 * 1024)) return json({ error: 'Geçersiz görsel' }, 400);
  const id = crypto.randomUUID();
  await env.PUB.put(`img:${id}`, await full.arrayBuffer());
  await env.PUB.put(`img:${id}-sm`, await sm.arrayBuffer());
  return json({ img: `/img/${id}` }, 201);
}
