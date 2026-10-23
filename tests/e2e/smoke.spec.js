// Smoke tests for the main flows: npm run test:e2e
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { excuseOfTheDay } from '../../core.js';

const data = (lang) => JSON.parse(readFileSync(new URL(`../../excuses.${lang}.json`, import.meta.url), 'utf8'));
const en = data('en');
const sr = data('sr');

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.errors = errors;
});

test.afterEach(async ({ page }) => {
  expect(page.errors, 'no JavaScript errors').toEqual([]);
});

const card = (page) => page.locator('#excuseText');
const tag = (page) => page.locator('#cardTag');

test('generates excuses without repeating and links each one', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#totalCount')).toHaveText(String(en.length));

  const seen = new Set();
  for (let i = 1; i <= 3; i++) {
    await page.getByRole('button', { name: 'Generate Excuse' }).click();
    await expect(page.locator('#counterBadge')).toHaveText(`${i} / ${en.length}`);
    const id = (await page.evaluate(() => location.hash)).slice(1);
    const item = en.find((e) => e.id === id);
    expect(item, `hash ${id} is an English excuse`).toBeTruthy();
    await expect(card(page)).toHaveText(item.text);
    seen.add(id);
  }
  expect(seen.size).toBe(3);
  await expect(page.locator('#generatedCount')).toHaveText('3');
});

test('category filter limits generated excuses and is remembered', async ({ page }) => {
  await page.goto('./');
  const tech = en.filter((e) => e.cat === 'tech');
  await page.locator('.cat-chip', { hasText: 'Tech' }).click();
  await expect(page.locator('.cat-chip.active')).toHaveText('Tech');
  await expect(page.locator('#counterBadge')).toHaveText(`0 / ${tech.length}`);

  for (let i = 0; i < 4; i++) {
    await page.locator('#generateBtn').click();
    await expect(tag(page)).toHaveText('EXCUSE · Tech');
    const text = await card(page).textContent();
    expect(tech.some((e) => e.text === text)).toBe(true);
  }
  await expect(page.locator('#counterBadge')).toHaveText(`4 / ${tech.length}`);

  await page.reload();
  await expect(page.locator('.cat-chip.active')).toHaveText('Tech');
  await page.locator('.cat-chip', { hasText: 'All' }).click();
  await expect(page.locator('#counterBadge')).toHaveText(new RegExp(` / ${en.length}$`));
});

test('favourites are saved by id and old text favourites are migrated', async ({ page }) => {
  // A favourite saved by the previous version, as plain text.
  await page.addInitScript((text) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('eg_favs_en', JSON.stringify([text]));
      sessionStorage.setItem('seeded', '1');
    }
  }, en[0].text);
  await page.goto('./');
  await expect(page.locator('#favCount')).toHaveText('1');
  expect(await page.evaluate(() => localStorage.getItem('eg_favs_en'))).toBe(JSON.stringify([en[0].id]));

  await page.locator('#generateBtn').click();
  await expect(card(page)).not.toHaveText(/press generate/);
  const saved = await card(page).textContent();
  await page.locator('#favBtn').click();
  await expect(page.locator('#favLabel')).toHaveText('Saved');
  await expect(page.locator('#favCount')).toHaveText('2');

  await page.reload();
  await page.locator('#favsToggle').click();
  const items = page.locator('.fav-item');
  await expect(items).toHaveText([saved, en[0].text]);
  await items.nth(1).click();
  await expect(card(page)).toHaveText(en[0].text);
  await expect(page.locator('#favLabel')).toHaveText('Saved');
});

test('excuse of the day is the same all day and per language', async ({ page }) => {
  const day = new Date(2026, 9, 23, 9, 30);
  await page.clock.setFixedTime(day);
  await page.goto('./');

  await page.getByRole('button', { name: 'Excuse of the day' }).click();
  await expect(tag(page)).toContainText('EXCUSE OF THE DAY');
  await expect(card(page)).toHaveText(excuseOfTheDay(en, 'en', day).text);

  await page.locator('#generateBtn').click();
  await expect(tag(page)).not.toContainText('OF THE DAY');
  await page.locator('#dailyBtn').click();
  await expect(card(page)).toHaveText(excuseOfTheDay(en, 'en', day).text);

  await page.getByRole('button', { name: 'Switch to SR' }).click();
  await page.getByRole('button', { name: 'Izgovor dana' }).click();
  await expect(tag(page)).toContainText('IZGOVOR DANA');
  await expect(card(page)).toHaveText(excuseOfTheDay(sr, 'sr', day).text);
});

test('a #id link opens that excuse and switches language', async ({ page }) => {
  // Clipboard stub so the share fallback can be checked without permissions.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: async (t) => { window.__copied = t; } },
      configurable: true,
    });
    localStorage.setItem('eg_lang', 'en');
  });
  const target = sr[41];
  await page.goto(`./#${target.id}`);
  await expect(card(page)).toHaveText(target.text);
  await expect(page.locator('html')).toHaveAttribute('lang', 'sr');
  await expect(page.getByRole('button', { name: 'Switch to SR' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Podeli' }).click();
  await expect(page.locator('#toast')).toHaveText('✓ Link kopiran');
  expect(await page.evaluate(() => window.__copied)).toMatch(new RegExp(`/#${target.id}$`));

  // Following a link to the other language inside the app.
  await page.evaluate((id) => { location.hash = id; }, en[9].id);
  await expect(card(page)).toHaveText(en[9].text);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  await page.evaluate(() => { location.hash = 'en-9999'; });
  await expect(page.locator('#toast')).toHaveText('That excuse does not exist');
});

test('switching language translates the UI and loads the other list', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Switch to SR' }).click();
  await expect(page.locator('#subtitle')).toHaveText(/izgovora/);
  await expect(page.locator('#totalCount')).toHaveText(String(sr.length));
  await expect(page.locator('.cat-chip').first()).toHaveText('Sve');
  await expect(page.locator('.cat-chip', { hasText: 'Kuća' })).toBeVisible();

  await page.getByRole('button', { name: 'Generiši izgovor' }).click();
  await expect(tag(page)).toContainText('IZGOVOR · ');
  const text = await card(page).textContent();
  expect(sr.some((e) => e.text === text)).toBe(true);

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'sr');
});
