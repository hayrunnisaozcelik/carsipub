// GET: public menu (saved version, or the shipped file until the first save). PUT: save (password required)
import { json, guard } from '../../../lib/auth.js';
import { cleanMenu, readMenu, writeMenu, today } from '../../../lib/menu.js';

export async function onRequestGet({ request, env }) {
  return json(await readMenu(env, request));
}

export async function onRequestPut({ request, env }) {
  const denied = guard(request, env);
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  const current = await readMenu(env, request);
  // Two people editing at once: refuse a save based on an older version instead of overwriting
  if (Number(body?.rev) !== Number(current.rev || 0)) return json({ error: 'Menü bu arada başka yerden değişti. Sayfayı yenileyip tekrar deneyin.' }, 409);
  let clean;
  try { clean = cleanMenu(body?.menu); } catch (e) { return json({ error: e.message }, 400); }
  const pricesChanged = JSON.stringify(clean.tabs.map((t) => t.sections.map((s) => s.items.map((i) => i.price)))) !==
    JSON.stringify(current.tabs.map((t) => t.sections.map((s) => s.items.map((i) => i.price))));
  const next = { ...clean, updated: pricesChanged ? today() : current.updated || today(), rev: (current.rev || 0) + 1, savedAt: Date.now() };
  await writeMenu(env, next, current);
  return json(next);
}
