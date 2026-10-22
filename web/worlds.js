export function gatewayMarkup({t=s=>s,languagePicker=()=>''}={}){
  return `<main id="main" class="world-gateway">${languagePicker()}<h1 class="visually-hidden">${t('Choose your world')}</h1><div class="gateway-composition"><a class="world-choice choice-magic" href="/introduction.html"><span class="choice-symbol" aria-hidden="true">✧</span><strong>${t('Magic world')}</strong><span class="choice-enter"><span class="choice-enter-label">${t('Click to enter')}<span class="choice-enter-arrow" aria-hidden="true">↗</span></span></span></a><div class="gateway-wizard"><img src="/art/world-wizard.webp" alt="" width="1254" height="1254" fetchpriority="high"></div><a class="world-choice choice-real" href="/real/introduction.html"><span class="choice-symbol" aria-hidden="true">〈/〉</span><strong>${t('Real world')}</strong><span class="choice-enter"><span class="choice-enter-label">${t('Click to enter')}<span class="choice-enter-arrow" aria-hidden="true">↗</span></span></span></a></div></main>`;
}

/** Only known chapter URLs change realm. Assets, external links and anchors keep their meaning. */
export function mapRealLinks(root,pages){
  const known=new Set(pages.map(p=>p.slug));
  root.querySelectorAll('a[href]').forEach(a=>{
    const raw=a.getAttribute('href');if(!raw||raw.startsWith('#'))return;
    const url=new URL(raw,location.origin);
    if(url.origin===location.origin&&known.has(url.pathname.slice(1)))a.setAttribute('href','/real'+url.pathname+url.search+url.hash);
  });
}
