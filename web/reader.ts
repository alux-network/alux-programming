// ALUX reader: worlds, the magic book, text size, bookmarks, music and languages.
//
// The markup lives in theme/index.hbs; this module only binds it. In the magic world the chapter
// is laid out by CSS columns (two per spread) and a page turn scrolls one spread.
//
// Bundled by Vite to /reader.js and loaded by every page as a module, after mdBook's own scripts.
// Element ids used here are defined in theme/index.hbs; renaming one means changing both. State:
// - localStorage 'alux-reader' (Prefs): world, text scale, music on/off and bookmarks; shared by all
//   editions, since they are served from one origin.
// - Prefs also keeps the last entrance language and per-edition chapter progress.
// - sessionStorage 'alux-entered': the gateway was passed in this tab.
// - sessionStorage 'alux-music-time': music position handed to the next page.
// - <html data-world | data-gateway> and --reader-scale: what theme/reader.css reads.
import { uiStrings, musicCopy, musicHints, copyLabels } from './i18n.ts';
import { bindReadingMusic } from './reading-music.ts';
import type { MusicNoticeState } from './reading-music.ts';
import { chooseEntranceLanguage, bindWelcome } from './entrance.ts';
import { paperTurn } from './paper-turn.ts';
import { mountReaderShell, chapterShell } from './reader-shell.ts';
import { saveNavigationHandoff, teardownNavigationHandoff } from './navigation-handoff.ts';
import type { Language } from './languages.ts';
import { languages, readerName } from './languages.ts';

// Set by mdBook's page template.
declare const path_to_root: string;

// Native deferred scripts finish binding before the outer document becomes the shell.
if (window.parent === window && !document.documentElement.hasAttribute('data-native-ready')) {
  document.addEventListener('alux-native-ready', () => { if (!mountReaderShell()) bindChapter(); }, { once: true });
} else if (!mountReaderShell()) bindChapter();

function bindChapter() {
const shell = chapterShell();
type World = 'magic' | 'real';
interface Bookmark {
  page: string;
  title: string;
}
interface Prefs {
  world?: World;
  mode?: 'pages' | 'scroll';
  language?: Language;
  positions?: Record<string, number>;
  scale?: number;
  music?: boolean;
  bookmarks: Bookmark[];
}

const html = document.documentElement;
const printing = html.hasAttribute('data-print');
// Elements by id; the template guarantees they exist on every page.
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const lang = (languages.find((l) => l.code === html.lang)?.code ?? 'en') as Language;
// The UI label for the English `key` in this edition's language.
const t = (key: string): string => uiStrings[lang]?.[key] ?? key;
const rtl = html.dir === 'rtl';

// The page template's head applies these before first paint; this module keeps them.
function load(): Prefs {
  try {
    const value = JSON.parse(localStorage.getItem('alux-reader') ?? '{}') as Partial<Prefs> | null;
    if (!value || typeof value !== 'object') return { bookmarks: [] };
    return {
      world: value.world === 'magic' ? 'magic' : 'real',
      mode: value.mode === 'scroll' ? 'scroll' : 'pages',
      language: languages.find((l) => l.code === value.language)?.code,
      scale: typeof value.scale === 'number' && Number.isFinite(value.scale)
        ? Math.min(1.5, Math.max(.7, value.scale)) : 1,
      music: typeof value.music === 'boolean' ? value.music : undefined,
      positions: Object.fromEntries(Object.entries(value.positions ?? {}).filter(
        ([, ratio]) => typeof ratio === 'number' && Number.isFinite(ratio) && ratio >= 0 && ratio <= 1)),
      bookmarks: Array.isArray(value.bookmarks) ? value.bookmarks.filter(
        (b): b is Bookmark => !!b && typeof b.page === 'string' && typeof b.title === 'string') : [],
    };
  } catch {
    return { bookmarks: [] };
  }
}
let readingMusic: ReturnType<typeof bindReadingMusic> | undefined;
const prefs = load();
html.style.setProperty('--reader-scale', String(prefs.scale ?? 1));
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

// Localize the native clipboard feedback without replacing mdBook's clipboard handler.
for (const button of document.querySelectorAll<HTMLButtonElement>('#content > .volume:not(.navigation-veil) > main pre .clip-button')) {
  const [action, success, failure] = copyLabels[lang];
  button.dataset.copyLabel = action;
  button.title = action;
  button.setAttribute('aria-label', action);
  const message = button.querySelector<HTMLElement>('.tooltiptext');
  if (!message) continue;
  let reset: ReturnType<typeof setTimeout>;
  new MutationObserver(() => {
    const text = message.textContent?.trim();
    if (text === 'Copied!' || text === 'Clipboard error!') {
      const translated = text === 'Copied!' ? success : failure;
      message.textContent = translated;
      button.dataset.copyLabel = translated;
      clearTimeout(reset);
      reset = setTimeout(() => { button.classList.remove('tooltipped'); button.dataset.copyLabel = action; },1800);
    } else if (!text) button.dataset.copyLabel = action;
  }).observe(message,{childList:true,characterData:true,subtree:true});
}

// The gateway's language picker: the same page in another edition (chapter paths are equal in all
// editions).
for (const picker of document.querySelectorAll<HTMLSelectElement>('.language-picker')) {
  picker.append(...languages.map((l) => new Option(l.name, l.code, false, l.code === lang)));
  picker.addEventListener('change', () => {
    prefs.language = picker.value as Language;
    save();
    const target = site + (picker.value === 'en' ? '' : picker.value + '/') + page + location.hash;
    if (!shell?.navigate(target)) location.href = target;
  });
}

// The toolbar's language menu, built like mdBook's theme menu: links to this page in every
// edition. The href is refreshed on click so it carries the current fragment.
const languageToggle = document.getElementById('language-toggle');
if (languageToggle) {
  const list = $('language-list');
  const editionUrl = (code: Language) => site + (code === 'en' ? '' : code + '/') + page + location.hash;
  const open = (on: boolean) => {
    list.style.display = on ? 'block' : 'none';
    languageToggle.setAttribute('aria-expanded', String(on));
  };
  $('language-name').textContent = languages.find((l) => l.code === lang)!.name;
  list.append(...languages.map((l) => {
    const item = document.createElement('li');
    item.setAttribute('role', 'none');
    const link = document.createElement('a');
    link.setAttribute('role', 'menuitem');
    link.className = l.code === lang ? 'theme theme-selected' : 'theme';
    link.lang = l.code;
    link.href = editionUrl(l.code);
    link.textContent = l.name;
    link.addEventListener('click', () => {
      link.href = editionUrl(l.code);
      prefs.language = l.code;
      save();
    });
    item.append(link);
    return item;
  }));
  languageToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    open(list.style.display !== 'block');
  });
  document.addEventListener('click', (e) => { if (!list.contains(e.target as Node)) open(false); });
  list.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    open(false);
    languageToggle.focus();
  });
}

const chapterTitle = document.title.replace(/ - [^-]+$/, '');
const brand = readerName(lang);
/** Presents a brand-only entrance title and a chapter title in the reader. */
function updateTitle() {
  document.title = page === 'index.html' || html.hasAttribute('data-gateway') ? brand : chapterTitle + ' · ' + brand;
}
updateTitle();
new MutationObserver(updateTitle).observe(html, { attributes: true, attributeFilter: ['data-gateway'] });
const themeToggle = $('theme-toggle');
/** Updates the one day/night control after mdBook applies its native theme. */
function renderTheme() {
  const dark = html.classList.contains('coal');
  themeToggle.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${dark
    ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>'
    : '<path d="M20.9 13A8.5 8.5 0 0 1 11 3.1 8.5 8.5 0 1 0 20.9 13Z"/>'}</svg>`;
  label(themeToggle, 'Change reading theme');
  themeToggle.setAttribute('aria-pressed', String(dark));
}
themeToggle.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopImmediatePropagation();
  const next = html.classList.contains('coal') ? 'light' : 'coal';
  $(next).click();
  renderTheme();
}, true);
renderTheme();

// The gateway (index page only) asks for a world once per tab; #worlds brings it back.
const gateway = $('gateway');
if (gateway) {
  for (const choice of gateway.querySelectorAll<HTMLElement>('[data-world]')) {
    choice.addEventListener('click', () => {
      try { sessionStorage.setItem('alux-entered', '1'); } catch {}
      delete html.dataset.gateway;
      $<HTMLAudioElement>('welcome-audio').pause();
      if (location.hash === '#worlds') history.replaceState(null, '', location.pathname);
      setWorld(choice.dataset.world as World);
      shell?.sync(window);
    });
  }
  const welcome = $<HTMLAudioElement>('welcome-audio');
  let disposeWelcome: (() => void) | undefined;
  let entranceReady = false;
  const startWelcome = () => {
    disposeWelcome?.();
    disposeWelcome = entranceReady && html.hasAttribute('data-gateway')
      ? bindWelcome(welcome, () => html.hasAttribute('data-gateway')) : undefined;
  };
  $('welcome-play').addEventListener('click', () => {
    if (html.hasAttribute('data-gateway') && welcome.paused) welcome.play().catch(() => {});
  });
  // Only the neutral first entrance consults IP. Explicit edition links retain their language.
  void (async () => {
    if (lang === 'en' && page === 'index.html' && (prefs.language || html.hasAttribute('data-gateway'))) {
      const savedLanguage = prefs.language;
      const wasGateway = html.hasAttribute('data-gateway');
      const chosen = await chooseEntranceLanguage(savedLanguage);
      // A visitor's choice made while detection was pending takes precedence.
      const current = load().language;
      if ((wasGateway && !html.hasAttribute('data-gateway')) || current !== savedLanguage) return;
      prefs.language = chosen;
      save();
      if (chosen !== 'en') {
        const target = site + chosen + '/index.html' + location.hash;
        if (!shell?.navigate(target, true)) location.replace(target);
        return;
      }
    }
    entranceReady = true;
    startWelcome();
  })();
  new MutationObserver(startWelcome).observe(html, { attributes: true, attributeFilter: ['data-gateway'] });
  addEventListener('pagehide', () => disposeWelcome?.());
  addEventListener('hashchange', () => {
    if (location.hash === '#worlds') html.dataset.gateway = '';
  });
}

const main = document.querySelector<HTMLElement>('#content > .volume:not(.navigation-veil) > main.leaves')!;
const folio = $('folio');
const pageNumbers = main.parentElement!.querySelectorAll(':scope > .page-foot .page-number');
// The running head names the part the chapter belongs to, as the table of contents lists it.
const active = document.querySelector('#sidebar a.active')?.closest('li.chapter-item');
let part = active?.previousElementSibling;
while (part && !part.matches('.part-title')) part = part.previousElementSibling;
for (const head of main.parentElement!.querySelectorAll(':scope > .page-head .running-part')) {
  head.textContent = part?.textContent ?? t('Welcome');
}
const magic = () => html.dataset.world === 'magic';
// The mode changes only the presentation of this same mdBook chapter.
html.dataset.reading = prefs.mode === 'scroll' ? 'scroll' : 'pages';
const paged = () => magic() && html.dataset.reading !== 'scroll';
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
// Keep the last settled position independently of geometry that resize has already changed.
let readingRatio = 0;
const paper = paperTurn(main);
let departure: (() => void) | undefined;
let pendingCommit: (() => void) | undefined;
let fontLayoutPending = false;
function settleFonts() {
  // A snapshot can request a new font. Finish the visible fold before remeasuring text.
  if (paper.active) { fontLayoutPending = true; return; }
  fontLayoutPending = false;
  settle();
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
  $<HTMLButtonElement>('page-prev').disabled = spread === 0 && !chapterLink('prev');
  $<HTMLButtonElement>('page-next').disabled = spread === spreads() - 1 && !chapterLink('next');
}

/** The spread that shows `el`. */
function spreadOf(el: Element) {
  const box = main.getBoundingClientRect(), at = el.getBoundingClientRect();
  return spread + Math.floor((rtl ? box.right - at.right : at.left - box.left) / step());
}

/** Cancels a visual turn and any deferred chapter departure. */
function cancelTurn() {
  paper.cancel();
  departure = undefined;
  pendingCommit = undefined;
}

/** Captures old/new paper without exposing the new content until its soft-page fold completes. */
function fold(delta: number, change: () => void, departing = false) {
  cancelTurn();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { change(); return; }
  const before = paper.sheets(), keep = spread;
  if (!departing) change();
  const after = paper.sheets();
  if (!departing) { show(keep); pendingCommit = change; }
  else departure = change;
  paper.show(before, after, delta, () => {
    departure = undefined;
    pendingCommit = undefined;
    change();
    if (fontLayoutPending) settleFonts();
  });
}

/** Turns one spread, or folds the final leaf before opening the adjacent chapter. */
function turn(delta: number) {
  if (paper.active || departure) return;
  if (!paged()) {
    const href = chapterLink(delta > 0 ? 'next' : 'prev');
    if (href) { remember(); if (!shell?.navigate(href)) location.href = href; }
    return;
  }
  fragmentPending = false;
  restorePending = false;
  const next = spread + delta;
  if (next >= 0 && next < spreads()) fold(delta, () => show(next));
  else {
    const href = chapterLink(delta > 0 ? 'next' : 'prev');
    if (!href) return;
    const target = href + (delta < 0 ? '#last-page' : '');
    carryPaper(target, delta);
    if (!shell?.navigate(target)) location.href = target;
  }
}

/** Carries only the visible paper across a native document navigation. */
function carryPaper(target: string, delta: number) {
  if (!paged() || printing || html.hasAttribute('data-gateway')) return;
  remember();
  saveNavigationHandoff({
    source: location.href, target, direction: delta < 0 ? 'back' : 'forward',
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    volume: main.parentElement!.getBoundingClientRect(), sheets: paper.sheets(),
  });
}

/** Measures the responsive toolbar for unobscured touch-reader fragment navigation. */
function measureToolbar() {
  html.style.setProperty('--reader-toolbar-height', $('menu-bar').offsetHeight + 'px');
}

/** Re-places the reader after layout changes: on #last-page, on a #heading's spread, or where it was. */
function settle() {
  // A resized snapshot has stale geometry. Finish a pending chapter departure, or discard the leaf.
  const navigate = departure, commit = pendingCommit;
  const handoffTurning = paper.active && !!document.querySelector('#content[data-navigation-handoff]');
  cancelTurn();
  if (handoffTurning) teardownNavigationHandoff();
  if (navigate) { navigate(); return; }
  commit?.();
  measureToolbar();
  if (!paged()) {
    for (const [id, rel, key] of [['page-prev', 'prev', 'Previous chapter'], ['page-next', 'next', 'Next chapter']] as const) {
      $(id + '-label').textContent = t(key);
      label($(id), key);
      $<HTMLButtonElement>(id).disabled = !chapterLink(rel);
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

/** Saves normalized progress in the edition and chapter before navigation or world changes. */
function remember() {
  if (printing) return;
  const ratio = paged() ? readingRatio
    : scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight);
  prefs.positions = { ...prefs.positions, [positionKey]: Math.min(1, Math.max(0, ratio)) };
  save();
}

/** Restores scroll progress after the chapter's layout resources have settled. */
function restoreScroll() {
  if (paged() || (fragmentPending && location.hash)) return;
  scrollTo(0, (prefs.positions?.[positionKey] ?? 0) *
    Math.max(0, document.documentElement.scrollHeight - innerHeight));
}

/** WebKit retains fragmented line boxes when leaving columns; rebuild only on a mode/world change.
 * This is synchronous before paint, retaining the actual nodes and their native controls. */
function resetTextFlow() {
  const display = main.style.display;
  main.style.display = 'none';
  void main.offsetHeight;
  main.style.display = display;
}

/** Switches world; reader.css lays out the page from html[data-world]. */
function setWorld(world: World) {
  if (readingMusic) teardownNavigationHandoff();
  // An explicit world change cancels an in-flight departure and keeps this chapter.
  cancelTurn();
  // Aggregate print pages must neither paginate nor replace the visitor's saved world.
  if (printing) world = 'real';
  else {
    prefs.world = world;
    save();
  }
  const changed = html.dataset.world !== world;
  html.dataset.world = world;
  if (changed) resetTextFlow();
  $('world-toggle-label').textContent = t(world === 'magic' ? 'Real world' : 'Magic world');
  if (readingMusic && !html.hasAttribute('data-gateway')) {
    prefs.music = world === 'magic';
    save();
    readingMusic.enter(world);
    try { sessionStorage.setItem('alux-music-world', world); } catch {}
  }
  spread = 0;
  settle();
}

renderReadingMode();
setWorld(html.dataset.world as World);
$('reading-mode').addEventListener('click', () => {
  remember();
  teardownNavigationHandoff();
  cancelTurn();
  prefs.mode = paged() ? 'scroll' : 'pages';
  html.dataset.reading = prefs.mode;
  resetTextFlow();
  save();
  fragmentPending = false;
  restorePending = true;
  // #last-page belongs to the old paged presentation, not to the continuous chapter.
  if (location.hash === '#last-page') { history.replaceState(null, '', location.pathname + location.search); shell?.sync(window); }
  main.scrollLeft = 0;
  renderReadingMode();
  settle();
  if (paged()) scrollTo(0, 0);
  else requestAnimationFrame(restoreScroll);
});
$('world-toggle').addEventListener('click', () => { remember(); restorePending = true; fragmentPending = false; setWorld(magic() ? 'real' : 'magic'); requestAnimationFrame(restoreScroll); });
$('page-prev').addEventListener('click', () => turn(-1));
$('page-next').addEventListener('click', () => turn(1));
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
});

// Expanded native details can add columns without changing the fixed main viewport dimensions.
// Keep the disclosure on screen rather than scaling its old ratio into a different spread.
main.addEventListener('toggle', (event) => {
  if (!paged() || !(event.target instanceof HTMLDetailsElement)) return;
  const summary=event.target.querySelector('summary');
  if (!summary) return;
  cancelTurn();
  fragmentPending=false;
  restorePending=false;
  show(spreadOf(summary));
  remember();
}, true);

// Column count depends on fonts and images, so settle again once they have loaded.
document.fonts.ready.then(async () => {
  settleFonts();
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  html.setAttribute('data-chapter-ready', '');
  shell?.ready(window);
  const veil = document.querySelector<HTMLElement>('[data-navigation-handoff-veil]');
  if (!veil || !paged()) { teardownNavigationHandoff(); return; }
  const before = [...veil.querySelectorAll<HTMLElement>(':scope > .turn-sheet')];
  if (!before.length) { teardownNavigationHandoff(); return; }
  const after = paper.sheets();
  if (before.length !== after.length || before.some((sheet, i) =>
      Math.abs(parseFloat(sheet.style.width) - parseFloat(after[i]!.style.width)) > 2 ||
      Math.abs(parseFloat(sheet.style.height) - parseFloat(after[i]!.style.height)) > 2) ||
      matchMedia('(prefers-reduced-motion: reduce)').matches) { teardownNavigationHandoff(); return; }
  paper.show(before, after, veil.dataset.direction === 'back' ? -1 : 1,
    () => { teardownNavigationHandoff(); if (fontLayoutPending) settleFonts(); },
    () => veil.remove());
});
addEventListener('load', () => { if (!document.querySelector('#content[data-navigation-handoff]')) settle(); });
// Changing worlds can request different math/UI fonts without resizing the column viewport.
// Recompute its overflow pagination when those fonts finish, preserving normalized progress.
document.fonts.addEventListener('loadingdone', settleFonts);
// A pending first-frame veil is also geometry-dependent, even before paper.active becomes true.
const relayout = () => { teardownNavigationHandoff(); settle(); };
addEventListener('resize', relayout);
addEventListener('scroll', () => { if (paper.active) settle(); }, { passive: true });
let observedWidth = main.clientWidth, observedHeight = main.clientHeight;
new ResizeObserver(() => {
  const changed = observedWidth !== main.clientWidth || observedHeight !== main.clientHeight;
  observedWidth = main.clientWidth; observedHeight = main.clientHeight;
  if (changed) relayout();
}).observe(main);
addEventListener('hashchange', () => { fragmentPending = true; restorePending = false; settle(); shell?.sync(window); });
addEventListener('pagehide', () => { remember(); cancelTurn(); });
addEventListener('load', restoreScroll);
document.fonts.ready.then(restoreScroll);

document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
  const link = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
  if (!link || link.target || link.hasAttribute('download')) return;
  const target = new URL(link.href);
  if (shell && target.origin !== location.origin && /^https?:$/.test(target.protocol)) { link.target = '_top'; return; }
  if (target.origin !== location.origin || target.pathname === location.pathname || !target.pathname.endsWith('.html') || /\/(?:print|toc)\.html$/.test(target.pathname)) return;
  const chapters = [...document.querySelectorAll<HTMLAnchorElement>('#sidebar .chapter a[href]')];
  const at = chapters.findIndex((a) => new URL(a.href).pathname === location.pathname);
  const next = chapters.findIndex((a) => new URL(a.href).pathname === target.pathname);
  carryPaper(target.href, next >= 0 && next < at ? -1 : 1);
  if (shell && !/\/(?:print|toc|404)\.html$/.test(target.pathname)) {
    event.preventDefault();
    remember();
    queueMicrotask(() => shell.navigate(target.href));
  }
}, true);

const sidebarSearch = document.getElementById('sidebar-search');
sidebarSearch?.addEventListener('click', () => {
  if ($('search-toggle').getAttribute('aria-expanded') !== 'true') $('search-toggle').click();
  $<HTMLInputElement>('searchbar').focus();
});
// Match the visible shortcut without replacing mdBook's search or its existing / and S shortcuts.
document.addEventListener('keydown', (event) => {
  if (sidebarSearch && (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    sidebarSearch.click();
  }
}, true);

// Capture phase: in the magic world arrows turn a page, not mdBook's whole chapter.
document.addEventListener('keydown', (e) => {
  if ((!paged() && !shell) || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  if ((e.target as Element).closest('input, textarea, select, button, a, dialog, [contenteditable]')) return;
  const forward = rtl ? 'ArrowLeft' : 'ArrowRight', back = rtl ? 'ArrowRight' : 'ArrowLeft';
  if (e.key === forward || (paged() && (e.key === 'PageDown' || e.key === ' '))) turn(1);
  else if (e.key === back || (paged() && e.key === 'PageUp')) turn(-1);
  else return;
  e.preventDefault();
  e.stopImmediatePropagation();
}, true);

/** Changes reading text by `delta`, within 0.7 to 1.5, without enlarging the navigation. */
function scale(delta: number) {
  teardownNavigationHandoff();
  prefs.scale = Math.round(Math.min(1.5, Math.max(0.7, (prefs.scale ?? 1) + delta)) * 10) / 10;
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
  label(bookmarkButton, marked() ? 'Bookmarked' : 'Add bookmark');
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

// Search is mdBook's panel shown as a modal (reader.css); a click on its backdrop closes it
// through mdBook's own toggle, which keeps the open state and URL in mdBook's hands.
document.getElementById('search-wrapper')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) $('search-toggle').click();
});
dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
renderBookmarks();

// One audio element serves both worlds; entry hints and volume keep the approved interaction.
const music = shell?.audio ?? $<HTMLAudioElement>('music');
const musicButton = $<HTMLButtonElement>('music-toggle');
const notice = $('music-notice'), copy = musicCopy[lang];
/** Anchors the music controls to their note button, inside the viewport. */
function placeMusicNotice() {
  if (notice.hidden) return;
  const button = musicButton.getBoundingClientRect(), bounds = notice.getBoundingClientRect();
  notice.style.left = Math.max(12, Math.min(innerWidth - bounds.width - 12, button.right - bounds.width)) + 'px';
  notice.style.top = Math.max(12, Math.min(innerHeight - bounds.height - 12, button.bottom + 8)) + 'px';
}
/** Updates the existing hint without reopening a notice the reader dismissed. */
function updateMusicNotice(state: MusicNoticeState) {
  $('music-notice-hint').textContent = musicHints[lang][state.playing ? 0 : 1]!;
  $<HTMLInputElement>('music-volume').value = String(music.volume);
  $('music-volume-value').textContent = Math.round(music.volume * 100) + '%';
}
$('music-volume-label').textContent = copy.volume;
$('music-notice-close').setAttribute('aria-label', copy.close);
notice.setAttribute('aria-label', copy.music);
readingMusic = bindReadingMusic({
  audio: music, button: musicButton, prefs, save,
  keepPlayingOnPageHide: !!shell,
  isHidden: () => shell ? window.parent.document.hidden : document.hidden,
  isGateway: () => html.hasAttribute('data-gateway'), labels: { play: copy.on, pause: copy.off },
  notice: {
    show(state) { notice.hidden = false; updateMusicNotice(state); placeMusicNotice(); },
    update: updateMusicNotice,
    hide() { notice.hidden = true; },
  },
});
$('music-notice-close').addEventListener('click', () => readingMusic!.closeNotice());
$('music-volume').addEventListener('input', () => readingMusic!.setVolume(Number($<HTMLInputElement>('music-volume').value)));
document.addEventListener('click', (event) => {
  if (!(event.target as Element).closest('#music-notice, #music-toggle, .world-choice, #world-toggle')) readingMusic!.closeNotice();
});
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') readingMusic!.closeNotice(); });
addEventListener('resize', placeMusicNotice);
addEventListener('scroll', placeMusicNotice, { passive: true });
if (!html.hasAttribute('data-gateway') && !printing) {
  readingMusic.enter(magic() ? 'magic' : 'real');
  try {
    if (sessionStorage.getItem('alux-music-world') === html.dataset.world) readingMusic.closeNotice();
    sessionStorage.setItem('alux-music-world', html.dataset.world!);
  } catch {}
}
new MutationObserver(() => { if (html.hasAttribute('data-gateway')) { music.pause(); readingMusic!.closeNotice(); } }).observe(html, { attributes: true, attributeFilter: ['data-gateway'] });

// mdBook delegates matching to elasticlunr. Extend that single search operation for
// CJK substrings so its result rendering, cache, keyboard handling and history stay native.
interface SearchDocument { title?: string; body?: string; breadcrumbs?: string }
interface SearchIndex {
  documentStore: { docs: Record<string, SearchDocument> };
  search(query: string, options?: unknown): { ref: string; score: number; doc: SearchDocument }[];
}
const cjkQuery = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const searchLibrary = (window as typeof window & {
  elasticlunr?: { Index: { prototype: SearchIndex } };
}).elasticlunr;
if (searchLibrary) {
  const nativeSearch = searchLibrary.Index.prototype.search;
  searchLibrary.Index.prototype.search = function (query, options) {
    if (!cjkQuery.test(query)) return nativeSearch.call(this, query, options);
    const tokens = query.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/u);
    return Object.entries(this.documentStore.docs).flatMap(([ref, doc]) => {
      const title = (doc.title ?? '').normalize('NFKC').toLocaleLowerCase();
      const text = (title + ' ' + (doc.body ?? '') + ' ' + (doc.breadcrumbs ?? ''))
        .normalize('NFKC').toLocaleLowerCase();
      return tokens.every((token) => text.includes(token))
        ? [{ ref, doc, score: tokens.every((token) => title.includes(token)) ? 2 : 1 }] : [];
    }).sort((a, b) => b.score - a.score);
  };
}

/** Localizes the dedicated search count after mdBook has rendered its results. */
function searchCount() {
  const input = document.getElementById('searchbar') as HTMLInputElement | null;
  if (input?.value.trim()) {
    $('searchresults-header').textContent = t('Search the book') + ' · ' + $('searchresults').children.length;
  }
}
// mdBook searches on keyup; paste, voice input and IME completion must use that same native path.
const searchbar = document.getElementById('searchbar');
searchbar?.addEventListener('input', (event) => {
  if (!(event as InputEvent).isComposing) searchbar.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
});
searchbar?.addEventListener('compositionend', () => searchbar.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true })));
searchbar?.addEventListener('keyup', () => queueMicrotask(searchCount));
addEventListener('popstate', () => queueMicrotask(searchCount));
document.addEventListener('load', (event) => {
  if ((event.target as HTMLElement)?.id === 'search-index') setTimeout(searchCount, 0);
}, true);

}
