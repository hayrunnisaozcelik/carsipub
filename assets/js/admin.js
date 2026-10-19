// Menu admin: edit prices and items, bulk price changes, cocktail posters, history.
// Everything is edited in a local draft and goes live only on "Kaydet".
const $ = (s, el = document) => el.querySelector(s);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const KEY = 'pub-admin-pass';
let pass = '';
try { pass = localStorage.getItem(KEY) || ''; } catch {}

// Headers must be ASCII, so the password travels URI-encoded
const api = (path, opts = {}) => fetch(path, { ...opts, headers: { authorization: `Bearer ${encodeURIComponent(pass)}`, ...(opts.json ? { 'content-type': 'application/json' } : {}) }, body: opts.json ? JSON.stringify(opts.json) : opts.body });
const errorText = async (res) => { try { return (await res.json()).error || `Hata (${res.status})`; } catch { return `Hata (${res.status})`; } };

let menu = null, rev = 0, saved = '', tabId = null;
const expanded = new WeakSet();

/* ---------- toast, dirty state ---------- */

let toastTimer;
function toast(text, err) {
  const t = $('#toast');
  t.textContent = text;
  t.classList.toggle('err', Boolean(err));
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
const dirty = () => JSON.stringify(menu) !== saved;
function syncSaveBar() {
  const d = dirty();
  $('#savebar').classList.toggle('dirty', d);
  $('#save-state').textContent = d ? 'Kaydedilmemiş değişiklik var' : 'Tüm değişiklikler sitede';
  $('#save').disabled = !d;
  $('#discard').hidden = !d;
}
addEventListener('beforeunload', (e) => { if (menu && dirty()) e.preventDefault(); });

/* ---------- login ---------- */

async function load() {
  const res = await fetch('/api/menu', { cache: 'no-store' });
  const data = await res.json();
  rev = data.rev || 0;
  menu = { tabs: data.tabs };
  saved = JSON.stringify(menu);
  if (!menu.tabs.some((t) => t.id === tabId)) tabId = menu.tabs[0]?.id;
  render();
  syncSaveBar();
}

function show(loggedIn) {
  $('#login').hidden = loggedIn;
  $('#app').hidden = !loggedIn;
  if (loggedIn) load();
}
function logout(message = '') {
  pass = '';
  try { localStorage.removeItem(KEY); } catch {}
  $('#login-msg').textContent = message;
  show(false);
}
$('#login').addEventListener('submit', async (e) => {
  e.preventDefault();
  pass = $('#pass').value;
  const res = await api('/api/login', { method: 'POST' });
  if (!res.ok) { $('#login-msg').textContent = await errorText(res); return; }
  try { localStorage.setItem(KEY, pass); } catch {}
  $('#pass').value = '';
  show(true);
});
$('#logout').addEventListener('click', () => { if (!dirty() || confirm('Kaydedilmemiş değişiklikler silinsin mi?')) logout(); });

/* ---------- save / discard ---------- */

$('#save').addEventListener('click', async () => {
  const bad = document.querySelectorAll('input.bad');
  if (bad.length) { bad[0].focus(); toast('Eksik ürün adı ya da fiyat var', true); return; }
  $('#save').disabled = true;
  const res = await api('/api/menu', { method: 'PUT', json: { rev, menu } });
  if (res.status === 401) { logout('Şifre değişmiş, tekrar giriş yapın.'); return; }
  if (!res.ok) { toast(await errorText(res), true); syncSaveBar(); return; }
  const data = await res.json();
  rev = data.rev;
  menu = { tabs: data.tabs };
  saved = JSON.stringify(menu);
  render();
  syncSaveBar();
  toast('Kaydedildi, sitede yayında');
});
$('#discard').addEventListener('click', () => { if (confirm('Kaydedilmemiş değişiklikler silinsin mi?')) { menu = JSON.parse(saved); render(); syncSaveBar(); } });

/* ---------- history ---------- */

const dlg = $('#history');
$('#history-close').addEventListener('click', () => dlg.close());
$('#history-btn').addEventListener('click', async () => {
  const res = await api('/api/menu/history');
  if (!res.ok) { toast(await errorText(res), true); return; }
  const list = await res.json();
  const ul = $('#history-list');
  ul.replaceChildren();
  if (!list.length) ul.append(el('li', 'muted', 'Henüz kayıt yok. İlk kaydettiğinizde başlayacak.'));
  for (const h of list) {
    const li = el('li');
    const info = el('div', null, new Date(h.t).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }));
    info.append(el('small', null, h.original ? `İlk menü · ${h.items} ürün` : `${h.items} ürün`));
    const b = el('button', null, 'Bu hâline dön');
    b.type = 'button';
    b.addEventListener('click', async () => {
      if (!confirm('Menü bu kayıttaki hâline dönsün mü? Şu anki hâli de geçmişe eklenir.')) return;
      const r = await api('/api/menu/restore', { method: 'POST', json: { rev: h.rev } });
      if (!r.ok) { toast(await errorText(r), true); return; }
      dlg.close();
      await load();
      toast('Önceki hâline döndü');
    });
    li.append(info, b);
    ul.append(li);
  }
  dlg.showModal();
});

/* ---------- editor ---------- */

const currentTab = () => menu.tabs.find((t) => t.id === tabId);
const change = () => syncSaveBar();
const rerender = () => { render(); syncSaveBar(); };
const posterUrl = (img, sm) => `${img.startsWith('/') ? img : `assets/img/kokteyl/${img}`}${sm ? '-sm' : ''}.jpg`;
const parsePrice = (v) => { const n = Number(String(v).replace(',', '.').replace(/[^\d.]/g, '')); return String(v).trim() === '' || !Number.isFinite(n) ? null : n; };

function input(value, oninput, attrs = {}) {
  const i = el('input');
  Object.assign(i, attrs);
  i.value = value ?? '';
  i.addEventListener('input', () => { oninput(i.value, i); change(); });
  return i;
}

function renderTabs() {
  const nav = $('#tabs');
  nav.replaceChildren(...menu.tabs.map((t) => {
    const b = el('button', `${t.id === tabId ? 'on' : ''} ${t.hidden ? 'off' : ''}`, t.title);
    b.type = 'button';
    b.addEventListener('click', () => { tabId = t.id; render(); scrollTo(0, 0); });
    return b;
  }));
}

function tabSettings(tab) {
  const box = el('section', 'box');
  box.append(el('h2', null, 'Sekme'));
  const title = el('label', null, 'Sekme adı');
  title.append(input(tab.title, (v) => { tab.title = v; renderTabs(); }, { maxLength: 40 }));
  const sw = el('label', 'switch', 'Sitede göster');
  const cb = el('input');
  cb.type = 'checkbox';
  cb.checked = !tab.hidden;
  cb.addEventListener('change', () => { if (cb.checked) delete tab.hidden; else tab.hidden = true; renderTabs(); change(); });
  sw.append(cb);
  box.append(title, sw);
  return box;
}

function bulkBox(tab) {
  const box = el('section', 'box');
  box.append(el('h2', null, 'Toplu fiyat değişikliği'));
  const row = el('div', 'row');
  const pctL = el('label', null, 'Yüzde (zam için 10, indirim için -10)');
  const pct = el('input');
  pct.type = 'number';
  pct.inputMode = 'decimal';
  pct.placeholder = '10';
  pctL.append(pct);
  const rndL = el('label', null, 'Yuvarla');
  const rnd = el('select');
  for (const [v, t] of [['5', "5'e"], ['10', "10'a"], ['25', "25'e"], ['1', 'Yuvarlama']]) rnd.append(new Option(t, v));
  rndL.append(rnd);
  const go = el('button', null, 'Uygula');
  go.type = 'button';
  go.addEventListener('click', () => {
    const p = Number(String(pct.value).replace(',', '.'));
    if (!p) { pct.focus(); return; }
    const step = Number(rnd.value);
    const items = tab.sections.flatMap((s) => s.items);
    if (!confirm(`"${tab.title}" sekmesindeki ${items.length} ürünün fiyatı %${p} ${p > 0 ? 'artırılsın' : 'azaltılsın'} mı? Kaydetmeden önce kontrol edebilirsiniz.`)) return;
    for (const it of items) it.price = Math.max(0, Math.round((it.price * (1 + p / 100)) / step) * step);
    pct.value = '';
    rerender();
    toast('Fiyatlar güncellendi, kontrol edip kaydedin');
  });
  row.append(pctL, rndL, go);
  box.append(row);
  return box;
}

function move(arr, i, d) { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; rerender(); }

// Phone photo → 1280 px poster + 720 px thumbnail, uploaded as JPEG
async function resize(file, max, q) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return new Promise((r) => c.toBlob(r, 'image/jpeg', q));
}

function itemDetails(it, list, i) {
  const box = el('div', 'item-more');
  const kcal = el('label', null, 'Kalori (isteğe bağlı)');
  kcal.append(input(it.kcal, (v) => { const n = parsePrice(v); if (n == null) delete it.kcal; else it.kcal = n; }, { inputMode: 'decimal', placeholder: 'örn. 210' }));
  const sw = el('label', 'switch', 'Menüde göster (kapalıysa "bugün yok")');
  const cb = el('input');
  cb.type = 'checkbox';
  cb.checked = !it.hidden;
  cb.addEventListener('change', () => { if (cb.checked) delete it.hidden; else it.hidden = true; rerender(); });
  sw.append(cb);
  box.append(kcal, sw);

  // Poster, description and flavor bars: what makes an item a Signature card
  const imgRow = el('div', 'img-row');
  if (it.img) { const im = new Image(); im.src = posterUrl(it.img, true); im.alt = ''; imgRow.append(im); }
  const file = el('span', 'file');
  const fb = el('button', null, it.img ? 'Görseli değiştir' : 'Görsel ekle');
  fb.type = 'button';
  const fi = el('input');
  fi.type = 'file';
  fi.accept = 'image/*';
  fi.addEventListener('change', async () => {
    const f = fi.files[0];
    if (!f) return;
    fb.textContent = 'Yükleniyor…';
    try {
      const fd = new FormData();
      fd.append('full', await resize(f, 1280, 0.82), 'full.jpg');
      fd.append('sm', await resize(f, 720, 0.78), 'sm.jpg');
      const res = await api('/api/img', { method: 'POST', body: fd });
      if (!res.ok) throw new Error(await errorText(res));
      it.img = (await res.json()).img;
      rerender();
      toast('Görsel yüklendi, kaydetmeyi unutmayın');
    } catch (e) { toast(e.message || 'Görsel yüklenemedi', true); fb.textContent = 'Görsel ekle'; }
  });
  file.append(fb, fi);
  imgRow.append(file);
  if (it.img) {
    const rm = el('button', 'danger', 'Görseli kaldır');
    rm.type = 'button';
    rm.addEventListener('click', () => { delete it.img; rerender(); });
    imgRow.append(rm);
  }
  box.append(imgRow);

  if (it.img || it.desc || it.bars) {
    const desc = el('label', null, 'Açıklama');
    const ta = el('textarea');
    ta.rows = 2;
    ta.maxLength = 300;
    ta.value = it.desc || '';
    ta.addEventListener('input', () => { if (ta.value.trim()) it.desc = ta.value; else delete it.desc; change(); });
    desc.append(ta);
    box.append(desc);
    const bars = el('div', 'bars');
    bars.append(el('label', null, 'Tat oranları (örn. Tatlı 70, Ekşi 30)'));
    (it.bars || []).forEach((b, k) => {
      const r = el('div', 'bar-row');
      const del = el('button', null, '✕');
      del.type = 'button';
      del.addEventListener('click', () => { it.bars.splice(k, 1); if (!it.bars.length) delete it.bars; rerender(); });
      r.append(input(b[0], (v) => { b[0] = v; }, { maxLength: 20 }), input(b[1], (v) => { b[1] = Number(v) || 0; }, { type: 'number', min: 0, max: 100, inputMode: 'numeric' }), del);
      bars.append(r);
    });
    const addBar = el('button', null, '+ Tat ekle');
    addBar.type = 'button';
    addBar.addEventListener('click', () => { (it.bars ||= []).push(['', 50]); rerender(); });
    bars.append(addBar);
    box.append(bars);
  }

  const actions = el('div', 'actions');
  const btn = (t, f, cls) => { const b = el('button', cls, t); b.type = 'button'; b.addEventListener('click', f); return b; };
  actions.append(
    btn('↑ Yukarı', () => move(list, i, -1)),
    btn('↓ Aşağı', () => move(list, i, 1)),
    btn('Sil', () => { if (confirm(`"${it.name || 'Bu ürün'}" silinsin mi?`)) { list.splice(i, 1); rerender(); } }, 'danger'),
  );
  box.append(actions);
  return box;
}

function itemRow(it, list, i) {
  const li = el('li', `item${it.hidden ? ' off' : ''}`);
  const main = el('div', 'item-main');
  const nameWrap = el('div', 'name-wrap');
  if (it.img) { const im = new Image(); im.className = 'thumb'; im.src = posterUrl(it.img, true); im.alt = ''; nameWrap.append(im); }
  const name = input(it.name, (v, i2) => { it.name = v; i2.classList.toggle('bad', !v.trim()); }, { maxLength: 60, placeholder: 'Ürün adı', ariaLabel: 'Ürün adı' });
  name.classList.toggle('bad', !it.name?.trim());
  nameWrap.append(name);
  if (it.hidden) nameWrap.append(el('span', 'badge', 'yok'));
  const price = input(it.price, (v, i2) => { const n = parsePrice(v); i2.classList.toggle('bad', n == null); if (n != null) it.price = n; }, { inputMode: 'decimal', className: 'price', ariaLabel: 'Fiyat' });
  const more = el('button', 'more', expanded.has(it) ? '▴' : '⋯');
  more.type = 'button';
  more.setAttribute('aria-label', 'Diğer ayarlar');
  more.addEventListener('click', () => { if (expanded.has(it)) expanded.delete(it); else expanded.add(it); render(); });
  main.append(nameWrap, price, more);
  li.append(main);
  if (expanded.has(it)) li.append(itemDetails(it, list, i));
  return li;
}

function sectionBlock(tab, s, si) {
  const wrap = el('section', 'sec');
  const head = el('div', 'sec-head');
  head.append(input(s.title, (v) => { s.title = v; }, { maxLength: 60, ariaLabel: 'Bölüm adı' }));
  const up = el('button', null, '↑'); up.type = 'button'; up.addEventListener('click', () => move(tab.sections, si, -1));
  const del = el('button', 'danger', 'Sil'); del.type = 'button';
  del.addEventListener('click', () => {
    if (s.items.length && !confirm(`"${s.title}" bölümü ve içindeki ${s.items.length} ürün silinsin mi?`)) return;
    tab.sections.splice(si, 1);
    rerender();
  });
  head.append(up, del);
  const ul = el('ul', 'items');
  s.items.forEach((it, i) => ul.append(itemRow(it, s.items, i)));
  const add = el('button', 'add', '+ Ürün ekle');
  add.type = 'button';
  add.addEventListener('click', () => {
    const it = { name: '', price: 0 };
    s.items.push(it);
    rerender();
    // The editor was just redrawn, so look the new row up in the fresh DOM
    const inputs = document.querySelectorAll('#editor .sec')[si].querySelectorAll('.item-main input:not(.price)');
    inputs[inputs.length - 1]?.focus();
  });
  wrap.append(head, ul, add);
  return wrap;
}

function render() {
  renderTabs();
  const tab = currentTab();
  const ed = $('#editor');
  ed.replaceChildren();
  if (!tab) return;
  ed.append(tabSettings(tab), bulkBox(tab));
  tab.sections.forEach((s, si) => ed.append(sectionBlock(tab, s, si)));
  const addSec = el('button', 'add add-sec', '+ Bölüm ekle');
  addSec.type = 'button';
  addSec.addEventListener('click', () => { tab.sections.push({ title: 'Yeni bölüm', items: [] }); rerender(); });
  ed.append(addSec);
}

show(Boolean(pass));
