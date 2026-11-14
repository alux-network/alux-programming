// The reader's markup, added to mdBook's own page when world.ts loads the reader (the magic world
// or the entrance). Called once by reader.ts before it binds anything; mdBook's template renders
// the page unchanged, so the real world is exactly mdBook's.
//
// mdBook's scripts (book.js, searcher.js) have already bound their elements when this runs, so it
// reshapes those elements in place or moves them, never replaces them. Elements it adds carry the
// ids reader.ts binds and the classes web/reader.css styles; English labels marked data-i18n are
// translated by reader.ts. A new control goes here, with its behavior in reader.ts.

// Declared by mdBook's head script as a global lexical binding.
declare const path_to_root: string;

/** Builds the reader's markup around mdBook's rendered page. */
export function buildMagicMarkup() {
  const $ = (selector: string) => document.querySelector<HTMLElement>(selector);
  const html = (markup: string) => document.createRange().createContextualFragment(markup);
  const root = path_to_root;
  const searching = !!$('#search-wrapper');
  const entrance = /^\/(?:[^/]+\/)?(?:index\.html)?$/.test(location.pathname);
  const repository = $('#git-repository-button')?.parentElement as HTMLAnchorElement | null;

  const help = $('#mdbook-help-popup > div');
  help?.replaceChildren(html(`
    <p><kbd>←</kbd> / <kbd>→</kbd> <span data-i18n>Turn pages or chapters</span></p>
    ${searching ? '<p><kbd>S</kbd> / <kbd>/</kbd> <span data-i18n>Search the book</span></p>' : ''}
    <p><kbd>?</kbd> <span data-i18n>Show keyboard help</span></p>
    <p><kbd>Esc</kbd> <span data-i18n>Close keyboard help</span></p>`));
  $('.mdbook-help-title')?.setAttribute('data-i18n', '');

  const sidebar = $('#sidebar')!;
  sidebar.prepend(html(`
    <a class="brand" href="${root}index.html#worlds" title="Choose world" aria-label="Choose world" data-i18n>
      <img class="brand-logo" src="/alux-bronze.webp" alt="">
      <span class="brand-name">ALUX</span>
      <span class="brand-subtitle" data-i18n>Programming</span>
    </a>
    <button id="bookmarks-open" class="sidebar-bookmarks" type="button" aria-haspopup="dialog">
      <i class="fa fa-bookmark-o" aria-hidden="true"></i>
      <span data-i18n>My bookmarks</span>
      <span id="bookmark-count" class="bookmark-count">0</span>
    </button>
    ${searching ? `<button id="sidebar-search" class="sidebar-search" type="button" aria-controls="searchbar">
      <i class="fa fa-search" aria-hidden="true"></i>
      <span data-i18n>Search the book</span><kbd>Ctrl K</kbd>
    </button>` : ''}`));
  if (repository) $('#sidebar-resize-handle')!.before(html(`
    <a class="sidebar-repository" href="${repository.href}" aria-label="GitHub">
      <i class="${$('#git-repository-button')!.className}" aria-hidden="true"></i>
      <span>GitHub</span><span class="repository-arrow" aria-hidden="true">↗</span>
    </a>`));

  if (entrance) sidebar.after(html(`
    <section id="gateway" class="gateway" aria-label="Choose your world" data-i18n>
      <button id="welcome-play" class="gateway-welcome" type="button">
        <i class="fa fa-play" aria-hidden="true"></i> <span data-i18n>Listen to the welcome</span>
      </button>
      <label class="language">
        <i class="fa fa-globe" aria-hidden="true"></i>
        <select class="language-picker" title="Language" aria-label="Language" data-i18n></select>
      </label>
      <button class="world-choice magic" type="button" data-world="magic">
        <i class="fa fa-magic" aria-hidden="true"></i>
        <strong data-i18n>Magic world</strong>
        <span class="world-enter"><span data-i18n>Click to enter</span> ↗</span>
      </button>
      <img class="gateway-wizard" src="/wizard-standing.webp" alt="">
      <button class="world-choice real" type="button" data-world="real">
        <i class="fa fa-code" aria-hidden="true"></i>
        <strong data-i18n>Real world</strong>
        <span class="world-enter"><span data-i18n>Click to enter</span> ↗</span>
      </button>
      <audio id="welcome-audio" src="/audio/welcome/${document.documentElement.lang}.mp3" preload="none"></audio>
    </section>`));

  const sidebarToggle = $('#sidebar-toggle')!;
  sidebarToggle.title = 'Show table of contents';
  sidebarToggle.setAttribute('aria-label', 'Show table of contents');
  sidebarToggle.setAttribute('data-i18n', '');

  // The day/night control keeps book.js's theme list, reduced to the magic world's two themes;
  // the wrapper positions the popup under its toggle wherever the toolbar puts it.
  const themeToggle = $('#theme-toggle')!, themeList = $('#theme-list')!;
  const themeMenu = document.createElement('div');
  themeMenu.className = 'theme-menu';
  themeToggle.before(themeMenu);
  themeMenu.append(themeToggle, themeList);
  for (const attribute of ['aria-haspopup', 'aria-expanded', 'aria-controls']) themeToggle.removeAttribute(attribute);
  themeToggle.title = 'Change reading theme';
  themeToggle.setAttribute('aria-label', 'Change reading theme');
  themeToggle.setAttribute('data-i18n', '');
  themeToggle.replaceChildren(html('<i class="fa fa-moon-o"></i>'));
  for (const attribute of ['aria-label', 'role']) themeList.removeAttribute(attribute);
  themeList.setAttribute('aria-hidden', 'true');
  themeList.inert = true;
  for (const item of [...themeList.children]) {
    const button = item.querySelector('button');
    if (!button || !['light', 'coal'].includes(button.id)) { item.remove(); continue; }
    item.removeAttribute('role');
    button.removeAttribute('role');
    button.tabIndex = -1;
    button.textContent = button.id === 'light' ? 'Light' : 'Dark';
  }

  const searchToggle = $('#search-toggle');
  searchToggle?.classList.add('toolbar-search');
  (searchToggle ?? themeMenu).after(html(`
    <button id="music-toggle" data-reader-music class="icon-button" type="button" title="Play music" aria-label="Play music" aria-pressed="false" data-i18n>
      <i class="fa fa-music"></i>
    </button>
    <button id="bookmark-toggle" class="bookmark-button" type="button" aria-pressed="false">
      <i class="fa fa-bookmark-o" aria-hidden="true"></i> <span id="bookmark-label" data-i18n>Add bookmark</span>
    </button>
    <button id="text-smaller" class="icon-button text-size" type="button" title="Decrease text size" aria-label="Decrease text size" data-i18n>A−</button>
    <button id="text-larger" class="icon-button text-size" type="button" title="Increase text size" aria-label="Increase text size" data-i18n>A+</button>
    <button id="reading-mode" class="icon-button reading-mode" type="button" title="Scroll reading" aria-label="Scroll reading" aria-pressed="false" data-i18n>
      <i id="reading-mode-icon" class="fa fa-file-text-o" aria-hidden="true"></i><span id="reading-mode-label" data-i18n>Scroll reading</span>
    </button>`));

  $('.menu-title')?.replaceWith(html('<span class="menu-title"></span>'));
  $('.right-buttons')!.replaceChildren(html(`
    <button id="world-toggle" class="world-link" type="button">
      <span id="world-toggle-label" data-i18n>Magic world</span> <span aria-hidden="true">↗</span>
    </button>
    <div class="theme-menu language-menu">
      <button id="language-toggle" class="icon-button" type="button" title="Language" aria-label="Language" data-i18n aria-haspopup="true" aria-expanded="false" aria-controls="language-list">
        <i class="fa fa-globe" aria-hidden="true"></i> <span id="language-name"></span>
      </button>
      <ul id="language-list" class="theme-popup" aria-label="Language" role="menu" data-i18n></ul>
    </div>`));

  // A viewport overlay: mdBook's mobile drawer transforms .page-wrapper.
  const search = $('#search-wrapper');
  const pageWrapper = $('#page-wrapper')!;
  if (search) {
    pageWrapper.after(search);
    const input = $('#searchbar') as HTMLInputElement;
    input.placeholder = 'Search the book';
    input.setAttribute('data-i18n', '');
  }

  const main = $('#content main')!;
  main.classList.add('leaves');
  const volume = html(`
    <div class="volume">
      <span class="book-corners" aria-hidden="true"></span>
      <div class="page-head" aria-hidden="true"><span class="running-part"></span></div>
      <div class="page-head" aria-hidden="true"><span class="running-part"></span></div>
      <div class="page-foot" aria-hidden="true"><span class="page-number"></span><span>✦</span></div>
      <div class="page-foot" aria-hidden="true"><span>✦</span><span class="page-number"></span></div>
    </div>
    <div class="folio-bar">
      <button id="page-prev" class="page-turn" type="button">
        <i class="fa fa-long-arrow-left" aria-hidden="true"></i> <span id="page-prev-label" data-i18n>Previous page</span>
      </button>
      <span class="folio-center">
        <span id="folio" class="folio" aria-live="polite"></span>
      </span>
      <button id="page-next" class="page-turn" type="button">
        <span id="page-next-label" data-i18n>Next page</span> <i class="fa fa-long-arrow-right" aria-hidden="true"></i>
      </button>
    </div>`);
  const book = volume.firstElementChild!;
  main.before(volume);
  book.querySelectorAll('.page-head')[1]!.after(main);

  for (const link of document.querySelectorAll('a.nav-chapters, a.mobile-nav-chapters')) link.setAttribute('data-i18n', '');

  (search ?? pageWrapper).after(html(`
    <dialog id="bookmarks" class="bookmarks" aria-labelledby="bookmarks-title">
      <header class="bookmarks-head">
        <p class="bookmarks-title"><i class="fa fa-bookmark-o" aria-hidden="true"></i> <span id="bookmarks-title" data-i18n>My bookmarks</span></p>
        <button id="bookmarks-close" class="bookmarks-close" type="button" title="Close bookmarks" aria-label="Close bookmarks" data-i18n>
          <i class="fa fa-times" aria-hidden="true"></i>
        </button>
      </header>
      <p class="bookmarks-empty" data-i18n>No bookmarks yet.</p>
      <ul id="bookmark-list" class="bookmark-list"></ul>
    </dialog>
    <audio id="music" src="/audio/forest-breath.mp3" loop preload="none"></audio>`));
  document.body.append(html(`
    <section id="music-notice" data-reader-music class="music-notice" hidden aria-live="polite">
      <div class="music-notice-heading"><p id="music-notice-hint"></p><button id="music-notice-close" type="button">×</button></div>
      <label class="music-volume"><span id="music-volume-label"></span><input id="music-volume" type="range" min="0" max="1" step="0.01"><output id="music-volume-value"></output></label>
    </section>`));
}
