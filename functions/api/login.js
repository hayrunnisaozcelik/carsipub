// POST: lets the admin page check the password before keeping it on the device
import { json, guard } from '../../lib/auth.js';

export function onRequestPost({ request, env }) {
  return guard(request, env) || json({ ok: true });
}
