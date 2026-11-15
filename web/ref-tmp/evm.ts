// Temporary: one chapter in the approved build and the new app.
import { chromium } from 'playwright';
import { preview } from 'vite';
const S = '/home/dev/.claude/jobs/da022138/tmp/shixi/book/html';
const dir = '/home/dev/.claude/jobs/7a98b280/tmp/';
const page_ = process.argv[2] ?? 'insights/evm-alg.html';
for (const which of ['ref', 'new']) {
  const server = which === 'ref'
    ? await preview({ root: S, configFile: false, build: { outDir: S }, preview: { host: '127.0.0.1', port: 0 }, logLevel: 'silent' })
    : await preview({ preview: { host: '127.0.0.1', port: 0 }, logLevel: 'silent' });
  const base = server.resolvedUrls!.local[0]!.replace(/\/$/, '');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(() => { try { if (!localStorage.getItem('alux-reader')) localStorage.setItem('alux-reader', JSON.stringify({ world: 'magic', music: false, bookmarks: [] })); sessionStorage.setItem('alux-entered', '1'); sessionStorage.setItem('alux-music-world', 'magic'); } catch {} });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(which, 'PAGEERROR', e.message));
  await page.goto(which === 'ref' ? `${base}/${page_}` : `${base}/magic/en/${page_}`); await page.waitForTimeout(3000);
  await page.screenshot({ path: `${dir}${which}/evm.png` });
  const f = page.frames().find((x) => x !== page.mainFrame()) ?? page.mainFrame();
  console.log(which, await f.locator('#folio').innerText(), await f.evaluate(() => { const m = document.querySelector('main.leaves') as HTMLElement; return [m.scrollLeft, m.scrollWidth, m.clientWidth, m.clientHeight]; }));
  await browser.close(); await server.close();
}
