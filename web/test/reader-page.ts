// Keep the same behavioral scenarios against either a native fallback or the active chapter frame.
import type { Frame, Locator, Page } from 'playwright';
const originals = new WeakMap<Page, Page>();
export const outerPage = (page: Page): Page => originals.get(page) ?? page;
export function readerPage(page: Page): Page {
  const framed=()=>page.frames().some(frame=>frame.name()==='alux-chapter');
  const stable=()=>page.waitForFunction(()=>!document.querySelector('.pending-chapter') &&
    (!!document.querySelector('.chapter-frame') || document.documentElement.hasAttribute('data-chapter-ready')),undefined,{timeout:15000});
  const current=async():Promise<Frame|Page>=>{
    if(!framed()) return page;
    const element=await page.locator('.chapter-frame:not(.pending-chapter)').elementHandle();
    return (await element?.contentFrame()) ?? page;
  };
  const wrapLocator=(locator:Locator):Locator=>new Proxy(locator,{
    get(target,key){
      const value=Reflect.get(target,key);
      if(typeof value!=='function')return value;
      return (...args:unknown[])=>{
        const result=value.apply(target,args);
        if(key==='click'||key==='tap') return Promise.resolve(result).then(async()=>{ if(!(args[0] as any)?.noWaitAfter && await page.locator('.pending-chapter').count())await stable(); });
        if(result && typeof result==='object' && typeof result.locator==='function')return wrapLocator(result);
        return result;
      };
    }
  });
  const wrapped = new Proxy(page,{
    get(target,key){
      if(key==='locator') return (selector:string,options?:unknown)=>wrapLocator(framed()?page.frameLocator('.chapter-frame:not(.pending-chapter)').locator(selector,options as never):page.locator(selector,options as never));
      if(['getByRole','getByLabel','getByText','getByPlaceholder','getByTestId'].includes(String(key)))return (...args:unknown[])=>{
        const root=framed()?page.frameLocator('.chapter-frame:not(.pending-chapter)'):page;
        return wrapLocator((root as any)[key](...args));
      };
      if(key==='evaluate'||key==='waitForSelector')return async(...args:unknown[])=>{const frame=await current();return (frame as any)[key](...args);};
      if(key==='waitForFunction') return async(...args:unknown[])=>{
        for(let attempt=0;;attempt++)try{const frame=await current();return await (frame as any).waitForFunction(...args);}catch(error){if(attempt>=2||!/detached|destroyed/.test(String(error)))throw error;await stable();}
      };
      const value=Reflect.get(target,key);
      if(typeof value!=='function')return value;
      if(key==='goto'||key==='reload'||key==='goBack'||key==='goForward')return async(...args:unknown[])=>{
        const result=await value.apply(target,args);
        if(!(args[1] as any)?.waitUntil || (args[1] as any)?.waitUntil==='load')await stable();
        return result;
      };
      return value.bind(target);
    }
  }) as Page;
  originals.set(wrapped,page);
  return wrapped;
}
