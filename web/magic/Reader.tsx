// The magic world's page for /magic/<lang>/<path>: the approved reader's markup (mdBook's page
// structure with the reader's sidebar, toolbar, bound volume, folio bar, search, bookmarks and
// music notice), so mdBook's stylesheets and reader.css apply unchanged. React renders it and
// swaps the chapter's HTML; chapter.ts binds each chapter, music.ts and search.ts the visit.
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { languages } from '../languages.ts';
import type { Language } from '../languages.ts';
import { chaptersOf, loadBook, partOf } from './book.ts';
import type { MagicBook } from './book.ts';
import { bindChapter } from './chapter.ts';
import { bindChrome, sidebarStartsVisible, setSidebar } from './chrome.ts';
import { useEdition } from './Gateway.tsx';
import { bindMusic } from './music.ts';
import { isLanguage, loadPrefs, magicUrl, savePrefs } from './prefs.ts';
import { bindSearch, markSearchTerms } from './search.ts';
import { t as translate } from './t.ts';

export function Reader() {
  const { lang, '*': page = '' } = useParams();
  if (!isLanguage(lang)) return <Navigate to="/" replace />;
  if (!page) return <Navigate to={`/${lang}/`} replace />;
  return <Edition lang={lang} page={page} />;
}

function Edition({ lang, page }: { lang: Language; page: string }) {
  useEdition(lang);
  const [book, setBook] = useState<MagicBook>();
  useEffect(() => {
    let live = true;
    void loadBook(lang).then((b) => { if (live) setBook(b); });
    return () => { live = false; };
  }, [lang]);
  if (!book || book.lang !== lang) return null;
  return <Book key={lang} lang={lang} page={page} book={book} />;
}

function Book({ lang, page, book }: { lang: Language; page: string; book: MagicBook }) {
  const navigate = useNavigate();
  const location = useLocation();
  const prefs = useRef(loadPrefs()).current;
  // Decided before the markup exists, so the sidebar starts in place rather than sliding in.
  const [sidebarVisible] = useState(sidebarStartsVisible);
  const t = (key: string) => translate(lang, key);
  const chapters = chaptersOf(book);
  const index = chapters.findIndex((c) => c.path === page);
  const chapter = chapters[index];
  const prev = chapters[index - 1], next = chapters[index + 1];
  const firstPart = book.items.findIndex((item) => 'part' in item);
  const content = useMemo(() => ({ __html: chapter?.html ?? '' }), [chapter]);
  const go = useRef((url: string) => navigate(url.replace(/^\/magic/, '')));
  go.current = (url: string) => navigate(url.replace(/^\/magic/, ''));

  // The page's own state before first paint, as the approved template's head scripts set it.
  useLayoutEffect(() => {
    const html = document.documentElement;
    html.classList.add('js');
    html.dataset.world = 'magic';
    html.style.setProperty('--reader-scale', String(prefs.scale ?? 1));
    prefs.world = 'magic';
    savePrefs(prefs);
    setSidebar(sidebarVisible);
    const controller = new AbortController();
    bindChrome(controller.signal);
    return () => controller.abort();
  }, [prefs, sidebarVisible]);

  // The visit's music and search.
  useEffect(() => bindMusic(lang, prefs, () => savePrefs(prefs)), [lang, prefs]);
  useEffect(() => bindSearch(lang), [lang]);

  // Each chapter, once React has put its HTML in place.
  useLayoutEffect(() => {
    if (!chapter) return;
    return bindChapter({
      lang, page, part: partOf(book, page),
      prev: prev && magicUrl(lang, prev.path), next: next && magicUrl(lang, next.path),
      prefs, save: () => savePrefs(prefs), navigate: (url) => go.current(url),
    });
  }, [chapter, lang, page, book, prefs, prev, next]);

  // Every navigation: a search result's words are marked, and on narrow screens the sidebar, which
  // covers the page, closes.
  useEffect(() => {
    markSearchTerms();
    if (document.body.clientWidth < 1080) setSidebar(false);
  }, [page, location.key]);

  // The contents keep their scroll when a chapter is chosen there; otherwise the current chapter
  // is scrolled into view, as mdBook's toc.js does on each page.
  const scrollbox = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const box = scrollbox.current!;
    const remember = (event: Event) => { if ((event.target as Element).closest('a')) box.dataset.kept = String(box.scrollTop); };
    box.addEventListener('click', remember);
    return () => box.removeEventListener('click', remember);
  }, []);
  useLayoutEffect(() => {
    const box = scrollbox.current;
    if (!box) return;
    if (box.dataset.kept) { box.scrollTop = Number(box.dataset.kept); delete box.dataset.kept; }
    else {
      // toc.js centers the chapter while the page is still parsing, before the repository link
      // below the contents exists; center it in that same, taller box.
      const repository = box.parentElement!.querySelector<HTMLElement>('.sidebar-repository');
      if (repository) repository.style.display = 'none';
      box.querySelector('.active')?.scrollIntoView({ block: 'center' });
      if (repository) repository.style.display = '';
    }
  }, [page]);

  if (!chapter) return <Navigate to={`/${lang}/index.html`} replace />;

  return (
    <>
      <div id="mdbook-help-container">
        <div id="mdbook-help-popup">
          <h2 className="mdbook-help-title">{t('Keyboard shortcuts')}</h2>
          <div>
            <p><kbd>←</kbd> / <kbd>→</kbd> <span>{t('Turn pages or chapters')}</span></p>
            <p><kbd>S</kbd> / <kbd>/</kbd> <span>{t('Search the book')}</span></p>
            <p><kbd>?</kbd> <span>{t('Show keyboard help')}</span></p>
            <p><kbd>Esc</kbd> <span>{t('Close keyboard help')}</span></p>
          </div>
        </div>
      </div>
      <div id="body-container">
        <input type="checkbox" id="sidebar-toggle-anchor" className="hidden" defaultChecked={sidebarVisible} />
        <nav id="sidebar" className="sidebar" aria-label="Table of contents">
          <a className="brand" href={magicUrl(lang)} title={t('Choose world')} aria-label={t('Choose world')}>
            <img className="brand-logo" src="/alux-bronze.webp" alt="" />
            <span className="brand-name">ALUX</span>
            <span className="brand-subtitle">{t('Programming')}</span>
          </a>
          <button id="bookmarks-open" className="sidebar-bookmarks" type="button" aria-haspopup="dialog">
            <i className="fa fa-bookmark-o" aria-hidden="true"></i>
            <span>{t('My bookmarks')}</span>
            <span id="bookmark-count" className="bookmark-count">0</span>
          </button>
          <button id="sidebar-search" className="sidebar-search" type="button" aria-controls="searchbar">
            <i className="fa fa-search" aria-hidden="true"></i>
            <span>{t('Search the book')}</span><kbd>Ctrl K</kbd>
          </button>
          <mdbook-sidebar-scrollbox class="sidebar-scrollbox" ref={scrollbox}>
            <ol className="chapter">
              {book.items.map((item, i) => {
                // mdBook's toc.js markup: spacers and part titles follow an empty affix item;
                // chapters before the first part are affixes.
                if ('separator' in item) return <Fragment key={i}><li className="chapter-item expanded affix "></li><li className="spacer"></li></Fragment>;
                if ('part' in item) return <Fragment key={i}><li className="chapter-item expanded affix "></li><li className="part-title">{item.part}</li></Fragment>;
                return (
                  <li key={i} className={'chapter-item expanded ' + (firstPart < 0 || i < firstPart ? 'affix ' : '')}>
                    <a href={magicUrl(lang, item.path)} className={item.path === page ? 'active' : undefined}>{item.name}</a>
                  </li>
                );
              })}
            </ol>
          </mdbook-sidebar-scrollbox>
          <a className="sidebar-repository" href="https://github.com/alux-network/alux-programming" aria-label="GitHub">
            <i className="fa fa-github" aria-hidden="true"></i>
            <span>GitHub</span><span className="repository-arrow" aria-hidden="true">↗</span>
          </a>
          <div id="sidebar-resize-handle" className="sidebar-resize-handle">
            <div className="sidebar-resize-indicator"></div>
          </div>
        </nav>

        <div id="page-wrapper" className="page-wrapper">
          <div className="page">
            <div id="menu-bar-hover-placeholder"></div>
            <div id="menu-bar" className="menu-bar sticky">
              <div className="left-buttons">
                <label id="sidebar-toggle" className="icon-button" htmlFor="sidebar-toggle-anchor" aria-controls="sidebar">
                  <i className="fa fa-bars"></i>
                </label>
                <div className="theme-menu">
                  <button id="theme-toggle" className="icon-button" type="button"></button>
                  <ul id="theme-list" className="theme-popup" aria-hidden="true" inert>
                    <li><button className="theme" id="light" tabIndex={-1}>Light</button></li>
                    <li><button className="theme" id="coal" tabIndex={-1}>Dark</button></li>
                  </ul>
                </div>
                <button id="search-toggle" className="icon-button toolbar-search" type="button" title="Search (`/`)" aria-label="Toggle Searchbar" aria-expanded="false" aria-keyshortcuts="/ s" aria-controls="searchbar">
                  <i className="fa fa-search"></i>
                </button>
                <button id="music-toggle" data-reader-music className="icon-button" type="button" aria-pressed="false">
                  <i className="fa fa-music"></i>
                </button>
                <button id="bookmark-toggle" className="bookmark-button" type="button" aria-pressed="false">
                  <i className="fa fa-bookmark-o" aria-hidden="true"></i> <span id="bookmark-label">{t('Add bookmark')}</span>
                </button>
                <button id="text-smaller" className="icon-button text-size" type="button" title={t('Decrease text size')} aria-label={t('Decrease text size')}>A−</button>
                <button id="text-larger" className="icon-button text-size" type="button" title={t('Increase text size')} aria-label={t('Increase text size')}>A+</button>
                <button id="reading-mode" className="icon-button reading-mode" type="button" aria-pressed="false">
                  <i id="reading-mode-icon" className="fa fa-file-text-o" aria-hidden="true"></i><span id="reading-mode-label">{t('Scroll reading')}</span>
                </button>
              </div>

              <span className="menu-title"></span>

              <div className="right-buttons">
                <button id="world-toggle" className="world-link" type="button">
                  <span id="world-toggle-label">{t('Real world')}</span> <span aria-hidden="true">↗</span>
                </button>
                <div className="theme-menu language-menu">
                  <button id="language-toggle" className="icon-button" type="button" title={t('Language')} aria-label={t('Language')} aria-haspopup="true" aria-expanded="false" aria-controls="language-list">
                    <i className="fa fa-globe" aria-hidden="true"></i> <span id="language-name">{languages.find((l) => l.code === lang)!.name}</span>
                  </button>
                  <ul id="language-list" className="theme-popup" aria-label={t('Language')} role="menu">
                    {languages.map((l) => (
                      <li key={l.code} role="none">
                        <a role="menuitem" className={l.code === lang ? 'theme theme-selected' : 'theme'} lang={l.code} href={magicUrl(l.code, page)}>{l.name}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div id="content" className="content">
              <div className="volume">
                <span className="book-corners" aria-hidden="true"></span>
                <div className="page-head" aria-hidden="true"><span className="running-part"></span></div>
                <div className="page-head" aria-hidden="true"><span className="running-part"></span></div>
                <main className="leaves" dangerouslySetInnerHTML={content}></main>
                <div className="page-foot" aria-hidden="true"><span className="page-number"></span><span>✦</span></div>
                <div className="page-foot" aria-hidden="true"><span>✦</span><span className="page-number"></span></div>
              </div>
              <div className="folio-bar">
                <button id="page-prev" className="page-turn" type="button">
                  <i className="fa fa-long-arrow-left" aria-hidden="true"></i> <span id="page-prev-label">{t('Previous page')}</span>
                </button>
                <span className="folio-center">
                  <span id="folio" className="folio" aria-live="polite"></span>
                </span>
                <button id="page-next" className="page-turn" type="button">
                  <span id="page-next-label">{t('Next page')}</span> <i className="fa fa-long-arrow-right" aria-hidden="true"></i>
                </button>
              </div>

              <nav className="nav-wrapper" aria-label="Page navigation">
                {prev && (
                  <a rel="prev" href={magicUrl(lang, prev.path)} className="mobile-nav-chapters previous" title={t('Previous chapter')} aria-label={t('Previous chapter')} aria-keyshortcuts="Left">
                    <i className="fa fa-angle-left"></i>
                  </a>
                )}
                {next && (
                  <a rel="next prefetch" href={magicUrl(lang, next.path)} className="mobile-nav-chapters next" title={t('Next chapter')} aria-label={t('Next chapter')} aria-keyshortcuts="Right">
                    <i className="fa fa-angle-right"></i>
                  </a>
                )}
                <div style={{ clear: 'both' }}></div>
              </nav>
            </div>
          </div>

          <nav className="nav-wide-wrapper" aria-label="Page navigation">
            {prev && (
              <a rel="prev" href={magicUrl(lang, prev.path)} className="nav-chapters previous" title={t('Previous chapter')} aria-label={t('Previous chapter')} aria-keyshortcuts="Left">
                <i className="fa fa-angle-left"></i>
              </a>
            )}
            {next && (
              <a rel="next prefetch" href={magicUrl(lang, next.path)} className="nav-chapters next" title={t('Next chapter')} aria-label={t('Next chapter')} aria-keyshortcuts="Right">
                <i className="fa fa-angle-right"></i>
              </a>
            )}
          </nav>
        </div>

        <div id="search-wrapper" className="hidden">
          <form id="searchbar-outer" className="searchbar-outer">
            <div className="search-wrapper">
              <input type="search" id="searchbar" name="searchbar" placeholder={t('Search the book')} aria-controls="searchresults-outer" aria-describedby="searchresults-header" />
              <div className="spinner-wrapper">
                <i className="fa fa-spinner fa-spin"></i>
              </div>
            </div>
          </form>
          <div id="searchresults-outer" className="searchresults-outer hidden">
            <div id="searchresults-header" className="searchresults-header"></div>
            <ul id="searchresults"></ul>
          </div>
        </div>

        <dialog id="bookmarks" className="bookmarks is-empty" aria-labelledby="bookmarks-title">
          <header className="bookmarks-head">
            <p className="bookmarks-title"><i className="fa fa-bookmark-o" aria-hidden="true"></i> <span id="bookmarks-title">{t('My bookmarks')}</span></p>
            <button id="bookmarks-close" className="bookmarks-close" type="button" title={t('Close bookmarks')} aria-label={t('Close bookmarks')}>
              <i className="fa fa-times" aria-hidden="true"></i>
            </button>
          </header>
          <p className="bookmarks-empty">{t('No bookmarks yet.')}</p>
          <ul id="bookmark-list" className="bookmark-list"></ul>
        </dialog>
        <audio id="music" src="/audio/forest-breath.mp3" loop preload="none"></audio>

        <section id="music-notice" data-reader-music className="music-notice" aria-live="polite" hidden>
          <div className="music-notice-heading"><p id="music-notice-hint"></p><button id="music-notice-close" type="button">×</button></div>
          <label className="music-volume"><span id="music-volume-label"></span><input id="music-volume" type="range" min="0" max="1" step="0.01" /><output id="music-volume-value"></output></label>
        </section>
      </div>
    </>
  );
}
