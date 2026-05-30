/* ═══════════════════════════════════════════════════════════════
   excuse.exe — script.js
   Multi-language excuse generator with PWA support
   ═══════════════════════════════════════════════════════════════ */

'use strict';

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
      subtitle:        '1000+ excuses — no judgment',
      btnLabel:        'Generate Excuse',
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
      toastCopied:     '✓ Copied to clipboard',
      toastShared:     '✓ Link copied',
      toastFavAdd:     '✓ Saved',
      toastFavRm:      '✕ Removed',
      toastCleared:    '✕ Cleared',
      toastNeedGen:    'Generate an excuse first',
      excuseWord:      'excuses',
    },
  },
  sr: {
    label: 'SR',
    file: './excuses.sr.json',
    ui: {
      subtitle:        '1000+ izgovora — bez osude',
      btnLabel:        'Generiši izgovor',
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
      toastCopied:     '✓ Kopirano',
      toastShared:     '✓ Link kopiran',
      toastFavAdd:     '✓ Sačuvano',
      toastFavRm:      '✕ Uklonjeno',
      toastCleared:    '✕ Obrisano',
      toastNeedGen:    'Prvo generiši izgovor',
      excuseWord:      'izgovora',
    },
  },
};

// ── State ──────────────────────────────────────────────────────────────────
let currentLang     = localStorage.getItem('eg_lang') || 'en';
let excuses         = [];
let currentExcuse   = null;
let usedIndices     = new Set();
let totalGenerated  = 0;
let favorites       = loadFavs();
let favsOpen        = false;

// ── DOM ────────────────────────────────────────────────────────────────────
const $  = (id) => document.getElementById(id);

const excuseCard      = $('excuseCard');
const emojiEl         = $('emojiDisplay');
const excuseEl        = $('excuseText');
const generateBtn     = $('generateBtn');
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

function applyUI() {
  const ui = LANGUAGES[currentLang].ui;

  $('subtitle').textContent        = ui.subtitle;
  $('btnLabel').textContent        = ui.btnLabel;
  $('copyLabel').textContent       = ui.copyLabel;
  $('shareLabel').textContent      = ui.shareLabel;
  $('cardTag').textContent         = ui.cardTag;
  $('totalLabel').textContent      = ui.totalLabel;
  $('genLabel').textContent        = ui.genLabel;
  $('savedLabel').textContent      = ui.savedLabel;
  $('favsTitle').textContent       = ui.favsTitle;
  $('favsClear').textContent       = ui.favsClear;
  $('favsToggleLabel').textContent = ui.favsToggleLabel;

  if (!currentExcuse) {
    excuseEl.textContent = ui.placeholder;
    excuseEl.classList.add('placeholder');
    emojiEl.classList.remove('visible');
    emojiEl.textContent = '';
  }

  updateFavBtn();
  updateCountBadge();
}

async function switchLang(code) {
  if (code === currentLang) return;
  currentLang    = code;
  localStorage.setItem('eg_lang', code);
  excuses        = [];
  currentExcuse  = null;
  usedIndices    = new Set();
  favorites      = loadFavs();
  totalGenerated = 0;

  generatedCountEl.textContent = 0;
  favCountEl.textContent       = favorites.length;

  // Close favs
  if (favsOpen) toggleFavsPanel(false);

  buildLangSwitcher();
  await loadExcuses();
  applyUI();
  document.documentElement.lang = code;
}

// ── Load excuses ───────────────────────────────────────────────────────────
async function loadExcuses() {
  const ui = LANGUAGES[currentLang].ui;
  counterBadge.textContent = '…';
  try {
    const r = await fetch(LANGUAGES[currentLang].file);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    excuses = await r.json();
  } catch (err) {
    console.warn('Failed to load excuses:', err);
    excuses = [
      currentLang === 'sr'
        ? 'Moj alarm je odlučio da uzme slobodan dan.'
        : 'My alarm clock decided to take a personal day.',
    ];
  }
  totalCountEl.textContent = excuses.length;
  updateCountBadge();
}

function updateCountBadge() {
  const ui = LANGUAGES[currentLang].ui;
  counterBadge.textContent =
    excuses.length ? `${usedIndices.size} / ${excuses.length}` : '— / —';
}

// ── Core: generate ─────────────────────────────────────────────────────────
function pickExcuse() {
  if (usedIndices.size >= excuses.length) usedIndices.clear();
  let idx;
  do { idx = Math.floor(Math.random() * excuses.length); } while (usedIndices.has(idx));
  usedIndices.add(idx);
  return excuses[idx];
}

function generate() {
  if (!excuses.length) return;

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
    currentExcuse = pickExcuse();
    totalGenerated++;
    generatedCountEl.textContent = totalGenerated;
    updateCountBadge();
    updateFavBtn();
    renderFavsIfOpen();

    emojiEl.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    excuseEl.textContent = currentExcuse;
    excuseEl.classList.remove('placeholder');

    requestAnimationFrame(() => {
      emojiEl.classList.add('visible');
      excuseEl.classList.add('visible');
    });

    // Milestone confetti every 10 excuses
    if (totalGenerated % 10 === 0) spawnConfetti();
  }, 80);
}

// ── Copy / Share ───────────────────────────────────────────────────────────
function copy() {
  const ui = LANGUAGES[currentLang].ui;
  if (!currentExcuse) { toast_(ui.toastNeedGen, 'danger'); return; }
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = currentExcuse; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
  };
  (navigator.clipboard
    ? navigator.clipboard.writeText(currentExcuse).catch(fallback)
    : Promise.resolve(fallback())
  ).then(() => toast_(ui.toastCopied, 'accent'));
}

function share() {
  const ui = LANGUAGES[currentLang].ui;
  if (!currentExcuse) { toast_(ui.toastNeedGen, 'danger'); return; }
  if (navigator.share) {
    navigator.share({ title: 'excuse.exe', text: currentExcuse }).catch(() => {});
  } else {
    copy();
    toast_(ui.toastShared, 'accent');
  }
}

// ── Favorites ──────────────────────────────────────────────────────────────
function toggleFavorite() {
  const ui = LANGUAGES[currentLang].ui;
  if (!currentExcuse) { toast_(ui.toastNeedGen, 'danger'); return; }
  const idx = favorites.indexOf(currentExcuse);
  if (idx === -1) {
    favorites.unshift(currentExcuse);
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
  if (!currentExcuse) return;
  const ui    = LANGUAGES[currentLang].ui;
  const isFav = favorites.includes(currentExcuse);
  $('favLabel').textContent = isFav ? ui.unfavLabel : ui.favLabel;
  favBtn.classList.toggle('is-fav', isFav);

  // Swap icon fill
  const path = favBtn.querySelector('path');
  if (path) path.setAttribute('fill', isFav ? 'currentColor' : 'none');
}

function renderFavs() {
  const ui = LANGUAGES[currentLang].ui;
  favsList.innerHTML = '';
  if (!favorites.length) {
    const li = document.createElement('li');
    li.className = 'favs-empty'; li.textContent = ui.favsEmpty;
    favsList.appendChild(li); return;
  }
  favorites.forEach((text) => {
    const li = document.createElement('li');
    li.className = 'fav-item';
    li.textContent = text;
    li.addEventListener('click', () => {
      currentExcuse = text;
      excuseCard.classList.add('has-excuse');
      emojiEl.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      excuseEl.textContent = text;
      excuseEl.classList.remove('placeholder');
      emojiEl.classList.add('visible');
      excuseEl.classList.add('visible');
      updateFavBtn();
    });
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
copyBtn    .addEventListener('click', copy);
shareBtn   .addEventListener('click', share);
favBtn     .addEventListener('click', toggleFavorite);
favsToggle .addEventListener('click', () => toggleFavsPanel());
$('favsClear').addEventListener('click', clearFavs);

document.addEventListener('keydown', (e) => {
  if (e.target !== document.body) return;
  if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); generate(); }
  if (e.code === 'KeyC' && e.metaKey) copy();
});

// ── Init ───────────────────────────────────────────────────────────────────
(async function init() {
  $('footerYear').textContent = new Date().getFullYear();
  document.documentElement.lang = currentLang;

  buildLangSwitcher();
  await loadExcuses();
  applyUI();
  favCountEl.textContent = favorites.length;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./service-worker.js')
        .then((reg) => console.log('[SW] registered', reg.scope))
        .catch((err) => console.warn('[SW] registration failed', err));
    });
  }
})();
