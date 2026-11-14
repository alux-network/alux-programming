// Reader behavior against the built mdBook site, served by Vite preview.
// node:test runs the same scenarios on each engine/profile. Routes come only from expectedSite().
// Playwright supplies browser/device configuration; it does not add a reader framework or runner.
// ALUX_BROWSER_PROFILE selects one named profile for diagnosis; the default runs the whole matrix.
// Mobile profiles emulate browser geometry and touch, not physical Android or iOS acceptance.
import assert from 'node:assert/strict';
import { after, afterEach, before, describe, test } from 'node:test';
import { chromium, firefox, webkit, devices } from 'playwright';
import type { Browser, BrowserContextOptions, BrowserType, Page } from 'playwright';
import { preview } from 'vite';
import type { PreviewServer } from 'vite';
import { expectedSite } from './site.ts';
import { sourceChapters, selectChapters } from './chapter-selection.ts';
import { readerPage, outerPage } from './reader-page.ts';
import { virtualMedia } from './virtual-media.ts';
import { uiStrings, copyLabels } from '../i18n.ts';
import type { Edition } from './site.ts';

const editions = await expectedSite();
const english = editions.find((e) => e.lang === 'en')!;
const arabic = editions.find((e) => e.rtl)!;
const chinese = editions.find((e) => e.lang === 'zh')!;
// index.html repeats the first chapter, so exclude that alias from reading order.
const chapters = english.pages.slice(1).map((p) => p.file);
const sources = sourceChapters(english);
const code = (text: string) => /```(?:rust|haskell)/.test(text);
const table = (text: string) => /^\|.*\|/m.test(text);
const math = (text: string) => /\$\$/.test(text);
const longCode = (text: string) => (text.match(/```(?:rust|haskell)[^\n]*\n((?:(?!```)[^\n]*\n)*)```/)?.[1]?.split('\n').length ?? 0) >= 25;
const choose = (capability: string, accepts: (content: string) => boolean) => selectChapters(sources, capability, accepts)[0]!;
const codeChapter = choose('multiple code listings and embedded media', text => (text.match(/```(?:rust|haskell)/g)?.length ?? 0) >= 3 && /<iframe\b/.test(text));
const longCodeChapter = choose('long code following a third-level heading', text => /### [^\n]+\n\n```rust[^\n]*\n(?:[^\n]*\n){25,}?```/.test(text));
const tableChapter = choose('tables and multiple sections', text => table(text) && (text.match(/^## /gm)?.length ?? 0) >= 3);
const equationChapter = choose('display math and code', text => math(text) && code(text));
const videoChapter = choose('one YouTube player in a figure', text => (text.match(/<iframe\b/g)?.length ?? 0) === 1 && /<figure[\s>][\s\S]*youtube\.com\/embed\//.test(text));
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
  const fonts = () => page.evaluate(async () => {
    let timer: ReturnType<typeof setTimeout>;
    try {
      await Promise.race([document.fonts.ready, new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Reader fonts did not settle: ' + document.fonts.status)), 10000);
      })]);
    } finally { clearTimeout(timer!); }
  });
  const settleFrame = () => page.evaluate(() => {
    document.documentElement.getBoundingClientRect();
    document.querySelector('main.leaves')?.getBoundingClientRect();
    return new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  // Force the first layout before awaiting fonts: WebKit can expose an already-resolved
  // document.fonts.ready before layout has requested the page font.
  await settleFrame();
  await fonts();
  // mdBook's sidebar/page wrapper uses CSS transitions during viewport changes;
  // wait for those and one extra ResizeObserver delivery before reading geometry.
  await page.evaluate(async () => {
    // WebKit can suspend color transitions on off-column copy controls indefinitely.
    // Only the native layout transitions matter to this geometry barrier.
    const running = document.getAnimations().filter((animation) => animation.playState === 'running' &&
      animation instanceof CSSTransition && /^(transform|margin-left|margin-right|width|height|left|right)$/.test(animation.transitionProperty));
    await Promise.allSettled(running.map((animation) => animation.finished.catch(() => undefined)));
  });
  await fonts();
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
          for (const page of context.pages()) if (!page.isClosed()) {
            await ready(readerPage(page));
            assert.deepEqual(await page.locator('#persistent-music, #music').evaluateAll(elements =>
              elements.flatMap(element => {
                const audio = element as HTMLAudioElement;
                return audio.error ? [{ src: audio.currentSrc, code: audio.error.code, message: audio.error.message }] : [];
              })), [], profile.name + ' reader audio decoding');
          }
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
    async function open(file: string, world?: 'magic' | 'real', prepare?: (page:Page)=>Promise<void>) {
      const context = await browser.newContext({ ...profile.options, reducedMotion: 'reduce' });
      await context.addInitScript(virtualMedia);
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
        // Firefox intentionally closes a media channel with this status after
        // caching its parsed data; it is not sent to the decoder as an error.
        // https://github.com/mozilla-firefox/firefox/blob/main/dom/media/ChannelMediaResource.cpp#L645-L666
        // Keep this exception limited to known reader media; HTTP and decoder errors still fail.
        const cachedReaderAudio = profile.engine === firefox && r.resourceType() === 'media' &&
          r.failure()?.errorText === 'NS_ERROR_PARSED_DATA_CACHED' &&
          (/\/audio\/welcome\/[^/]+\.mp3$/.test(r.url()) || /\/audio\/forest-breath\.mp3$/.test(r.url()));
        if (r.url().startsWith(base + '/') && !pausedReaderAudio && !cachedReaderAudio && !(moving.has(page) && cancelled)) {
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
      await prepare?.(page);
      // A usable chapter is the committed, font-settled reader, not the outer load event.
      await navigate(page, () => page.goto(base + '/' + file, { waitUntil:'domcontentloaded' }));
      await ready(page);
      return page;
    }

    /** Controls only the shell's fallback deadline and paint barrier, leaving native loads intact. */
    async function controlFallback(page: Page) {
      await page.addInitScript(() => {
        if (window !== window.top) return;
        const timeout=window.setTimeout.bind(window), clear=window.clearTimeout.bind(window), raf=window.requestAnimationFrame.bind(window);
        const probe={ hidden:false, held:false, frames:[] as FrameRequestCallback[], timers:[] as {id:number;cancelled:boolean;run:()=>void}[],
          setHidden(value:boolean) { this.hidden=value; document.dispatchEvent(new Event('visibilitychange')); },
          release() { this.held=false; this.frames.splice(0).forEach(callback=>raf(callback)); },
          expire() { this.timers.filter(timer=>!timer.cancelled).forEach(timer=>{timer.cancelled=true;timer.run();}); },
        };
        Object.defineProperty(document,'hidden',{configurable:true,get:()=>probe.hidden});
        Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>probe.hidden?'hidden':'visible'});
        window.requestAnimationFrame=callback=>{if(probe.held){probe.frames.push(callback);return 0;}return raf(callback);};
        window.setTimeout=((handler:TimerHandler,delay?:number,...args:any[])=>{
          if(delay!==15000)return timeout(handler,delay,...args);
          const id=timeout(()=>undefined,60000);
          probe.timers.push({id,cancelled:false,run:()=>{if(typeof handler==='function')handler(...args);}});
          return id;
        }) as typeof window.setTimeout;
        window.clearTimeout=id=>{probe.timers.filter(timer=>timer.id===id).forEach(timer=>{timer.cancelled=true;});clear(id);};
        (window as any).nativeFallbackProbe=probe;
      });
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

    test('returning to the entrance binds welcome after country detection was superseded', async () => {
      let release!: () => void;
      const gate = new Promise<void>(resolve => { release = resolve; });
      const page = await open('index.html', undefined, async page => {
        await page.context().addInitScript(() => {
          const timeout = window.setTimeout;
          window.setTimeout = ((handler: TimerHandler, delay?: number, ...args: unknown[]) =>
            timeout(handler, delay === 900 ? 10000 : delay, ...args)) as typeof window.setTimeout;
          (window as any).welcomeAttempts = 0;
          const play = HTMLMediaElement.prototype.play;
          HTMLMediaElement.prototype.play = function () {
            if (this.id === 'welcome-audio') (window as any).welcomeAttempts++;
            return play.call(this);
          };
        });
        await page.route('https://api.country.is/**', async request => { await gate; await request.fulfill({ json: { country: 'US' } }); });
      });
      try {
        await activate(page, '#gateway [data-world="real"]');
        const response = page.waitForResponse('https://api.country.is/');
        release(); await response;
        await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        if (await page.locator('#sidebar').getAttribute('aria-hidden') === 'true') await activate(page, '#sidebar-toggle');
        const before = await page.evaluate(() => (window as any).welcomeAttempts as number);
        await activate(page, '#sidebar .brand');
        await page.waitForFunction(count => document.documentElement.hasAttribute('data-gateway') && (window as any).welcomeAttempts > count, before);
        assert.equal(new URL(outerPage(page).url()).hash, '#worlds');
      } finally { release(); await page.unroute('https://api.country.is/**'); }
    });

    test('returning to the entrance binds welcome after a country-selected redirect was cancelled', async () => {
      let release!: () => void;
      const gate = new Promise<void>(resolve => { release = resolve; });
      const page = await open('index.html', undefined, async page => {
        await page.context().addInitScript(() => {
          const timeout = window.setTimeout;
          window.setTimeout = ((handler: TimerHandler, delay?: number, ...args: unknown[]) =>
            timeout(handler, delay === 900 ? 10000 : delay, ...args)) as typeof window.setTimeout;
          (window as any).welcomeAttempts = 0;
          const play = HTMLMediaElement.prototype.play;
          HTMLMediaElement.prototype.play = function () {
            if (this.id === 'welcome-audio') {
              (window as any).welcomeAttempts++;
              return Promise.reject(new Error('Autoplay blocked in regression fixture'));
            }
            return play.call(this);
          };
        });
        await page.route('https://api.country.is/**', async request => { await gate; await request.fulfill({ json: { country: 'CN' } }); });
      });
      const outer = outerPage(page), initial = outer.url();
      let releaseFonts!: () => void, seen!: () => void;
      const fonts = new Promise<void>(resolve => { releaseFonts = resolve; });
      const requested = new Promise<void>(resolve => { seen = resolve; });
      await page.route('**/*.woff2', async route => { seen(); await fonts; await route.continue().catch(() => undefined); });
      try {
        release();
        await requested;
        await outer.locator('.pending-chapter').waitFor({ state: 'attached' });
        const element = await outer.locator('.pending-chapter').elementHandle();
        await (await element!.contentFrame())!.waitForFunction(() => !!window.aluxPaperView);
        await navigate(page, async () => {
          await page.locator('#gateway [data-world="real"]').click({ noWaitAfter: true });
          await outer.locator('.pending-chapter').waitFor({ state: 'detached' });
        });
        releaseFonts();
        assert.equal(outer.url(), initial, 'the English entrance remains committed');
        if (await page.locator('#sidebar').getAttribute('aria-hidden') === 'true') await activate(page, '#sidebar-toggle');
        const before = await page.evaluate(() => (window as any).welcomeAttempts as number);
        await activate(page, '#sidebar .brand');
        await page.waitForFunction(count => document.documentElement.hasAttribute('data-gateway') && (window as any).welcomeAttempts > count, before);
        const reopened = await page.evaluate(() => (window as any).welcomeAttempts as number);
        await page.locator('#gateway').click({ position: { x: 10, y: 10 } });
        await page.waitForFunction(count => (window as any).welcomeAttempts > count, reopened);
        assert.equal(new URL(outer.url()).hash, '#worlds');
      } finally { release(); releaseFonts(); await page.unroute('https://api.country.is/**'); await page.unroute('**/*.woff2'); }
    });

    test('an entrance edition redirect preserves an unconsumed music checkpoint', async () => {
      const page = await open('index.html', undefined, async page => {
        await page.context().addInitScript(() => {
          if (window !== window.top) return;
          localStorage.setItem('alux-reader', JSON.stringify({ language:'zh', world:'real', music:false, bookmarks:[] }));
          sessionStorage.setItem('alux-music-time', '37');
        });
      });
      assert.equal(new URL(outerPage(page).url()).pathname, '/zh/index.html');
      assert.equal(await outerPage(page).locator('#persistent-music').evaluate(a => (a as HTMLAudioElement).paused), true, 'the entrance has not entered a reading world');
      assert.equal(await page.evaluate(() => sessionStorage.getItem('alux-music-time')), '37');
      await activate(page, '#gateway [data-world="real"]');
      await outerPage(page).waitForFunction(() => (document.getElementById('persistent-music') as HTMLAudioElement).currentTime >= 37);
    });

    test('a persisted entrance lifecycle restores automatic welcome and trusted recovery', async () => {
      const page = await open('zh/index.html', undefined, async page => {
        await page.context().addInitScript(() => {
          (window as any).welcomeAttempts = 0;
          const play = HTMLMediaElement.prototype.play;
          HTMLMediaElement.prototype.play = function () {
            if (this.id === 'welcome-audio') (window as any).welcomeAttempts++;
            return play.call(this);
          };
        });
      });
      await page.waitForFunction(() => (window as any).welcomeAttempts > 0);
      const before = await page.evaluate(() => {
        dispatchEvent(new PageTransitionEvent('pagehide', { persisted:true }));
        return (window as any).welcomeAttempts as number;
      });
      assert.equal(await page.locator('#welcome-audio').evaluate(a => (a as HTMLAudioElement).paused), true);
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted:true })));
      await page.waitForFunction(count => (window as any).welcomeAttempts > count, before);
      const restored = await page.evaluate(() => (window as any).welcomeAttempts as number);
      // A trusted pointer interaction on the entrance retries without using its manual play button.
      await activate(page, '#gateway');
      await page.waitForFunction(count => (window as any).welcomeAttempts > count, restored);
    });

    test('completed welcome is not replayed by ordinary interaction but the play button replays it', async () => {
      const page = await open('zh/index.html', undefined, async page => {
        await page.context().addInitScript(() => {
          (window as any).welcomeAttempts = 0;
          const play = HTMLMediaElement.prototype.play;
          HTMLMediaElement.prototype.play = function () {
            if (this.id === 'welcome-audio') (window as any).welcomeAttempts++;
            return play.call(this);
          };
        });
      });
      await activate(page, '#welcome-play');
      await page.waitForFunction(() => {
        const audio = document.getElementById('welcome-audio') as HTMLAudioElement;
        return !audio.paused && Number.isFinite(audio.duration) && audio.duration > 0;
      });
      await page.locator('#welcome-audio').evaluate(a => { const audio=a as HTMLAudioElement; audio.currentTime=Math.max(0,audio.duration-.02); });
      await page.waitForFunction(() => (document.getElementById('welcome-audio') as HTMLAudioElement).ended);
      const completed = await page.evaluate(() => (window as any).welcomeAttempts as number);
      await activate(page, '#gateway');
      await page.keyboard.press('Escape');
      await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      assert.equal(await page.evaluate(() => (window as any).welcomeAttempts), completed);
      await activate(page, '#welcome-play');
      await page.waitForFunction(count => (window as any).welcomeAttempts > count && !(document.getElementById('welcome-audio') as HTMLAudioElement).ended, completed);
    });

    test('the narrow magic toolbar keeps every action reachable at touch size', async () => {
      for(const edition of [english,arabic]){
        const page=await open(route(edition,chapters[0]!),'magic');
        if(await page.locator('#sidebar-toggle').getAttribute('aria-expanded')==='true')await activate(page,'#sidebar-toggle');
        await page.setViewportSize({width:320,height:844});await ready(page);
        const actions=await page.locator('#menu-bar .left-buttons :is(button,label.icon-button)').evaluateAll(buttons=>buttons.flatMap(button=>{
          const box=button.getBoundingClientRect();return box.width&&box.height?[{id:button.id,left:box.left,right:box.right,width:box.width,height:box.height,viewport:innerWidth}]:[];
        }));
        assert.ok(actions.length>=7,'all magic reading controls are present');
        for(const action of actions){
          assert.ok(action.left>=0&&action.right<=action.viewport,'the whole action fits the viewport: '+JSON.stringify(action));
          assert.ok(action.width>=44&&action.height>=44,'the action retains its touch target: '+JSON.stringify(action));
        }
        await activate(page,'#sidebar-toggle');
        assert.equal(await page.locator('#sidebar-toggle').getAttribute('aria-expanded'),'true');
        const collapse=await page.locator('#sidebar-toggle').evaluate(el=>{const b=el.getBoundingClientRect();return {left:b.left,right:b.right,viewport:innerWidth};});
        assert.ok(collapse.left>=-1&&collapse.right<=collapse.viewport+1,'the drawer collapse action stays visible');
        await activate(page,'#sidebar-toggle');
        await activate(page,'#reading-mode');
        assert.equal(await page.locator('html').getAttribute('data-reading'),'scroll');
        await activate(page,'#reading-mode');
        assert.equal(await page.locator('html').getAttribute('data-reading'),'pages');
        await page.context().close();
      }
    });

    test('oversized titles continue across narrow leaves at maximum reading scale', async () => {
      const file=choose('a long canonical English chapter title', text=>(text.match(/^# (.+)$/m)?.[1]?.length??0)>30);
      const page=await open(file,'magic');
      if(await page.locator('#sidebar-toggle').getAttribute('aria-expanded')==='true')await activate(page,'#sidebar-toggle');
      await page.setViewportSize({width:320,height:844});await ready(page);
      const title=await page.locator('main.leaves h1').textContent();
      for(let i=0;i<5;i++)await activate(page,'#text-larger');
      await ready(page);
      const glyphs=await page.locator('main.leaves h1').evaluate(heading=>{
        const leaf=heading.closest('main')!.getBoundingClientRect(),walker=document.createTreeWalker(heading,NodeFilter.SHOW_TEXT);
        const canvas=document.createElement('canvas').getContext('2d')!;
        const boxes=[];
        for(let node=walker.nextNode();node;node=walker.nextNode())for(let i=0;i<(node.textContent?.length??0);i++){
          if(!node.textContent![i]!.trim())continue;
          const style=getComputedStyle(node.parentElement!);
          canvas.font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          const metrics=canvas.measureText(node.textContent![i]!);
          const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1);
          // A Range includes the font's empty ascent/descent. WebKit may place that
          // selection box slightly above a column even when every printed stroke fits.
          for(const box of range.getClientRects())if(box.width&&box.height)boxes.push({
            top:box.top-leaf.top+metrics.fontBoundingBoxAscent-metrics.actualBoundingBoxAscent,
            bottom:box.top-leaf.top+metrics.fontBoundingBoxAscent+metrics.actualBoundingBoxDescent,
            metricDifference:Math.abs(box.height-metrics.fontBoundingBoxAscent-metrics.fontBoundingBoxDescent),
          });
        }
        return {height:leaf.height,boxes};
      });
      assert.ok(glyphs.boxes.length>0);
      assert.ok(glyphs.boxes.every(box=>box.metricDifference<2),'Range and canvas use the same font metrics');
      assert.ok(glyphs.boxes.every(box=>box.top>=-1&&box.bottom<=glyphs.height+1),'every printed title glyph stays within a leaf: '+JSON.stringify(glyphs));
      assert.equal(await page.locator('main.leaves h1').textContent(),title);
      for(let i=0;i<5;i++)await activate(page,'#text-smaller');
      await ready(page);
      assert.equal(await page.locator('main.leaves h1').evaluate(heading=>getComputedStyle(heading).display),'inline-block','a fitting title keeps the approved atomic layout');
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
      for (const file of selectChapters(sources, 'tables and multi-section prose', text => table(text) && (text.match(/^## /gm)?.length ?? 0) >= 3, 2)) {
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

    if (!profile.options.isMobile) test('fixed gutter and paper texture stay registered through a full turn', async () => {
      for(const night of [false,true]) {
        const page=await open(route(chinese,tableChapter),'magic');
        if(night){await activate(page,'#theme-toggle');await ready(page);}
        await page.emulateMedia({reducedMotion:'no-preference'});
        const before=await page.locator('.volume').boundingBox();
        await activate(page,'#page-next');
        await page.waitForSelector('.turn-leaf .stf__item.--simple');
        const sampled=await page.evaluate(()=>{
          const volume=document.querySelector<HTMLElement>('.volume')!,host=document.querySelector<HTMLElement>('.turn-leaf')!;
          const block=host.querySelector('.stf__block')!,gutter=getComputedStyle(block,'::after'),binding=getComputedStyle(volume,'::before');
          const cover=volume.getBoundingClientRect(),box=block.getBoundingClientRect();
          const grain=getComputedStyle(volume).backgroundSize.split(',')[1]?.trim().split(/\s+/).map(Number.parseFloat)??[];
          const geometry={content:gutter.content,shade:gutter.backgroundImage,originalShade:binding.backgroundImage,
            x:box.left+parseFloat(gutter.left)-(cover.left+volume.clientLeft+parseFloat(binding.left)),
            y:box.top+parseFloat(gutter.top)-(cover.top+volume.clientTop+parseFloat(binding.top)),
            height:box.height-parseFloat(gutter.top)-parseFloat(gutter.bottom)-(volume.clientHeight-parseFloat(binding.top)-parseFloat(binding.bottom)),
            ribbonAbove:Number(getComputedStyle(volume,'::after').zIndex)>Number(getComputedStyle(host).zIndex),
            textures:[...host.querySelectorAll<HTMLElement>('.stf__item.--simple')].map(sheet=>{
              const paper=sheet.querySelector('.turn-sheet-content')!,r=paper.getBoundingClientRect(),style=getComputedStyle(paper),position=style.backgroundPosition.split(',')[1]?.trim().split(/\s+/)??[];
              return {image:style.backgroundImage,position,
                x:r.left+parseFloat(position[0]??'NaN')-(cover.left+(cover.width-grain[0]!)/2),
                y:r.top+parseFloat(position[1]??'NaN')-(cover.top+(cover.height-grain[1]!)/2)};
            })};
          return new Promise<{geometry:typeof geometry;samples:{top:number;height:number;scroll:number}[]}>(resolve=>{
            const samples:{top:number;height:number;scroll:number}[]=[];let finished=0;
            const sample=()=>{const r=volume.getBoundingClientRect();samples.push({top:r.top,height:r.height,scroll:scrollY});if(!document.querySelector('.turn-leaf'))finished++;if(finished===3)resolve({geometry,samples});else requestAnimationFrame(sample);};sample();
          });
        });
        assert.equal(sampled.geometry.content,'""','the binding shade remains painted above stationary snapshots');
        assert.equal(sampled.geometry.shade,sampled.geometry.originalShade,'the gutter uses the resting binding material');
        for(const key of ['x','y','height'] as const) assert.ok(Math.abs(sampled.geometry[key])<1,'gutter '+key+' matches the resting book');
        assert.ok(sampled.geometry.ribbonAbove,'the fixed ribbon stays above the paper renderer');
        if(!night) for(const texture of sampled.geometry.textures){
          assert.ok(texture.image.includes('ivory-paper'),'snapshot retains the actual paper texture');
          assert.ok(!texture.position.join(' ').includes('%'),'texture phase uses the measured book origin');
          assert.ok(Math.abs(texture.x)<1 && Math.abs(texture.y)<1,'static paper grain never re-centers at overlay entry');
        }
        for(const key of ['top','height','scroll'] as const) assert.ok(Math.max(...sampled.samples.map(s=>s[key]))-Math.min(...sampled.samples.map(s=>s[key]))<1,'full turn never changes '+key);
        assert.deepEqual(await page.locator('.volume').boundingBox(),before,'binding stays put through overlay removal');
      }
    });

    test('video artwork remains on turning paper without replacing the native player', async () => {
      let players=0,posters=0;
      const page=await open(route(chinese,videoChapter),'magic',async p=>{
        await p.route('https://www.youtube.com/embed/**',async r=>{players++;await r.fulfill({contentType:'text/html',body:'<!doctype html><title>Video fixture</title>'});});
        await p.route('https://i.ytimg.com/**',async r=>{posters++;await r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=','base64')});});
      });
      const media=page.locator('.volume > main.leaves iframe');
      const spread=await media.evaluate(e=>{const m=e.closest<HTMLElement>('main')!,r=e.getBoundingClientRect(),box=m.getBoundingClientRect();return Math.floor((r.left-box.left)/(m.clientWidth+parseFloat(getComputedStyle(m).columnGap)));});
      for(let i=0;i<spread;i++)await activate(page,'#page-next');
      await page.evaluate(()=>{const f=document.querySelector('.volume > main.leaves iframe') as HTMLIFrameElement;(window as any).nativeVideo={element:f,window:f.contentWindow,height:f.closest('figure')!.offsetHeight};});
      const initialPlayers=players;
      await page.emulateMedia({reducedMotion:'no-preference'});
      // Observe inside the browser before triggering the short fold. Multiple protocol
      // round trips can outlast it on CI, even though the artwork was painted correctly.
      await page.evaluate(()=>{
        (window as any).foldMediaState=undefined;
        const sample=()=>{
          const copy=document.querySelector<HTMLElement>('.turn-leaf figure:has(.turn-media)');
          const image=copy?.querySelector<HTMLImageElement>('img');
          if(!copy?.offsetHeight || !image?.complete || !image.naturalWidth){requestAnimationFrame(sample);return;}
          const original=(window as any).nativeVideo;
          (window as any).foldMediaState={live:original.element===document.querySelector('.volume > main.leaves iframe') && original.window===original.element.contentWindow,copyHeight:copy.offsetHeight,sourceHeight:original.height,players:document.querySelectorAll('.turn-leaf iframe,.turn-leaf video,.turn-leaf audio').length,poster:image.src,playMark:getComputedStyle(copy.querySelector('.turn-media')!,'::after').content};
        };
        requestAnimationFrame(sample);
      });
      await activate(page,'#page-next');
      await page.waitForFunction(()=>(window as any).foldMediaState);
      const state=await page.evaluate(()=>(window as any).foldMediaState as {live:boolean;copyHeight:number;sourceHeight:number;players:number;poster:string;playMark:string});
      assert.equal(state.live,true,'the existing iframe and browsing context are retained');
      assert.equal(state.copyHeight,state.sourceHeight,'poster preserves the iframe baseline and figure height');
      assert.equal(state.players,0,'fold artwork creates no duplicate playback');
      const embed = sources.find(({file}) => file === videoChapter)!.content.match(/youtube\.com\/embed\/([^\s"?]+)/)![1]!;
      assert.ok(state.poster?.includes('/'+embed+'/hqdefault.jpg'),'artwork comes from this canonical video');
      assert.equal(state.playMark,'""','the video remains recognizable even before external artwork loads');
      await page.waitForFunction(()=>!document.querySelector('.turn-leaf'));
      assert.equal(await media.evaluate(e=>e===(window as any).nativeVideo.element && (e as HTMLIFrameElement).contentWindow===(window as any).nativeVideo.window),true);
      assert.equal(players,initialPlayers,'turning never reloads the native player');assert.ok(posters>0);
    });

    if(!profile.options.isMobile) test('long code follows its heading without leaving an almost empty interior leaf', async()=>{
      const page=await open(route(chinese,longCodeChapter),'magic');
      const placement=await page.locator('h3:has(+ pre)').first().evaluate(h=>{
        const heading=h.closest('h3')!,pre=heading.nextElementSibling!,main=heading.closest('main')!,box=main.getBoundingClientRect(),gap=parseFloat(getComputedStyle(main).columnGap),width=(main.clientWidth-gap)/2;
        const col=(e:Element)=>Math.floor((e.getBoundingClientRect().left-box.left+1)/(width+gap));
        return {heading:col(heading),code:col(pre),panel:pre.getBoundingClientRect().height,leaf:main.clientHeight};
      });
      assert.equal(placement.heading,placement.code,'the section and its code begin on the same leaf');
      assert.ok(placement.panel<placement.leaf*.8,'long listings leave space for surrounding prose');
    });

    test('paper begins at the closed corner instead of an already lifted pose', async () => {
      const page=await open(route(chinese,tableChapter),'magic');
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
      // Arm before activation; the renderer adds its stationary sheet after the overlay host.
      await page.evaluate(()=>{
        (window as any).blankFoldSample = undefined;
        const observe=()=>{
        const leaf=document.querySelector<HTMLElement>('.turn-leaf');
        const resting=leaf?.querySelector('.stf__item.--simple main.leaves');
        if(!leaf || !resting){requestAnimationFrame(observe);return;}
        const source=document.querySelector('.volume > main.leaves')!;
        const copy=leaf.querySelector('main.leaves')!;
        const cover=document.querySelector('.volume')!.getBoundingClientRect(),box=leaf.getBoundingClientRect();
        const read=(main:Element)=>[...main.querySelectorAll('h1,h2,h3,p,li,pre')].map(e=>({height:(e as HTMLElement).offsetHeight,line:getComputedStyle(e).lineHeight,margin:getComputedStyle(e).marginTop,rects:e.getClientRects().length}));
        const rest=resting.getBoundingClientRect(),live=source.getBoundingClientRect();
        const state={baseline:{x:rest.left-live.left,y:rest.top-live.top},hidden:leaf.getAttribute('aria-hidden'),ids:leaf.querySelectorAll('[id]').length,overflow:getComputedStyle(leaf).overflow,x:box.left-cover.left,y:box.top-cover.top,source:read(source),copy:read(copy)};
        const samples:{height:number;scroll:number}[]=[];
        const sample=()=>{samples.push({height:document.documentElement.scrollHeight,scroll:scrollY});if(samples.length===10)(window as any).blankFoldSample={state,samples};else requestAnimationFrame(sample)};sample();
        };
        requestAnimationFrame(observe);
      });
      // Bottom outside the text block: actual paper, not a link, paragraph or button.
      await page.mouse.click(before.x + before.width - 20, before.y + before.height - 24);
      await page.waitForFunction(() => !!(window as any).blankFoldSample);
      const sampled=await page.evaluate(()=>(window as any).blankFoldSample as {
        state:{baseline:{x:number;y:number};hidden:string|null;ids:number;overflow:string;x:number;y:number;source:unknown;copy:unknown};
        samples:{height:number;scroll:number}[];
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
      assert.equal(at.first, 1, 'resize cancels the old transition without committing its destination');
      await activate(page, '#page-next');
      await page.waitForFunction(() => !document.querySelector('.turn-leaf'));
      assert.ok((await folio(page)).first > at.first, 'a fresh turn uses the new geometry');
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
      const chapter = english.pages.find((page) => page.file === choose('over-height code listing', longCode));
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

    test('focused local scrollports retain native paging keys without turning the book', async () => {
      for (const fixture of [
        { file: choose('over-height code listing', longCode), selector: 'pre > code', axis: 'y' },
        { file: tableChapter, selector: '.table-wrapper', axis: 'x' },
        { file: equationChapter, selector: '.katex-display', axis: 'x' },
      ]) {
        const page = await open(fixture.file, 'magic', async page => {
          // External player loading is unrelated to the focused native scrollport.
          await page.route('**/*', route => route.request().resourceType() === 'document' && !route.request().url().startsWith(base + '/')
            ? route.fulfill({ contentType: 'text/html', body: '<!doctype html>' }) : route.continue());
        });
        const port = page.locator('main.leaves ' + fixture.selector).first();
        await port.evaluate((element, axis) => {
          const port = element as HTMLElement;
          // Bound the real source element to exercise its native scroll ownership on every profile.
          if (axis === 'x') {
            port.style.width = '80px';
            (port.firstElementChild as HTMLElement).style.minWidth = '600px';
          }
        }, fixture.axis);
        await page.evaluate(() => dispatchEvent(new Event('resize')));
        await ready(page);
        let visible = false;
        for (let attempt = 0; attempt < (await folio(page)).total; attempt++) {
          visible = await port.evaluate(element => {
            const box = element.getBoundingClientRect(), leaf = element.closest('main')!.getBoundingClientRect();
            return box.left >= leaf.left - 1 && box.right <= leaf.right + 1;
          });
          if (visible) break;
          await activate(page, '#page-next');
          await ready(page);
        }
        assert.equal(visible, true, fixture.selector + ' is on the displayed spread');
        await port.scrollIntoViewIfNeeded();
        assert.equal(await port.getAttribute('tabindex'), '0', 'production makes the overflowing port tabbable');
        await port.evaluate(element => {
          const start = document.createElement('button'); start.id = 'scrollport-keyboard-start';
          element.before(start); start.focus();
        });
        await page.keyboard.press('Tab');
        assert.equal(await port.evaluate(element => element === document.activeElement), true, 'Tab reaches the production scrollport');
        await page.locator('#scrollport-keyboard-start').evaluate(element => element.remove());
        const before = await folio(page), address = page.url();
        const overflow = await port.evaluate((element, axis) => axis === 'y'
          ? element.scrollHeight > element.clientHeight : element.scrollWidth > element.clientWidth, fixture.axis);
        assert.equal(overflow, true, fixture.selector + ' has real local overflow');
        assert.equal(await port.evaluate(element => element === document.activeElement), true);
        for (const key of ['PageDown', 'PageUp', ' ', 'ArrowLeft', 'ArrowRight']) {
          const native = await port.evaluate((element, key) => element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })), key);
          assert.equal(native, true, fixture.selector + ' retains native ' + key);
          assert.deepEqual(await folio(page), before);
          assert.equal(page.url(), address);
        }
        if (fixture.axis === 'y') {
          for (const key of ['PageDown', 'PageUp', 'Space']) {
            await port.evaluate((element, key) => { element.scrollTop = key === 'PageUp' ? element.scrollHeight : 0; }, key);
            const offset = await port.evaluate(element => element.scrollTop);
            await port.press(key);
            await page.waitForFunction(({ selector, offset }) => document.querySelector('main.leaves ' + selector)!.scrollTop !== offset,
              { selector: fixture.selector, offset });
            assert.deepEqual(await folio(page), before, 'native scrolling preserves the spread');
          }
        } else {
          await port.press('ArrowRight');
          await page.waitForFunction(selector => document.querySelector('main.leaves ' + selector)!.scrollLeft > 0, fixture.selector);
          assert.deepEqual(await folio(page), before, 'horizontal scrolling preserves the spread');
        }
        await page.context().close();
      }
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
          await pending.locator('#content > .volume').waitFor({state:'attached'});
          assert.equal(outer.url(),from,'the old route remains visible while the next reader is gated');
          assert.equal(await page.locator('#content > .volume > main.leaves').evaluate(m=>getComputedStyle(m).visibility),'visible');
          assert.equal(await outer.locator('.pending-chapter').evaluate(frame => getComputedStyle(frame).opacity), '0', 'the whole unprepared destination remains hidden');
          assert.equal(await pending.locator('[data-navigation-handoff-veil]').count(), 0, 'no serialized paper is restored');
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

    test('a scrolled desk keeps its chapter handoff moving without a restoration jump', async () => {
      const page = await open(english.pages[0]!.file + '#last-page', 'magic');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      const size = page.viewportSize()!;
      await page.setViewportSize({ width: size.width, height: Math.min(650, size.height) });
      await ready(page);
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await ready(page);
      assert.ok(await page.evaluate(() => scrollY > 0), 'the departing desk is scrolled');
      const sourceSize = await page.evaluate(() => window.aluxPaperView!.capture().map(s => [s.style.width, s.style.height]));
      await page.context().addInitScript(() => {
        const samples: Array<{ scroll: number; pose: string }> = [];
        (window as any).handoffSamples = samples;
        const sample = () => {
          if (document.querySelector('.turn-leaf')) samples.push({ scroll: scrollY,
            pose: [...document.querySelectorAll('.turn-leaf .stf__item')].map(e => getComputedStyle(e).transform).join('|') });
          requestAnimationFrame(sample);
        };
        addEventListener('load', () => requestAnimationFrame(sample), { once:true });
      });
      await navigate(page, () => activate(page, '#page-next'));
      await page.waitForFunction(() => !document.querySelector('.turn-leaf'));
      const samples = await page.evaluate(() => (window as any).handoffSamples as Array<{scroll:number;pose:string}>);
      const destinationSize = await page.evaluate(() => window.aluxPaperView!.capture().map(s => [s.style.width, s.style.height]));
      assert.ok(samples.length > 3 && new Set(samples.map(s => s.pose)).size > 1, 'the restored destination completes an actual animated fold ' + JSON.stringify({sourceSize,destinationSize,frames:samples.length,samples:samples.slice(0,6)}));
      assert.ok(samples[0]!.scroll > 0, 'the fold starts at the restored desk position');
      assert.ok(Math.max(...samples.map(s => s.scroll)) - Math.min(...samples.map(s => s.scroll)) < 1, 'restoration never scrolls during the fold');
    });

    test('same-chapter document replacement reactivates music controls', async () => {
      const page = await open(chapters[0]!, 'real');
      const outer = outerPage(page);
      await activate(page, '#music-toggle');
      await outer.waitForFunction(() => !(document.getElementById('persistent-music') as HTMLAudioElement).paused);
      const target = new URL(outer.url()); target.searchParams.set('highlight', 'ALUX');
      await navigate(page, async () => {
        await page.evaluate(url => { location.href = url; }, target.href);
        await outer.waitForURL(target.href);
      });
      await activate(page, '#music-toggle');
      assert.equal(await outer.locator('#persistent-music').evaluate(a => (a as HTMLAudioElement).paused), true, 'the replacement document can pause shared music');
      await activate(page, '#music-toggle');
      await outer.waitForFunction(() => !(document.getElementById('persistent-music') as HTMLAudioElement).paused);
    });

    test('a current-chapter search result supersedes a prepared chapter', async () => {
      const file = choose('a searchable source heading', text => /^# .*meaning/im.test(text));
      const page = await open(file, 'real');
      const outer = outerPage(page);
      if (await page.locator('#sidebar').getAttribute('aria-hidden') === 'true') await activate(page, '#sidebar-toggle');
      await activate(page, '#sidebar-search');
      await page.locator('#searchbar').fill('meaning');
      await searchResults(page, 'meaning');
      const results = page.locator('#searchresults a');
      const current = await results.evaluateAll(links => links.findIndex(a => new URL((a as HTMLAnchorElement).href).pathname === location.pathname));
      assert.ok(current >= 0, 'native results include the visible source chapter');
      const result = results.nth(current);
      const target = await result.getAttribute('href');
      assert.ok(target && new URL(target, outer.url()).pathname === new URL(outer.url()).pathname, 'a real result belongs to the visible chapter');
      let release!: () => void, releaseResult!: () => void;
      const gate = new Promise<void>(resolve => { release = resolve; });
      const resultGate = new Promise<void>(resolve => { releaseResult = resolve; });
      const other = base + '/' + chapters.find(chapter => chapter !== file)!;
      const targetURL = new URL(target, outer.url());
      const matchesResult = (url: URL) => url.pathname === targetURL.pathname && url.search === targetURL.search;
      await page.route(other, async request => { await gate; await request.continue().catch(() => undefined); });
      await page.route(matchesResult, async request => { await resultGate; await request.continue().catch(() => undefined); });
      moving.add(page);
      try {
        const requested = page.waitForRequest(other);
        await outer.evaluate(url => window.aluxReaderShell!.navigate(url), other);
        await requested;
        const resultRequested = page.waitForRequest(request => matchesResult(new URL(request.url())));
        await result.click({ noWaitAfter: true });
        await resultRequested;
        assert.equal(await outer.locator('.pending-chapter').evaluateAll((frames, previous) => frames.some(f => (f as HTMLIFrameElement).src === previous), other), false, 'the older preparation is cancelled before the newer result is ready');
        release();
        releaseResult();
        await outer.waitForURL(targetURL.href);
        await outer.locator('.pending-chapter').waitFor({ state: 'detached' });
        await ready(page);
        assert.equal(new URL(outer.url()).pathname, '/' + file);
        assert.equal(new URL(outer.url()).searchParams.get('highlight'), 'meaning');
        assert.equal(await outer.locator('.chapter-frame').count(), 1);
      } finally { release(); releaseResult(); moving.delete(page); await page.unroute(other); await page.unroute(matchesResult); }
    });

    test('search opened from a narrow drawer stays within the viewport', async () => {
      for(const world of ['magic','real'] as const){
        const page=await open(chapters[1]!,world),outer=outerPage(page);
        if(await page.locator('#sidebar-toggle').getAttribute('aria-expanded')==='true')await activate(page,'#sidebar-toggle');
        await page.setViewportSize({width:390,height:844});await ready(page);
        await activate(page,'#sidebar-toggle');await activate(page,'#sidebar-search');
        const bounds=()=>page.locator('#searchbar').evaluate(element=>{const b=element.getBoundingClientRect();return {left:b.left,right:b.right,viewport:innerWidth};});
        const opened=await bounds();
        assert.ok(opened.left>=0&&opened.right<=opened.viewport,'the search field fits after opening its drawer: '+JSON.stringify(opened));
        await page.locator('#searchbar').fill('meaning');await searchResults(page,'meaning');
        await outer.waitForURL(url=>url.searchParams.get('search')==='meaning');
        await page.locator('#search-wrapper').click({position:{x:5,y:5}});
        await page.locator('#searchbar').waitFor({state:'hidden'});
        assert.equal(new URL(await page.evaluate(()=>location.href)).searchParams.get('search'),'meaning','native toggle retains its query');
        await navigate(page,()=>page.reload());await searchResults(page,'meaning');
        const reloaded=await bounds();
        assert.ok(reloaded.left>=0&&reloaded.right<=reloaded.viewport,'a retained search also fits after reload');
        await page.context().close();
      }
    });

    test('native search edits and clearing keep the shell URL reloadable', async () => {
      const page = await open(chapters[0]!, 'real');
      const outer = outerPage(page);
      if (await page.locator('#sidebar').getAttribute('aria-hidden') === 'true') await activate(page, '#sidebar-toggle');
      await activate(page, '#sidebar-search');
      await page.locator('#searchbar').fill('meaning');
      await searchResults(page, 'meaning');
      await outer.waitForURL(url => url.searchParams.get('search') === 'meaning');
      await navigate(page, () => page.reload());
      await searchResults(page, 'meaning');
      assert.equal(await page.locator('#searchbar').inputValue(), 'meaning');
      await page.locator('#searchbar').fill('');
      await outer.waitForURL(url => url.searchParams.get('search') === '');
      assert.equal(await page.locator('#searchresults li').count(), 0);
      await page.locator('#searchbar').fill('semantic');
      await searchResults(page, 'semantic');
      await page.locator('#searchbar').press('Escape');
      await outer.waitForURL(url => !url.searchParams.has('search'));
      assert.equal(await page.locator('#searchbar').isVisible(), false);
    });

    test('cancelling a history preparation restores the retained chapter URL', async () => {
      const page = await open(chapters[0]!, 'real');
      const outer = outerPage(page), middle = base + '/' + chapters[1]!, retained = base + '/' + chapters[2]!;
      for (const url of [middle, retained]) await navigate(page, async () => {
        await outer.evaluate(url => window.aluxReaderShell!.navigate(url), url);
        await outer.waitForURL(url);
      });
      let release!: () => void, seen!: () => void;
      const gate = new Promise<void>(resolve => { release = resolve; });
      const requested = new Promise<void>(resolve => { seen = resolve; });
      await page.route('**/*.woff2', async route => { seen(); await gate; await route.continue().catch(() => undefined); });
      moving.add(page);
      try {
        await outer.evaluate(() => history.back());
        await requested;
        const element = await outer.locator('.pending-chapter').elementHandle();
        const frame = (await element!.contentFrame())!;
        await frame.waitForFunction(() => !!window.aluxPaperView && !document.documentElement.hasAttribute('data-chapter-ready'));
        await page.locator('#text-larger').click({ noWaitAfter: true });
        await outer.locator('.pending-chapter').waitFor({ state: 'detached' });
        await outer.waitForURL(retained);
        assert.equal(outer.url(), retained, 'cancelled Back cannot leave the old destination in the address bar');
        release();
        await page.unroute('**/*.woff2');
        await navigate(page, async () => { await page.goBack(); await outer.waitForURL(middle); });
        assert.equal(await page.evaluate(() => location.pathname), new URL(middle).pathname, 'Back still visits the original middle entry');
        await navigate(page, async () => { await page.goBack(); await outer.waitForURL(base + '/' + chapters[0]); });
        await navigate(page, async () => { await page.goForward(); await outer.waitForURL(middle); });
        await navigate(page, async () => { await page.goForward(); await outer.waitForURL(retained); });
        await navigate(page, () => page.reload());
        assert.equal(outer.url(), retained);
        assert.equal(await page.evaluate(() => location.pathname), new URL(retained).pathname, 'reload opens the retained visible chapter');
      } finally { release(); moving.delete(page); await page.unroute('**/*.woff2'); }
    });

    test('native fragment entries keep their positions when a traversal is cancelled', async () => {
      const page=await open(chapters[0]!,'real'),outer=outerPage(page),from=outer.url(),retained=base+'/'+chapters[1]!;
      const id=await page.locator('main.leaves [id]').first().getAttribute('id');assert.ok(id);
      const fragment=from+'#'+id;
      await navigate(page,async()=>{
        await outer.evaluate(id=>new Promise<void>(resolve=>{addEventListener('popstate',()=>resolve(),{once:true});location.hash=id;}),id!);
        await outer.waitForURL(fragment);await outer.locator('.pending-chapter').waitFor({state:'detached'});
        await outer.waitForFunction(url=>document.querySelector<HTMLIFrameElement>('.chapter-frame:not(.pending-chapter)')?.contentWindow?.location.href===url,fragment);
      });
      await navigate(page,async()=>{await outer.evaluate(url=>window.aluxReaderShell!.navigate(url),retained);await outer.waitForURL(retained);await outer.locator('.pending-chapter').waitFor({state:'detached'});});
      let release!:()=>void,seen!:()=>void;
      const gate=new Promise<void>(resolve=>{release=resolve;}),requested=new Promise<void>(resolve=>{seen=resolve;});
      await page.route('**/*.woff2',async route=>{seen();await gate;await route.continue().catch(()=>undefined);});
      moving.add(page);
      try{
        await outer.evaluate(()=>history.go(-2));await requested;
        const element=await outer.locator('.pending-chapter').elementHandle();
        await (await element!.contentFrame())!.waitForFunction(()=>!!window.aluxPaperView);
        await page.locator('#text-larger').click({noWaitAfter:true});
        await outer.waitForURL(retained);
        await outer.locator('.pending-chapter').waitFor({state:'detached'});
        release();await page.unroute('**/*.woff2');
        await navigate(page,async()=>{await page.goBack();await outer.waitForURL(fragment);});
        await navigate(page,async()=>{await page.goBack();await outer.waitForURL(from);});
        await navigate(page,async()=>{await page.goForward();await outer.waitForURL(fragment);});
        await navigate(page,async()=>{await page.goForward();await outer.waitForURL(retained);});
      }finally{release();await page.unroute('**/*.woff2');await outer.locator('.pending-chapter').waitFor({state:'detached'});await ready(page);moving.delete(page);}
    });

    test('repeated next-chapter input reuses its pending document and deadline', async () => {
      const page=await open(chapters[0]!+'#last-page','magic',controlFallback),outer=outerPage(page);
      const next=await page.locator('.nav-wide-wrapper a[rel~="next"]').evaluate(a=>(a as HTMLAnchorElement).href);
      let release!:()=>void,seen!:()=>void;
      const gate=new Promise<void>(resolve=>{release=resolve;}),requested=new Promise<void>(resolve=>{seen=resolve;});
      await page.route('**/*.woff2',async route=>{seen();await gate;await route.continue().catch(()=>undefined);});
      moving.add(page);
      try{
        await page.locator('#page-next').click({noWaitAfter:true});await requested;
        const element=await outer.locator('.pending-chapter').elementHandle();
        await (await element!.contentFrame())!.waitForFunction(()=>!!window.aluxPaperView);
        const pending=await outer.evaluate(()=>{
          (window as any).reusedChapter=document.querySelector('.pending-chapter');
          return (window as any).nativeFallbackProbe.timers.filter((t:any)=>!t.cancelled).map((t:any)=>t.id);
        });
        assert.equal(pending.length,1,'one fallback deadline owns this preparation');
        await page.evaluate(()=>(document.activeElement as HTMLElement)?.blur());
        for(let repeat=0;repeat<3;repeat++)await page.keyboard.press('ArrowRight');
        assert.equal(await outer.evaluate(()=>document.querySelector('.pending-chapter')===(window as any).reusedChapter),true,'repeat input retains the original native document');
        assert.deepEqual(await outer.evaluate(()=>(window as any).nativeFallbackProbe.timers.filter((t:any)=>!t.cancelled).map((t:any)=>t.id)),pending,'repeat input does not extend the fallback deadline');
        release();await outer.waitForURL(next);await outer.locator('.pending-chapter').waitFor({state:'detached'});
      }finally{release();await page.unroute('**/*.woff2');await outer.locator('.pending-chapter').waitFor({state:'detached'});await ready(page);moving.delete(page);}
    });

    test('a same-URL history traversal adopts the selected entry before changing settings', async () => {
      const page=await open(chapters[0]!,'real'),outer=outerPage(page);
      const initial=await outer.evaluate(()=>history.state);
      for(const file of [chapters[1]!,chapters[0]!])await navigate(page,async()=>{
        await outer.evaluate(file=>window.aluxReaderShell!.navigate('/'+file),file);
        await outer.waitForURL(base+'/'+file);
        await outer.locator('.pending-chapter').waitFor({state:'detached'});
      });
      await outer.evaluate(()=>new Promise<void>(resolve=>{
        addEventListener('popstate',()=>resolve(),{once:true});history.go(-2);
      }));
      assert.deepEqual(await outer.evaluate(()=>history.state),initial);
      await activate(page,'#text-larger');await ready(page);
      assert.deepEqual(await outer.evaluate(()=>history.state),initial,'a settings change cannot undo an accepted traversal');
      await navigate(page,async()=>{await page.goForward();await outer.waitForURL(base+'/'+chapters[1]);});
      await navigate(page,async()=>{await page.goForward();await outer.waitForURL(base+'/'+chapters[0]);});
    });

    test('in-frame fragment Back cancels a prepared chapter', async () => {
      const page=await open(chapters[0]!,'real',controlFallback),outer=outerPage(page);
      const ids=await page.locator('main.leaves a.header[href^="#"]').evaluateAll(links=>links.slice(0,2).map(a=>a.getAttribute('href')!));
      assert.equal(ids.length,2,'canonical source has two heading anchors');
      for(const hash of ids){
        await page.evaluate(hash=>new Promise<void>(resolve=>{addEventListener('hashchange',()=>resolve(),{once:true});location.hash=hash;}),hash);
        await outer.waitForURL(base+'/'+chapters[0]+hash);
      }
      moving.add(page);
      try{
        await outer.evaluate(file=>{(window as any).nativeFallbackProbe.held=true;window.aluxReaderShell!.navigate('/'+file);},chapters[1]!);
        const pending=await outer.locator('.pending-chapter').elementHandle();
        await (await pending!.contentFrame())!.waitForFunction(()=>document.documentElement.hasAttribute('data-chapter-ready'));
        await page.evaluate(()=>new Promise<void>(resolve=>{addEventListener('hashchange',()=>resolve(),{once:true});history.back();}));
        assert.equal(await outer.locator('.pending-chapter').count(),0,'native fragment history supersedes the pending chapter');
        await outer.waitForURL(base+'/'+chapters[0]+ids[0]);
        await outer.evaluate(()=>(window as any).nativeFallbackProbe.release());
        await outer.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
        assert.equal(outer.url(),base+'/'+chapters[0]+ids[0],'late readiness cannot replace the selected fragment');
        await page.evaluate(()=>history.forward());await outer.waitForURL(base+'/'+chapters[0]+ids[1]);
      }finally{await outer.evaluate(()=>(window as any).nativeFallbackProbe.release());await outer.locator('.pending-chapter').waitFor({state:'detached'});await ready(page);moving.delete(page);}
    });

    test('a newer reading choice cancels navigation queued during history restoration', async () => {
      const page=await open(chapters[0]!,'magic',controlFallback),outer=outerPage(page);
      for(const file of [chapters[1]!,chapters[2]!])await navigate(page,async()=>{
        await outer.evaluate(file=>window.aluxReaderShell!.navigate('/'+file),file);await outer.waitForURL(base+'/'+file);
      });
      moving.add(page);
      try{
        await outer.evaluate(()=>{(window as any).nativeFallbackProbe.held=true;history.back();});
        const pending=await outer.locator('.pending-chapter').elementHandle();
        await (await pending!.contentFrame())!.waitForFunction(()=>document.documentElement.hasAttribute('data-chapter-ready'));
        await outer.evaluate(file=>{
          const shell=window.aluxReaderShell!,active=document.querySelector<HTMLIFrameElement>('.chapter-frame:not(.pending-chapter)')!;
          // Make the queued choice and the newer reading action before native popstate delivery.
          shell.invalidate(active.contentWindow!);shell.navigate('/'+file);
          active.contentWindow!.document.getElementById('reading-mode')!.click();
        },chapters[3]!);
        await outer.waitForURL(base+'/'+chapters[2]);
        assert.equal(await outer.locator('.pending-chapter').count(),0,'the newer reading action also invalidates the deferred destination');
        await outer.evaluate(()=>(window as any).nativeFallbackProbe.release());
        await outer.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
        assert.equal(outer.url(),base+'/'+chapters[2]);
        assert.equal(await page.locator('html').getAttribute('data-reading'),'scroll');
      }finally{await outer.evaluate(()=>(window as any).nativeFallbackProbe.release());await outer.locator('.pending-chapter').waitFor({state:'detached'});await ready(page);moving.delete(page);}
    });

    test('navigation during cancelled history restoration retains the original entries', async () => {
      const page=await open(chapters[0]!,'real',controlFallback),outer=outerPage(page);
      for(const file of [chapters[1]!,chapters[2]!]) await navigate(page,async()=>{
        await outer.evaluate(file=>window.aluxReaderShell!.navigate('/'+file),file);
        await outer.waitForURL(base+'/'+file);
      });
      await navigate(page,async()=>{
        await outer.evaluate(()=>{(window as any).nativeFallbackProbe.held=true;history.back();});
        await outer.locator('.pending-chapter').waitFor({state:'attached'});
        const element=await outer.locator('.pending-chapter').elementHandle();
        await (await element!.contentFrame())!.waitForFunction(()=>document.documentElement.hasAttribute('data-chapter-ready'));
        await outer.evaluate(file=>{
          const shell=window.aluxReaderShell!;
          const active=document.querySelector<HTMLIFrameElement>('.chapter-frame:not(.pending-chapter)')!;
          shell.invalidate(active.contentWindow!);
          shell.navigate('/'+file);
          (window as any).nativeFallbackProbe.release();
        },chapters[3]!);
        await outer.waitForURL(base+'/'+chapters[3]);
        await outer.locator('.pending-chapter').waitFor({state:'detached'});
      });
      for(const file of [chapters[2]!,chapters[1]!,chapters[0]!]) await navigate(page,async()=>{
        await page.goBack();await outer.waitForURL(base+'/'+file);
      });
      for(const file of [chapters[1]!,chapters[2]!,chapters[3]!]) await navigate(page,async()=>{
        await page.goForward();await outer.waitForURL(base+'/'+file);
      });
    });

    test('a chapter link superseding unfinished Back preserves the visible source entry', async () => {
      const page=await open(chapters[0]!,'real',controlFallback),outer=outerPage(page);
      for(const file of [chapters[1]!,chapters[2]!])await navigate(page,async()=>{
        await outer.evaluate(file=>window.aluxReaderShell!.navigate('/'+file),file);await outer.waitForURL(base+'/'+file);
      });
      if(await page.locator('#sidebar').getAttribute('aria-hidden')==='true')await activate(page,'#sidebar-toggle');
      await ready(page);
      const href=await page.locator('#sidebar .chapter a[href]').evaluateAll((links,file)=>links.find(a=>new URL((a as HTMLAnchorElement).href).pathname==='/'+file)?.getAttribute('href'),chapters[3]!);
      assert.ok(href,'the next choice is a canonical directory link');
      moving.add(page);
      try{
        await outer.evaluate(()=>{(window as any).nativeFallbackProbe.held=true;history.back();});
        const pending=await outer.locator('.pending-chapter').elementHandle();
        await (await pending!.contentFrame())!.waitForFunction(()=>document.documentElement.hasAttribute('data-chapter-ready'));
        await page.locator('#sidebar .chapter a[href='+JSON.stringify(href)+']').first().click({noWaitAfter:true});
        await outer.evaluate(()=>(window as any).nativeFallbackProbe.release());
        await outer.waitForURL(base+'/'+chapters[3]);await outer.locator('.pending-chapter').waitFor({state:'detached'});
        for(const file of [chapters[2]!,chapters[1]!,chapters[0]!])await navigate(page,async()=>{
          await page.goBack();await outer.waitForURL(base+'/'+file);
        });
        for(const file of [chapters[1]!,chapters[2]!,chapters[3]!])await navigate(page,async()=>{
          await page.goForward();await outer.waitForURL(base+'/'+file);
        });
      }finally{await outer.evaluate(()=>(window as any).nativeFallbackProbe.release());await outer.locator('.pending-chapter').waitFor({state:'detached'});await ready(page);moving.delete(page);}
    });

    test('extensionless missing URLs retain the generated native 404 document', async () => {
      const missing='reader-missing',expected='404: '+base+'/'+missing;
      try{
        const page=await open(missing,'real',async page=>{
          const native=await page.request.get(base+'/404.html');assert.ok(native.ok());
          await page.route(base+'/'+missing,route=>route.fulfill({response:native,status:404}));
        });
        assert.equal(await page.locator('#document-not-found-404').count(),1,'the generated error content remains present');
        assert.ok(await page.locator('#sidebar .chapter a[href]').count()>0,'native chapter navigation remains available');
        assert.equal(await outerPage(page).locator('.chapter-frame').count(),0,'an unsupported initial URL does not mount an empty shell');
      }finally{
        const at=problems.indexOf(expected);assert.ok(at>=0,'the fixture uses an actual404 response');problems.splice(at,1);
        for(let index=problems.length-1;index>=0;index--)if(problems[index]!.startsWith('console: '+base+'/'+missing+' Failed to load resource:')&&problems[index]!.includes('404'))problems.splice(index,1);
      }
    });

    test('reversing unfinished Back reuses the visible chapter and its current spread', async () => {
      const {file,page}=await longChapter(),outer=outerPage(page),other=chapters.find(chapter=>chapter!==file)!;
      await controlFallback(page);await navigate(page,()=>page.reload());
      for(const chapter of [other,file])await navigate(page,async()=>{
        await outer.evaluate(chapter=>window.aluxReaderShell!.navigate('/'+chapter),chapter);await outer.waitForURL(base+'/'+chapter);
      });
      await activate(page,'#page-next');await ready(page);
      const progress=await folio(page);assert.ok(progress.first>1);
      await outer.evaluate(()=>(window as any).retainedChapter=document.querySelector('.chapter-frame:not(.pending-chapter)'));
      moving.add(page);
      try{
        await outer.evaluate(()=>{(window as any).nativeFallbackProbe.held=true;history.back();});
        const pending=await outer.locator('.pending-chapter').elementHandle();
        await (await pending!.contentFrame())!.waitForFunction(()=>document.documentElement.hasAttribute('data-chapter-ready'));
        await outer.evaluate(()=>new Promise<void>(resolve=>{addEventListener('popstate',()=>resolve(),{once:true});history.forward();}));
        await outer.evaluate(()=>(window as any).nativeFallbackProbe.release());
        await outer.waitForURL(base+'/'+file);await outer.locator('.pending-chapter').waitFor({state:'detached'});await ready(page);
        assert.equal(await outer.evaluate(()=>document.querySelector('.chapter-frame:not(.pending-chapter)')===(window as any).retainedChapter),true,'returning to the still-visible entry preserves the native document');
        assert.deepEqual(await folio(page),progress,'the live spread is retained instead of restoring older saved progress');
      }finally{await outer.evaluate(()=>(window as any).nativeFallbackProbe.release());await outer.locator('.pending-chapter').waitFor({state:'detached'});await ready(page);moving.delete(page);}
    });

    test('native fallback keeps the source history entry for an ordinary chapter change', async () => {
      for (const replace of [false,true]) {
        const page=await open(chapters[0]!, 'real', controlFallback), outer=outerPage(page);
        await outer.evaluate(file=>window.aluxReaderShell!.navigate(new URL('/'+file,location.href).href),chapters[1]!);
        await outer.waitForURL(base+'/'+chapters[1]); await ready(page);
        await outer.evaluate(({file,replace})=>{
          (window as any).nativeFallbackProbe.held=true;
          window.aluxReaderShell!.navigate(new URL('/'+file,location.href).href,replace);
        },{file:chapters[2]!,replace});
        await outer.waitForFunction(()=>(window as any).nativeFallbackProbe.frames.length>0,undefined,{polling:25});
        await outer.evaluate(()=>(window as any).nativeFallbackProbe.expire());
        await outer.waitForURL(url=>url.pathname==='/'+chapters[2] && url.searchParams.get('reader')==='native');
        await ready(page);
        await outer.goBack();
        assert.equal(new URL(outer.url()).pathname,'/'+chapters[replace?0:1], 'native fallback honors push versus replacement');
        await page.context().close();
      }
    });

    test('an uncommitted remembered-edition entrance retains the logo navigation history', async () => {
      const source=chapters[1]!;
      const page=await open(source,'real',async page=>{
        await controlFallback(page);
        await page.context().addInitScript(language=>{
          if(window!==window.top)return;
          localStorage.setItem('alux-reader',JSON.stringify({world:'real',language,bookmarks:[]}));
        },chinese.lang);
      });
      const outer=outerPage(page), before=await outer.evaluate(()=>history.length);
      if(!(await page.locator('#sidebar .brand').isVisible()))await activate(page,'#sidebar-toggle');
      await ready(page);
      const target=base+'/'+route(chinese,'index.html')+'#worlds';
      await navigate(page,async()=>{
        await outer.evaluate(()=>(window as any).nativeFallbackProbe.held=true);
        await page.locator('#sidebar .brand').click({noWaitAfter:true});
        await outer.waitForFunction(target=>document.querySelector<HTMLIFrameElement>('.pending-chapter')?.src===target,target,{polling:25});
        assert.equal(new URL(outer.url()).pathname,'/'+source,'the source stays committed during the edition redirect');
        await outer.evaluate(()=>(window as any).nativeFallbackProbe.release());
        await outer.waitForURL(target);
      });
      assert.equal(await outer.evaluate(()=>history.length),before+1,'an entrance redirect inherits its pending push intent');
      await navigate(page,()=>page.goBack());
      assert.equal(new URL(outer.url()).pathname,'/'+source);
      assert.equal(await page.locator('html').getAttribute('lang'),english.lang,'Back restores the source edition');
    });

    test('hidden preparation suspends native fallback and retains the shared reader', async () => {
      const page=await open(chapters[0]!, 'real', controlFallback), outer=outerPage(page);
      await outer.evaluate(()=>{(window as any).retainedMusic=window.aluxReaderShell!.audio;});
      for (const initiallyHidden of [false,true]) {
        const file=chapters[initiallyHidden?2:1]!;
        await outer.evaluate(({file,initiallyHidden})=>{
          const probe=(window as any).nativeFallbackProbe;
          probe.held=true;
          if(initiallyHidden)probe.setHidden(true);
          window.aluxReaderShell!.navigate(new URL('/'+file,location.href).href);
        },{file,initiallyHidden});
        await outer.waitForFunction(()=>(window as any).nativeFallbackProbe.frames.length>0,undefined,{polling:25});
        if(!initiallyHidden)await outer.evaluate(()=>(window as any).nativeFallbackProbe.setHidden(true));
        const pending=await outer.evaluate(()=>{
          const probe=(window as any).nativeFallbackProbe;
          return {live:probe.timers.filter((timer:any)=>!timer.cancelled).length,pending:!!document.querySelector('.pending-chapter')};
        });
        assert.equal(pending.pending,true,'readiness is waiting on a suspended paint frame');
        assert.equal(pending.live,0,'a hidden reader has no running native-fallback deadline');
        await outer.evaluate(()=>{const probe=(window as any).nativeFallbackProbe;probe.expire();probe.setHidden(false);probe.release();});
        await outer.waitForURL(base+'/'+file); await ready(page);
        assert.equal(new URL(outer.url()).searchParams.has('reader'),false);
        assert.equal(await outer.evaluate(()=>window.aluxReaderShell!.audio===(window as any).retainedMusic),true,'foreground commit retains shared audio ownership');
      }
    });

    test('a country-selected entrance persists when detection beats initial frame readiness', async () => {
      let uncommitted = false, lookups = 0;
      const page = await open('index.html', undefined, async page => {
        // A cached font need not make another HTTP request. Gate its readiness directly,
        // only in the initial English chapter document, before reader.ts observes it.
        await page.context().addInitScript(() => {
          if (window.parent !== window && location.pathname === '/index.html') {
            Object.defineProperty(document.fonts, 'ready', { get: () => new Promise<void>(() => undefined) });
          }
        });
        await page.route('https://api.country.is/**', async route => {
          lookups++;
          uncommitted = await outerPage(page).locator('.chapter-frame:not(.pending-chapter)').count() === 0;
          await route.fulfill({ json: { country: 'CN' } });
        });
      });
      assert.ok(uncommitted, 'country detection completed before the first chapter was active');
      assert.equal(await page.locator('html').getAttribute('lang'), chinese.lang);
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('alux-reader')!).language), chinese.lang, 'accepted entrance owns the language preference');
      await activate(page, '#gateway [data-world="magic"]');
      await outerPage(page).waitForFunction(() => {
        const music = document.getElementById('persistent-music') as HTMLAudioElement;
        return !music.error && !music.paused && music.currentTime > 0;
      });
      await navigate(page, () => page.goto(base + '/index.html'));
      assert.equal(await page.locator('html').getAttribute('lang'), chinese.lang, 'a later neutral visit restores the detected edition');
      assert.equal(lookups, 1, 'the saved choice skips a second country request');
    });

    test('a same-world gateway choice cancels a prepared entrance redirect', async () => {
      const page = await open('index.html', undefined, async page => {
        await page.route('https://api.country.is/**', route => route.fulfill({ json:{ country:'US' } }));
      });
      const outer = outerPage(page), initial = outer.url();
      assert.equal(await page.locator('html').getAttribute('data-world'), 'real');
      let release!: () => void, seen!: () => void;
      const gate = new Promise<void>(resolve => { release = resolve; });
      const requested = new Promise<void>(resolve => { seen = resolve; });
      await page.route('**/*.woff2', async route => { seen(); await gate; await route.continue().catch(() => undefined); });
      moving.add(page);
      try {
        await outer.evaluate(url => window.aluxReaderShell!.navigate(url, true), base + '/' + route(chinese, 'index.html') + '#worlds');
        await requested;
        const element = await outer.locator('.pending-chapter').elementHandle();
        const frame = (await element!.contentFrame())!;
        await frame.waitForFunction(() => !!window.aluxPaperView && document.documentElement.hasAttribute('data-gateway'));
        await page.locator('#gateway [data-world="real"]').click({ noWaitAfter:true });
        assert.equal(await outer.locator('.pending-chapter').count(), 0, 'an explicit choice cancels the redirect even without changing world');
        release(); await ready(page);
        assert.equal(outer.url(), initial);
        assert.equal(await page.locator('html').getAttribute('data-gateway'), null);
        assert.equal(await page.locator('html').getAttribute('data-world'), 'real');
      } finally { release(); moving.delete(page); await page.unroute('**/*.woff2'); }
    });

    test('bookmark and search reading text share prose defaults and scale in both worlds', async () => {
      for (const world of ['magic', 'real'] as const) {
        const page = await open(tableChapter, world);
        await activate(page, '#bookmark-toggle');
        if (!(await page.locator('#sidebar-search').isVisible())) await activate(page, '#sidebar-toggle');
        await activate(page, '#sidebar-search');
        await page.locator('#searchbar').fill('semantic');
        await searchResults(page, 'semantic');
        const sizes = () => page.evaluate(() => {
          const size = (selector:string) => parseFloat(getComputedStyle(document.querySelector(selector)!).fontSize);
          return { body:size('main.leaves'), bookmark:size('#bookmark-list a'), input:size('#searchbar'), result:size('#searchresults a'), teaser:size('#searchresults .teaser'), count:size('#searchresults-header') };
        });
        const before = await sizes();
        for (const key of ['bookmark','input','result','teaser'] as const) assert.equal(before[key], before.body, world + ' default ' + key);
        await page.locator('#searchbar').press('Escape');
        if (profile.options.isMobile && await page.locator('#sidebar-search').isVisible()) await activate(page, '#sidebar-toggle');
        await ready(page);
        const toolbar = await page.locator('#menu-bar').evaluate(e => e.getBoundingClientRect().height);
        await activate(page, '#text-larger');
        if (!(await page.locator('#sidebar-search').isVisible())) await activate(page, '#sidebar-toggle');
        await activate(page, '#sidebar-search');
        await page.locator('#searchbar').fill('semantic');
        await searchResults(page, 'semantic');
        const after = await sizes();
        for (const key of Object.keys(before) as Array<keyof typeof before>) assert.ok(Math.abs(after[key] / before[key] - 1.1) < .002, world + ' scaled ' + key + ' ' + JSON.stringify({ before, after }));
        assert.equal(await page.locator('#menu-bar').evaluate(e => e.getBoundingClientRect().height), toolbar, 'reading scale leaves toolbar geometry independent');
      }
    });

    test('pending entrances keep welcome audio silent until committed', async () => {
      const page = await open(chapters[0]!, 'magic');
      const outer = outerPage(page);
      await page.evaluate(() => { const prefs = JSON.parse(localStorage.getItem('alux-reader')!); prefs.language = 'en'; localStorage.setItem('alux-reader', JSON.stringify(prefs)); });
      await page.context().addInitScript(() => {
        const play = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () {
          if (this.id === 'welcome-audio') { (window as any).welcomeAttempts = ((window as any).welcomeAttempts ?? 0) + 1; return Promise.resolve(); }
          return play.call(this);
        };
      });
      let release!: () => void, seen!: () => void;
      const gate = new Promise<void>(resolve => { release = resolve; });
      const requested = new Promise<void>(resolve => { seen = resolve; });
      await page.route('**/*.woff2', async route => { seen(); await gate; await route.continue().catch(() => undefined); });
      moving.add(page);
      try {
        await outer.evaluate(url => window.aluxReaderShell!.navigate(url), base + '/index.html#worlds');
        await requested;
        const element = await outer.locator('.pending-chapter').elementHandle();
        const frame = (await element!.contentFrame())!;
        await frame.waitForFunction(() => !!window.aluxPaperView && document.documentElement.hasAttribute('data-gateway'));
        await frame.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        assert.equal(await frame.evaluate(() => (window as any).welcomeAttempts ?? 0), 0, 'an invisible entrance cannot attempt playback');
        await page.locator('#text-larger').click({ noWaitAfter: true });
        await outer.locator('.pending-chapter').waitFor({ state: 'detached' });
        release(); await page.unroute('**/*.woff2');
        await navigate(page, async () => {
          await outer.evaluate(url => window.aluxReaderShell!.navigate(url), base + '/index.html#worlds');
          await outer.waitForURL(base + '/index.html#worlds');
        });
        await page.waitForFunction(() => (window as any).welcomeAttempts === 1);
      } finally { release(); moving.delete(page); await page.unroute('**/*.woff2'); }
    });

    test('late document-load measurement preserves a running paper fold', async () => {
      const page = await open(videoChapter, 'magic', async page => {
        await page.route('https://www.youtube.com/embed/**', route => route.fulfill({ contentType:'text/html', body:'<!doctype html><title>Player fixture</title>' }));
        await page.route('https://i.ytimg.com/**', route => route.fulfill({ contentType:'image/png', body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=','base64') }));
      });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.evaluate(() => {
        (window as any).lateLoadFold = undefined;
        const observe = () => {
          const leaf = document.querySelector('.turn-leaf');
          if (!leaf?.querySelector('.stf__item')) { requestAnimationFrame(observe); return; }
          // Engines differ on whether iframe loading blocks fonts.ready. Deliver the same
          // late native event boundary during an actual fold without relying on that race.
          dispatchEvent(new Event('load'));
          requestAnimationFrame(() => { (window as any).lateLoadFold = leaf === document.querySelector('.turn-leaf'); });
        };
        requestAnimationFrame(observe);
      });
      await page.locator('#page-next').click({ noWaitAfter:true });
      await page.waitForFunction(() => typeof (window as any).lateLoadFold === 'boolean');
      assert.equal(await page.evaluate(() => (window as any).lateLoadFold), true, 'load measurement cannot cancel the visible paper');
      await page.waitForFunction(() => !document.querySelector('.turn-leaf'));
    });

    test('paper snapshots retain the visual offset of scrolled display math', async () => {
      const page = await open(equationChapter, 'magic');
      const offset = await page.evaluate(() => {
        const live = document.querySelector<HTMLElement>('main.leaves .katex-display')!;
        live.style.width = '120px'; (live.firstElementChild as HTMLElement).style.minWidth = '600px';
        live.scrollLeft = 100;
        const scroll = live.scrollLeft;
        const sheet = window.aluxPaperView!.capture()[0]!;
        sheet.style.cssText += ';position:fixed;left:-10000px;top:0;'; sheet.inert = true; document.body.append(sheet);
        const copy = sheet.querySelector<HTMLElement>('.katex-display')!;
        const relative = (port:HTMLElement) => port.firstElementChild!.getBoundingClientRect().left - port.getBoundingClientRect().left;
        const result = { scroll, unchanged:live.scrollLeft, source:relative(live), copy:relative(copy) };
        sheet.remove(); return result;
      });
      assert.ok(Math.abs(offset.scroll) > 0, 'the native equation is horizontally scrolled');
      assert.equal(offset.unchanged, offset.scroll, 'capturing paper does not reset live math');
      assert.ok(Math.abs(offset.source - offset.copy) < 1, 'inert paper paints the same equation offset');
    });

    test('scrolled snapshots preserve outer boxes and clipped viewports with scrollbar gutters', async () => {
      const results = [];
      for (const fixture of [
        { file: choose('over-height code listing', longCode), selector: 'pre > code' },
        { file: tableChapter, selector: '.table-wrapper' },
        { file: equationChapter, selector: '.katex-display' },
      ]) {
        const page = await open(fixture.file, 'magic', async page => {
          await page.route('**/*', route => route.request().resourceType() === 'document' && !route.request().url().startsWith(base + '/')
            ? route.fulfill({ contentType: 'text/html', body: '<!doctype html>' }) : route.continue());
        });
        results.push(await page.evaluate(selector => {
          const port = document.querySelector<HTMLElement>('main.leaves ' + selector)!;
          port.classList.add('snapshot-scrollport');
          const style = document.createElement('style');
          style.textContent = '.snapshot-scrollport::-webkit-scrollbar{width:17px;height:17px}';
          document.head.append(style);
          port.style.cssText += ';box-sizing:border-box;width:160px;height:80px;min-width:0;max-width:none;min-height:0;max-height:none;padding:7px;border:3px solid;overflow:scroll;scrollbar-gutter:stable;';
          if (selector !== 'pre > code') (port.firstElementChild as HTMLElement).style.cssText += ';min-width:600px;min-height:300px;';
          const following = document.createElement('p'); following.className = 'snapshot-following'; following.textContent = 'Following content';
          (port.closest('pre,p') ?? port).after(following);
          port.scrollLeft = 40; port.scrollTop = 30;
          const scroll = [port.scrollLeft, port.scrollTop];
          const sheet = window.aluxPaperView!.capture()[0]!;
          sheet.style.cssText += ';position:fixed;left:-10000px;top:0;'; sheet.inert = true; port.closest('.volume')!.append(sheet);
          const copy = sheet.querySelector<HTMLElement>('.snapshot-scrollport')!;
          const outer = copy.closest<HTMLElement>('.turn-scroll-box') ?? copy;
          const box = (element: HTMLElement) => { const b=element.getBoundingClientRect(); return [b.width,b.height]; };
          const glyph = (element: HTMLElement, origin = element) => {
            const printed = element.matches('.katex-display') ? element.querySelector('.katex-html') : element;
            if (!printed) throw new Error('the equation must expose its printed HTML');
            const walker = document.createTreeWalker(printed,NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) if (walker.currentNode.textContent?.trim()) {
              const text=walker.currentNode as Text, at=text.textContent!.search(/\S/), range=document.createRange();
              range.setStart(text,at); range.setEnd(text,at+1);
              const r=range.getBoundingClientRect(), p=origin.getBoundingClientRect(); return [r.left-p.left,r.top-p.top];
            }
            throw new Error('the source scrollport must contain visible text');
          };
          const follow = (element: HTMLElement, next: HTMLElement) => {
            const a=element.getBoundingClientRect(), b=next.getBoundingClientRect(); return [b.left-a.left,b.top-a.top];
          };
          const paint = (element:HTMLElement) => {
            const s=getComputedStyle(element); return [s.color,s.backgroundColor,s.fontFamily,s.fontSize,s.lineHeight,s.fontWeight,s.fontStyle,s.padding,s.letterSpacing,s.whiteSpace,s.wordBreak,s.overflowWrap,s.tabSize];
          };
          const result = { selector, scroll, unchanged:[port.scrollLeft,port.scrollTop], source:box(port), copy:box(outer),
            sourceGlyph:glyph(port), copyGlyph:glyph(copy,outer), sourceFollowing:follow(port,following),
            sourcePaint:paint(port),copyPaint:paint(copy),
            copyFollowing:follow(outer,sheet.querySelector<HTMLElement>('.snapshot-following')!),
            gutter:port.offsetWidth-port.clientWidth-6 };
          sheet.remove(); style.remove(); return result;
        }, fixture.selector));
        await page.context().close();
      }
      for (const result of results) {
        assert.ok(result.scroll.some(value => value > 0), result.selector + ' is actually scrolled');
        assert.deepEqual(result.unchanged,result.scroll, 'capture preserves the live scroll position');
        assert.deepEqual(result.copyPaint,result.sourcePaint, 'captured scrollports preserve resolved paint and typography');
        for (const [source,copy] of [[result.source,result.copy],[result.sourceGlyph,result.copyGlyph],[result.sourceFollowing,result.copyFollowing]]) {
          assert.ok(source.every((value,index) => Math.abs(value-copy[index]!)<1), result.selector+' preserves outer geometry, visible offset and following flow: '+JSON.stringify(result));
        }
      }
      if (profile.name === 'chromium-desktop') assert.ok(results.some(result=>result.gutter>0), 'the fixture exercises a real non-overlay scrollbar gutter');
    });

    test('prepared chapters take current bookmarks and music choices only at commit', async () => {
      const page = await open(english.pages[0]!.file, 'real');
      const outer = outerPage(page);
      let release!: () => void, seen!: () => void;
      const gate = new Promise<void>(resolve => { release = resolve; });
      const requested = new Promise<void>(resolve => { seen = resolve; });
      await page.route('**/*.woff2', async route => { seen(); await gate; await route.continue().catch(() => undefined); });
      try {
        await navigate(page, async () => {
          await page.locator('.nav-wide-wrapper a[rel~="next"]:visible, .nav-wrapper a[rel~="next"]:visible').first().click({ noWaitAfter: true });
          await requested;
          const element = await outer.locator('.pending-chapter').elementHandle();
          const frame = (await element!.contentFrame())!;
          await frame.waitForFunction(() => !!document.querySelector('#folio') && document.fonts.status === 'loading' && !!window.aluxPaperView);
          await page.locator('#bookmark-toggle').click({noWaitAfter:true});
          await page.locator('#music-toggle').click({noWaitAfter:true});
          await outer.waitForFunction(() => !(document.getElementById('persistent-music') as HTMLAudioElement).paused);
          const source = await page.evaluate(() => JSON.parse(localStorage.getItem('alux-reader')!).bookmarks[0].page as string);
          release();
          await outer.waitForFunction(() => !document.querySelector('.pending-chapter'));
          assert.equal(await page.locator('#bookmark-count').innerText(), '1', 'committed controls see intervening bookmarks');
          await activate(page, '#text-larger');
          const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('alux-reader')!));
          assert.ok(saved.bookmarks.some((b: {page:string}) => b.page === source), 'a later save cannot remove the source bookmark');
          assert.equal(saved.music, true, 'a later save retains the intervening music choice');
          assert.equal(await outer.locator('#persistent-music').evaluate(a => (a as HTMLAudioElement).paused), false);
        });
      } finally { release(); await page.unroute('**/*.woff2'); }
    });

    test('edition changes settle their own layout without reflowing transferred paper', async () => {
      for (const edition of [chinese, arabic]) {
        const page = await open(tableChapter, 'magic');
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        const frozen = await page.evaluate(() => {
          const sheet = window.aluxPaperView!.capture()[0]!;
          const copy = sheet.querySelector<HTMLElement>('main.leaves')!;
          const style = getComputedStyle(document.querySelector('main.leaves')!);
          return { source: parseFloat(style.lineHeight) / parseFloat(style.fontSize), captured: Number(copy.style.lineHeight), direction: copy.style.direction, lang: sheet.lang };
        });
        assert.ok(Math.abs(frozen.captured - frozen.source) < 1e-6, 'snapshot leading is resolved in its source document and stays relative to descendant fonts');
        assert.equal(frozen.direction, 'ltr');
        assert.equal(frozen.lang, english.lang);
        await page.context().addInitScript(() => {
          (window as any).transferredPaper = false;
          new MutationObserver(() => { if (document.querySelector('.turn-leaf')) (window as any).transferredPaper = true; })
            .observe(document, {subtree:true, childList:true, attributes:true, attributeFilter:['class']});
        });
        await activate(page, '#language-toggle');
        await navigate(page, () => activate(page, `#language-list a[lang="${edition.lang}"]`));
        assert.equal(await page.locator('html').getAttribute('lang'), edition.lang);
        assert.equal(await page.evaluate(() => (window as any).transferredPaper), false, 'incompatible language geometry commits without a foreign paper layer');
      }
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

    test('a resize while destination fonts are pending keeps the unprepared frame hidden', async () => {
      const page=await open(english.pages[0]!.file+'#last-page','magic');
      const outer=outerPage(page);await page.emulateMedia({reducedMotion:'no-preference'});
      const next=await page.locator('.nav-wide-wrapper a[rel~="next"]').evaluate(a=>(a as HTMLAnchorElement).href);
      let releaseReader!:()=>void,releaseFont!:()=>void,fontRequested!:()=>void;
      const readerGate=new Promise<void>(r=>{releaseReader=r}),fontGate=new Promise<void>(r=>{releaseFont=r}),fontSeen=new Promise<void>(r=>{fontRequested=r});
      await page.route('**/reader.js',async route=>{await readerGate;await route.continue()});
      await page.route('**/*.woff2',async route=>{fontRequested();await fontGate;await route.continue()});
      moving.add(page);
      try {
        await page.locator('#page-next').click({noWaitAfter:true});
        const pending=outer.frameLocator('.pending-chapter');
        await pending.locator('#content > .volume').waitFor({state:'attached'});
        releaseReader();
        await Promise.race([fontSeen,page.waitForTimeout(1500).then(()=>{throw new Error('destination did not request a gated font')})]);
        const element=await outer.locator('.pending-chapter').elementHandle();const frame=(await element!.contentFrame())!;
        await frame.waitForFunction(()=>!!document.querySelector('#folio')?.textContent&&document.fonts.status==='loading');
        const size=page.viewportSize()!;await page.setViewportSize({width:size.width-80,height:size.height+40});
        await outer.locator('.pending-chapter').waitFor({ state: 'detached' });
        releaseFont(); await ready(page);
        assert.notEqual(outer.url(), next, 'a geometry change does not commit the cancelled chapter');
        assert.ok(await page.locator('#page-next').isEnabled());
      } finally {moving.delete(page);releaseReader();releaseFont();await page.unroute('**/reader.js');await page.unroute('**/*.woff2');}
    });

    test('a local previous-page turn supersedes chapter preparation', async () => {
      const page = await open(english.pages[0]!.file + '#last-page', 'magic');
      const outer = outerPage(page), retained = outer.url(), before = await folio(page);
      assert.ok(before.first > 1, 'the source chapter has an earlier spread');
      const next = await page.locator('.nav-wide-wrapper a[rel~="next"]').evaluate(a => (a as HTMLAnchorElement).href);
      let release!: () => void;
      const gate = new Promise<void>(resolve => { release = resolve; });
      await page.route(next, async request => { await gate; await request.continue().catch(() => undefined); });
      moving.add(page);
      try {
        const requested = page.waitForRequest(next);
        await page.locator('#page-next').click({ noWaitAfter: true });
        await requested;
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        assert.equal(await outer.locator('.pending-chapter').count(), 1, 'the chapter is still preparing before the local turn');
        await page.locator('#page-prev').click({ noWaitAfter: true });
        assert.equal(await outer.locator('.pending-chapter').count(), 0, 'the accepted local fold cancels older chapter readiness');
        await page.waitForSelector('.turn-leaf .stf__item');
        release();
        await page.waitForFunction(() => !document.querySelector('.turn-leaf'));
        assert.ok((await folio(page)).first < before.first);
        assert.equal(outer.url(), retained);
        assert.equal(await outer.locator('.chapter-frame').count(), 1);
      } finally { release(); moving.delete(page); await page.unroute(next); }
    });

    test('reader settings cancel a chapter waiting for fonts without losing the saved choice', async () => {
      for (const control of ['#world-toggle', '#reading-mode', '#text-larger', '#theme-toggle']) {
        const page = await open(english.pages[0]!.file + '#last-page', 'magic');
        const outer = outerPage(page), from = outer.url();
        let release!: () => void, seen!: () => void;
        const gate = new Promise<void>(resolve => { release = resolve; });
        const requested = new Promise<void>(resolve => { seen = resolve; });
        await page.route('**/*.woff2', async route => { seen(); await gate; await route.continue().catch(() => undefined); });
        try {
          await navigate(page, async () => {
            await page.locator('#page-next').click({ noWaitAfter: true });
            await requested;
            const pending = await outer.locator('.pending-chapter').elementHandle();
            const frame = (await pending!.contentFrame())!;
            await frame.waitForFunction(() => !!document.querySelector('#folio')?.textContent && document.fonts.status === 'loading');
            await page.locator(control).click({ noWaitAfter: true });
            await outer.locator('.pending-chapter').waitFor({ state: 'detached' });
            release();
            await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
            assert.equal(new URL(outer.url()).pathname, new URL(from).pathname, 'cancelled readiness cannot commit another chapter');
            if (control === '#world-toggle') assert.equal(await page.locator('html').getAttribute('data-world'), 'real');
            else if (control === '#reading-mode') assert.equal(await page.locator('html').getAttribute('data-reading'), 'scroll');
            else if (control === '#theme-toggle') assert.equal(await page.locator('html').evaluate(e => e.classList.contains('coal')), true);
            else {
              assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--reader-scale').trim()), '1.1');
              assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('alux-reader')!).scale), 1.1, 'discarded frame cannot overwrite the selected scale');
            }
          });
        } finally { release(); await page.unroute('**/*.woff2'); }
        if (control === '#text-larger' || control === '#theme-toggle') {
          await navigate(page, () => page.reload());
          await ready(page);
          if (control === '#text-larger') assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--reader-scale').trim()), '1.1', 'the scale survives a fresh document');
          else assert.equal(await page.locator('html').evaluate(e => e.classList.contains('coal')), true, 'the theme survives a fresh document');
        }
      }
    });

    test('paper inset alignment check rejects a broken CSS inset', async () => {
      const { page } = await longChapter();
      const measure = () => page.evaluate(() => {
        const main = document.querySelector<HTMLElement>('.volume > main.leaves')!;
        const volume = main.parentElement!;
        const before = window.aluxPaperView!.capture();
        const surface = before[0]!;
        const trim = getComputedStyle(volume).getPropertyValue('--paper-trim');
        surface.style.cssText += `position:absolute;left:${trim};top:${trim}`;
        volume.append(surface);
        const source = main.querySelector('p')!.getBoundingClientRect();
        const copy = surface.querySelector('main p')!.getBoundingClientRect();
        surface.remove();
        return { x: copy.x - source.x, y: copy.y - source.y };
      });
      const aligned = (value: { x: number; y: number }) => {
        assert.ok(Math.abs(value.x) < 1 && Math.abs(value.y) < 1, 'snapshot shares the printed origin');
      };
      aligned(await measure());
      await page.locator('.volume').evaluate(e => (e as HTMLElement).style.setProperty('--paper-inset', '27px'));
      const broken = await measure();
      assert.throws(() => aligned(broken), assert.AssertionError, 'wrong inset must make the actual geometry check fail');
    });

    test('inert media snapshots pair descendants and label unsupported video hosts', async () => {
      const { page } = await longChapter();
      const result = await page.evaluate(() => {
        const main = document.querySelector<HTMLElement>('.volume > main.leaves')!;
        const fixture = document.createElement('div');
        // A nested executable subtree is removed without shifting later media/image pairs.
        const script = document.createElement('script'); script.type = 'application/json'; script.textContent = '{}';
        const iframe = document.createElement('iframe'); iframe.title = 'External lecture';
        iframe.style.cssText = 'width:200px;height:120px';
        const picture = document.createElement('picture');
        const source = document.createElement('source'); const image = document.createElement('img');
        image.src = '/ivory-paper.webp'; picture.append(source, image);
        const audio = document.createElement('audio');
        const nestedImage = document.createElement('img'); nestedImage.src = '/ivory-paper.webp'; audio.append(nestedImage);
        fixture.append(script, audio, iframe, picture); main.append(fixture);
        const copy = window.aluxPaperView!.capture()[0]!;
        const images = [...copy.querySelectorAll<HTMLImageElement>('img')].map(e => e.src);
        const labels = [...copy.querySelectorAll('.turn-media-label')].map(e => e.textContent);
        copy.querySelectorAll('.turn-media-label').forEach(label => label.remove());
        const brokenLabels = [...copy.querySelectorAll('.turn-media-label')].map(e => e.textContent);
        fixture.remove();
        return { labels, brokenLabels, images, executable: copy.querySelectorAll('iframe,video,audio,script').length };
      });
      assert.ok(result.labels.includes('External lecture'), 'non-YouTube media has a visible identity fallback');
      assert.ok(result.images.some(url => url.endsWith('/ivory-paper.webp')), 'a removed preceding subtree does not change the later image pair');
      assert.equal(result.executable, 0);
      const identity = (labels: (string | null)[]) => assert.ok(labels.includes('External lecture'));
      identity(result.labels);
      assert.throws(() => identity(result.brokenLabels), assert.AssertionError, 'removing the actual snapshot label fails the same identity check');
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
      // The links were initialized before this fragment changed.
      await page.evaluate(() => { location.hash = 'last-page'; });
      await activate(page, '#language-toggle');
      assert.equal(await page.locator('#language-toggle').getAttribute('aria-expanded'), 'true');
      assert.deepEqual(await page.locator('#language-list a').evaluateAll(
        (links) => links.map((a) => (a as HTMLAnchorElement).lang)), editions.map((e) => e.lang));
      await navigate(page, () => Promise.all([
        page.waitForURL(base + '/' + route(target, chapter) + '#last-page'),
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
      const page = await open(tableChapter, 'magic');
      const initial = await folio(page);
      assert.ok(initial.last < initial.total, 'source-selected table chapter spans multiple spreads');
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
      const chapter = codeChapter;
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
      const page = await open(route(german,longCodeChapter), 'magic');
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
      for (const chapter of selectChapters(sources, 'display math and code-heavy content', text => math(text) && (text.match(/```rust/g)?.length ?? 0) >= 3, 2)) {
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
      const page=await open(choose('native disclosure with a long listing', text => longCode(text.match(/<details[\s>][\s\S]*?<\/details>/)?.[0] ?? '')),'magic');
      const disclosure=page.locator('.volume > main.leaves details').first();
      assert.ok(await disclosure.count(),'canonical chapter contains a disclosure');
      // A later font completion must not repair missing toggle-time focusability for this check.
      await disclosure.evaluate(async element=>{
        const fonts=new Set([...element.querySelectorAll('*')].map(node=>{
          const s=getComputedStyle(node);return `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
        }));
        await Promise.all([...fonts].map(font=>document.fonts.load(font)));
        await document.fonts.ready;
      });
      await ready(page);
      // Some engines eagerly lay out closed descendants. Model deferred layout by removing
      // only their derived tab stops; opening must measure them without an incidental font event.
      await disclosure.locator('pre > code').evaluateAll(elements=>elements.forEach(element=>element.removeAttribute('tabindex')));
      const before=await folio(page);
      await disclosure.locator('summary').click();
      await page.waitForFunction(()=>document.querySelector('.volume > main.leaves details')?.hasAttribute('open'));
      await page.waitForFunction(total=>Number(document.getElementById('folio')?.textContent?.split(' / ').pop())>total,before.total);
      const opened=await folio(page);
      assert.ok(opened.total>before.total,'expanded content adds actual chapter pages');
      const scrollable=await disclosure.locator('pre > code').evaluateAll(elements=>elements.filter(element=>element.scrollHeight>element.clientHeight||element.scrollWidth>element.clientWidth).map(element=>({index:element.getAttribute('tabindex'),height:element.clientHeight})));
      assert.ok(scrollable.length>0,'the opened canonical disclosure contains a bounded overflowing listing');
      assert.ok(scrollable.every(port=>port.index==='0'),'opening a disclosure refreshes production keyboard focusability');
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

    test('disclosed code panels and copy controls fit a narrow paper leaf', async () => {
      const file=choose('native disclosure with a long listing', text => longCode(text.match(/<details[\s>][\s\S]*?<\/details>/)?.[0] ?? ''));
      const page=await open(file,'magic');
      if(await page.locator('#sidebar-toggle').getAttribute('aria-expanded')==='true')await activate(page,'#sidebar-toggle');
      await page.setViewportSize({width:390,height:844});
      await ready(page);
      const disclosure=page.locator('.volume > main.leaves details').first();
      await disclosure.locator('summary').click();
      await ready(page);
      const boxes=await disclosure.locator('pre:has(> .buttons)').evaluateAll(elements=>elements.map(element=>{
        const panel=element as HTMLElement,style=getComputedStyle(panel);
        const details=panel.closest('details')!;
        const child=[...details.children].find(child=>child.contains(panel))!;
        const childStyle=getComputedStyle(child),childBox=child.getBoundingClientRect();
        const box=panel.getBoundingClientRect(),button=panel.querySelector('.clip-button')!.getBoundingClientRect();
        return {outer:box.width+parseFloat(style.marginLeft)+parseFloat(style.marginRight),leaf:panel.parentElement!.clientWidth,
          disclosureOuter:childBox.width+parseFloat(childStyle.marginLeft)+parseFloat(childStyle.marginRight),disclosureWidth:details.clientWidth,
          buttonInside:button.left>=box.left && button.right<=box.right};
      }));
      assert.ok(boxes.length>0);
      for(const box of boxes) {
        assert.ok(box.outer<=box.leaf+1,'disclosure margins and the code border box fit inside one leaf: '+JSON.stringify(box));
        assert.ok(box.disclosureOuter<=box.disclosureWidth+1,'the direct disclosure child includes its inline margins inside the disclosure');
        assert.equal(box.buttonInside,true,'the copy control stays inside the bounded panel');
      }
      const panel=disclosure.locator('pre:has(> .buttons)').first();
      for(let attempt=0;attempt<(await folio(page)).total;attempt++) {
        const visible=await panel.evaluate(element=>{
          const box=element.getBoundingClientRect(),leaf=element.closest('main')!.getBoundingClientRect();
          return box.left>=leaf.left-1 && box.right<=leaf.right+1;
        });
        if(visible)break;
        await page.evaluate(()=>(document.activeElement as HTMLElement)?.blur());
        await page.keyboard.press('PageDown');await ready(page);
      }
      const copy=panel.locator('.clip-button');
      await copy.scrollIntoViewIfNeeded();
      if(profile.name==='chromium-desktop')await outerPage(page).screenshot({path:'output/disclosure-narrow.png'});
      assert.equal(await copy.evaluate(button=>{
        const box=button.getBoundingClientRect();
        return document.elementFromPoint(box.x+box.width/2,box.y+box.height/2)?.closest('button')===button;
      }),true,'the visible copy control is not clipped by the leaf');
    });

    test('native code copy acknowledges repeated clicks after paging', async () => {
      const page=await open(codeChapter,'magic');
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
      const page = await open(route(chinese,equationChapter), 'magic');
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

    test('current chapter printing retains all content and the live magic reader', async () => {
      const { page } = await longChapter();
      await activate(page, '#page-next');
      const outer = outerPage(page);
      const contents = await page.locator('main.leaves').textContent();
      const state = () => page.evaluate(() => ({
        prefs: localStorage.getItem('alux-reader'), world: document.documentElement.dataset.world,
        folio: document.getElementById('folio')?.textContent,
        width: document.querySelector('main.leaves')!.clientWidth,
        height: document.querySelector('main.leaves')!.clientHeight,
        left: document.querySelector('main.leaves')!.scrollLeft, top: scrollY,
      }));
      const before = await state();
      await outer.evaluate(() => {
        (window as any).printedFrame = document.querySelector('.chapter-frame:not(.pending-chapter)');
        (window as any).printedAudio = document.getElementById('persistent-music');
        dispatchEvent(new Event('beforeprint'));
      });
      await outer.emulateMedia({ media: 'print' });
      assert.equal(await outer.locator('.chapter-print main.leaves').textContent(), contents);
      assert.ok(await outer.locator('.chapter-print main.leaves').evaluate(main =>
        main.clientHeight > innerHeight && main.scrollHeight <= main.clientHeight + 2), 'the whole chapter flows across printed pages');
      assert.equal(await outer.locator('.chapter-print :is(iframe,video,audio)').count(), 0, 'print preview creates no extra players');
      if (profile.name === 'chromium-desktop') {
        const pdf = await outer.pdf();
        assert.ok((pdf.toString('latin1').match(/\/Type \/Page\b/g)?.length ?? 0) > 1, 'browser Print produces multiple physical pages');
      }
      await outer.emulateMedia({ media: 'screen' });
      await outer.evaluate(() => dispatchEvent(new Event('afterprint')));
      await ready(page);
      assert.deepEqual(await state(), before, 'print preview preserves preferences, folio and screen geometry');
      assert.ok(await outer.evaluate(() => (window as any).printedFrame === document.querySelector('.chapter-frame:not(.pending-chapter)') &&
        (window as any).printedAudio === document.getElementById('persistent-music')), 'the same chapter and audio remain live');
      assert.equal(await outer.locator('.chapter-print').count(), 0);
    });

    test('the real world prints the current chapter natively', async () => {
      // The real world is mdBook's own page: no shell, so browser Print reads the document itself.
      const page = await open(chapters[1]!, 'real');
      assert.equal(page.mainFrame().childFrames().length, 0, 'no chapter shell');
      assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-reader')), false);
      await page.emulateMedia({ media: 'print' });
      const main = page.locator('#content main');
      assert.ok(await main.isVisible());
      assert.ok(((await main.textContent()) ?? '').trim().length > 0);
      assert.equal(await page.locator('#sidebar').isVisible(), false, "mdBook's print style hides the sidebar");
      await page.emulateMedia({ media: 'screen' });
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
      await outer.waitForFunction(()=>{
        const audio=document.getElementById('persistent-music') as HTMLAudioElement;
        return !audio.paused && audio.currentTime > 0;
      });
      await outer.evaluate(()=>{
        const audio=document.getElementById('persistent-music') as HTMLAudioElement;
        (window as any).readerIdentity={doc:document,audio,start:audio.currentTime,pauses:0};
        audio.addEventListener('pause',()=>{(window as any).readerIdentity.pauses++});
      });
      const destination=equationChapter;
      if(await page.locator('#sidebar').getAttribute('aria-hidden')==='true')await activate(page,'#sidebar-toggle');
      await activate(page,`.chapter a[href$="${destination}"]`);
      await ready(page);
      assert.ok(outer.url().endsWith('/zh/'+destination));
      await page.emulateMedia({reducedMotion:'no-preference'});
      await activate(page,'#page-next');
      await page.waitForFunction(()=>!document.querySelector('.turn-leaf'));
      await navigate(page,()=>page.goBack());
      await outer.waitForFunction(()=>{
        const saved=(window as any).readerIdentity;
        return saved.audio.currentTime > saved.start;
      });
      const state=await outer.evaluate(()=>{
        const saved=(window as any).readerIdentity;
        return {document:saved.doc===document,audio:saved.audio===document.getElementById('persistent-music'),paused:saved.audio.paused,pauses:saved.pauses,advanced:saved.audio.currentTime>saved.start};
      });
      assert.deepEqual(state,{document:true,audio:true,paused:false,pauses:0,advanced:true});
      assert.equal(await outer.locator('.chapter-frame').count(),1,'only the committed native document remains');
    });

    test('denied local storage leaves chapter and music controls usable', async () => {
      const page = await open(chapters[1]!, undefined, async page => {
        await page.context().addInitScript(() => {
          Object.defineProperty(window, 'localStorage', {
            configurable: true, get() { throw new DOMException('Storage denied', 'SecurityError'); },
          });
        });
      });
      await activate(page, '#music-toggle');
      await outerPage(page).waitForFunction(() => {
        const music = document.getElementById('persistent-music') as HTMLAudioElement;
        return !music.error && !music.paused && music.currentTime > 0;
      });
      await activate(page, '#text-larger');
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--reader-scale').trim()), '1.1');
      await activate(page, '#music-toggle');
      assert.equal(await outerPage(page).locator('#persistent-music').evaluate(a => (a as HTMLAudioElement).paused), true);
    });

    test('preparing and committing a chapter preserves muted music without storage', async () => {
      const target = '/' + route(chinese, chapters[1]!);
      const page = await open(chapters[0]!, undefined, async page => {
        await page.context().addInitScript(() => {
          if (window === window.top) sessionStorage.setItem('alux-entered','1');
          Object.defineProperty(window, 'localStorage', {configurable:true,get(){throw new DOMException('Denied','SecurityError');}});
        });
      });
      const outer = outerPage(page);
      await activate(page, '#music-toggle');
      await outer.waitForFunction(() => {
        const audio=document.getElementById('persistent-music') as HTMLAudioElement;
        return !audio.paused && audio.currentTime > 0;
      });
      await page.locator('#music-toggle').focus();
      await page.locator('#music-volume').evaluate(input => {
        (input as HTMLInputElement).value='0';
        input.dispatchEvent(new Event('input', {bubbles:true}));
      });
      assert.equal(await outer.locator('#persistent-music').evaluate(a => (a as HTMLAudioElement).volume), 0);
      // Gate only newly prepared documents, independently of font request caching.
      await page.context().addInitScript(() => {
        if (window === window.top) return;
        const gate = new Promise<void>(resolve => { (window as any).releasePreparedFonts=resolve; });
        Object.defineProperty(document.fonts, 'ready', {get:()=>gate});
      });
      await outer.evaluate(url => window.aluxReaderShell!.navigate(url), base + target);
      const element = await outer.locator('.pending-chapter').elementHandle();
      const frame = (await element!.contentFrame())!;
      await frame.waitForFunction(() => !!window.aluxPaperView && !!(window as any).releasePreparedFonts);
      assert.equal(await outer.locator('#persistent-music').evaluate(a => (a as HTMLAudioElement).volume), 0, 'preparation leaves the current owner muted');
      await frame.evaluate(() => (window as any).releasePreparedFonts());
      await outer.waitForFunction(() => !document.querySelector('.pending-chapter'));
      assert.equal(new URL(outer.url()).pathname, target);
      assert.equal(await outer.locator('#persistent-music').evaluate(a => (a as HTMLAudioElement).volume), 0, 'commit retains the live session volume');
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
        const file = choose(feature.name, text => feature.source.test(text));
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
