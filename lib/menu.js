// Menu storage and validation. KV keys: "menu" (current, with rev), "menu-history" (previous saves).
export const HISTORY_MAX = 15;
const MAX_BYTES = 300 * 1024;

const str = (v, max) => String(v ?? '').trim().slice(0, max);
const num = (v, min, max) => { const n = Number(v); return Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 100) / 100 : null; };
const slug = (v) => str(v, 40).toLowerCase().replace(/[^a-z0-9-]/g, '') || null;

// Static posters are bare names (assets/img/kokteyl/<name>.jpg); uploaded ones are /img/<uuid>
const imgRef = (v) => { const s = str(v, 60); return /^(\/img\/[0-9a-f-]{36}|[a-z0-9-]{1,40})$/.test(s) ? s : null; };

function cleanItem(it) {
  const name = str(it?.name, 60);
  const price = num(it?.price, 0, 1e6);
  if (!name || price == null) throw new Error(`Ürün adı ve fiyatı gerekli${name ? `: ${name}` : ''}`);
  const out = { name, price };
  const kcal = num(it.kcal, 0, 1e5); if (kcal != null && it.kcal !== '' && it.kcal != null) out.kcal = kcal;
  if (it.hidden) out.hidden = true;
  const img = imgRef(it.img); if (img) out.img = img;
  const desc = str(it.desc, 300); if (desc) out.desc = desc;
  if (Array.isArray(it.bars)) {
    const bars = it.bars.map((b) => [str(b?.[0], 20), num(b?.[1], 0, 100)]).filter(([k, v]) => k && v != null).slice(0, 6);
    if (bars.length) out.bars = bars;
  }
  if (it.taste && typeof it.taste === 'object') {
    const t = {};
    for (const k of ['tatli', 'sert']) { const v = num(it.taste[k], 0, 100); if (v != null) t[k] = v; }
    for (const k of ['kahve', 'ferah', 'bal']) if (it.taste[k]) t[k] = 1;
    if ('tatli' in t) out.taste = t;
  }
  return out;
}

export function cleanMenu(m) {
  if (!m || !Array.isArray(m.tabs) || !m.tabs.length) throw new Error('Menü boş olamaz');
  const ids = new Set();
  const tabs = m.tabs.slice(0, 20).map((t) => {
    const id = slug(t?.id);
    const title = str(t?.title, 40);
    if (!id || !title || ids.has(id)) throw new Error(`Sekme adı eksik ya da tekrar ediyor: ${title || id || '?'}`);
    ids.add(id);
    const sections = (Array.isArray(t.sections) ? t.sections : []).slice(0, 20).map((s) => ({
      title: str(s?.title, 60) || 'Bölüm',
      items: (Array.isArray(s?.items) ? s.items : []).slice(0, 120).map(cleanItem),
    }));
    const tab = { id, title, sections };
    const note = str(t.note, 200); if (note) tab.note = note;
    if (t.hidden) tab.hidden = true;
    return tab;
  });
  const out = { tabs };
  if (JSON.stringify(out).length > MAX_BYTES) throw new Error('Menü çok büyük');
  return out;
}

// "31.07.2026" style date in Istanbul time, shown as "Fiyat değişim tarihi"
export const today = () => new Date().toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', year: 'numeric' });

export async function readMenu(env, request) {
  const stored = env.PUB && (await env.PUB.get('menu', 'json'));
  if (stored) return stored;
  // Nothing saved yet: start from the file shipped with the site
  const res = await env.ASSETS.fetch(new URL('/data/menu.json', request.url));
  const base = await res.json();
  return { ...base, rev: 0 };
}

export async function writeMenu(env, menu, prev) {
  if (prev && prev.rev > 0) {
    const hist = (await env.PUB.get('menu-history', 'json')) || [];
    hist.unshift({ t: prev.savedAt || Date.now(), rev: prev.rev, menu: prev });
    await env.PUB.put('menu-history', JSON.stringify(hist.slice(0, HISTORY_MAX)));
  } else if (prev) {
    // First save ever: keep the original file as the oldest restore point
    await env.PUB.put('menu-history', JSON.stringify([{ t: Date.now(), rev: 0, menu: prev, original: true }]));
  }
  await env.PUB.put('menu', JSON.stringify(menu));
}
