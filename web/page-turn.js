import {PageFlip} from 'page-flip';

// The outgoing DOM becomes a soft sheet. PageFlip computes the fold, clipping
// polygon and moving shadows; the destination remains stationary underneath.
export async function turnRoute(app, update) {
  const width=innerWidth,height=innerHeight,scroll=scrollY;
  const layer=document.createElement('div');layer.className='route-book-turn';layer.setAttribute('aria-hidden','true');layer.inert=true;
  const host=document.createElement('div');host.className='route-flip-host';layer.append(host);
  function sheet(classes,content,offset=0){
    const el=document.createElement('section');el.className='route-soft-sheet';el.dataset.density='soft';
    const surface=document.createElement('div');surface.className='route-sheet-surface '+classes;
    surface.style.width=width+'px';surface.style.minHeight=height+'px';
    content.removeAttribute('id');content.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
    content.style.transform=`translateY(${-offset}px)`;surface.append(content);el.append(surface);return el;
  }
  const old=sheet(document.body.className,app.cloneNode(true),scroll);
  old.classList.add('route-outgoing');
  host.append(old);document.body.append(layer);
  // Keep the old full-size page visible while the next chapter is paginated.
  await update();
  const destination=sheet(document.body.className,app.cloneNode(true));
  host.append(destination);
  const book=new PageFlip(host,{width,height,size:'fixed',minWidth:width,maxWidth:width,minHeight:height,maxHeight:height,usePortrait:true,autoSize:false,drawShadow:true,maxShadowOpacity:.35,flippingTime:1150,useMouseEvents:false,disableFlipByClick:true,showPageCorners:false,mobileScrollSupport:false});
  const copies=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1&&node.matches('.route-outgoing')&&node!==old)node.classList.add('route-sheet-back');});
  copies.observe(host,{childList:true,subtree:true});
  try{
    book.loadFromHTML([old,destination]);
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    await new Promise(resolve=>{let started=false;const timer=setTimeout(resolve,1550);book.on('changeState',e=>{if(e.data==='flipping')started=true;if(started&&e.data==='read'){clearTimeout(timer);resolve();}});book.flipNext('bottom');});
  }finally{copies.disconnect();book.destroy();layer.remove();}
}
