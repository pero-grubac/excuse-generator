import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATEGORIES } from '../core.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const script = read('script.js');

// Language codes and files as configured in script.js.
const languages = [...script.matchAll(/^\s{2}(\w+): \{\s*\n\s*label: '(\w+)',\s*\n\s*file: '\.\/([^']+)'/gm)]
  .map(([, code, label, file]) => ({ code, label, file }));

test('script.js configures at least English and Serbian', () => {
  assert.deepEqual(languages.map((l) => l.code), ['en', 'sr']);
});

test('every language translates "all" and every category', () => {
  for (const { code } of languages) {
    const block = script.slice(script.indexOf(`  ${code}: {`));
    const cats = block.slice(block.indexOf('cats: {'), block.indexOf('},', block.indexOf('cats: {')));
    for (const cat of ['all', ...CATEGORIES]) {
      assert.match(cats, new RegExp(`\\b${cat}:\\s*'[^']+'`), `${code} has no label for ${cat}`);
    }
  }
});

for (const { code, file } of languages) {
  const excuses = JSON.parse(read(file));

  test(`${code}: is a non-empty array of { id, text, cat } objects`, () => {
    assert.ok(Array.isArray(excuses));
    assert.ok(excuses.length > 0);
    for (const e of excuses) {
      assert.deepEqual(Object.keys(e).sort(), ['cat', 'id', 'text'], JSON.stringify(e));
      assert.equal(typeof e.text, 'string');
    }
  });

  test(`${code}: ids are unique and look like "${code}-0001"`, () => {
    const ids = new Set();
    for (const { id } of excuses) {
      assert.match(id, new RegExp(`^${code}-\\d{4}$`));
      assert.ok(!ids.has(id), `duplicate id ${id}`);
      ids.add(id);
    }
  });

  test(`${code}: every category is one of the allowed set`, () => {
    for (const e of excuses) assert.ok(CATEGORIES.includes(e.cat), `${e.id}: unknown category "${e.cat}"`);
    // Every chip in the filter has something behind it.
    for (const cat of CATEGORIES) assert.ok(excuses.some((e) => e.cat === cat), `no "${cat}" excuses`);
  });

  test(`${code}: no blank, untrimmed or duplicate excuses`, () => {
    const seen = new Set();
    for (const { text: e } of excuses) {
      assert.ok(e.trim().length > 0, 'blank excuse');
      assert.equal(e, e.trim(), `untrimmed: "${e}"`);
      const key = e.toLowerCase();
      assert.ok(!seen.has(key), `duplicate: "${e}"`);
      seen.add(key);
    }
  });

  test(`${code}: the "N+" subtitle is not larger than the real count`, () => {
    const block = script.slice(script.indexOf(`  ${code}: {`));
    const claimed = Number(block.match(/subtitle:\s*'(\d+)\+/)[1]);
    assert.ok(excuses.length >= claimed, `claims ${claimed}+, has ${excuses.length}`);
  });
}

test('sr: Serbian excuses are in Latin script', () => {
  const sr = JSON.parse(read('excuses.sr.json'));
  for (const { id, text } of sr) assert.ok(!/[Ѐ-ӿ]/.test(text), `${id} contains Cyrillic: "${text}"`);
});
