// GET /api/maclar: Beşiktaş fixtures pulled from ESPN's public (unofficial) scoreboard API.
// Cached at the edge for 3 hours; if ESPN fails, falls back to the hand-kept data/maclar.json.
const TEAM_ID = '1895'; // Beşiktaş on ESPN
const LEAGUES = { 'tur.1': 'Süper Lig', 'uefa.europa': 'UEFA Avrupa Ligi', 'uefa.champions': 'UEFA Şampiyonlar Ligi', 'uefa.europa.conf': 'UEFA Konferans Ligi', 'tur.cup': 'Türkiye Kupası' };
const CACHE_SECONDS = 3 * 60 * 60;

// ESPN spells Turkish clubs without Turkish letters
const NAMES = {
  'Istanbul Basaksehir': 'Başakşehir', 'Caykur Rizespor': 'Çaykur Rizespor', 'Eyupspor': 'Eyüpspor', 'Fenerbahce': 'Fenerbahçe',
  'Genclerbirligi': 'Gençlerbirliği', 'Goztepe': 'Göztepe', 'Kasimpasa': 'Kasımpaşa', 'Erzurum BB': 'Erzurumspor', 'Amed SFK': 'Amedspor',
  'Fatih Karagumruk': 'Fatih Karagümrük', 'Antalyaspor': 'Antalyaspor', 'Hapoel Be\'er': 'Hapoel Beer Sheva', 'Hapoel Be\'er Sheva': 'Hapoel Beer Sheva',
};
const trName = (n) => NAMES[n] || n;

async function league(code) {
  const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${code}/teams/${TEAM_ID}/schedule?fixture=true`, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; CarsiPub/1.0)' },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.events || []).flatMap((e) => {
    const c = e.competitions?.[0];
    const us = c?.competitors?.find((x) => x.team?.id === TEAM_ID);
    const them = c?.competitors?.find((x) => x.team?.id !== TEAM_ID);
    if (!us || !them || c.status?.type?.completed) return [];
    return [{ tarih: new Date(e.date).toISOString(), rakip: trName(them.team.displayName), yer: us.homeAway === 'home' ? 'İç saha' : 'Deplasman', turnuva: LEAGUES[code] }];
  });
}

export async function onRequestGet({ request, env, waitUntil }) {
  const cache = caches.default;
  const key = new Request(new URL('/api/maclar', request.url).toString());
  const hit = await cache.match(key);
  if (hit) return hit;

  let maclar = [];
  try {
    maclar = (await Promise.all(Object.keys(LEAGUES).map((c) => league(c).catch(() => [])))).flat();
  } catch {}
  let source = 'espn';
  if (!maclar.length) {
    source = 'yedek';
    try { maclar = (await (await env.ASSETS.fetch(new URL('/data/maclar.json', request.url))).json()).maclar || []; } catch {}
  }
  maclar.sort((a, b) => new Date(a.tarih) - new Date(b.tarih));
  const res = new Response(JSON.stringify({ kaynak: source, guncelleme: new Date().toISOString(), maclar }), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': `public, max-age=${source === 'espn' ? CACHE_SECONDS : 300}` },
  });
  waitUntil(cache.put(key, res.clone()));
  return res;
}
