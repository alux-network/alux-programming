import {PageFlip} from 'page-flip';

function visibleSheets(book){
 return [...book.querySelectorAll('.folio-page')].filter(e=>getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0).sort((a,b)=>a.getBoundingClientRect().left-b.getBoundingClientRect().left).map(e=>{const copy=e.cloneNode(true);copy.className='folio-page';copy.removeAttribute('style');copy.removeAttribute('id');copy.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));return copy;});
}
// Only paper turns. The cover and bookmark remain owned by the new reader.
export async function turnRoute(app,update,direction=1){
 const old=app.querySelector('.page-book');
 if(!old||document.body.classList.contains('continuous-reading')){await update();return;}
 const before=visibleSheets(old),rect=old.getBoundingClientRect();
 if(!before.length){await update();return;}
 const veil=document.createElement('div');veil.inert=true;veil.setAttribute('aria-hidden','true');
 Object.assign(veil.style,{position:'fixed',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',overflow:'hidden',pointerEvents:'none',zIndex:9});
 const snapshot=old.cloneNode(true);snapshot.removeAttribute('id');snapshot.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));veil.append(snapshot);document.body.append(veil);
 let flip,host;
 try{
  await update();
  // PageFlip paints its initial spread on the next animation frame.
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const book=app.querySelector('.page-book'),volume=app.querySelector('.bound-volume');
  if(!book||!volume)return;
  const after=visibleSheets(book),r=book.getBoundingClientRect(),v=volume.getBoundingClientRect();
  if(!after.length)return;
  const portrait=after.length===1,w=r.width/(portrait?1:2),h=r.height;
  host=document.createElement('div');host.className='chapter-flip-host paper-turning';host.inert=true;host.setAttribute('aria-hidden','true');
  Object.assign(host.style,{position:'absolute',left:r.left-v.left-volume.clientLeft+'px',top:r.top-v.top-volume.clientTop+'px',width:r.width+'px',height:h+'px',zIndex:9,pointerEvents:'none',overflow:'hidden'});
  const backward=(direction<0)!==(document.dir==='rtl');
  const sheets=backward?[...after,...before]:[...before,...after];
  for(const sheet of sheets){sheet.style.width=w+'px';sheet.style.height=h+'px';host.append(sheet);}
  volume.append(host);veil.remove();
  flip=new PageFlip(host,{width:w,height:h,size:'fixed',autoSize:false,usePortrait:portrait,showCover:false,startPage:backward?after.length:0,flippingTime:560,drawShadow:true,maxShadowOpacity:document.body.classList.contains('night')?.55:.2,useMouseEvents:false,disableFlipByClick:false,mobileScrollSupport:false,showPageCorners:false});
  flip.loadFromHTML(sheets);
  await new Promise(resolve=>{let started=false;const timer=setTimeout(resolve,1000);flip.on('changeState',e=>{if(e.data==='flipping')started=true;if(started&&e.data==='read'){clearTimeout(timer);resolve();}});requestAnimationFrame(()=>requestAnimationFrame(()=>backward?flip.flipPrev('bottom'):flip.flipNext('bottom')));});
 }finally{veil.remove();flip?.destroy();host?.remove();}
}
