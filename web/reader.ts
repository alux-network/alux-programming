// ALUX reader: worlds, the magic book, text size, bookmarks, music and languages.
//
// The markup lives in theme/index.hbs; this module only binds it. In the magic world the chapter
// is laid out by CSS columns (two per spread) and a page turn scrolls one spread.
//
// Bundled by Vite to /reader.js and loaded by every page as a module, after mdBook's own scripts.
// Element ids used here are defined in theme/index.hbs; renaming one means changing both. State:
// - localStorage 'alux-reader' (Prefs): world, text scale, music on/off and bookmarks; shared by all
//   editions, since they are served from one origin.
// - sessionStorage 'alux-entered': the gateway was passed in this tab.
// - sessionStorage 'alux-music-time': music position handed to the next page.
// - <html data-world | data-gateway | data-turn> and --reader-scale: what theme/reader.css reads.
import { uiStrings } from './i18n.ts';
import type { Language } from './languages.ts';
import { languages } from './languages.ts';

// Set by mdBook's page template.
declare const path_to_root: string;

type World = 'magic' | 'real';
interface Bookmark {
  page: string;
  title: string;
}
interface Prefs {
  world?: World;
  scale?: number;
  music?: boolean;
  bookmarks: Bookmark[];
}

const html = document.documentElement;
// Elements by id; the template guarantees they exist on every page.
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const lang = (languages.find((l) => l.code === html.lang)?.code ?? 'en') as Language;
// The UI label for the English `key` in this edition's language.
const t = (key: string): string => uiStrings[lang]?.[key] ?? key;
const rtl = html.dir === 'rtl';

// The page template's head applies these before first paint; this module keeps them.
function load(): Prefs {
  try {
    return { bookmarks: [], ...JSON.parse(localStorage.getItem('alux-reader') ?? '{}') };
  } catch {
    return { bookmarks: [] };
  }
}
const prefs = load();
const save = () => {
  try { localStorage.setItem('alux-reader', JSON.stringify(prefs)); } catch {}
};

// Edition root (".../de/") and this page's path inside it, shared by every edition.
const root = new URL(path_to_root || './', location.href).pathname;
const site = lang === 'en' ? root : root.slice(0, -(lang.length + 1));
const page = location.pathname.slice(root.length) || 'index.html';

// Template labels are written in English and marked with data-i18n; translate them in place.
for (const el of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
  if (el.title) el.title = t(el.title);
  const aria = el.getAttribute('aria-label');
  if (aria) el.setAttribute('aria-label', t(aria));
  if (el instanceof HTMLInputElement && el.placeholder) el.placeholder = t(el.placeholder);
  if (el.children.length === 0 && el.textContent?.trim()) el.textContent = t(el.textContent.trim());
}

function label(el: HTMLElement, key: string) {
  el.title = t(key);
  el.setAttribute('aria-label', t(key));
}

// The language picker: the same page in another edition (chapter paths are equal in all editions).
for (const picker of document.querySelectorAll<HTMLSelectElement>('.language-picker')) {
  picker.append(...languages.map((l) => new Option(l.name, l.code, false, l.code === lang)));
  picker.addEventListener('change', () => {
    location.href = site + (picker.value === 'en' ? '' : picker.value + '/') + page + location.hash;
  });
}

// The gateway (index page only) asks for a world once per tab; #worlds brings it back.
const gateway = $('gateway');
if (gateway) {
  for (const choice of gateway.querySelectorAll<HTMLElement>('[data-world]')) {
    choice.addEventListener('click', () => {
      try { sessionStorage.setItem('alux-entered', '1'); } catch {}
      delete html.dataset.gateway;
      if (location.hash === '#worlds') history.replaceState(null, '', location.pathname);
      setWorld(choice.dataset.world as World);
    });
  }
  $('welcome-play').addEventListener('click', () => $<HTMLAudioElement>('welcome-audio').play());
  addEventListener('hashchange', () => {
    if (location.hash === '#worlds') html.dataset.gateway = '';
  });
}

const main = document.querySelector<HTMLElement>('main.leaves')!;
const folio = $('folio');
const pageNumbers = document.querySelectorAll('.page-number');
// The running head names the part the chapter belongs to, as the table of contents lists it.
const active = document.querySelector('#sidebar a.active')?.closest('li.chapter-item');
let part = active?.previousElementSibling;
while (part && !part.matches('.part-title')) part = part.previousElementSibling;
for (const head of document.querySelectorAll('.running-part')) {
  head.textContent = part?.textContent ?? t('Welcome');
}
const magic = () => html.dataset.world === 'magic';
const chapterLink = (rel: string) =>
  document.querySelector<HTMLAnchorElement>(`.nav-wide-wrapper a[rel~="${rel}"]`)?.href;
// Paging geometry, measured from the laid-out columns. A spread is one viewport of `main`: two
// columns (one on narrow screens) plus the gap that follows them.
const gap = () => parseFloat(getComputedStyle(main).columnGap) || 0;
const step = () => main.clientWidth + gap();
const spreads = () => Math.max(1, Math.round((main.scrollWidth + gap()) / step()));
const perSpread = () => (getComputedStyle(main).columnCount === '1' ? 1 : 2);
// The spread on screen, 0-based.
let spread = 0;

/** Scrolls to spread `index` (clamped) and updates the folio, page numbers and turn buttons. */
function show(index: number) {
  spread = Math.max(0, Math.min(index, spreads() - 1));
  // Right-to-left columns flow leftwards, with negative scrollLeft.
  main.scrollLeft = (rtl ? -1 : 1) * spread * step();
  const per = perSpread(), first = spread * per + 1, total = spreads() * per;
  folio.textContent = per === 1 ? `${first} / ${total}` : `${first}–${first + 1} / ${total}`;
  pageNumbers.forEach((number, i) => { number.textContent = String(first + i); });
  $('page-prev-label').textContent = t(spread === 0 ? 'Previous chapter' : 'Previous page');
  $('page-next-label').textContent = t(spread === spreads() - 1 ? 'Next chapter' : 'Next page');
  $<HTMLButtonElement>('page-prev').disabled = spread === 0 && !chapterLink('prev');
  $<HTMLButtonElement>('page-next').disabled = spread === spreads() - 1 && !chapterLink('next');
}

/** The spread that shows `el`. */
function spreadOf(el: Element) {
  const box = main.getBoundingClientRect(), at = el.getBoundingClientRect();
  return spread + Math.floor((rtl ? box.right - at.right : at.left - box.left) / step());
}

/** Turns `delta` spreads; past either end it goes to the neighboring chapter (#last-page = its end). */
function turn(delta: number) {
  const next = spread + delta;
  if (next >= spreads()) {
    const href = chapterLink('next');
    if (href) location.href = href;
  } else if (next < 0) {
    const href = chapterLink('prev');
    if (href) location.href = href + '#last-page';
  } else if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    html.dataset.turn = delta > 0 ? 'forward' : 'back';
    document.startViewTransition(() => show(next)).finished.finally(() => delete html.dataset.turn);
  } else {
    show(next);
  }
}

/** Re-places the reader after layout changes: on #last-page, on a #heading's spread, or where it was. */
function settle() {
  if (!magic()) return;
  if (location.hash === '#last-page') return show(spreads() - 1);
  const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  show(target ? spreadOf(target) : spread);
}

/** Switches world; reader.css lays out the page from html[data-world]. */
function setWorld(world: World) {
  prefs.world = world;
  save();
  html.dataset.world = world;
  $('world-toggle-label').textContent = t(world === 'magic' ? 'Real world' : 'Magic world');
  spread = 0;
  settle();
}

setWorld(html.dataset.world as World);
$('world-toggle').addEventListener('click', () => setWorld(magic() ? 'real' : 'magic'));
$('page-prev').addEventListener('click', () => turn(-1));
$('page-next').addEventListener('click', () => turn(1));
// Column count depends on fonts and images, so settle again once they have loaded.
document.fonts.ready.then(settle);
addEventListener('load', settle);
addEventListener('resize', () => magic() && show(spread));
addEventListener('hashchange', settle);

// Capture phase: in the magic world arrows turn a page, not mdBook's whole chapter.
document.addEventListener('keydown', (e) => {
  if (!magic() || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  if ((e.target as Element).closest('input, textarea, select, dialog')) return;
  const forward = rtl ? 'ArrowLeft' : 'ArrowRight', back = rtl ? 'ArrowRight' : 'ArrowLeft';
  if (e.key === forward || e.key === 'PageDown' || e.key === ' ') turn(1);
  else if (e.key === back || e.key === 'PageUp') turn(-1);
  else return;
  e.preventDefault();
  e.stopImmediatePropagation();
}, true);

/** Changes the text size by `delta`, within 0.8 to 1.6; reader.css multiplies font sizes by it. */
function scale(delta: number) {
  prefs.scale = Math.round(Math.min(1.6, Math.max(0.8, (prefs.scale ?? 1) + delta)) * 10) / 10;
  save();
  html.style.setProperty('--reader-scale', String(prefs.scale));
  settle();
}
$('text-smaller').addEventListener('click', () => scale(-0.1));
$('text-larger').addEventListener('click', () => scale(0.1));

// Bookmarks are chapters, kept by their path inside the edition so they work in every language.
const bookmarkButton = $('bookmark-toggle');
const marked = () => prefs.bookmarks.some((b) => b.page === page);
/** Redraws the bookmark button, count and dialog list from prefs. */
function renderBookmarks() {
  bookmarkButton.setAttribute('aria-pressed', String(marked()));
  bookmarkButton.querySelector('i')!.className = marked() ? 'fa fa-bookmark' : 'fa fa-bookmark-o';
  $('bookmark-label').textContent = t(marked() ? 'Bookmarked' : 'Add bookmark');
  $('bookmark-count').textContent = String(prefs.bookmarks.length);
  $('bookmark-list').replaceChildren(...prefs.bookmarks.map((b) => {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = root + b.page;
    link.textContent = b.title;
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
  const title = main.querySelector('h1')?.textContent?.trim() || document.title;
  prefs.bookmarks = marked()
    ? prefs.bookmarks.filter((b) => b.page !== page)
    : [...prefs.bookmarks, { page, title }];
  save();
  renderBookmarks();
});
// A button, not `<form method="dialog">`: mdBook's search cancels every form submit. Its
// shortcuts also cancel Escape, so keys stay inside the open dialog and Escape closes it natively.
const dialog = $<HTMLDialogElement>('bookmarks');
dialog.addEventListener('keydown', (e) => e.stopPropagation());
$('bookmarks-open').addEventListener('click', () => dialog.showModal());
$('bookmarks-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
renderBookmarks();

// Reading music continues across pages: its position is handed over on navigation.
const music = $<HTMLAudioElement>('music');
const musicButton = $('music-toggle');
/** Shows the music button as playing or paused. */
function renderMusic() {
  musicButton.setAttribute('aria-pressed', String(!music.paused));
  label(musicButton, music.paused ? 'Play music' : 'Pause music');
}
music.addEventListener('play', renderMusic);
music.addEventListener('pause', renderMusic);
musicButton.addEventListener('click', () => {
  prefs.music = music.paused;
  save();
  if (prefs.music) music.play();
  else music.pause();
});
addEventListener('pagehide', () => {
  try { sessionStorage.setItem('alux-music-time', String(music.currentTime)); } catch {}
});
if (prefs.music) {
  let resume = 0;
  try { resume = Number(sessionStorage.getItem('alux-music-time')) || 0; } catch {}
  music.addEventListener('loadedmetadata', () => { music.currentTime = resume; }, { once: true });
  // Browsers may refuse to start audio before the reader interacts with the page.
  music.play().catch(() => {
    addEventListener('pointerdown', () => prefs.music && music.play(), { once: true });
  });
}
