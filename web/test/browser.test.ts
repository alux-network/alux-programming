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
import { readerPage, outerPage } from './reader-page.ts';
import { uiStrings, copyLabels } from '../i18n.ts';
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
    // WebKit can suspend color transitions on off-column copy controls indefinitely.
    // Only the native layout transitions matter to this geometry barrier.
    const running = document.getAnimations().filter((animation) => animation.playState === 'running' &&
      animation instanceof CSSTransition && /^(transform|margin-left|margin-right|width|height|left|right)$/.test(animation.transitionProperty));
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
      const page = readerPage(await context.newPage());
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

    /** The paper footer can sit below a phone viewport. Bring this real click target onscreen first. */
    async function blankFooter(page: Page) {
      await page.evaluate(() => {
        const box=document.querySelector('.volume')!.getBoundingClientRect();
        if(box.bottom>innerHeight) scrollTo(0,scrollY+box.bottom-innerHeight+8);
      });
      await ready(page);
      const box=(await page.locator('.volume').boundingBox())!;
      assert.ok(box.y+box.height-24 < page.viewportSize()!.height, 'blank click target is onscreen');
      return box;
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
      const sizes=()=>page.evaluate(()=>({body:parseFloat(getComputedStyle(document.querySelector('main.leaves')!).fontSize),directory:parseFloat(getComputedStyle(document.querySelector('.chapter li.chapter-item')!).fontSize),part:parseFloat(getComputedStyle(document.querySelector('.chapter .part-title')!).fontSize),bookmarks:parseFloat(getComputedStyle(document.getElementById('bookmarks-open')!).fontSize),search:parseFloat(getComputedStyle(document.getElementById('sidebar-search')!).fontSize)}));
      if (profile.options.isMobile) { await activate(page, '#sidebar-toggle'); await ready(page); }
      const original=await sizes();
      for(const size of Object.values(original)) assert.equal(size,original.body,'contents and body share the default size');
      if (profile.options.isMobile) await activate(page, '#sidebar-toggle');
      await activate(page, '#text-larger');
      if (profile.options.isMobile) { await activate(page, '#sidebar-toggle'); await ready(page); }
      const enlarged=await sizes();
      for(const size of Object.values(enlarged)) assert.equal(size,enlarged.body,'contents and body enlarge together');
      assert.ok(enlarged.body>original.body);

      if (profile.options.isMobile) { await activate(page, '#sidebar-toggle'); await ready(page); }
      assert.equal(await page.locator('#menu-bar').evaluate((e) => e.getBoundingClientRect().height), before);
      await activate(page, '#theme-toggle');
      assert.equal(await page.locator('html').evaluate((e) => e.classList.contains('coal')), true);
      assert.equal(await page.locator('#theme-list').isVisible(), false);
      const expanded=await page.locator('#sidebar-toggle').getAttribute('aria-expanded');
      assert.equal(await page.locator('#sidebar-toggle').getAttribute('title'),expanded==='true'?'Hide table of contents':'Show table of contents');
      await activate(page,'#sidebar-toggle'); await ready(page);
      assert.equal(await page.locator('#sidebar-toggle').getAttribute('title'),expanded==='true'?'Show table of contents':'Hide table of contents');
      await navigate(page, () => page.reload());
      assert.equal(await page.locator('html').evaluate((e) => e.classList.contains('coal')), true);
      const duplicate = page.locator('.chapter > .chapter-item.affix').first();
      assert.ok(await duplicate.count());
      assert.equal(await duplicate.isVisible(), false);
    });

    if (!profile.options.isMobile) test('night static destination and running heads match the settled printed page', async () => {
      for (const file of ['insights/evm-alg.html','insights/referential-transparency.html']) {
        const page=await open(route(chinese,file),'magic');
        await activate(page,'#theme-toggle'); await ready(page);
        await page.emulateMedia({reducedMotion:'no-preference'});
        const restingPaper=await page.locator('.volume').evaluate(e=>getComputedStyle(e).backgroundColor);
        await activate(page,'#page-next');
        await page.waitForFunction(()=>[...document.querySelectorAll<HTMLElement>('.turn-leaf main.leaves')].some(e=>{
          const item=e.closest<HTMLElement>('.stf__item')!;
          const m=new DOMMatrixReadOnly(getComputedStyle(item).transform);
          return parseFloat(e.style.left)<0 && !!item.style.transform && Math.abs(m.a-1)<.0001 && Math.abs(m.d-1)<.0001 && Math.abs(m.b)<.0001 && Math.abs(m.c)<.0001;
        }),undefined,{timeout:5000});
        const printed=await page.evaluate(()=>{
          const mains=[...document.querySelectorAll<HTMLElement>('.turn-leaf main.leaves')];
          const target=mains.findLast(e=>{const item=e.closest<HTMLElement>('.stf__item')!;const m=new DOMMatrixReadOnly(getComputedStyle(item).transform);return parseFloat(e.style.left)<0 && !!item.style.transform && Math.abs(m.a-1)<.0001 && Math.abs(m.d-1)<.0001 && Math.abs(m.b)<.0001 && Math.abs(m.c)<.0001;});
          if (!target) throw new Error('the static destination leaf must be present during the fold');
          const sheet=target.closest<HTMLElement>('.turn-sheet')!;
          const rect=(e:Element)=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};
          return {content:[...target.querySelectorAll('h1,h2,p,li,pre,table')].map(rect),head:rect(sheet.querySelector('.page-head')!),marked:sheet.hasAttribute('data-paper-curl'),background:getComputedStyle(sheet).backgroundColor,image:getComputedStyle(sheet).backgroundImage,shadow:getComputedStyle(sheet).boxShadow,border:getComputedStyle(sheet).borderRightWidth};
        });
        assert.equal(await page.locator('.turn-leaf [data-paper-curl]').count(),1,'one actual lifted leaf receives the curve highlight');
        assert.equal(printed.marked,false,'static destination never receives curl lighting');
        assert.equal(printed.image,'none','static destination has no temporary gradient');
        assert.equal(printed.background,restingPaper,'static destination keeps the resting paper color');
        assert.equal(printed.shadow,'none','static night paper has no extra illuminated rim');
        assert.equal(printed.border,'0px','the renderer adds no extra gold side border');
        await page.waitForFunction(()=>!document.querySelector('.turn-leaf'));
        const settled=await page.evaluate(()=>{
          const rect=(e:Element)=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};
          return {content:[...document.querySelectorAll('.volume > main.leaves :is(h1,h2,p,li,pre,table)')].map(rect),head:rect(document.querySelectorAll('.volume > .page-head')[1]!)};
        });
        assert.equal(printed.content.length,settled.content.length);
        for(let i=0;i<printed.content.length;i++) for(const key of ['x','y','width','height'] as const) assert.ok(Math.abs(printed.content[i]![key]-settled.content[i]![key])<1,file+' static destination '+i+' '+key);
        for(const key of ['x','y','width','height'] as const) assert.ok(Math.abs(printed.head[key]-settled.head[key])<1,file+' running head '+key);
      }
    });

    test('paper begins at the closed corner instead of an already lifted pose', async () => {
      const page=await open(route(chinese,'insights/index.html'),'magic');
      await page.emulateMedia({reducedMotion:'no-preference'});
      await page.evaluate(()=>{
        (window as any).firstCorner=undefined;
        const sample=()=>{
          const e=document.querySelector<HTMLElement>('[data-paper-curl]');
          if(!e?.style.clipPath){requestAnimationFrame(sample);return;}
          const values=e.style.clipPath.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?(?=px)/gi)?.map(Number) ?? [];
          let area=0;
          for(let i=0;i<values.length;i+=2){const next=(i+2)%values.length;area+=values[i]!*values[next+1]!-values[next]!*values[i+1]!;}
          (window as any).firstCorner={points:values.length,ratio:Math.abs(area/2)/(e.offsetWidth*e.offsetHeight)};
        };
        requestAnimationFrame(sample);
      });
      await activate(page,'#page-next');
      await page.waitForFunction(()=>(window as any).firstCorner,undefined,{timeout:5000});
      const first=await page.evaluate(()=>(window as any).firstCorner as {points:number;ratio:number});
      assert.ok(first.points>=6,'the first painted fold has an actual clipping polygon');
      assert.ok(first.ratio<.006,'the first painted corner is still nearly closed');
      await page.waitForFunction(()=>!document.querySelector('.turn-leaf'),undefined,{timeout:3000});
    });

    test('blank paper folds a leaf without moving the binding or duplicating identifiers', async () => {
      const { page, count } = await longChapter();
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      const volume = page.locator('.volume');
      const before = await blankFooter(page);
      assert.ok(before);
      // Bottom outside the text block: actual paper, not a link, paragraph or button.
      await page.mouse.click(before.x + before.width - 20, before.y + before.height - 24);
      await page.waitForFunction(() => !!document.querySelector('.turn-leaf'));
      // Sample the live short animation in one browser task, rather than round trips that outlast it.
      const sampled=await page.evaluate(()=>{
        const leaf=document.querySelector<HTMLElement>('.turn-leaf')!;
        const source=document.querySelector('.volume > main.leaves')!;
        const copy=leaf.querySelector('main.leaves')!;
        const cover=document.querySelector('.volume')!.getBoundingClientRect(),box=leaf.getBoundingClientRect();
        const read=(main:Element)=>[...main.querySelectorAll('h1,h2,h3,p,li,pre')].map(e=>({height:(e as HTMLElement).offsetHeight,line:getComputedStyle(e).lineHeight,margin:getComputedStyle(e).marginTop,rects:e.getClientRects().length}));
        const rest=leaf.querySelector('.stf__item.--simple main.leaves')!.getBoundingClientRect(),live=source.getBoundingClientRect();
        const state={baseline:{x:rest.left-live.left,y:rest.top-live.top},hidden:leaf.getAttribute('aria-hidden'),ids:leaf.querySelectorAll('[id]').length,overflow:getComputedStyle(leaf).overflow,x:box.left-cover.left,y:box.top-cover.top,source:read(source),copy:read(copy)};
        return new Promise<{state:typeof state;samples:{height:number;scroll:number}[]}>(resolve=>{
          const samples:{height:number;scroll:number}[]=[];
          const sample=()=>{samples.push({height:document.documentElement.scrollHeight,scroll:scrollY});if(samples.length===10)resolve({state,samples});else requestAnimationFrame(sample)};sample();
        });
      });
      assert.equal(sampled.state.hidden,'true');
      assert.equal(sampled.state.ids,0);
      assert.ok(Math.abs(sampled.state.baseline.x)<1 && Math.abs(sampled.state.baseline.y)<1,'stationary printed text never hops when the overlay appears');
      assert.equal(sampled.state.overflow,'visible','moving paper may lift beyond the binding');
      assert.ok(Math.abs(sampled.state.x-17)<1 && Math.abs(sampled.state.y-17)<1,'fold remains aligned with the scrolled cover');
      assert.deepEqual(await volume.boundingBox(),before,'cover remains fixed during the turn');
      assert.equal(new Set(sampled.samples.map(s=>s.height)).size,1,'curl does not enlarge the document');
      assert.equal(new Set(sampled.samples.map(s=>s.scroll)).size,1,'turn never scrolls the desk');
      assert.deepEqual(sampled.state.copy,sampled.state.source,'moving paper retains heading, paragraph, list and code geometry');
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

    test('a normal-motion chapter boundary retains old paper until the destination is ready', async () => {
      const page=await open(english.pages[0]!.file+'#last-page','magic');
      const outer=outerPage(page);
      await page.emulateMedia({reducedMotion:'no-preference'});
      const next=await page.locator('.nav-wide-wrapper a[rel~="next"]').evaluate(a=>(a as HTMLAnchorElement).href);
      const from=outer.url();
      let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve});
      await page.route('**/reader.js',async route=>{await gate;await route.continue()});
      try {
        await navigate(page,async()=>{
          await page.locator('#page-next').click({noWaitAfter:true});
          const pending=outer.frameLocator('.pending-chapter');
          await pending.locator('[data-navigation-handoff-veil]').waitFor({state:'attached'});
          assert.equal(outer.url(),from,'the old route remains visible while the next reader is gated');
          assert.equal(await page.locator('#content > .volume > main.leaves').evaluate(m=>getComputedStyle(m).visibility),'visible');
          assert.equal(await pending.locator('#content > .volume > main.leaves').evaluate(m=>getComputedStyle(m).visibility),'hidden','destination unprepared text stays hidden');
          release();
          await outer.waitForURL(next);
          await page.waitForFunction(()=>!document.querySelector('#content[data-navigation-handoff]')&&!document.querySelector('.turn-leaf'));
          assert.equal(await outer.locator('.pending-chapter').count(),0);
          assert.equal(await page.locator('[data-navigation-handoff-veil]').count(),0);
          const at=await folio(page);
          const numbers=await page.locator('.volume > .page-foot .page-number').evaluateAll(items=>items.filter(e=>e.getBoundingClientRect().width>0).map(e=>Number(e.textContent)));
          assert.deepEqual(numbers,at.first===at.last?[at.first]:[at.first,at.last]);
        });
      } finally {release();await page.unroute('**/reader.js');}
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

    test('a resize while destination fonts are pending clears stale paper before commit', async () => {
      const page=await open(english.pages[0]!.file+'#last-page','magic');
      const outer=outerPage(page);await page.emulateMedia({reducedMotion:'no-preference'});
      const next=await page.locator('.nav-wide-wrapper a[rel~="next"]').evaluate(a=>(a as HTMLAnchorElement).href);
      let releaseReader!:()=>void,releaseFont!:()=>void,fontRequested!:()=>void;
      const readerGate=new Promise<void>(r=>{releaseReader=r}),fontGate=new Promise<void>(r=>{releaseFont=r}),fontSeen=new Promise<void>(r=>{fontRequested=r});
      await page.route('**/reader.js',async route=>{await readerGate;await route.continue()});
      await page.route('**/*.woff2',async route=>{fontRequested();await fontGate;await route.continue()});
      try {
        await page.locator('#page-next').click({noWaitAfter:true});
        const pending=outer.frameLocator('.pending-chapter');
        await pending.locator('[data-navigation-handoff-veil]').waitFor({state:'attached'});
        releaseReader();
        await Promise.race([fontSeen,page.waitForTimeout(1500).then(()=>{throw new Error('destination did not request a gated font')})]);
        const element=await outer.locator('.pending-chapter').elementHandle();const frame=(await element!.contentFrame())!;
        await frame.waitForFunction(()=>!!document.querySelector('#folio')?.textContent&&document.fonts.status==='loading');
        const size=page.viewportSize()!;await page.setViewportSize({width:size.width-80,height:size.height+40});
        await frame.waitForFunction(()=>!document.querySelector('#content[data-navigation-handoff]')&&!document.querySelector('[data-navigation-handoff-veil]')&&!document.querySelector('[data-navigation-handoff-style]'),undefined,{timeout:1000});
        releaseFont();await outer.waitForURL(next);await ready(page);
        assert.ok(await page.locator('#page-next').isEnabled());
      } finally {releaseReader();releaseFont();await page.unroute('**/reader.js');await page.unroute('**/*.woff2');}
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
      const box = await blankFooter(page);
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

    test('magic continuous reading retains its choice, chapter and progress across reloads and mode switches', async () => {
      const { page } = await longChapter();
      const content = await page.locator('main.leaves').textContent();
      await activate(page, '#page-next');
      const progress = await folio(page);
      await activate(page, '#reading-mode');
      await ready(page);
      assert.equal(await page.locator('html').getAttribute('data-reading'), 'scroll');
      assert.equal(await page.locator('main.leaves').evaluate((m) => getComputedStyle(m).columnCount), 'auto');
      assert.equal(await page.locator('main.leaves').textContent(), content);
      const geometry = await page.evaluate(() => ({ scroll:scrollY, overflow:document.documentElement.scrollHeight-innerHeight }));
      assert.ok(geometry.overflow > 100, 'the complete chapter scrolls vertically');
      assert.ok(geometry.scroll > 0, 'the page position transfers into continuous reading');
      await navigate(page, () => page.reload());
      assert.equal(await page.locator('html').getAttribute('data-reading'), 'scroll');
      const reloaded = await page.evaluate(() => scrollY);
      assert.ok(Math.abs(reloaded-geometry.scroll) < 4, 'continuous progress survives reload');
      await activate(page, '#reading-mode');
      await ready(page);
      assert.equal(await page.locator('html').getAttribute('data-reading'), 'pages');
      assert.deepEqual(await folio(page), progress, 'switching back restores the spread');
      assert.equal(await page.locator('main.leaves').textContent(), content);
      assert.equal(await page.locator('#sidebar-resize-handle').isVisible(), false);
    });

    test('the outer magic book scrolls on short windows and fills tall windows', async () => {
      const page = await open(chapters[1]!, 'magic');
      await page.setViewportSize({width:1280,height:600});
      await ready(page);
      const short = await page.evaluate(() => {
        const volume = document.querySelector('.volume')!.getBoundingClientRect();
        return {height:volume.height, overflow:document.documentElement.scrollHeight-innerHeight};
      });
      assert.ok(short.height >= 700, 'the spread is not shrunk to fit a short window');
      assert.ok(short.overflow > 150, 'the entire binding can be scrolled');
      await page.evaluate(() => scrollTo(0,100));
      assert.ok(await page.evaluate(() => scrollY) >= 99);
      await page.setViewportSize({width:1280,height:1500});
      await ready(page);
      assert.ok((await page.locator('.volume').boundingBox())!.height > 1100, 'tall windows have no width-based height cap');
    });

    test('copy controls never float over a folding leaf and return after it settles', async () => {
      const chapter = chapters.find((file) => file.includes('capability-algebras'))!;
      assert.ok(chapter);
      const page = await open(chapter, 'magic');
      assert.ok(await page.locator('main.leaves pre > .buttons').count(), 'source chapter has copy rows');
      await page.emulateMedia({reducedMotion:'no-preference'});
      await activate(page, '#page-next');
      await page.waitForFunction(() => !!document.querySelector('.turn-leaf'));
      assert.ok(await page.locator('.turn-leaf .clip-button').count() > 0, 'copy controls remain painted on the moving paper');
      assert.equal(await page.locator('.turn-leaf').evaluate(e=>(e as HTMLElement).inert), true, 'snapshot controls cannot act');
      assert.equal(await page.locator('.volume > main.leaves pre > .buttons').first().evaluate((row) => getComputedStyle(row).zIndex), '0', 'live controls stay below the moving leaf');
      await page.waitForFunction(() => !document.querySelector('.turn-leaf'));
      assert.equal(await page.locator('.volume > main.leaves pre > .buttons').first().evaluate((row) => getComputedStyle(row).visibility), 'visible');
      assert.equal(await page.locator('.volume[data-paper-turning]').count(), 0);
    });

    test('clipped overflow text does not swallow a blank footer click', async () => {
      const german = editions.find(e=>e.lang==='de')!;
      const page = await open(route(german,'concepts/free_monad.html'), 'magic');
      let at = await folio(page);
      while(at.last<at.total) {
        const box=await blankFooter(page);
        // The click point is outside main but previously matched hidden Range rectangles.
        await page.mouse.click(box.x+box.width-20,box.y+box.height-24);
        const next=await folio(page);
        assert.equal(next.first,at.last+1,'each blank-footer click advances');
        at=next;
      }
    });

    test('night Chinese code-heavy chapters fold from blank paper with changing geometry', async () => {
      for (const chapter of ['rust-dd/semantic-types.html','rust-dd/derived-meaning.html']) {
        const page = await open(route(chinese, chapter), 'magic');
        await activate(page, '#theme-toggle');
        await ready(page);
        await page.emulateMedia({reducedMotion:'no-preference'});
        const before = await folio(page);
        assert.ok(before.last < before.total);
        const box = await blankFooter(page);
        await page.mouse.click(box.x+box.width-20,box.y+box.height-24);
        await page.waitForSelector('.turn-leaf .stf__item');
        const sampled = await page.evaluate(() => {
          const actual=document.querySelector<HTMLElement>('.volume > main.leaves')!;
          const copy=document.querySelector<HTMLElement>('.turn-leaf main.leaves')!;
          if (!copy) throw new Error('the fold must exist when layout sampling starts');
          const read=(main:HTMLElement)=>[...main.querySelectorAll<HTMLElement>(':scope > h1,:scope > h2,:scope > h3')].map(h=>({text:h.textContent,x:h.offsetLeft-(h.offsetParent===main?0:main.offsetLeft),y:h.offsetTop-(h.offsetParent===main?0:main.offsetTop),height:h.offsetHeight}));
          const layout={actual:read(actual),copy:read(copy)};
          return new Promise<{transforms:string[];layout:typeof layout}>((resolve) => {
            const transforms:string[]=[];
            const sample=()=>{ transforms.push([...document.querySelectorAll('.turn-leaf .stf__item')].map(e=>getComputedStyle(e).transform).join('|')); if(transforms.length===12)resolve({transforms,layout});else requestAnimationFrame(sample); };
            requestAnimationFrame(sample);
          });
        });
        assert.ok(new Set(sampled.transforms).size>1,chapter+' night paper actually bends');
        assert.deepEqual(sampled.layout.copy,sampled.layout.actual,chapter+' moving paper has the settled page layout');
        await page.waitForFunction(()=>!document.querySelector('.turn-leaf'));
        assert.equal((await folio(page)).first,before.last+1);
      }
    });

    test('native disclosures keep themed surfaces and update chapter pagination', async () => {
      const page=await open('insights/operational_semantics.html','magic');
      const disclosure=page.locator('.volume > main.leaves details').first();
      assert.ok(await disclosure.count(),'canonical chapter contains a disclosure');
      const before=await folio(page);
      await disclosure.locator('summary').click();
      await page.waitForFunction(()=>document.querySelector('.volume > main.leaves details')?.hasAttribute('open'));
      await page.waitForFunction(total=>Number(document.getElementById('folio')?.textContent?.split(' / ').pop())>total,before.total);
      const opened=await folio(page);
      assert.ok(opened.total>before.total,'expanded content adds actual chapter pages');
      await page.mouse.move(0,0); // Inspect the resting surface separately from the intentional brass hover tint.
      const surface=await disclosure.evaluate(e=>{
        const probe=document.createElement('span');
        probe.style.cssText='display:none;color:var(--panel-accent);background:color-mix(in srgb,var(--panel-accent) 7%,transparent)';
        e.append(probe);
        const expected=getComputedStyle(probe),tint=expected.backgroundColor,accent=expected.color;
        probe.remove();
        const summary=e.querySelector('summary')!;
        return {background:getComputedStyle(summary).backgroundColor,marker:getComputedStyle(summary,'::marker').color,accent,tint,overflow:getComputedStyle(e).overflow};
      });
      assert.ok(surface.background==='rgba(0, 0, 0, 0)' || surface.background===surface.tint,'summary is transparent or the intentional theme-accent hover tint');
      assert.equal(surface.marker,surface.accent,'disclosure marker uses the same theme accent');
      assert.equal(surface.overflow,'visible','long disclosed content remains fragmentable');
      await disclosure.locator('summary').click();
      await page.waitForFunction(()=>!document.querySelector('.volume > main.leaves details')?.hasAttribute('open'));
      await page.waitForFunction(total=>document.getElementById('folio')?.textContent?.endsWith(' / '+total),before.total);
      assert.equal((await folio(page)).total,before.total,'closing restores the original page count');
    });

    test('native code copy acknowledges repeated clicks after paging', async () => {
      const page=await open('concepts/branching.html','magic');
      await page.evaluate(()=>{document.documentElement.dataset.copyEvents='0';document.addEventListener('copy',()=>{document.documentElement.dataset.copyEvents=String(Number(document.documentElement.dataset.copyEvents)+1)});});
      let checked=0,copyEvents=0;
      const limit=(await folio(page)).total;
      for(let leaf=0;leaf<limit && checked<2;leaf++) {
        const buttons=page.locator('.volume > main.leaves .clip-button');
        const visible=await buttons.evaluateAll(es=>es.map((e,i)=>({i,r:e.getBoundingClientRect()})).filter(({r})=>r.left>0 && r.right<innerWidth && r.top>0 && r.bottom<innerHeight).map(e=>e.i));
        if(visible.length) {
          const button=buttons.nth(visible[0]!);
          for(let repeat=0;repeat<2;repeat++) {
            if(profile.options.hasTouch) await button.tap(); else await button.click();
            copyEvents++;
            await page.waitForFunction(([index,label,count])=>Number(document.documentElement.dataset.copyEvents)===Number(count) && document.querySelectorAll<HTMLElement>('.volume > main.leaves .clip-button')[Number(index)]?.dataset.copyLabel===label,[String(visible[0]),copyLabels.en[1],String(copyEvents)]);
            await button.dispatchEvent('mouseout');
            assert.equal(await button.getAttribute('data-copy-label'),copyLabels.en[1],'touch mouseout does not erase the acknowledgement');
          }
          checked++;
        }
        const at=await folio(page);
        if(at.last===at.total) break;
        await activate(page,'#page-next'); await ready(page);
      }
      assert.equal(checked,2,'two settled code pages actually copied successfully');
    });

    test('display equations remain inside their leaf and copy feedback has one coordinated acknowledgement', async () => {
      const page = await open(route(chinese,'rust-dd/semantic-types.html'), 'magic');
      for (let index=0;index<2;index++) {
        const checks = await page.locator('main.leaves').evaluate((main)=>{
          const styles=getComputedStyle(main);
          const count=Number(styles.columnCount);
          const width=(main.clientWidth-(count-1)*(parseFloat(styles.columnGap)||0))/count;
          return {
            equations:[...main.querySelectorAll<HTMLElement>('.katex-display')].map(e=>({width:e.getBoundingClientRect().width,limit:width,overflow:getComputedStyle(e).overflowX})),
            copy:[...main.querySelectorAll<HTMLElement>('.clip-button')].map(e=>({icon:getComputedStyle(e,'::before').backgroundColor,color:getComputedStyle(e).color,filter:getComputedStyle(e,'::before').filter,tooltip:getComputedStyle(e.querySelector('.tooltiptext')!).display}))
          };
        });
        assert.ok(checks.equations.length>0 && checks.copy.length>0);
        for(const equation of checks.equations) { assert.ok(equation.width<=equation.limit+1); assert.equal(equation.overflow,'auto'); }
        for(const copy of checks.copy) { assert.equal(copy.icon,copy.color); assert.equal(copy.filter,'none'); assert.equal(copy.tooltip,'none'); }
        await activate(page,'#theme-toggle'); await ready(page);
      }
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

    test('directory and chapter changes retain the outer document and uninterrupted music', async () => {
      const {page}=await longChapter(chinese,1);
      const outer=outerPage(page);
      if(await outer.evaluate(()=>(document.getElementById('persistent-music') as HTMLAudioElement).paused)) await activate(page,'#music-toggle');
      await outer.waitForFunction(()=>!(document.getElementById('persistent-music') as HTMLAudioElement).paused);
      await outer.evaluate(()=>{
        const audio=document.getElementById('persistent-music') as HTMLAudioElement;
        (window as any).readerIdentity={doc:document,audio,start:audio.currentTime,pauses:0};
        audio.addEventListener('pause',()=>{(window as any).readerIdentity.pauses++});
      });
      const destination='rust-dd/derived-meaning.html';
      if(await page.locator('#sidebar').getAttribute('aria-hidden')==='true')await activate(page,'#sidebar-toggle');
      await activate(page,`.chapter a[href$="${destination}"]`);
      await ready(page);
      assert.ok(outer.url().endsWith('/zh/'+destination));
      await page.emulateMedia({reducedMotion:'no-preference'});
      await activate(page,'#page-next');
      await page.waitForFunction(()=>!document.querySelector('.turn-leaf'));
      await navigate(page,()=>page.goBack());
      const state=await outer.evaluate(()=>{
        const saved=(window as any).readerIdentity;
        return {document:saved.doc===document,audio:saved.audio===document.getElementById('persistent-music'),paused:saved.audio.paused,pauses:saved.pauses,advanced:saved.audio.currentTime>saved.start};
      });
      assert.deepEqual(state,{document:true,audio:true,paused:false,pauses:0,advanced:true});
      assert.equal(await outer.locator('.chapter-frame').count(),1,'only the committed native document remains');
    });

    test('audio plays after activation and pauses when navigating away', async () => {
      const page = await open(chapters[0]!, 'real');
      await activate(page, '#music-toggle');
      await outerPage(page).waitForFunction(() => {
        const music = document.getElementById('persistent-music') as HTMLAudioElement;
        return !music.paused && music.currentTime > 0;
      });
      await activate(page, '#music-toggle');
      assert.equal(await outerPage(page).locator('#persistent-music').evaluate((a) => (a as HTMLAudioElement).paused), true);
      await activate(page, '#music-toggle');
      await outerPage(page).waitForFunction(() => !(document.getElementById('persistent-music') as HTMLAudioElement).paused);
      // Register after the reader, so the observation witnesses its real pagehide cleanup.
      await outerPage(page).evaluate(() => addEventListener('pagehide', () => {
        sessionStorage.setItem('test-audio-paused', String((document.getElementById('persistent-music') as HTMLAudioElement).paused));
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
