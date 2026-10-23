import {resolveAnchor} from './anchors.ts';
import {languagePicker,t} from './i18n.ts';
import {hasBookmark,toggleBookmark} from './bookmarks.ts';
import {mapRealLinks} from './worlds.ts';
import {readingSize,readingScale,applyReadingSize} from './reading-preferences.ts';
import {query} from './dom.ts';
import type {Announce, BookGroup, Icon, ReaderController, ReaderPage, ReaderStorage} from './book.ts';

interface RealReaderOptions {
  app: HTMLElement;
  page: ReaderPage;
  pages: ReaderPage[];
  groups: BookGroup[];
  icon: Icon;
  hydrateIcons(): void;
  storage: ReaderStorage;
  announce: Announce;
  onNavigate(href: string): void | Promise<void>;
}

const escape=(s: string): string=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] ?? c));
const themes: string[]=['light','coal'];

export function mountRealReader({app,page,pages,groups,icon,hydrateIcons,storage,announce,onNavigate}: RealReaderOptions): ReaderController {
  let theme=storage.get('alux-real-theme')||'light';if(!themes.includes(theme))theme=['navy','ayu'].includes(theme)?'coal':'light';const sharedTheme=storage.get('alux-reading-theme');if(sharedTheme)theme=sharedTheme==='dark'?'coal':'light';storage.set('alux-reading-theme',theme==='coal'?'dark':'light');
  let scale=readingScale(storage),size=readingSize(scale);
  document.body.className=`reality-view real-theme-${theme}`;
  const index=pages.indexOf(page),prev=pages[index-1],next=pages[index+1];
  app.innerHTML=`<aside class="real-sidebar" id="real-sidebar" aria-label="Table of contents"><a class="real-brand" href="/" aria-label="ALUX Programming home"><img src="/alux-black.png" alt="ALUX" width="36" height="36"><span>ALUX <small>Programming</small></span></a><button class="my-bookmarks" data-bookmarks>${icon('bookmark')}<span>My bookmarks</span><small data-bookmark-count></small></button><nav><a class="real-intro ${page.slug==='introduction.html'?'active':''}" href="/real/introduction.html">Introduction</a>${groups.map((g,i)=>`<section><h2>${['I','II','III','IV','V'][i]}. ${escape(g.title)}</h2>${g.pages.map((slug,j)=>{const p=pages.find(p=>p.slug===slug);return `<a href="/real/${slug}" ${page.slug===slug?'aria-current="page" class="active"':''}><span>${i+1}.${j+1}.</span> ${escape(p?.title ?? '')}</a>`}).join('')}</section>`).join('')}</nav></aside><button class="real-scrim" aria-label="Close table of contents" hidden></button><div class="real-body"><header class="real-toolbar"><div class="real-toolbar-left"><button class="real-tool" id="real-menu" aria-label="Toggle table of contents" aria-expanded="${innerWidth>1000}">${icon('menu')}</button><button class="real-tool" data-search aria-label="Search the book">${icon('search')}</button><button class="real-tool" id="real-night" aria-label="Toggle night reading">${icon(theme==='light'?'moon':'sun')}</button><button class="real-tool real-bookmark" id="real-bookmark" aria-label="Bookmark this chapter" aria-pressed="false">${icon('bookmark')}<span data-bookmark-label>Add bookmark</span></button><button class="real-tool real-font" data-real-size="-1" aria-label="Decrease text size">A−</button><button class="real-tool real-font" data-real-size="1" aria-label="Increase text size">A+</button></div><div class="real-toolbar-right"><a class="realm-switch" href="/${page.slug}${location.hash}" data-realm-switch>Magic world ${icon('arrow-up-right')}</a><a class="real-tool" href="https://github.com/alux-network/alux-programming/blob/master/src/${page.source}" target="_blank" rel="noopener noreferrer" aria-label="View source on GitHub">${icon('github')}</a>${languagePicker()}</div></header><main id="main" class="real-main"><article class="real-prose">${page.html}</article><nav class="real-pagination" aria-label="Chapter navigation">${prev?`<a href="/real/${prev.slug}">${icon('arrow-left')}<span><small>Previous chapter</small>${escape(prev.title)}</span></a>`:'<span></span>'}${next?`<a href="/real/${next.slug}"><span><small>Next chapter</small>${escape(next.title)}</span>${icon('arrow-right')}</a>`:'<a href="/">Choose a world</a>'}</nav></main></div>`;
  const article=query<HTMLElement>('.real-prose',app);article.querySelectorAll('h1 img').forEach(img=>img.remove());
  if(page.slug==='introduction.html')article.querySelector('.admonition.warning')?.remove();
  article.querySelectorAll<HTMLTableElement>('table').forEach(table=>{const wrap=document.createElement('div');wrap.className='real-table-scroll';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Scrollable table');table.before(wrap);wrap.append(table);});
  mapRealLinks(article,pages);
  article.querySelectorAll('.copy-code').forEach(button=>button.remove());
  article.querySelectorAll('pre').forEach(pre=>{const button=document.createElement('button');button.className='real-copy';button.type='button';button.setAttribute('aria-label','Copy code');button.innerHTML=icon('copy');button.onclick=async()=>{try{await navigator.clipboard.writeText(pre.querySelector('code')?.textContent||pre.textContent);button.innerHTML=icon('check');button.setAttribute('aria-label','Code copied');hydrateIcons();setTimeout(()=>{if(button.isConnected){button.innerHTML=icon('copy');button.setAttribute('aria-label','Copy code');hydrateIcons()}},1800)}catch{announce('Copy is unavailable. Select the code to copy it.')}};pre.append(button);});
  function setSize(){applyReadingSize(size);storage.set('alux-reading-scale',scale)}setSize();
  app.querySelectorAll<HTMLButtonElement>('[data-real-size]').forEach(b=>b.onclick=()=>{scale=Math.max(-4,Math.min(4,scale+Number(b.dataset.realSize)));size=readingSize(scale);setSize();});
  const nightButton=query<HTMLButtonElement>('#real-night',app);
  nightButton.onclick=()=>{document.body.classList.remove('real-theme-'+theme);theme=theme==='light'?'coal':'light';document.body.classList.add('real-theme-'+theme);storage.set('alux-real-theme',theme);storage.set('alux-reading-theme',theme==='coal'?'dark':'light');nightButton.innerHTML=icon(theme==='light'?'moon':'sun');hydrateIcons();};
  const bookmarkButton=query<HTMLButtonElement>('#real-bookmark',app);
  const mark=()=>{const saved=hasBookmark(page.slug);bookmarkButton.setAttribute('aria-pressed',String(saved));query<HTMLElement>('[data-bookmark-label]',bookmarkButton).textContent=t(saved?'Bookmarked':'Add bookmark');};mark();addEventListener('alux-bookmarks-changed',mark);
  bookmarkButton.onclick=()=>{const headings=[...article.querySelectorAll<HTMLElement>('h1[id],h2[id],h3[id],h4[id]')];const anchor=(headings.filter(h=>h.getBoundingClientRect().top<150).at(-1)||headings[0])?.id||'';const added=toggleBookmark({slug:page.slug,realm:'real',anchor,scroll:scrollY});announce(added?'Chapter bookmarked':'Bookmark removed',bookmarkButton);};
  const menu=query<HTMLButtonElement>('#real-menu',app),scrim=query<HTMLButtonElement>('.real-scrim',app);
  function toggleMenu(open: boolean): void {document.body.classList.toggle(innerWidth>1000?'real-sidebar-hidden':'real-sidebar-open',innerWidth>1000?!open:open);menu.setAttribute('aria-expanded',String(open));scrim.hidden=innerWidth>1000||!open;}
  menu.onclick=()=>toggleMenu(menu.getAttribute('aria-expanded')!=='true');scrim.onclick=()=>toggleMenu(false);
  const keydown=(e: KeyboardEvent)=>{if(e.ctrlKey||e.metaKey||e.altKey||e.shiftKey||document.querySelector('dialog[open]'))return;if(e.key==='Escape'){if(innerWidth<=1000)toggleMenu(false);return;}if(!(e.target instanceof Element)||e.target.closest('input,textarea,select,button,summary,[contenteditable]'))return;if(e.key===(document.documentElement.dir==='rtl'?'ArrowRight':'ArrowLeft')&&prev){e.preventDefault();onNavigate('/real/'+prev.slug)}else if(e.key===(document.documentElement.dir==='rtl'?'ArrowLeft':'ArrowRight')&&next){e.preventDefault();onNavigate('/real/'+next.slug)}else if(e.key==='/'||e.key.toLowerCase()==='s'){e.preventDefault();query<HTMLElement>('[data-search]',app).click()}};
  const resize=()=>{document.body.classList.remove('real-sidebar-hidden','real-sidebar-open');menu.setAttribute('aria-expanded',String(innerWidth>1000));scrim.hidden=true;};
  const header=query<HTMLElement>('.real-toolbar',app);const toolbarObserver=new ResizeObserver(()=>document.body.style.setProperty('--real-toolbar-height',header.offsetHeight+'px'));toolbarObserver.observe(header);
  const save=()=>storage.set('alux-real-scroll-'+page.slug,scrollY);
  addEventListener('keydown',keydown);addEventListener('resize',resize);addEventListener('scroll',save,{passive:true});storage.set('alux-real-last-chapter',page.slug);hydrateIcons();
  return {getCurrentAnchor(){const headings=[...article.querySelectorAll<HTMLElement>('h1[id],h2[id],h3[id],h4[id]')];return (headings.filter(h=>h.getBoundingClientRect().top<150).at(-1)||headings[0])?.id},goToAnchor(id){document.getElementById(resolveAnchor(page,id))?.scrollIntoView({block:'start',behavior:'instant'})},restorePosition(){scrollTo({top:Number(storage.get('alux-real-scroll-'+page.slug)||0),behavior:'instant'})},openContents:()=>toggleMenu(true),dispose(){save();toolbarObserver.disconnect();removeEventListener('alux-bookmarks-changed',mark);removeEventListener('keydown',keydown);removeEventListener('resize',resize);removeEventListener('scroll',save)}};
}
