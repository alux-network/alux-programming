// One layout algorithm supplies both the rendered chapter and whole-book page counts.
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function prepareChapterSource(page){
  const source=document.createElement('div');source.innerHTML=page.html;
  if(page.slug==='introduction.html')source.querySelector('.admonition.warning')?.remove();
  source.querySelectorAll('table').forEach(table=>{const wrap=document.createElement('div');wrap.className='table-scroll';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Scrollable table');table.before(wrap);wrap.append(table);});
  source.querySelectorAll('h1 img').forEach(img=>img.remove());
  // Measuring a clip must not start another embedded player.
  source.querySelectorAll('iframe[src]').forEach(frame=>{frame.dataset.embedSrc=frame.getAttribute('src');frame.removeAttribute('src');});
  return source;
}
export function paginateChapter({page,pages,icon,host,w,h,portrait}){
  const idx=pages.indexOf(page);
  function pageElement(number){
    const sheet=document.createElement('section');sheet.className='folio-page';sheet.dataset.density='soft';sheet.dataset.folio=number;
    sheet.innerHTML=`<header class="folio-running-head"><span>${escape(page.group)}</span><span>ALUX PROGRAMMING</span></header><article class="folio-content prose"></article><footer class="folio-footer"><span>✦</span><span>${String(number+1).padStart(2,'0')}</span></footer>`;
    return sheet;
  }
    const measure=document.createElement('div');measure.className='folio-measure';measure.style.width=w+'px';measure.style.height=h+'px';
    host.append(measure);
    let sheet=pageElement(0);measure.append(sheet);let body=sheet.querySelector('.folio-content');
    const sheets=[sheet];
    function next(){sheet=pageElement(sheets.length);sheets.push(sheet);measure.replaceChildren(sheet);body=sheet.querySelector('.folio-content');}
    function fits(){return body.scrollHeight<=body.clientHeight+1;}
    const parsed=document.createElement('div');parsed.innerHTML=prepareChapterSource(page).innerHTML;
    const blocks=[...parsed.children];const units=[];
    for(let n=0;n<blocks.length;n++){
      const node=blocks[n],nextNode=blocks[n+1];
      const keepWithNext=nextNode&&((/^H[1-4]$/.test(node.tagName)&&!nextNode.matches('.admonition,.table-scroll'))||(node.tagName==='P'&&/:\s*$/.test(node.textContent)&&/^(UL|OL|DIV)$/.test(nextNode.tagName)));
      if(keepWithNext){const group=document.createElement('div');group.className=/^H[1-4]$/.test(node.tagName)?'folio-group folio-heading-group':'folio-group';group.append(node,nextNode);n++;if(nextNode.tagName==='P'&&/:\s*$/.test(nextNode.textContent)&&blocks[n+1]&&/^(UL|OL)$/.test(blocks[n+1].tagName)){group.append(blocks[++n]);}units.push(group);}else units.push(node);
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
    const end=document.createElement('nav');end.className='folio-chapter-end';end.innerHTML=`<span>✦</span><p>Continue the journey</p>${idx+1<pages.length?`<a href="/${pages[idx+1].slug}">${escape(pages[idx+1].title)} ${icon('arrow-right')}</a>`:'<a href="/contents.html" data-open-contents>Return to the table of contents</a>'}`;
    body.append(end);if(!fits()){end.remove();next();body.append(end);}
    if(!portrait&&sheets.length%2){next();body.innerHTML=`<div class="folio-closing"><span>✦</span><p>First the meaning.<br><em>Then the machinery.</em></p><a href="/contents.html" data-open-contents>Explore another chapter ${icon('arrow-right')}</a></div>`;}
    measure.remove();
  return sheets;
}
