/* ═══════════════════════════════════════════════════════════════
   excuse.exe — core.js
   Pure helpers (no DOM, no storage) shared by script.js and the tests
   ═══════════════════════════════════════════════════════════════ */

// ── Categories ─────────────────────────────────────────────────────────────
// Order is the order of the filter chips.
export const CATEGORIES = ['work', 'tech', 'home', 'commute', 'mood', 'social', 'absurd'];

// ── Ids and deep links ─────────────────────────────────────────────────────
// Every excuse has an id like "en-0042": language code, dash, number.
const ID_RE = /^([a-z]{2})-\d{4,}$/;

export function isExcuseId(value) {
  return typeof value === 'string' && ID_RE.test(value);
}

// "#sr-0007" → "sr-0007"; anything else → null.
export function idFromHash(hash) {
  let id = String(hash || '').replace(/^#/, '');
  try { id = decodeURIComponent(id).trim(); } catch { return null; }
  return isExcuseId(id) ? id : null;
}

// Language an id belongs to, if it is one of `languages`; otherwise null.
export function langOfId(id, languages) {
  const m = isExcuseId(id) && id.match(ID_RE);
  return m && languages.includes(m[1]) ? m[1] : null;
}

export function findById(list, id) {
  return list.find((e) => e.id === id) || null;
}

// ── Filtering and picking ──────────────────────────────────────────────────
export function filterByCategory(list, cat) {
  return !cat || cat === 'all' ? list : list.filter((e) => e.cat === cat);
}

// Random excuse from `pool` that is not in `used` (a Set of ids). Once every
// excuse in the pool has been shown, the pool's ids are cleared from `used`
// and it starts over. Mutates `used`; returns null for an empty pool.
export function pickNext(pool, used, rand = Math.random) {
  if (!pool.length) return null;
  let fresh = pool.filter((e) => !used.has(e.id));
  if (!fresh.length) {
    pool.forEach((e) => used.delete(e.id));
    fresh = pool;
  }
  const item = fresh[Math.floor(rand() * fresh.length)];
  used.add(item.id);
  return item;
}

// How many excuses of `pool` have been shown already.
export function countUsed(pool, used) {
  return pool.reduce((n, e) => n + (used.has(e.id) ? 1 : 0), 0);
}

// ── Excuse of the day ──────────────────────────────────────────────────────
// Local calendar date as "YYYY-MM-DD".
export function dayKey(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

// 32-bit FNV-1a, enough to spread consecutive days over the list.
function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function dailyIndex(key, lang, length) {
  return length > 0 ? hash(`${key}:${lang}`) % length : -1;
}

// Same excuse for everyone on the same local day, per language.
export function excuseOfTheDay(list, lang, date = new Date()) {
  const i = dailyIndex(dayKey(date), lang, list.length);
  return i < 0 ? null : list[i];
}

// ── Favourites ─────────────────────────────────────────────────────────────
// Favourites used to be stored as excuse texts; now they are ids. Keeps known
// ids, maps old texts to their id, drops anything unknown and duplicates.
export function migrateFavorites(stored, list) {
  if (!Array.isArray(stored)) return [];
  const ids = new Set(list.map((e) => e.id));
  const byText = new Map(list.map((e) => [e.text, e.id]));
  const out = [];
  for (const entry of stored) {
    const id = ids.has(entry) ? entry : byText.get(entry);
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}
