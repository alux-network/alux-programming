import { resolveAnchor } from './anchors.ts';
import { ui, language, fmt } from './i18n.ts';
import { PageFlip } from 'page-flip';
import {recordChapterCount,invalidateChapterCounts} from './chapter-counts.ts';
import { prepareChapterSource, paginateChapter } from './pagination.ts';
import { readingSize, applyReadingSize } from './reading-preferences.ts';
import { query } from './dom.ts';
import { copyBookSurface, ownedBookSurface } from './reader-surface.ts';
import type {
  ReaderController,
  ReaderPage,
  ReaderStorage,
  Icon,
  Navigate
} from './book.ts';

export interface BookLayoutState {
  total: number;
  folio: number;
  layoutKey: string;
  continuous: boolean;
  size: number;
  position: string;
  previous: string;
  next: string;
  previousDisabled: boolean;
  ready: boolean;
  numbering: 'chapter'|'book';
}
export interface BookLayout extends ReaderController {
  turn(direction: number): void;
  reflow(scale: number, continuous: boolean): void;
  resize(): void;
  getState(): BookLayoutState;
}
interface LayoutOptions {
  app: HTMLElement;
  page: ReaderPage;
  pages: ReaderPage[];
  icon: Icon;
  storage: ReaderStorage;
  onNavigate: Navigate;
  onState(state: BookLayoutState): void;
  scale: number;
  continuous: boolean;
}
const decodedImages = new Map<string, Promise<void>>();
function bookImagesReady(page: ReaderPage): Promise<void[]> {
  const sources=new Set([...page.html.matchAll(/<img[^>]+src="([^"]+)"/g)].map(match=>match[1]!));
  return Promise.all(
    [...sources].map((src) => {
      let ready = decodedImages.get(src);
      if (!ready) {
        const image = new Image();
        image.src = src;
        ready = image.decode().catch(() => {
          decodedImages.delete(src);
        });
        decodedImages.set(src, ready);
      }
      return ready;
    })
  );
}
/** Paginated HTML on full-size physical sheets. Source blocks are moved, never rewritten. */
export function attachBookLayout({
  app,
  page,
  pages,
  icon,
  storage,
  onNavigate,
  onState,
  scale,
  continuous
}: LayoutOptions): BookLayout {
  let flip: PageFlip | null = null,
    disposed = false,
    resizeTimer: ReturnType<typeof setTimeout> | undefined,
    folio = 0,
    portraitBook = innerWidth <= 1000;
  const rtl = () => document.documentElement.dir === 'rtl';
  const physicalIndex = (n: number): number =>
    rtl()
      ? Math.max(
          0,
          total - (portraitBook ? 1 : 2) - (portraitBook ? n : n - (n % 2))
        )
      : n;
  const currentPage = (): number =>
    flip
      ? rtl()
        ? Math.max(
            0,
            total - (portraitBook ? 1 : 2) - flip.getCurrentPageIndex()
          )
        : flip.getCurrentPageIndex()
      : folio;
  let size = readingSize(scale);
  const idx = pages.indexOf(page);
  applyReadingSize(size);
  const volume = query<HTMLElement>('.bound-volume', app);
  const isCurrent = (): boolean => !disposed && volume.isConnected;
  const source = prepareChapterSource(page, ui, language());
  const originalHTML = source.innerHTML;
  const restoreEmbeds = (root: ParentNode): void =>
    root
      .querySelectorAll<HTMLIFrameElement>('iframe[data-embed-src]')
      .forEach((frame) => {
        frame.src = frame.dataset.embedSrc ?? '';
        delete frame.dataset.embedSrc;
      });
  let total = 0,
    layoutKey = '',
    pageOffset = 0,
    bookTotal = 0,
    paginationRevision = 0,
    ready = false;
  let paginationTask:AbortController|null=null;
  const copyTimers=new Set<ReturnType<typeof setTimeout>>();
  const frameIds=new Set<number>();
  let imagesReady: Promise<void[]> | null = null;
  const reduced = (): boolean =>
    matchMedia('(prefers-reduced-motion:reduce)').matches;
  function openContents() {
    void onNavigate('/contents.html');
  }
  function state(): BookLayoutState {
    const p = currentPage(),
      last = p + (innerWidth > 1000 ? 2 : 1) >= total;
    return {
      total,
      folio: p,
      layoutKey,
      continuous,
      size,
      ready,
      numbering:bookTotal?'book':'chapter',
      position: continuous
        ? ui('Continuous reading')
        : ready
          ? bookTotal ? `${pageOffset+p+1}${!portraitBook&&p+1<total?'–'+(pageOffset+Math.min(p+2,total)):''} / ${bookTotal}` : fmt({key:'chapterProgress',start:p+1,end:Math.min(p+(portraitBook?1:2),total),total})
          : ui('Preparing the pages…'),
      previous: p === 0 ? ui('Previous chapter') : ui('Previous page'),
      next: last
        ? idx + 1 < pages.length
          ? ui('Next chapter')
          : ui('Back to contents')
        : ui('Next page'),
      previousDisabled: p === 0 && idx === 0
    };
  }
  function footer() {
    if (!isCurrent()) return;
    folio = currentPage();
    storage.set('alux-folio-' + page.slug, folio);
    storage.set('alux-last-chapter', page.slug);
    onState(state());
  }
  function sheetLayout() {
    const surface = getComputedStyle(volume);
    const available = Math.max(
      240,
      volume.clientWidth -
        parseFloat(surface.paddingLeft) -
        parseFloat(surface.paddingRight)
    );
    const portrait = innerWidth <= 1000;
    const w = Math.floor(portrait ? available : available / 2);
    const h = Math.max(
      430,
      volume.clientHeight -
        parseFloat(surface.paddingTop) -
        parseFloat(surface.paddingBottom)
    );
    volume.style.setProperty('--sheet-w', w + 'px');
    volume.style.setProperty('--sheet-h', h + 'px');
    return { w, h, portrait };
  }
  function initialPages(keep: number): HTMLElement[] | undefined {
    const target = ownedBookSurface(volume);
    if (!target) return;
    const { w, h, portrait } = sheetLayout();
    const sheets = paginateChapter({
      page,
      pages,
      icon,
      host: volume,
      w,
      h,
      portrait,
      label: ui,
      locale: language()
    });
    const start = Math.max(0, Math.min(keep, sheets.length - 1));
    const first = portrait ? start : start - (start % 2);
    target.replaceChildren();
    folio = first;
    target.classList.add('reader-preview');
    target.setAttribute('aria-busy', 'true');
    target.style.width = (portrait ? w : 2 * w) + 'px';
    target.style.height = h + 'px';
    for (const sheet of sheets.slice(first, first + (portrait ? 1 : 2))) {
      const local = Number(sheet.dataset.folio);
      sheet.classList.toggle(
        'folio-verso',
        !portrait && (rtl() ? local % 2 === 1 : local % 2 === 0)
      );
      target.append(sheet);
    }
    ready = false;
    onState(state());
    return sheets;
  }
  function clearBook(): HTMLElement | null {
    if (flip) {
      flip.destroy();
      flip = null;
    }
    const target = ownedBookSurface(volume);
    if (target) {
      target.innerHTML = '';
      target.classList.remove('reader-preview');
      target.removeAttribute('aria-busy');
    }
    return target;
  }
  async function paginate(keep = 0, anchor?:string) {
    if (!isCurrent()) return;
    const revision = ++paginationRevision;
    paginationTask?.abort();
    const task=paginationTask=new AbortController();
    ready = false;
    applyReadingSize(size);
    document.body.classList.toggle('continuous-reading', continuous);
    if (continuous) {
      const target = clearBook();
      if (!target) return;
      target.innerHTML = `<article class="prose continuous-prose">${originalHTML}</article>`;
      restoreEmbeds(target);
      total = 1;
      ready = true;
      footer();
      if(anchor)goToAnchor(anchor,false);
      return;
    }
    const readyImages = (imagesReady ??= bookImagesReady(page));
    if(!flip)initialPages(keep);
    onState(state());
    const {w,h,portrait}=sheetLayout();
    layoutKey=`${w}/${h}/${size}`;
    const cacheKey=`${document.documentElement.lang}/${layoutKey}/${portrait}`;
    const probe=document.createElement('div');probe.className='folio-measure';probe.style.width=w+'px';probe.style.height=h+'px';
    const probePage=document.createElement('section');probePage.className='folio-page';
    const probeContent=document.createElement('article');probeContent.className='folio-content prose';probeContent.innerHTML=originalHTML;
    probeContent.querySelectorAll('[id]').forEach(element=>element.removeAttribute('id'));probePage.append(probeContent);probe.append(probePage);volume.append(probe);
    let cancel:()=>void=()=>{};
    try{
      probeContent.getBoundingClientRect();
      const cancelled=new Promise<void>(resolve=>{cancel=()=>resolve();task.signal.addEventListener('abort',cancel,{once:true});});
      await Promise.race([Promise.all([document.fonts.ready,readyImages]),cancelled]);
    }finally{task.signal.removeEventListener('abort',cancel);probe.remove();}
    if(!isCurrent()||task.signal.aborted||revision!==paginationRevision)return;
    // Only this chapter is measured after its fonts/images settle.
    const sheets=paginateChapter({page,pages,icon,host:volume,w,h,portrait,label:ui,locale:language()});
    const numbering=recordChapterCount(pages,cacheKey,page,sheets.length);
    const previous = ownedBookSurface(volume);
    const backdrop = previous?.textContent?.trim()
      ? copyBookSurface(previous)
      : null;
    if (backdrop && previous) {
      const r = previous.getBoundingClientRect(),
        v = volume.getBoundingClientRect();
      Object.assign(backdrop.style, {
        position: 'absolute',
        left: `${r.left - v.left - volume.clientLeft}px`,
        top: `${r.top - v.top - volume.clientTop}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
        pointerEvents: 'none',
        zIndex: '4'
      });
      volume.append(backdrop);
    }
    const keepPage = flip ? currentPage() : keep;
    const target = clearBook();
    if (!target) {
      backdrop?.remove();
      return;
    }
    portraitBook = portrait;
    target.style.width = (portrait ? w : 2 * w) + 'px';
    target.style.height = h + 'px';
    pageOffset=numbering?.offset||0;
    bookTotal=numbering?.total||0;
    target.dataset.pageOffset = String(pageOffset);
    target.dataset.bookPages = String(bookTotal);
    for (const sheet of sheets) {
      const local = Number(sheet.dataset.folio);
      sheet.classList.toggle(
        'folio-verso',
        !portrait && (rtl() ? local % 2 === 1 : local % 2 === 0)
      );
      const number = query<HTMLSpanElement>(
        '.folio-footer>span:last-child',
        sheet
      );
      number.textContent = String(pageOffset + local + 1);
      number.dir = 'ltr';
      restoreEmbeds(sheet);
    }
    if (rtl()) sheets.reverse();
    sheets.forEach((s) => target.append(s));
    total = sheets.length;
    flip = new PageFlip(target, {
      width: w,
      height: h,
      size: 'fixed',
      minWidth: w,
      maxWidth: w,
      minHeight: h,
      maxHeight: h,
      autoSize: false,
      drawShadow: true,
      flippingTime: 560,
      maxShadowOpacity: document.body.classList.contains('night') ? 0.55 : 0.2,
      usePortrait: portrait,
      showCover: false,
      startPage: physicalIndex(Math.max(0, Math.min(keepPage, total - 1))),
      clickEventForward: true,
      useMouseEvents: false,
      disableFlipByClick: false,
      mobileScrollSupport: false,
      showPageCorners: false
    });
    flip.on('flip', footer);
    flip.on('changeState', (event) =>
      target.classList.toggle('paper-turning', event.data === 'flipping')
    );
    flip.loadFromHTML(sheets);
    ready = true;
    // These are interior paper leaves, including an unpaired final sheet.
    for (let i = 0; i < sheets.length; i++) {
      flip.getPage(i).setDensity('soft');
      flip.getPage(i).setDrawingDensity('soft');
    }
    const frame=requestAnimationFrame(() => {
      frameIds.delete(frame);
      backdrop?.remove();
      if (!isCurrent() || revision !== paginationRevision) return;
      footer();
      if(anchor)goToAnchor(anchor,false);
    });
    frameIds.add(frame);
  }
  function turn(direction: number): void {
    if (!isCurrent() || !ready || continuous || !flip) return;
    const p = currentPage();
    const last = p + (innerWidth > 1000 ? 2 : 1) >= total;
    if (direction > 0 && last) {
      if (idx + 1 < pages.length) onNavigate('/' + pages[idx + 1].slug);
      else openContents();
      return;
    }
    if (direction < 0 && p === 0) {
      if (idx > 0) onNavigate('/' + pages[idx - 1].slug);
      return;
    }
    const physicalDirection = rtl() ? -direction : direction;
    if (reduced()) {
      physicalDirection > 0 ? flip.turnToNextPage() : flip.turnToPrevPage();
    } else
      physicalDirection > 0 ? flip.flipNext('bottom') : flip.flipPrev('bottom');
  }
  function goToAnchor(id: string, animate = true): void {
    if (!isCurrent() || !id) return;
    const el = volume.querySelector<HTMLElement>(
      '#' + CSS.escape(resolveAnchor(page, id))
    );
    if (!el) return;
    if (continuous) {
      el.scrollIntoView({ behavior: animate&&!reduced()?'smooth':'instant' });
      return;
    }
    const s = el.closest<HTMLElement>('.folio-page');
    if (s && flip) {
      const n = Number(s.dataset.folio);
      if (animate && !reduced()) flip.flip(physicalIndex(n), 'bottom');
      else flip.turnToPage(physicalIndex(n));
      el.closest<HTMLElement>('.folio-overflow')?.scrollTo({
        top: Math.max(0, el.offsetTop - 20)
      });
    }
  }
  const onHash = () => goToAnchor(location.hash.slice(1));
  addEventListener('hashchange', onHash);
  const key = (e: KeyboardEvent) => {
    if (
      !isCurrent() ||
      document.querySelector('dialog[open]') ||
      e.ctrlKey ||
      e.metaKey ||
      e.shiftKey ||
      e.altKey ||
      !(e.target instanceof Element) ||
      /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)
    )
      return;
    if (document.body.classList.contains('menu-open')) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      turn(rtl() ? -1 : 1);
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      turn(rtl() ? 1 : -1);
    }
  };
  addEventListener('keydown', key);
  let down: { x: number; y: number; type: string } | null = null,
    lastSwipe = 0;
  volume.addEventListener('pointerdown', (e: PointerEvent) => {
    down = { x: e.clientX, y: e.clientY, type: e.pointerType };
  });
  volume.addEventListener('pointerup', (e: PointerEvent) => {
    const target = e.target instanceof Element ? e.target : null;
    if (
      down?.type === 'touch' &&
      !target?.closest(
        'a,button,input,pre,code,.folio-overflow,.table-scroll'
      ) &&
      Math.abs(e.clientX - down.x) > 65 &&
      Math.abs(e.clientY - down.y) < 60
    ) {
      turn((e.clientX < down.x ? 1 : -1) * (document.dir === 'rtl' ? -1 : 1));
      lastSwipe = Date.now();
    }
  });
  function blankClick(e: MouseEvent): void {
    const target = e.target instanceof Element ? e.target : null;
    if (
      continuous ||
      !flip ||
      e.button !== 0 ||
      e.ctrlKey ||
      e.metaKey ||
      e.shiftKey ||
      e.altKey ||
      Date.now() - lastSwipe < 600 ||
      target?.closest(
        'a,button,input,select,summary,details,pre,code,table,.folio-overflow,.table-scroll'
      ) ||
      !getSelection()?.isCollapsed
    )
      return;
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) return;
    if (!target?.closest('.folio-page,.page-book,.stf__wrapper')) return;
    const caret = document.caretRangeFromPoint?.(e.clientX, e.clientY);
    if (caret?.startContainer.nodeType === Node.TEXT_NODE) {
      const text = caret.startContainer as Text;
      const value = text.textContent ?? '';
      const offset = caret.startOffset;
      for (const at of [offset - 1, offset]) {
        if (at < 0 || at >= text.length || !value[at]?.trim()) continue;
        const r = document.createRange();
        r.setStart(text, at);
        r.setEnd(text, at + 1);
        if (
          [...r.getClientRects()].some(
            (b) =>
              e.clientX >= b.left - 2 &&
              e.clientX <= b.right + 2 &&
              e.clientY >= b.top &&
              e.clientY <= b.bottom
          )
        )
          return;
      }
    }
    const rect = volume.getBoundingClientRect();
    turn(
      (e.clientX < rect.left + rect.width / 2 ? -1 : 1) *
        (document.dir === 'rtl' ? -1 : 1)
    );
  }
  volume.addEventListener('click', blankClick);
  const contentsClick = (e: MouseEvent): void => {
    if (
      e.target instanceof Element &&
      e.target.closest('[data-open-contents]')
    ) {
      e.preventDefault();
      openContents();
    }
  };
  app.addEventListener('click', contentsClick);
  app.addEventListener('click', copyCode);
  const detailsToggle = (e: Event): void => {
    const detail = e.target;
    if (
      continuous ||
      !(detail instanceof HTMLDetailsElement) ||
      !detail.closest('.folio-content') ||
      !detail.open
    )
      return;
    const body = detail.closest<HTMLElement>('.folio-content');
    if (!body) return;
    const remaining =
      body.getBoundingClientRect().bottom -
      detail.getBoundingClientRect().top -
      8;
    detail.style.maxHeight = Math.max(56, remaining) + 'px';
    detail.style.overflowY = 'auto';
    detail.style.scrollbarWidth = 'thin';
  };
  app.addEventListener('toggle', detailsToggle, true);
  async function copyCode(e: MouseEvent): Promise<void> {
    const target = e.target instanceof Element ? e.target : null;
    const button = target?.closest<HTMLElement>('.copy-code');
    if (!button) return;
    try {
      const code = query<HTMLElement>(
        'code',
        query<HTMLElement>('.code-block', button)
      );
      await navigator.clipboard.writeText(code.textContent ?? '');
      button.textContent = ui('Copied');
      const timer=setTimeout(()=>{copyTimers.delete(timer);if(button.isConnected)button.textContent=ui('Copy code');},1800);copyTimers.add(timer);
    } catch {
      button.textContent = ui('Select code to copy');
    }
  }
  function resized(): void {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (isCurrent()) void paginate(folio,getCurrentAnchor());
    }, 250);
  }
  const fontsChanged=()=>{invalidateChapterCounts(pages);if(ready)resized();};
  document.fonts.addEventListener('loadingdone',fontsChanged);
  addEventListener('resize', resized);
  const savedFolio = Number(storage.get('alux-folio-' + page.slug) || 0);
  if (isCurrent()) void paginate(savedFolio,location.hash.slice(1)||undefined);
  function getCurrentAnchor(): string | undefined {
    const headings = [
      ...app.querySelectorAll<HTMLElement>(
        '#page-book h1[id],#page-book h2[id],#page-book h3[id],#page-book h4[id]'
      )
    ];
    if (continuous)
      return (
        headings.filter((h) => h.getBoundingClientRect().top < 170).at(-1) ||
        headings[0]
      )?.id;
    headings.sort(
      (a, b) =>
        Number(a.closest<HTMLElement>('.folio-page')?.dataset.folio || 0) -
        Number(b.closest<HTMLElement>('.folio-page')?.dataset.folio || 0)
    );
    const current = currentPage();
    return (
      headings
        .filter(
          (h) =>
            Number(h.closest<HTMLElement>('.folio-page')?.dataset.folio) <=
            current
        )
        .at(-1) || headings[0]
    )?.id;
  }
  return {
    goToAnchor,
    getCurrentAnchor,
    openContents,
    turn,
    resize: resized,
    reflow(nextScale, nextContinuous) {
      const anchor=getCurrentAnchor();
      scale = nextScale;
      size = readingSize(scale);
      continuous = nextContinuous;
      void paginate(folio,anchor);
    },
    dispose() {
      disposed = true;
      paginationRevision++;
      paginationTask?.abort();
      for(const timer of copyTimers)clearTimeout(timer);copyTimers.clear();
      for(const frame of frameIds)cancelAnimationFrame(frame);frameIds.clear();
      document.fonts.removeEventListener('loadingdone',fontsChanged);
      clearTimeout(resizeTimer);
      removeEventListener('resize', resized);
      removeEventListener('keydown', key);
      removeEventListener('hashchange', onHash);
      app.removeEventListener('click', copyCode);
      app.removeEventListener('click', contentsClick);
      volume.removeEventListener('click', blankClick);
      app.removeEventListener('toggle', detailsToggle, true);
      flip?.destroy();
      flip = null;
    },
    getState: state
  };
}
