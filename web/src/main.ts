import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import 'katex/dist/katex.min.css';
import '../style.css';
import '../immersive.css';
import {mountAtlas} from './atlas.ts';
import {mountBookReader} from './book-reader.ts';
import {turnRoute} from './page-turn.ts';
import '../book-reader.css';
import {partRoutes,contentsMarkup,partMarkup} from './contents.ts';
import '../contents.css';
import '../refinements.css';
import {updateSiteMeta} from './site-meta.ts';
import {bookmarks,removeBookmark} from './bookmarks.ts';
import {gatewayMarkup} from './worlds.ts';
import {mountGatewayWelcome} from './gateway-welcome.ts';
import {mountRealReader} from './real-reader.ts';
import '../worlds.css';
import '../real-reader.css';
import '../gateway.css';
import '../reader-typography.css';
import '../reader-dialogs.css';
import '../reader-materials.css';
import '../reader-presentation.css';
import '../reader-music.css';
import {syncReaderMusic} from './reader-music.ts';
import {language,languagePicker,languageURL,resolveLanguage,setLanguage,localizedBook,translateUI,t,rememberLanguage,stripLanguage} from './i18n.ts';
import {createIcons, Search, ArrowRight, ArrowLeft, Menu, X, Moon, Sun, BookOpen, Github, ArrowUpRight, ArrowDownRight, Copy, Check, RotateCcw, Undo2, Plus, Minus, Bookmark, ChevronRight, Map, ExternalLink, WandSparkles, SquareCode, ScrollText} from 'lucide';
import {query, targetElement} from './dom.ts';
import type {BookGroup, BookNode, Icon, ReaderBook, ReaderController, ReaderPage, ReaderStorage} from './book.ts';

const icons={Search,ArrowRight,ArrowLeft,Menu,X,Moon,Sun,BookOpen,Github,ArrowUpRight,ArrowDownRight,Copy,Check,RotateCcw,Undo2,Plus,Minus,Bookmark,ChevronRight,Map,ExternalLink,WandSparkles,SquareCode,ScrollText};
const $=<T extends Element=HTMLElement>(selector:string):T|null=>document.querySelector<T>(selector);
const app=query<HTMLElement>('#app');
const icon:Icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
const escape=(s:string):string=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] ?? c));
const storage:ReaderStorage={get(key:string){try{return localStorage.getItem(key)}catch{return null}},set(key:string,value:string|number|boolean){try{localStorage.setItem(key,String(value))}catch{}}};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}
function isBookNode(value: unknown): value is BookNode {
  if (!isRecord(value)) return false;
  if (value.kind === 'separator') return true;
  if (value.kind === 'part') return typeof value.title === 'string';
  return value.kind === 'chapter' && typeof value.id === 'string' && typeof value.title === 'string' && Array.isArray(value.children) && value.children.every(isBookNode);
}
function readBook(value: unknown): ReaderBook {
  if (!isRecord(value) || !Array.isArray(value.groups) || !Array.isArray(value.pages) || !Array.isArray(value.toc)) throw new Error('Book data has an invalid shape');
  const groups = value.groups as unknown[];
  if (!groups.every(group => isRecord(group) && typeof group.title === 'string' && isStringArray(group.pages))) throw new Error('Book groups are invalid');
  const pages = value.pages as unknown[];
  const validPage = (page: unknown): page is ReaderPage => isRecord(page) &&
    typeof page.id === 'string' && typeof page.title === 'string' && typeof page.source === 'string' &&
    typeof page.group === 'string' && typeof page.slug === 'string' && typeof page.hash === 'string' &&
    typeof page.markdown === 'string' && typeof page.html === 'string' && typeof page.text === 'string' &&
    typeof page.minutes === 'number' && Array.isArray(page.headings) && page.headings.every(heading => isRecord(heading) &&
      typeof heading.level === 'number' && typeof heading.id === 'string' && typeof heading.text === 'string') &&
    (page.parentId === null || typeof page.parentId === 'string') && isStringArray(page.children);
  const validPages = pages.filter(validPage);
  if (validPages.length !== pages.length || !value.toc.every(isBookNode)) throw new Error('Book pages or table of contents are invalid');
  const knownSlugs = new Set(validPages.map(page => page.slug));
  if (!(groups as BookGroup[]).every(group => group.pages.every(slug => knownSlugs.has(slug)))) throw new Error('Book groups reference an unknown chapter');
  return value as unknown as ReaderBook;
}
if(/^\/(?:index\.html)?$/.test(stripLanguage(location.pathname))){document.body.className='gateway-view';app.innerHTML=gatewayMarkup({t,languagePicker});app.querySelectorAll<HTMLSelectElement>('select[data-language]').forEach(el=>el.disabled=true);}
const languageReady=resolveLanguage().then(next=>setLanguage(next)).catch(()=>setLanguage('en'));
const data:ReaderBook|null=await fetch('/content.json').then(async response=>{if(!response.ok)throw Error('Book could not load');return readBook(await response.json())}).catch(()=>null);
if(!data){await languageReady;app.innerHTML='<main class="load-error"><h1>The book could not load.</h1><p>Please refresh the page to try again.</p><button onclick="location.reload()">Try again</button></main>';translateUI(document);throw Error('Book content unavailable');}
const bookData:ReaderBook=data;
let groups:BookGroup[]=data.groups;
let pages:ReaderPage[]=data.pages;
let parts=groups.slice(0,4);
const romans=['I','II','III','IV','V'];
let current:ReaderPage|null=null;
let activeRealm="gateway";
let readerController:ReaderController|null=null;
let disposeWelcome:(()=>void)|null=null;
let renderToken=0;
let nextRender:Promise<unknown>=Promise.resolve();
let currentObserver:IntersectionObserver|null=null;
let fontSize=Number(storage.get('alux-font-size')??18);
fontSize=Math.min(23,Math.max(16,fontSize));

function brand(_side=false):string{return `<a class="brand crafted-brand" href="/" aria-label="ALUX Programming home"><img class="brand-seal brand-seal-day" src="/art/alux-bronze.webp" alt="" width="72" height="72"><img class="brand-seal brand-seal-night" src="/art/alux-bronze-night.webp" alt="" width="72" height="72"><span class="brand-letters"><span class="brand-name">ALUX</span><span class="brand-subtitle">PROGRAMMING</span></span></a>`;}
function header():string{return `<header class="site-header">${brand()}<nav aria-label="Main navigation"><a class="worlds-nav" href="/">Choose world</a><a href="/introduction.html">The book</a><a href="/contents.html">Chapters</a><a href="https://github.com/alux-network/alux-programming" target="_blank" rel="noopener noreferrer">GitHub ${icon('arrow-up-right')}</a></nav><button data-search class="search-button" aria-label="Search the book">${icon('search')}<span>Search</span><kbd>⌘ / Ctrl K</kbd></button>${languagePicker()}</header>`;}
function footer():string{return `<footer class="site-footer"><div>${brand()}<p>Clear ideas. Composable programs.</p></div><div><a href="/about.html">About the book ${icon('arrow-up-right')}</a><a href="https://www.alux.network/" target="_blank" rel="noopener noreferrer">ALUX Network ${icon('arrow-up-right')}</a><a href="https://github.com/alux-network/alux-programming" target="_blank" rel="noopener noreferrer">Source on GitHub ${icon('arrow-up-right')}</a></div><span>Made of ideas.<br>Built to be explored.</span></footer>`;}
function contents(real=false):void{current=null;const night=storage.get('alux-reading-theme')==='dark';document.body.className='contents-view'+(night?' contents-night':'')+(real?' contents-real':'');app.innerHTML=`<header class="contents-toolbar">${brand()}<div><button class="icon-button" data-search aria-label="Search the book">${icon('search')}</button>${languagePicker()}</div></header>`+contentsMarkup({groups,pages,icon,real});document.title='Table of contents · ALUX Programming';hydrateIcons();}
function part(index:number):void{current=null;document.body.className='part-view';app.innerHTML=header()+partMarkup({index,groups:parts,pages,icon})+footer();document.title=parts[index].title+' · ALUX Programming';hydrateIcons();}
function atlas():void{current=null;currentObserver?.disconnect();document.body.className='atlas-view';app.innerHTML=header()+'<main id="main" class="atlas-main"></main>'+footer();mountAtlas({root:query<HTMLElement>('#main',app),groups:parts,pages,icon,hydrateIcons});document.title='The chapter atlas · ALUX Programming';}

function sidebar():string{const page=current;if(!page)throw new Error('Cannot render sidebar without a current chapter');return `<aside class="book-sidebar" id="book-sidebar" aria-label="Table of contents">${brand(true)}<button class="my-bookmarks" data-bookmarks>${icon('bookmark')}<span>My bookmarks</span><small data-bookmark-count></small></button><button class="sidebar-search" data-search>${icon('search')}<span>Search the book</span><kbd>Ctrl K</kbd></button><nav>${`<a class="intro-nav ${page.source==='index.md'?'active':''}" href="/introduction.html">${icon('book-open')} Introduction</a>`}${groups.map((g,i)=>`<section class="sidebar-group"><h2><span>${romans[i]}</span>${g.title}</h2>${g.pages.map((s,j)=>{const p=pages.find(x=>x.slug===s);return `<a href="/${s}" class="${s===page.slug?'active':''}" ${s===page.slug?'aria-current="page"':''}><span>${String(j+1).padStart(2,'0')}</span>${p?.title ?? ''}</a>`}).join('')}</section>`).join('')}</nav><div class="sidebar-bottom"><a class="sidebar-source" href="https://github.com/alux-network/alux-programming" target="_blank" rel="noopener noreferrer" aria-label="Source on GitHub" title="Source on GitHub">${icon('github')}</a></div></aside>`;}
function reader(p:ReaderPage):void{
  current=p;currentObserver?.disconnect();
  const token=renderToken;
  nextRender=mountBookReader({app,page:p,pages,sidebar:sidebar(),brand:brand(),worldLink:`<a class="realm-switch" href="/real/${p.slug}${location.hash}" data-realm-switch>Real world ${icon("arrow-up-right")}</a>`,icon,hydrateIcons,storage,announce,onNavigate:href=>navigate(href,true)}).then(controller=>{if(token!==renderToken)controller?.dispose();else readerController=controller;});
}
function resizeText(delta:number):void{fontSize=Math.min(23,Math.max(16,fontSize+delta));storage.set('alux-font-size',fontSize);document.documentElement.style.setProperty('--reading-size',fontSize+'px');announce(`Reading size ${fontSize} pixels`);}
function setMenu(open:boolean):void{document.body.classList.toggle('menu-open',open);$('#toggle-menu')?.setAttribute('aria-expanded',String(open));if(open)$('#book-sidebar .active')?.focus();else $('#toggle-menu')?.focus();}
function hydrateIcons():void{updateBookmarkCounts();document.querySelectorAll<HTMLElement>('.real-tool[aria-label],.bound-tools [aria-label]').forEach(el=>el.title=el.getAttribute('aria-label')??'');translateUI(document);createIcons({icons,attrs:{'stroke-width':1.5}});}
function reducedMotion():boolean{return matchMedia('(prefers-reduced-motion: reduce)').matches;}
function updateProgress():void{if(!current)return;const total=document.documentElement.scrollHeight-innerHeight;const pc=total>0?Math.min(100,scrollY/total*100):100;const el=$<HTMLElement>('#reading-progress');if(el)el.style.width=pc+'%';}
window.addEventListener('scroll',updateProgress,{passive:true});
let announcementTimer:ReturnType<typeof setTimeout>|undefined;
function announce(text:string,anchor:HTMLElement|null=(document.activeElement instanceof HTMLElement?document.activeElement.closest('button'):null)):void{const el=$<HTMLElement>('#announcement');if(!el)return;el.textContent=t(text);el.classList.add('show');clearTimeout(announcementTimer);el.classList.toggle('anchored',!!anchor);if(anchor){const r=anchor.getBoundingClientRect();el.style.left=Math.max(12,Math.min(innerWidth-el.offsetWidth-12,r.right-el.offsetWidth))+'px';el.style.top=Math.min(innerHeight-el.offsetHeight-12,r.bottom+10)+'px';}else{el.style.left='';el.style.top='';}announcementTimer=setTimeout(()=>el.classList.remove('show'),2600);}

function renderRoute():Promise<void>{
  disposeWelcome?.();disposeWelcome=null;
  nextRender=Promise.resolve();renderToken++;readerController?.dispose();readerController=null;document.body.classList.remove('menu-open','continuous-reading');
  let pathname=decodeURI(stripLanguage(location.pathname)).replace(/^\//,'');if(pathname==='magic.html'){history.replaceState({},'',languageURL('/introduction.html'+location.hash));pathname='introduction.html';}
  const real=pathname.startsWith('real/');
  const slug=real?(pathname.slice(5)||'introduction.html'):pathname;
  const page=pages.find(p=>p.slug===(slug==='index.html'&&real?'introduction.html':slug));
  activeRealm=real?'real':(!pathname||pathname==='index.html')?'gateway':'magic';
  if(page&&real){current=page;readerController=mountRealReader({app,page,pages,groups,icon,hydrateIcons,storage,announce,onNavigate:href=>navigate(href)});}
  else if(page)reader(page);
  else if(pathname==='atlas.html')atlas();
  else if(pathname==='contents.html'||pathname==='real/contents.html')contents(real);
  else if(partRoutes.includes(pathname))part(partRoutes.indexOf(pathname));

  else if(activeRealm==='gateway'){current=null;document.body.className='gateway-view';app.innerHTML=gatewayMarkup({t,languagePicker});document.title=t('Choose your world')+' · ALUX Programming';hydrateIcons();disposeWelcome=mountGatewayWelcome(query<HTMLElement>('.world-gateway',app));}
  else{current=null;document.title=t('This page is uncharted.')+' · ALUX Programming';document.body.className='home-view';app.innerHTML=header()+'<main id="main" class="not-found"><span>404</span><h1>This page is uncharted.</h1><p>Find your way back to the book.</p><a class="button primary" href="/">Choose a world</a></main>';hydrateIcons();}
  if(page)document.title=(page.slug==='introduction.html'?t('Introduction'):page.title)+' · ALUX Programming';else if(activeRealm!=='gateway')document.title=t(document.title.split(' · ')[0])+' · ALUX Programming';translateUI(document);updateSiteMeta(language());updateBookmarkCounts();return nextRender.then(()=>{syncReaderMusic(activeRealm);});
}
function afterRoute(focus=false):void{if(location.hash){const id=decodeURIComponent(location.hash.slice(1));if(readerController)readerController.goToAnchor(id,false);else requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView());}else if(activeRealm==='real'&&readerController?.restorePosition)readerController.restorePosition();else window.scrollTo({top:0,behavior:'instant'});if(focus){const m=$<HTMLElement>('#main');m?.setAttribute('tabindex','-1');m?.focus({preventScroll:true});}}
let navigating=false;
async function navigate(url:string,opening=false):Promise<void>{
  if(navigating)return;navigating=true;url=languageURL(url);
  try{
    const targetPath=stripLanguage(new URL(url,location.origin).pathname);const sameMagic=activeRealm==='magic'&&!targetPath.startsWith('/real/')&&targetPath!=='/'&&targetPath!=='/index.html';
    const direction=pages.findIndex(p=>p.slug===targetPath.replace(/^\//,''))-(current?pages.indexOf(current):-1);
    history.pushState({},'',url);
    if(!reducedMotion()&&sameMagic)await turnRoute(app,async()=>{await renderRoute();afterRoute(true)},direction<0?-1:1);
    else if(!reducedMotion()&&document.startViewTransition){document.documentElement.dataset.transition='world';await document.startViewTransition(async()=>{await renderRoute();afterRoute(true)}).finished;}
    else{await renderRoute();afterRoute(true);}
  }finally{delete document.documentElement.dataset.transition;navigating=false;}
}
document.addEventListener('click',(e:MouseEvent)=>{if(e.defaultPrevented)return;const target=targetElement(e);if(!target)return;const open=target.closest('[data-open-book]');const a=target.closest<HTMLAnchorElement>('a');if(open&&!a){e.preventDefault();void navigate('/introduction.html',true);return;}if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||a.target==='_blank'||a.hasAttribute('download'))return;if(a.hasAttribute('data-realm-switch')){const section=readerController?.getCurrentAnchor?.();a.hash=section?'#'+section:location.hash;}const url=new URL(a.href,location.href);if(url.origin!==location.origin)return;if(url.pathname===location.pathname&&url.hash){e.preventDefault();history.pushState({},'',url.pathname+url.search+url.hash);if(readerController)readerController.goToAnchor(url.hash.slice(1));else document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView({behavior:reducedMotion()?'instant':'smooth'});return;}e.preventDefault();void navigate(languageURL(url.pathname+url.search+url.hash),!!open);});
addEventListener('popstate',async()=>{history.replaceState({},'',languageURL(location.href));await renderRoute();afterRoute();});

const savedDialog=query<HTMLDialogElement>('#bookmarks-dialog');let savedOrigin:HTMLElement|null=null;
function updateBookmarkCounts():void{document.querySelectorAll<HTMLElement>('[data-bookmark-count]').forEach(el=>el.textContent=String(bookmarks().length));}
function renderBookmarks():void{const list=bookmarks().filter(item=>pages.some(p=>p.slug===item.slug));query<HTMLElement>('#bookmarks-list').innerHTML=list.length?list.map(item=>{const page=pages.find(p=>p.slug===item.slug);if(!page)return '';const href=languageURL('/'+(item.realm==='real'?'real/':'')+item.slug+(item.anchor&&!(item.realm==='magic'&&item.folio!==undefined)?'#'+encodeURIComponent(item.anchor):''));return `<div class="saved-chapter"><a href="${href}" data-resume-bookmark="${escape(item.slug)}"><small>${escape(page.group)} · ${t(item.realm==='real'?'Real world':'Magic world')}</small><strong>${escape(page.title)}</strong><span>${t('Continue reading')} ${icon('arrow-right')}</span></a><button class="icon-button" data-remove-bookmark="${escape(item.slug)}" aria-label="Remove bookmark">${icon('x')}</button></div>`}).join(''):`<div class="bookmarks-empty"><p>No bookmarks yet.</p><p>Save a chapter with the bookmark button to continue reading here.</p></div>`;hydrateIcons();}
function closeBookmarks():void{savedDialog.close();savedOrigin?.focus();}
addEventListener('alux-bookmarks-changed',()=>{updateBookmarkCounts();if(savedDialog.open)renderBookmarks();});
document.addEventListener('click',(e:MouseEvent)=>{const target=targetElement(e);if(!target)return;if(target.closest('[data-bookmarks]')){savedOrigin=document.activeElement instanceof HTMLElement?document.activeElement:null;renderBookmarks();savedDialog.showModal();query<HTMLElement>('[data-close-bookmarks]',savedDialog).focus();}if(target.closest('[data-close-bookmarks]'))closeBookmarks();const remove=target.closest<HTMLElement>('[data-remove-bookmark]');if(remove){const slug=remove.dataset.removeBookmark;if(slug)removeBookmark(slug);savedDialog.querySelector<HTMLElement>('[data-remove-bookmark],[data-close-bookmarks]')?.focus();}const resume=target.closest<HTMLElement>('[data-resume-bookmark]');if(resume){const slug=resume.dataset.resumeBookmark;const item=bookmarks().find(x=>x.slug===slug);if(item?.folio!==undefined)storage.set('alux-folio-'+item.slug,item.folio);if(item?.scroll!==undefined)storage.set('alux-real-scroll-'+item.slug,item.scroll);closeBookmarks();}});
savedDialog.addEventListener('click',(e:MouseEvent)=>{if(e.target===savedDialog)closeBookmarks();});savedDialog.addEventListener('cancel',(e:Event)=>{e.preventDefault();closeBookmarks();});

const dialog=query<HTMLDialogElement>('#search-dialog');let searchOrigin:HTMLElement|null=null;
function openSearch():void{if(dialog.open||activeRealm==='gateway')return;searchOrigin=document.activeElement instanceof HTMLElement?document.activeElement:null;dialog.showModal();const input=query<HTMLInputElement>('#search-input');input.value='';searchResults('');input.focus();}
function closeSearch():void{dialog.close();searchOrigin?.focus();}
function searchResults(queryText:string):void{const q=queryText.toLowerCase().trim();const container=query<HTMLElement>('#search-results');if(!q){container.innerHTML='<p class="search-hint">A keyword opens a new page.</p>';}else{const terms=q.split(/\s+/);const hits=pages.map(p=>{const title=p.title.toLowerCase(),text=p.text.toLowerCase();return{p,score:terms.reduce((n,t)=>n+(title.includes(t)?15:0)+(text.includes(t)?1:0),0),matches:terms.every(t=>text.includes(t)||title.includes(t))};}).filter(x=>x.matches).sort((a,b)=>b.score-a.score);container.innerHTML=`<div class="search-group-label">${hits.length} ${hits.length===1?'RESULT':'RESULTS'}</div>`+(hits.length?hits.map(({p})=>{const at=p.text.toLowerCase().indexOf(terms[0]??'');return resultItem(p,(at>50?'…':'')+p.text.slice(Math.max(0,at-45),Math.max(0,at-45)+150)+'…',q)}).join(''):'<div class="no-results"><h3>No pages found.</h3><p>Try a concept such as “capability”, “Rust” or “meaning”.</p></div>');}hydrateIcons();container.querySelectorAll<HTMLAnchorElement>('a').forEach(a=>a.addEventListener('click',closeSearch));}
function resultItem(p:ReaderPage,snippet:string,q:string):string{return `<a class="search-result" href="/${activeRealm==='real'?'real/':''}${p.slug}"><span><small>${p.group}</small><strong>${escape(p.title)}</strong>${snippet?`<p>${escape(snippet)}</p>`:''}</span>${icon('arrow-right')}</a>`;}
document.addEventListener('click',(e:MouseEvent)=>{const target=targetElement(e);if(!target)return;if(target.closest('[data-search]'))openSearch();if(target.closest('[data-close-search]'))closeSearch();});
query<HTMLInputElement>('#search-input').addEventListener('input',(e:Event)=>{if(e.target instanceof HTMLInputElement)searchResults(e.target.value);});
dialog.addEventListener('click',(e:MouseEvent)=>{if(e.target===dialog)closeSearch();});dialog.addEventListener('cancel',(e:Event)=>{e.preventDefault();closeSearch();});
document.addEventListener('keydown',(e:KeyboardEvent)=>{if(e.key==='Escape'&&dialog.open){e.preventDefault();closeSearch();return;}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch();}if(e.key==='Escape'&&!dialog.open&&document.body.classList.contains('menu-open'))setMenu(false);if(e.key==='ArrowDown'&&dialog.open){e.preventDefault();const links=[...dialog.querySelectorAll<HTMLElement>('.search-result')];const i=links.indexOf(document.activeElement as HTMLElement);links[(i+1)%links.length]?.focus();}if(e.key==='ArrowUp'&&dialog.open){e.preventDefault();const links=[...dialog.querySelectorAll<HTMLElement>('.search-result')];const i=links.indexOf(document.activeElement as HTMLElement);links[(i-1+links.length)%links.length]?.focus();}});

// Redirect right-button hits on visual media to a neutral target; leave the native browser menu intact.
document.addEventListener('pointerdown',(e:PointerEvent)=>{const target=targetElement(e);if(e.button!==2||!target?.closest('img,video,canvas,.chapter-art'))return;const shield=document.createElement('div');Object.assign(shield.style,{position:'fixed',left:(e.clientX-5)+'px',top:(e.clientY-5)+'px',width:'12px',height:'12px',zIndex:'99999'});document.body.append(shield);setTimeout(()=>shield.remove(),1000);},true);
try{await languageReady;({groups,pages}=localizedBook(bookData));parts=groups.slice(0,4);history.replaceState({},'',languageURL(location.href));}catch{await setLanguage('en');}
await renderRoute();afterRoute();
type LanguageCode=ReturnType<typeof language>;
async function changeLanguage(next:LanguageCode):Promise<void>{
  if(navigating)return;navigating=true;document.querySelectorAll<HTMLSelectElement>('select[data-language]').forEach(el=>el.disabled=true);
  const old=language();try{await setLanguage(next);({groups,pages}=localizedBook(bookData));parts=groups.slice(0,4);rememberLanguage();history.replaceState({},'',languageURL(location.href));await renderRoute();afterRoute();}catch{await setLanguage(old);announce('This language is unavailable. Please try again.');document.querySelectorAll<HTMLSelectElement>('select[data-language]').forEach(el=>el.value=old);}finally{navigating=false;document.querySelectorAll<HTMLSelectElement>('select[data-language]').forEach(el=>el.disabled=false);}
}
document.addEventListener('change',(e:Event)=>{if(e.target instanceof HTMLSelectElement&&e.target.matches('[data-language]'))void changeLanguage(e.target.value as LanguageCode)});
