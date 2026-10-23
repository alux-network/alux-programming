import {resolveAnchor} from './anchors.ts';
import {languagePicker,t} from './i18n.ts';
import {hasBookmark,toggleBookmark} from './bookmarks.ts';
import {PageFlip} from 'page-flip';
import {prepareChapterSource,paginateChapter} from './pagination.ts';
import {readingSize,readingScale,applyReadingSize} from './reading-preferences.ts';
import {query} from './dom.ts';
import {copyBookSurface,ownedBookSurface} from './reader-surface.ts';
import type {ReaderController, ReaderOptions, ReaderPage} from './book.ts';

interface BookReaderOptions extends ReaderOptions { worldLink?: string }
interface BookReaderController extends ReaderController {
  getState(): { total: number; folio: number; layoutKey: string; continuous: boolean; size: number };
}
const pageCountCache = new WeakMap<ReaderPage[], Map<string, number[]>>();
const decodedImages = new Map<string, Promise<void>>();
function bookImagesReady(pages: ReaderPage[]): Promise<void[]> {
  const sources=new Set(pages.flatMap(chapter=>[...chapter.html.matchAll(/<img[^>]+src="([^"]+)"/g)].map(match=>match[1])));
  return Promise.all([...sources].map(src=>{
    let ready=decodedImages.get(src);
    if(!ready){const image=new Image();image.src=src;ready=image.decode().catch(()=>{decodedImages.delete(src);});decodedImages.set(src,ready);}
    return ready;
  }));
}
const escape=(s: string): string=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] ?? c));

/** Paginated HTML on full-size physical sheets. Source blocks are moved, never rewritten. */
export async function mountBookReader({app,page,pages,sidebar,brand,worldLink='',icon,hydrateIcons,storage,announce,onNavigate}: BookReaderOptions): Promise<BookReaderController> {
  let flip: PageFlip | null=null,disposed=false,resizeTimer: ReturnType<typeof setTimeout> | undefined,folio=0,portraitBook=innerWidth<=1000;
  const rtl=()=>document.documentElement.dir==='rtl';
  const physicalIndex=(n: number): number=>rtl()?Math.max(0,total-(portraitBook?1:2)-(portraitBook?n:n-n%2)):n;
  const currentPage=(): number=>flip?(rtl()?Math.max(0,total-(portraitBook?1:2)-flip.getCurrentPageIndex()):flip.getCurrentPageIndex()):folio;
  let scale=readingScale(storage),size=readingSize(scale);
  const idx=pages.indexOf(page);
  document.body.className='reading-view bound-reading'+((storage.get('alux-reading-theme')==='dark'||(!storage.get('alux-reading-theme')&&storage.get('alux-night')==='true'))?' night':'');
  storage.set('alux-reading-theme',document.body.classList.contains('night')?'dark':'light');
  applyReadingSize(size);
  app.innerHTML=`${sidebar}<div class="sidebar-scrim" id="sidebar-scrim"></div><div class="bound-reader"><header class="bound-toolbar">${brand}<nav class="bound-world-nav" aria-label="Reading world">${worldLink}${languagePicker()}</nav><div class="bound-tools"><button class="contents-toggle" id="toggle-menu" aria-label="Open book navigation" aria-expanded="false">${icon('book-open')}<span>Contents</span></button><button class="icon-button" data-search aria-label="Search the book">${icon('search')}</button><button class="icon-button" id="smaller-text" aria-label="Decrease text size">A−</button><button class="icon-button" id="larger-text" aria-label="Increase text size">A+</button><button class="icon-button" id="toggle-night" aria-label="Toggle night reading">${icon(document.body.classList.contains('night')?'sun':'moon')}</button><button class="icon-button" id="bookmark" aria-label="Bookmark this chapter" aria-pressed="false">${icon('bookmark')}</button><button class="bound-mode" id="reading-mode" aria-pressed="false">Scroll view</button></div></header><main id="main" class="bound-stage"><div class="bound-volume"><div id="page-book" class="page-book" aria-label="${escape(page.title)}"></div><span class="binding-ribbon" aria-hidden="true"></span></div><div class="bound-controls"><button id="previous-sheet" class="sheet-control">${icon('arrow-left')}<span>Previous page</span></button><div><span class="current-chapter-title">${escape(page.title)}</span><span id="folio-position" aria-live="polite">Preparing the pages…</span></div><button id="next-sheet" class="sheet-control"><span>Next page</span>${icon('arrow-right')}</button></div></main></div>`;
  const volume=query<HTMLElement>('.bound-volume',app);
  const isCurrent=():boolean=>!disposed&&volume.isConnected;
  const source=prepareChapterSource(page);
  const originalHTML=source.innerHTML;
  const restoreEmbeds=(root: ParentNode): void=>root.querySelectorAll<HTMLIFrameElement>('iframe[data-embed-src]').forEach(frame=>{frame.src=frame.dataset.embedSrc ?? '';delete frame.dataset.embedSrc;});
  let continuous=storage.get('alux-reader-mode')==='scroll',total=0,layoutKey='',pageOffset=0,bookTotal=0,paginationRevision=0;
  let imagesReady:Promise<void[]>|null=null;
  const reduced=(): boolean=>matchMedia('(prefers-reduced-motion:reduce)').matches;
  function menuLabel(open: boolean): void {const button=query<HTMLButtonElement>('#toggle-menu',app),label=t(open?'Hide contents':'Show contents');query<HTMLSpanElement>('span',button).textContent=label;button.setAttribute('aria-label',label);button.title=label;}
  function menu(open: boolean): void {menuLabel(open);if(innerWidth>=1280){document.body.classList.toggle('contents-collapsed',!open);query<HTMLButtonElement>('#toggle-menu',app).setAttribute('aria-expanded',String(open));resized();return;}document.body.classList.toggle('menu-open',open);query<HTMLButtonElement>('#toggle-menu',app).setAttribute('aria-expanded',String(open));if(open)app.querySelector<HTMLElement>('.book-sidebar .active')?.focus();else query<HTMLButtonElement>('#toggle-menu',app).focus();}
  function openContents(){onNavigate('/contents.html');}
  query<HTMLButtonElement>('#toggle-menu',app).setAttribute('aria-expanded',String(innerWidth>=1280&&!document.body.classList.contains('contents-collapsed')));
  menuLabel(innerWidth>=1280&&!document.body.classList.contains('contents-collapsed'));
  query<HTMLButtonElement>('#toggle-menu',app).onclick=()=>menu(innerWidth>=1280?document.body.classList.contains('contents-collapsed'):!document.body.classList.contains('menu-open'));
  query<HTMLElement>('#sidebar-scrim',app).onclick=()=>menu(false);
  const nightButton=query<HTMLButtonElement>('#toggle-night',app);
  nightButton.onclick=()=>{document.body.classList.toggle('night');storage.set('alux-night',document.body.classList.contains('night'));storage.set('alux-reading-theme',document.body.classList.contains('night')?'dark':'light');nightButton.innerHTML=icon(document.body.classList.contains('night')?'sun':'moon');hydrateIcons();};
  const bookmarkButton=query<HTMLButtonElement>('#bookmark',app);
  const bookmark=()=>bookmarkButton.setAttribute('aria-pressed',String(hasBookmark(page.slug)));bookmark();addEventListener('alux-bookmarks-changed',bookmark);bookmarkButton.onclick=()=>{const added=toggleBookmark({slug:page.slug,realm:'magic',anchor:getCurrentAnchor()||'',folio:currentPage()});announce(added?'Chapter bookmarked':'Bookmark removed',bookmarkButton);};
  function footer(){
    if(!isCurrent())return;
    const p=currentPage();folio=p;
    const position=query<HTMLElement>('#folio-position',app);
    position.dir=continuous?'auto':'ltr';
    position.textContent=continuous?t('Continuous reading'):`${pageOffset+p+1}${innerWidth>1000&&p+1<total?'–'+(pageOffset+Math.min(p+2,total)):''} / ${bookTotal}`;
    storage.set('alux-folio-'+page.slug,p);storage.set('alux-last-chapter',page.slug);
    const prev=query<HTMLButtonElement>('#previous-sheet',app),next=query<HTMLButtonElement>('#next-sheet',app);
    prev.disabled=p===0&&idx===0;
    next.disabled=false;
    query<HTMLSpanElement>('span',prev).textContent=p===0?t('Previous chapter'):t('Previous page');
    const last=p+(innerWidth>1000?2:1)>=total;
    query<HTMLSpanElement>('span',next).textContent=last?(idx+1<pages.length?t('Next chapter'):t('Back to contents')):t('Next page');
  }
  function sheetLayout(){
    const surface=getComputedStyle(volume);
    const available=Math.max(240,volume.clientWidth-parseFloat(surface.paddingLeft)-parseFloat(surface.paddingRight));
    const portrait=innerWidth<=1000;
    const w=Math.floor(portrait?available:available/2);
    const h=Math.max(430,volume.clientHeight-parseFloat(surface.paddingTop)-parseFloat(surface.paddingBottom));
    volume.style.setProperty('--sheet-w',w+'px');volume.style.setProperty('--sheet-h',h+'px');
    return {w,h,portrait};
  }
  function initialPages(keep:number):HTMLElement[]|undefined {
    const target=ownedBookSurface(volume);if(!target)return;
    const {w,h,portrait}=sheetLayout();
    const sheets=paginateChapter({page,pages,icon,host:volume,w,h,portrait});
    const start=Math.max(0,Math.min(keep,sheets.length-1));
    const first=portrait?start:start-start%2;
    target.replaceChildren();folio=first;
    target.classList.add('reader-preview');target.setAttribute('aria-busy','true');
    target.style.width=(portrait?w:2*w)+'px';target.style.height=h+'px';
    for(const sheet of sheets.slice(first,first+(portrait?1:2))){const local=Number(sheet.dataset.folio);sheet.classList.toggle('folio-verso',!portrait&&(rtl()?local%2===1:local%2===0));target.append(sheet);}
    query<HTMLButtonElement>('#previous-sheet',app).disabled=true;query<HTMLButtonElement>('#next-sheet',app).disabled=true;
    return sheets;
  }
  function clearBook():HTMLElement|null {
    if(flip){flip.destroy();flip=null;}
    const target=ownedBookSurface(volume);
    if(target){target.innerHTML='';target.classList.remove('reader-preview');target.removeAttribute('aria-busy');}
    return target;
  }
  async function paginate(keep=0){
    if(!isCurrent())return;
    const revision=++paginationRevision;
    applyReadingSize(size);
    document.body.classList.toggle('continuous-reading',continuous);
    if(continuous){const target=clearBook();if(!target)return;target.innerHTML=`<article class="prose continuous-prose">${originalHTML}</article>`;restoreEmbeds(target);total=1;footer();hydrateIcons();return;}
    const readyImages=imagesReady??=bookImagesReady(pages);
    const previewSheets=!flip?initialPages(keep):undefined;
    // Keep the current paper visible while fonts, images and new page counts prepare.
    const {w,h,portrait}=sheetLayout();
    layoutKey=`${w}/${h}/${size}`;
    const cacheKey=`${document.documentElement.lang}/${layoutKey}/${portrait}`;
    let layouts=pageCountCache.get(pages);
    if(!layouts){layouts=new Map();pageCountCache.set(pages,layouts);}
    // A cached layout already has settled fonts/images; its preview is the final pagination.
    let counts=layouts.get(cacheKey),sheets=counts?previewSheets:undefined;
    if(!counts){
      // Math and language subsets may not have appeared in the opening chapter.
      // Load every used font before measuring any chapter, so offsets remain exact.
      const fontProbe=document.createElement('div');fontProbe.className='folio-measure';fontProbe.style.width=w+'px';fontProbe.style.height=h+'px';
      const fontPage=document.createElement('section');fontPage.className='folio-page';
      const fontContent=document.createElement('article');fontContent.className='folio-content prose';
      for(const chapter of pages){const prepared=prepareChapterSource(chapter);prepared.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));fontContent.append(...prepared.childNodes);}
      fontPage.append(fontContent);fontProbe.append(fontPage);volume.append(fontProbe);
      fontContent.getBoundingClientRect();await Promise.all([document.fonts.ready,readyImages]);fontProbe.remove();
      if(!isCurrent()||revision!==paginationRevision)return;
      counts=[];
      for(const chapter of pages){
        const measured=paginateChapter({page:chapter,pages,icon,host:volume,w,h,portrait});
        counts.push(measured.length);
        if(chapter===page)sheets=measured;
        await new Promise(resolve=>setTimeout(resolve,0));
        if(!isCurrent()||revision!==paginationRevision)return;
      }
      layouts.set(cacheKey,counts);
    }
    sheets??=paginateChapter({page,pages,icon,host:volume,w,h,portrait});
    const previous=ownedBookSurface(volume);
    const backdrop=previous?.textContent?.trim()?copyBookSurface(previous):null;
    if(backdrop&&previous){const r=previous.getBoundingClientRect(),v=volume.getBoundingClientRect();Object.assign(backdrop.style,{position:'absolute',left:`${r.left-v.left-volume.clientLeft}px`,top:`${r.top-v.top-volume.clientTop}px`,width:`${r.width}px`,height:`${r.height}px`,pointerEvents:'none',zIndex:'4'});volume.append(backdrop);}
    const keepPage=flip?currentPage():keep;
    const target=clearBook();if(!target){backdrop?.remove();return;}
    portraitBook=portrait;
    target.style.width=(portrait?w:2*w)+'px';target.style.height=h+'px';
    pageOffset=counts.slice(0,idx).reduce((sum,n)=>sum+n,0);
    bookTotal=counts.reduce((sum,n)=>sum+n,0);
    target.dataset.pageOffset=String(pageOffset);target.dataset.bookPages=String(bookTotal);
    for(const sheet of sheets){
      const local=Number(sheet.dataset.folio);
      sheet.classList.toggle('folio-verso',!portrait&&(rtl()?local%2===1:local%2===0));
      const number=query<HTMLSpanElement>('.folio-footer>span:last-child',sheet);
      number.textContent=String(pageOffset+local+1);number.dir='ltr';
      restoreEmbeds(sheet);
    }
    if(rtl())sheets.reverse();sheets.forEach(s=>target.append(s));total=sheets.length;
    flip=new PageFlip(target,{width:w,height:h,size:'fixed',minWidth:w,maxWidth:w,minHeight:h,maxHeight:h,autoSize:false,drawShadow:true,flippingTime:560,maxShadowOpacity:document.body.classList.contains('night')?.55:.2,usePortrait:portrait,showCover:false,startPage:physicalIndex(Math.max(0,Math.min(keepPage,total-1))),clickEventForward:true,useMouseEvents:false,disableFlipByClick:false,mobileScrollSupport:false,showPageCorners:false});
    flip.on('flip',footer);
    flip.on('changeState',event=>target.classList.toggle('paper-turning',event.data==='flipping'));
    flip.loadFromHTML(sheets);
    // These are interior paper leaves, including an unpaired final sheet.
    for(let i=0;i<sheets.length;i++){flip.getPage(i).setDensity('soft');flip.getPage(i).setDrawingDensity('soft');}
    requestAnimationFrame(()=>{backdrop?.remove();if(!isCurrent()||revision!==paginationRevision)return;footer();hydrateIcons();if(location.hash)goToAnchor(location.hash.slice(1),false);});
  }
  function turn(direction: number): void {
    if(!isCurrent()||continuous||!flip)return;
    const p=currentPage();
    const last=p+(innerWidth>1000?2:1)>=total;
    if(direction>0&&last){if(idx+1<pages.length)onNavigate('/'+pages[idx+1].slug);else openContents();return;}
    if(direction<0&&p===0){if(idx>0)onNavigate('/'+pages[idx-1].slug);return;}
    const physicalDirection=rtl()?-direction:direction;if(reduced()){physicalDirection>0?flip.turnToNextPage():flip.turnToPrevPage();}else physicalDirection>0?flip.flipNext('bottom'):flip.flipPrev('bottom');
  }
  query<HTMLButtonElement>('#previous-sheet',app).onclick=()=>turn(-1);query<HTMLButtonElement>('#next-sheet',app).onclick=()=>turn(1);
  const sizeActions: readonly [string, number][]=[['smaller-text',-1],['larger-text',1]];
  for(const [id,delta] of sizeActions)query<HTMLButtonElement>('#'+id,app).onclick=()=>{scale=Math.max(-4,Math.min(4,scale+delta));size=readingSize(scale);storage.set('alux-reading-scale',scale);paginate(folio);announce(`Reading size ${size} pixels`);};
  const modeButton=query<HTMLButtonElement>('#reading-mode',app);
  const modeLabel=()=>{modeButton.innerHTML=icon(continuous?'book-open':'scroll-text')+`<span>${t(continuous?'Book view':'Scroll view')}</span>`;modeButton.setAttribute('aria-pressed',String(continuous));hydrateIcons();};modeLabel();
  modeButton.onclick=()=>{continuous=!continuous;storage.set('alux-reader-mode',continuous?'scroll':'book');modeLabel();paginate(folio);};
  function goToAnchor(id: string,animate=true): void {if(!isCurrent()||!id)return;const el=volume.querySelector<HTMLElement>('#'+CSS.escape(resolveAnchor(page,id)));if(!el)return;if(continuous){el.scrollIntoView({behavior:'smooth'});return;}const s=el.closest<HTMLElement>('.folio-page');if(s&&flip){const n=Number(s.dataset.folio);if(animate&&!reduced())flip.flip(physicalIndex(n),'bottom');else flip.turnToPage(physicalIndex(n));el.closest<HTMLElement>('.folio-overflow')?.scrollTo({top:Math.max(0,el.offsetTop-20)});}}
  const onHash=()=>goToAnchor(location.hash.slice(1));addEventListener('hashchange',onHash);
  const key=(e: KeyboardEvent)=>{if(!isCurrent()||document.querySelector('dialog[open]')||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||!(e.target instanceof Element)||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.key==='Escape'&&document.body.classList.contains('menu-open')){menu(false);return;}if(document.body.classList.contains('menu-open'))return;if(e.key==='ArrowRight'){e.preventDefault();turn(rtl()?-1:1)}if(e.key==='ArrowLeft'){e.preventDefault();turn(rtl()?1:-1)}};addEventListener('keydown',key);
  let down: {x:number;y:number;type:string} | null=null,lastSwipe=0;
  volume.addEventListener('pointerdown',(e: PointerEvent)=>{down={x:e.clientX,y:e.clientY,type:e.pointerType};});
  volume.addEventListener('pointerup',(e: PointerEvent)=>{const target=e.target instanceof Element?e.target:null;if(down?.type==='touch'&&!target?.closest('a,button,input,pre,code,.folio-overflow,.table-scroll')&&Math.abs(e.clientX-down.x)>65&&Math.abs(e.clientY-down.y)<60){turn((e.clientX<down.x?1:-1)*(document.dir==='rtl'?-1:1));lastSwipe=Date.now();}});
  function blankClick(e: MouseEvent): void {
    const target=e.target instanceof Element?e.target:null;
    if(continuous||!flip||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||Date.now()-lastSwipe<600||target?.closest('a,button,input,select,summary,details,pre,code,table,.folio-overflow,.table-scroll')||!getSelection()?.isCollapsed)return;
    if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>8)return;
    if(!target?.closest('.folio-page,.page-book,.stf__wrapper'))return;
    const caret=document.caretRangeFromPoint?.(e.clientX,e.clientY);
    if(caret?.startContainer.nodeType===Node.TEXT_NODE){const text=caret.startContainer as Text;const value=text.textContent??'';const offset=caret.startOffset;for(const at of [offset-1,offset]){if(at<0||at>=text.length||!value[at]?.trim())continue;const r=document.createRange();r.setStart(text,at);r.setEnd(text,at+1);if([...r.getClientRects()].some(b=>e.clientX>=b.left-2&&e.clientX<=b.right+2&&e.clientY>=b.top&&e.clientY<=b.bottom))return;}}
    const rect=volume.getBoundingClientRect();turn((e.clientX<rect.left+rect.width/2?-1:1)*(document.dir==='rtl'?-1:1));
  }
  volume.addEventListener('click',blankClick);
  const contentsClick=(e: MouseEvent): void=>{if(e.target instanceof Element&&e.target.closest('[data-open-contents]')){e.preventDefault();openContents();}};
  app.addEventListener('click',contentsClick);
  app.addEventListener('click',copyCode);
  const detailsToggle=(e: Event): void=>{const detail=e.target;if(continuous||!(detail instanceof HTMLDetailsElement)||!detail.closest('.folio-content')||!detail.open)return;const body=detail.closest<HTMLElement>('.folio-content');if(!body)return;const remaining=body.getBoundingClientRect().bottom-detail.getBoundingClientRect().top-8;detail.style.maxHeight=Math.max(56,remaining)+'px';detail.style.overflowY='auto';detail.style.scrollbarWidth='thin';};
  app.addEventListener('toggle',detailsToggle,true);
  async function copyCode(e: MouseEvent): Promise<void>{const target=e.target instanceof Element?e.target:null;const button=target?.closest<HTMLElement>('.copy-code');if(!button)return;try{const code=query<HTMLElement>('code',query<HTMLElement>('.code-block',button));await navigator.clipboard.writeText(code.textContent??'');button.textContent=t('Copied');setTimeout(()=>button.textContent=t('Copy code'),1800)}catch{button.textContent=t('Select code to copy');}}
  function resized(): void {clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(isCurrent())paginate(folio)},250)}addEventListener('resize',resized);
  const savedFolio=Number(storage.get('alux-folio-'+page.slug)||0);
  if(isCurrent())await paginate(savedFolio);
  function getCurrentAnchor(): string | undefined {const headings=[...app.querySelectorAll<HTMLElement>('#page-book h1[id],#page-book h2[id],#page-book h3[id],#page-book h4[id]')];if(continuous)return(headings.filter(h=>h.getBoundingClientRect().top<170).at(-1)||headings[0])?.id;headings.sort((a,b)=>Number(a.closest<HTMLElement>('.folio-page')?.dataset.folio||0)-Number(b.closest<HTMLElement>('.folio-page')?.dataset.folio||0));const current=currentPage();return(headings.filter(h=>Number(h.closest<HTMLElement>('.folio-page')?.dataset.folio)<=current).at(-1)||headings[0])?.id}
  return {goToAnchor,getCurrentAnchor,openContents,dispose(){disposed=true;paginationRevision++;clearTimeout(resizeTimer);removeEventListener('resize',resized);removeEventListener('keydown',key);removeEventListener('hashchange',onHash);app.removeEventListener('click',copyCode);app.removeEventListener('click',contentsClick);volume.removeEventListener('click',blankClick);removeEventListener('alux-bookmarks-changed',bookmark);app.removeEventListener('toggle',detailsToggle,true);flip?.destroy();flip=null;},getState(){return{total,folio,layoutKey,continuous,size}}};
}
