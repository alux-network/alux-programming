// Keeps media alive while native mdBook chapter documents load in a stable, double-buffered frame.
// The shell owns no book content or pagination model. A ready chapter replaces the old visible one.
interface ShellBridge {
  navigate: (url: string, replace?: boolean) => boolean;
  ready: (chapter: Window) => void;
  sync: (chapter: Window) => void;
  audio: HTMLAudioElement;
}
declare global { interface Window { aluxReaderShell?: ShellBridge } }

export function chapterShell(): ShellBridge | undefined {
  try {
    return window.parent !== window && window.frameElement?.id.startsWith('reading-frame')
      ? window.parent.aluxReaderShell : undefined;
  } catch { return undefined; }
}

/** Returns true when this document has become the shell rather than a bound chapter. */
export function mountReaderShell(): boolean {
  if (window.parent !== window || document.documentElement.hasAttribute('data-print') ||
      new URL(location.href).searchParams.get('reader') === 'native' || /\/(?:print|toc|404)\.html$/.test(location.pathname)) return false;
  const audio = document.getElementById('music') as HTMLAudioElement | null;
  if (!audio) return false;
  let active: HTMLIFrameElement | undefined;
  let pending: HTMLIFrameElement | undefined;
  let pendingReplace = true;
  let fallback: ReturnType<typeof setTimeout>;
  let serial = 0;
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
    if (url.href !== location.href) history.replaceState({ aluxReader: true }, '', url.href);
    if (doc.documentElement.hasAttribute('data-gateway')) audio.pause();
  };
  const ready = (chapter: Window) => {
    if (chapter === active?.contentWindow && !pending) { sync(chapter); return; }
    if (chapter !== pending?.contentWindow) return;
    clearTimeout(fallback);
    const previous = active;
    const previousWindow = previous?.contentWindow;
    if (previousWindow && previousWindow.document.documentElement.dataset.world === 'magic' &&
        previousWindow.document.documentElement.dataset.reading !== 'scroll' &&
        chapter.document.documentElement.dataset.world === 'magic' && chapter.document.documentElement.dataset.reading !== 'scroll') {
      chapter.scrollTo(0, previousWindow.scrollY);
    }
    active = pending;
    pending = undefined;
    const url = canonical(chapter.location.href);
    if (pendingReplace) history.replaceState({ aluxReader: true }, '', url.href);
    else history.pushState({ aluxReader: true }, '', url.href);
    active.classList.remove('pending-chapter');
    active.inert = false;
    active.removeAttribute('aria-hidden');
    chapter.focus();
    document.body.removeAttribute('aria-busy');
    // Give the departing reader its ordinary progress/cleanup event while the shared audio survives.
    previous?.contentWindow?.dispatchEvent(new PageTransitionEvent('pagehide'));
    previous?.remove();
    sync(chapter);
  };
  const navigate = (target: string, replace = false) => {
    const url = canonical(target);
    if (url.origin !== location.origin || !url.pathname.endsWith('.html') || /\/(?:print|toc|404)\.html$/.test(url.pathname)) return false;
    if (active?.contentWindow && canonical(active.contentWindow.location.href).href === url.href && !pending) return true;
    if (pending) { pending.contentWindow?.dispatchEvent(new PageTransitionEvent('pagehide')); pending.remove(); }
    clearTimeout(fallback);
    pendingReplace = replace;
    pending = document.createElement('iframe');
    pending.id = 'reading-frame-' + ++serial;
    pending.name = 'alux-chapter';
    pending.title = 'ALUX Programming';
    pending.className = 'chapter-frame pending-chapter';
    pending.inert = true;
    pending.setAttribute('allow', 'autoplay; fullscreen');
    pending.setAttribute('aria-hidden', 'true');
    pending.src = url.href;
    document.body.setAttribute('aria-busy', 'true');
    document.body.append(pending);
    // Native documents remain usable if the enhancement fails to initialize.
    fallback = setTimeout(() => {
      url.searchParams.set('reader', 'native');
      location.replace(url.href);
    }, 15000);
    return true;
  };
  window.aluxReaderShell = { navigate, ready, sync, audio };
  audio.id = 'persistent-music';
  document.body.replaceChildren(audio);
  document.body.className = 'reader-shell';
  const html = document.documentElement;
  html.classList.remove('sidebar-visible', 'sidebar-hidden');
  html.removeAttribute('data-gateway');
  html.removeAttribute('data-world');
  html.removeAttribute('data-shell-loading');
  html.dataset.readerShell = '';
  addEventListener('popstate', () => navigate(location.href, true));
  addEventListener('pagehide', () => audio.pause());
  navigate(location.href, true);
  return true;
}
