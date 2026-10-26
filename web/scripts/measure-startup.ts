/** Same-engine local comparison; these measurements are not production SLAs. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {preview} from 'vite';
import {chromium} from 'playwright';
const root=path.resolve(process.argv[2]||path.resolve(import.meta.dirname,'..'));
const output=path.resolve(import.meta.dirname,'../../output/merge-acceptance',process.argv[3]||'startup.json');
const server=await preview({root,preview:{host:'127.0.0.1',port:4177,strictPort:true}});
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
const samples:unknown[]=[];
try{
 for(let i=0;i<5;i++){
  const context=await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'reduce'}),page=await context.newPage();
  await page.addInitScript(()=>localStorage.setItem('alux-programming-language','en'));
  const start=Date.now();
  await page.goto('http://127.0.0.1:4177/concepts/operational_semantics.html');
  await page.locator('#folio-position').filter({hasText:/\//}).waitFor({timeout:45000});
  const readyMs=Date.now()-start;
  const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(entry=>({name:entry.name,bytes:(entry as PerformanceResourceTiming).transferSize})));
  samples.push({readyMs,requests:resources.length,bytes:resources.reduce((sum,r)=>sum+r.bytes,0)});
  await context.close();
 }
 const report={root,browser:browser.version(),viewport:'1440x960',coldContext:true,reducedMotion:true,samples};
 await fs.writeFile(output,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();await new Promise<void>((resolve,reject)=>server.httpServer.close(error=>error?reject(error):resolve()));}
