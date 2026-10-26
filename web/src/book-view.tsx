import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { attachBookLayout } from './book-layout.ts';
import type { BookLayout, BookLayoutState } from './book-layout.ts';
import {
  Brand,
  BookSidebar,
  Icon,
  LanguagePicker,
  icon
} from './reader-ui.tsx';
import { ui, languageURL } from './i18n.ts';
import { hasBookmark, toggleBookmark } from './bookmarks.ts';
import type {
  ReaderBook,
  ReaderPage,
  ReaderStorage,
  ReaderController,
  Announce,
  Navigate
} from './book.ts';
import type { LanguageCode } from './locale-routing.ts';

export interface ReaderViewProps {
  book: ReaderBook;
  page: ReaderPage;
  locale: LanguageCode;
  storage: ReaderStorage;
  count: number;
  onSearch(): void;
  onBookmarks(): void;
  onLanguage(locale: LanguageCode): void;
  onNavigate: Navigate;
  announce: Announce;
  onController(controller: ReaderController | null): void;
  onMusicHost(host: HTMLElement | null): void;
  dark: boolean;
  onTheme(): void;
  scale: number;
  onScale(delta: number): void;
}
export function BookView(props: ReaderViewProps) {
  let root!: HTMLDivElement, layout: BookLayout | undefined;
  const [menu, setMenu] = createSignal(innerWidth >= 1280),
    [continuous, setContinuous] = createSignal(
      props.storage.get('alux-reader-mode') === 'scroll'
    );
  const [state, setState] = createSignal<BookLayoutState>({
    total: 0,
    folio: 0,
    layoutKey: '',
    continuous: continuous(),
    size: 0,
    position: ui('Preparing the pages…'),
    previous: ui('Previous page'),
    next: ui('Next page'),
    previousDisabled: true,
    ready: false,
    numbering:'chapter'
  });
  const saved = () => {
    props.count;
    return hasBookmark(props.page.slug);
  };
  const label = () => ui(menu() ? 'Hide contents' : 'Show contents');
  createEffect(() => {
    document.body.className =
      'reading-view bound-reading' +
      (props.dark ? ' night' : '') +
      (innerWidth >= 1280 && !menu() ? ' contents-collapsed' : '') +
      (innerWidth < 1280 && menu() ? ' menu-open' : '') +
      (continuous() ? ' continuous-reading' : '');
  });
  createEffect(() => {
    const nextScale = props.scale,
      nextContinuous = continuous();
    layout?.reflow(nextScale, nextContinuous);
  });
  function toggleMenu(open: boolean) {
    setMenu(open);
    layout?.resize();
    if (innerWidth < 1280)
      (open
        ? root.querySelector<HTMLElement>('.book-sidebar .active')
        : root.querySelector<HTMLElement>('#toggle-menu')
      )?.focus();
  }
  function mark(event: MouseEvent) {
    const added = toggleBookmark({
      slug: props.page.slug,
      realm: 'magic',
      anchor: layout?.getCurrentAnchor() || '',
      folio: layout?.getState().folio || 0
    });
    props.announce(
      ui(added ? 'Chapter bookmarked' : 'Bookmark removed'),
      event.currentTarget as HTMLElement
    );
  }
  onMount(() => {
    layout = attachBookLayout({
      app: root,
      page: props.page,
      pages: props.book.pages,
      icon,
      storage: props.storage,
      onNavigate: props.onNavigate,
      onState: setState,
      scale: props.scale,
      continuous: continuous()
    });
    props.onController(layout);
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && menu() && innerWidth < 1280)
        toggleMenu(false);
    };
    const resize = () => {
      setMenu(innerWidth >= 1280);
    };
    addEventListener('keydown', escape);
    addEventListener('resize', resize);
    onCleanup(() => {
      removeEventListener('keydown', escape);
      removeEventListener('resize', resize);
      layout?.dispose();
      props.onController(null);
      props.onMusicHost(null);
    });
  });
  return (
    <div ref={root}>
      <BookSidebar
        page={props.page}
        pages={props.book.pages}
        groups={props.book.groups}
        count={props.count}
        onSearch={props.onSearch}
        onBookmarks={props.onBookmarks}
      />
      <div
        class="sidebar-scrim"
        id="sidebar-scrim"
        onClick={() => toggleMenu(false)}
      />
      <div class="bound-reader">
        <header class="bound-toolbar">
          <Brand />
          <nav class="bound-world-nav" aria-label={ui('Reading world')}>
            <a
              class="realm-switch"
              href={languageURL('/real/' + props.page.slug + location.hash)}
              data-realm-switch
            >
              {ui('Real world')}
              <Icon name="arrow-up-right" />
            </a>
            <LanguagePicker locale={props.locale} onChange={props.onLanguage} />
          </nav>
          <div class="bound-tools">
            <button
              class="contents-toggle"
              id="toggle-menu"
              aria-label={label()}
              title={label()}
              aria-expanded={menu()}
              onClick={() => toggleMenu(!menu())}
            >
              <Icon name="book-open" />
              <span>{label()}</span>
            </button>
            <button
              class="icon-button"
              data-search
              aria-label={ui('Search the book')}
              onClick={props.onSearch}
            >
              <Icon name="search" />
            </button>
            <button
              class="icon-button"
              id="smaller-text"
              aria-label={ui('Decrease text size')}
              onClick={() => props.onScale(-1)}
            >
              A−
            </button>
            <button
              class="icon-button"
              id="larger-text"
              aria-label={ui('Increase text size')}
              onClick={() => props.onScale(1)}
            >
              A+
            </button>
            <button
              class="icon-button"
              id="toggle-night"
              aria-label={ui('Toggle night reading')}
              onClick={props.onTheme}
            >
              <Icon name={props.dark ? 'sun' : 'moon'} />
            </button>
            <div class="reader-music-dock" ref={props.onMusicHost} />
            <button
              class="icon-button"
              id="bookmark"
              aria-label={ui('Bookmark this chapter')}
              aria-pressed={saved()}
              onClick={mark}
            >
              <Icon name="bookmark" />
            </button>
            <button
              class="bound-mode"
              id="reading-mode"
              aria-pressed={continuous()}
              onClick={() => {
                const value = !continuous();
                props.storage.set(
                  'alux-reader-mode',
                  value ? 'scroll' : 'book'
                );
                setContinuous(value);
              }}
            >
              <Icon name={continuous() ? 'book-open' : 'scroll-text'} />
              <span>{ui(continuous() ? 'Book view' : 'Scroll view')}</span>
            </button>
          </div>
        </header>
        <main id="main" class="bound-stage">
          <div class="bound-volume">
            <div
              id="page-book"
              class="page-book"
              aria-label={props.page.title}
            />
            <span class="binding-ribbon" aria-hidden="true" />
          </div>
          <div class="bound-controls">
            <button
              id="previous-sheet"
              class="sheet-control"
              disabled={!state().ready || state().previousDisabled}
              onClick={() => layout?.turn(-1)}
            >
              <Icon name="arrow-left" />
              <span>{state().previous}</span>
            </button>
            <div>
              <span class="current-chapter-title">{props.page.title}</span>
              <span
                id="folio-position"
                data-numbering={state().numbering}
                data-ready={String(state().ready)}
                aria-live="polite"
                dir={continuous() ? 'auto' : 'ltr'}
              >
                {state().position}
              </span>
            </div>
            <button
              id="next-sheet"
              class="sheet-control"
              disabled={!state().ready}
              onClick={() => layout?.turn(1)}
            >
              <span>{state().next}</span>
              <Icon name="arrow-right" />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
