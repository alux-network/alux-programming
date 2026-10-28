// Reader behavior against the built mdBook site, served by Vite preview.
// node:test runs the same scenarios on each engine/profile. Routes come only from expectedSite().
// Playwright supplies browser/device configuration; it does not add a reader framework or runner.
// ALUX_BROWSER_PROFILE selects one named profile for diagnosis; the default runs the whole matrix.
// Mobile profiles emulate browser geometry and touch, not physical Android or iOS acceptance.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, afterEach, before, describe, test } from 'node:test';
import { chromium, firefox, webkit, devices } from 'playwright';
import type { Browser, BrowserContextOptions, BrowserType, Page } from 'playwright';
import { preview } from 'vite';
import type { PreviewServer } from 'vite';
import { expectedSite } from './site.ts';
import type { Edition } from './site.ts';

const editions = await expectedSite();
const english = editions.find((e) => e.lang === 'en')!;
const arabic = editions.find((e) => e.rtl)!;
const chinese = editions.find((e) => e.lang === 'zh')!;
// index.html repeats the first chapter, so exclude that alias from reading order.
const chapters = english.pages.slice(1).map((p) => p.file);
const desktop = { width: 1440, height: 1000 };
const profiles: { name: string; engine: BrowserType; options: BrowserContextOptions }[] = [
  { name: 'chromium-desktop', engine: chromium, options: { viewport: desktop } },
  { name: 'firefox-desktop', engine: firefox, options: { viewport: desktop } },
  { name: 'webkit-desktop', engine: webkit, options: { viewport: desktop } },
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

/** Returns a canonical chapter URL within the given edition. */
function route(edition: Edition, file: string) {
  return (edition.lang === 'en' ? '' : edition.lang + '/') + file;
}

/** Reads the displayed chapter progress and rejects malformed or out-of-range folios. */
async function folio(page: Page) {
  const text = await page.locator('#folio').innerText();
  const match = text.match(/ · (\d+)(?:–(\d+))? \/ (\d+)$/);
  assert.ok(match, 'chapter-local folio: ' + text);
  const first = Number(match[1]), last = Number(match[2] ?? match[1]), total = Number(match[3]);
  assert.ok(first > 0 && first <= last && last <= total, text);
  return { first, last, total };
}

/** Waits for the reader's font-dependent geometry to settle. */
async function ready(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.waitForFunction(() => {
    const h = document.documentElement;
    return h.dataset.world !== 'magic' || h.dataset.reading === 'scroll' ||
      !!document.getElementById('folio')?.textContent;
  });
}

/** Waits for nonempty native results belonging to the current query, never stale cached results. */
async function searchResults(page: Page, query: string) {
  await page.waitForFunction((q) => {
    const links = [...document.querySelectorAll<HTMLAnchorElement>('#searchresults li a')];
    return links.length > 0 && links.every((a) => new URL(a.href).searchParams.get('highlight') === q);
  }, query);
  const queries = await page.locator('#searchresults li a').evaluateAll(
    (links) => links.map((a) => new URL((a as HTMLAnchorElement).href).searchParams.get('highlight')));
  assert.ok(queries.length > 0);
  assert.ok(queries.every((q) => q === query), 'results belong to ' + query);
}

/** Returns the path of the current chapter, without query or fragment. */
const pathname = (page: Page) => new URL(page.url()).pathname;

for (const profile of selected) {
  describe(profile.name, { concurrency: false }, () => {
    let browser: Browser;
    const problems: string[] = [];
    const moving = new WeakSet<Page>();
    before(async () => {
      browser = await profile.engine.launch({ headless: true });
      console.log(profile.name + ': ' + browser.version() + (profile.options.isMobile ? ' (simulation)' : ''));
    });
    after(async () => { await browser?.close(); });
    afterEach(async () => {
      try {
        for (const context of browser.contexts()) {
          for (const page of context.pages()) if (!page.isClosed()) await ready(page);
        }
        assert.deepEqual([...problems], [], profile.name + ' browser errors');
      }
      finally {
        problems.length = 0;
        // Serial disposal avoids cross-window session-store races in Firefox on Windows.
        for (const context of browser.contexts()) await context.close();
      }
    });

    /** Marks intentional document changes so cancelled old-page fonts are not resource failures. */
    async function navigate(page: Page, operation: () => Promise<unknown>) {
      moving.add(page);
      try { await operation(); await ready(page); }
      finally { moving.delete(page); }
    }

    /** Opens an isolated chapter, watching every scenario for script and internal resource errors. */
    async function open(file: string, world?: 'magic' | 'real') {
      const context = await browser.newContext({ ...profile.options, reducedMotion: 'reduce' });
      const page = await context.newPage();
      page.setDefaultTimeout(10_000);
      page.on('pageerror', (e) => problems.push('error: ' + e.message));
      page.on('console', (m) => {
        const cancelledFont = m.text().includes('downloadable font: download failed') && m.text().includes('status=2152398850');
        if (m.type() === 'error' && !(moving.has(page) && cancelledFont)) problems.push('console: ' + m.location().url + ' ' + m.text());
      });
      page.on('response', (r) => {
        if (r.url().startsWith(base + '/') && r.status() >= 400) problems.push(r.status() + ': ' + r.url());
      });
      page.on('requestfailed', (r) => {
        // A navigation aborts the old page's pending requests (Firefox: fonts, the favicon). That is a
        // cancellation, not a missing asset; missing assets still fail through their 404 response.
        const cancelled = /NS_BINDING_ABORTED|ERR_ABORTED/.test(r.failure()?.errorText ?? '');
        if (r.url().startsWith(base + '/') && !(moving.has(page) && cancelled)) {
          problems.push('failed: ' + r.url() + ' ' + r.failure()?.errorText);
        }
      });
      if (world) {
        await context.addInitScript((w) => {
          if (!localStorage.getItem('alux-reader')) {
            localStorage.setItem('alux-reader', JSON.stringify({ world: w, bookmarks: [] }));
          }
          sessionStorage.setItem('alux-entered', '1');
        }, world);
      }
      await navigate(page, () => page.goto(base + '/' + file));
      await ready(page);
      return page;
    }

    /** Finds a real source chapter spanning multiple pages, without copying a chapter list. */
    async function longChapter(edition = english, start = 0) {
      for (const file of chapters.slice(start)) {
        const page = await open(route(edition, file), 'magic');
        const count = await folio(page);
        if (count.last < count.total) return { file, page, count };
        await page.context().close();
      }
      throw new Error('the source book has no multi-spread chapter for ' + profile.name);
    }

    /** Uses touch on mobile profiles and the pointer on desktop. */
    async function activate(page: Page, selector: string) {
      if (profile.options.hasTouch) await page.locator(selector).tap();
      else await page.locator(selector).click();
    }

    /** Opens the sidebar first when a narrow viewport hides its bookmark entry. */
    async function openBookmarks(page: Page) {
      if (!(await page.locator('#bookmarks-open').isVisible())) await activate(page, '#sidebar-toggle');
      await activate(page, '#bookmarks-open');
    }

    test('the gateway enters either world and remembers the selection', async () => {
      const page = await open('index.html');
      assert.equal(await page.locator('html').getAttribute('data-gateway'), '');
      await activate(page, '#gateway [data-world="magic"]');
      assert.equal(await page.locator('html').getAttribute('data-world'), 'magic');
      assert.equal(await page.locator('html').getAttribute('data-gateway'), null);
      await navigate(page, () => page.reload());
      await ready(page);
      assert.equal(await page.locator('html').getAttribute('data-world'), 'magic');
      await navigate(page, () => page.goto(base + '/index.html#worlds'));
      await activate(page, '#gateway [data-world="real"]');
      assert.equal(await page.locator('html').getAttribute('data-world'), 'real');
    });

    test('a direct chapter opens without the gateway', async () => {
      const page = await open(chapters[1]!);
      assert.equal(await page.locator('html').getAttribute('data-gateway'), null);
      assert.ok((await page.locator('main').innerText()).trim().length > 40);
    });

    test('page turns advance and reverse one spread with chapter-local folios', async () => {
      const { page, count } = await longChapter();
      assert.equal(count.first, 1);
      assert.match(await page.locator('#folio').innerText(), /^This chapter · /);
      await activate(page, '#page-next');
      assert.equal((await folio(page)).first, count.last + 1);
      await activate(page, '#page-prev');
      assert.deepEqual(await folio(page), count);
    });

    test('chapter boundary turns go forward and return onto the last spread', async () => {
      const { file, page, count } = await longChapter();
      const next = chapters[chapters.indexOf(file) + 1];
      assert.ok(next, 'the long chapter has a next chapter');
      const step = count.last - count.first + 1;
      for (let first = count.first; first + step <= count.total; first += step) await activate(page, '#page-next');
      await navigate(page, () => Promise.all([page.waitForURL(base + '/' + next), activate(page, '#page-next')]));
      await ready(page);
      await navigate(page, () => Promise.all([page.waitForURL(base + '/' + file + '#last-page'), activate(page, '#page-prev')]));
      await ready(page);
      const end = await folio(page);
      assert.equal(end.last, end.total);
    });

    test('RTL keyboard turns advance while focused buttons keep native activation', async () => {
      const { page, count } = await longChapter(arabic);
      assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
      await page.keyboard.press('ArrowLeft');
      assert.equal((await folio(page)).first, count.last + 1);
      const turned = await folio(page);
      await page.locator('#bookmark-toggle').focus();
      await page.keyboard.press('Space');
      assert.equal(await page.locator('#bookmark-toggle').getAttribute('aria-pressed'), 'true');
      assert.deepEqual(await folio(page), turned, 'Space on a focused button does not turn the page');
    });

    test('the real world is one scrolling column', async () => {
      const page = await open(chapters[0]!, 'real');
      assert.equal(await page.locator('main.leaves').evaluate((m) => getComputedStyle(m).columnCount), 'auto');
      assert.ok((await page.locator('main.leaves').innerText()).trim().length > 40);
    });

    test('language switching preserves the chapter and remembers the manual edition', async () => {
      const target = editions.find((e) => e.lang !== 'en')!;
      const chapter = chapters[1]!;
      const page = await open(chapter, 'real');
      await activate(page, '#language-toggle');
      assert.equal(await page.locator('#language-toggle').getAttribute('aria-expanded'), 'true');
      assert.deepEqual(await page.locator('#language-list a').evaluateAll(
        (links) => links.map((a) => (a as HTMLAnchorElement).lang)), editions.map((e) => e.lang));
      await navigate(page, () => Promise.all([
        page.waitForURL(base + '/' + route(target, chapter)),
        activate(page, `#language-list a[lang="${target.lang}"]`),
      ]));
      assert.equal(await page.locator('html').getAttribute('lang'), target.lang);
      await navigate(page, async () => {
        await page.goto(base + '/index.html');
        await page.waitForURL(base + '/' + route(target, 'index.html'));
      });
    });

    test('bookmarks are added, reopened, visited and removed', async () => {
      const chapter = chapters[1]!;
      const page = await open(chapter, 'real');
      await activate(page, '#bookmark-toggle');
      assert.equal(await page.locator('#bookmark-count').innerText(), '1');
      await openBookmarks(page);
      assert.equal(await page.locator('#bookmarks').evaluate((d) => (d as HTMLDialogElement).open), true);
      const bookmark = await page.locator('#bookmark-list a').getAttribute('href');
      assert.ok(bookmark);
      assert.equal(new URL(bookmark, page.url()).pathname, '/' + chapter);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#bookmarks').evaluate((d) => (d as HTMLDialogElement).open), false);
      await navigate(page, () => page.reload());
      await ready(page);
      assert.equal(await page.locator('#bookmark-count').innerText(), '1');
      const other = chapters.find((file) => file !== chapter)!;
      await navigate(page, () => page.goto(base + '/' + other));
      await ready(page);
      await openBookmarks(page);
      await navigate(page, () => Promise.all([page.waitForURL(base + '/' + chapter), page.locator('#bookmark-list a').click()]));
      await ready(page);
      assert.equal(pathname(page), '/' + chapter);
      await openBookmarks(page);
      await activate(page, '#bookmark-list .bookmark-remove');
      assert.equal(await page.locator('#bookmark-count').innerText(), '0');
      await activate(page, '#bookmarks-close');
    });

    test('reload and browser back/forward restore chapter progress', async () => {
      const { file, page } = await longChapter();
      await activate(page, '#page-next');
      const progress = await folio(page);
      await navigate(page, () => page.reload());
      await ready(page);
      assert.deepEqual(await folio(page), progress);
      const next = chapters[chapters.indexOf(file) + 1]!;
      await navigate(page, () => page.goto(base + '/' + next));
      await ready(page);
      await navigate(page, () => page.goBack());
      await ready(page);
      assert.equal(pathname(page), '/' + file);
      assert.deepEqual(await folio(page), progress);
      await navigate(page, () => page.goForward());
      await ready(page);
      assert.equal(pathname(page), '/' + next);
    });

    test('world switches preserve content and reading progress', async () => {
      const { page } = await longChapter(english, 1);
      await activate(page, '#page-next');
      const progress = await folio(page);
      const contents = await page.locator('main.leaves').textContent();
      await activate(page, '#world-toggle');
      await page.waitForFunction(() => document.documentElement.dataset.world === 'real');
      assert.equal(await page.locator('main.leaves').textContent(), contents);
      await activate(page, '#world-toggle');
      await page.waitForFunction(() => document.documentElement.dataset.world === 'magic');
      await ready(page);
      assert.deepEqual(await folio(page), progress);
    });

    test('the magic world always pages, with a fixed sidebar', async () => {
      const chapter = chapters[1]!;
      const context = await browser.newContext({ ...profile.options, reducedMotion: 'reduce' });
      // A scroll mode saved by an earlier reader version must not apply.
      await context.addInitScript(() => {
        localStorage.setItem('alux-reader', JSON.stringify({ world: 'magic', mode: 'scroll', bookmarks: [] }));
        sessionStorage.setItem('alux-entered', '1');
      });
      const page = await context.newPage();
      await navigate(page, () => page.goto(base + '/' + chapter));
      assert.equal(await page.locator('#reading-mode').count(), 0, 'no scroll reading control');
      assert.notEqual(await page.locator('main.leaves').evaluate((m) => getComputedStyle(m).columnCount), 'auto');
      assert.equal(await page.locator('#sidebar-resize-handle').isVisible(), false, 'no sidebar resize handle');
    });

    test('resize and orientation changes retain content and usable control bounds', async () => {
      const { page } = await longChapter();
      const contents = await page.locator('main.leaves').textContent();
      const viewport = page.viewportSize()!;
      await page.setViewportSize({ width: viewport.height, height: viewport.width });
      await ready(page);
      await folio(page);
      assert.equal(await page.locator('main.leaves').textContent(), contents);
      for (const selector of ['#page-prev', '#page-next', '#bookmark-toggle', '#text-larger']) {
        const box = await page.locator(selector).boundingBox();
        assert.ok(box && box.x >= -1 && box.x + box.width <= page.viewportSize()!.width + 1, selector);
        assert.ok((await page.locator(selector).getAttribute('aria-label')) || (await page.locator(selector).innerText()).trim(), selector + ' accessible name');
      }
      await page.setViewportSize(viewport);
      await ready(page);
      await folio(page);
    });

    test('missing fonts still fail the resource monitor during navigation', async () => {
      const page = await open(chapters[1]!, 'real');
      const fixture = '/__missing-font.woff2';
      await page.route('**' + fixture, (request) => request.fulfill({ status: 404, body: 'missing' }));
      const start = problems.length;
      await navigate(page, () => page.evaluate(async (url) => {
        const face = new FontFace('Missing fixture', 'url("' + url + '")');
        document.fonts.add(face);
        await face.load().catch(() => {});
      }, fixture));
      // Consume only the deliberate fixture failure; any unrelated problem must still fail.
      const observed = problems.splice(start);
      assert.ok(observed.some((p) => p.startsWith('404:') && p.includes(fixture)), 'a missing font must be reported');
      assert.ok(observed.every((p) => p.includes(fixture)), JSON.stringify(observed));
    });

    test('CJK searches retain native results, cache and history', async () => {
      assert.ok(chinese, 'the source editions include Chinese');
      const file = route(chinese, chapters[1]!);
      const page = await open(file, 'real');
      await activate(page, '#search-toggle');
      const search = page.locator('#searchbar');
      for (const query of ['Rust', '含义', 'Rust']) {
        await search.fill(query);
        await search.press('End');
        await searchResults(page, query);
        assert.ok((await page.locator('#searchresults').innerText()).trim());
      }
      await search.fill('不存在的搜索词xyz987');
      await search.press('End');
      await page.waitForFunction(() => document.querySelectorAll('#searchresults li').length === 0);
      await navigate(page, () => page.goto(base + '/' + file + '?search=' + encodeURIComponent('含义')));
      await searchResults(page, '含义');
      await navigate(page, () => page.goto(base + '/' + file + '?search=Rust'));
      await navigate(page, () => page.goBack());
      await searchResults(page, '含义');
      assert.equal(await search.inputValue(), '含义');
    });

    test('direct CJK search waits for a slow reader script', async () => {
      const page = await open(route(chinese, chapters[1]!), 'real');
      await page.route('**/reader.js', async (request) => {
        await new Promise((resolve) => setTimeout(resolve, 800));
        await request.continue();
      });
      await navigate(page, () => page.goto(base + '/' + route(chinese, chapters[1]!) + '?search=' + encodeURIComponent('语义')));
      await searchResults(page, '语义');
      assert.equal(await page.locator('#searchbar').inputValue(), '语义');
      assert.match(await page.locator('#searchresults-header').innerText(), /搜索/);
    });

    test('audio plays after activation and pauses when navigating away', async () => {
      const page = await open(chapters[0]!, 'real');
      await activate(page, '#music-toggle');
      await page.waitForFunction(() => {
        const music = document.getElementById('music') as HTMLAudioElement;
        return !music.paused && music.currentTime > 0;
      });
      await activate(page, '#music-toggle');
      assert.equal(await page.locator('#music').evaluate((a) => (a as HTMLAudioElement).paused), true);
      await activate(page, '#music-toggle');
      await page.waitForFunction(() => !(document.getElementById('music') as HTMLAudioElement).paused);
      // Register after the reader, so the observation witnesses its real pagehide cleanup.
      await page.evaluate(() => addEventListener('pagehide', () => {
        sessionStorage.setItem('test-audio-paused', String((document.getElementById('music') as HTMLAudioElement).paused));
      }));
      await navigate(page, () => page.goto(base + '/' + chapters[1]!));
      assert.equal(await page.evaluate(() => sessionStorage.getItem('test-audio-paused')), 'true');
    });

    const features = [
      { name: 'math', source: /\$\$|\$[^$\n]+\$/, selector: '.katex' },
      { name: 'code', source: /```(?:rust|haskell)/, selector: 'pre code' },
      { name: 'admonitions', source: /```admonish/, selector: '.admonition' },
      { name: 'tables', source: /^\|.*\|/m, selector: 'table' },
      { name: 'images', source: /!\[|<img\b/, selector: 'img' },
    ];
    for (const feature of features) {
      test('both worlds retain rendered ' + feature.name, async () => {
        const file = chapters.find((chapter) => feature.source.test(readFileSync('src/' + chapter.replace(/\.html$/, '.md'), 'utf8')));
        assert.ok(file, 'the source book contains ' + feature.name);
        for (const world of ['magic', 'real'] as const) {
          const page = await open(file, world);
          const element = page.locator('main.leaves ' + feature.selector).first();
          assert.ok(await element.count(), feature.name + ' in ' + world);
          if (feature.name === 'images') {
            assert.equal(await element.evaluate((e) => (e as HTMLImageElement).complete && (e as HTMLImageElement).naturalWidth > 0), true);
          } else assert.ok((await element.textContent())?.trim(), feature.name + ' text');
          await page.context().close();
        }
      });
    }

    for (const edition of editions) {
      for (const world of ['magic', 'real'] as const) {
        test(edition.lang + ' loads in the ' + world + ' world without errors or failed requests', async () => {
          const page = await open(route(edition, edition.pages[1]!.file), world);
          assert.equal(await page.locator('html').getAttribute('data-world'), world);
          assert.equal(await page.locator('html').getAttribute('lang'), edition.lang);
          assert.equal(await page.locator('html').getAttribute('dir'), edition.rtl ? 'rtl' : 'ltr');
          assert.ok((await page.locator('main.leaves').innerText()).trim().length > 40);
          const bounds = await page.evaluate(() => ({
            width: innerWidth, content: document.documentElement.scrollWidth,
          }));
          assert.ok(bounds.content <= bounds.width + 2, edition.lang + ' horizontal overflow');
        });
      }
    }
  });
}
