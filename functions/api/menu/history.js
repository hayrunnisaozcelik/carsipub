// GET: list of previous saves (password required)
import { json, guard } from '../../../lib/auth.js';

export async function onRequestGet({ request, env }) {
  const denied = guard(request, env);
  if (denied) return denied;
  const hist = (await env.PUB.get('menu-history', 'json')) || [];
  return json(hist.map((h) => ({ t: h.t, rev: h.rev, original: Boolean(h.original), items: h.menu.tabs.reduce((n, t) => n + t.sections.reduce((m, s) => m + s.items.length, 0), 0) })));
}
