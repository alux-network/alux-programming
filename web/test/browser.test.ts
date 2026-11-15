// The magic world and the entrance in real browsers, against the built site served by Vite preview.
// The real world is mdBook's own page and is covered by the site test; here it is only the
// destination of the world links. Expectations come from expectedSite() (mdBook's book), never
// from the output. ALUX_BROWSER_PROFILE selects one named profile for diagnosis.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, afterEach, before, describe, test } from 'node:test';
import { chromium, devices, firefox, webkit } from 'playwright';
import type { Browser, BrowserContext, BrowserContextOptions, BrowserType, Page } from 'playwright';
import { preview } from 'vite';
import type { PreviewServer } from 'vite';
import { uiStrings } from '../i18n.ts';
import { expectedSite } from './site.ts';

const editions = await expectedSite();
const english = editions.find((e) => e.lang === 'en')!;
const arabic = editions.find((e) => e.rtl)!;
// index.html repeats the first chapter in mdBook's site; the magic world reads chapters in order.
const chapters = english.pages.slice(1);
const longChapter = 'denotational-design/design.html';
// A chapter with display math, found in its English source.
const mathChapter = chapters.find((c) => readFileSync('src/' + c.file.replace(/\.html$/, '.md'), 'utf8').includes('$'))!.file;

const desktop = { width: 1440, height: 1000 };
const profiles: { name: string; engine: BrowserType; options: BrowserContextOptions }[] = [
  { name: 'chromium-desktop', engine: chromium, options: { viewport: desktop } },
  { name: 'firefox-desktop', engine: firefox, options: { viewport: desktop } },
  { name: 'webkit-desktop', engine: webkit, options: { viewport: desktop } },
  { name: 'tablet-webkit', engine: webkit, options: { ...devices['iPad Mini'] } },
  { name: 'android-chromium', engine: chromium, options: { ...devices['Pixel 7'] } },
  { name: 'iphone-webkit', engine: webkit, options: { ...devices['iPhone 13'] } },
];
const selected = profiles.filter((p) => !process.env.ALUX_BROWSER_PROFILE || p.name === process.env.ALUX_BROWSER_PROFILE);
assert.ok(selected.length, 'ALUX_BROWSER_PROFILE must name an existing profile');

let server: PreviewServer;
let base: string;
before(async () => {
  server = await preview({ preview: { host: '127.0.0.1', port: 0, open: false }, logLevel: 'silent' });
  base = server.resolvedUrls!.local[0]!.replace(/\/$/, '');
});
after(async () => { await server?.close(); });

/** Reads the chapter-local folio once no fold is running: first and last page and the page count. */
async function folio(page: Page) {
  await page.waitForFunction(() => /\d+ \/ \d+$/.test(document.getElementById('folio')?.textContent ?? '') &&
    !document.querySelector('.volume[data-paper-turning]'));
  const match = (await page.locator('#folio').innerText()).match(/ · (\d+)(?:–(\d+))? \/ (\d+)$/);
  assert.ok(match);
  return { first: Number(match[1]), last: Number(match[2] ?? match[1]), total: Number(match[3]) };
}

/** Waits until fonts have loaded and the chapter has been placed after them. */
async function settled(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}

/** Waits for the current chapter to be laid out and placed (chapter.ts names it in data-chapter-ready). */
async function chapterReady(page: Page) {
  await page.waitForFunction(() => document.documentElement.dataset.chapterReady === location.pathname && !document.querySelector('.volume[data-paper-turning]'));
  await settled(page);
}

/** Opens a magic-world route and waits for its chapter. */
async function read(page: Page, path: string) {
  await page.goto(`${base}/magic/${path}`);
  await chapterReady(page);
}

/** Opens the sidebar on narrow screens, where it starts closed. */
async function sidebar(page: Page) {
  if (await page.locator('#sidebar-toggle').getAttribute('aria-expanded') === 'false') await page.click('#sidebar-toggle');
}

for (const profile of selected) {
  describe(profile.name, { concurrency: false }, () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    const problems: string[] = [];
    before(async () => { browser = await profile.engine.launch({ headless: true }); });
    after(async () => { await browser?.close(); });
    afterEach(async () => {
      await context?.close();
      assert.deepEqual(problems.splice(0), [], 'no page errors');
    });

    /** A fresh visitor; the country lookup answers `country` and media playback is recorded. */
    async function visit(country = 'US') {
      context = await browser.newContext(profile.options);
      await context.route('https://api.country.is/**', (route) => route.fulfill({ json: { country } }));
      await context.addInitScript(() => {
        const plays: string[] = [];
        (window as any).plays = plays;
        HTMLMediaElement.prototype.play = function () {
          plays.push(this.src);
          Object.defineProperty(this, 'paused', { configurable: true, value: false });
          this.dispatchEvent(new Event('play'));
          return Promise.resolve();
        };
        HTMLMediaElement.prototype.pause = function () {
          Object.defineProperty(this, 'paused', { configurable: true, value: true });
          this.dispatchEvent(new Event('pause'));
        };
      });
      page = await context.newPage();
      page.on('pageerror', (error) => problems.push('error: ' + error.message));
      page.on('console', (message) => { if (message.type() === 'error') problems.push('console: ' + message.text()); });
      return page;
    }
    const plays = () => page.evaluate(() => (window as any).plays as string[]);

    test('/magic/ opens the entrance of the visitor country edition', async () => {
      await visit('DE');
      await page.goto(base + '/magic/');
      await page.waitForURL(base + '/magic/de/');
      assert.equal(await page.locator('[data-world="magic"] strong').innerText(), uiStrings.de!['Magic world']);
      assert.equal(await page.evaluate(() => document.documentElement.lang), 'de');
    });

    test('the entrance plays the welcome only when asked and enters either world', async () => {
      await visit();
      await page.goto(base + '/magic/en/');
      await page.locator('#gateway').waitFor();
      await page.mouse.click(5, 5);
      await page.keyboard.press('Shift');
      assert.deepEqual(await plays(), [], 'neither loading nor interaction starts the welcome');
      await page.click('#welcome-play');
      assert.ok((await plays()).some((src) => src.endsWith('/audio/welcome/en.mp3')), 'its button plays the welcome');
      await page.locator('[data-world="magic"]').click();
      await page.waitForURL(base + '/magic/en/index.html');
      await chapterReady(page);
      assert.equal(await page.locator('#welcome-audio').count(), 0, 'the narration leaves with the entrance');
      assert.ok((await plays()).some((src) => src.endsWith('/audio/forest-breath.mp3')), 'magic entry starts the reading music');

      await page.goto(base + '/magic/en/');
      await page.locator('[data-world="real"]').click();
      await page.waitForURL(base + '/index.html');
      assert.equal(await page.locator('.menu-title a').getAttribute('href'), '/magic/en/', 'the real title leads back to the entrance');
    });

    test('every edition lists its chapters in mdBook order with its language and direction', async () => {
      await visit();
      for (const edition of editions) {
        await read(page, `${edition.lang}/${edition.pages[1]!.file}`);
        assert.equal(await page.evaluate(() => document.documentElement.lang), edition.lang);
        assert.equal(await page.evaluate(() => document.documentElement.dir), edition.rtl ? 'rtl' : 'ltr');
        const toc = await page.locator('#sidebar .chapter a').allTextContents();
        assert.deepEqual(toc.map((s) => s.trim()), edition.pages.slice(1).map((p) => p.title));
        assert.deepEqual((await page.locator('#sidebar .part-title').allTextContents()).map((s) => s.trim()), edition.parts);
      }
    });

    test('turning pages moves through the chapter and on into the next one', async () => {
      await visit();
      const at = chapters.findIndex((c) => c.file === longChapter);
      await read(page, 'en/' + longChapter);
      const start = await folio(page);
      assert.equal(start.first, 1);
      assert.ok(start.total > start.last, 'the chapter is longer than one spread');
      await page.click('#page-next');
      await page.waitForFunction((last) => document.getElementById('folio')!.textContent!.includes(' ' + (last + 1)), start.last);
      assert.equal((await folio(page)).first, start.last + 1);
      await page.click('#page-prev');
      assert.deepEqual(await folio(page), start);
      for (let i = 0; i < 100 && page.url().endsWith(longChapter); i++) { await folio(page); await page.click('#page-next'); }
      await page.waitForURL(`${base}/magic/en/${chapters[at + 1]!.file}`);
      await chapterReady(page);
      await page.click('#page-prev');
      await page.waitForURL(`${base}/magic/en/${longChapter}#last-page`);
      await chapterReady(page);
      const end = await folio(page);
      assert.equal(end.last, end.total, 'turning back opens the previous chapter at its end');
    });

    test('arrow keys turn forward in reading direction', async () => {
      await visit();
      await read(page, 'en/' + longChapter);
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(() => !/ · 1–/.test(document.getElementById('folio')!.textContent!));
      assert.ok((await folio(page)).first > 1);
      await read(page, `${arabic.lang}/${longChapter}`);
      await page.keyboard.press('ArrowLeft');
      await page.waitForFunction(() => !/ · 1–/.test(document.getElementById('folio')!.textContent!));
      assert.ok((await folio(page)).first > 1, 'right-to-left books turn forward with the left arrow');
    });

    test('the position, text size and reading mode are remembered', async () => {
      await visit();
      await read(page, 'en/' + longChapter);
      await page.click('#page-next');
      await folio(page);
      await page.click('#page-next');
      const before = await folio(page);
      await read(page, 'en/' + longChapter);
      assert.deepEqual(await folio(page), before, 'reopening the chapter restores its spread');

      const size = () => page.locator('main.leaves p').first().evaluate((p) => parseFloat(getComputedStyle(p).fontSize));
      const normal = await size();
      await page.click('#text-larger');
      assert.ok(await size() > normal);
      await page.click('#reading-mode');
      assert.equal(await page.evaluate(() => document.documentElement.dataset.reading), 'scroll');
      await read(page, 'en/' + longChapter);
      assert.ok(await size() > normal);
      assert.equal(await page.evaluate(() => document.documentElement.dataset.reading), 'scroll', 'continuous reading is remembered');
    });

    test('chapter links are app routes with plain browser history', async () => {
      await visit();
      await read(page, 'en/index.html');
      const link = page.locator('main.leaves a[href$=".html"]:not([href*=":"])').first();
      const href = new URL(await link.evaluate((a: HTMLAnchorElement) => a.href)).pathname;
      await page.evaluate(() => { (window as any).same = true; });
      await link.evaluate((a: HTMLAnchorElement) => a.click());
      await page.waitForURL(base + href);
      await chapterReady(page);
      assert.equal(await page.evaluate(() => (window as any).same), true, 'no page load');
      await page.goBack();
      await page.waitForURL(base + '/magic/en/index.html');
      await page.goForward();
      await page.waitForURL(base + href);
      assert.equal(await page.evaluate(() => (window as any).same), true, 'history stays in the app');
    });

    test('a fragment opens the spread that shows its target', async () => {
      await visit();
      await read(page, 'en/' + longChapter);
      const id = await page.locator('main.leaves h2[id]').last().getAttribute('id');
      await read(page, 'en/index.html');
      await read(page, `en/${longChapter}#${id}`);
      assert.ok((await folio(page)).first > 1);
      assert.ok(await page.locator('#' + id).evaluate((heading) => {
        const view = document.querySelector('main.leaves')!.getBoundingClientRect(), box = heading.getBoundingClientRect();
        return box.left >= view.left - 1 && box.right <= view.right + 1;
      }), 'the target is on the visible spread');
    });

    test('math and callouts arrive rendered by mdBook preprocessors', async () => {
      await visit();
      await read(page, 'en/' + longChapter);
      assert.ok(await page.locator('main.leaves .admonition').count() > 0);
      assert.ok(await page.locator('main.leaves pre code.hljs').count() > 0, 'code is highlighted by mdBook\'s highlight.js');
      await read(page, 'en/' + mathChapter);
      assert.ok(await page.locator('main.leaves .katex').count() > 0);
    });

    test('search finds chapters by substring, also in CJK', async () => {
      await visit();
      for (const [lang, query] of [['en', 'compositional'], ['zh', '语义'], ['ja', '意味']] as const) {
        await read(page, `${lang}/index.html`);
        await sidebar(page);
        await page.click('#sidebar-search');
        await page.fill('#searchbar', query);
        const hit = page.locator('#searchresults a').first();
        await hit.waitFor();
        assert.ok(await page.locator('#searchresults li').count() > 0);
        await hit.click();
        await page.waitForURL(new RegExp(`/magic/${lang}/[^?#]+\\.html\\?highlight=`));
        await chapterReady(page);
        // mdBook's searcher marks the query's words in the opened chapter (elasticlunr also returns
        // stemmed matches, whose chapter may not contain the literal query).
        if ((await page.locator('main.leaves').innerText()).toLocaleLowerCase().includes(query)) await page.locator('main.leaves mark').first().waitFor();
      }
    });

    test('bookmarks keep a chapter position across visits', async () => {
      await visit();
      await read(page, 'en/' + longChapter);
      await page.click('#page-next');
      const marked = await folio(page);
      await page.click('#bookmark-toggle');
      assert.equal(await page.locator('#bookmark-toggle').getAttribute('aria-pressed'), 'true');
      await read(page, 'en/index.html');
      await sidebar(page);
      assert.equal(await page.locator('#bookmark-count').innerText(), '1');
      await page.click('#bookmarks-open');
      await page.locator('#bookmark-list a').click();
      await page.waitForURL(`${base}/magic/en/${longChapter}`);
      await chapterReady(page);
      assert.deepEqual(await folio(page), marked);
      await page.click('#bookmark-toggle');
      assert.equal(await page.locator('#bookmark-toggle').getAttribute('aria-pressed'), 'false');
    });

    test('the language picker keeps the chapter and the world link leads to its real page', async () => {
      await visit();
      await read(page, 'en/' + longChapter);
      await page.click('#language-toggle');
      await page.click('#language-list a[lang="de"]');
      await page.waitForURL(`${base}/magic/de/${longChapter}`);
      await chapterReady(page);
      assert.equal(await page.evaluate(() => document.documentElement.lang), 'de');
      await page.click('#world-toggle');
      await page.waitForURL(`${base}/de/${longChapter}`);
    });

    test('music toggles and continues across chapters', async () => {
      await visit();
      await read(page, 'en/index.html');
      await page.click('#music-toggle');
      assert.equal(await page.locator('#music-toggle').getAttribute('aria-pressed'), 'false', 'the toggle pauses the playing music');
      await page.click('#music-toggle');
      assert.equal(await page.locator('#music-toggle').getAttribute('aria-pressed'), 'true');
      await page.evaluate(() => { (window as any).audio = document.getElementById('music'); });
      for (let i = 0; i < 50 && page.url().endsWith('/index.html'); i++) { await folio(page); await page.click('#page-next'); }
      await page.waitForURL(`${base}/magic/en/${chapters[1]!.file}`);
      await chapterReady(page);
      assert.equal(await page.evaluate(() => (window as any).audio === document.getElementById('music')), true, 'one audio element for the visit');
      assert.equal(await page.locator('#music-toggle').getAttribute('aria-pressed'), 'true', 'the music plays on');
    });
  });
}
