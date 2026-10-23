import {PageFlip} from 'page-flip';

function visibleSheets(book: HTMLElement): HTMLElement[] {
  return [...book.querySelectorAll<HTMLElement>('.folio-page')]
    .filter(element => getComputedStyle(element).display !== 'none' && element.getBoundingClientRect().width > 0)
    .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)
    .map(element => {
      const copy = element.cloneNode(true) as HTMLElement;
      copy.className = 'folio-page';
      copy.removeAttribute('style');
      copy.removeAttribute('id');
      copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      return copy;
    });
}

// Only paper turns. The cover and bookmark remain owned by the new reader.
export async function turnRoute(app: HTMLElement, update: () => Promise<unknown> | unknown, direction = 1): Promise<void> {
  const old = app.querySelector<HTMLElement>('.page-book');
  if (!old || document.body.classList.contains('continuous-reading')) {
    await update();
    return;
  }
  const before = visibleSheets(old);
  const rect = old.getBoundingClientRect();
  if (!before.length) {
    await update();
    return;
  }
  const veil = document.createElement('div');
  veil.inert = true;
  veil.setAttribute('aria-hidden', 'true');
  Object.assign(veil.style, {position:'fixed',left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`,overflow:'hidden',pointerEvents:'none',zIndex:9});
  const snapshot = old.cloneNode(true) as HTMLElement;
  snapshot.removeAttribute('id');
  snapshot.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
  veil.append(snapshot);
  document.body.append(veil);
  let flip: PageFlip | null = null;
  let host: HTMLDivElement | null = null;
  try {
    await update();
    // PageFlip paints its initial spread on the next animation frame.
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const book = app.querySelector<HTMLElement>('.page-book');
    const volume = app.querySelector<HTMLElement>('.bound-volume');
    if (!book || !volume) return;
    const after = visibleSheets(book);
    const r = book.getBoundingClientRect();
    const v = volume.getBoundingClientRect();
    if (!after.length) return;
    const portrait = after.length === 1;
    const w = r.width / (portrait ? 1 : 2);
    const h = r.height;
    host = document.createElement('div');
    host.className = 'chapter-flip-host paper-turning';
    host.inert = true;
    host.setAttribute('aria-hidden', 'true');
    Object.assign(host.style, {position:'absolute',left:`${r.left-v.left-volume.clientLeft}px`,top:`${r.top-v.top-volume.clientTop}px`,width:`${r.width}px`,height:`${h}px`,zIndex:9,pointerEvents:'none',overflow:'hidden'});
    const backward = (direction < 0) !== (document.dir === 'rtl');
    const sheets = backward ? [...after, ...before] : [...before, ...after];
    for (const sheet of sheets) {
      sheet.style.width = `${w}px`;
      sheet.style.height = `${h}px`;
      host.append(sheet);
    }
    volume.append(host);
    veil.remove();
    flip = new PageFlip(host, {width:w,height:h,size:'fixed',autoSize:false,usePortrait:portrait,showCover:false,startPage:backward?after.length:0,flippingTime:560,drawShadow:true,maxShadowOpacity:document.body.classList.contains('night')?.55:.2,useMouseEvents:false,disableFlipByClick:false,mobileScrollSupport:false,showPageCorners:false});
    flip.loadFromHTML(sheets);
    await new Promise<void>(resolve => {
      let started = false;
      const timer = setTimeout(resolve, 1000);
      flip?.on('changeState', event => {
        if (event.data === 'flipping') started = true;
        if (started && event.data === 'read') {
          clearTimeout(timer);
          resolve();
        }
      });
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (backward) flip?.flipPrev('bottom');
        else flip?.flipNext('bottom');
      }));
    });
  } finally {
    veil.remove();
    flip?.destroy();
    host?.remove();
  }
}
