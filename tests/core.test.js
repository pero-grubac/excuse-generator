import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  idFromHash, langOfId, findById, filterByCategory, pickNext, countUsed,
  dayKey, dailyIndex, excuseOfTheDay, migrateFavorites,
} from '../core.js';

const list = [
  { id: 'en-0001', text: 'A', cat: 'work' },
  { id: 'en-0002', text: 'B', cat: 'home' },
  { id: 'en-0003', text: 'C', cat: 'work' },
  { id: 'en-0004', text: 'D', cat: 'tech' },
];

test('idFromHash reads an excuse id from a location hash', () => {
  assert.equal(idFromHash('#en-0042'), 'en-0042');
  assert.equal(idFromHash('sr-0007'), 'sr-0007');
  assert.equal(idFromHash('#sr-1291'), 'sr-1291');
  for (const bad of ['', '#', '#hello', '#en-42', '#EN-0042', '#en-0042x', '#%E0%A4%A', null, undefined]) {
    assert.equal(idFromHash(bad), null, String(bad));
  }
});

test('langOfId returns the language of an id, only for known languages', () => {
  assert.equal(langOfId('en-0001', ['en', 'sr']), 'en');
  assert.equal(langOfId('sr-0100', ['en', 'sr']), 'sr');
  assert.equal(langOfId('de-0001', ['en', 'sr']), null);
  assert.equal(langOfId(null, ['en', 'sr']), null);
});

test('findById finds an excuse or returns null', () => {
  assert.equal(findById(list, 'en-0003').text, 'C');
  assert.equal(findById(list, 'en-0099'), null);
});

test('filterByCategory keeps one category, "all" keeps everything', () => {
  assert.deepEqual(filterByCategory(list, 'work').map((e) => e.id), ['en-0001', 'en-0003']);
  assert.equal(filterByCategory(list, 'all'), list);
  assert.deepEqual(filterByCategory(list, 'absurd'), []);
});

test('pickNext does not repeat within a pool until it is exhausted', () => {
  const used = new Set();
  const pool = filterByCategory(list, 'work');
  const first = pickNext(pool, used, () => 0);
  const second = pickNext(pool, used, () => 0);
  assert.notEqual(first.id, second.id);
  assert.equal(countUsed(pool, used), 2);
  // Pool exhausted: starts over instead of failing.
  const third = pickNext(pool, used, () => 0.99);
  assert.ok(pool.includes(third));
  assert.equal(countUsed(pool, used), 1);
});

test('pickNext only clears the current pool when it starts over', () => {
  const used = new Set(['en-0002', 'en-0001', 'en-0003']);
  pickNext(filterByCategory(list, 'work'), used, () => 0);
  assert.ok(used.has('en-0002'), 'excuses from other categories stay used');
  assert.equal(pickNext([], used), null);
});

test('dayKey uses the local calendar date', () => {
  assert.equal(dayKey(new Date(2026, 0, 5, 0, 0, 1)), '2026-01-05');
  assert.equal(dayKey(new Date(2026, 11, 31, 23, 59, 59)), '2026-12-31');
});

test('excuse of the day is stable for a day and differs per language', () => {
  const big = Array.from({ length: 500 }, (_, i) => ({ id: `en-${i}`, text: `t${i}`, cat: 'work' }));
  const morning = new Date(2026, 9, 23, 7, 0);
  const night = new Date(2026, 9, 23, 23, 30);
  assert.equal(excuseOfTheDay(big, 'en', morning), excuseOfTheDay(big, 'en', night));

  // Over a month the pick changes from day to day.
  const picks = new Set();
  for (let d = 1; d <= 30; d++) picks.add(excuseOfTheDay(big, 'en', new Date(2026, 5, d)).id);
  assert.ok(picks.size > 20, `only ${picks.size} different excuses in 30 days`);

  assert.notEqual(dailyIndex('2026-10-23', 'en', 1000), dailyIndex('2026-10-23', 'sr', 1000));
  assert.equal(dailyIndex('2026-10-23', 'en', 0), -1);
  assert.equal(excuseOfTheDay([], 'en'), null);
});

test('dailyIndex is in range', () => {
  for (let n = 1; n < 50; n++) {
    const i = dailyIndex(`2026-01-${n}`, 'sr', n);
    assert.ok(i >= 0 && i < n);
  }
});

test('migrateFavorites turns old text favourites into ids', () => {
  assert.deepEqual(migrateFavorites(['C', 'en-0002', 'gone', 'C', 'en-0003'], list), ['en-0003', 'en-0002']);
  assert.deepEqual(migrateFavorites(['en-0001'], list), ['en-0001']);
  assert.deepEqual(migrateFavorites(null, list), []);
});
