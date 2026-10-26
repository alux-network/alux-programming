import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount
} from 'solid-js';
import { BookView } from './book-view.tsx';
import { RealView } from './real-view.tsx';
import { Brand, Icon, LanguagePicker } from './reader-ui.tsx';
import {
  currentBook,
  language,
  languageURL,
  resolveLanguage,
  setLanguage,
  stripLanguage,
  ui,
  fmt
} from './i18n.ts';
import type { LanguageCode } from './locale-routing.ts';
import { bookmarks, removeBookmark } from './bookmarks.ts';
import { readingScale, readingSize } from './reading-preferences.ts';
import { searchBook } from './search.ts';
import { turnRoute } from './page-turn.ts';
import { mountGatewayWelcome } from './gateway-welcome.ts';
import { updateSiteMeta } from './site-meta.ts';
import { startReaderAudio, setReaderRealm } from './reader-audio.ts';
import { MusicControls } from './music-controls.tsx';
import {
  ContentsView,
  AtlasView,
  PartView,
  SiteHeader,
  SiteFooter
} from './navigation-views.tsx';
import { partRoutes } from './contents.ts';
import type {
  ReaderBook,
  ReaderController,
  ReaderStorage,
  Announce,
  Navigate
} from './book.ts';

export const storage: ReaderStorage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch {}
  }
};
const reduced = () => matchMedia('(prefers-reduced-motion:reduce)').matches;
const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const decode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export function ReaderApp() {
  let host!: HTMLDivElement,
    controller: ReaderController | null = null;
  const [edition, setEdition] = createSignal<{
      book: ReaderBook;
      locale: LanguageCode;
    }>(),
    [path, setPath] = createSignal(location.pathname),
    [busy, setBusy] = createSignal(false),
    [failure, setFailure] = createSignal(false);
  const [musicHost, setMusicHost] = createSignal<HTMLElement | null>(null);
  const [notice, setNotice] = createSignal('');
  let noticeTimer: ReturnType<typeof setTimeout> | undefined;
  const announce: Announce = (text, anchor) => {
    setNotice(text);
    clearTimeout(noticeTimer);
    const box = document.getElementById('announcement');
    if (box) {
      box.classList.toggle('anchored', !!anchor);
      if (anchor) {
        const rect = anchor.getBoundingClientRect();
        box.style.left =
          Math.max(
            12,
            Math.min(
              innerWidth - box.offsetWidth - 12,
              rect.right - box.offsetWidth
            )
          ) + 'px';
        box.style.top =
          Math.min(innerHeight - box.offsetHeight - 12, rect.bottom + 10) +
          'px';
      } else {
        box.style.left = '';
        box.style.top = '';
      }
    }
    noticeTimer = setTimeout(() => setNotice(''), 2600);
  };
  async function chooseLanguage(locale: LanguageCode, manual = true) {
    if (busy()) return;
    setBusy(true);
    setFailure(false);
    const anchor = manual ? controller?.getCurrentAnchor() : undefined;
    try {
      await setLanguage(locale, manual);
      const href =
        stripLanguage(location.pathname) === '/magic.html'
          ? '/introduction.html' + location.search + location.hash
          : location.href;
      const target = new URL(languageURL(href), location.origin);
      if (anchor) target.hash = anchor;
      history.replaceState(
        {},
        '',
        target.pathname + target.search + target.hash
      );
      setPath(location.pathname);
      setEdition({ book: currentBook(), locale });
      await nextFrame();
      restore();
    } catch {
      if (edition())
        announce(ui('This language is unavailable. Please try again.'));
      else setFailure(true);
    } finally {
      setBusy(false);
    }
  }
  function restore(focus = false) {
    if (location.hash) {
      const id = decode(location.hash.slice(1));
      if (controller && id !== 'main') controller.goToAnchor(id, false);
      else document.getElementById(id)?.scrollIntoView({ behavior: 'instant' });
    } else if (stripLanguage(location.pathname).startsWith('/real/'))
      controller?.restorePosition?.();
    else scrollTo({ top: 0, behavior: 'instant' });
    if (focus) {
      const main = document.getElementById('main');
      main?.setAttribute('tabindex', '-1');
      main?.focus({ preventScroll: true });
    }
  }
  const navigate: Navigate = async (href) => {
    if (busy()) return;
    setBusy(true);
    const target = new URL(languageURL(href), location.origin),
      oldPath = stripLanguage(location.pathname),
      newPath = stripLanguage(target.pathname);
    const before =
        edition()?.book.pages.findIndex(
          (page) => '/' + page.slug === oldPath
        ) ?? -1,
      after =
        edition()?.book.pages.findIndex(
          (page) => '/' + page.slug === newPath
        ) ?? -1;
    const update = async () => {
      history.pushState({}, '', target.pathname + target.search + target.hash);
      setPath(target.pathname);
      await nextFrame();
      restore(true);
    };
    try {
      if (!reduced() && before >= 0 && after >= 0)
        await turnRoute(host, update, after < before ? -1 : 1);
      else if (!reduced() && document.startViewTransition) {
        document.documentElement.dataset.transition = 'world';
        await document.startViewTransition(update).finished;
      } else await update();
    } finally {
      delete document.documentElement.dataset.transition;
      setBusy(false);
    }
  };
  onMount(() => {
    const disposeAudio = startReaderAudio();
    void resolveLanguage().then((locale) => chooseLanguage(locale, false));
    const pop = () => {
      const code = location.pathname.split('/')[1];
      if (
        edition() &&
        code !== edition()?.locale &&
        [
          'en',
          'zh',
          'zh-hant',
          'ja',
          'ko',
          'vi',
          'de',
          'es',
          'ru',
          'uk',
          'ar'
        ].includes(code || '')
      )
        void chooseLanguage(code as LanguageCode, false);
      else {
        setPath(location.pathname);
        void nextFrame().then(() => restore());
      }
    };
    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>('a[href]')
          : null;
      if (
        !anchor ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download')
      )
        return;
      const url = new URL(anchor.href, location.href);
      if (url.origin !== location.origin) return;
      event.preventDefault();
      if (anchor.hasAttribute('data-realm-switch'))
        url.hash = controller?.getCurrentAnchor() || location.hash;
      if (url.pathname === location.pathname && url.hash) {
        history.pushState({}, '', url.pathname + url.search + url.hash);
        const id = decode(url.hash.slice(1));
        if (controller && id !== 'main') controller.goToAnchor(id);
        else {
          const target = document.getElementById(id);
          target?.setAttribute('tabindex', '-1');
          target?.focus();
          target?.scrollIntoView();
        }
        return;
      }
      void navigate(url.pathname + url.search + url.hash);
    };
    const neutralMediaMenu = (event: PointerEvent) => {
      if (
        event.button !== 2 ||
        !(event.target instanceof Element) ||
        !event.target.closest('img,video,canvas,.chapter-art')
      )
        return;
      const shield = document.createElement('div');
      Object.assign(shield.style, {
        position: 'fixed',
        left: event.clientX - 5 + 'px',
        top: event.clientY - 5 + 'px',
        width: '12px',
        height: '12px',
        zIndex: '99999'
      });
      document.body.append(shield);
      setTimeout(() => shield.remove(), 1000);
    };
    addEventListener('popstate', pop);
    document.addEventListener('click', click);
    document.addEventListener('pointerdown', neutralMediaMenu, true);
    onCleanup(() => {
      clearTimeout(noticeTimer);
      removeEventListener('popstate', pop);
      document.removeEventListener('click', click);
      document.removeEventListener('pointerdown', neutralMediaMenu, true);
      disposeAudio();
    });
  });
  return (
    <div ref={host}>
      <Show
        when={edition()}
        keyed
        fallback={
          <Show
            when={!failure()}
            fallback={
              <main class="load-error">
                <h1>{ui('The book could not load.')}</h1>
                <p>{ui('Please refresh the page to try again.')}</p>
                <button onClick={() => void chooseLanguage(language(), false)}>
                  {ui('Try again')}
                </button>
              </main>
            }
          >
            <Show
              when={/^\/(?:index\.html)?$/.test(stripLanguage(path()))}
              fallback={
                <main class="load-error" role="status">
                  {ui('Preparing the pages…')}
                </main>
              }
            >
              <Gateway locale={language()} disabled onLanguage={() => {}} />
            </Show>
          </Show>
        }
      >
        {(selected) => (
          <Edition
            book={selected.book}
            locale={selected.locale}
            path={path()}
            busy={busy()}
            onLanguage={(locale) => void chooseLanguage(locale)}
            onNavigate={navigate}
            announce={announce}
            onController={(value) => (controller = value)}
            onMusicHost={(host) => setMusicHost(host)}
          />
        )}
      </Show>
      <MusicControls host={musicHost()} locale={edition()?.locale || 'en'} />
      <div
        id="announcement"
        role="status"
        aria-live="polite"
        classList={{ show: !!notice() }}
      >
        {notice()}
      </div>
    </div>
  );
}

interface EditionProps {
  book: ReaderBook;
  locale: LanguageCode;
  path: string;
  busy: boolean;
  onLanguage(locale: LanguageCode): void;
  onNavigate: Navigate;
  announce: Announce;
  onController(controller: ReaderController | null): void;
  onMusicHost(host: HTMLElement | null): void;
}
function Edition(props: EditionProps) {
  const route = createMemo(() => {
    let pathname = decode(stripLanguage(props.path)).replace(/^\//, '');
    if (pathname === 'magic.html') pathname = 'introduction.html';
    const real = pathname.startsWith('real/'),
      slug = real ? pathname.slice(5) || 'introduction.html' : pathname;
    return {
      pathname,
      real,
      page: props.book.pages.find(
        (page) =>
          page.slug ===
          (real && slug === 'index.html' ? 'introduction.html' : slug)
      ),
      gateway: !pathname || pathname === 'index.html'
    };
  });
  const [saved, setSaved] = createSignal(bookmarks()),
    [dark, setDark] = createSignal(
      storage.get('alux-reading-theme') === 'dark' ||
        (!storage.get('alux-reading-theme') &&
          storage.get('alux-night') === 'true')
    ),
    [scale, setScale] = createSignal(readingScale(storage));
  const [searchOpen, setSearchOpen] = createSignal(false),
    [bookmarksOpen, setBookmarksOpen] = createSignal(false),
    [query, setQuery] = createSignal('');
  let searchDialog!: HTMLDialogElement,
    savedDialog!: HTMLDialogElement,
    input!: HTMLInputElement,
    searchOrigin: HTMLElement | null = null,
    savedOrigin: HTMLElement | null = null;
  const openSearch = () => {
    if (route().gateway) return;
    searchOrigin = document.activeElement as HTMLElement;
    setQuery('');
    setSearchOpen(true);
  };
  const openBookmarks = () => {
    savedOrigin = document.activeElement as HTMLElement;
    setBookmarksOpen(true);
  };
  const closeSearch = () => {
    setSearchOpen(false);
    searchOrigin?.focus();
  };
  const closeBookmarks = () => {
    setBookmarksOpen(false);
    savedOrigin?.focus();
  };
  createEffect(() => {
    if (searchOpen()) {
      if (!searchDialog.open) searchDialog.showModal();
      input.focus();
    } else searchDialog?.close();
  });
  createEffect(() => {
    if (bookmarksOpen()) {
      if (!savedDialog.open) savedDialog.showModal();
      savedDialog
        .querySelector<HTMLButtonElement>('[data-close-bookmarks]')
        ?.focus();
    } else savedDialog?.close();
  });
  createEffect(() => {
    const value = route();
    document.title = value.gateway
      ? ui('Choose your world')
      : value.page
        ? value.page.slug === 'introduction.html'
          ? ui('Introduction')
          : value.page.title
        : value.pathname.endsWith('contents.html')
          ? ui('Table of contents')
          : value.pathname === 'atlas.html'
            ? ui('The chapter atlas')
            : partRoutes.includes(value.pathname)
              ? props.book.groups[partRoutes.indexOf(value.pathname)]!.title
              : ui('This page is uncharted.');
    updateSiteMeta(props.locale);
    setReaderRealm(value.gateway ? 'gateway' : value.real ? 'real' : 'magic');
  });
  const changeTheme = () => {
    const value = !dark();
    setDark(value);
    storage.set('alux-reading-theme', value ? 'dark' : 'light');
    storage.set('alux-night', value);
    storage.set('alux-real-theme', value ? 'coal' : 'light');
  };
  const changeScale = (delta: number) => {
    const value = Math.max(-4, Math.min(4, scale() + delta));
    setScale(value);
    storage.set('alux-reading-scale', value);
    props.announce(fmt({ key: 'readingSize', value: readingSize(value) }));
  };
  const results = createMemo(() =>
    query().trim()
      ? searchBook(props.book.pages, query().toLowerCase().trim())
      : []
  );
  const validSaved = () =>
    saved().filter((item) =>
      props.book.pages.some((page) => page.slug === item.slug)
    );
  onMount(() => {
    const changed = () => setSaved(bookmarks());
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && searchOpen()) {
        event.preventDefault();
        closeSearch();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openSearch();
      }
      if (
        searchOpen() &&
        (event.key === 'ArrowDown' || event.key === 'ArrowUp')
      ) {
        const links = [
          ...searchDialog.querySelectorAll<HTMLElement>('.search-result')
        ];
        if (!links.length) return;
        event.preventDefault();
        const index = links.indexOf(document.activeElement as HTMLElement);
        links[
          (index + (event.key === 'ArrowDown' ? 1 : -1) + links.length) %
            links.length
        ]?.focus();
      }
    };
    addEventListener('alux-bookmarks-changed', changed);
    document.addEventListener('keydown', keyboard);
    onCleanup(() => {
      removeEventListener('alux-bookmarks-changed', changed);
      document.removeEventListener('keydown', keyboard);
      searchDialog.close();
      savedDialog.close();
    });
  });
  function OtherRoute() {
    createEffect(() => {
      if (
        !route().gateway &&
        !route().pathname.endsWith('contents.html') &&
        route().pathname !== 'atlas.html' &&
        !partRoutes.includes(route().pathname)
      )
        document.body.className = 'home-view';
    });
    return (
      <Show
        when={route().gateway}
        fallback={
          <Show
            when={route().pathname.endsWith('contents.html')}
            fallback={
              <>
                <SiteHeader
                  locale={props.locale}
                  onLanguage={props.onLanguage}
                  onSearch={openSearch}
                />
                <Show
                  when={route().pathname === 'atlas.html'}
                  fallback={
                    <Show
                      when={partRoutes.includes(route().pathname)}
                      fallback={
                        <main id="main" class="not-found">
                          <span>404</span>
                          <h1>{ui('This page is uncharted.')}</h1>
                          <p>{ui('Find your way back to the book.')}</p>
                          <a class="button primary" href={languageURL('/')}>
                            {ui('Choose a world')}
                          </a>
                        </main>
                      }
                    >
                      <PartView
                        book={props.book}
                        index={partRoutes.indexOf(route().pathname)}
                      />
                    </Show>
                  }
                >
                  <AtlasView book={props.book} />
                </Show>
                <SiteFooter />
              </>
            }
          >
            <ContentsView
              book={props.book}
              real={route().real}
              dark={dark()}
              locale={props.locale}
              onLanguage={props.onLanguage}
              onSearch={openSearch}
            />
          </Show>
        }
      >
        <Gateway locale={props.locale} onLanguage={props.onLanguage} />
      </Show>
    );
  }
  return (
    <>
      <a class="skip-link" href="#main">
        {ui('Skip to content')}
      </a>
      <Show when={route().page} keyed fallback={<OtherRoute />}>
        {(page) => (
          <Show
            when={route().real}
            fallback={
              <BookView
                book={props.book}
                page={page}
                locale={props.locale}
                storage={storage}
                count={saved().length}
                onSearch={openSearch}
                onBookmarks={openBookmarks}
                onLanguage={props.onLanguage}
                onNavigate={props.onNavigate}
                announce={props.announce}
                onController={props.onController}
                onMusicHost={props.onMusicHost}
                dark={dark()}
                onTheme={changeTheme}
                scale={scale()}
                onScale={changeScale}
              />
            }
          >
            <RealView
              book={props.book}
              page={page}
              locale={props.locale}
              storage={storage}
              count={saved().length}
              onSearch={openSearch}
              onBookmarks={openBookmarks}
              onLanguage={props.onLanguage}
              onNavigate={props.onNavigate}
              announce={props.announce}
              onController={props.onController}
              onMusicHost={props.onMusicHost}
              dark={dark()}
              onTheme={changeTheme}
              scale={scale()}
              onScale={changeScale}
            />
          </Show>
        )}
      </Show>
      <dialog
        id="search-dialog"
        ref={searchDialog}
        aria-label={ui('Search the book')}
        onCancel={(event) => {
          event.preventDefault();
          closeSearch();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeSearch();
        }}
      >
        <div class="search-top">
          <Icon name="search" />
          <input
            id="search-input"
            ref={input}
            type="search"
            value={query()}
            onInput={(event) => setQuery(event.currentTarget.value)}
            placeholder={ui('Search ideas, code, chapters…')}
            aria-label={ui('Search ideas, code, chapters')}
          />
          <button
            data-close-search
            class="icon-button"
            aria-label={ui('Close search')}
            onClick={closeSearch}
          >
            <Icon name="x" />
          </button>
        </div>
        <div id="search-results">
          <Show
            when={query().trim()}
            fallback={
              <p class="search-hint">{ui('A keyword opens a new page.')}</p>
            }
          >
            <div class="search-group-label">
              {fmt({ key: 'results', value: results().length })}
            </div>
            <Show
              when={results().length}
              fallback={
                <div class="no-results">
                  <h3>{ui('No pages found.')}</h3>
                  <p>
                    {ui(
                      'Try a concept such as “capability”, “Rust” or “meaning”.'
                    )}
                  </p>
                </div>
              }
            >
              <For each={results()}>
                {({ p, at }) => (
                  <a
                    class="search-result"
                    href={languageURL(
                      '/' + (route().real ? 'real/' : '') + p.slug
                    )}
                    onClick={closeSearch}
                  >
                    <span>
                      <small>{p.group}</small>
                      <strong>{p.title}</strong>
                      <p>
                        {(at > 50 ? '…' : '') +
                          p.text.slice(
                            Math.max(0, at - 45),
                            Math.max(0, at - 45) + 150
                          ) +
                          '…'}
                      </p>
                    </span>
                    <Icon name="arrow-right" />
                  </a>
                )}
              </For>
            </Show>
          </Show>
        </div>
        <div class="search-footer">
          <kbd>Esc</kbd> {ui('to close')}
        </div>
      </dialog>
      <dialog
        id="bookmarks-dialog"
        ref={savedDialog}
        aria-label={ui('My bookmarks')}
        onCancel={(event) => {
          event.preventDefault();
          closeBookmarks();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeBookmarks();
        }}
      >
        <header class="bookmarks-heading">
          <h2>{ui('My bookmarks')}</h2>
          <button
            data-close-bookmarks
            class="icon-button"
            aria-label={ui('Close bookmarks')}
            onClick={closeBookmarks}
          >
            <Icon name="x" />
          </button>
        </header>
        <div id="bookmarks-list">
          <Show
            when={validSaved().length}
            fallback={
              <div class="bookmarks-empty">
                <p>{ui('No bookmarks yet.')}</p>
                <p>
                  {ui(
                    'Save a chapter with the bookmark button to continue reading here.'
                  )}
                </p>
              </div>
            }
          >
            <For each={validSaved()}>
              {(item) => {
                const page = props.book.pages.find(
                  (page) => page.slug === item.slug
                )!;
                return (
                  <div class="saved-chapter">
                    <a
                      href={languageURL(
                        '/' +
                          (item.realm === 'real' ? 'real/' : '') +
                          item.slug +
                          (item.anchor &&
                          !(item.realm === 'magic' && item.folio !== undefined)
                            ? '#' + encodeURIComponent(item.anchor)
                            : '')
                      )}
                      data-resume-bookmark={item.slug}
                      onClick={() => {
                        if (item.folio !== undefined)
                          storage.set('alux-folio-' + item.slug, item.folio);
                        if (item.scroll !== undefined)
                          storage.set(
                            'alux-real-scroll-' + item.slug,
                            item.scroll
                          );
                        closeBookmarks();
                      }}
                    >
                      <small>
                        {page.group} ·{' '}
                        {ui(
                          item.realm === 'real' ? 'Real world' : 'Magic world'
                        )}
                      </small>
                      <strong>{page.title}</strong>
                      <span>
                        {ui('Continue reading')} <Icon name="arrow-right" />
                      </span>
                    </a>
                    <button
                      class="icon-button"
                      data-remove-bookmark={item.slug}
                      aria-label={ui('Remove bookmark')}
                      onClick={() => removeBookmark(item.slug)}
                    >
                      <Icon name="x" />
                    </button>
                  </div>
                );
              }}
            </For>
          </Show>
        </div>
      </dialog>
    </>
  );
}

function Gateway(props: {
  locale: LanguageCode;
  disabled?: boolean;
  onLanguage(locale: LanguageCode): void;
}) {
  let main!: HTMLElement;
  onMount(() => {
    document.body.className = 'gateway-view';
    const dispose = mountGatewayWelcome(main);
    onCleanup(dispose);
  });
  return (
    <main id="main" class="world-gateway" ref={main}>
      <LanguagePicker
        locale={props.locale}
        disabled={props.disabled}
        onChange={props.onLanguage}
      />
      <h1 class="visually-hidden">{ui('Choose your world')}</h1>
      <div class="gateway-composition">
        <a
          class="world-choice choice-magic"
          href={languageURL('/introduction.html')}
        >
          <span class="choice-symbol" aria-hidden="true">
            <Icon name="wand-sparkles" />
          </span>
          <strong>{ui('Magic world')}</strong>
          <span class="choice-enter">
            <span class="choice-enter-label">
              {ui('Click to enter')}
              <span class="choice-enter-arrow" aria-hidden="true">
                ↗
              </span>
            </span>
          </span>
        </a>
        <div class="gateway-wizard">
          <img
            src="/art/wizard-standing.webp"
            alt=""
            width="1024"
            height="1536"
            fetchpriority="high"
          />
        </div>
        <a
          class="world-choice choice-real"
          href={languageURL('/real/introduction.html')}
        >
          <span class="choice-symbol" aria-hidden="true">
            <Icon name="square-code" />
          </span>
          <strong>{ui('Real world')}</strong>
          <span class="choice-enter">
            <span class="choice-enter-label">
              {ui('Click to enter')}
              <span class="choice-enter-arrow" aria-hidden="true">
                ↗
              </span>
            </span>
          </span>
        </a>
      </div>
    </main>
  );
}
