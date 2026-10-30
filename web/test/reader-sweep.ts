// Exhaustive content-route diagnosis. No screenshots, downloads or source rewrites.
// Run after npm run build: node web/test/reader-sweep.ts
import assert from 'node:assert/strict';
import { readFileSync,readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { preview } from 'vite';
import { expectedSite } from './site.ts';
import { readerPage } from './reader-page.ts';
const editions=await expectedSite();
const digest=()=>createHash('sha256').update(readdirSync('book/html').filter(f=>/^reader-.*\.(js|css)$/.test(f)).sort().map(f=>f+readFileSync('book/html/'+f)).join('')).digest('hex');
const bundle=digest();
const server=await preview({preview:{host:'127.0.0.1',port:0,open:false},logLevel:'silent'});
const base=server.resolvedUrls!.local[0]!;
const browser=await chromium.launch({channel:process.env.ALUX_BROWSER_CHANNEL||'chrome',headless:true});
let routes=0, turns=0, equations=0, copyControls=0;
try {
  for(const theme of ['light','coal']) for(const world of ['magic','real']) {
    const context=await browser.newContext({viewport:{width:1600,height:1200},reducedMotion:'reduce'});
    await context.addInitScript(({theme,world})=>{
      if(!localStorage.getItem('alux-reader')) localStorage.setItem('alux-reader',JSON.stringify({world,mode:'pages',bookmarks:[]}));
      localStorage.setItem('mdbook-theme',theme); sessionStorage.setItem('alux-entered','1');
    },{theme,world});
    const page=readerPage(await context.newPage());
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    for(const edition of editions) {
      for(const chapter of edition.pages) {
        const route=(edition.lang==='en'?'':edition.lang+'/')+chapter.file;
        await page.goto(base+route);
        await page.evaluate(()=>{ document.querySelector('main.leaves')!.getBoundingClientRect(); return new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))); });
        await page.evaluate(()=>document.fonts.ready);
        await page.waitForFunction(()=>document.documentElement.dataset.world!=='magic'||!!document.querySelector('#folio')?.textContent);
        const state=await page.locator('#content > .volume > main.leaves').evaluate(main=>{
          const style=getComputedStyle(main),count=parseInt(style.columnCount)||1;
          const width=(main.clientWidth-(count-1)*(parseFloat(style.columnGap)||0))/count;
          return {text:main.textContent?.trim().length||0,width,equations:[...main.querySelectorAll<HTMLElement>('.katex-display')].map(e=>({width:e.getBoundingClientRect().width,overflow:getComputedStyle(e).overflowX})),copy:[...main.querySelectorAll<HTMLElement>('.clip-button')].map(e=>({color:getComputedStyle(e).color,icon:getComputedStyle(e,'::before').backgroundColor,tooltip:getComputedStyle(e.querySelector('.tooltiptext')!).display})),theme:document.documentElement.className};
        });
        assert.ok(state.text>0,route+' has content');
        assert.ok(state.theme.includes(theme),route+' theme');
        for(const copy of state.copy){assert.equal(copy.color,copy.icon,route+' copy icon inherits its control color');assert.equal(copy.tooltip,'none',route+' no duplicate floating feedback');}
        copyControls+=state.copy.length;
        if(world==='magic') {
          for(const eq of state.equations){assert.ok(eq.width<=state.width+1,route+' equation stays inside its leaf');assert.equal(eq.overflow,'auto');}
          equations+=state.equations.length;
          const folio=async()=>{const text=await page.locator('#folio').innerText();const match=text.match(/ · (\d+)(?:–(\d+))? \/ (\d+)$/);assert.ok(match,text);return {first:+match[1]!,last:+(match[2]??match[1])!,total:+match[3]!};};
          let at=await folio();const total=at.total;
          while(at.last<at.total){
            const box=(await page.locator('.volume').boundingBox())!;
            await page.mouse.click(edition.rtl?box.x+20:box.x+box.width-20,box.y+box.height-24);
            const next=await folio();assert.equal(next.first,at.last+1,route+' blank paper advances exactly one spread');assert.equal(next.total,total,route+' stable total');at=next;turns++;
          }
          if(at.first>1){await page.locator('#page-prev').click();const back=await folio();assert.equal(back.last,at.first-1,route+' reverse turn');turns++;}
        }
        assert.deepEqual(errors,[],route+' script errors');routes++;
      }
      console.log(JSON.stringify({theme,world,edition:edition.lang,routes,turns,equations,copyControls}));
    }
    await context.close();
  }
  assert.equal(digest(),bundle,'the built reader bundle stayed frozen throughout the sweep');
  console.log(JSON.stringify({bundle,result:'PASS',routes,turns,equations,copyControls,scope:'All canonical mdBook routes and index aliases; both worlds and themes; reduced-motion pagination. Normal-motion folds are covered separately by browser.test.ts.'}));
} finally {await browser.close();await server.close();}
