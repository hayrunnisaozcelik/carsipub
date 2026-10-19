// POST {rev}: make an older save the current menu again (password required). The current one goes to history.
import { json, guard } from '../../../lib/auth.js';
import { readMenu, writeMenu } from '../../../lib/menu.js';

export async function onRequestPost({ request, env }) {
  const denied = guard(request, env);
  if (denied) return denied;
  const { rev } = (await request.json().catch(() => null)) || {};
  const hist = (await env.PUB.get('menu-history', 'json')) || [];
  const old = hist.find((h) => h.rev === Number(rev));
  if (!old) return json({ error: 'Bu kayıt bulunamadı' }, 404);
  const current = await readMenu(env, request);
  const next = { ...old.menu, rev: (current.rev || 0) + 1, savedAt: Date.now() };
  await writeMenu(env, next, current);
  return json(next);
}
