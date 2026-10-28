// The reader in a browser, against the built site (`npm run build`) served by `vite preview`.
//
// Basic specs, one browser (Puppeteer's Chrome headless shell): each test names what the reader
// does, and routes come from the expected site, never from a handwritten list. Visual design is
// not asserted here; compare it by eye in `npm start`.
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import type { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer';
import type { PreviewServer } from 'vite';
import { preview } from 'vite';
import { expectedSite } from './site.ts';

const editions = await expectedSite();
const english = editions.find((e) => e.lang === 'en')!;
const arabic = editions.find((e) => e.rtl)!;
// The chapters in reading order; index.html repeats the first one.
const chapters = english.pages.slice(1).map((p) => p.file);

/** Wide enough for the two-column spread. */
const DESKTOP = { width: 1440, height: 1000 };

let server: PreviewServer;
let browser: Browser;
let base: string;

before(async () => {
  server = await preview({ preview: { port: 0, open: false }, logLevel: 'silent' });
  base = server.resolvedUrls!.local[0]!.replace(/\/$/, '');
  // No sandbox: CI containers and recent Ubuntu runners do not allow Chrome's.
  browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
});
after(async () => {
  await browser?.close();
  await server?.close();
});

/** A fresh page (empty storage) at `path`, with the reader settled. */
async function open(path: string, world?: 'magic' | 'real'): Promise<Page> {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport(DESKTOP);
  // Page turns without their view transition: in headless Chrome it stalls while Puppeteer
  // evaluates in the page. The reader then turns synchronously, which is what these specs check;
  // the animation is design.
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  if (world) {
    // Preferences are read before first paint, so they are stored on this origin first.
    await page.goto(base + '/404.html');
    await page.evaluate((w) => {
      localStorage.setItem('alux-reader', JSON.stringify({ world: w, bookmarks: [] }));
      sessionStorage.setItem('alux-entered', '1');
    }, world);
  }
  await page.goto(base + '/' + path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return page;
}

const folio = (page: Page) => page.$eval('#folio', (el) => el.textContent ?? '');
const pathname = (page: Page) => page.evaluate(() => location.pathname);
const nextLabel = (page: Page) => page.$eval('#page-next-label', (el) => el.textContent ?? '');

/**
 * Waits until `holds` is true, for state the reader settles after load (fonts, #last-page).
 */
async function until(page: Page, holds: () => Promise<boolean>, timeout = 10_000) {
  for (const end = Date.now() + timeout; !(await holds()); ) {
    if (Date.now() > end) throw new Error(`timed out on ${page.url()}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/** The first chapter whose magic book has more than one spread, with its page. */
async function longChapter(): Promise<{ file: string; page: Page }> {
  for (const file of chapters) {
    const page = await open(file, 'magic');
    if (!(await nextLabel(page)).includes('chapter')) return { file, page };
    await page.browserContext().close();
  }
  throw new Error('no chapter spans more than one spread');
}

describe('the gateway', () => {
  test('greets a first visit to the book and enters the chosen world', async () => {
    const page = await open('index.html');
    assert.equal(await page.$eval('html', (h) => 'gateway' in h.dataset), true);
    await page.click('#gateway [data-world="magic"]');
    assert.equal(await page.$eval('html', (h) => h.dataset.world), 'magic');
    assert.equal(await page.$eval('html', (h) => 'gateway' in h.dataset), false);
    await page.reload();
    assert.equal(await page.$eval('html', (h) => h.dataset.world), 'magic', 'the world is remembered');
    await page.browserContext().close();
  });

  test('does not stand in front of a chapter', async () => {
    const page = await open(chapters[1]!);
    assert.equal(await page.$eval('html', (h) => 'gateway' in h.dataset), false);
    await page.browserContext().close();
  });
});

describe('the magic book', () => {
  test('turns a spread forward and back within a chapter', async () => {
    const { page } = await longChapter();
    const first = await folio(page);
    assert.match(first, /^1–2 \/ \d+$/);
    await page.click('#page-next');
    assert.match(await folio(page), /^3–4 \//);
    await page.click('#page-prev');
    assert.equal(await folio(page), first);
    await page.browserContext().close();
  });

  test('turns past the last spread into the next chapter, and back onto its last spread', async () => {
    const { file, page } = await longChapter();
    const next = chapters[chapters.indexOf(file) + 1]!;
    while (!(await nextLabel(page)).includes('chapter')) await page.click('#page-next');
    await Promise.all([page.waitForNavigation(), page.click('#page-next')]);
    assert.equal(await pathname(page), '/' + next);
    await page.evaluate(() => document.fonts.ready);
    await Promise.all([page.waitForNavigation(), page.click('#page-prev')]);
    assert.equal(await pathname(page), '/' + file);
    await until(page, async () => (await nextLabel(page)).includes('chapter'));
    await page.browserContext().close();
  });

  test('turns pages with the arrow keys, leftwards in a right-to-left edition', async () => {
    const page = await open(`${arabic.lang}/${chapters[0]}`, 'magic');
    assert.equal(await page.$eval('html', (h) => h.dir), 'rtl');
    const first = await folio(page);
    await page.keyboard.press('ArrowLeft');
    assert.notEqual(await folio(page), first);
    await page.browserContext().close();
  });
});

describe('the real world', () => {
  test('shows the chapter as one scrolling column', async () => {
    const page = await open(chapters[0]!, 'real');
    assert.equal(await page.$eval('main.leaves', (m) => getComputedStyle(m).columnCount), 'auto');
    await page.browserContext().close();
  });
});

describe('the language picker', () => {
  test('opens the same chapter in the chosen edition', async () => {
    const chapter = chapters[1]!;
    const page = await open(chapter, 'real');
    const codes = await page.$$eval('.language-picker:first-of-type option', (o) => o.map((x) => (x as HTMLOptionElement).value));
    assert.deepEqual(codes, editions.map((e) => e.lang));
    await Promise.all([page.waitForNavigation(), page.select('.language-picker', 'ja')]);
    assert.equal(await pathname(page), `/ja/${chapter}`);
    assert.equal(await page.$eval('html', (h) => h.lang), 'ja');
    await page.browserContext().close();
  });
});

describe('bookmarks', () => {
  test('are added, listed, closed with Escape and removed', async () => {
    const chapter = chapters[1]!;
    const page = await open(chapter, 'real');
    await page.click('#bookmark-toggle');
    assert.equal(await page.$eval('#bookmark-count', (el) => el.textContent), '1');
    await page.click('#bookmarks-open');
    assert.equal(await page.$eval('#bookmarks', (d) => (d as HTMLDialogElement).open), true);
    assert.equal(await page.$eval('#bookmark-list a', (a) => new URL((a as HTMLAnchorElement).href).pathname), '/' + chapter);
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('#bookmarks', (d) => (d as HTMLDialogElement).open), false);
    await page.click('#bookmarks-open');
    await page.click('#bookmark-list .bookmark-remove');
    assert.equal(await page.$eval('#bookmark-count', (el) => el.textContent), '0');
    await page.click('#bookmarks-close');
    assert.equal(await page.$eval('#bookmarks', (d) => (d as HTMLDialogElement).open), false);
    await page.browserContext().close();
  });
});

describe('every edition', () => {
  // The first chapter of each edition in both worlds: enough to load every script, style and
  // asset the template references.
  for (const edition of editions) {
    for (const world of ['magic', 'real'] as const) {
      test(`${edition.lang} loads in the ${world} world without errors or failed requests`, async () => {
        const context = await browser.createBrowserContext();
        const page = await context.newPage();
        const problems: string[] = [];
        page.on('pageerror', (e) => problems.push(`error: ${e instanceof Error ? e.message : e}`));
        page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
        page.on('requestfailed', (r) => r.url().startsWith(base) && problems.push(`failed: ${r.url()}`));
        page.on('response', (r) => r.url().startsWith(base) && r.status() >= 400 && problems.push(`${r.status()}: ${r.url()}`));
        await page.setViewport(DESKTOP);
        await page.goto(base + '/404.html');
        await page.evaluate((w) => localStorage.setItem('alux-reader', JSON.stringify({ world: w, bookmarks: [] })), world);
        problems.length = 0;
        const path = (edition.lang === 'en' ? '' : edition.lang + '/') + edition.pages[1]!.file;
        await page.goto(base + '/' + path, { waitUntil: 'networkidle0' });
        assert.deepEqual(problems, []);
        await context.close();
      });
    }
  }
});
