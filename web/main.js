import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import 'katex/dist/katex.min.css';
import './style.css';
import './immersive.css';
import {mountAtlas} from './atlas.js';
import {mountBookReader} from './book-reader.js';
import {turnRoute} from './page-turn.js';
import './book-reader.css';
import {partRoutes,contentsMarkup,partMarkup} from './contents.js';
import './contents.css';
import './refinements.css';
import {updateSiteMeta} from './site-meta.js';
import {bookmarks,removeBookmark} from './bookmarks.js';
import {gatewayMarkup} from './worlds.js';
import {mountRealReader} from './real-reader.js';
import './worlds.css';
import './real-reader.css';
import {language,languagePicker,languageURL,resolveLanguage,setLanguage,localizedBook,translateUI,t,rememberLanguage,stripLanguage} from './i18n.js';
import {createIcons, Search, ArrowRight, ArrowLeft, Menu, X, Moon, Sun, BookOpen, Github, ArrowUpRight, ArrowDownRight, Copy, Check, RotateCcw, Undo2, Plus, Minus, Bookmark, ChevronRight, Map, ExternalLink} from 'lucide';

const icons={Search,ArrowRight,ArrowLeft,Menu,X,Moon,Sun,BookOpen,Github,ArrowUpRight,ArrowDownRight,Copy,Check,RotateCcw,Undo2,Plus,Minus,Bookmark,ChevronRight,Map,ExternalLink};
const $=s=>document.querySelector(s);
const app=$('#app');
const icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storage={get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};
if(/^\/(?:index\.html)?$/.test(stripLanguage(location.pathname))){document.body.className='gateway-view';app.innerHTML=gatewayMarkup({t,languagePicker});app.querySelectorAll('select[data-language]').forEach(el=>el.disabled=true);}
const languageReady=resolveLanguage().then(next=>setLanguage(next)).catch(()=>setLanguage('en'));
const data=await fetch('/content.json').then(r=>{if(!r.ok)throw Error('Book could not load');return r.json()}).catch(()=>null);
if(!data){await languageReady;app.innerHTML='<main class="load-error"><h1>The book could not load.</h1><p>Please refresh the page to try again.</p><button onclick="location.reload()">Try again</button></main>';translateUI(document);throw Error('Book content unavailable');}
let {groups,pages}=data;
let parts=groups.slice(0,4);
const romans=['I','II','III','IV','V'];
let current=null;
let activeRealm="gateway";
let readerController=null;
let renderToken=0;
let nextRender=Promise.resolve();
let currentObserver=null;
let fontSize=Number(storage.get('alux-font-size')??18);
fontSize=Math.min(23,Math.max(16,fontSize));

function brand(side=false){return `<a class="brand crafted-brand" href="/" aria-label="ALUX Programming home"><img class="brand-seal brand-seal-day" src="/art/alux-bronze.webp" alt="" width="72" height="72"><img class="brand-seal brand-seal-night" src="/art/alux-bronze-night.webp" alt="" width="72" height="72"><span class="brand-letters"><span class="brand-name">ALUX</span><span class="brand-subtitle">PROGRAMMING</span></span></a>`;}
function header(){return `<header class="site-header">${brand()}<nav aria-label="Main navigation"><a class="worlds-nav" href="/">Choose world</a><a href="/introduction.html">The book</a><a href="/contents.html">Chapters</a><a href="https://github.com/alux-network/alux-programming" target="_blank" rel="noopener noreferrer">GitHub ${icon('arrow-up-right')}</a></nav><button data-search class="search-button" aria-label="Search the book">${icon('search')}<span>Search</span><kbd>⌘ / Ctrl K</kbd></button>${languagePicker()}</header>`;}
function footer(){return `<footer class="site-footer"><div>${brand()}<p>Clear ideas. Composable programs.</p></div><div><a href="/about.html">About the book ${icon('arrow-up-right')}</a><a href="https://www.alux.network/" target="_blank" rel="noopener noreferrer">ALUX Network ${icon('arrow-up-right')}</a><a href="https://github.com/alux-network/alux-programming" target="_blank" rel="noopener noreferrer">Source on GitHub ${icon('arrow-up-right')}</a></div><span>Made of ideas.<br>Built to be explored.</span></footer>`;}
function contents(){current=null;document.body.className='contents-view';app.innerHTML=header()+contentsMarkup({groups,pages,icon})+footer();document.title='Table of contents · ALUX Programming';hydrateIcons();}
function part(index){current=null;document.body.className='part-view';app.innerHTML=header()+partMarkup({index,groups:parts,pages,icon})+footer();document.title=parts[index].title+' · ALUX Programming';hydrateIcons();}
function atlas(){current=null;currentObserver?.disconnect();document.body.className='atlas-view';app.innerHTML=header()+'<main id="main" class="atlas-main"></main>'+footer();mountAtlas({root:$('#main'),groups:parts,pages,icon,hydrateIcons});document.title='The chapter atlas · ALUX Programming';}

function sidebar(){return `<aside class="book-sidebar" id="book-sidebar" aria-label="Table of contents">${brand(true)}<button class="my-bookmarks" data-bookmarks>${icon('bookmark')}<span>My bookmarks</span><small data-bookmark-count></small></button><button class="sidebar-search" data-search>${icon('search')} Search the book <kbd>Ctrl K</kbd></button><nav>${`<a class="intro-nav ${current.source==='index.md'?'active':''}" href="/introduction.html">${icon('book-open')} Introduction</a>`}${groups.map((g,i)=>`<section class="sidebar-group"><h2><span>${romans[i]}</span>${g.title}</h2>${g.pages.map((s,j)=>{const p=pages.find(x=>x.slug===s);return `<a href="/${s}" class="${s===current.slug?'active':''}" ${s===current.slug?'aria-current="page"':''}><span>${String(j+1).padStart(2,'0')}</span>${p.title}</a>`}).join('')}</section>`).join('')}</nav><div class="sidebar-bottom"><span>✦</span> SMALL BUILDING BLOCKS.<br>WORLDS OF POSSIBILITY.</div></aside>`;}
function reader(p){
  current=p;currentObserver?.disconnect();
  const token=renderToken;
  nextRender=mountBookReader({app,page:p,pages,sidebar:sidebar(),brand:brand(),worldLink:`<a class="realm-switch" href="/real/${p.slug}${location.hash}" data-realm-switch>Real world ${icon("arrow-up-right")}</a>`,icon,hydrateIcons,storage,announce,onNavigate:href=>navigate(href,true)}).then(controller=>{if(token!==renderToken)controller?.dispose();else readerController=controller;});
}
function resizeText(delta){fontSize=Math.min(23,Math.max(16,fontSize+delta));storage.set('alux-font-size',fontSize);document.documentElement.style.setProperty('--reading-size',fontSize+'px');announce(`Reading size ${fontSize} pixels`);}
function setMenu(open){document.body.classList.toggle('menu-open',open);$('#toggle-menu')?.setAttribute('aria-expanded',String(open));if(open)$('#book-sidebar .active')?.focus();else $('#toggle-menu')?.focus();}
function hydrateIcons(){updateBookmarkCounts();document.querySelectorAll('.real-tool[aria-label],.bound-tools [aria-label]').forEach(el=>el.title=el.getAttribute('aria-label'));translateUI(document);createIcons({icons,attrs:{'stroke-width':1.5}});}
function reducedMotion(){return matchMedia('(prefers-reduced-motion: reduce)').matches;}
function updateProgress(){if(!current)return;const total=document.documentElement.scrollHeight-innerHeight;const pc=total>0?Math.min(100,scrollY/total*100):100;const el=$('#reading-progress');if(el)el.style.width=pc+'%';}
window.addEventListener('scroll',updateProgress,{passive:true});
function announce(text){$('#announcement').textContent=t(text);$('#announcement').classList.add('show');setTimeout(()=>$('#announcement').classList.remove('show'),2400);}

function renderRoute(){
  nextRender=Promise.resolve();renderToken++;readerController?.dispose();readerController=null;document.body.classList.remove('menu-open','continuous-reading');
  let showContents=false;
  let pathname=decodeURI(stripLanguage(location.pathname)).replace(/^\//,'');if(pathname==='magic.html'){history.replaceState({},'',languageURL('/introduction.html'+location.hash));pathname='introduction.html';}
  if(pathname==='contents.html'||pathname==='real/contents.html'){showContents=true;pathname=pathname.startsWith('real/')?'real/introduction.html':'introduction.html';history.replaceState({},'',languageURL('/'+pathname));}
  const real=pathname.startsWith('real/');
  const slug=real?(pathname.slice(5)||'introduction.html'):pathname;
  const page=pages.find(p=>p.slug===(slug==='index.html'&&real?'introduction.html':slug));
  activeRealm=real?'real':(!pathname||pathname==='index.html')?'gateway':'magic';
  if(page&&real){current=page;readerController=mountRealReader({app,page,pages,groups,icon,hydrateIcons,storage,announce,onNavigate:href=>navigate(href)});}
  else if(page)reader(page);
  else if(pathname==='atlas.html')atlas();
  else if(pathname==='contents.html')contents();
  else if(partRoutes.includes(pathname))part(partRoutes.indexOf(pathname));

  else if(activeRealm==='gateway'){current=null;document.body.className='gateway-view';app.innerHTML=gatewayMarkup({t,languagePicker});document.title=t('Choose your world')+' · ALUX Programming';}
  else{current=null;document.title=t('This page is uncharted.')+' · ALUX Programming';document.body.className='home-view';app.innerHTML=header()+'<main id="main" class="not-found"><span>404</span><h1>This page is uncharted.</h1><p>Find your way back to the book.</p><a class="button primary" href="/">Choose a world</a></main>';hydrateIcons();}
  if(page)document.title=(page.slug==='introduction.html'?t('Introduction'):page.title)+' · ALUX Programming';else if(activeRealm!=='gateway')document.title=t(document.title.split(' · ')[0])+' · ALUX Programming';translateUI(document);updateSiteMeta(language());updateBookmarkCounts();return nextRender.then(()=>{if(showContents)readerController?.openContents?.();});
}
function afterRoute(focus=false){if(location.hash){const id=decodeURIComponent(location.hash.slice(1));if(readerController)readerController.goToAnchor(id,false);else requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView());}else if(activeRealm==='real'&&readerController?.restorePosition)readerController.restorePosition();else window.scrollTo({top:0,behavior:'instant'});if(focus){const m=$('#main');m?.setAttribute('tabindex','-1');m?.focus({preventScroll:true});}}
let navigating=false;
async function navigate(url,opening=false){
  if(navigating)return;navigating=true;url=languageURL(url);
  try{
    const targetPath=stripLanguage(new URL(url,location.origin).pathname);const sameMagic=activeRealm==='magic'&&!targetPath.startsWith('/real/')&&targetPath!=='/'&&targetPath!=='/index.html';
    history.pushState({},'',url);
    if(!reducedMotion()&&sameMagic)await turnRoute(app,async()=>{await renderRoute();afterRoute(true)});
    else if(!reducedMotion()&&document.startViewTransition){document.documentElement.dataset.transition='world';await document.startViewTransition(async()=>{await renderRoute();afterRoute(true)}).finished;}
    else{await renderRoute();afterRoute(true);}
  }finally{delete document.documentElement.dataset.transition;navigating=false;}
}
document.addEventListener('click',e=>{if(e.defaultPrevented)return;const open=e.target.closest('[data-open-book]');const a=e.target.closest('a');if(open&&!a){e.preventDefault();navigate('/introduction.html',true);return;}if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||a.target==='_blank'||a.hasAttribute('download'))return;if(a.hasAttribute('data-realm-switch')){const section=readerController?.getCurrentAnchor?.();a.hash=section?'#'+section:location.hash;}const url=new URL(a.href,location.href);if(url.origin!==location.origin)return;if(url.pathname===location.pathname&&url.hash){e.preventDefault();history.pushState({},'',url.pathname+url.search+url.hash);if(readerController)readerController.goToAnchor(url.hash.slice(1));else document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView({behavior:reducedMotion()?'instant':'smooth'});return;}e.preventDefault();navigate(languageURL(url.pathname+url.search+url.hash),!!open);});
addEventListener('popstate',async()=>{history.replaceState({},'',languageURL(location.href));await renderRoute();afterRoute();});

const savedDialog=$('#bookmarks-dialog');let savedOrigin=null;
function updateBookmarkCounts(){document.querySelectorAll('[data-bookmark-count]').forEach(el=>el.textContent=String(bookmarks().length));}
function renderBookmarks(){const list=bookmarks().filter(item=>pages.some(p=>p.slug===item.slug));$('#bookmarks-list').innerHTML=list.length?list.map(item=>{const page=pages.find(p=>p.slug===item.slug);const href=languageURL('/'+(item.realm==='real'?'real/':'')+item.slug+(item.anchor&&!(item.realm==='magic'&&item.folio!==undefined)?'#'+encodeURIComponent(item.anchor):''));return `<div class="saved-chapter"><a href="${href}" data-resume-bookmark="${escape(item.slug)}"><small>${escape(page.group)} · ${t(item.realm==='real'?'Real world':'Magic world')}</small><strong>${escape(page.title)}</strong><span>${t('Continue reading')} ${icon('arrow-right')}</span></a><button class="icon-button" data-remove-bookmark="${escape(item.slug)}" aria-label="Remove bookmark">${icon('x')}</button></div>`}).join(''):`<div class="bookmarks-empty"><p>No bookmarks yet.</p><p>Save a chapter with the bookmark button to continue reading here.</p></div>`;hydrateIcons();}
function closeBookmarks(){savedDialog.close();savedOrigin?.focus();}
addEventListener('alux-bookmarks-changed',()=>{updateBookmarkCounts();if(savedDialog.open)renderBookmarks();});
document.addEventListener('click',e=>{if(e.target.closest('[data-bookmarks]')){savedOrigin=document.activeElement;renderBookmarks();savedDialog.showModal();savedDialog.querySelector('[data-close-bookmarks]').focus();}if(e.target.closest('[data-close-bookmarks]'))closeBookmarks();const remove=e.target.closest('[data-remove-bookmark]');if(remove){removeBookmark(remove.dataset.removeBookmark);savedDialog.querySelector('[data-remove-bookmark],[data-close-bookmarks]')?.focus();}const resume=e.target.closest('[data-resume-bookmark]');if(resume){const item=bookmarks().find(x=>x.slug===resume.dataset.resumeBookmark);if(item?.folio!==undefined)storage.set('alux-folio-'+item.slug,item.folio);if(item?.scroll!==undefined)storage.set('alux-real-scroll-'+item.slug,item.scroll);closeBookmarks();}});
savedDialog.addEventListener('click',e=>{if(e.target===savedDialog)closeBookmarks();});savedDialog.addEventListener('cancel',e=>{e.preventDefault();closeBookmarks();});

const dialog=$('#search-dialog');let searchOrigin=null;
function openSearch(){if(dialog.open||activeRealm==='gateway')return;searchOrigin=document.activeElement;dialog.showModal();$('#search-input').value='';searchResults('');$('#search-input').focus();}
function closeSearch(){dialog.close();searchOrigin?.focus();}
function searchResults(query){const q=query.toLowerCase().trim();const container=$('#search-results');if(!q){const bookmark=pages.find(p=>p.slug===bookmarks()[0]?.slug);container.innerHTML=`<p class="search-hint">Search every chapter, code example and idea.</p>${bookmark?`<div class="search-group-label">YOUR BOOKMARK</div>${resultItem(bookmark,'Continue reading',q)}`:''}<div class="search-group-label">START EXPLORING</div>${parts.map(g=>resultItem(pages.find(p=>p.slug===g.pages[0]),g.title,q)).join('')}`;}else{const terms=q.split(/\s+/);const hits=pages.map(p=>{const title=p.title.toLowerCase(),text=p.text.toLowerCase();return{p,score:terms.reduce((n,t)=>n+(title.includes(t)?15:0)+(text.includes(t)?1:0),0),matches:terms.every(t=>text.includes(t)||title.includes(t))};}).filter(x=>x.matches).sort((a,b)=>b.score-a.score);container.innerHTML=`<div class="search-group-label">${hits.length} ${hits.length===1?'RESULT':'RESULTS'}</div>`+(hits.length?hits.map(({p})=>{const at=p.text.toLowerCase().indexOf(terms[0]);return resultItem(p,(at>50?'…':'')+p.text.slice(Math.max(0,at-45),Math.max(0,at-45)+150)+'…',q)}).join(''):'<div class="no-results"><h3>No pages found.</h3><p>Try a concept such as “capability”, “Rust” or “meaning”.</p></div>');}hydrateIcons();container.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeSearch));}
function resultItem(p,snippet,q){return `<a class="search-result" href="/${activeRealm==='real'?'real/':''}${p.slug}"><span><small>${p.group}</small><strong>${escape(p.title)}</strong><p>${escape(snippet)}</p></span>${icon('arrow-right')}</a>`;}
document.addEventListener('click',e=>{if(e.target.closest('[data-search]'))openSearch();if(e.target.closest('[data-close-search]'))closeSearch();});$('#search-input').addEventListener('input',e=>searchResults(e.target.value));dialog.addEventListener('click',e=>{if(e.target===dialog)closeSearch();});dialog.addEventListener('cancel',e=>{e.preventDefault();closeSearch();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dialog.open){e.preventDefault();closeSearch();return;}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch();}if(e.key==='Escape'&&!dialog.open&&document.body.classList.contains('menu-open'))setMenu(false);if(e.key==='ArrowDown'&&dialog.open){e.preventDefault();const links=[...dialog.querySelectorAll('.search-result')];const i=links.indexOf(document.activeElement);links[(i+1)%links.length]?.focus();}if(e.key==='ArrowUp'&&dialog.open){e.preventDefault();const links=[...dialog.querySelectorAll('.search-result')];const i=links.indexOf(document.activeElement);links[(i-1+links.length)%links.length]?.focus();}});

// Redirect right-button hits on visual media to a neutral target; leave the native browser menu intact.
document.addEventListener('pointerdown',e=>{if(e.button!==2||!e.target.closest('img,video,canvas,.chapter-art'))return;const shield=document.createElement('div');Object.assign(shield.style,{position:'fixed',left:(e.clientX-5)+'px',top:(e.clientY-5)+'px',width:'12px',height:'12px',zIndex:'99999'});document.body.append(shield);setTimeout(()=>shield.remove(),1000);},true);
try{await languageReady;({groups,pages}=localizedBook(data));parts=groups.slice(0,4);history.replaceState({},'',languageURL(location.href));}catch{await setLanguage('en');}
await renderRoute();afterRoute();
async function changeLanguage(next){
  if(navigating)return;navigating=true;document.querySelectorAll('select[data-language]').forEach(el=>el.disabled=true);
  const old=language();try{await setLanguage(next);({groups,pages}=localizedBook(data));parts=groups.slice(0,4);rememberLanguage();history.replaceState({},'',languageURL(location.href));await renderRoute();afterRoute();}catch{await setLanguage(old);announce('This language is unavailable. Please try again.');document.querySelectorAll('select[data-language]').forEach(el=>el.value=old);}finally{navigating=false;document.querySelectorAll('select[data-language]').forEach(el=>el.disabled=false);}
}
document.addEventListener('change',e=>{if(e.target.matches('[data-language]'))changeLanguage(e.target.value)});
