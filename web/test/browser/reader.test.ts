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
import { uiStrings } from '../../i18n.ts';
import { expectedSite } from '../site.ts';

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

    test('sidebar selections open the chapter beginning despite saved progress', async () => {
      await visit();
      await read(page, 'en/' + longChapter);
      await page.click('#page-next');
      await page.waitForFunction(() => / · (\d+)/.exec(document.getElementById('folio')!.textContent!)![1] !== '1');
      assert.ok((await folio(page)).first > 1, 'starts with progress to reset');
      await sidebar(page);
      const chapterLink = page.locator(`#sidebar .chapter a[href="/magic/en/${longChapter}"]`);
      await chapterLink.click();
      await chapterReady(page);
      assert.equal((await folio(page)).first, 1, 'selecting the current chapter resets it');

      await page.click('#page-next');
      await page.waitForFunction(() => / · (\d+)/.exec(document.getElementById('folio')!.textContent!)![1] !== '1');
      assert.ok((await folio(page)).first > 1);
      await sidebar(page);
      // The introductory affix is hidden because the logo already names the book.
      const otherChapter = page.locator('#sidebar .chapter a:not(.active):visible').first();
      const otherUrl = await otherChapter.getAttribute('href');
      await otherChapter.click();
      await page.waitForURL(base + otherUrl);
      await chapterReady(page);
      await sidebar(page);
      await chapterLink.click();
      await page.waitForURL(`${base}/magic/en/${longChapter}`);
      await chapterReady(page);
      assert.equal((await folio(page)).first, 1, 'returning through the sidebar ignores saved progress');

      await page.click('#reading-mode');
      await settled(page);
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForFunction(() => scrollY > 0);
      await sidebar(page);
      await chapterLink.click();
      await page.waitForFunction(() => scrollY === 0);
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

    test('code controls float above listings and Rust examples run without copying their output', async () => {
      await visit();
      const example = chapters.find(c => readFileSync('src/' + c.file.replace(/\.html$/, '.md'), 'utf8').includes('enum Free<A>'))!;
      const requests: { code: string; edition: string; version: string }[] = [];
      let response = 'stack: [5, 5]\nstorage: {1: 5}\n';
      await page.route('https://play.rust-lang.org/evaluate.json', async route => {
        requests.push(route.request().postDataJSON());
        await route.fulfill({ json: { result: response } });
      });
      await read(page, 'en/' + example.file);
      await page.click('#reading-mode');
      // Open the authored disclosures without making their long listings part of another page turn.
      await page.locator('main.leaves details').evaluateAll(nodes => nodes.forEach(node => { (node as HTMLDetailsElement).open = true; }));
      await settled(page);
      const listing = page.locator('pre.playground').first();
      const source = await listing.locator(':scope > code:not(.result)').textContent();
      const geometry = await listing.evaluate(pre => {
        const controls = pre.querySelector<HTMLElement>(':scope > .buttons')!;
        const code = pre.querySelector('code')!;
        return { position: getComputedStyle(controls).position, inset: code.getBoundingClientRect().top - pre.getBoundingClientRect().top };
      });
      assert.equal(geometry.position, 'absolute', 'controls stay outside text flow');
      assert.ok(geometry.inset < 10, 'no reserved toolbar row above the code');
      assert.equal(await page.locator('pre:not(.playground) > .buttons .play-button').count(), 0, 'ordinary blocks cannot run');
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { (window as any).copiedCode = text; } } });
      });
      await listing.hover();
      await listing.locator('.play-button').click();
      await page.waitForFunction(() => document.querySelector('pre.playground > .result')?.textContent?.startsWith('stack:'));
      assert.deepEqual(requests, [{ version: 'stable', optimize: '0', code: source, edition: '2015' }]);
      await listing.hover();
      await listing.locator('.clip-button').click();
      assert.equal(await page.evaluate(() => (window as any).copiedCode), source, 'copy excludes execution results');
      await page.evaluate(() => dispatchEvent(new Event('scroll')));
      const notice = page.locator('body > .code-copy-notice');
      await notice.waitFor();
      assert.equal(await notice.textContent(), 'Copied');
      const feedback = await notice.evaluate(node => {
        const box = node.getBoundingClientRect();
        return { position: getComputedStyle(node).position, layer: Number(getComputedStyle(node).zIndex),
          frame: parseInt(getComputedStyle(document.querySelector('.volume')!).zIndex) || 0,
          top: box.top, bottom: box.bottom, viewport: innerHeight };
      });
      assert.ok(feedback.position === 'fixed' && feedback.layer > feedback.frame && feedback.top >= 0 && feedback.bottom <= feedback.viewport,
        'feedback escapes the clipped chapter and stays within the viewport: ' + JSON.stringify(feedback));
      response = '';
      await listing.locator('.play-button').click();
      await page.waitForFunction(() => document.querySelector('pre.playground > .result')?.textContent === 'No output');
      // An invalid response exercises failure feedback without an intentional network console error.
      await page.route('https://play.rust-lang.org/evaluate.json', route => route.fulfill({ contentType: 'application/json', body: 'invalid JSON' }));
      await listing.locator('.play-button').click();
      await page.waitForFunction(() => document.querySelector('pre.playground > .result')?.textContent?.startsWith('Playground Communication:'));
    });

    test('long paged listings fill a leaf and keep their height when code runs', async () => {
      await visit();
      const example = chapters.find(c => readFileSync('src/' + c.file.replace(/\.html$/, '.md'), 'utf8').includes('enum Free<A>'))!;
      let complete!: () => void;
      const pending = new Promise<void>(resolve => { complete = resolve; });
      await page.route('https://play.rust-lang.org/evaluate.json', async route => {
        await pending;
        await route.fulfill({ json: { result: 'stack: [5, 5]\n'.repeat(100) } });
      });
      await read(page, 'en/' + example.file);
      await page.locator('main.leaves details summary').first().click();
      await settled(page);
      const listing = page.locator('pre.playground').first();
      const before = await listing.evaluate(pre => ({ height: pre.getBoundingClientRect().height, leaf: pre.closest('main')!.clientHeight }));
      assert.ok(Math.abs(before.height - before.leaf) <= 2, 'a long listing fills the whole leaf, rather than the previous 70% cap');
      await listing.locator('.play-button').evaluate((button: HTMLButtonElement) => button.click());
      assert.ok(Math.abs(await listing.evaluate(pre => pre.getBoundingClientRect().height) - before.height) <= 2, 'pending execution keeps the listing height');
      assert.ok(await listing.locator(':scope > .result').evaluate(result => result.clientHeight < result.parentElement!.clientHeight * .2), 'a one-line status does not reserve a fixed share of the listing');
      complete();
      await page.waitForFunction(() => document.querySelector('pre.playground > .result')?.textContent?.startsWith('stack:'));
      assert.ok(Math.abs(await listing.evaluate(pre => pre.getBoundingClientRect().height) - before.height) <= 2, 'long output scrolls within the original footprint');
      assert.ok(await listing.locator(':scope > .result').evaluate(result => result.scrollHeight > result.clientHeight), 'output has its own scroll area');
      assert.ok(await listing.locator(':scope > .result').evaluate(result => result.getBoundingClientRect().height <= parseFloat(getComputedStyle(result).lineHeight) * 4 + 13), 'long output stays within four lines plus padding');
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

    test('world choices preserve both music preferences across visits', async () => {
      await visit();
      await read(page, 'en/index.html');
      assert.equal(await page.locator('#music-toggle').getAttribute('aria-pressed'), 'true', 'music defaults to on');
      for (const enabled of [false, true]) {
        await page.click('#music-toggle');
        assert.equal(await page.locator('#music-toggle').getAttribute('aria-pressed'), String(enabled));
        await page.goto(base + '/magic/en/');
        await page.locator('[data-world="real"]').click();
        await page.waitForURL(base + '/index.html');
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('alux-reader')!).music), enabled, 'real entry preserves the music preference');
        await page.goto(base + '/magic/en/');
        await page.locator('[data-world="magic"]').click();
        await chapterReady(page);
        await page.waitForFunction(expected => document.getElementById('music-toggle')?.getAttribute('aria-pressed') === String(expected), enabled);
        await read(page, 'en/index.html');
        assert.equal(await page.locator('#music-toggle').getAttribute('aria-pressed'), String(enabled), 'a reload retains the preference');
      }
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
