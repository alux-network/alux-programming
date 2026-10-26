/** Production-build acceptance. Mobile profiles are simulations, never physical-device claims. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {preview} from 'vite';
import {chromium,firefox,webkit,devices} from 'playwright';
import type {BrowserType,BrowserContextOptions,Page} from 'playwright';
import type {ReaderBook} from '../src/book.ts';
const web=path.resolve(import.meta.dirname,'..'),output=path.resolve(web,'../output/merge-acceptance');
await fs.mkdir(output,{recursive:true});
const server=await preview({root:web,preview:{host:'127.0.0.1',port:4176,strictPort:true}}),origin='http://127.0.0.1:4176';
const profiles:Array<{name:string;engine:BrowserType;options:BrowserContextOptions;simulation:boolean}>=[
 {name:'desktop-chromium',engine:chromium,options:{viewport:{width:1440,height:960}},simulation:false},
 {name:'desktop-firefox',engine:firefox,options:{viewport:{width:1440,height:960}},simulation:false},
 {name:'android-chromium-profile',engine:chromium,options:devices['Pixel 7']!,simulation:true},
 {name:'iphone-webkit-profile',engine:webkit,options:devices['iPhone 13']!,simulation:true}
];
const reports:unknown[]=[];
async function ready(page:Page){await page.locator('#folio-position[data-ready="true"]').waitFor({timeout:45000});}
async function closeMusic(page:Page){const close=page.locator('[data-music-close]');if(await close.isVisible())await close.click();}
async function settled(page:Page){await page.locator('.reader-app[aria-busy="false"]').waitFor();await ready(page);await page.locator('.chapter-flip-host,.folio-measure').waitFor({state:'detached'});await closeMusic(page);}
try{
 for(const profile of profiles.filter(p=>!process.env.ACCEPTANCE_PROFILE||p.name===process.env.ACCEPTANCE_PROFILE)){
  const browser=await profile.engine.launch({headless:true,...(profile.engine===chromium&&process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
  const context=await browser.newContext({...profile.options,reducedMotion:'no-preference'}),page=await context.newPage();
  const errors:string[]=[],failed:string[]=[],measured:string[]=[],contentRequests:string[]=[],checks:string[]=[];
  const check=(name:string,value:unknown)=>{assert.ok(value,profile.name+': '+name);checks.push(name);};
  page.on('pageerror',error=>errors.push(error.stack||error.message));
  page.on('response',response=>{if(response.url().startsWith(origin)&&response.status()>=400)failed.push(response.status()+' '+response.url());});
  page.on('requestfailed',request=>{if(request.url().startsWith(origin)&&request.failure()?.errorText!=='net::ERR_ABORTED'&&!request.failure()?.errorText.includes('CANCELLED'))failed.push(request.url()+': '+request.failure()?.errorText);});
  page.on('request',request=>{if(request.url().includes('/content/'))contentRequests.push(new URL(request.url()).pathname);});
  await page.exposeFunction('recordMeasured',(id:string,pathname:string)=>{measured.push(id);if(!pathname.endsWith('/'+id.replace(/\.md$/,'.html')))errors.push('Unrelated pagination: '+id+' on '+pathname);});
  await page.addInitScript(()=>{
   new PerformanceObserver(list=>{for(const entry of list.getEntries())if(entry.name==='alux:pagination')void(window as unknown as {recordMeasured:(id:string,pathname:string)=>Promise<void>}).recordMeasured((entry as PerformanceMark).detail.chapter,location.pathname);}).observe({entryTypes:['mark']});
  });
  let failure:unknown;
  try{
   const started=Date.now();
   await page.goto(origin+'/zh/concepts/operational_semantics.html');await settled(page);
   const readyMs=Date.now()-started;
   const book=JSON.parse(await fs.readFile(path.join(web,'dist/content/zh.json'),'utf8')) as ReaderBook,chapter=book.pages.find(p=>p.slug==='concepts/operational_semantics.html')!;
   check('only viewed chapter measured',measured.length>0&&measured.every(id=>id===chapter.id));
   check('only selected edition requested',contentRequests.every(route=>route==='/content/zh.json'));
   check('unknown whole-book count is labelled chapter progress',await page.locator('#folio-position').getAttribute('data-numbering')==='chapter'&&(await page.locator('#folio-position').textContent())?.includes('本章'));
   const snapshot=()=>page.locator('#page-book .folio-content').evaluateAll(nodes=>nodes.map(n=>n.textContent||'').join('').replace(/\s/g,''));
   const before=await snapshot();
   check('math and admonitions rendered',await page.locator('#page-book .katex').count()>0&&await page.locator('#page-book .admonition').count()>0);
   await page.locator('#larger-text').click();await settled(page);const after=await snapshot();if(before!==after)await fs.writeFile(path.join(output,profile.name+'-reflow.json'),JSON.stringify({before,after},null,2));check('font-size reflow retains every content character',before===after);
   const size=page.viewportSize()!;await page.setViewportSize({width:size.height,height:size.width});await settled(page);check('orientation reflow retains content',before===await snapshot());
   await page.setViewportSize(size);await settled(page);
   await page.locator('#bookmark').click();check('bookmark toggles',await page.locator('#bookmark').getAttribute('aria-pressed')==='true');
   await page.locator('#reading-mode').click();await page.locator('.continuous-prose').waitFor();await page.locator('#reading-mode').click();await settled(page);check('scroll/book round trip',before===await snapshot());
   await page.locator('select[data-language]').selectOption('en');await page.locator('html[lang="en"]').waitFor();await settled(page);check('language keeps canonical route and section',page.url().includes('/concepts/operational_semantics.html')&&new URL(page.url()).hash.length>1);
   if(await page.locator('.reader-music-button').getAttribute('aria-pressed')!=='true')await page.locator('.reader-music-button').click();
   await page.waitForFunction(()=>{const media=document.querySelector<HTMLAudioElement>('audio[src*="forest-breath"]');return media&&!media.paused&&media.currentTime>0;});
   check('native audio playback clock advances',true);
   await page.locator('[data-realm-switch]').click();await page.locator('.real-prose h1').waitFor();await closeMusic(page);
   check('world switch keeps chapter',page.url().includes('/real/concepts/operational_semantics.html'));
   check('real-world entry interrupts music',await page.locator('audio[src*="forest-breath"]').evaluate((media:HTMLAudioElement)=>media.paused));
   await page.locator('[data-search]').first().click();await page.locator('#search-input').fill('semantics');await page.locator('.search-result').first().waitFor();check('selected-language search results',await page.locator('.search-result').count()>0);await page.keyboard.press('Escape');
   await page.locator('[data-realm-switch]').click();await settled(page);check('bookmark persists through language/world changes',await page.locator('#bookmark').getAttribute('aria-pressed')==='true');
   // Real internal link clicks exercise the router, not a direct state/test backdoor.
   const follow=async(href:string)=>page.evaluate(href=>{const a=document.createElement('a');a.href=href;document.body.append(a);a.click();a.remove();},href);
   await follow('/rust-dd/capability-algebras.html');await settled(page);
   check('code survives route turn',await page.locator('#page-book pre code').count()>0);
   await follow('/concepts/operational_semantics.html');await page.waitForURL('**/concepts/operational_semantics.html');await page.waitForTimeout(60);await page.goBack();await settled(page);
   check('history interrupts animation cleanly: '+page.url(),page.url().includes('capability-algebras.html')&&await page.locator('.chapter-flip-host').count()===0);
   await page.goForward();await settled(page);check('forward restores destination',page.url().includes('operational_semantics.html'));
   // Warm cycles must leave one active layout, no detached measurement/animation hosts.
   const cdp=profile.name==='desktop-chromium'?await context.newCDPSession(page):null;
   const lifecycle:unknown[]=[];
   for(let i=0;i<4;i++){
    await follow('/rust-dd/capability-algebras.html');await settled(page);await follow('/concepts/operational_semantics.html');await settled(page);
    if(cdp){
     await cdp.send('HeapProfiler.collectGarbage');
     const globals=await cdp.send('Runtime.evaluate',{expression:'JSON.stringify([window,document,document.fonts].map(target=>Object.fromEntries(Object.entries(getEventListeners(target)).map(([name,list])=>[name,list.length]))))',includeCommandLineAPI:true,returnByValue:true});
     lifecycle.push({globals:JSON.parse(globals.result.value as string),dom:await cdp.send('Memory.getDOMCounters')});
    }
   }
   if(cdp){
    await fs.writeFile(path.join(output,'lifecycle-cycles.json'),JSON.stringify(lifecycle,null,2));
    const samples=lifecycle as Array<{globals:unknown;dom:{nodes:number;documents:number;jsEventListeners:number}}>;
    check('global listeners do not accumulate',samples.every(s=>JSON.stringify(s.globals)===JSON.stringify(samples[0]!.globals)));
    check('DOM and listener counts remain bounded after GC',samples.at(-1)!.dom.nodes<=samples[0]!.dom.nodes+100&&samples.at(-1)!.dom.jsEventListeners<=samples[0]!.dom.jsEventListeners+10);
    await cdp.detach();
   }
   check('no leftover animation or measurement hosts',await page.locator('.chapter-flip-host,.folio-measure').count()===0);
   check('single active reader and audio element',await page.locator('#page-book').count()===1&&await page.locator('audio').count()<=1);
   await page.screenshot({path:path.join(output,profile.name+'.png')});
   await follow('/');await page.locator('.world-choice').first().waitFor();await page.locator('.reader-app[aria-busy="false"]').waitFor();
   check('leaving readers pauses reading audio',await page.locator('audio[src*="forest-breath"]').evaluate((media:HTMLAudioElement)=>media.paused));
   check('no failed internal requests',failed.length===0);check('no uncaught exceptions',errors.length===0);
   reports.push({profile:profile.name,browser:browser.version(),simulation:profile.simulation,status:'PASS',readyMs,checks,errors,failed,measured,contentRequests});
  }catch(error){failure=error;reports.push({profile:profile.name,browser:browser.version(),simulation:profile.simulation,status:'FAIL',checks,errors,failed,detail:String(error)});await page.screenshot({path:path.join(output,profile.name+'-failure.png')}).catch(()=>{});}
  finally{await context.close();await browser.close();}
  if(failure)console.error(profile.name+': '+String(failure));else console.log(profile.name+': PASS');
 }
}finally{await fs.writeFile(path.join(output,'browser-acceptance.json'),JSON.stringify(reports,null,2));await new Promise<void>((resolve,reject)=>server.httpServer.close(error=>error?reject(error):resolve()));}
assert.ok(reports.length>0&&reports.every(report=>(report as {status:string}).status==='PASS'),'See browser-acceptance.json');
