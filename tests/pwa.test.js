import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (f) => readFileSync(new URL(f, root), 'utf8');
const exists = (f) => existsSync(new URL(f.replace(/^\.\//, ''), root));

const precached = () => {
  const list = read('service-worker.js').match(/const SHELL = \[([\s\S]*?)\];/)[1];
  return [...list.matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((f) => f !== './');
};

test('every file precached by the service worker exists', () => {
  const assets = precached();
  assert.ok(assets.length > 0);
  for (const f of assets) assert.ok(exists(f), `${f} is missing`);
});

test('the service worker precaches the app shell, data and imported modules', () => {
  const assets = precached().map((f) => f.replace(/^\.\//, ''));
  const imports = [...read('script.js').matchAll(/from '\.\/([^']+)'/g)].map((m) => m[1]);
  assert.ok(imports.length > 0);
  for (const f of ['index.html', 'style.css', 'script.js', 'excuses.en.json', 'excuses.sr.json', ...imports]) {
    assert.ok(assets.includes(f), `${f} is not precached`);
  }
});

test('every manifest icon exists', () => {
  const manifest = JSON.parse(read('manifest.json'));
  for (const icon of manifest.icons) assert.ok(exists(icon.src), `${icon.src} is missing`);
});

test('index.html has no duplicate ids and links only existing local files', () => {
  const html = read('index.html');
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, 'duplicate id');
  for (const [, href] of html.matchAll(/(?:href|src)="(\.\/[^"]+)"/g)) {
    assert.ok(exists(href), `${href} is missing`);
  }
});
