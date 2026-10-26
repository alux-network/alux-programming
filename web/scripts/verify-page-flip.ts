import path from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const output=path.resolve(import.meta.dirname,'../../output/merge-acceptance');await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
const page=await browser.newPage(),errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
try{
 await page.setContent('<!doctype html><html><body></body></html>');
 await page.evaluate(()=>{
  const frames=new Set<number>(),resize=new Set<EventListenerOrEventListenerObject>();
  const raf=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window),add=window.addEventListener.bind(window),remove=window.removeEventListener.bind(window);
  window.requestAnimationFrame=callback=>{const id=raf(time=>{frames.delete(id);callback(time);});frames.add(id);return id;};
  window.cancelAnimationFrame=id=>{frames.delete(id);cancel(id);};
  window.addEventListener=((type:string,listener:EventListenerOrEventListenerObject,options?:boolean|AddEventListenerOptions)=>{if(type==='resize')resize.add(listener);add(type,listener,options);}) as typeof window.addEventListener;
  window.removeEventListener=((type:string,listener:EventListenerOrEventListenerObject,options?:boolean|EventListenerOptions)=>{if(type==='resize')resize.delete(listener);remove(type,listener,options);}) as typeof window.removeEventListener;
  (window as Window&{flipProbe?:unknown}).flipProbe={frames,resize,raf};
 });
 await page.addScriptTag({path:path.resolve(import.meta.dirname,'../node_modules/page-flip/dist/js/page-flip.browser.js')});
 const result=await page.evaluate(async()=>{
  type Flip={loadFromHTML(nodes:HTMLElement[]):void;flipNext(corner:string):void;destroy():void};
  const ctor=(window as Window&{St?:{PageFlip:new(element:HTMLElement,settings:Record<string,unknown>)=>Flip}}).St?.PageFlip;if(!ctor)throw Error('PageFlip did not load');
  for(let i=0;i<5;i++){
   const host=document.createElement('div');host.style.width='360px';host.style.height='240px';document.body.append(host);
   const sheets=Array.from({length:4},(_,n)=>{const sheet=document.createElement('section');sheet.textContent='Sheet '+n;host.append(sheet);return sheet;});
   const flip=new ctor(host,{width:180,height:240,useMouseEvents:false,usePortrait:false,autoSize:false,flippingTime:560});flip.loadFromHTML(sheets);
   if(i%2)await new Promise(resolve=>setTimeout(resolve,25));flip.flipNext('bottom');flip.destroy();
  }
  const probe=(window as Window&{flipProbe?:{frames:Set<number>;resize:Set<unknown>;raf:typeof requestAnimationFrame}}).flipProbe!;
  await new Promise<void>(resolve=>probe.raf(()=>probe.raf(()=>resolve())));
  return {activeFrames:probe.frames.size,resizeListeners:probe.resize.size,remainingHosts:document.querySelectorAll('.stf__parent,.stf__wrapper').length};
 });
 await fs.writeFile(path.join(output,'page-flip-lifecycle.json'),JSON.stringify({browser:browser.version(),result,errors},null,2));
 console.log(JSON.stringify({browser:browser.version(),result,errors}));assert.deepEqual(result,{activeFrames:0,resizeListeners:0,remainingHosts:0});assert.deepEqual(errors,[]);
}finally{await browser.close();}
