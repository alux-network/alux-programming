// Keeps media alive while native mdBook chapter documents load in a stable, double-buffered frame.
// The shell owns no book content or pagination model. A ready chapter replaces the old visible one.
import { acceptsReady, transition, transitionState } from './reader-transition.ts';
import type { ReaderView } from './reader-transition.ts';

interface PaperView {
  view: () => ReaderView;
  capture: () => HTMLElement[];
  enter: (sheets: HTMLElement[], direction: number) => void;
  activate: () => void;
}
interface ShellBridge {
  navigate: (url: string, replace?: boolean, direction?: number) => boolean;
  redirect: (chapter: Window, url: string) => boolean;
  ready: (chapter: Window) => void;
  sync: (chapter: Window) => void;
  audio: HTMLAudioElement;
  invalidate: (chapter: Window) => void;
  isActive: (chapter: Window) => boolean;
}
declare global { interface Window { aluxReaderShell?: ShellBridge; aluxPaperView?: PaperView } }

export function chapterShell(): ShellBridge | undefined {
  try {
    return window.parent !== window && window.frameElement?.id.startsWith('reading-frame')
      ? window.parent.aluxReaderShell : undefined;
  } catch { return undefined; }
}

/** Returns true when this document has become the shell rather than a bound chapter. */
export function mountReaderShell(): boolean {
  // The real world is mdBook's own page: its links, history and scrolling stay native.
  if (window.parent !== window || document.documentElement.dataset.world !== 'magic' || document.documentElement.hasAttribute('data-print') ||
      new URL(location.href).searchParams.get('reader') === 'native' || /\/(?:print|toc|404)\.html$/.test(location.pathname)) return false;
  // A generated error document may be served at an unsupported requested pathname.
  if (!location.pathname.endsWith('/') && !location.pathname.endsWith('.html')) return false;
  const audio = document.getElementById('music') as HTMLAudioElement | null;
  if (!audio) return false;
  let active: HTMLIFrameElement | undefined;
  let pending: HTMLIFrameElement | undefined;
  let pendingReplace = true;
  let fallback: ReturnType<typeof setTimeout>;
  let armFallback = () => {};
  let state = transitionState({ world: document.documentElement.dataset.world === 'magic' ? 'magic' : 'real',
    mode: document.documentElement.dataset.reading === 'scroll' ? 'scroll' : 'pages', chapter: location.href, progress: 0 });
  let pendingDirection = 1;
  let historyIndex = Number.isInteger(history.state?.aluxReaderIndex) ? history.state.aluxReaderIndex as number : 0;
  let activeIndex = historyIndex;
  history.replaceState({ aluxReader: true, aluxReaderIndex: historyIndex }, '', location.href);
  let restoringHistory = false;
  let deferredNavigation: { target: string; replace: boolean; direction: number } | undefined;
  const tokens = new WeakMap<Window, number>();
  const canonical = (url: string) => {
    const value = new URL(url, location.href);
    value.searchParams.delete('reader');
    if (value.pathname.endsWith('/')) value.pathname += 'index.html';
    return value;
  };
  const sync = (chapter: Window) => {
    if (chapter !== active?.contentWindow) return;
    const doc = chapter.document;
    document.title = doc.title;
    active!.title = doc.title;
    document.documentElement.lang = doc.documentElement.lang;
    const icon = doc.querySelector<HTMLLinkElement>('link[rel="icon"]');
    const own = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (icon && own) own.href = icon.href;
    const url = canonical(chapter.location.href);
    if (historyIndex === activeIndex && url.href !== location.href) {
      history.replaceState({ aluxReader: true, aluxReaderIndex: activeIndex }, '', url.href);
    }
    if (doc.documentElement.hasAttribute('data-gateway')) audio.pause();
  };
  const ready = async (chapter: Window) => {
    // An iframe's WindowProxy survives native same-chapter document replacement.
    if (chapter === active?.contentWindow) {
      if (pending) invalidate(chapter);
      chapter.aluxPaperView?.activate();
      sync(chapter);
      return;
    }
    const token = tokens.get(chapter);
    if (chapter !== pending?.contentWindow || token === undefined || !acceptsReady(state, token)) return;

    const previous = active;
    const previousWindow = previous?.contentWindow;
    if (previousWindow && previousWindow.document.documentElement.lang === chapter.document.documentElement.lang &&
        previousWindow.document.documentElement.dir === chapter.document.documentElement.dir &&
        previousWindow.document.documentElement.dataset.world === 'magic' &&
        previousWindow.document.documentElement.dataset.reading !== 'scroll' &&
        chapter.document.documentElement.dataset.world === 'magic' && chapter.document.documentElement.dataset.reading !== 'scroll') {
      chapter.scrollTo(0, previousWindow.scrollY);
      // Restoration scroll events must finish before they can invalidate an active fold.
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (chapter !== pending?.contentWindow || !acceptsReady(state, token)) return;
      const before = previousWindow.aluxPaperView?.capture();
      if (before) chapter.aluxPaperView?.enter(before, pendingDirection);
    }
    // Keep the committed chapter on screen while the new renderer paints its closed pose.
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    if (chapter !== pending?.contentWindow || !acceptsReady(state, token)) return;
    state = transition(state, { type: 'ready', token, progress: chapter.aluxPaperView?.view().progress });
    clearTimeout(fallback);
    // Only the committed departing reader may save its final progress.
    previousWindow?.dispatchEvent(new PageTransitionEvent('pagehide'));
    active = pending;
    pending = undefined;
    const url = canonical(state.view.chapter);
    activeIndex = pendingReplace ? historyIndex : historyIndex + 1;
    historyIndex = activeIndex;
    if (pendingReplace) history.replaceState({ aluxReader: true, aluxReaderIndex: activeIndex }, '', url.href);
    else history.pushState({ aluxReader: true, aluxReaderIndex: activeIndex }, '', url.href);
    active.classList.remove('pending-chapter');
    active.inert = false;
    active.removeAttribute('aria-hidden');
    chapter.aluxPaperView?.activate();
    chapter.focus();
    document.body.removeAttribute('aria-busy');
    previous?.remove();
    sync(chapter);
  };
  const navigate = (target: string, replace = false, direction = 1) => {
    const url = canonical(target);
    if (url.origin !== location.origin || !url.pathname.endsWith('.html') || /\/(?:print|toc|404)\.html$/.test(url.pathname)) return false;
    // A new link is a push from the visible chapter, even while Back is preparing.
    if (!replace && !restoringHistory && active?.contentWindow && historyIndex !== activeIndex) {
      invalidate(active.contentWindow);
    }
    if (restoringHistory) {
      deferredNavigation = { target, replace, direction };
      return true;
    }
    if (active?.contentWindow && canonical(active.contentWindow.location.href).href === url.href) {
      activeIndex = historyIndex;
      invalidate(active.contentWindow);
      return true;
    }
    if (pending && canonical(pending.src).href === url.href) {
      pendingReplace = replace;
      pendingDirection = direction;
      return true;
    }
    if (pending) { pending.contentWindow?.dispatchEvent(new PageTransitionEvent('pagehide')); pending.remove(); }
    clearTimeout(fallback);
    pendingReplace = replace;
    pendingDirection = direction;
    state = transition(state, { type: 'begin', view: { ...(active?.contentWindow?.aluxPaperView?.view() ?? state.view), chapter: url.href, progress: 0 } });
    pending = document.createElement('iframe');
    pending.id = 'reading-frame-' + state.pending!.token;
    pending.name = 'alux-chapter';
    pending.title = 'ALUX Programming';
    pending.className = 'chapter-frame pending-chapter';
    pending.inert = true;
    pending.setAttribute('allow', 'autoplay; fullscreen');
    pending.setAttribute('aria-hidden', 'true');
    pending.src = url.href;
    document.body.setAttribute('aria-busy', 'true');
    document.body.append(pending);
    tokens.set(pending.contentWindow!, state.pending!.token);
    // Native documents remain usable if the enhancement fails to initialize.
    const token = state.pending!.token;
    armFallback = () => {
      clearTimeout(fallback);
      if (document.hidden || !acceptsReady(state, token)) return;
      fallback = setTimeout(() => {
        if (document.hidden || !acceptsReady(state, token)) return;
        url.searchParams.set('reader', 'native');
        if (pendingReplace) location.replace(url.href);
        else location.assign(url.href);
      }, 15000);
    };
    armFallback();
    return true;
  };
  const invalidate = (chapter: Window) => {
    if (chapter !== active?.contentWindow) return;
    deferredNavigation = undefined;
    state = transition(state, { type: 'replace', view: chapter.aluxPaperView!.view() });
    clearTimeout(fallback);
    pending?.contentWindow?.dispatchEvent(new PageTransitionEvent('pagehide'));
    pending?.remove();
    pending = undefined;
    document.body.removeAttribute('aria-busy');
    // Undo a cancelled traversal without overwriting the entry the browser selected.
    if (historyIndex !== activeIndex) {
      if (!restoringHistory) {
        restoringHistory = true;
        history.go(activeIndex - historyIndex);
      }
    } else sync(chapter);
  };
  /** Retargets preparation without changing its history intent; committed redirects replace their own entry. */
  const redirect = (chapter: Window, target: string) => {
    if (chapter === pending?.contentWindow) return navigate(target, pendingReplace, pendingDirection);
    if (chapter === active?.contentWindow && !pending) return navigate(target, true);
    // A discarded or superseded document cannot redirect the retained reader.
    return true;
  };
  window.aluxReaderShell = { navigate, redirect, ready, sync, audio, invalidate, isActive: chapter => chapter === active?.contentWindow };
  audio.id = 'persistent-music';
  document.body.replaceChildren(audio);
  document.body.className = 'reader-shell';
  const html = document.documentElement;
  html.classList.remove('sidebar-visible', 'sidebar-hidden');
  html.removeAttribute('data-gateway');
  html.removeAttribute('data-world');
  html.removeAttribute('data-shell-loading');
  html.dataset.readerShell = '';
  // Print a static chapter in the top document: a viewport-sized iframe clips its
  // contents in browser Print. The live chapter and its media stay untouched.
  let printChapter: HTMLElement | undefined;
  let restorePrintPosition = () => {};
  addEventListener('beforeprint', () => {
    if (printChapter) return;
    const source = active?.contentDocument;
    printChapter = source?.getElementById('content')?.cloneNode(true) as HTMLElement | undefined;
    if (!printChapter || !source) return;
    const chapter = active!.contentWindow!, left = chapter.scrollX, top = chapter.scrollY;
    restorePrintPosition = () => { if (chapter === active?.contentWindow) chapter.scrollTo(left, top); };
    printChapter.classList.add('chapter-print');
    printChapter.lang = source.documentElement.lang;
    printChapter.dir = source.documentElement.dir;
    // Do not create another player merely by opening print preview.
    for (const media of printChapter.querySelectorAll('iframe,video,audio')) {
      const link = document.createElement('a');
      link.href = new URL(media.getAttribute('src') || '.', source.baseURI).href;
      link.textContent = media.getAttribute('title') || link.href;
      media.replaceWith(link);
    }
    for (const element of printChapter.querySelectorAll('[src],[href]')) {
      for (const attribute of ['src', 'href']) {
        const value = element.getAttribute(attribute);
        if (value) element.setAttribute(attribute, new URL(value, source.baseURI).href);
      }
    }
    document.body.append(printChapter);
  });
  addEventListener('afterprint', () => {
    printChapter?.remove(); printChapter = undefined;
    const restore = restorePrintPosition, media = matchMedia('print');
    const resume = () => { if (!media.matches) { media.removeEventListener('change', resume); requestAnimationFrame(restore); } };
    media.addEventListener('change', resume);
    resume();
  });
  addEventListener('popstate', event => {
    if (Number.isInteger(event.state?.aluxReaderIndex)) historyIndex = event.state.aluxReaderIndex;
    else {
      // A native fragment change adds a same-document position outside navigate().
      historyIndex++;
      history.replaceState({ aluxReader: true, aluxReaderIndex: historyIndex }, '', location.href);
    }
    if (restoringHistory && historyIndex === activeIndex) {
      restoringHistory = false;
      if (active?.contentWindow) sync(active.contentWindow);
      const deferred = deferredNavigation;
      deferredNavigation = undefined;
      if (deferred) navigate(deferred.target, deferred.replace, deferred.direction);
      return;
    }
    restoringHistory = false;
    deferredNavigation = undefined;
    navigate(location.href, true);
  });
  addEventListener('pagehide', () => audio.pause());
  // Hidden documents suspend paint readiness; allow a full visible deadline on return.
  document.addEventListener('visibilitychange', () => {
    clearTimeout(fallback);
    if (!document.hidden) armFallback();
  });
  navigate(location.href, true);
  return true;
}
