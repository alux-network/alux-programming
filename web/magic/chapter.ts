// Binds one chapter of the magic world to the markup Reader.tsx renders: paging by CSS columns,
// soft paper folds (paper-turn.ts), the folio, turn buttons and keys, text size, reading mode,
// bookmarks, the language and theme menus, and progress. This is the approved reader's behavior
// (formerly reader.ts), bound per chapter: Reader.tsx calls bindChapter after React renders a
// chapter and calls the returned function before the next one, which releases every listener.
//
// State: Prefs (prefs.ts) and <html data-reading | --reader-scale | --reader-toolbar-height>, which
// reader.css reads. A turn past either end of a chapter folds into the neighboring chapter: the
// outgoing spread is kept in `entering` and folded away once the new chapter is laid out.
import { paperTurn } from '../paper-turn.ts';
import type { Language } from '../languages.ts';
import { readerName } from '../languages.ts';
import { applyTheme, prepareCode } from './chrome.ts';
import type { Prefs } from './prefs.ts';
import { magicUrl, realUrl } from './prefs.ts';
import { t as translate } from './t.ts';

export interface ChapterContext {
  lang: Language;
  // The chapter's path inside the edition, e.g. denotational-design/design.html.
  page: string;
  // The part the chapter belongs to, for the running heads.
  part?: string;
  prev?: string;
  next?: string;
  prefs: Prefs;
  save(): void;
  // Navigates within the app (React Router) to a /magic/ URL.
  navigate(url: string): void;
}

// The outgoing spread of a turn into another chapter, folded away when that chapter is ready.
let entering: { sheets: HTMLElement[]; direction: number } | undefined;

/** Binds the chapter now in the page and returns its teardown. */
export function bindChapter(ctx: ChapterContext): () => void {
  const { lang, page, prefs, save } = ctx;
  const controller = new AbortController();
  const signal = controller.signal;
  const observers: { disconnect(): void }[] = [];
  const html = document.documentElement;
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const t = (key: string) => translate(lang, key);
  const rtl = html.dir === 'rtl';
  const label = (el: HTMLElement, key: string) => { el.title = t(key); el.setAttribute('aria-label', t(key)); };
  const main = document.querySelector<HTMLElement>('#content > .volume > main.leaves')!;
  const folio = $('folio');
  let disposed = false;

  prepareCode(main, lang, signal);

  // The toolbar names the action the sidebar's current state makes available.
  const sidebarToggle = $('sidebar-toggle');
  const labelDirectoryAction = () => label(sidebarToggle, sidebarToggle.getAttribute('aria-expanded') === 'true' ? 'Hide table of contents' : 'Show table of contents');
  labelDirectoryAction();
  const directory = new MutationObserver(labelDirectoryAction);
  directory.observe(sidebarToggle, { attributes: true, attributeFilter: ['aria-expanded'] });
  observers.push(directory);

  // The language menu, built like mdBook's theme menu; its links carry the current fragment.
  const languageToggle = $('language-toggle'), languageList = $('language-list');
  const openLanguages = (on: boolean) => {
    languageList.style.display = on ? 'block' : 'none';
    languageToggle.setAttribute('aria-expanded', String(on));
  };
  languageToggle.addEventListener('click', (e) => { e.stopPropagation(); openLanguages(languageList.style.display !== 'block'); }, { signal });
  document.addEventListener('click', (e) => { if (!languageList.contains(e.target as Node)) openLanguages(false); }, { signal });
  languageList.addEventListener('keydown', (e) => { if (e.key === 'Escape') { openLanguages(false); languageToggle.focus(); } }, { signal });
  for (const link of languageList.querySelectorAll<HTMLAnchorElement>('a[lang]')) {
    link.addEventListener('click', () => {
      link.href = magicUrl(link.lang as Language, page) + location.hash;
      prefs.language = link.lang as Language;
      save();
      openLanguages(false);
    }, { signal });
  }

  const title = main.querySelector('h1')?.textContent?.trim();
  document.title = page === 'index.html' || !title ? readerName(lang) : title + ' · ' + readerName(lang);

  // One day/night control; mdBook's theme list stays as the approved markup's popup.
  const themeToggle = $('theme-toggle');
  const renderTheme = () => {
    const dark = html.classList.contains('coal');
    themeToggle.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${dark
      ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>'
      : '<path d="M20.9 13A8.5 8.5 0 0 1 11 3.1 8.5 8.5 0 1 0 20.9 13Z"/>'}</svg>`;
    label(themeToggle, 'Change reading theme');
    themeToggle.setAttribute('aria-pressed', String(dark));
    for (const choice of document.querySelectorAll('#theme-list .theme')) choice.classList.toggle('theme-selected', html.classList.contains(choice.id));
  };
  themeToggle.addEventListener('click', (event) => {
    event.preventDefault();
    applyTheme(html.classList.contains('coal') ? 'light' : 'coal');
    renderTheme();
    cancelTurn();
  }, { signal });
  renderTheme();

  const managedScrollPorts = new WeakSet<HTMLElement>();
  /** Only headings taller than one leaf may fragment; fitting headings keep identical fold geometry. */
  function measureHeadings() {
    const headings = main.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6');
    for (const heading of headings) heading.removeAttribute('data-reader-heading-split');
    if (!paged()) return;
    for (const heading of headings) {
      if (heading.getBoundingClientRect().height > main.clientHeight) heading.setAttribute('data-reader-heading-split', '');
    }
  }
  /** Makes overflowing reading ports keyboard-reachable without replacing authored tab order. */
  function measureScrollPorts() {
    for (const port of main.querySelectorAll<HTMLElement>('pre > code,.table-wrapper,.katex-display')) {
      const overflowing = port.scrollWidth > port.clientWidth || port.scrollHeight > port.clientHeight;
      if (overflowing && !port.hasAttribute('tabindex')) {
        port.tabIndex = 0;
        managedScrollPorts.add(port);
      } else if (!overflowing && managedScrollPorts.has(port)) {
        port.removeAttribute('tabindex');
        managedScrollPorts.delete(port);
      }
    }
  }
  const pageNumbers = main.parentElement!.querySelectorAll(':scope > .page-foot .page-number');
  // The running head names the part the chapter belongs to, as the table of contents lists it.
  for (const head of main.parentElement!.querySelectorAll(':scope > .page-head .running-part')) {
    head.textContent = ctx.part ?? t('Welcome');
  }
  // The mode changes only the presentation of this same chapter.
  html.dataset.reading = prefs.mode === 'scroll' ? 'scroll' : 'pages';
  const paged = () => html.dataset.reading !== 'scroll';
  function renderReadingMode() {
    const scrolling = html.dataset.reading === 'scroll';
    label($('reading-mode'), scrolling ? 'Page reading' : 'Scroll reading');
    $('reading-mode-label').textContent = t(scrolling ? 'Page reading' : 'Scroll reading');
    $('reading-mode').setAttribute('aria-pressed', String(scrolling));
    $('reading-mode-icon').className = scrolling ? 'fa fa-book' : 'fa fa-file-text-o';
  }
  const positionKey = lang + ':' + page;
  let fragmentPending = true;
  let restorePending = true;
  // Paging geometry, measured from the laid-out columns. A spread is one viewport of `main`: two
  // columns (one on narrow screens) plus the gap that follows them.
  const gap = () => parseFloat(getComputedStyle(main).columnGap) || 0;
  const step = () => main.clientWidth + gap();
  const spreads = () => Math.max(1, Math.round((main.scrollWidth + gap()) / step()));
  const perSpread = () => (getComputedStyle(main).columnCount === '1' ? 1 : 2);
  // The spread on screen, 0-based.
  let spread = 0;
  // Keep the last settled position independently of geometry that resize has already changed.
  let readingRatio = 0;
  const currentView = () => ({ world: 'magic' as const, mode: paged() ? 'pages' as const : 'scroll' as const, chapter: location.pathname, progress: readingRatio });
  const paper = paperTurn(main, currentView);
  function settleFonts() {
    // A snapshot can request a new font. Finish the visible fold before remeasuring text.
    if (paper.active) return;
    settle();
    paper.measured();
  }

  /** Scrolls to spread `index` (clamped) and updates the folio, page numbers and turn buttons. */
  function show(index: number) {
    spread = Math.max(0, Math.min(index, spreads() - 1));
    readingRatio = spread / Math.max(1, spreads() - 1);
    // Right-to-left columns flow leftwards, with negative scrollLeft.
    main.scrollLeft = (rtl ? -1 : 1) * spread * step();
    const per = perSpread(), first = spread * per + 1, total = spreads() * per;
    folio.textContent = t('This chapter') + ' · ' + (per === 1 ? String(first) : first + '–' + (first + 1)) + ' / ' + total;
    pageNumbers.forEach((number, i) => { number.textContent = String(first + i); });
    $('page-prev-label').textContent = t(spread === 0 ? 'Previous chapter' : 'Previous page');
    label($('page-prev'), spread === 0 ? 'Previous chapter' : 'Previous page');
    $('page-next-label').textContent = t(spread === spreads() - 1 ? 'Next chapter' : 'Next page');
    label($('page-next'), spread === spreads() - 1 ? 'Next chapter' : 'Next page');
    $<HTMLButtonElement>('page-prev').disabled = spread === 0 && !ctx.prev;
    $<HTMLButtonElement>('page-next').disabled = spread === spreads() - 1 && !ctx.next;
  }

  /** The spread that shows `el`. */
  function spreadOf(el: Element) {
    const box = main.getBoundingClientRect(), at = el.getBoundingClientRect();
    return spread + Math.floor((rtl ? box.right - at.right : at.left - box.left) / step());
  }

  /** Cancels the visual interpreter without committing its pending destination. */
  function cancelTurn() {
    paper.cancel();
  }

  /** Captures old/new paper without exposing the new content until its soft-page fold completes. */
  function fold(delta: number, destinationSpread: number) {
    cancelTurn();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { show(destinationSpread); return; }
    const before = paper.sheets(), keep = spread;
    show(destinationSpread);
    const after = paper.sheets(), destination = currentView();
    show(keep);
    paper.show(before, after, delta, committed => {
      show(Math.round(committed.progress * (spreads() - 1)));
      if (paper.measurementPending) settleFonts();
    }, undefined, destination);
  }

  /** Opens the neighboring chapter, keeping the outgoing spread for the entry fold. */
  function leave(delta: number) {
    const href = delta > 0 ? ctx.next : ctx.prev;
    if (!href) return;
    remember();
    entering = paged() && !matchMedia('(prefers-reduced-motion: reduce)').matches
      ? { sheets: paper.sheets(), direction: delta } : undefined;
    ctx.navigate(href + (delta < 0 && paged() ? '#last-page' : ''));
  }

  /** Turns one spread, or folds the final leaf before opening the adjacent chapter. */
  function turn(delta: number) {
    if (paper.active) return;
    if (!paged()) { leave(delta); return; }
    fragmentPending = false;
    restorePending = false;
    const next = spread + delta;
    if (next >= 0 && next < spreads()) fold(delta, next);
    else leave(delta);
  }

  /** Measures the responsive toolbar for unobscured touch-reader fragment navigation. */
  function measureToolbar() {
    html.style.setProperty('--reader-toolbar-height', $('menu-bar').offsetHeight + 'px');
  }

  /** Re-places the reader after layout changes: on #last-page, on a #heading's spread, or where it was. */
  function settle() {
    // A layout change invalidates the pending fold; it never commits the stale destination.
    cancelTurn();
    measureToolbar();
    measureHeadings();
    measureScrollPorts();
    if (!paged()) {
      for (const [id, link, key] of [['page-prev', ctx.prev, 'Previous chapter'], ['page-next', ctx.next, 'Next chapter']] as const) {
        $(id + '-label').textContent = t(key);
        label($(id), key);
        $<HTMLButtonElement>(id).disabled = !link;
      }
      return;
    }
    if (fragmentPending && location.hash === '#last-page') return show(spreads() - 1);
    let target: HTMLElement | null = null;
    if (fragmentPending && location.hash) {
      try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch {}
    }
    if (target) show(spreadOf(target));
    else if (restorePending) show(Math.round((prefs.positions?.[positionKey] ?? 0) * (spreads() - 1)));
    else {
      const ratio = readingRatio;
      show(Math.round(ratio * (spreads() - 1)));
      readingRatio = ratio;
    }
  }

  /** Saves normalized progress in the edition and chapter before navigation or mode changes. */
  function remember() {
    const ratio = paged() ? readingRatio
      : scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight);
    prefs.positions = { ...prefs.positions, [positionKey]: Math.min(1, Math.max(0, ratio)) };
    save();
  }

  /** Restores scroll progress after the chapter's layout resources have settled. */
  function restoreScroll() {
    if (disposed || paged() || (fragmentPending && location.hash)) return;
    scrollTo(0, (prefs.positions?.[positionKey] ?? 0) *
      Math.max(0, document.documentElement.scrollHeight - innerHeight));
  }

  /** WebKit retains fragmented line boxes when leaving columns; rebuild only on a mode change.
   * This is synchronous before paint, retaining the actual nodes and their native controls. */
  function resetTextFlow() {
    const display = main.style.display;
    main.style.display = 'none';
    void main.offsetHeight;
    main.style.display = display;
  }

  renderReadingMode();
  resetTextFlow();
  main.scrollLeft = 0;
  spread = 0;
  settle();
  if (paged()) scrollTo(0, 0);
  $('reading-mode').addEventListener('click', () => {
    remember();
    cancelTurn();
    prefs.mode = paged() ? 'scroll' : 'pages';
    html.dataset.reading = prefs.mode;
    resetTextFlow();
    save();
    fragmentPending = false;
    restorePending = true;
    // #last-page belongs to the old paged presentation, not to the continuous chapter.
    if (location.hash === '#last-page') history.replaceState(history.state, '', location.pathname + location.search);
    main.scrollLeft = 0;
    renderReadingMode();
    settle();
    if (paged()) scrollTo(0, 0);
    else requestAnimationFrame(restoreScroll);
  }, { signal });
  $('world-toggle').addEventListener('click', () => {
    remember();
    prefs.world = 'real';
    save();
    location.assign(realUrl(lang, page) + (location.hash === '#last-page' ? '' : location.hash));
  }, { signal });
  $('page-prev').addEventListener('click', () => turn(-1), { signal });
  $('page-next').addEventListener('click', () => turn(1), { signal });
  main.parentElement!.addEventListener('click', (event) => {
    if (!paged() || event.defaultPrevented || event.button !== 0) return;
    const target = event.target as Element;
    if (target.closest('a,button,input,select,textarea,summary,video,audio,iframe,[contenteditable]')) return;
    if (getSelection()?.toString()) return;
    // Blank code/table paper can turn too; their actual text and local scrollbars keep native input.
    const port = target.closest<HTMLElement>('pre > code,.table-wrapper,.katex-display');
    if (port) {
      const rect = port.getBoundingClientRect();
      if (event.clientX >= rect.left + port.clientLeft + port.clientWidth ||
          event.clientY >= rect.top + port.clientTop + port.clientHeight) return;
    }
    const box = main.getBoundingClientRect();
    // Overflow text still has Range rects outside its clipped viewport. It is not painted paper.
    if (event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      while (walker.nextNode()) {
        if (!walker.currentNode.textContent?.trim()) continue;
        range.selectNodeContents(walker.currentNode);
        if (![...range.getClientRects()].some((r) => event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom)) continue;
        let painted = true;
        for (let ancestor = walker.currentNode.parentElement; ancestor && ancestor !== main; ancestor = ancestor.parentElement) {
          const style = getComputedStyle(ancestor), rect = ancestor.getBoundingClientRect();
          if ((style.overflowX !== 'visible' && (event.clientX < rect.left || event.clientX > rect.right)) ||
              (style.overflowY !== 'visible' && (event.clientY < rect.top || event.clientY > rect.bottom))) { painted = false; break; }
        }
        if (painted) return;
      }
    }
    turn((event.clientX < box.left + box.width / 2) !== rtl ? -1 : 1);
  }, { signal });

  // Expanded native details can add columns without changing the fixed main viewport dimensions.
  // Keep the disclosure on screen rather than scaling its old ratio into a different spread.
  main.addEventListener('toggle', (event) => {
    if (!(event.target instanceof HTMLDetailsElement)) return;
    measureHeadings();
    measureScrollPorts();
    if (!paged()) return;
    const summary = event.target.querySelector('summary');
    if (!summary) return;
    cancelTurn();
    fragmentPending = false;
    restorePending = false;
    show(spreadOf(summary));
    remember();
  }, { capture: true, signal });

  // Column count depends on fonts and images, so settle again once they have loaded; then fold
  // in from the chapter this one was entered from. The chapter's fonts are requested by the next
  // style pass, and document.fonts.ready resolves early while none is pending, so wait a frame and
  // then until no font is loading.
  const fontsLoaded = async () => {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    while (document.fonts.status === 'loading') await document.fonts.ready;
  };
  void Promise.all([fontsLoaded(), ...[...main.querySelectorAll<HTMLImageElement>('img')].map(image => image.decode().catch(() => undefined))]).then(async () => {
    if (disposed) return;
    settleFonts();
    restoreScroll();
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    if (disposed) return;
    const arrival = entering;
    entering = undefined;
    if (arrival && paged() && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const after = paper.sheets();
      const before = arrival.sheets;
      if (before.length === after.length && before.every((sheet, i) =>
        Math.abs(parseFloat(sheet.style.width) - parseFloat(after[i]!.style.width)) <= 2 &&
        Math.abs(parseFloat(sheet.style.height) - parseFloat(after[i]!.style.height)) <= 2)) {
        paper.show(before, after, arrival.direction, () => { if (paper.measurementPending) settleFonts(); });
      }
    }
    // Names the page it belongs to: in-app navigation changes the URL before the next chapter binds.
    html.dataset.chapterReady = location.pathname;
  });
  addEventListener('load', () => { paper.fontChanged(); settleFonts(); }, { signal });
  // Fonts loaded later (math, UI) can change pagination without resizing the column viewport.
  document.fonts.addEventListener('loadingdone', () => { paper.fontChanged(); settleFonts(); }, { signal });
  addEventListener('resize', settle, { signal });
  addEventListener('scroll', () => { if (paper.active) settle(); }, { passive: true, signal });
  let observedWidth = main.clientWidth, observedHeight = main.clientHeight;
  const resize = new ResizeObserver(() => {
    const changed = observedWidth !== main.clientWidth || observedHeight !== main.clientHeight;
    observedWidth = main.clientWidth; observedHeight = main.clientHeight;
    if (changed) settle();
  });
  resize.observe(main);
  observers.push(resize);
  addEventListener('hashchange', () => { fragmentPending = true; restorePending = false; settle(); }, { signal });
  addEventListener('pagehide', () => { remember(); cancelTurn(); }, { signal });

  // Links to this edition's magic pages stay in the app; same-page fragments stay native
  // (hashchange); another edition loads its page (mdBook's search binds once per page).
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
    if (!link || link.target || link.hasAttribute('download')) return;
    const target = new URL(link.href);
    if (target.origin !== location.origin || !target.pathname.startsWith(magicUrl(lang))) return;
    if (link.closest('#sidebar .chapter')) {
      event.preventDefault();
      remember();
      // Choosing a chapter means its beginning, even when it is already open.
      const destination = lang + ':' + target.pathname.slice(magicUrl(lang).length);
      prefs.positions = { ...prefs.positions, [destination]: 0 };
      save();
      if (target.pathname === location.pathname) {
        cancelTurn();
        fragmentPending = false;
        restorePending = false;
        show(0);
        scrollTo(0, 0);
      }
      ctx.navigate(target.pathname);
      return;
    }
    if (target.pathname === location.pathname && target.search === location.search) return;
    event.preventDefault();
    remember();
    ctx.navigate(target.pathname + target.search + target.hash);
  }, { signal });

  // Capture phase: arrows turn a page, not the whole chapter.
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const target = e.target as Element;
    if (target.closest('input, textarea, select, button, a, dialog, [contenteditable]')) return;
    if (['ArrowLeft', 'ArrowRight', 'PageDown', 'PageUp', ' '].includes(e.key) && target.closest('pre > code,.table-wrapper,.katex-display')) {
      e.stopImmediatePropagation();
      return;
    }
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight', back = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === forward || (paged() && (e.key === 'PageDown' || e.key === ' '))) turn(1);
    else if (e.key === back || (paged() && e.key === 'PageUp')) turn(-1);
    else return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, { capture: true, signal });

  /** Changes reading text by `delta`, within 0.7 to 1.5, without enlarging the navigation. */
  function scale(delta: number) {
    prefs.scale = Math.round(Math.min(1.5, Math.max(0.7, (prefs.scale ?? 1) + delta)) * 10) / 10;
    save();
    html.style.setProperty('--reader-scale', String(prefs.scale));
    settle();
  }
  $('text-smaller').addEventListener('click', () => scale(-0.1), { signal });
  $('text-larger').addEventListener('click', () => scale(0.1), { signal });

  // Bookmarks are chapters, kept by their path inside the edition so they work in every language.
  const bookmarkButton = $('bookmark-toggle');
  const marked = () => prefs.bookmarks.some((b) => b.page === page);
  /** Redraws the bookmark button, count and dialog list from prefs. */
  function renderBookmarks() {
    label(bookmarkButton, marked() ? 'Bookmarked' : 'Add bookmark');
    bookmarkButton.setAttribute('aria-pressed', String(marked()));
    bookmarkButton.querySelector('i')!.className = marked() ? 'fa fa-bookmark' : 'fa fa-bookmark-o';
    $('bookmark-label').textContent = t(marked() ? 'Bookmarked' : 'Add bookmark');
    $('bookmark-count').textContent = String(prefs.bookmarks.length);
    $('bookmark-list').replaceChildren(...prefs.bookmarks.map((b) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = magicUrl(lang, b.page);
      link.textContent = b.title;
      link.addEventListener('click', () => dialog.close());
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'bookmark-remove';
      remove.innerHTML = '<i class="fa fa-trash-o" aria-hidden="true"></i>';
      label(remove, 'Remove bookmark');
      remove.addEventListener('click', () => {
        prefs.bookmarks = prefs.bookmarks.filter((x) => x !== b);
        save();
        renderBookmarks();
      });
      item.append(link, remove);
      return item;
    }));
    $('bookmarks').classList.toggle('is-empty', prefs.bookmarks.length === 0);
  }
  bookmarkButton.addEventListener('click', () => {
    const heading = main.querySelector('h1')?.textContent?.trim() || document.title;
    prefs.bookmarks = marked()
      ? prefs.bookmarks.filter((b) => b.page !== page)
      : [...prefs.bookmarks, { page, title: heading }];
    save();
    renderBookmarks();
  }, { signal });
  const dialog = $<HTMLDialogElement>('bookmarks');
  dialog.addEventListener('keydown', (e) => e.stopPropagation(), { signal });
  $('bookmarks-open').addEventListener('click', () => dialog.showModal(), { signal });
  $('bookmarks-close').addEventListener('click', () => dialog.close(), { signal });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); }, { signal });
  renderBookmarks();

  return () => {
    disposed = true;
    remember();
    cancelTurn();
    controller.abort();
    observers.forEach((observer) => observer.disconnect());
    main.parentElement!.querySelector(':scope > .paper-fold-renderer')?.remove();
    html.removeAttribute('data-chapter-ready');
  };
}
