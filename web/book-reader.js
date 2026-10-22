import {languagePicker,t} from './i18n.js';
import {hasBookmark,toggleBookmark} from './bookmarks.js';
import {PageFlip} from 'page-flip';
import {readingSize,readingScale,applyReadingSize} from './reading-preferences.js';

const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/** Paginated HTML on full-size physical sheets. Source blocks are moved, never rewritten. */
export async function mountBookReader({app,page,pages,sidebar,brand,worldLink='',icon,hydrateIcons,storage,announce,onNavigate}){
  let flip=null,disposed=false,resizeTimer,folio=0,portraitBook=innerWidth<=1000;
  const rtl=()=>document.documentElement.dir==='rtl';
  const physicalIndex=n=>rtl()?Math.max(0,total-(portraitBook?1:2)-(portraitBook?n:n-n%2)):n;
  const currentPage=()=>flip?(rtl()?Math.max(0,total-(portraitBook?1:2)-flip.getCurrentPageIndex()):flip.getCurrentPageIndex()):folio;
  let scale=readingScale(storage),size=readingSize(scale);
  const idx=pages.indexOf(page);
  document.body.className='reading-view bound-reading'+((storage.get('alux-reading-theme')==='dark'||(!storage.get('alux-reading-theme')&&storage.get('alux-night')==='true'))?' night':'');
  storage.set('alux-reading-theme',document.body.classList.contains('night')?'dark':'light');
  applyReadingSize(size);
  app.innerHTML=`${sidebar}<div class="sidebar-scrim" id="sidebar-scrim"></div><div class="bound-reader"><header class="bound-toolbar">${brand}<nav class="bound-world-nav" aria-label="Reading world">${worldLink}${languagePicker()}</nav><div class="bound-tools"><button class="contents-toggle" id="toggle-menu" aria-label="Open book navigation" aria-expanded="false">${icon('book-open')}<span>Contents</span></button><button class="icon-button" data-search aria-label="Search the book">${icon('search')}</button><button class="icon-button" id="smaller-text" aria-label="Decrease text size">A−</button><button class="icon-button" id="larger-text" aria-label="Increase text size">A+</button><button class="icon-button" id="toggle-night" aria-label="Toggle night reading">${icon(document.body.classList.contains('night')?'sun':'moon')}</button><button class="icon-button" id="bookmark" aria-label="Bookmark this chapter" aria-pressed="false">${icon('bookmark')}</button><button class="bound-mode" id="reading-mode" aria-pressed="false">Scroll view</button></div></header><main id="main" class="bound-stage"><div class="bound-volume"><div id="page-book" class="page-book" aria-label="${escape(page.title)}"></div><span class="binding-ribbon" aria-hidden="true"></span></div><div class="bound-controls"><button id="previous-sheet" class="sheet-control">${icon('arrow-left')}<span>Previous page</span></button><div><span class="current-chapter-title">${escape(page.title)}</span><span id="folio-position" aria-live="polite">Preparing the pages…</span></div><button id="next-sheet" class="sheet-control"><span>Next page</span>${icon('arrow-right')}</button></div></main><div class="bound-outline"><details><summary>In this chapter ${icon('chevron-right')}</summary><nav>${page.headings.filter(h=>h.level>1&&h.level<4).map(h=>`<a href="#${h.id}">${h.text}</a>`).join('')}</nav></details><a href="https://github.com/alux-network/alux-programming/blob/master/src/${page.source}" target="_blank" rel="noopener noreferrer">Original source ${icon('arrow-up-right')}</a></div></div>`;
  const book=app.querySelector('#page-book');
  const volume=app.querySelector('.bound-volume');
  const source=document.createElement('div');source.innerHTML=page.html;
  if(page.slug==='introduction.html')source.querySelector('.admonition.warning')?.remove();
  source.querySelectorAll('table').forEach(table=>{const wrap=document.createElement('div');wrap.className='table-scroll';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Scrollable table');table.before(wrap);wrap.append(table);});
  // The original decorative title icon is superseded by the generated masthead.
  // Keep the source title and all technical images unchanged.
  source.querySelectorAll('h1 img').forEach(img=>img.remove());
  source.querySelectorAll('img[src$="design-by-meaning-rust.png"]').forEach(img=>img.src='/art/capability-crab.webp');
  const originalHTML=source.innerHTML;
  let continuous=storage.get('alux-reader-mode')==='scroll',total=0,layoutKey='';
  const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
  function menuLabel(open){const button=app.querySelector('#toggle-menu'),label=t(open?'Hide contents':'Show contents');button.querySelector('span').textContent=label;button.setAttribute('aria-label',label);button.title=label;}
  function menu(open){menuLabel(open);if(innerWidth>=1280){document.body.classList.toggle('contents-collapsed',!open);app.querySelector('#toggle-menu').setAttribute('aria-expanded',String(open));resized();return;}document.body.classList.toggle('menu-open',open);app.querySelector('#toggle-menu').setAttribute('aria-expanded',String(open));if(open)app.querySelector('.book-sidebar .active')?.focus();else app.querySelector('#toggle-menu').focus();}
  app.querySelector('#toggle-menu').setAttribute('aria-expanded',String(innerWidth>=1280&&!document.body.classList.contains('contents-collapsed')));
  menuLabel(innerWidth>=1280&&!document.body.classList.contains('contents-collapsed'));
  app.querySelector('#toggle-menu').onclick=()=>menu(innerWidth>=1280?document.body.classList.contains('contents-collapsed'):!document.body.classList.contains('menu-open'));
  app.querySelector('#sidebar-scrim').onclick=()=>menu(false);
  app.querySelector('#toggle-night').onclick=()=>{document.body.classList.toggle('night');storage.set('alux-night',document.body.classList.contains('night'));storage.set('alux-reading-theme',document.body.classList.contains('night')?'dark':'light');app.querySelector('#toggle-night').innerHTML=icon(document.body.classList.contains('night')?'sun':'moon');hydrateIcons();};
  const bookmark=()=>app.querySelector('#bookmark')?.setAttribute('aria-pressed',String(hasBookmark(page.slug)));bookmark();addEventListener('alux-bookmarks-changed',bookmark);app.querySelector('#bookmark').onclick=()=>{const added=toggleBookmark({slug:page.slug,realm:'magic',anchor:getCurrentAnchor()||'',folio:currentPage()});announce(added?'Chapter bookmarked':'Bookmark removed',app.querySelector('#bookmark'));};
  function footer(){
    const p=currentPage();folio=p;
    app.querySelector('#folio-position').textContent=continuous?t('Continuous reading'):`${String(p+1).padStart(2,'0')}${innerWidth>1000&&p+1<total?'–'+String(Math.min(p+2,total)).padStart(2,'0'):''} / ${String(total).padStart(2,'0')}`;
    storage.set('alux-folio-'+page.slug,p);storage.set('alux-last-chapter',page.slug);
    const prev=app.querySelector('#previous-sheet'),next=app.querySelector('#next-sheet');
    prev.disabled=p===0&&idx===0;
    prev.querySelector('span').textContent=p===0?t('Previous chapter'):t('Previous page');
    const last=p+(innerWidth>1000?2:1)>=total;
    next.querySelector('span').textContent=last?(idx+1<pages.length?t('Next chapter'):t('Back to contents')):t('Next page');
  }
  function pageElement(number){
    const sheet=document.createElement('section');sheet.className='folio-page';sheet.dataset.density='soft';sheet.dataset.folio=number;
    sheet.innerHTML=`<header class="folio-running-head"><span>${escape(page.group)}</span><span>ALUX PROGRAMMING</span></header><article class="folio-content prose"></article><footer class="folio-footer"><span>✦</span><span>${String(number+1).padStart(2,'0')}</span></footer>`;
    return sheet;
  }
  async function paginate(keep=0){
    if(disposed)return;
    applyReadingSize(size);
    document.body.classList.toggle('continuous-reading',continuous);
    // Dispose the library's owned subtree before installing a new book element.
    if(flip){flip.destroy();flip=null;}
    let target=app.querySelector('#page-book');
    if(!target){target=document.createElement('div');target.id='page-book';target.className='page-book';volume.prepend(target);}
    target.innerHTML='';
    if(continuous){target.innerHTML=`<article class="prose continuous-prose">${originalHTML}</article>`;total=1;footer();hydrateIcons();return;}
    const surface=getComputedStyle(volume);
    const available=Math.max(240,volume.clientWidth-parseFloat(surface.paddingLeft)-parseFloat(surface.paddingRight));
    const portrait=innerWidth<=1000;portraitBook=portrait;
    const w=Math.floor(portrait?available:available/2);
    const h=Math.max(430,volume.clientHeight-parseFloat(surface.paddingTop)-parseFloat(surface.paddingBottom));
    target.style.width=(portrait?w:2*w)+'px';target.style.height=h+'px';
    volume.style.setProperty('--sheet-w',w+'px');volume.style.setProperty('--sheet-h',h+'px');
    layoutKey=`${w}/${h}/${size}`;
    const measure=document.createElement('div');measure.className='folio-measure';measure.style.width=w+'px';measure.style.height=h+'px';
    volume.append(measure);
    let sheet=pageElement(0);measure.append(sheet);let body=sheet.querySelector('.folio-content');
    const sheets=[sheet];
    function next(){sheet=pageElement(sheets.length);sheets.push(sheet);measure.replaceChildren(sheet);body=sheet.querySelector('.folio-content');}
    function fits(){return body.scrollHeight<=body.clientHeight+1;}
    const parsed=document.createElement('div');parsed.innerHTML=originalHTML;
    const blocks=[...parsed.children];const units=[];
    for(let n=0;n<blocks.length;n++){
      const node=blocks[n],nextNode=blocks[n+1];
      const keepWithNext=nextNode&&((/^H[1-4]$/.test(node.tagName)&&!nextNode.matches('.admonition,.table-scroll'))||(node.tagName==='P'&&/:\s*$/.test(node.textContent)&&/^(UL|OL|DIV)$/.test(nextNode.tagName)));
      if(keepWithNext){const group=document.createElement('div');group.className='folio-group';group.append(node,nextNode);n++;if(nextNode.tagName==='P'&&/:\s*$/.test(nextNode.textContent)&&blocks[n+1]&&/^(UL|OL)$/.test(blocks[n+1].tagName)){group.append(blocks[++n]);}units.push(group);}else units.push(node);
    }
    for(const node of units){
      // Prose notes may continue on a new sheet at paragraph boundaries.
      if(node.matches('.admonition')&&node.children.length>2){
        const children=[...node.children];let fragment=node.cloneNode(false);body.append(fragment);
        for(const child of children){
          fragment.append(child);
          if(!fits()){
            child.remove();if(!fragment.childElementCount)fragment.remove();
            next();fragment=node.cloneNode(false);fragment.classList.add('admonition-continuation');body.append(fragment);fragment.append(child);
            if(!fits()){const region=document.createElement('div');region.className='folio-overflow';region.tabIndex=0;region.setAttribute('role','region');region.setAttribute('aria-label','Scrollable technical content');region.style.maxHeight=body.clientHeight+'px';fragment.before(region);region.append(fragment);}
          }
        }
        continue;
      }
      // Tables continue between complete rows instead of leaving half a spread
      // empty or making the reader scroll an entire table inside one page.
      const table=node.matches('.table-scroll')?node.querySelector('table'):null;
      if(table&&table.tBodies[0]?.rows.length>1){
        const rows=[...table.tBodies[0].rows];let fragment,tbody,continuation=false;
        const fragmentTable=()=>{fragment=node.cloneNode(false);const t=table.cloneNode(false);for(const child of table.children)if(child.tagName!=='TBODY'){const copy=child.cloneNode(true);if(continuation)copy.dataset.repeatedTableHeader='true';t.append(copy);}tbody=document.createElement('tbody');t.append(tbody);fragment.append(t);body.append(fragment);};
        fragmentTable();
        for(const row of rows){tbody.append(row);if(!fits()){row.remove();if(!tbody.rows.length)fragment.remove();else continuation=true;next();fragmentTable();tbody.append(row);if(!fits()){fragment.classList.add('folio-overflow');fragment.style.maxHeight=body.clientHeight+'px';}}}
        continue;
      }
      body.append(node);
      if(!fits()){
        node.remove();
        if(body.childElementCount)next();
        body.append(node);
        if(!fits()){
          // A long code example, table or note remains intact and fully reachable in its own scroll region.
          const region=document.createElement('div');region.className='folio-overflow';region.tabIndex=0;region.setAttribute('role','region');region.setAttribute('aria-label','Scrollable technical content');
          region.style.maxHeight=body.clientHeight+'px';node.before(region);region.append(node);
        }
      }
    }
    const end=document.createElement('nav');end.className='folio-chapter-end';end.innerHTML=`<span>✦</span><p>Continue the journey</p>${idx+1<pages.length?`<a href="/${pages[idx+1].slug}">${escape(pages[idx+1].title)} ${icon('arrow-right')}</a>`:'<a href="#" data-open-contents>Return to the table of contents</a>'}`;
    body.append(end);if(!fits()){end.remove();next();body.append(end);}
    if(!portrait&&sheets.length%2){next();body.innerHTML=`<div class="folio-closing"><span>✦</span><p>First the meaning.<br><em>Then the machinery.</em></p><a href="#" data-open-contents>Explore another chapter ${icon('arrow-right')}</a></div>`;}
    measure.remove();
    if(rtl())sheets.reverse();sheets.forEach(s=>target.append(s));total=sheets.length;
    flip=new PageFlip(target,{width:w,height:h,size:'fixed',minWidth:w,maxWidth:w,minHeight:h,maxHeight:h,autoSize:false,drawShadow:true,flippingTime:560,maxShadowOpacity:.2,usePortrait:portrait,showCover:false,startPage:physicalIndex(Math.max(0,Math.min(keep,total-1))),clickEventForward:true,useMouseEvents:false,disableFlipByClick:false,mobileScrollSupport:false,showPageCorners:false});
    flip.on('flip',footer);
    flip.loadFromHTML(sheets);
    // These are interior paper leaves, including an unpaired final sheet.
    for(let i=0;i<sheets.length;i++){flip.getPage(i).setDensity('soft');flip.getPage(i).setDrawingDensity('soft');}
    requestAnimationFrame(()=>{if(disposed)return;footer();hydrateIcons();if(location.hash)goToAnchor(location.hash.slice(1),false);});
  }
  function turn(direction){
    if(continuous||!flip)return;
    const p=currentPage();
    const last=p+(innerWidth>1000?2:1)>=total;
    if(direction>0&&last){if(idx+1<pages.length)onNavigate('/'+pages[idx+1].slug);else menu(true);return;}
    if(direction<0&&p===0){if(idx>0)onNavigate('/'+pages[idx-1].slug);return;}
    const physicalDirection=rtl()?-direction:direction;if(reduced()){physicalDirection>0?flip.turnToNextPage():flip.turnToPrevPage();}else physicalDirection>0?flip.flipNext('bottom'):flip.flipPrev('bottom');
  }
  app.querySelector('#previous-sheet').onclick=()=>turn(-1);app.querySelector('#next-sheet').onclick=()=>turn(1);
  for(const [id,delta]of [['smaller-text',-1],['larger-text',1]])app.querySelector('#'+id).onclick=()=>{scale=Math.max(-4,Math.min(4,scale+delta));size=readingSize(scale);storage.set('alux-reading-scale',scale);paginate(folio);announce(`Reading size ${size} pixels`);};
  const modeButton=app.querySelector('#reading-mode');
  const modeLabel=()=>{modeButton.innerHTML=icon(continuous?'book-open':'scroll-text')+`<span>${t(continuous?'Book view':'Scroll view')}</span>`;modeButton.setAttribute('aria-pressed',String(continuous));hydrateIcons();};modeLabel();
  modeButton.onclick=()=>{continuous=!continuous;storage.set('alux-reader-mode',continuous?'scroll':'book');modeLabel();paginate(folio);};
  app.querySelectorAll('.bound-outline nav a').forEach(a=>a.addEventListener('click',()=>{app.querySelector('.bound-outline details').open=false;}));
  function goToAnchor(id,animate=true){const el=app.querySelector('#'+CSS.escape(decodeURIComponent(id)));if(!el)return;if(continuous){el.scrollIntoView({behavior:'smooth'});return;}const s=el.closest('.folio-page');if(s){const n=Number(s.dataset.folio);if(animate&&!reduced())flip.flip(physicalIndex(n),'bottom');else flip.turnToPage(physicalIndex(n));el.closest('.folio-overflow')?.scrollTo({top:Math.max(0,el.offsetTop-20)});}}
  const onHash=()=>goToAnchor(location.hash.slice(1));addEventListener('hashchange',onHash);
  const key=e=>{if(document.querySelector('dialog[open]')||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.key==='Escape'&&document.body.classList.contains('menu-open')){menu(false);return;}if(document.body.classList.contains('menu-open'))return;if(e.key==='ArrowRight'){e.preventDefault();turn(rtl()?-1:1)}if(e.key==='ArrowLeft'){e.preventDefault();turn(rtl()?1:-1)}};addEventListener('keydown',key);
  let down=null,lastSwipe=0;
  volume.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,type:e.pointerType};});
  volume.addEventListener('pointerup',e=>{if(down?.type==='touch'&&!e.target.closest('a,button,input,pre,code,.folio-overflow,.table-scroll')&&Math.abs(e.clientX-down.x)>65&&Math.abs(e.clientY-down.y)<60){turn((e.clientX<down.x?1:-1)*(document.dir==='rtl'?-1:1));lastSwipe=Date.now();}});
  function blankClick(e){
    if(continuous||!flip||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||Date.now()-lastSwipe<600||e.target.closest('a,button,input,select,summary,details,pre,code,table,.folio-overflow,.table-scroll')||!getSelection()?.isCollapsed)return;
    if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>8)return;
    if(!e.target.closest('.folio-page,.page-book,.stf__wrapper'))return;
    const caret=document.caretRangeFromPoint?.(e.clientX,e.clientY);
    if(caret?.startContainer.nodeType===Node.TEXT_NODE){const text=caret.startContainer;const offset=caret.startOffset;for(const at of [offset-1,offset]){if(at<0||at>=text.length||!text.textContent[at].trim())continue;const r=document.createRange();r.setStart(text,at);r.setEnd(text,at+1);if([...r.getClientRects()].some(b=>e.clientX>=b.left-2&&e.clientX<=b.right+2&&e.clientY>=b.top&&e.clientY<=b.bottom))return;}}
    const rect=volume.getBoundingClientRect();turn((e.clientX<rect.left+rect.width/2?-1:1)*(document.dir==='rtl'?-1:1));
  }
  volume.addEventListener('click',blankClick);
  const contentsClick=e=>{if(e.target.closest('[data-open-contents]')){e.preventDefault();menu(true);}};
  app.addEventListener('click',contentsClick);
  app.addEventListener('click',copyCode);
  const detailsToggle=e=>{const detail=e.target;if(continuous||detail.tagName!=='DETAILS'||!detail.closest('.folio-content')||!detail.open)return;const body=detail.closest('.folio-content');const remaining=body.getBoundingClientRect().bottom-detail.getBoundingClientRect().top-8;detail.style.maxHeight=Math.max(56,remaining)+'px';detail.style.overflowY='auto';detail.style.scrollbarWidth='thin';};
  app.addEventListener('toggle',detailsToggle,true);
  async function copyCode(e){const b=e.target.closest('.copy-code');if(!b)return;try{await navigator.clipboard.writeText(b.closest('.code-block').querySelector('code').textContent);b.textContent=t('Copied');setTimeout(()=>b.textContent=t('Copy code'),1800)}catch{b.textContent=t('Select code to copy');}}
  function resized(){clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(!disposed)paginate(folio)},250)}addEventListener('resize',resized);
  await document.fonts.ready;
  await Promise.all([...source.querySelectorAll('img')].map(img=>img.decode().catch(()=>{})));
  if(!disposed&&volume.isConnected)await paginate(Number(storage.get('alux-folio-'+page.slug)||0));
  function getCurrentAnchor(){const headings=[...app.querySelectorAll('#page-book h1[id],#page-book h2[id],#page-book h3[id],#page-book h4[id]')];if(continuous)return(headings.filter(h=>h.getBoundingClientRect().top<170).at(-1)||headings[0])?.id;headings.sort((a,b)=>Number(a.closest('.folio-page')?.dataset.folio||0)-Number(b.closest('.folio-page')?.dataset.folio||0));const current=currentPage();return(headings.filter(h=>Number(h.closest('.folio-page')?.dataset.folio)<=current).at(-1)||headings[0])?.id}
  return {goToAnchor,getCurrentAnchor,openContents:()=>menu(true),dispose(){disposed=true;clearTimeout(resizeTimer);removeEventListener('resize',resized);removeEventListener('keydown',key);removeEventListener('hashchange',onHash);app.removeEventListener('click',copyCode);app.removeEventListener('click',contentsClick);volume.removeEventListener('click',blankClick);removeEventListener('alux-bookmarks-changed',bookmark);app.removeEventListener('toggle',detailsToggle,true);flip?.destroy();flip=null;},getState(){return{total,folio,layoutKey,continuous,size}}};
}
