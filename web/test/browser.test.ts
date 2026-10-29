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
import { uiStrings } from '../i18n.ts';
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
  const settleFrame = () => page.evaluate(() => {
    document.documentElement.getBoundingClientRect();
    document.querySelector('main.leaves')?.getBoundingClientRect();
    return new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  // Force the first layout before awaiting fonts: WebKit can expose an already-resolved
  // document.fonts.ready before layout has requested the page font.
  await settleFrame();
  await page.evaluate(() => document.fonts.ready);
  // mdBook's sidebar/page wrapper uses CSS transitions during viewport changes;
  // wait for those and one extra ResizeObserver delivery before reading geometry.
  await page.evaluate(async () => {
    const running = document.getAnimations().filter((animation) => animation.playState === 'running');
    await Promise.allSettled(running.map((animation) => animation.finished.catch(() => undefined)));
  });
  await page.evaluate(() => document.fonts.ready);
  await settleFrame();
  await page.waitForFunction(() => {
    const h = document.documentElement;
    return h.dataset.world !== 'magic' || h.dataset.reading === 'scroll' ||
      !!document.getElementById('folio')?.textContent;
  });
}

/** Waits for nonempty native results belonging to the current query, never stale cached results. */
async function searchResults(page: Page, query: string) {
  try {
    await page.waitForFunction((q) => {
      const links = [...document.querySelectorAll<HTMLAnchorElement>('#searchresults li a')];
      return links.length > 0 && links.every((a) => new URL(a.href).searchParams.get('highlight') === q);
    }, query);
  } catch (error) {
    const state = await page.evaluate(() => ({
      value: (document.querySelector('#searchbar') as HTMLInputElement | null)?.value,
      outer: document.querySelector('#searchresults')?.innerHTML.slice(0, 500),
      count: document.querySelectorAll('#searchresults li a').length,
    }));
    throw new Error((error as Error).message + ' ' + JSON.stringify(state));
  }
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
      browser = await profile.engine.launch({ headless: true, ...(profile.engine === chromium && process.env.ALUX_BROWSER_CHANNEL ? { channel: process.env.ALUX_BROWSER_CHANNEL } : {}) });
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
        // Embedded players run external scripts; their cookie policies are not reader failures.
        // Keep strict monitoring for the site's own console, scripts and resource requests.
        const source = m.location().url;
        const internal = !source || source.startsWith(base + '/');
        if (m.type() === 'error' && internal && !(moving.has(page) && cancelledFont)) problems.push('console: ' + source + ' ' + m.text());
      });
      page.on('response', (r) => {
        if (r.url().startsWith(base + '/') && r.status() >= 400) problems.push(r.status() + ': ' + r.url());
      });
      page.on('requestfailed', (r) => {
        // A navigation aborts the old page's pending requests (Firefox: fonts, the favicon). That is a
        // cancellation, not a missing asset; missing assets still fail through their 404 response.
        const cancelled = /^(?:NS_BINDING_ABORTED|(?:net::)?ERR_ABORTED|Load request cancelled)$/.test(r.failure()?.errorText ?? '');
        // World choice may also pause the reader's forest bed; both are intentional media aborts.
        const pausedReaderAudio = cancelled &&
          (/\/audio\/welcome\/[^/]+\.mp3$/.test(r.url()) || /\/audio\/forest-breath\.mp3$/.test(r.url()));
        if (r.url().startsWith(base + '/') && !pausedReaderAudio && !(moving.has(page) && cancelled)) {
          problems.push('failed: ' + r.url() + ' ' + r.failure()?.errorText);
        }
      });
      if (world) {
        await context.addInitScript((w) => {
          if (window !== window.top) return;
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

    test('approved day/night control, stable navigation size and bookmark identity', async () => {
      const page = await open(route(english, english.pages[0]!.file), 'magic');
      await page.emulateMedia({ colorScheme: 'dark' });
      assert.equal(await page.locator('html').evaluate((e) => e.classList.contains('light')), true, 'clean first entry stays daylight');
      assert.equal(await page.title(), 'ALUX Programming');
      assert.equal(await page.locator('#theme-list button').count(), 2);
      const before = await page.locator('#menu-bar').evaluate((e) => e.getBoundingClientRect().height);
      await activate(page, '#text-larger');
      assert.equal(await page.locator('#menu-bar').evaluate((e) => e.getBoundingClientRect().height), before);
      await activate(page, '#theme-toggle');
      assert.equal(await page.locator('html').evaluate((e) => e.classList.contains('coal')), true);
      assert.equal(await page.locator('#theme-list').isVisible(), false);
      await navigate(page, () => page.reload());
      assert.equal(await page.locator('html').evaluate((e) => e.classList.contains('coal')), true);
      const duplicate = page.locator('.chapter > .chapter-item.affix').first();
      assert.ok(await duplicate.count());
      assert.equal(await duplicate.isVisible(), false);
    });

    test('blank paper folds a leaf without moving the binding or duplicating identifiers', async () => {
      const { page, count } = await longChapter();
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      const volume = page.locator('.volume');
      const before = await volume.boundingBox();
      assert.ok(before);
      // Bottom outside the text block: actual paper, not a link, paragraph or button.
      await page.mouse.click(before.x + before.width - 20, before.y + before.height - 24);
      await page.waitForFunction(() => !!document.querySelector('.turn-leaf'));
      assert.equal(await page.locator('.turn-leaf').getAttribute('aria-hidden'), 'true');
      assert.equal(await page.locator('.turn-leaf [id]').count(), 0);
      assert.deepEqual(await volume.boundingBox(), before, 'cover remains fixed during the turn');
      await page.waitForFunction(() => !document.querySelector('.turn-leaf'));
      assert.equal((await folio(page)).first, count.last + 1);
      await activate(page, '#page-prev');
      await page.waitForFunction(() => !document.querySelector('.turn-leaf'));
      assert.deepEqual(await folio(page), count);
    });

    test('a world change cancels an unfinished paper turn', async () => {
      const { page } = await longChapter();
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await activate(page, '#page-next');
      await page.waitForFunction(() => !!document.querySelector('.turn-leaf'));
      await activate(page, '#world-toggle');
      assert.equal(await page.locator('.turn-leaf').count(), 0);
      assert.equal(await page.locator('html').getAttribute('data-world'), 'real');
    });

    test('a resize removes stale leaf geometry and leaves paging usable', async () => {
      const { page } = await longChapter();
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await activate(page, '#page-next');
      await page.waitForFunction(() => !!document.querySelector('.turn-leaf'));
      const viewport = page.viewportSize()!;
      await page.setViewportSize({ width: viewport.width - 30, height: viewport.height - 30 });
      await ready(page);
      await page.waitForFunction(() => !document.querySelector('.turn-leaf'));
      const at = await folio(page);
      await activate(page, '#page-prev');
      await page.waitForFunction(() => !document.querySelector('.turn-leaf'));
      assert.ok((await folio(page)).first < at.first);
    });

    test('English large-type list items do not fragment across facing pages', async () => {
      const page = await open(english.pages[0]!.file, 'magic');
      for (const scale of [1, 1.5]) {
        await page.evaluate((value) => document.documentElement.style.setProperty('--reader-scale', String(value)), scale);
        await page.evaluate(() => dispatchEvent(new Event('resize')));
        await ready(page);
        const layout = await page.locator('main.leaves').evaluate((main) => ({
          paired: getComputedStyle(main).columnCount === '2',
          height: main.clientHeight,
          items: [...main.querySelectorAll('li')].map((item) => [...item.getClientRects()].map((r) => ({ x: r.x, top: r.top, bottom: r.bottom, height: r.height }))),
        }));
        assert.ok(layout.items.length > 0);
        // A phone leaf can be shorter than a large-type list item, so it may continue on the next leaf.
        if (layout.paired) for (const rects of layout.items) {
          // A large item may be taller than one physical page; only items that fit must remain whole.
          const fragmentHeight = rects.reduce((sum, rect) => sum + rect.height, 0);
          if (fragmentHeight <= layout.height + 1) assert.equal(rects.length, 1, 'a page-fitting list item stays on one facing page');
        }
        for (let i = 0; i < layout.items.length; i++) for (const a of layout.items[i]!) {
          for (const following of layout.items.slice(i + 1)) for (const b of following) {
            if (Math.abs(a.x - b.x) < 1) assert.ok(Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) < 1, 'list items never overlap within a column');
          }
        }
      }
    });

    test('an over-height code panel stays bounded and scrolls to its final character', async () => {
      const chapter = english.pages.find((page) => page.file === 'rust-dd/capability-algebras.html');
      assert.ok(chapter, 'the expected code chapter is present');
      const page = await open(chapter.file, 'magic');
      const pre = page.locator('main.leaves pre:has(> .buttons)').first();
      assert.equal(await pre.count(), 1, 'the code fixture has a copy-enabled code panel');
      const codePanel = await pre.evaluate((panel) => {
        const main = panel.closest('main.leaves')!;
        const code = panel.querySelector('code')!;
        const copy = panel.querySelector('.clip-button')!;
        const before = code.textContent ?? '';
        code.scrollTop = code.scrollHeight;
        const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
        let last: Text | null = null;
        while (walker.nextNode()) if (walker.currentNode.textContent?.trim()) last = walker.currentNode as Text;
        const range = document.createRange();
        if (last) range.setStart(last, Math.max(0, last.length - 1)), range.setEnd(last, last.length);
        const char = range.getBoundingClientRect();
        const panelBox = panel.getBoundingClientRect(), codeBox = code.getBoundingClientRect(), copyBox = copy.getBoundingClientRect();
        const copyRow = panel.querySelector('.buttons')?.getBoundingClientRect();
        const panelStyle = getComputedStyle(panel), mainBox = main.getBoundingClientRect();
        const marginTop = parseFloat(panelStyle.marginTop) || 0, marginBottom = parseFloat(panelStyle.marginBottom) || 0;
        const marginBox = { top: panelBox.top - marginTop, bottom: panelBox.bottom + marginBottom };
        // The code port starts immediately below the panel's 1px border; allow that
        // border overlap while rejecting any button overlap with the scrollable text.
        const overlaps = !(copyBox.right <= codeBox.left || copyBox.left >= codeBox.right || copyBox.bottom <= codeBox.top + 4 || copyBox.top >= codeBox.bottom);
        return {
          bounded: panelBox.height <= main.clientHeight + 1,
          preMarginInsideLeaf: marginBox.top >= mainBox.top - 1 && marginBox.bottom <= mainBox.bottom + 1,
          codeViewportInsideLeaf: codeBox.bottom <= mainBox.bottom + 1 && codeBox.top >= mainBox.top - 1,
          atBottom: code.scrollTop >= code.scrollHeight - code.clientHeight - 1,
          textUnchanged: code.textContent === before,
          finalCharacterVisible: !!last && char.bottom > codeBox.top && char.top < codeBox.bottom,
          copyRowComplete: !!copyRow && copyRow.top >= marginBox.top - 1 && copyRow.bottom <= marginBox.bottom + 1 && copyRow.top >= mainBox.top - 1 && copyRow.bottom <= mainBox.bottom + 1,
          copyDoesNotCoverCode: !overlaps,
        };
      });
      assert.equal(codePanel.bounded, true, 'code panel does not exceed the physical leaf');
      assert.equal(codePanel.preMarginInsideLeaf, true, 'code panel margin box stays inside the physical leaf');
      assert.equal(codePanel.codeViewportInsideLeaf, true, 'code viewport bottom stays inside the physical leaf');
      assert.equal(codePanel.atBottom, true, 'code port scroll reaches the final character');
      assert.equal(codePanel.textUnchanged, true, 'code scrolling does not change source text');
      assert.equal(codePanel.finalCharacterVisible, true, 'the final non-empty code character enters the code viewport');
      assert.equal(codePanel.copyRowComplete, true, 'copy control row stays completely visible inside the leaf');
      assert.equal(codePanel.copyDoesNotCoverCode, true, 'copy control does not cover the code port');
    });

    test('a normal-motion chapter boundary hands off to the destination document', async () => {
      const page = await open(english.pages[0]!.file + '#last-page', 'magic');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      const next = await page.locator('.nav-wide-wrapper a[rel~="next"]').evaluate((anchor) => (anchor as HTMLAnchorElement).href);
      const from = pathname(page);
      let releaseReader!: () => void;
      const readerGate = new Promise<void>((resolve) => { releaseReader = resolve; });
      await page.route('**/reader.js', async (route) => {
        await readerGate;
        await route.continue();
      });
      try {
        await navigate(page, async () => {
          const commit = page.waitForURL(next, { waitUntil: 'commit' });
          await page.locator('#page-next').click({ noWaitAfter: true });
          await commit;
          assert.notEqual(pathname(page), from);
          await page.waitForSelector('[data-navigation-handoff-veil]');
          assert.equal(await page.locator('#content > .volume > main.leaves').evaluate((main) => getComputedStyle(main).visibility), 'hidden', 'the destination keeps real content hidden before reader.js settles');
          const turnLeafSeen = page.evaluate(() => new Promise<string>((resolve) => {
            const visibility = () => getComputedStyle(document.querySelector('#content > .volume:not(.navigation-veil) > main.leaves')!).visibility;
            if (document.querySelector('.turn-leaf')) { resolve(visibility()); return; }
            const observer = new MutationObserver(() => {
              if (document.querySelector('.turn-leaf')) { observer.disconnect(); resolve(visibility()); }
            });
            observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
          }));
          releaseReader();
          assert.equal(await turnLeafSeen, 'hidden', 'the destination keeps real content hidden during the fold');
          await page.waitForFunction(() => !document.querySelector('#content[data-navigation-handoff]') && !document.querySelector('.turn-leaf'));
          assert.ok(await page.locator('#content > .volume > main.leaves').isVisible());
          assert.equal(await page.locator('[data-navigation-handoff-veil]').count(), 0);
          const destinationFolio = await folio(page);
          const destinationNumbers = await page.locator('#content > .volume:not(.navigation-veil) > .page-foot .page-number').evaluateAll((numbers) => numbers
            .filter((number) => {
              const style = getComputedStyle(number), rect = number.getBoundingClientRect();
              return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
            })
            .map((number) => Number(number.textContent)));
          const expectedNumbers = destinationFolio.last === destinationFolio.first ? [destinationFolio.first] : [destinationFolio.first, destinationFolio.last];
          assert.deepEqual(destinationNumbers, expectedNumbers, 'canonical page numbers match the visible folio after handoff');
        });
      } finally {
        await page.unroute('**/reader.js');
        releaseReader();
      }
      assert.notEqual(pathname(page), from);
    });

    test('two normal-motion page turns change the real page-flip transform before settling', async () => {
      const { page, count } = await longChapter();
      assert.ok(count.last < count.total, 'the code fixture has at least one in-chapter spread');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      for (let turn = 0; turn < 2; turn++) {
        const before = await folio(page);
        const click = page.locator('#page-next').click({ noWaitAfter: true });
        await page.waitForSelector('.turn-leaf .stf__item');
        const samples = await page.evaluate(() => new Promise<string[]>((resolve) => {
          const values: string[] = [];
          let frames = 0;
          const sample = () => {
            values.push([...document.querySelectorAll('.turn-leaf .stf__item')].map((item) => getComputedStyle(item).transform).join('|'));
            if (++frames === 8) resolve(values);
            else requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        }));
        assert.ok(new Set(samples).size > 1, `normal turn ${turn + 1} changes stf__item transform across RAF samples`);
        await click;
        await page.waitForFunction(() => !document.querySelector('.turn-leaf'));
        assert.ok((await folio(page)).first > before.first, `normal turn ${turn + 1} advances the folio`);
        if (turn === 0) await page.waitForTimeout(1200);
      }
    });

    test('a resize while destination fonts are pending clears the handoff and leaves paging usable', async () => {
      const page = await open(english.pages[0]!.file + '#last-page', 'magic');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      const next = await page.locator('.nav-wide-wrapper a[rel~="next"]').evaluate((anchor) => (anchor as HTMLAnchorElement).href);
      let releaseReader!: () => void;
      let releaseFont!: () => void;
      let fontRequested!: () => void;
      const readerGate = new Promise<void>((resolve) => { releaseReader = resolve; });
      const fontGate = new Promise<void>((resolve) => { releaseFont = resolve; });
      const fontSeen = new Promise<void>((resolve) => { fontRequested = resolve; });
      await page.route('**/reader.js', async (route) => { await readerGate; await route.continue(); });
      await page.route('**/*.woff2', async (route) => { fontRequested(); await fontGate; await route.continue(); });
      try {
        const commit = page.waitForURL(next, { waitUntil: 'commit' });
        await page.locator('#page-next').click({ noWaitAfter: true });
        await commit;
        await page.waitForSelector('[data-navigation-handoff-veil]');
        releaseReader();
        await Promise.race([
          fontSeen,
          page.waitForTimeout(1500).then(() => { throw new Error('destination did not request a gated font'); }),
        ]);
        await page.waitForFunction(() => !!document.querySelector('#folio')?.textContent && document.fonts.status === 'loading');
        const size = page.viewportSize()!;
        await page.setViewportSize({ width: size.width - 80, height: size.height + 40 });
        await page.waitForFunction(() => !document.querySelector('#content[data-navigation-handoff]') && !document.querySelector('[data-navigation-handoff-veil]') && !document.querySelector('[data-navigation-handoff-style]'), { timeout: 1000 });
        releaseFont();
        await page.waitForFunction(() => !!document.querySelector('#folio')?.textContent);
        assert.ok(await page.locator('#page-next').isEnabled(), 'paging controls remain usable after a pending-font resize');
      } finally {
        releaseReader();
        releaseFont();
        await page.unroute('**/reader.js');
        await page.unroute('**/*.woff2');
      }
    });

    test('search and the repository remain discoverable in the contents', async () => {
      const page = await open(chapters[1]!, 'real');
      if (await page.locator('#sidebar').getAttribute('aria-hidden') === 'true') await activate(page, '#sidebar-toggle');
      assert.equal(await page.locator('#sidebar-search').isVisible(), true);
      assert.equal(await page.locator('.sidebar-repository span').first().innerText(), 'GitHub');
      assert.equal(await page.locator('.right-buttons .fa-github').count(), 0);
      await activate(page, '#sidebar-search');
      assert.equal(await page.locator('#searchbar').isVisible(), true);
      await page.locator('#searchbar').pressSequentially('semantic');
      await searchResults(page, 'semantic');
      await page.locator('#searchbar').fill('meaning');
      await searchResults(page, 'meaning');
    });

    test('rapid blank-paper input does not skip an extra spread', async () => {
      const { page, count } = await longChapter();
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      const startingFolio = await page.locator('#folio').innerText();
      const box = (await page.locator('.volume').boundingBox())!;
      await page.mouse.click(box.x + box.width - 20, box.y + box.height - 24);
      await page.waitForFunction(() => !!document.querySelector('.turn-leaf'));
      await page.mouse.click(box.x + box.width - 20, box.y + box.height - 24);
      assert.equal(await page.locator('#folio').innerText(), startingFolio);
      await page.waitForFunction(() => !document.querySelector('.turn-leaf'));
      assert.equal((await folio(page)).first, count.last + 1);
      assert.equal(await page.locator('.turn-sheet').count(), 0, 'snapshots leave the DOM after the turn');
      assert.equal(await page.locator('main.leaves').count(), 1);
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
      const table = page.locator('main.leaves .table-wrapper').first();
      assert.equal(await table.count(), 1, 'the multi-page world-switch fixture contains a table wrapper');
      const tableViewport = await table.evaluate((wrapper) => {
        const beforeText = wrapper.textContent;
        wrapper.scrollTop = wrapper.scrollHeight;
        const lastRow = wrapper.querySelector('tbody tr:last-child') ?? wrapper.querySelector('tr:last-child');
        const box = wrapper.getBoundingClientRect();
        const row = lastRow?.getBoundingClientRect();
        const rowHeight = row?.height ?? 0;
        const viewportHeight = wrapper.clientHeight;
        return {
          atBottom: wrapper.scrollTop >= wrapper.scrollHeight - wrapper.clientHeight - 1,
          textUnchanged: wrapper.textContent === beforeText,
          lastRowVisible: !!row && row.bottom > box.top && row.top < box.bottom,
          lastRowFits: rowHeight <= viewportHeight + 1,
          lastRowComplete: !!row && row.bottom <= box.bottom + 1 && row.top >= box.top - 1,
        };
      });
      assert.equal(tableViewport.atBottom, true, 'table wrapper scroll reaches its complete content');
      assert.equal(tableViewport.textUnchanged, true, 'table wrapper scrolling does not change its text');
      assert.equal(tableViewport.lastRowVisible, true, 'table wrapper keeps the final row visible');
      if (tableViewport.lastRowFits) assert.equal(tableViewport.lastRowComplete, true, 'a page-fitting final row remains complete');
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

    test('resize and orientation changes retain progress, content and usable controls', async () => {
      const { page } = await longChapter(english, 1);
      if (await page.locator('html').evaluate((html) => html.classList.contains('sidebar-visible'))) {
        await activate(page, '#sidebar-toggle');
        await ready(page);
      }
      await activate(page, '#page-next');
      const progress = await folio(page);
      assert.ok(progress.first > 1, 'the resize starts from a nonzero reading position');
      const contents = await page.locator('main.leaves').textContent();
      const viewport = page.viewportSize()!;
      const acrossBreakpoint = { width: viewport.width < 900 ? 1200 : 600, height: viewport.height };
      for (const size of [acrossBreakpoint, { width: viewport.height, height: viewport.width }, viewport]) {
        await page.setViewportSize(size);
        await ready(page);
        const resized = await folio(page);
        const beforePer = progress.last - progress.first + 1, afterPer = resized.last - resized.first + 1;
        const ratio = (progress.first - 1) / Math.max(1, progress.total - beforePer);
        const expected = Math.round(ratio * (resized.total / afterPer - 1)) * afterPer + 1;
        assert.equal(resized.first, expected, 'normalized progress survives a new column count');
        assert.equal(await page.locator('main.leaves').textContent(), contents);
        for (const selector of ['#page-prev', '#page-next', '#bookmark-toggle', '#text-larger']) {
          const box = await page.locator(selector).boundingBox();
          assert.ok(box && box.x >= -1 && box.x + box.width <= size.width + 1, selector);
          assert.ok((await page.locator(selector).getAttribute('aria-label')) || (await page.locator(selector).innerText()).trim(), selector + ' accessible name');
        }
      }
    });

    test('print pages retain the complete book without changing the saved world', async () => {
      const page = await open(chapters[1]!, 'magic');
      await page.addInitScript(() => { window.print = () => {}; });
      await navigate(page, () => page.goto(base + '/print.html'));
      await page.emulateMedia({ media: 'print' });
      assert.equal(await page.locator('html').getAttribute('data-world'), 'real');
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('alux-reader')!).world), 'magic');
      assert.ok(await page.locator('main.leaves h1').count() > 1, 'aggregate book retains chapters');
      assert.ok(await page.locator('main.leaves').evaluate((main) => main.scrollHeight <= main.clientHeight + 2), 'print content is not clipped');
    });

    test('keyboard help opens and closes in the edition language', async () => {
      const page = await open(route(chinese, chapters[1]!), 'real');
      await page.keyboard.press('?');
      await page.locator('#mdbook-help-popup').waitFor({ state: 'visible' });
      assert.equal(await page.locator('.mdbook-help-title').innerText(), '键盘快捷键');
      await page.keyboard.press('Escape');
      await page.locator('#mdbook-help-container').waitFor({ state: 'hidden' });
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
      if (await page.locator('#sidebar').getAttribute('aria-hidden') === 'true') await activate(page, '#sidebar-toggle');
      await activate(page, '#sidebar-search');
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
          assert.equal(await page.locator('.mdbook-help-title').textContent(), uiStrings[edition.lang]?.['Keyboard shortcuts'] ?? 'Keyboard shortcuts');
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
