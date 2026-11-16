import { chromium } from 'playwright';
import { preview } from 'vite';
const server = await preview({ preview: { host: '127.0.0.1', port: 0 }, logLevel: 'silent' });
const base = server.resolvedUrls!.local[0]!.replace(/\/$/, '');
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.addInitScript(() => { try { sessionStorage.setItem('alux-music-world', 'magic'); } catch {} });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
const ready = () => page.waitForFunction(() => document.documentElement.dataset.chapterReady === location.pathname && !document.querySelector('.volume[data-paper-turning]'));
const state = async (label: string) => console.log(label, new URL(page.url()).pathname, await page.locator('#folio').innerText(), await page.evaluate(() => (document.querySelector('main.leaves') as HTMLElement).scrollLeft), (await page.locator('main.leaves h1').first().innerText()).slice(0, 30));
await page.goto(`${base}/magic/en/insights/referential-transparency.html`); await ready();
for (let i = 0; i < 80 && !page.url().includes('evm'); i++) { await page.click('#page-next'); await page.waitForFunction(() => !document.querySelector('.volume[data-paper-turning]')); }
await ready(); await state('turned in'); await page.waitForTimeout(1500); await state('turned later');
await page.screenshot({ path: '/home/dev/.claude/jobs/7a98b280/tmp/new/evm-turn.png' });
await page.goto(`${base}/magic/en/insights/expression-problem.html`); await ready();
for (let i = 0; i < 4; i++) { await page.click('#page-next'); await ready(); }
await state('before');
await page.click('#sidebar a[href$="insights/evm-alg.html"]'); await page.waitForURL(/evm-alg/); await ready();
await state('toc');
await page.waitForTimeout(1500); await state('later');
await page.screenshot({ path: '/home/dev/.claude/jobs/7a98b280/tmp/new/evm-nav.png' });
await browser.close(); await server.close();
