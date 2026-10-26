/** Optional real-Chromium regression against the production build. Run after pnpm build. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { preview } from 'vite';
import { chromium } from 'playwright';
import type { Page } from 'playwright';
import {
  languages,
  languagePath,
  htmlLanguage
} from '../src/locale-routing.ts';

const web = path.resolve(import.meta.dirname, '..'),
  output = path.resolve(web, '../output/reader-regression');
await fs.mkdir(output, { recursive: true });
const server = await preview({
  root: web,
  preview: { host: '127.0.0.1', port: 4175, strictPort: true }
});
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
    : {})
});
const errors: string[] = [],
  checks: string[] = [],
  startup: Array<{
    width: number;
    firstReadableMs: number;
    readyMs: number;
    emptyFrames: number;
  }> = [],
  layouts: Array<{
    locale: string;
    width: number;
    route: string;
    readyMs: number;
  }> = [];
const origin = 'http://127.0.0.1:4175';
function check(name: string, condition: boolean) {
  assert.ok(condition, name);
  checks.push(name);
}
function observe(page: Page) {
  page.on('pageerror', (error) => errors.push(error.message));
}
async function closeMusic(page: Page) {
  const close = page.locator('[data-music-close]');
  if (await close.isVisible()) await close.click();
}
async function ready(page: Page, route: string) {
  if (route.includes('/real/')) await page.locator('.real-prose h1').waitFor();
  else if (route.endsWith('contents.html'))
    await page.locator('.contents-part').first().waitFor();
  else if (route.endsWith('introduction.html'))
    await page
      .locator('#folio-position')
      .filter({ hasText: /\// })
      .waitFor({ timeout: 45000 });
  else await page.locator('.world-choice').first().waitFor();
  await closeMusic(page);
}
try {
  for (const width of [320, 768, 1440]) {
    const context = await browser.newContext({
        viewport: { width, height: 960 },
        reducedMotion: 'reduce'
      }),
      page = await context.newPage();
    observe(page);
    await context.route('**/*', async (route) => {
      if (['image', 'font'].includes(route.request().resourceType()))
        await new Promise((resolve) => setTimeout(resolve, 200));
      await route.continue();
    });
    await page.addInitScript(() => {
      const frames: Array<{ at: number; readable: boolean; empty: boolean }> =
        [];
      (window as Window & { readerFrames?: typeof frames }).readerFrames =
        frames;
      function sample() {
        const volume = document.querySelector('.bound-volume');
        frames.push({
          at: performance.now(),
          readable: !!volume
            ?.querySelector('.folio-content')
            ?.textContent?.trim(),
          empty: !!volume && !volume.textContent?.trim()
        });
        if (frames.length < 600) requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    });
    await page.goto(origin + '/zh/introduction.html');
    await ready(page, '/introduction.html');
    const frames = await page.evaluate(
      () =>
        (
          window as Window & {
            readerFrames?: Array<{
              at: number;
              readable: boolean;
              empty: boolean;
            }>;
          }
        ).readerFrames || []
    );
    const readable = frames.find((frame) => frame.readable);
    check(`slow assets/${width}: first readable pages`, !!readable);
    check(
      `slow assets/${width}: no painted empty book`,
      frames.every((frame) => !frame.empty)
    );
    startup.push({
      width,
      firstReadableMs: Math.round(readable!.at),
      readyMs: Math.round(await page.evaluate(() => performance.now())),
      emptyFrames: frames.filter((frame) => frame.empty).length
    });
    await context.close();
  }
  for (const { code } of languages) {
    const context = await browser.newContext({
        viewport: { width: 1440, height: 960 },
        reducedMotion: 'reduce'
      }),
      page = await context.newPage();
    observe(page);
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: width === 1440 ? 960 : 900 });
      for (const route of [
        '/introduction.html',
        '/real/introduction.html',
        '/contents.html'
      ]) {
        const started = Date.now();
        await page.goto(origin + languagePath(route, code));
        await ready(page, route);
        check(
          `${code}/${width}/${route}: locale`,
          (await page.locator('html').getAttribute('lang')) ===
            htmlLanguage(code)
        );
        const geometry = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          outside: [
            ...document.querySelectorAll<HTMLElement>(
              '.bound-tools button,.bound-world-nav select,.real-toolbar button,.real-toolbar select'
            )
          ]
            .filter((element) => {
              const rect = element.getBoundingClientRect();
              return (
                rect.width > 0 &&
                (rect.left < -0.5 || rect.right > innerWidth + 0.5)
              );
            })
            .map((element) => element.id || element.getAttribute('aria-label'))
        }));
        check(
          `${code}/${width}/${route}: no horizontal overflow`,
          !geometry.overflow
        );
        check(
          `${code}/${width}/${route}: controls inside viewport`,
          geometry.outside.length === 0
        );
        layouts.push({
          locale: code,
          width,
          route,
          readyMs: Date.now() - started
        });
        if (code === 'zh' && width === 1440 && route === '/introduction.html') {
          await page.screenshot({ path: path.join(output, 'zh-light.png') });
          await page.locator('#toggle-night').click();
          await page.screenshot({ path: path.join(output, 'zh-dark.png') });
        }
        if (code === 'ar' && width === 320 && route === '/introduction.html')
          await page.screenshot({ path: path.join(output, 'ar-mobile.png') });
      }
    }
    await context.close();
  }
  const context = await browser.newContext({
      viewport: { width: 1440, height: 960 },
      reducedMotion: 'reduce',
      permissions: ['clipboard-read', 'clipboard-write']
    }),
    page = await context.newPage();
  observe(page);
  const contentRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/content/'))
      contentRequests.push(new URL(request.url()).pathname);
  });
  await page.goto(origin + '/zh/concepts/operational_semantics.html');
  await page
    .locator('#folio-position')
    .filter({ hasText: /\// })
    .waitFor({ timeout: 45000 });
  await closeMusic(page);
  const position = await page.locator('#folio-position').innerText();
  await page.locator('#next-sheet').click();
  await page.waitForFunction(
    (value) => document.querySelector('#folio-position')?.textContent !== value,
    position
  );
  check(
    'chapter-internal page turn',
    page.url().includes('operational_semantics')
  );
  await page.locator('#bookmark').click();
  check(
    'bookmark state',
    (await page.locator('#bookmark').getAttribute('aria-pressed')) === 'true'
  );
  await page.locator('[data-bookmarks]').click();
  await page.locator('#bookmarks-dialog[open]').waitFor();
  check(
    'bookmark dialog current chapter',
    (await page.locator('.saved-chapter strong').innerText()) === '操作语义'
  );
  await page.locator('[data-close-bookmarks]').click();
  await page.keyboard.press('Control+k');
  await page.locator('#search-input').fill('能力');
  await page.locator('.search-result').first().waitFor();
  check('localized search', (await page.locator('.search-result').count()) > 0);
  await page.keyboard.press('Escape');
  await page
    .locator('#search-dialog:not([open])')
    .waitFor({ state: 'attached' });
  check('Escape closes search', true);
  await page.locator('#reading-mode').click();
  await page.locator('.continuous-prose').waitFor();
  check(
    'book to scroll mode',
    (await page.locator('#reading-mode').getAttribute('aria-pressed')) ===
      'true'
  );
  await page.locator('#reading-mode').click();
  await page.locator('#folio-position').filter({ hasText: /\// }).waitFor();
  await page.locator('select[data-language]').selectOption('en');
  await page.locator('html[lang="en"]').waitFor();
  await page.locator('#folio-position').filter({ hasText: /\// }).waitFor();
  check(
    'language preserves canonical section',
    new URL(page.url()).hash.length > 1
  );
  check(
    'selected language data only',
    JSON.stringify(contentRequests) ===
      JSON.stringify(['/content/zh.json', '/content/en.json'])
  );
  check(
    'manual language preference',
    (await page.evaluate(() =>
      localStorage.getItem('alux-programming-language')
    )) === 'en'
  );
  await page.locator('[data-realm-switch]').click();
  await page.locator('.real-prose').waitFor();
  await closeMusic(page);
  check(
    'same-chapter world switch',
    page.url().includes('/real/concepts/operational_semantics.html')
  );
  await page.locator('select[data-language]').selectOption('ar');
  await page.locator('html[dir="rtl"]').waitFor();
  check('language switch retains real world', page.url().includes('/ar/real/'));
  await page.locator('select[data-language]').selectOption('en');
  await page.locator('html[lang="en"]').waitFor();
  check(
    'English dialog messages restored',
    (await page.locator('#search-input').getAttribute('placeholder')) ===
      'Search ideas, code, chapters…'
  );
  await page.goto(origin + '/real/rust-dd/capability-algebras.html');
  await page.locator('.real-copy').first().waitFor();
  await closeMusic(page);
  const code = await page.locator('pre code').first().textContent();
  await page.locator('.real-copy').first().click();
  check(
    'clipboard exact code',
    (await page.evaluate(() => navigator.clipboard.readText())).replaceAll(
      '\r\n',
      '\n'
    ) === code
  );
  check(
    'one music control',
    (await page.locator('.reader-music-button').count()) === 1
  );
  await page.locator('.reader-music-button').click();
  await page.locator('[data-music-volume]').fill('0.4');
  check(
    'audio volume saved without amplification',
    (await page.evaluate(() =>
      localStorage.getItem('alux-reader-music-volume')
    )) === '0.4'
  );
  await context.close();
  assert.deepEqual(errors, [], 'no browser exceptions');
} finally {
  await fs.writeFile(
    path.join(output, 'report.json'),
    JSON.stringify({ checks, layouts, startup, errors }, null, 2)
  );
  await browser.close();
  await new Promise<void>((resolve, reject) =>
    server.httpServer.close((error) => (error ? reject(error) : resolve()))
  );
}
console.log(
  `${checks.length} browser assertions passed; ${layouts.length} localized viewport/route checks. Report: ${path.join(output, 'report.json')}`
);
