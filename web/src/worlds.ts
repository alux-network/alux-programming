import type {ReaderPage} from './book.ts';
export function gatewayMarkup({t=(s:string)=>s,languagePicker=()=>''}:{t?:(text:string)=>string;languagePicker?:()=>string}={}):string{
  return `<main id="main" class="world-gateway">${languagePicker()}<h1 class="visually-hidden">${t('Choose your world')}</h1><div class="gateway-composition"><a class="world-choice choice-magic" href="/introduction.html"><span class="choice-symbol" aria-hidden="true"><i data-lucide="wand-sparkles"></i></span><strong>${t('Magic world')}</strong><span class="choice-enter"><span class="choice-enter-label">${t('Click to enter')}<span class="choice-enter-arrow" aria-hidden="true">↗</span></span></span></a><div class="gateway-wizard"><img src="/art/wizard-standing.webp" alt="" width="1024" height="1536" fetchpriority="high"></div><a class="world-choice choice-real" href="/real/introduction.html"><span class="choice-symbol" aria-hidden="true"><i data-lucide="square-code"></i></span><strong>${t('Real world')}</strong><span class="choice-enter"><span class="choice-enter-label">${t('Click to enter')}<span class="choice-enter-arrow" aria-hidden="true">↗</span></span></span></a></div></main>`;
}

/** Only known chapter URLs change realm. Assets, external links and anchors keep their meaning. */
export function mapRealLinks(root:ParentNode,pages:ReaderPage[]):void{
  const known=new Set(pages.map(p=>p.slug));
  root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(a=>{
    const raw=a.getAttribute('href');if(!raw||raw.startsWith('#'))return;
    const url=new URL(raw,location.origin);
    if(url.origin===location.origin&&known.has(url.pathname.slice(1)))a.setAttribute('href','/real'+url.pathname+url.search+url.hash);
  });
}
