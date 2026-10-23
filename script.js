/* ═══════════════════════════════════════════════════════════════
   excuse.exe — script.js
   Multi-language excuse generator with PWA support
   ═══════════════════════════════════════════════════════════════ */

'use strict';

import {
  CATEGORIES, idFromHash, langOfId, findById, filterByCategory,
  pickNext, countUsed, excuseOfTheDay, migrateFavorites,
} from './core.js';

// ── Emoji set ──────────────────────────────────────────────────────────────
const EMOJIS = [
  '🫥','😶‍🌫️','🫠','😵‍💫','🧟','👁','🌀','💀','🤖','👾',
  '🕳️','🧩','⚡','🌑','🪞','🔮','🧲','⛓️','🖤','🎭'
];

// ── Language configuration ─────────────────────────────────────────────────
const LANGUAGES = {
  en: {
    label: 'EN',
    file: './excuses.en.json',
    ui: {
      subtitle:        '1600+ excuses — no judgment',
      btnLabel:        'Generate Excuse',
      dailyLabel:      'Excuse of the day',
      copyLabel:       'Copy',
      shareLabel:      'Share',
      favLabel:        'Save',
      unfavLabel:      'Saved',
      favsToggleLabel: 'Saved Excuses',
      totalLabel:      'Total',
      genLabel:        'Generated',
      savedLabel:      'Saved',
      favsTitle:       'Saved',
      favsClear:       'Clear all',
      favsEmpty:       'No saved excuses yet.',
      placeholder:     'press generate to deploy your excuse',
      cardTag:         'EXCUSE',
      dailyTag:        'EXCUSE OF THE DAY',
      catFilterLabel:  'Category',
      cats: {
        all:     'All',
        work:    'Work',
        tech:    'Tech',
        home:    'Home',
        commute: 'Commute',
        mood:    'Mood',
        social:  'Social',
        absurd:  'Absurd',
      },
      toastCopied:     '✓ Copied to clipboard',
      toastShared:     '✓ Link copied',
      toastFavAdd:     '✓ Saved',
      toastFavRm:      '✕ Removed',
      toastCleared:    '✕ Cleared',
      toastNeedGen:    'Generate an excuse first',
      toastNotFound:   'That excuse does not exist',
      excuseWord:      'excuses',
    },
  },
  sr: {
    label: 'SR',
    file: './excuses.sr.json',
    ui: {
      subtitle:        '1250+ izgovora — bez osude',
      btnLabel:        'Generiši izgovor',
      dailyLabel:      'Izgovor dana',
      copyLabel:       'Kopiraj',
      shareLabel:      'Podeli',
      favLabel:        'Sačuvaj',
      unfavLabel:      'Sačuvano',
      favsToggleLabel: 'Sačuvani izgovori',
      totalLabel:      'Ukupno',
      genLabel:        'Generisano',
      savedLabel:      'Sačuvano',
      favsTitle:       'Sačuvani',
      favsClear:       'Obriši sve',
      favsEmpty:       'Nema sačuvanih izgovora.',
      placeholder:     'pritisni dugme da generišeš izgovor',
      cardTag:         'IZGOVOR',
      dailyTag:        'IZGOVOR DANA',
      catFilterLabel:  'Kategorija',
      cats: {
        all:     'Sve',
        work:    'Posao',
        tech:    'Tehnika',
        home:    'Kuća',
        commute: 'Put',
        mood:    'Raspoloženje',
        social:  'Društvo',
        absurd:  'Apsurd',
      },
      toastCopied:     '✓ Kopirano',
      toastShared:     '✓ Link kopiran',
      toastFavAdd:     '✓ Sačuvano',
      toastFavRm:      '✕ Uklonjeno',
      toastCleared:    '✕ Obrisano',
      toastNeedGen:    'Prvo generiši izgovor',
      toastNotFound:   'Taj izgovor ne postoji',
      excuseWord:      'izgovora',
    },
  },
};

// ── State ──────────────────────────────────────────────────────────────────
let currentLang     = LANGUAGES[localStorage.getItem('eg_lang')] ? localStorage.getItem('eg_lang') : 'en';
let currentCat      = ['all', ...CATEGORIES].includes(localStorage.getItem('eg_cat')) ? localStorage.getItem('eg_cat') : 'all';
let excuses         = [];
let currentExcuse   = null;   // { id, text, cat }
let usedIds         = new Set();
let totalGenerated  = 0;
let favorites       = [];     // excuse ids
let favsOpen        = false;

// ── DOM ────────────────────────────────────────────────────────────────────
const $  = (id) => document.getElementById(id);

const excuseCard      = $('excuseCard');
const emojiEl         = $('emojiDisplay');
const excuseEl        = $('excuseText');
const cardTagEl       = $('cardTag');
const generateBtn     = $('generateBtn');
const dailyBtn        = $('dailyBtn');
const copyBtn         = $('copyBtn');
const shareBtn        = $('shareBtn');
const favBtn          = $('favBtn');
const counterBadge    = $('counterBadge');
const toast           = $('toast');
const totalCountEl    = $('totalCount');
const favCountEl      = $('favCount');
const generatedCountEl= $('generatedCount');
const favsPanel       = $('favsPanel');
const favsList        = $('favsList');
const favsToggle      = $('favsToggle');
const langSwitcher    = $('langSwitcher');
const catFilter       = $('catFilter');

// ── Storage helpers ────────────────────────────────────────────────────────
function loadFavs() {
  try { return JSON.parse(localStorage.getItem(`eg_favs_${currentLang}`) || '[]'); }
  catch { return []; }
}

function saveFavs() {
  localStorage.setItem(`eg_favs_${currentLang}`, JSON.stringify(favorites));
}

// ── Language switcher ──────────────────────────────────────────────────────
function buildLangSwitcher() {
  langSwitcher.innerHTML = '';
  Object.entries(LANGUAGES).forEach(([code, def]) => {
    const btn = document.createElement('button');
    btn.className = 'lang-btn' + (code === currentLang ? ' active' : '');
    btn.textContent = def.label;
    btn.setAttribute('aria-label', `Switch to ${def.label}`);
    btn.setAttribute('aria-pressed', code === currentLang ? 'true' : 'false');
    btn.addEventListener('click', () => switchLang(code));
    langSwitcher.appendChild(btn);
  });
}

// ── Category filter ────────────────────────────────────────────────────────
function buildCatFilter() {
  const ui = LANGUAGES[currentLang].ui;
  catFilter.innerHTML = '';
  catFilter.setAttribute('aria-label', ui.catFilterLabel);
  ['all', ...CATEGORIES].forEach((cat) => {
    const btn = document.createElement('button');
    btn.className = 'cat-chip' + (cat === currentCat ? ' active' : '');
    btn.dataset.cat = cat;
    btn.textContent = ui.cats[cat];
    btn.setAttribute('aria-pressed', cat === currentCat ? 'true' : 'false');
    btn.addEventListener('click', () => setCategory(cat));
    catFilter.appendChild(btn);
  });
}

function setCategory(cat) {
  if (cat === currentCat) return;
  currentCat = cat;
  localStorage.setItem('eg_cat', cat);
  buildCatFilter();
  updateCountBadge();
}

function pool() {
  return filterByCategory(excuses, currentCat);
}

function applyUI() {
  const ui = LANGUAGES[currentLang].ui;

  $('subtitle').textContent        = ui.subtitle;
  $('btnLabel').textContent        = ui.btnLabel;
  $('dailyLabel').textContent      = ui.dailyLabel;
  $('copyLabel').textContent       = ui.copyLabel;
  $('shareLabel').textContent      = ui.shareLabel;
  $('totalLabel').textContent      = ui.totalLabel;
  $('genLabel').textContent        = ui.genLabel;
  $('savedLabel').textContent      = ui.savedLabel;
  $('favsTitle').textContent       = ui.favsTitle;
  $('favsClear').textContent       = ui.favsClear;
  $('favsToggleLabel').textContent = ui.favsToggleLabel;

  if (!currentExcuse) {
    cardTagEl.textContent = ui.cardTag;
    excuseEl.textContent = ui.placeholder;
    excuseEl.classList.add('placeholder');
    emojiEl.classList.remove('visible');
    emojiEl.textContent = '';
  }

  buildCatFilter();
  updateFavBtn();
  updateCountBadge();
}

async function switchLang(code) {
  if (code === currentLang) return;
  currentLang    = code;
  localStorage.setItem('eg_lang', code);
  excuses        = [];
  currentExcuse  = null;
  usedIds        = new Set();
  favorites      = [];
  totalGenerated = 0;

  generatedCountEl.textContent = 0;

  // Close favs
  if (favsOpen) toggleFavsPanel(false);
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);

  buildLangSwitcher();
  await loadExcuses();
  applyUI();
  document.documentElement.lang = code;
}

// ── Load excuses ───────────────────────────────────────────────────────────
async function loadExcuses() {
  counterBadge.textContent = '…';
  try {
    const r = await fetch(LANGUAGES[currentLang].file);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    excuses = await r.json();
  } catch (err) {
    console.warn('Failed to load excuses:', err);
    excuses = [{
      id: `${currentLang}-0001`,
      cat: 'home',
      text: currentLang === 'sr'
        ? 'Moj alarm je odlučio da uzme slobodan dan.'
        : 'My alarm clock decided to take a personal day.',
    }];
  }

  // Favourites were stored as texts before excuses had ids.
  const stored = loadFavs();
  favorites = migrateFavorites(stored, excuses);
  if (JSON.stringify(stored) !== JSON.stringify(favorites)) saveFavs();

  totalCountEl.textContent = excuses.length;
  favCountEl.textContent   = favorites.length;
  updateCountBadge();
}

function updateCountBadge() {
  const list = pool();
  counterBadge.textContent =
    list.length ? `${countUsed(list, usedIds)} / ${list.length}` : '— / —';
}

// ── Showing an excuse ──────────────────────────────────────────────────────
function showExcuse(item, { daily = false } = {}) {
  const ui = LANGUAGES[currentLang].ui;
  currentExcuse = item;
  excuseCard.classList.add('has-excuse');
  excuseCard.classList.toggle('is-daily', daily);
  cardTagEl.textContent = `${daily ? ui.dailyTag : ui.cardTag} · ${ui.cats[item.cat] || item.cat}`;
  emojiEl.textContent = daily ? '☀️' : EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  excuseEl.textContent = item.text;
  excuseEl.classList.remove('placeholder');
  history.replaceState(null, '', `#${item.id}`);
  updateFavBtn();
  renderFavsIfOpen();

  requestAnimationFrame(() => {
    emojiEl.classList.add('visible');
    excuseEl.classList.add('visible');
  });
}

// ── Core: generate ─────────────────────────────────────────────────────────
function generate() {
  const list = pool();
  if (!list.length) return;

  // Button flash
  generateBtn.classList.remove('flash');
  void generateBtn.offsetWidth;
  generateBtn.classList.add('flash');
  setTimeout(() => generateBtn.classList.remove('flash'), 200);

  // Hide text with quick fade
  excuseEl.classList.remove('visible');
  emojiEl.classList.remove('visible');
  excuseCard.classList.add('has-excuse');

  setTimeout(() => {
    const item = pickNext(list, usedIds);
    totalGenerated++;
    generatedCountEl.textContent = totalGenerated;
    updateCountBadge();
    showExcuse(item);

    // Milestone confetti every 10 excuses
    if (totalGenerated % 10 === 0) spawnConfetti();
  }, 80);
}

function showDaily() {
  const item = excuseOfTheDay(excuses, currentLang);
  if (!item) return;
  excuseEl.classList.remove('visible');
  emojiEl.classList.remove('visible');
  setTimeout(() => showExcuse(item, { daily: true }), 80);
}

// ── Deep links (#en-0042) ──────────────────────────────────────────────────
async function openFromHash() {
  const id = idFromHash(location.hash);
  if (!id || id === currentExcuse?.id) return;
  const lang = langOfId(id, Object.keys(LANGUAGES));
  if (lang && lang !== currentLang) await switchLang(lang);
  const item = lang && findById(excuses, id);
  if (!item) {
    toast_(LANGUAGES[currentLang].ui.toastNotFound, 'danger');
    return;
  }
  usedIds.add(item.id);
  updateCountBadge();
  showExcuse(item);
}

function linkTo(item) {
  return `${location.origin}${location.pathname}#${item.id}`;
}

// ── Copy / Share ───────────────────────────────────────────────────────────
function writeClipboard(text) {
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
  };
  return navigator.clipboard
    ? navigator.clipboard.writeText(text).catch(fallback)
    : Promise.resolve(fallback());
}

function copy() {
  const ui = LANGUAGES[currentLang].ui;
  if (!currentExcuse) { toast_(ui.toastNeedGen, 'danger'); return; }
  writeClipboard(currentExcuse.text).then(() => toast_(ui.toastCopied, 'accent'));
}

function share() {
  const ui = LANGUAGES[currentLang].ui;
  if (!currentExcuse) { toast_(ui.toastNeedGen, 'danger'); return; }
  const url = linkTo(currentExcuse);
  if (navigator.share) {
    navigator.share({ title: 'excuse.exe', text: currentExcuse.text, url }).catch(() => {});
  } else {
    writeClipboard(url).then(() => toast_(ui.toastShared, 'accent'));
  }
}

// ── Favorites ──────────────────────────────────────────────────────────────
function toggleFavorite() {
  const ui = LANGUAGES[currentLang].ui;
  if (!currentExcuse) { toast_(ui.toastNeedGen, 'danger'); return; }
  const idx = favorites.indexOf(currentExcuse.id);
  if (idx === -1) {
    favorites.unshift(currentExcuse.id);
    toast_(ui.toastFavAdd, 'accent');
  } else {
    favorites.splice(idx, 1);
    toast_(ui.toastFavRm, 'info');
  }
  saveFavs();
  favCountEl.textContent = favorites.length;
  updateFavBtn();
  renderFavsIfOpen();
}

function updateFavBtn() {
  // With no excuse on screen (e.g. right after a language switch) the button
  // still has to reset its label and state, or it keeps the previous ones.
  const ui    = LANGUAGES[currentLang].ui;
  const isFav = !!currentExcuse && favorites.includes(currentExcuse.id);
  $('favLabel').textContent = isFav ? ui.unfavLabel : ui.favLabel;
  favBtn.classList.toggle('is-fav', isFav);

  // Swap icon fill
  const path = favBtn.querySelector('path');
  if (path) path.setAttribute('fill', isFav ? 'currentColor' : 'none');
}

function renderFavs() {
  const ui = LANGUAGES[currentLang].ui;
  favsList.innerHTML = '';
  const items = favorites.map((id) => findById(excuses, id)).filter(Boolean);
  if (!items.length) {
    const li = document.createElement('li');
    li.className = 'favs-empty'; li.textContent = ui.favsEmpty;
    favsList.appendChild(li); return;
  }
  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'fav-item';
    li.textContent = item.text;
    li.addEventListener('click', () => showExcuse(item));
    favsList.appendChild(li);
  });
}

function renderFavsIfOpen() { if (favsOpen) renderFavs(); }

function toggleFavsPanel(force) {
  favsOpen = typeof force === 'boolean' ? force : !favsOpen;
  favsPanel.classList.toggle('open', favsOpen);
  favsToggle.classList.toggle('open', favsOpen);
  favsToggle.setAttribute('aria-expanded', favsOpen ? 'true' : 'false');
  if (favsOpen) renderFavs();
}

function clearFavs() {
  const ui = LANGUAGES[currentLang].ui;
  if (!favorites.length) return;
  favorites = [];
  saveFavs();
  favCountEl.textContent = 0;
  updateFavBtn();
  renderFavs();
  toast_(ui.toastCleared, 'danger');
}

// ── Toast ──────────────────────────────────────────────────────────────────
let toastTimer;
function toast_(msg, type = '') {
  toast.textContent = msg;
  toast.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

// ── Confetti ───────────────────────────────────────────────────────────────
function spawnConfetti() {
  const colors = ['#c8f135','#ffffff','#4ec9f0','rgba(200,241,53,0.5)'];
  for (let i = 0; i < 24; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-particle';
    const size = 4 + Math.random() * 6;
    p.style.cssText = `
      left:${15 + Math.random() * 70}%;
      top:35%;
      width:${size}px;
      height:${size}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      border-radius:${Math.random() > 0.6 ? '50%' : '1px'};
      animation-delay:${Math.random() * 0.3}s;
      animation-duration:${0.7 + Math.random() * 0.7}s;
    `;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1400);
  }
}

// ── Event listeners ────────────────────────────────────────────────────────
generateBtn.addEventListener('click', generate);
dailyBtn   .addEventListener('click', showDaily);
copyBtn    .addEventListener('click', copy);
shareBtn   .addEventListener('click', share);
favBtn     .addEventListener('click', toggleFavorite);
favsToggle .addEventListener('click', () => toggleFavsPanel());
$('favsClear').addEventListener('click', clearFavs);
window.addEventListener('hashchange', openFromHash);

document.addEventListener('keydown', (e) => {
  if (e.target !== document.body) return;
  if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); generate(); }
  if (e.code === 'KeyC' && e.metaKey) copy();
});

// ── Init ───────────────────────────────────────────────────────────────────
(async function init() {
  $('footerYear').textContent = new Date().getFullYear();

  // A shared link decides the language before anything is loaded.
  const linkLang = langOfId(idFromHash(location.hash), Object.keys(LANGUAGES));
  if (linkLang) {
    currentLang = linkLang;
    localStorage.setItem('eg_lang', linkLang);
  }
  document.documentElement.lang = currentLang;

  buildLangSwitcher();
  await loadExcuses();
  applyUI();
  await openFromHash();

  if ('serviceWorker' in navigator) {
    const register = () => navigator.serviceWorker
      .register('./service-worker.js')
      .then((reg) => console.log('[SW] registered', reg.scope))
      .catch((err) => console.warn('[SW] registration failed', err));
    // Module scripts run after parsing, so the load event may already be over.
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register);
  }
})();
