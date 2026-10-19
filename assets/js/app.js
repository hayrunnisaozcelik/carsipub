// Çarşı Pub: three views switched by the URL hash.
//   (empty) welcome · #menu (or #menu-bira etc. for a tab) · #mac matches & reservation
// Data: data/menu.json, data/maclar.json, data/mekan.json
const $ = (s, el = document) => el.querySelector(s);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const kcal = (k) => (k == null ? '' : `${String(k).replace('.', ',')} kcal`);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const priceEl = (n) => { const s = el('span', 'price', n.toLocaleString('tr-TR')); s.append(el('small', null, '₺')); return s; };
const getJson = (url, fallback) => fetch(url, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : fallback)).catch(() => fallback);

/* ---------- views ---------- */

const views = [...document.querySelectorAll('[data-view]')];
let selectTab = () => {};
function route() {
  const h = location.hash.slice(1);
  const name = h.startsWith('menu') ? 'menu' : h === 'mac' ? 'mac' : 'home';
  views.forEach((v) => { v.hidden = v.dataset.view !== name; });
  if (name === 'menu') selectTab(h.split('-')[1]);
  scrollTo(0, 0);
}

/* ---------- poster viewer ---------- */

const viewer = $('#viewer');
const openPoster = (it) => { $('img', viewer).src = `assets/img/kokteyl/${it.img}.jpg`; $('img', viewer).alt = it.name; viewer.showModal(); };
$('#viewer-close').addEventListener('click', () => viewer.close());
viewer.addEventListener('click', (e) => { if (e.target === viewer) viewer.close(); });

/* ---------- menu ---------- */

function sigCard(it) {
  const card = el('article', 'sig');
  card.id = `k-${it.img}`;
  const imgBtn = el('button', 'sig-img');
  imgBtn.type = 'button';
  imgBtn.setAttribute('aria-label', `${it.name} görselini büyüt`);
  const img = new Image();
  img.src = `assets/img/kokteyl/${it.img}-sm.jpg`;
  img.alt = '';
  img.loading = 'lazy';
  imgBtn.append(img);
  imgBtn.addEventListener('click', () => openPoster(it));
  const body = el('div');
  const top = el('div', 'sig-top');
  top.append(el('h3', null, it.name), priceEl(it.price));
  body.append(top, el('p', null, it.desc || ''));
  if (it.bars) {
    const chips = el('div', 'chips');
    for (const [k, v] of it.bars) { const c = el('span', null, `${k} `); c.append(el('b', null, `%${v}`)); chips.append(c); }
    body.append(chips);
  }
  card.append(imgBtn, body);
  return card;
}

function rows(items) {
  const ul = el('ul', 'rows');
  for (const it of items) {
    const li = el('li');
    li.append(el('span', 'name', it.name), el('span', 'kcal', kcal(it.kcal)), el('span', 'dots'), priceEl(it.price));
    ul.append(li);
  }
  return ul;
}

function section(s) {
  const wrap = el('section', 'sec');
  wrap.append(el('h2', null, s.title));
  const featured = s.items.filter((i) => i.img), rest = s.items.filter((i) => !i.img);
  featured.forEach((it) => wrap.append(sigCard(it)));
  if (rest.length) wrap.append(rows(rest));
  return wrap;
}

function buildMenu(menu, signatures) {
  $('#updated').textContent = menu.updated;
  const nav = $('#tabs'), panels = $('#panels');
  const buttons = new Map();
  for (const t of menu.tabs) {
    const b = el('button', null, t.title);
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.id = `tab-${t.id}`;
    b.setAttribute('aria-controls', `p-${t.id}`);
    b.addEventListener('click', () => { history.replaceState(null, '', `#menu-${t.id}`); select(t.id); scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }); });
    nav.append(b);
    buttons.set(t.id, b);
    const p = el('div', 'panel');
    p.id = `p-${t.id}`;
    p.setAttribute('role', 'tabpanel');
    p.setAttribute('aria-labelledby', b.id);
    if (t.id === 'signature' && signatures.length) {
      const cta = el('button', 'quiz-cta');
      cta.type = 'button';
      cta.append(document.createTextNode('Kararsız mısın? 3 soruda kokteylini bul'), el('span', null, '→'));
      cta.addEventListener('click', openQuiz);
      p.append(cta);
    }
    if (t.note) p.append(el('p', 'panel-note', t.note));
    p.append(...t.sections.map(section));
    panels.append(p);
  }
  function select(id) {
    if (!buttons.has(id)) id = menu.tabs[0].id;
    for (const [tid, b] of buttons) {
      b.setAttribute('aria-selected', tid === id);
      $(`#p-${tid}`).hidden = tid !== id;
    }
    const b = buttons.get(id);
    nav.scrollTo({ left: b.offsetLeft - (nav.clientWidth - b.offsetWidth) / 2, behavior: 'auto' });
  }
  selectTab = select;
}

/* ---------- "Ne içsem?" (inside the Signature tab) ---------- */

const QUIZ = [
  { q: 'Damak tadın nasıl?', opts: [['🍯', 'Tatlı olsun', { tatli: 70 }], ['⚖️', 'Dengeli', { tatli: 50 }], ['🍋', 'Ekşi severim', { tatli: 30 }]] },
  { q: 'Neyle gitsin?', opts: [['☕', 'Kahveli', { kahve: 40 }], ['🍹', 'Ferah, meyveli', { ferah: 25 }], ['🍯', 'Bal gibi yumuşak', { bal: 40 }]] },
  { q: 'Ne kadar sert olsun?', opts: [['🌙', 'Hafif', { sert: -1 }], ['🔥', 'Sert', { sert: 1 }]] },
];
const quiz = $('#quiz'), quizBody = $('#quiz-body');
let picks = [], signatures = [];
const score = (t) => 100 - Math.abs(t.tatli - picks[0].tatli)
  + (picks[1].kahve && t.kahve ? 40 : 0) + (picks[1].ferah && t.ferah ? 25 : 0) + (picks[1].bal && t.bal ? 40 : 0)
  + (picks[2].sert > 0 ? t.sert / 4 : (100 - t.sert) / 4);

function renderQuiz() {
  quizBody.replaceChildren();
  if (picks.length < QUIZ.length) {
    const Q = QUIZ[picks.length];
    $('#quiz-step').textContent = `${picks.length + 1} / ${QUIZ.length}`;
    const opts = el('div', 'opts');
    for (const [emoji, label, val] of Q.opts) {
      const b = el('button');
      b.type = 'button';
      b.append(el('em', null, emoji), document.createTextNode(label));
      b.addEventListener('click', () => { picks.push(val); renderQuiz(); });
      opts.append(b);
    }
    quizBody.append(el('p', 'q', Q.q), opts);
    return;
  }
  const best = signatures.filter((i) => i.taste).sort((a, b) => score(b.taste) - score(a.taste))[0];
  $('#quiz-step').textContent = 'Senin kokteylin';
  const r = el('div', 'result');
  const img = new Image();
  img.src = `assets/img/kokteyl/${best.img}-sm.jpg`;
  img.alt = best.name;
  const row = el('div', 'row');
  const go = el('button', 'primary', 'Menüde gör');
  go.type = 'button';
  go.addEventListener('click', () => {
    quiz.close();
    const card = document.getElementById(`k-${best.img}`);
    card.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    card.classList.remove('hl'); void card.offsetWidth; card.classList.add('hl');
  });
  const again = el('button', null, 'Tekrar');
  again.type = 'button';
  again.addEventListener('click', () => { picks = []; renderQuiz(); });
  row.append(go, again);
  r.append(img, el('h3', null, best.name), el('p', null, best.desc || ''), row);
  quizBody.append(r);
}
function openQuiz() { picks = []; renderQuiz(); quiz.showModal(); }
$('#quiz-close').addEventListener('click', () => quiz.close());
quiz.addEventListener('click', (e) => { if (e.target === quiz) quiz.close(); });

/* ---------- matches & reservation ---------- */

const LIVE_MS = 2 * 60 * 60 * 1000;
const tz = { timeZone: 'Europe/Istanbul' };
const teams = (m) => (m.yer === 'Deplasman' ? `${m.rakip} – Beşiktaş` : `Beşiktaş – ${m.rakip}`);
function whenText(t) {
  if (t <= Date.now()) return 'Şu an oynanıyor';
  const day = (d) => d.toLocaleDateString('tr-TR', tz);
  const hour = t.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', ...tz });
  if (day(t) === day(new Date())) return `Bu akşam ${hour}`;
  if (day(t) === day(new Date(Date.now() + 86400000))) return `Yarın ${hour}`;
  return t.toLocaleString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', ...tz });
}

function buildMatches(fixtures, mekan) {
  const next = $('#next');
  if (fixtures.length) {
    const m = fixtures[0];
    next.append(el('span', 'tag', 'Sıradaki maç'), el('div', 'teams', teams(m)), el('div', 'when', whenText(m.t)), el('div', 'comp', m.turnuva));
    $('#home-next').textContent = `Sıradaki: ${teams(m)} · ${whenText(m.t)}`;
  } else {
    next.classList.add('empty');
    next.append(el('div', 'teams', 'Yakında maç yok'));
  }
  const ul = $('#fixtures');
  for (const m of fixtures.slice(1, 6)) {
    const li = el('li');
    li.append(el('b', null, teams(m)), el('span', null, m.turnuva), el('em', null, whenText(m.t)));
    ul.append(li);
  }
  $('#fixtures-block').hidden = !ul.children.length;

  const sel = $('#res-match');
  for (const m of fixtures.slice(0, 5)) sel.append(new Option(`${teams(m)} · ${whenText(m.t)}`, `${teams(m)} maçı (${whenText(m.t)})`));
  sel.append(new Option('Maç dışında bir akşam', 'maç dışında bir akşam'));

  const wa = (mekan.whatsapp || mekan.telefon || '').replace(/\D/g, '');
  const tel = (mekan.telefon || mekan.whatsapp || '').replace(/\D/g, '');
  $('#pending').hidden = Boolean(wa && tel);
  if (tel) $('#call').href = `tel:+${tel}`;
  else $('#call').addEventListener('click', (e) => e.preventDefault());
  $('#res-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!wa) return;
    const name = $('#res-name').value.trim();
    const text = `Merhaba, ${sel.value} için ${$('#res-people').value} kişilik yer ayırtmak istiyorum.${name ? ` İsim: ${name}` : ''}`;
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  });
}

/* ---------- init ---------- */

async function init() {
  const [menu, fx, mekan] = await Promise.all([
    getJson('data/menu.json', { tabs: [] }),
    getJson('data/maclar.json', { maclar: [] }),
    getJson('data/mekan.json', {}),
  ]);
  const fixtures = (fx.maclar || []).map((m) => ({ ...m, t: new Date(m.tarih) })).filter((m) => m.t.getTime() + LIVE_MS > Date.now()).sort((a, b) => a.t - b.t);
  signatures = menu.tabs.flatMap((t) => t.sections.flatMap((s) => s.items)).filter((i) => i.img);
  buildMenu(menu, signatures);
  buildMatches(fixtures, mekan);
  addEventListener('hashchange', route);
  route();
}
init();
