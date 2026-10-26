import {
  For,
  Show,
  createEffect,
  createSignal,
  onCleanup,
  onMount
} from 'solid-js';
import { Icon, LanguagePicker, icon } from './reader-ui.tsx';
import { ui, languageURL } from './i18n.ts';
import { resolveAnchor } from './anchors.ts';
import { mapRealLinks } from './worlds.ts';
import { hasBookmark, toggleBookmark } from './bookmarks.ts';
import { readingSize, applyReadingSize } from './reading-preferences.ts';
import type { ReaderViewProps } from './book-view.tsx';

export function RealView(props: ReaderViewProps) {
  let disposed=false;
  const copyTimers=new Set<ReturnType<typeof setTimeout>>();
  onCleanup(()=>{disposed=true;for(const timer of copyTimers)clearTimeout(timer);copyTimers.clear();});
  let article!: HTMLElement, toolbar!: HTMLElement;
  const [wide, setWide] = createSignal(innerWidth > 1000),
    [menu, setMenu] = createSignal(innerWidth > 1000);
  const index = props.book.pages.indexOf(props.page),
    previous = props.book.pages[index - 1],
    next = props.book.pages[index + 1];
  const saved = () => {
    props.count;
    return hasBookmark(props.page.slug);
  };
  const fragment = document.createElement('article');
  fragment.innerHTML = props.page.html;
  fragment
    .querySelectorAll('h1 img,.copy-code')
    .forEach((element) => element.remove());
  if (props.page.slug === 'introduction.html')
    fragment.querySelector('.admonition.warning')?.remove();
  for (const table of fragment.querySelectorAll('table')) {
    const wrap = document.createElement('div');
    wrap.className = 'real-table-scroll';
    wrap.tabIndex = 0;
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', ui('Scrollable table'));
    table.before(wrap);
    wrap.append(table);
  }
  mapRealLinks(fragment, props.book.pages);
  for (const anchor of fragment.querySelectorAll<HTMLAnchorElement>(
    'a[href^="/"]'
  )) {
    const href = anchor.getAttribute('href') || '';
    if (!href.startsWith('//')) anchor.setAttribute('href', languageURL(href));
  }
  for (const pre of fragment.querySelectorAll('pre')) {
    const button = document.createElement('button');
    button.className = 'real-copy';
    button.type = 'button';
    button.setAttribute('aria-label', ui('Copy code'));
    button.innerHTML = icon('copy');
    pre.append(button);
  }
  createEffect(() => {
    document.body.className =
      'reality-view real-theme-' +
      (props.dark ? 'coal' : 'light') +
      (wide() && !menu() ? ' real-sidebar-hidden' : '') +
      (!wide() && menu() ? ' real-sidebar-open' : '');
  });
  createEffect(() => applyReadingSize(readingSize(props.scale)));
  const anchor = () => {
    const headings = [
      ...article.querySelectorAll<HTMLElement>('h1[id],h2[id],h3[id],h4[id]')
    ];
    return (
      headings
        .filter((heading) => heading.getBoundingClientRect().top < 150)
        .at(-1) || headings[0]
    )?.id;
  };
  async function copy(event: MouseEvent) {
    const button =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>('.real-copy')
        : null;
    if (!button) return;
    try {
      await navigator.clipboard.writeText(
        button.closest('pre')?.querySelector('code')?.textContent || ''
      );
      if(disposed)return;
      button.innerHTML = icon('check');
      button.setAttribute('aria-label', ui('Code copied'));
      const timer=setTimeout(() => {
        copyTimers.delete(timer);
        if (button.isConnected) {
          button.innerHTML = icon('copy');
          button.setAttribute('aria-label', ui('Copy code'));
        }
      }, 1800);
      copyTimers.add(timer);
    } catch {
      if(disposed)return;
      props.announce(ui('Copy is unavailable. Select the code to copy it.'));
    }
  }
  function mark(event: MouseEvent) {
    const added = toggleBookmark({
      slug: props.page.slug,
      realm: 'real',
      anchor: anchor() || '',
      scroll: scrollY
    });
    props.announce(
      ui(added ? 'Chapter bookmarked' : 'Bookmark removed'),
      event.currentTarget as HTMLElement
    );
  }
  onMount(() => {
    const save = () =>
      props.storage.set('alux-real-scroll-' + props.page.slug, scrollY);
    props.storage.set('alux-real-last-chapter', props.page.slug);
    props.onController({
      getCurrentAnchor: anchor,
      goToAnchor(id) {
        article
          .querySelector<HTMLElement>(
            '#' + CSS.escape(resolveAnchor(props.page, id))
          )
          ?.scrollIntoView({ block: 'start', behavior: 'instant' });
      },
      restorePosition() {
        scrollTo({
          top: Number(
            props.storage.get('alux-real-scroll-' + props.page.slug) || 0
          ),
          behavior: 'instant'
        });
      },
      openContents: () => setMenu(true),
      dispose: save
    });
    const resize = () => {
      const value = innerWidth > 1000;
      setWide(value);
      setMenu(value);
    };
    const key = (event: KeyboardEvent) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey ||
        document.querySelector('dialog[open]')
      )
        return;
      if (event.key === 'Escape' && !wide()) {
        setMenu(false);
        return;
      }
      if (
        !(event.target instanceof Element) ||
        event.target.closest(
          'input,textarea,select,button,summary,[contenteditable]'
        )
      )
        return;
      if (
        event.key === (document.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft') &&
        previous
      ) {
        event.preventDefault();
        void props.onNavigate('/real/' + previous.slug);
      } else if (
        event.key === (document.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight') &&
        next
      ) {
        event.preventDefault();
        void props.onNavigate('/real/' + next.slug);
      } else if (event.key === '/' || event.key.toLowerCase() === 's') {
        event.preventDefault();
        props.onSearch();
      }
    };
    const observer = new ResizeObserver(() =>
      document.body.style.setProperty(
        '--real-toolbar-height',
        toolbar.offsetHeight + 'px'
      )
    );
    observer.observe(toolbar);
    addEventListener('scroll', save, { passive: true });
    addEventListener('resize', resize);
    addEventListener('keydown', key);
    onCleanup(() => {
      save();
      observer.disconnect();
      removeEventListener('scroll', save);
      removeEventListener('resize', resize);
      removeEventListener('keydown', key);
      props.onController(null);
      props.onMusicHost(null);
    });
  });
  return (
    <>
      <aside
        class="real-sidebar"
        id="real-sidebar"
        aria-label={ui('Table of contents')}
      >
        <a
          class="real-brand"
          href={languageURL('/')}
          aria-label={ui('ALUX Programming home')}
        >
          <img src="/alux-black.png" alt="ALUX" width="36" height="36" />
          <span>
            ALUX <small>{ui('Programming')}</small>
          </span>
        </a>
        <button class="my-bookmarks" data-bookmarks onClick={props.onBookmarks}>
          <Icon name="bookmark" />
          <span>{ui('My bookmarks')}</span>
          <small data-bookmark-count>{props.count}</small>
        </button>
        <nav>
          <a
            class="real-intro"
            classList={{ active: props.page.slug === 'introduction.html' }}
            href={languageURL('/real/introduction.html')}
          >
            {ui('Introduction')}
          </a>
          <For each={props.book.groups}>
            {(group, number) => (
              <section>
                <h2>
                  {['I', 'II', 'III', 'IV', 'V'][number()]}. {group.title}
                </h2>
                <For each={group.pages}>
                  {(slug, index) => (
                    <a
                      href={languageURL('/real/' + slug)}
                      classList={{ active: props.page.slug === slug }}
                      aria-current={
                        props.page.slug === slug ? 'page' : undefined
                      }
                    >
                      <span>
                        {number() + 1}.{index() + 1}.
                      </span>{' '}
                      {
                        props.book.pages.find((page) => page.slug === slug)
                          ?.title
                      }
                    </a>
                  )}
                </For>
              </section>
            )}
          </For>
        </nav>
      </aside>
      <button
        class="real-scrim"
        aria-label={ui('Close table of contents')}
        hidden={wide() || !menu()}
        onClick={() => setMenu(false)}
      />
      <div class="real-body">
        <header class="real-toolbar" ref={toolbar}>
          <div class="real-toolbar-left">
            <button
              class="real-tool"
              id="real-menu"
              aria-label={ui('Toggle table of contents')}
              aria-expanded={menu()}
              onClick={() => setMenu(!menu())}
            >
              <Icon name="menu" />
            </button>
            <button
              class="real-tool"
              data-search
              aria-label={ui('Search the book')}
              onClick={props.onSearch}
            >
              <Icon name="search" />
            </button>
            <button
              class="real-tool"
              id="real-night"
              aria-label={ui('Toggle night reading')}
              onClick={props.onTheme}
            >
              <Icon name={props.dark ? 'sun' : 'moon'} />
            </button>
            <div class="reader-music-dock" ref={props.onMusicHost} />
            <button
              class="real-tool real-bookmark"
              id="real-bookmark"
              aria-label={ui('Bookmark this chapter')}
              aria-pressed={saved()}
              onClick={mark}
            >
              <Icon name="bookmark" />
              <span data-bookmark-label>
                {ui(saved() ? 'Bookmarked' : 'Add bookmark')}
              </span>
            </button>
            <button
              class="real-tool real-font"
              data-real-size="-1"
              aria-label={ui('Decrease text size')}
              onClick={() => props.onScale(-1)}
            >
              A−
            </button>
            <button
              class="real-tool real-font"
              data-real-size="1"
              aria-label={ui('Increase text size')}
              onClick={() => props.onScale(1)}
            >
              A+
            </button>
          </div>
          <div class="real-toolbar-right">
            <a
              class="realm-switch"
              href={languageURL('/' + props.page.slug + location.hash)}
              data-realm-switch
            >
              {ui('Magic world')}
              <Icon name="arrow-up-right" />
            </a>
            <a
              class="real-tool"
              href={
                'https://github.com/alux-network/alux-programming/blob/master/src/' +
                props.page.source
              }
              target="_blank"
              rel="noopener noreferrer"
              aria-label={ui('View source on GitHub')}
            >
              <Icon name="github" />
            </a>
            <LanguagePicker locale={props.locale} onChange={props.onLanguage} />
          </div>
        </header>
        <main id="main" class="real-main">
          <article
            class="real-prose"
            ref={article}
            innerHTML={fragment.innerHTML}
            onClick={copy}
          />
          <nav class="real-pagination" aria-label={ui('Chapters')}>
            <Show when={previous} fallback={<span />}>
              {(page) => (
                <a href={languageURL('/real/' + page().slug)}>
                  <Icon name="arrow-left" />
                  <span>
                    <small>{ui('Previous chapter')}</small>
                    {page().title}
                  </span>
                </a>
              )}
            </Show>
            <Show
              when={next}
              fallback={<a href={languageURL('/')}>{ui('Choose a world')}</a>}
            >
              {(page) => (
                <a href={languageURL('/real/' + page().slug)}>
                  <span>
                    <small>{ui('Next chapter')}</small>
                    {page().title}
                  </span>
                  <Icon name="arrow-right" />
                </a>
              )}
            </Show>
          </nav>
        </main>
      </div>
    </>
  );
}
